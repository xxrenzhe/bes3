'use client'

import { useEffect, useState, useTransition } from 'react'
import { Database, RefreshCw, ServerCog, ShieldCheck, SlidersHorizontal, Wand2 } from 'lucide-react'
import { toast } from 'sonner'
import { StatusBadge } from '@/components/admin/StatusBadge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'

type SettingItem = {
  category: string
  key: string
  value: string | null
  dataType: string
  isSensitive: boolean
  description: string | null
}

type SettingDiagnostic = {
  id: string
  title: string
  status: 'configured' | 'partial' | 'missing'
  detail: string
}

const CATEGORY_ORDER = ['ai', 'proxy', 'affiliateSync', 'media', 'seo'] as const

const CATEGORY_META: Record<string, { title: string; description: string }> = {
  ai: {
    title: 'AI Engine',
    description: 'Choose the active provider, model, and credentials used during keyword mining and editorial generation.'
  },
  proxy: {
    title: 'Proxy Settings',
    description: 'Define browser proxy pools and routing defaults used by scraping or anti-bot workflows.'
  },
  affiliateSync: {
    title: 'Affiliate Sync',
    description: 'Configure PartnerBoost endpoints and tokens so inventory sync stays reliable across programs.'
  },
  media: {
    title: 'Media Storage',
    description: 'Control where assets are written and how media URLs are resolved in the public Bes3 pages.'
  },
  seo: {
    title: 'SEO Runtime',
    description: 'Set the public site identity, canonical base URL, and notification behavior for indexing workflows.'
  }
}

const FIELD_META: Record<string, { label: string; placeholder?: string; rows?: number }> = {
  'ai.provider': { label: 'Provider', placeholder: 'gemini' },
  'ai.geminiModel': { label: 'Gemini Model', placeholder: 'gemini-2.5-flash' },
  'ai.geminiApiKey': { label: 'Gemini API Key', placeholder: 'AIza...' },
  'proxy.browserProxyUrlsJson': { label: 'Proxy Pool JSON', placeholder: '["http://user:pass@proxy:port"]', rows: 5 },
  'affiliateSync.partnerboostAmazonBaseUrl': { label: 'Amazon Base URL', placeholder: 'https://app.partnerboost.com' },
  'affiliateSync.partnerboostAmazonToken': { label: 'Amazon Token', placeholder: 'token' },
  'affiliateSync.partnerboostDtcBaseUrl': { label: 'DTC Base URL', placeholder: 'https://app.partnerboost.com' },
  'affiliateSync.partnerboostDtcToken': { label: 'DTC Token', placeholder: 'token' },
  'media.driver': { label: 'Storage Driver', placeholder: 'local or s3' },
  'media.localRoot': { label: 'Local Root', placeholder: 'storage/media' },
  'media.publicBaseUrl': { label: 'Public Base URL', placeholder: 'https://cdn.example.com/bes3-media' },
  'media.s3Endpoint': { label: 'S3 Endpoint', placeholder: 'https://<account>.r2.cloudflarestorage.com' },
  'media.s3Region': { label: 'S3 Region', placeholder: 'auto' },
  'media.s3Bucket': { label: 'S3 Bucket', placeholder: 'bes3-media' },
  'media.s3AccessKeyId': { label: 'S3 Access Key ID', placeholder: 'access-key-id' },
  'media.s3SecretAccessKey': { label: 'S3 Secret Access Key', placeholder: 'secret-access-key' },
  'media.s3ForcePathStyle': { label: 'Force Path Style' },
  'seo.siteName': { label: 'Site Name', placeholder: 'Bes3' },
  'seo.siteTagline': { label: 'Site Tagline', placeholder: 'The Best 3 Tech Picks, Decoded.' },
  'seo.appUrl': { label: 'Public Site URL', placeholder: 'https://bes3.example.com' },
  'seo.pingomaticEnabled': { label: 'Ping-O-Matic Enabled' },
  'seo.googleIndexingEnabled': { label: 'Google Indexing Enabled' },
  'seo.googleServiceAccountJson': {
    label: 'Google Service Account JSON',
    placeholder: '{"client_email":"...","private_key":"-----BEGIN PRIVATE KEY-----\\n..."}',
    rows: 6
  },
  'seo.syndicationEnabled': { label: 'Syndication Enabled' },
  'seo.syndicationTargetsJson': {
    label: 'Syndication Targets JSON',
    placeholder: '[{"id":"medium","platformName":"Medium","type":"webhook","endpoint":"https://example.com/hook","authToken":"token","enabled":true}]',
    rows: 8
  },
  'seo.linkInspectorEnabled': { label: 'Link Inspector Enabled' },
  'seo.linkInspectorMaxUrls': { label: 'Link Inspector Max URLs', placeholder: '60' }
}

function serializeItems(items: SettingItem[]) {
  return JSON.stringify(
    items.map((item) => ({
      category: item.category,
      key: item.key,
      value: item.value
    }))
  )
}

function getCategoryIcon(category: string) {
  if (category === 'ai') return SlidersHorizontal
  if (category === 'media') return Database
  if (category === 'seo') return Wand2
  return ShieldCheck
}

function getDiagnosticPanelTone(status: SettingDiagnostic['status']) {
  if (status === 'configured') return 'border-emerald-200 bg-emerald-50/90'
  if (status === 'partial') return 'border-amber-200 bg-amber-50/90'
  return 'border-rose-200 bg-rose-50/90'
}

export function SettingsConsole() {
  const [items, setItems] = useState<SettingItem[]>([])
  const [diagnostics, setDiagnostics] = useState<SettingDiagnostic[]>([])
  const [loadedSnapshot, setLoadedSnapshot] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const load = async () => {
    const response = await fetch('/api/admin/settings')
    const body = await response.json()
    const nextItems = body.items || []

    setItems(nextItems)
    setDiagnostics(body.diagnostics || [])
    setLoadedSnapshot(serializeItems(nextItems))
  }

  useEffect(() => {
    void load()
  }, [])

  const grouped = items.reduce<Record<string, SettingItem[]>>((accumulator, item) => {
    accumulator[item.category] = accumulator[item.category] || []
    accumulator[item.category].push(item)
    return accumulator
  }, {})

  const categoryList = Array.from(new Set([...CATEGORY_ORDER, ...Object.keys(grouped)]))
  const currentSnapshot = serializeItems(items)
  const isDirty = loadedSnapshot !== null && currentSnapshot !== loadedSnapshot
  const configuredCount = diagnostics.filter((item) => item.status === 'configured').length
  const partialCount = diagnostics.filter((item) => item.status === 'partial').length
  const missingCount = diagnostics.filter((item) => item.status === 'missing').length

  const updateItem = (target: SettingItem, nextValue: string) => {
    setItems((current) =>
      current.map((candidate) =>
        candidate.category === target.category && candidate.key === target.key
          ? { ...candidate, value: nextValue }
          : candidate
      )
    )
  }

  const save = async () => {
    const response = await fetch('/api/admin/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items })
    })

    if (!response.ok) {
      toast.error('Failed to save settings')
      return
    }

    await load()
    toast.success('Settings saved')
  }

  return (
    <div className="space-y-8 p-6 lg:p-10">
      <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-[2.25rem] border border-slate-200/70 bg-white/90 p-8 shadow-[0_32px_70px_-42px_rgba(15,23,42,0.32)] lg:p-10">
          <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-primary">Settings</p>
          <h1 className="mt-4 font-[var(--font-display)] text-4xl font-black tracking-tight text-slate-950 sm:text-5xl">
            Runtime configuration for the internal Bes3 control layer
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-8 text-slate-600">
            Keep AI credentials, affiliate sync endpoints, proxy pools, media storage, and SEO identity aligned. This page stays operational and internal while the public site remains purely buyer-facing.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Button
              disabled={isPending || !isDirty}
              onClick={() => {
                startTransition(async () => {
                  await save()
                })
              }}
              className="rounded-full px-6"
            >
              Save Settings
            </Button>
            <Button
              variant="outline"
              disabled={isPending}
              onClick={() => {
                startTransition(async () => {
                  await load()
                })
              }}
              className="rounded-full border-slate-200 bg-white px-6"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
            <Button
              variant="ghost"
              disabled={isPending || !isDirty || loadedSnapshot === null}
              onClick={() => {
                if (!loadedSnapshot) return
                const restoredItems = JSON.parse(loadedSnapshot) as Array<{ category: string; key: string; value: string | null }>
                setItems((current) =>
                  current.map((item) => {
                    const restored = restoredItems.find((candidate) => candidate.category === item.category && candidate.key === item.key)
                    return restored ? { ...item, value: restored.value } : item
                  })
                )
              }}
              className="rounded-full px-6 text-slate-600"
            >
              Reset Changes
            </Button>
            {isDirty ? (
              <div className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-amber-700">
                Unsaved Changes
              </div>
            ) : (
              <div className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-emerald-700">
                Synced
              </div>
            )}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-1">
          <div className="rounded-[1.75rem] border border-slate-200/70 bg-white/90 p-6 shadow-[0_26px_60px_-40px_rgba(15,23,42,0.26)]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-primary">Health Snapshot</p>
            <div className="mt-4 flex items-center justify-between">
              <div>
                <p className="text-4xl font-black tracking-tight text-slate-950">{configuredCount}</p>
                <p className="mt-2 text-sm text-slate-600">Fully configured integrations</p>
              </div>
              <StatusBadge value="configured" />
            </div>
          </div>
          <div className="rounded-[1.75rem] border border-slate-200/70 bg-white/90 p-6 shadow-[0_26px_60px_-40px_rgba(15,23,42,0.26)]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-primary">Needs Attention</p>
            <div className="mt-4 flex items-center justify-between">
              <div>
                <p className="text-4xl font-black tracking-tight text-slate-950">{partialCount + missingCount}</p>
                <p className="mt-2 text-sm text-slate-600">Partial or missing connections</p>
              </div>
              <StatusBadge value={missingCount ? 'missing' : 'partial'} />
            </div>
          </div>
          <div className="rounded-[1.75rem] border border-slate-200/70 bg-[linear-gradient(135deg,#0f172a,#1e293b)] p-6 text-white shadow-[0_26px_60px_-40px_rgba(15,23,42,0.52)]">
            <div className="flex items-center gap-3">
              <ServerCog className="h-5 w-5 text-emerald-300" />
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-300">Operational Note</p>
            </div>
            <p className="mt-4 text-sm leading-7 text-slate-200">
              Secrets should stay centralized here. Public-facing copy must never expose internal credentials, provider names, or pipeline control language.
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {diagnostics.map((item) => (
          <div
            key={item.id}
            className={`rounded-[1.75rem] border p-5 shadow-[0_24px_50px_-42px_rgba(15,23,42,0.26)] ${getDiagnosticPanelTone(item.status)}`}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-semibold text-slate-950">{item.title}</p>
                <p className="mt-2 text-sm leading-7 text-slate-600">{item.detail}</p>
              </div>
              <StatusBadge value={item.status} />
            </div>
          </div>
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        {categoryList.map((category) => {
          const categoryItems = grouped[category] || []
          if (categoryItems.length === 0) return null

          const categoryMeta = CATEGORY_META[category] || {
            title: category,
            description: 'Runtime configuration for this internal system area.'
          }
          const Icon = getCategoryIcon(category)

          return (
            <div key={category} className="rounded-[2rem] border border-slate-200/70 bg-white/90 p-8 shadow-[0_32px_70px_-42px_rgba(15,23,42,0.32)]">
              <div className="flex items-start gap-4">
                <div className="rounded-[1.25rem] bg-emerald-50 p-3 text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-primary">{categoryMeta.title}</p>
                  <p className="mt-2 text-sm leading-7 text-slate-600">{categoryMeta.description}</p>
                </div>
              </div>

              <div className="mt-8 space-y-5">
                {categoryItems.map((item) => {
                  const fieldKey = `${item.category}.${item.key}`
                  const fieldMeta = FIELD_META[fieldKey]

                  return (
                    <label key={fieldKey} className="block rounded-[1.5rem] border border-slate-200/80 bg-slate-50/70 p-5">
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <span className="text-sm font-semibold text-slate-950">{fieldMeta?.label || item.key}</span>
                          {item.isSensitive ? (
                            <span className="ml-3 inline-flex rounded-full bg-slate-900 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-white">
                              Secret
                            </span>
                          ) : null}
                        </div>
                        <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">{item.dataType}</span>
                      </div>

                      <div className="mt-4">
                        {item.dataType === 'boolean' ? (
                          <div className="flex items-center justify-between rounded-[1.25rem] border border-slate-200 bg-white px-4 py-3">
                            <div className="text-sm text-slate-600">{item.value === 'true' ? 'Enabled' : 'Disabled'}</div>
                            <Switch
                              checked={item.value === 'true'}
                              onCheckedChange={(checked) => updateItem(item, checked ? 'true' : 'false')}
                            />
                          </div>
                        ) : item.dataType === 'json' ? (
                          <Textarea
                            value={item.value || ''}
                            onChange={(event) => updateItem(item, event.target.value)}
                            placeholder={fieldMeta?.placeholder}
                            rows={fieldMeta?.rows || 5}
                            className="rounded-[1.25rem] border-slate-200 bg-white px-4 py-3 shadow-none focus-visible:ring-2"
                          />
                        ) : (
                          <Input
                            value={item.value || ''}
                            type={item.isSensitive ? 'password' : 'text'}
                            onChange={(event) => updateItem(item, event.target.value)}
                            placeholder={fieldMeta?.placeholder}
                            className="min-h-[52px] rounded-[1.25rem] border-slate-200 bg-white px-4 shadow-none focus-visible:ring-2"
                          />
                        )}
                      </div>

                      {item.description ? <p className="mt-3 text-xs leading-6 text-slate-500">{item.description}</p> : null}
                    </label>
                  )
                })}
              </div>
            </div>
          )
        })}
      </section>
    </div>
  )
}
