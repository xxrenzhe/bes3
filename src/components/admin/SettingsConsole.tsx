'use client'

import { useEffect, useState, useTransition } from 'react'
import { Bot, Database, RefreshCw, ServerCog, ShieldCheck, SlidersHorizontal, Wand2 } from 'lucide-react'
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

const CATEGORY_ORDER = ['ai', 'proxy', 'deepScrape', 'affiliateSync', 'media', 'seo'] as const

const CATEGORY_META: Record<string, { title: string; description: string }> = {
  ai: {
    title: 'AI 引擎',
    description: '配置关键词挖掘和内容生成使用的服务商、模型与凭据。'
  },
  proxy: {
    title: '代理设置',
    description: '配置抓取和反爬工作流使用的浏览器代理池与默认路由。'
  },
  deepScrape: {
    title: '深度抓取',
    description: '控制商品采集时的浏览器抓取、等待策略、代理要求和重试次数。'
  },
  affiliateSync: {
    title: '联盟同步',
    description: '配置 PartnerBoost 端点和令牌，保证不同项目的库存同步稳定。'
  },
  media: {
    title: '媒体存储',
    description: '控制素材写入位置，以及公开页面如何解析媒体 URL。'
  },
  seo: {
    title: 'SEO 运行时',
    description: '配置公开站点身份、canonical 基础 URL 和索引通知行为。'
  }
}

const FIELD_META: Record<string, { label: string; placeholder?: string; rows?: number }> = {
  'ai.provider': { label: 'Provider', placeholder: 'gemini' },
  'ai.geminiModel': { label: 'Gemini Model', placeholder: 'gemini-3-flash-preview' },
  'ai.geminiBaseUrl': { label: 'Gemini Base URL', placeholder: 'https://generativelanguage.googleapis.com' },
  'ai.geminiApiKey': { label: 'Gemini API Key', placeholder: 'AIza...' },
  'proxy.browserProxyUrlsJson': { label: 'Proxy Pool JSON', placeholder: '["http://user:pass@proxy:port"]', rows: 5 },
  'proxy.defaultCountryCode': { label: 'Default Proxy Country', placeholder: 'US' },
  'deepScrape.enabled': { label: 'Deep Scrape Enabled' },
  'deepScrape.timeoutMs': { label: 'Navigation Timeout MS', placeholder: '60000' },
  'deepScrape.waitAfterLoadMs': { label: 'Post-load Wait MS', placeholder: '1500' },
  'deepScrape.maxAttempts': { label: 'Max Attempts', placeholder: '2' },
  'deepScrape.requireProxy': { label: 'Require Proxy' },
  'affiliateSync.partnerboostAmazonBaseUrl': { label: 'Amazon Base URL', placeholder: 'https://app.partnerboost.com' },
  'affiliateSync.partnerboostAmazonToken': { label: 'Amazon Token', placeholder: 'token' },
  'affiliateSync.partnerboostDtcBaseUrl': { label: 'DTC Base URL', placeholder: 'https://app.partnerboost.com' },
  'affiliateSync.partnerboostDtcToken': { label: 'DTC Token', placeholder: 'token' },
  'affiliateSync.amazonPageSize': { label: 'Amazon Page Size', placeholder: '20' },
  'affiliateSync.dtcPageSize': { label: 'DTC Page Size', placeholder: '20' },
  'affiliateSync.maxPagesPerSync': { label: 'Max Pages Per Sync', placeholder: '5' },
  'media.driver': { label: 'Storage Driver', placeholder: 'local or s3' },
  'media.localRoot': { label: 'Local Root', placeholder: 'storage/media' },
  'media.publicBaseUrl': { label: 'Public Base URL', placeholder: 'Optional: https://cdn.example.com/bes3-media' },
  'media.s3Endpoint': { label: 'S3 Endpoint', placeholder: 'objectstorageapi.sg-members-1.clawcloudrun.com' },
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
  if (category === 'deepScrape') return Bot
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
      toast.error('保存设置失败')
      return
    }

    await load()
    toast.success('设置已保存')
  }

  return (
    <div className="space-y-4 p-4 sm:p-5 lg:p-6">
      <section className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-2xl border border-slate-200/70 bg-white/90 p-4 shadow-sm lg:p-5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-primary">系统设置</p>
          <h1 className="mt-2 font-[var(--font-display)] text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
            Bes3 内部控制层的运行时配置
          </h1>
          <p className="mt-2 max-w-3xl text-xs leading-5 text-slate-600">
            统一管理 AI 凭据、联盟同步端点、代理池、媒体存储和 SEO 身份。这里保持内部运维属性，公开站点继续面向买家。
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              disabled={isPending || !isDirty}
              onClick={() => {
                startTransition(async () => {
                  await save()
                })
              }}
              className="rounded-full px-4"
            >
              保存设置
            </Button>
            <Button
              variant="outline"
              disabled={isPending}
              onClick={() => {
                startTransition(async () => {
                  await load()
                })
              }}
              className="rounded-full border-slate-200 bg-white px-4"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              刷新
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
              className="rounded-full px-4 text-slate-600"
            >
              重置改动
            </Button>
            {isDirty ? (
              <div className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-700">
                有未保存改动
              </div>
            ) : (
              <div className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-700">
                已同步
              </div>
            )}
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-1">
          <div className="rounded-2xl border border-slate-200/70 bg-white/90 p-4 shadow-sm">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">健康快照</p>
            <div className="mt-2 flex items-center justify-between">
              <div>
                <p className="text-2xl font-black tracking-tight text-slate-950">{configuredCount}</p>
                <p className="mt-1 text-xs text-slate-600">已完整配置的集成</p>
              </div>
              <StatusBadge value="configured" />
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200/70 bg-white/90 p-4 shadow-sm">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">需要处理</p>
            <div className="mt-2 flex items-center justify-between">
              <div>
                <p className="text-2xl font-black tracking-tight text-slate-950">{partialCount + missingCount}</p>
                <p className="mt-1 text-xs text-slate-600">部分配置或缺失连接</p>
              </div>
              <StatusBadge value={missingCount ? 'missing' : 'partial'} />
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200/70 bg-[linear-gradient(135deg,#0f172a,#1e293b)] p-4 text-white shadow-sm">
            <div className="flex items-center gap-2">
              <ServerCog className="h-4 w-4 text-emerald-300" />
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-300">运维提示</p>
            </div>
            <p className="mt-2 text-xs leading-5 text-slate-200">
              密钥集中管理在这里。公开文案不得暴露内部凭据、供应商名称或流水线控制语言。
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {diagnostics.map((item) => (
          <div
            key={item.id}
            className={`rounded-2xl border p-4 shadow-sm ${getDiagnosticPanelTone(item.status)}`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-slate-950">{item.title}</p>
                <p className="mt-1 text-xs leading-5 text-slate-600">{item.detail}</p>
              </div>
              <StatusBadge value={item.status} />
            </div>
          </div>
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        {categoryList.map((category) => {
          const categoryItems = grouped[category] || []
          if (categoryItems.length === 0) return null

          const categoryMeta = CATEGORY_META[category] || {
            title: category,
            description: '此内部系统区域的运行时配置。'
          }
          const Icon = getCategoryIcon(category)

          return (
            <div key={category} className="rounded-2xl border border-slate-200/70 bg-white/90 p-4 shadow-sm lg:p-5">
              <div className="flex items-start gap-3">
                <div className="rounded-xl bg-emerald-50 p-2.5 text-primary">
                  <Icon className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">{categoryMeta.title}</p>
                  <p className="mt-1 text-xs leading-5 text-slate-600">{categoryMeta.description}</p>
                </div>
              </div>

              <div className="mt-4 space-y-3">
                {categoryItems.map((item) => {
                  const fieldKey = `${item.category}.${item.key}`
                  const fieldMeta = FIELD_META[fieldKey]

                  return (
                    <label key={fieldKey} className="block rounded-xl border border-slate-200/80 bg-slate-50/70 p-3">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <span className="text-sm font-semibold text-slate-950">{fieldMeta?.label || item.key}</span>
                          {item.isSensitive ? (
                            <span className="ml-3 inline-flex rounded-full bg-slate-900 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-white">
                              密钥
                            </span>
                          ) : null}
                        </div>
                        <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">{item.dataType}</span>
                      </div>

                      <div className="mt-3">
                        {item.dataType === 'boolean' ? (
                          <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2">
                            <div className="text-sm text-slate-600">{item.value === 'true' ? '已启用' : '已停用'}</div>
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
                            className="rounded-xl border-slate-200 bg-white px-3 py-2 shadow-none focus-visible:ring-2"
                          />
                        ) : (
                          <Input
                            value={item.value || ''}
                            type={item.isSensitive ? 'password' : 'text'}
                            onChange={(event) => updateItem(item, event.target.value)}
                            placeholder={fieldMeta?.placeholder}
                            className="min-h-10 rounded-xl border-slate-200 bg-white px-3 shadow-none focus-visible:ring-2"
                          />
                        )}
                      </div>

                      {item.description ? <p className="mt-2 text-xs leading-5 text-slate-500">{item.description}</p> : null}
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
