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
