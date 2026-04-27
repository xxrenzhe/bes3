import { NextResponse } from 'next/server'
import { requireAdmin, requireAdminPermission } from '@/lib/auth'
import { logAdminAudit } from '@/lib/admin-governance'
import { listSettingDiagnostics, listSettings, saveSetting } from '@/lib/settings'

type SettingInput = {
  category?: unknown
  key?: unknown
  value?: unknown
  dataType?: unknown
  isSensitive?: unknown
  description?: unknown
}

function validateSettingInput(item: SettingInput): string | null {
  const category = String(item.category || '')
  const key = String(item.key || '')
  const value = item.value === null ? '' : String(item.value || '')

  if (category === 'proxy' && key === 'browserProxyUrlsJson') {
    try {
      const parsed = JSON.parse(value || '[]')
      if (!Array.isArray(parsed)) return 'Proxy Pool JSON must be an array'
      for (const [index, candidate] of parsed.entries()) {
        const proxyUrl = typeof candidate === 'string'
          ? candidate
          : candidate && typeof candidate === 'object'
            ? String((candidate as { url?: unknown }).url || '')
            : ''
        if (!proxyUrl.trim()) return `Proxy entry ${index + 1} is missing url`
        if (!/^(https?|socks5):\/\//i.test(proxyUrl) && proxyUrl.split(':').length < 2) {
          return `Proxy entry ${index + 1} must be a URL or host:port value`
        }
      }
    } catch {
      return 'Proxy Pool JSON is not valid JSON'
    }
  }

  if (category === 'proxy' && key === 'defaultCountryCode' && value && !/^[A-Z]{2}$/i.test(value.trim())) {
    return 'Default proxy country must be a two-letter country code'
  }

  if (category === 'ai' && key === 'geminiBaseUrl' && value) {
    try {
      const url = new URL(value)
      if (!/^https?:$/.test(url.protocol)) return 'Gemini Base URL must use http or https'
    } catch {
      return 'Gemini Base URL is not valid'
    }
  }

  if (category === 'ai' && key === 'provider' && value && !['gemini', 'relay'].includes(value.trim())) {
    return 'AI provider must be gemini or relay'
  }

  if (category === 'affiliateSync' && ['amazonPageSize', 'dtcPageSize', 'maxPagesPerSync'].includes(key)) {
    const parsed = Number.parseInt(value, 10)
    if (!Number.isFinite(parsed) || parsed < 1 || parsed > 500) {
      return `${key} must be a number between 1 and 500`
    }
  }

  if (category === 'deepScrape' && ['timeoutMs', 'waitAfterLoadMs', 'maxAttempts'].includes(key)) {
    const parsed = Number.parseInt(value, 10)
    const max = key === 'maxAttempts' ? 5 : key === 'waitAfterLoadMs' ? 10000 : 180000
    if (!Number.isFinite(parsed) || parsed < 1 || parsed > max) {
      return `${key} must be a number between 1 and ${max}`
    }
  }

  return null
}

export async function GET() {
  await requireAdmin()
  return NextResponse.json({
    items: await listSettings(),
    diagnostics: await listSettingDiagnostics()
  })
}

export async function PUT(request: Request) {
  const actor = await requireAdminPermission('settings:write')
  const body = await request.json().catch(() => ({}))
  const items = Array.isArray(body.items) ? body.items : []
  for (const item of items as SettingInput[]) {
    const error = validateSettingInput(item)
    if (error) {
      return NextResponse.json({ error }, { status: 400 })
    }
  }
  const before = await listSettings()
  for (const item of items) {
    await saveSetting({
      category: String(item.category || ''),
      key: String(item.key || ''),
      value: item.value === null ? null : String(item.value || ''),
      dataType: item.dataType || 'string',
      isSensitive: Boolean(item.isSensitive),
      description: item.description || null
    })
  }
  await logAdminAudit({
    actor,
    request,
    action: 'settings_updated',
    entityType: 'system_settings',
    after: {
      updatedKeys: (items as SettingInput[]).map((item) => `${String(item.category || '')}.${String(item.key || '')}`)
    },
    before
  })
  return NextResponse.json({ success: true })
}
