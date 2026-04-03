'use client'

import { useEffect, useState, useTransition } from 'react'
import { RefreshCw, ShieldCheck, SlidersHorizontal } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { StatusBadge } from '@/components/admin/StatusBadge'

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
    description: 'Configure the active provider, model, and generation credentials used by keyword mining and article generation.'
  },
  proxy: {
    title: 'Proxy Settings',
    description: 'Maintain browser proxy pools used by future scraping and anti-bot routing strategies.'
  },
  affiliateSync: {
    title: 'Affiliate Sync',
    description: 'Store PartnerBoost base URLs and tokens so Amazon and DTC inventory sync can run from the admin console.'
  },
  media: {
    title: 'Media Storage',
    description: 'Choose local volume or S3-compatible object storage, and define the public asset path used in generated pages.'
  },
  seo: {
    title: 'SEO Runtime',
    description: 'Set the public site identity, canonical base URL, and SEO notification behavior.'
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
  'seo.pingomaticEnabled': { label: 'Ping-O-Matic Enabled' }
}

export function SettingsConsole() {
  const [items, setItems] = useState<SettingItem[]>([])
  const [diagnostics, setDiagnostics] = useState<SettingDiagnostic[]>([])
  const [isPending, startTransition] = useTransition()

  const load = async () => {
    const response = await fetch('/api/admin/settings')
    const body = await response.json()
    setItems(body.items || [])
    setDiagnostics(body.diagnostics || [])
  }

  useEffect(() => {
    void load()
  }, [])

  const grouped = items.reduce<Record<string, SettingItem[]>>((accumulator, item) => {
    accumulator[item.category] = accumulator[item.category] || []
    accumulator[item.category].push(item)
    return accumulator
  }, {})

  const updateItem = (target: SettingItem, nextValue: string) => {
    setItems((current) =>
      current.map((candidate) =>
        candidate.category === target.category && candidate.key === target.key
          ? { ...candidate, value: nextValue }
          : candidate
      )
    )
  }

  return (
    <div className="space-y-6 p-6 lg:p-10">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.28em] text-primary">Settings</p>
          <h1 className="mt-2 font-[var(--font-display)] text-4xl font-semibold tracking-tight">AI, proxy, affiliate sync, media, and SEO configuration</h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-muted-foreground">
            Runtime configuration now feeds the actual generation, media, and sync services. Use this page to keep API keys, storage routing, and public SEO values aligned.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button
            variant="outline"
            disabled={isPending}
            onClick={() => {
              startTransition(async () => {
                await load()
              })
            }}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button
            disabled={isPending}
            onClick={() => {
              startTransition(async () => {
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
              })
            }}
          >
            Save Settings
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {diagnostics.map((item) => (
          <div key={item.id} className="rounded-[28px] border border-border bg-white p-5 shadow-panel">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-medium">{item.title}</p>
                <p className="mt-2 text-sm leading-7 text-muted-foreground">{item.detail}</p>
              </div>
              <StatusBadge value={item.status} />
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        {CATEGORY_ORDER.map((category) => {
          const categoryItems = grouped[category] || []
          if (categoryItems.length === 0) return null
          const categoryMeta = CATEGORY_META[category]

          return (
            <div key={category} className="rounded-[32px] border border-border bg-white p-8 shadow-panel">
              <div className="flex items-start gap-4">
                <div className="rounded-2xl bg-[#f7f1e4] p-3 text-primary">
                  {category === 'ai' ? <SlidersHorizontal className="h-5 w-5" /> : <ShieldCheck className="h-5 w-5" />}
                </div>
                <div>
                  <p className="font-mono text-xs uppercase tracking-[0.24em] text-primary">{categoryMeta?.title || category}</p>
                  <p className="mt-2 text-sm leading-7 text-muted-foreground">{categoryMeta?.description}</p>
                </div>
              </div>

              <div className="mt-6 space-y-5">
                {categoryItems.map((item) => {
                  const fieldKey = `${item.category}.${item.key}`
                  const fieldMeta = FIELD_META[fieldKey]

                  return (
                    <label key={fieldKey} className="block space-y-2">
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-sm font-medium">{fieldMeta?.label || item.key}</span>
                        <span className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{item.dataType}</span>
                      </div>

                      {item.dataType === 'boolean' ? (
                        <div className="flex items-center justify-between rounded-2xl border border-border px-4 py-3">
                          <div className="text-sm text-muted-foreground">{item.value === 'true' ? 'Enabled' : 'Disabled'}</div>
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
                          className="rounded-2xl"
                        />
                      ) : (
                        <Input
                          value={item.value || ''}
                          type={item.isSensitive ? 'password' : 'text'}
                          onChange={(event) => updateItem(item, event.target.value)}
                          placeholder={fieldMeta?.placeholder}
                          className="min-h-[48px] rounded-2xl"
                        />
                      )}

                      {item.description ? <p className="text-xs leading-6 text-muted-foreground">{item.description}</p> : null}
                    </label>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
