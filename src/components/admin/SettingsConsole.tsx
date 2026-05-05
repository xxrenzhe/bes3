'use client'

import { useEffect, useState, useTransition } from 'react'
import {
  AlertCircle,
  Bot,
  CheckCircle2,
  Database,
  ExternalLink,
  Globe,
  Info,
  Key,
  Plus,
  Settings as SettingsIcon,
  SlidersHorizontal,
  Trash2,
  Wand2
} from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import {
  GEMINI_ACTIVE_MODEL,
  RELAY_GPT_52_MODEL,
  isModelSupportedByProvider,
  normalizeModelForProvider
} from '@/lib/gemini-models'
import { SUPPORTED_PROXY_COUNTRIES } from '@/lib/proxy-countries'
import { parseProxyEndpoint } from '@/lib/proxy-url-parser'

type SettingItem = {
  category: string
  key: string
  value: string | null
  hasValue?: boolean
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

type FieldMeta = {
  label: string
  description: string
  placeholder?: string
  rows?: number
  defaultValue?: string
  helpLink?: string
  options?: Array<{ value: string; label: string }>
}

type ProxyUrlConfig = {
  country: string
  url: string
  error?: string
}

const GEMINI_OFFICIAL_MODEL = GEMINI_ACTIVE_MODEL
const RELAY_GPT_MODEL = RELAY_GPT_52_MODEL
const OFFICIAL_GEMINI_ENDPOINT = 'https://generativelanguage.googleapis.com'
const RELAY_GEMINI_ENDPOINT = 'https://aicode.cat/v1/messages'
const DEFAULT_PARTNERBOOST_BASE_URL = 'https://app.partnerboost.com'
const SENSITIVE_PLACEHOLDER = '············'
const VALIDATABLE_CATEGORIES = ['ai', 'proxy', 'affiliate_sync'] as const
const CATEGORY_ORDER = ['ai', 'proxy', 'deepScrape', 'affiliate_sync', 'media', 'seo'] as const
const AFFILIATE_SYNC_DELETABLE_KEYS = ['partnerboost_token', 'amazonPageSize', 'dtcPageSize', 'maxPagesPerSync'] as const

const CATEGORY_META: Record<string, { title: string; description: string; color: string }> = {
  ai: {
    title: 'AI 引擎',
    description: '按 autobb 的配置顺序管理服务商、模型、端点与当前服务商 API Key。',
    color: 'text-purple-600'
  },
  proxy: {
    title: '代理设置',
    description: '配置抓取和反爬工作流使用的浏览器代理池与默认路由。',
    color: 'text-emerald-600'
  },
  deepScrape: {
    title: '深度抓取',
    description: '控制商品采集时的浏览器抓取、等待策略、代理要求和重试次数。',
    color: 'text-blue-600'
  },
  affiliate_sync: {
    title: '联盟同步',
    description: '按 autobb 的字段语义配置 PartnerBoost 凭证和同步策略。',
    color: 'text-amber-600'
  },
  media: {
    title: '媒体存储',
    description: '控制素材写入位置，以及公开页面如何解析媒体 URL。',
    color: 'text-cyan-600'
  },
  seo: {
    title: 'SEO 运行时',
    description: '配置公开站点身份、canonical 基础 URL 和索引通知行为。',
    color: 'text-slate-600'
  }
}

const FIELD_META: Record<string, FieldMeta> = {
  'ai.gemini_provider': {
    label: '服务商',
    description: '第 1 步：先选择服务商。官方适合海外网络；第三方中转适合国内网络。',
    defaultValue: 'official',
    options: [
      { value: 'official', label: 'Gemini 官方' },
      { value: 'relay', label: '第三方中转' }
    ]
  },
  'ai.gemini_model': {
    label: 'AI 模型',
    description: '第 2 步：服务商确定后，再选择该服务商支持的模型。',
    defaultValue: GEMINI_OFFICIAL_MODEL,
    options: [
      { value: GEMINI_OFFICIAL_MODEL, label: 'Gemini 3 Flash Preview（官方 / 第三方中转，高效）' },
      { value: RELAY_GPT_MODEL, label: 'GPT-5.2（第三方中转专用）' }
    ]
  },
  'ai.gemini_endpoint': {
    label: 'API 端点',
    description: '第 3 步：根据当前服务商和模型自动计算，不可手动修改。',
    placeholder: OFFICIAL_GEMINI_ENDPOINT,
    defaultValue: OFFICIAL_GEMINI_ENDPOINT
  },
  'ai.gemini_api_key': {
    label: 'Gemini 官方 API Key',
    description: '第 4 步：当前服务商为官方时，仅此 Key 会生效。',
    placeholder: '输入官方 API Key',
    helpLink: 'https://aistudio.google.com/app/api-keys'
  },
  'ai.gemini_relay_api_key': {
    label: '第三方中转 API Key',
    description: '第 4 步：当前服务商为第三方中转时，仅此 Key 会生效。',
    placeholder: '输入中转服务 API Key',
    helpLink: 'https://aicode.cat/register?ref=T6S73C2U'
  },
  'ai.geminiTimeoutMs': {
    label: '请求超时（毫秒）',
    description: 'AI 请求的最大等待时间，默认 30000。',
    placeholder: '30000',
    defaultValue: '30000'
  },
  'proxy.urls': {
    label: '代理池 JSON',
    description: '配置浏览器抓取使用的代理池，支持字符串 URL 数组或带 url 字段的对象数组。',
    placeholder: '["http://user:pass@proxy:port"]',
    rows: 5
  },
  'proxy.defaultCountryCode': {
    label: '默认代理国家',
    description: '未命中特定国家代理时使用的默认国家代码。',
    placeholder: 'US'
  },
  'deepScrape.enabled': {
    label: '启用深度抓取',
    description: '是否允许商品流水线启动浏览器深度抓取。',
    defaultValue: 'true',
    options: [
      { value: 'true', label: '启用' },
      { value: 'false', label: '禁用' }
    ]
  },
  'deepScrape.timeoutMs': {
    label: '导航超时（毫秒）',
    description: '单次页面导航的最大等待时间。',
    placeholder: '60000',
    defaultValue: '60000'
  },
  'deepScrape.waitAfterLoadMs': {
    label: '加载后等待（毫秒）',
    description: '页面加载完成后继续等待动态内容渲染的时间。',
    placeholder: '1500',
    defaultValue: '1500'
  },
  'deepScrape.maxAttempts': {
    label: '最大尝试次数',
    description: '抓取失败后的最大重试次数。',
    placeholder: '2',
    defaultValue: '2'
  },
  'deepScrape.requireProxy': {
    label: '强制使用代理',
    description: '开启后，没有可用代理时不执行深度抓取。',
    defaultValue: 'false',
    options: [
      { value: 'true', label: '启用' },
      { value: 'false', label: '禁用' }
    ]
  },
  'affiliate_sync.partnerboost_base_url': {
    label: 'PartnerBoost Base URL',
    description: 'PartnerBoost API 地址，按 autobb 固定使用默认值，不支持修改。',
    placeholder: DEFAULT_PARTNERBOOST_BASE_URL,
    defaultValue: DEFAULT_PARTNERBOOST_BASE_URL
  },
  'affiliate_sync.partnerboost_token': {
    label: 'PartnerBoost Token',
    description: 'PartnerBoost 联盟同步令牌。',
    placeholder: '输入 PartnerBoost Token'
  },
  'affiliate_sync.amazonPageSize': {
    label: 'Amazon 每页数量',
    description: '单页同步的 Amazon 商品数量。',
    placeholder: '20',
    defaultValue: '20'
  },
  'affiliate_sync.dtcPageSize': {
    label: 'DTC 每页数量',
    description: '单页同步的 DTC 商品数量。',
    placeholder: '20',
    defaultValue: '20'
  },
  'affiliate_sync.maxPagesPerSync': {
    label: '单次最大页数',
    description: '单次同步最多拉取的分页数。',
    placeholder: '5',
    defaultValue: '5'
  },
  'media.driver': {
    label: '存储驱动',
    description: '媒体素材写入本地还是 S3 兼容对象存储。',
    defaultValue: 'local',
    options: [
      { value: 'local', label: '本地存储' },
      { value: 's3', label: 'S3 对象存储' }
    ]
  },
  'media.localRoot': {
    label: '本地目录',
    description: '本地媒体文件写入目录。',
    placeholder: 'storage/media',
    defaultValue: 'storage/media'
  },
  'media.publicBaseUrl': {
    label: '公开媒体 Base URL',
    description: '前台访问媒体素材时使用的公开 URL 前缀。',
    placeholder: 'https://cdn.example.com/bes3-media'
  },
  'media.s3Endpoint': {
    label: 'S3 Endpoint',
    description: 'S3 兼容对象存储端点。',
    placeholder: 'objectstorageapi.sg-members-1.clawcloudrun.com'
  },
  'media.s3Region': {
    label: 'S3 Region',
    description: '对象存储区域。',
    placeholder: 'auto',
    defaultValue: 'auto'
  },
  'media.s3Bucket': {
    label: 'S3 Bucket',
    description: '对象存储桶名称。',
    placeholder: 'bes3-media'
  },
  'media.s3AccessKeyId': {
    label: 'S3 Access Key ID',
    description: '对象存储访问密钥 ID。',
    placeholder: 'access-key-id'
  },
  'media.s3SecretAccessKey': {
    label: 'S3 Secret Access Key',
    description: '对象存储访问密钥。',
    placeholder: 'secret-access-key'
  },
  'media.s3ForcePathStyle': {
    label: '强制 Path Style',
    description: '兼容部分对象存储服务的 path-style 访问方式。',
    defaultValue: 'true',
    options: [
      { value: 'true', label: '启用' },
      { value: 'false', label: '禁用' }
    ]
  },
  'seo.siteName': {
    label: '站点名称',
    description: '公开站点和结构化数据使用的品牌名称。',
    placeholder: 'Bes3',
    defaultValue: 'Bes3'
  },
  'seo.siteTagline': {
    label: '站点标语',
    description: '默认 SEO 和品牌展示使用的短标语。',
    placeholder: 'The Best 3 Tech Picks, Decoded.'
  },
  'seo.appUrl': {
    label: '公开站点 URL',
    description: 'canonical、sitemap 和索引通知使用的站点根地址。',
    placeholder: 'https://bes3.example.com'
  },
  'seo.pingomaticEnabled': {
    label: '启用 Ping-O-Matic',
    description: '发布内容后是否通知 Ping-O-Matic。',
    defaultValue: 'false',
    options: [
      { value: 'true', label: '启用' },
      { value: 'false', label: '禁用' }
    ]
  },
  'seo.googleIndexingEnabled': {
    label: '启用 Google Indexing',
    description: '发布内容后是否调用 Google Indexing API。',
    defaultValue: 'false',
    options: [
      { value: 'true', label: '启用' },
      { value: 'false', label: '禁用' }
    ]
  },
  'seo.googleServiceAccountJson': {
    label: 'Google Service Account JSON',
    description: 'Google Indexing API 使用的服务账号 JSON。',
    placeholder: '{"client_email":"...","private_key":"-----BEGIN PRIVATE KEY-----\\n..."}',
    rows: 6
  },
  'seo.syndicationEnabled': {
    label: '启用外部分发',
    description: '是否向外部分发目标推送内容。',
    defaultValue: 'false',
    options: [
      { value: 'true', label: '启用' },
      { value: 'false', label: '禁用' }
    ]
  },
  'seo.syndicationTargetsJson': {
    label: '分发目标 JSON',
    description: '外部分发目标列表。',
    placeholder: '[{"id":"medium","endpoint":"https://example.com/hook","enabled":true}]',
    rows: 6
  },
  'seo.linkInspectorEnabled': {
    label: '启用链接巡检',
    description: '是否启用商家链接健康巡检。',
    defaultValue: 'true',
    options: [
      { value: 'true', label: '启用' },
      { value: 'false', label: '禁用' }
    ]
  },
  'seo.linkInspectorMaxUrls': {
    label: '链接巡检 URL 上限',
    description: '单次巡检最多检查的 URL 数量。',
    placeholder: '60',
    defaultValue: '60'
  }
}

const CATEGORY_FIELDS: Record<string, Array<Omit<SettingItem, 'value' | 'description'> & { description?: string | null }>> = {
  ai: [
    { category: 'ai', key: 'gemini_provider', dataType: 'string', isSensitive: false },
    { category: 'ai', key: 'gemini_model', dataType: 'string', isSensitive: false },
    { category: 'ai', key: 'gemini_endpoint', dataType: 'string', isSensitive: false },
    { category: 'ai', key: 'gemini_api_key', dataType: 'string', isSensitive: true },
    { category: 'ai', key: 'gemini_relay_api_key', dataType: 'string', isSensitive: true },
    { category: 'ai', key: 'geminiTimeoutMs', dataType: 'number', isSensitive: false }
  ],
  proxy: [
    { category: 'proxy', key: 'urls', dataType: 'json', isSensitive: false },
    { category: 'proxy', key: 'defaultCountryCode', dataType: 'string', isSensitive: false }
  ],
  deepScrape: [
    { category: 'deepScrape', key: 'enabled', dataType: 'boolean', isSensitive: false },
    { category: 'deepScrape', key: 'timeoutMs', dataType: 'number', isSensitive: false },
    { category: 'deepScrape', key: 'waitAfterLoadMs', dataType: 'number', isSensitive: false },
    { category: 'deepScrape', key: 'maxAttempts', dataType: 'number', isSensitive: false },
    { category: 'deepScrape', key: 'requireProxy', dataType: 'boolean', isSensitive: false }
  ],
  affiliate_sync: [
    { category: 'affiliate_sync', key: 'partnerboost_base_url', dataType: 'string', isSensitive: false },
    { category: 'affiliate_sync', key: 'partnerboost_token', dataType: 'string', isSensitive: true },
    { category: 'affiliate_sync', key: 'amazonPageSize', dataType: 'number', isSensitive: false },
    { category: 'affiliate_sync', key: 'dtcPageSize', dataType: 'number', isSensitive: false },
    { category: 'affiliate_sync', key: 'maxPagesPerSync', dataType: 'number', isSensitive: false }
  ],
  media: [
    { category: 'media', key: 'driver', dataType: 'string', isSensitive: false },
    { category: 'media', key: 'localRoot', dataType: 'string', isSensitive: false },
    { category: 'media', key: 'publicBaseUrl', dataType: 'string', isSensitive: false },
    { category: 'media', key: 's3Endpoint', dataType: 'string', isSensitive: false },
    { category: 'media', key: 's3Region', dataType: 'string', isSensitive: false },
    { category: 'media', key: 's3Bucket', dataType: 'string', isSensitive: false },
    { category: 'media', key: 's3AccessKeyId', dataType: 'string', isSensitive: true },
    { category: 'media', key: 's3SecretAccessKey', dataType: 'string', isSensitive: true },
    { category: 'media', key: 's3ForcePathStyle', dataType: 'boolean', isSensitive: false }
  ],
  seo: [
    { category: 'seo', key: 'siteName', dataType: 'string', isSensitive: false },
    { category: 'seo', key: 'siteTagline', dataType: 'string', isSensitive: false },
    { category: 'seo', key: 'appUrl', dataType: 'string', isSensitive: false },
    { category: 'seo', key: 'pingomaticEnabled', dataType: 'boolean', isSensitive: false },
    { category: 'seo', key: 'googleIndexingEnabled', dataType: 'boolean', isSensitive: false },
    { category: 'seo', key: 'googleServiceAccountJson', dataType: 'text', isSensitive: true },
    { category: 'seo', key: 'syndicationEnabled', dataType: 'boolean', isSensitive: false },
    { category: 'seo', key: 'syndicationTargetsJson', dataType: 'json', isSensitive: false },
    { category: 'seo', key: 'linkInspectorEnabled', dataType: 'boolean', isSensitive: false },
    { category: 'seo', key: 'linkInspectorMaxUrls', dataType: 'number', isSensitive: false }
  ]
}

function getFieldMeta(item: Pick<SettingItem, 'category' | 'key'>) {
  return FIELD_META[`${item.category}.${item.key}`]
}

function getCategoryIcon(category: string) {
  if (category === 'ai') return SlidersHorizontal
  if (category === 'proxy') return Globe
  if (category === 'deepScrape') return Bot
  if (category === 'media') return Database
  if (category === 'seo') return Wand2
  if (category === 'affiliate_sync') return Key
  return SettingsIcon
}

function getDiagnosticPanelTone(status: SettingDiagnostic['status']) {
  if (status === 'configured') return 'border-emerald-200 bg-emerald-50'
  if (status === 'partial') return 'border-amber-200 bg-amber-50'
  return 'border-rose-200 bg-rose-50'
}

function getDefaultedValue(item: Pick<SettingItem, 'category' | 'key' | 'value'>) {
  return item.value ?? getFieldMeta(item)?.defaultValue ?? ''
}

function getAiEndpoint(provider: string) {
  return provider === 'relay' ? RELAY_GEMINI_ENDPOINT : OFFICIAL_GEMINI_ENDPOINT
}

function getAiModel(provider: string, model: string) {
  return normalizeModelForProvider(model, provider)
}

function shouldShowAiField(provider: string, key: string) {
  if (key === 'gemini_api_key') return provider !== 'relay'
  if (key === 'gemini_relay_api_key') return provider === 'relay'
  return true
}

function isRequiredField(category: string, key: string, provider: string) {
  if (category !== 'ai') return false
  if (key === 'gemini_provider' || key === 'gemini_model') return true
  if (provider === 'relay') return key === 'gemini_relay_api_key'
  return key === 'gemini_api_key'
}

function validateProxyUrlFormat(url: string): string | null {
  const trimmed = String(url || '').trim()
  if (!trimmed) return null
  if (/^(https?|socks5):\/\//i.test(trimmed)) return null
  if (trimmed.split(':').length >= 2) return null
  return '代理 URL 必须是完整 URL 或 host:port[:username:password] 格式'
}

function inferProxyCountryFromUrl(url: string): string {
  const parsed = parseProxyEndpoint(url)
  return parsed?.countryCode || ''
}

function normalizeComparableRecord(items: SettingItem[]): Record<string, string> {
  return items.reduce<Record<string, string>>((accumulator, item) => {
    accumulator[`${item.category}.${item.key}`] = String(item.value || '')
    return accumulator
  }, {})
}

function normalizeComparableProxyUrls(items: ProxyUrlConfig[]): Array<{ country: string; url: string }> {
  return items.map((item) => ({
    country: String(item.country || ''),
    url: String(item.url || '')
  }))
}

function buildComparableCategoryRecord(category: string, sourceItems: SettingItem[]): Record<string, string> {
  const currentMap = new Map(sourceItems.filter((item) => item.category === category).map((item) => [item.key, item]))
  const defined = CATEGORY_FIELDS[category] || []
  const merged = defined.map((definition) => {
    const existing = currentMap.get(definition.key)
    const fieldMeta = getFieldMeta(definition)
    return {
      category,
      key: definition.key,
      value: existing?.value ?? fieldMeta?.defaultValue ?? null
    }
  })
  const extra = sourceItems
    .filter((item) => item.category === category)
    .filter((item) => !defined.some((definition) => definition.key === item.key))
    .map((item) => ({ category, key: item.key, value: item.value }))

  return normalizeComparableRecord([...merged, ...extra].map((item) => ({
    category,
    key: item.key,
    value: item.value,
    dataType: 'string',
    isSensitive: false,
    description: null
  })))
}

export function SettingsConsole() {
  const [items, setItems] = useState<SettingItem[]>([])
  const [diagnostics, setDiagnostics] = useState<SettingDiagnostic[]>([])
  const [editingField, setEditingField] = useState<string | null>(null)
  const [sensitiveDrafts, setSensitiveDrafts] = useState<Record<string, string>>({})
  const [proxyUrls, setProxyUrls] = useState<ProxyUrlConfig[]>([])
  const [savedProxyUrls, setSavedProxyUrls] = useState<ProxyUrlConfig[]>([])
  const [savedCategoryRecords, setSavedCategoryRecords] = useState<Record<string, Record<string, string>>>({})
  const [validatingCategory, setValidatingCategory] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const load = async () => {
    const response = await fetch('/api/admin/settings')
    const body = await response.json()
    const nextItems = body.items || []

    setItems(nextItems)
    setDiagnostics(body.diagnostics || [])
    setSensitiveDrafts({})
    const categories = Array.from(new Set([...CATEGORY_ORDER, ...nextItems.map((item: SettingItem) => item.category)]))
    setSavedCategoryRecords(
      categories.reduce<Record<string, Record<string, string>>>((accumulator, category) => {
        accumulator[category] = buildComparableCategoryRecord(category, nextItems)
        return accumulator
      }, {})
    )
    const proxySetting = nextItems.find((item: SettingItem) => item.category === 'proxy' && item.key === 'urls')
    try {
      const parsed = JSON.parse(String(proxySetting?.value || '[]'))
      const normalized = Array.isArray(parsed)
        ? parsed
            .map((item) => {
              if (!item || typeof item !== 'object') return null
              const url = String((item as { url?: unknown }).url || '').trim()
              const country = String((item as { country?: unknown }).country || inferProxyCountryFromUrl(url)).trim().toUpperCase()
              return country && url ? { country, url, error: validateProxyUrlFormat(url) || undefined } : null
            })
            .filter(Boolean) as ProxyUrlConfig[]
        : []
      setProxyUrls(normalized)
      setSavedProxyUrls(normalized)
    } catch {
      setProxyUrls([])
      setSavedProxyUrls([])
    }
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
  const getCategoryItems = (category: string): SettingItem[] => {
    const current = grouped[category] || []
    const currentMap = new Map(current.map((item) => [item.key, item]))
    const defined = CATEGORY_FIELDS[category] || []
    const merged = defined.map((definition) => {
      const existing = currentMap.get(definition.key)
      const fieldMeta = getFieldMeta(definition)
      return {
        category,
        key: definition.key,
        value: existing?.value ?? fieldMeta?.defaultValue ?? null,
        hasValue: existing?.hasValue,
        dataType: existing?.dataType || definition.dataType,
        isSensitive: existing?.isSensitive ?? definition.isSensitive,
        description: existing?.description ?? fieldMeta?.description ?? definition.description ?? null
      }
    })
    const extra = current.filter((item) => !defined.some((definition) => definition.key === item.key))
    return [...merged, ...extra]
  }

  const updateItem = (target: SettingItem, nextValue: string | null) => {
    setItems((current) => {
      const exists = current.some((candidate) => candidate.category === target.category && candidate.key === target.key)
      if (!exists) {
        return [
          ...current,
          {
            ...target,
            value: nextValue,
            hasValue: nextValue ? true : target.hasValue
          }
        ]
      }
      return current.map((candidate) =>
        candidate.category === target.category && candidate.key === target.key
          ? { ...candidate, value: nextValue, hasValue: nextValue ? true : candidate.hasValue }
          : candidate
      )
    })
  }

  const handleInputChange = (item: SettingItem, nextValue: string) => {
    if (item.category === 'ai' && item.key === 'gemini_provider') {
      const normalizedModel = getAiModel(nextValue, getDefaultedValue({ category: 'ai', key: 'gemini_model', value: grouped.ai?.find((entry) => entry.key === 'gemini_model')?.value ?? null }))
      updateItem(item, nextValue)
      updateItem({ category: 'ai', key: 'gemini_model', value: null, dataType: 'string', isSensitive: false, description: getFieldMeta({ category: 'ai', key: 'gemini_model' })?.description || null }, normalizedModel)
      updateItem({ category: 'ai', key: 'gemini_endpoint', value: null, dataType: 'string', isSensitive: false, description: getFieldMeta({ category: 'ai', key: 'gemini_endpoint' })?.description || null }, getAiEndpoint(nextValue))
      return
    }

    if (item.category === 'ai' && item.key === 'gemini_model') {
      const provider = getDefaultedValue({ category: 'ai', key: 'gemini_provider', value: grouped.ai?.find((entry) => entry.key === 'gemini_provider')?.value ?? null }) || 'official'
      updateItem(item, getAiModel(provider, nextValue))
      updateItem({ category: 'ai', key: 'gemini_endpoint', value: null, dataType: 'string', isSensitive: false, description: getFieldMeta({ category: 'ai', key: 'gemini_endpoint' })?.description || null }, getAiEndpoint(provider))
      return
    }

    updateItem(item, nextValue)
  }

  const validateCategoryItems = (category: string, categoryItems: SettingItem[]): string | null => {
    if (category === 'ai') {
      const provider = getDefaultedValue(categoryItems.find((item) => item.key === 'gemini_provider') || { category: 'ai', key: 'gemini_provider', value: 'official' })
      const model = getDefaultedValue(categoryItems.find((item) => item.key === 'gemini_model') || { category: 'ai', key: 'gemini_model', value: GEMINI_OFFICIAL_MODEL })
      const apiKeyItem = categoryItems.find((item) => item.key === (provider === 'relay' ? 'gemini_relay_api_key' : 'gemini_api_key'))
      if (!['official', 'relay'].includes(provider)) return 'AI 服务商只能是 Gemini 官方或第三方中转'
      if (!model.trim()) return '请先选择 AI 模型'
      if (!apiKeyItem?.hasValue && !apiKeyItem?.value?.trim()) return provider === 'relay' ? '请填写第三方中转 API Key' : '请填写 Gemini 官方 API Key'
    }

    if (category === 'proxy') {
      const validProxyUrls = proxyUrls.filter((item) => item.country.trim() && item.url.trim())
      if (validProxyUrls.length === 0) return '至少需要配置一个代理 URL'
      const duplicateCountries = new Set<string>()
      for (const item of validProxyUrls) {
        if (duplicateCountries.has(item.country)) return `国家 ${item.country} 重复配置`
        duplicateCountries.add(item.country)
        const error = validateProxyUrlFormat(item.url)
        if (error) return error
      }
    }

    if (category === 'seo') {
      for (const item of categoryItems.filter((entry) => entry.key.endsWith('Json') && entry.value?.trim())) {
        try {
          JSON.parse(item.value || '')
        } catch {
          return `${getFieldMeta(item)?.label || item.key} 必须是有效 JSON`
        }
      }
    }

    return null
  }

  const persistItems = async (nextItems: SettingItem[], successMessage: string) => {
    const response = await fetch('/api/admin/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: nextItems })
    })

    if (!response.ok) {
      const body = await response.json().catch(() => ({}))
      toast.error(body.error || '保存设置失败')
      return
    }

    await load()
    toast.success(successMessage)
  }

  const buildValidationConfig = (category: string, categoryItems: SettingItem[]): Record<string, string> => {
    if (category === 'proxy') {
      const sanitizedProxyUrls = proxyUrls
        .filter((item) => item.country.trim() && item.url.trim())
        .map((item) => ({ country: item.country.trim().toUpperCase(), url: item.url.trim() }))
      return {
        urls: JSON.stringify(sanitizedProxyUrls)
      }
    }

    return categoryItems.reduce<Record<string, string>>((accumulator, item) => {
      accumulator[item.key] = String(item.value || '')
      return accumulator
    }, {})
  }

  const validateCategory = async (category: string) => {
    const provider = getDefaultedValue(getCategoryItems('ai').find((entry) => entry.key === 'gemini_provider') || { category: 'ai', key: 'gemini_provider', value: 'official' })
    const categoryItems = getCategoryItems(category).filter((item) => {
      if (category === 'proxy' && (item.key === 'urls' || item.key === 'defaultCountryCode')) return false
      return item.category !== 'ai' || shouldShowAiField(provider, item.key)
    })
    const error = validateCategoryItems(category, categoryItems)
    if (error) {
      toast.error(error)
      return
    }

    if (!(VALIDATABLE_CATEGORIES as readonly string[]).includes(category)) {
      toast.success(`${CATEGORY_META[category]?.title || category} 配置格式通过`)
      return
    }

    setValidatingCategory(category)
    try {
      const response = await fetch('/api/admin/settings/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category,
          config: buildValidationConfig(category, categoryItems)
        })
      })
      const body = await response.json().catch(() => ({}))

      if (!response.ok) {
        toast.error(body.error || '配置验证失败')
        return
      }

      if (body.valid) {
        toast.success(body.message || `${CATEGORY_META[category]?.title || category} 配置验证成功`)
        return
      }

      toast.error(body.message || `${CATEGORY_META[category]?.title || category} 配置验证失败`)
    } finally {
      setValidatingCategory(null)
    }
  }

  const saveCategory = (category: string) => {
    let categoryItems = getCategoryItems(category).filter((item) => {
      const provider = getDefaultedValue(getCategoryItems('ai').find((entry) => entry.key === 'gemini_provider') || { category: 'ai', key: 'gemini_provider', value: 'official' })
      return item.category !== 'ai' || shouldShowAiField(provider, item.key)
    })
    if (category === 'proxy') {
      const sanitizedProxyUrls = proxyUrls
        .filter((item) => item.country.trim() && item.url.trim())
        .map((item) => ({ country: item.country.trim().toUpperCase(), url: item.url.trim() }))
      categoryItems = categoryItems
        .filter((item) => item.key !== 'urls')
        .concat({
          category: 'proxy',
          key: 'urls',
          value: JSON.stringify(sanitizedProxyUrls),
          hasValue: sanitizedProxyUrls.length > 0,
          dataType: 'json',
          isSensitive: false,
          description: getFieldMeta({ category: 'proxy', key: 'urls' })?.description || null
        })
    }
    const error = validateCategoryItems(category, categoryItems)
    if (error) {
      toast.error(error)
      return
    }
    startTransition(async () => {
      await persistItems(categoryItems, `${CATEGORY_META[category]?.title || category} 配置已保存`)
    })
  }

  const hasUnsavedChanges = (category: string) => {
    if (category === 'proxy') {
      return JSON.stringify(normalizeComparableProxyUrls(proxyUrls)) !== JSON.stringify(normalizeComparableProxyUrls(savedProxyUrls))
    }

    const currentItems = getCategoryItems(category).filter((item) => {
      if (category !== 'ai') return true
      const provider = getDefaultedValue(getCategoryItems('ai').find((entry) => entry.key === 'gemini_provider') || { category: 'ai', key: 'gemini_provider', value: 'official' })
      return shouldShowAiField(provider, item.key)
    })
    const currentRecord = normalizeComparableRecord(currentItems)
    const savedRecord = savedCategoryRecords[category] || {}
    const comparableSavedRecord = Object.keys(currentRecord).reduce<Record<string, string>>((accumulator, key) => {
      accumulator[key] = String(savedRecord[key] || '')
      return accumulator
    }, {})
    return JSON.stringify(currentRecord) !== JSON.stringify(comparableSavedRecord)
  }

  const getValidateDisabledReason = (category: string): string | null => {
    if (isPending) return '正在保存中'
    if (hasUnsavedChanges(category)) return '有未保存的修改，请先保存配置'
    return null
  }

  const isReadOnlySetting = (category: string, key: string) => {
    if (category === 'ai' && key === 'gemini_endpoint') return true
    return category === 'affiliate_sync' && key === 'partnerboost_base_url'
  }

  const deleteAiCurrentKey = () => {
    const aiItems = getCategoryItems('ai')
    const provider = getDefaultedValue(aiItems.find((item) => item.key === 'gemini_provider') || { category: 'ai', key: 'gemini_provider', value: 'official' })
    const key = provider === 'relay' ? 'gemini_relay_api_key' : 'gemini_api_key'
    if (!window.confirm(provider === 'relay' ? '确认删除第三方中转 API Key？' : '确认删除 Gemini 官方 API Key？')) return
    const nextItems = aiItems.map((item) => (item.key === key ? { ...item, value: '', hasValue: false } : item))
    startTransition(async () => {
      await persistItems(nextItems, 'AI Key 已删除')
    })
  }

  const addProxyUrl = () => {
    const usedCountries = new Set(proxyUrls.map((item) => item.country))
    const available = SUPPORTED_PROXY_COUNTRIES.find((item) => !usedCountries.has(item.code))
    if (!available) {
      toast.error('所有支持的国家都已配置代理 URL，无法继续添加')
      return
    }
    setProxyUrls((current) => [...current, { country: available.code, url: '' }])
  }

  const removeProxyUrl = (index: number) => {
    setProxyUrls((current) => current.filter((_, itemIndex) => itemIndex !== index))
  }

  const updateProxyUrl = (index: number, field: 'country' | 'url', value: string) => {
    if (field === 'country') {
      const nextCountry = value.toUpperCase()
      const isDuplicate = proxyUrls.some((item, itemIndex) => itemIndex !== index && item.country === nextCountry)
      if (isDuplicate) {
        toast.error(`国家 ${nextCountry} 已经配置过代理 URL`)
        return
      }
    }

    setProxyUrls((current) =>
      current.map((item, itemIndex) => {
        if (itemIndex !== index) return item
        const nextItem = {
          ...item,
          [field]: field === 'country' ? value.toUpperCase() : value,
          country: field === 'url' && !item.country.trim()
            ? inferProxyCountryFromUrl(value)
            : field === 'country' ? value.toUpperCase() : item.country
        }
        return {
          ...nextItem,
          error: validateProxyUrlFormat(nextItem.url) || undefined
        }
      })
    )
  }

  const renderInput = (item: SettingItem) => {
    const fieldMeta = getFieldMeta(item)
    const value = getDefaultedValue(item)
    const options = fieldMeta?.options || (item.dataType === 'boolean'
      ? [
          { value: 'true', label: '启用' },
          { value: 'false', label: '禁用' }
        ]
      : null)

    if (options) {
      const filteredOptions =
        item.category === 'ai' && item.key === 'gemini_model'
          ? options.filter((option) => {
              const provider = getDefaultedValue(getCategoryItems('ai').find((entry) => entry.key === 'gemini_provider') || { category: 'ai', key: 'gemini_provider', value: 'official' })
              return isModelSupportedByProvider(option.value, provider)
            })
          : options
      return (
        <Select value={value} onValueChange={(nextValue) => handleInputChange(item, nextValue)} className="rounded-lg">
          <SelectValue placeholder="请选择" />
          <SelectContent>
            {filteredOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )
    }

    if (isReadOnlySetting(item.category, item.key)) {
      return (
        <Input
          value={value}
          readOnly
          disabled
          placeholder={fieldMeta?.placeholder}
          className="rounded-lg border-slate-200 bg-slate-100 text-slate-500"
        />
      )
    }

    if (item.dataType === 'boolean') {
      return (
        <div className="flex min-h-10 items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2">
          <span className="text-sm text-slate-600">{value === 'true' ? '已启用' : '已停用'}</span>
          <Switch checked={value === 'true'} onCheckedChange={(checked) => handleInputChange(item, checked ? 'true' : 'false')} />
        </div>
      )
    }

    if (item.isSensitive) {
      const fieldKey = `${item.category}.${item.key}`
      const isEditing = editingField === fieldKey
      const draftValue = sensitiveDrafts[fieldKey]
      const hasValue = Boolean(item.hasValue || item.value?.trim())
      const displayValue = isEditing ? draftValue ?? '' : hasValue ? SENSITIVE_PLACEHOLDER : ''
      return (
        <div className="space-y-1">
          <Input
            value={displayValue}
            type="password"
            onFocus={() => setEditingField(fieldKey)}
            onBlur={() => setEditingField(null)}
            onChange={(event) => {
              setSensitiveDrafts((current) => ({ ...current, [fieldKey]: event.target.value }))
              updateItem(item, event.target.value)
            }}
            placeholder={fieldMeta?.placeholder}
            className={hasValue && !isEditing ? 'border-emerald-300 bg-emerald-50/40' : undefined}
          />
          {hasValue && !isEditing ? (
            <p className="flex items-center gap-1 text-xs text-emerald-700">
              <CheckCircle2 className="h-3 w-3" />
              已配置，点击输入框可替换
            </p>
          ) : null}
        </div>
      )
    }

    if (item.dataType === 'json' || item.dataType === 'text') {
      return (
        <Textarea
          value={value}
          onChange={(event) => handleInputChange(item, event.target.value)}
          placeholder={fieldMeta?.placeholder}
          rows={fieldMeta?.rows || 5}
          className="rounded-lg border-slate-200 bg-white font-mono text-xs leading-5"
        />
      )
    }

    return (
      <Input
        value={value}
        type={item.dataType === 'number' ? 'number' : 'text'}
        min={item.dataType === 'number' ? 0 : undefined}
        onChange={(event) => handleInputChange(item, event.target.value)}
        placeholder={fieldMeta?.placeholder}
        className="rounded-lg border-slate-200 bg-white"
      />
    )
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <div>
        <h1 className="page-title">系统配置</h1>
        <p className="page-subtitle">管理 API 密钥、代理设置和系统偏好</p>
      </div>

      <Card className="border-blue-200 bg-blue-50 p-4">
        <div className="flex items-start gap-2">
          <Info className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />
          <div className="text-body-sm text-blue-800">
            <p className="mb-2 text-body-sm font-semibold">配置说明</p>
            <ul className="space-y-1 text-body-sm text-blue-700">
              <li>• 敏感数据（如 API 密钥、服务账号 JSON）使用加密存储，界面只显示固定占位符</li>
              <li>• 标记为“必填”的配置项需要填写完整才能使用对应功能</li>
              <li>• <strong>AI 引擎</strong>：按“服务商 → 模型 → API 端点 → 当前服务商 API Key”完成配置</li>
              <li>• 如遇 API 访问问题，可先检查代理、端点和当前服务商 Key 是否匹配</li>
            </ul>
          </div>
        </div>
      </Card>

      {diagnostics.length ? (
        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {diagnostics.map((item) => (
          <Card key={item.id} className={`p-3 ${getDiagnosticPanelTone(item.status)}`}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-950">{item.title}</p>
                <p className="mt-1 text-xs leading-5 text-slate-600">{item.detail}</p>
              </div>
              {item.status === 'configured' ? <CheckCircle2 className="h-4 w-4 text-emerald-700" /> : <AlertCircle className="h-4 w-4 text-amber-700" />}
            </div>
          </Card>
        ))}
        </section>
      ) : null}

      <section className="space-y-6">
        {categoryList.map((category) => {
          const categoryItems = getCategoryItems(category)
          if (!categoryItems.length) return null

          const categoryMeta = CATEGORY_META[category] || {
            title: category,
            description: '此内部系统区域的运行时配置。',
            color: 'text-slate-600'
          }
          const Icon = getCategoryIcon(category)
          const provider = getDefaultedValue(getCategoryItems('ai').find((item) => item.key === 'gemini_provider') || { category: 'ai', key: 'gemini_provider', value: 'official' })
          const hasAffiliateSyncConfigToDelete = category === 'affiliate_sync'
            ? AFFILIATE_SYNC_DELETABLE_KEYS.some((key) => {
                const target = categoryItems.find((item) => item.key === key)
                if (!target) return false
                if (target.isSensitive) return Boolean(target.hasValue)
                const value = String(getDefaultedValue(target)).trim()
                if (key === 'amazonPageSize' || key === 'dtcPageSize') return value !== '20'
                if (key === 'maxPagesPerSync') return value !== '5'
                return Boolean(value)
              })
            : false
          const visibleItems = categoryItems.filter((item) => {
            if (category === 'proxy' && (item.key === 'urls' || item.key === 'defaultCountryCode')) return false
            return item.category !== 'ai' || shouldShowAiField(provider, item.key)
          })
          const isValidating = validatingCategory === category

          return (
            <Card key={category} className="p-6">
              <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className={`rounded-lg bg-slate-100 p-2 ${categoryMeta.color}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="card-title">{categoryMeta.title}</h2>
                    <p className="mt-1 text-body-sm text-muted-foreground">{categoryMeta.description}</p>
                  </div>
                </div>
              </div>

              {category === 'ai' ? (
                <div className="mb-6 rounded-lg border border-purple-200 bg-purple-50 p-4">
                  <div className="mb-3 flex items-start gap-2">
                    <Info className="mt-0.5 h-5 w-5 shrink-0 text-purple-600" />
                    <p className="font-semibold text-body-sm text-purple-800">AI 配置顺序</p>
                  </div>
                  <div className="space-y-2 text-body-sm text-purple-700">
                      <p>1. 先选服务商 2. 再选 AI 模型 3. 系统自动计算 API 端点 4. 填写当前服务商对应的 API Key</p>
                      <p className="text-purple-700">仅当前服务商对应的 API Key 会生效。</p>
                  </div>
                </div>
              ) : null}

              {category === 'proxy' ? (
                <div className="mb-6 space-y-4 rounded-lg border border-emerald-200 bg-emerald-50 p-4">
                  <div>
                    <p className="font-semibold text-body-sm text-emerald-800">代理 URL 配置</p>
                    <p className="mt-1 text-body-sm text-emerald-700">按 autobb 的后台方式管理国家代理列表。第一个配置的代理仍会作为默认兜底。</p>
                    <p className="mt-2 rounded border border-amber-400 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                      当前已支持 IPRocket、Oxylabs、Kookeey、Cliproxy 四种代理格式。
                    </p>
                    <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
                      <p className="mb-3 flex items-center gap-1 text-caption font-semibold text-slate-700">
                        <Info className="h-4 w-4" />
                        代理 URL 格式说明
                      </p>
                      <div className="grid gap-3 md:grid-cols-2">
                        <div className="rounded border border-blue-200 bg-white p-3">
                          <div className="mb-2 flex items-center gap-2">
                            <span className="rounded bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">IPRocket</span>
                            <span className="text-xs text-slate-600">API 格式</span>
                          </div>
                          <div className="break-all rounded bg-slate-100 p-2 font-mono text-xs text-slate-700">
                            https://api.iprocket.io/api?username=...&password=...&cc=...&ips=1&proxyType=http&responseType=txt
                          </div>
                        </div>
                        <div className="rounded border border-green-200 bg-white p-3">
                          <div className="mb-2 flex items-center gap-2">
                            <span className="rounded bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">Oxylabs</span>
                            <span className="text-xs text-slate-600">直连格式</span>
                          </div>
                          <div className="break-all rounded bg-slate-100 p-2 font-mono text-xs text-slate-700">
                            https://username:password@pr.oxylabs.io:port
                          </div>
                        </div>
                        <div className="rounded border border-violet-200 bg-white p-3 md:col-span-2">
                          <div className="mb-2 flex items-center gap-2">
                            <span className="rounded bg-violet-100 px-2 py-0.5 text-xs font-medium text-violet-700">Kookeey / Cliproxy</span>
                            <span className="text-xs text-slate-600">直连格式</span>
                          </div>
                          <div className="break-all rounded bg-slate-100 p-2 font-mono text-xs text-slate-700">
                            host:port:username:password
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  {proxyUrls.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-emerald-300 bg-white p-6 text-center">
                      <p className="text-sm text-muted-foreground">暂未配置代理 URL</p>
                      <Button type="button" variant="outline" size="sm" className="mt-3" onClick={addProxyUrl}>
                        <Plus className="mr-1 h-4 w-4" />
                        添加代理 URL
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {proxyUrls.map((item, index) => (
                        <div key={`${item.country}-${index}`} className="grid gap-3 rounded-lg border bg-white p-3 lg:grid-cols-[180px_minmax(0,1fr)_auto]">
                          <div>
                            <Label className="mb-1.5 block text-caption text-muted-foreground">
                              国家/地区 {index === 0 ? <span className="text-amber-600">(默认)</span> : null}
                            </Label>
                            <Select value={item.country} onValueChange={(nextValue) => updateProxyUrl(index, 'country', nextValue)}>
                              {SUPPORTED_PROXY_COUNTRIES.map((country) => (
                                <SelectItem key={country.code} value={country.code}>
                                  {country.label}
                                </SelectItem>
                              ))}
                            </Select>
                          </div>
                          <div>
                            <Label className="mb-1.5 block text-caption text-muted-foreground">代理 URL</Label>
                            <Input
                              value={item.url}
                              onChange={(event) => updateProxyUrl(index, 'url', event.target.value)}
                              placeholder="https://user:pass@proxy:port 或 host:port:username:password"
                              className={item.error ? 'border-rose-400' : undefined}
                            />
                            {item.error ? <p className="mt-1 text-xs text-rose-600">{item.error}</p> : null}
                          </div>
                          <div className="pt-6">
                            <Button type="button" variant="ghost" size="sm" className="text-rose-600 hover:bg-rose-50 hover:text-rose-700" onClick={() => removeProxyUrl(index)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                      <Button type="button" variant="outline" size="sm" onClick={addProxyUrl}>
                        <Plus className="mr-1 h-4 w-4" />
                        添加更多代理 URL
                      </Button>
                    </div>
                  )}
                  {proxyUrls.length > 0 ? (
                    <p className="flex items-center gap-1 text-caption text-amber-600">
                      <Info className="h-3 w-3" />
                      提示：第一个配置的代理 URL 会作为默认兜底，当请求国家没有专属代理时优先使用它。
                    </p>
                  ) : null}
                </div>
              ) : null}

              <div className="grid grid-cols-1 gap-x-8 gap-y-5 lg:grid-cols-2">
                {visibleItems.map((item) => {
                  const fieldMeta = getFieldMeta(item)
                  const required = isRequiredField(item.category, item.key, provider)
                  return (
                    <div key={`${item.category}.${item.key}`} className="space-y-2">
                      <div className="flex items-center justify-between gap-3">
                        <Label className="label-text flex items-center gap-2">
                          {fieldMeta?.label || item.key}
                          {required ? <span className="text-caption text-red-500">*必填</span> : null}
                          {category === 'affiliate_sync' && isReadOnlySetting(category, item.key) ? (
                            <Badge variant="outline" className="border-slate-300 bg-slate-100 text-slate-600">固定默认</Badge>
                          ) : null}
                          {item.isSensitive ? <Badge className="bg-slate-900 text-white">密钥</Badge> : null}
                        </Label>
                        {fieldMeta?.helpLink ? (
                          <a
                            href={fieldMeta.helpLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-caption text-primary hover:text-primary/80"
                          >
                            获取方式
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        ) : null}
                      </div>
                      <p className="helper-text flex items-start gap-1">
                        <Info className="mt-0.5 h-3 w-3 shrink-0" />
                        {fieldMeta?.description || item.description || '暂无说明'}
                      </p>
                      {renderInput(item)}
                    </div>
                  )
                })}
              </div>

              <div className="mt-6 flex flex-wrap gap-3 border-t border-slate-200 pt-4">
                <Button disabled={isPending} onClick={() => saveCategory(category)}>
                  {isPending ? '保存中...' : '保存配置'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={Boolean(getValidateDisabledReason(category)) || isValidating}
                  onClick={() => void validateCategory(category)}
                >
                  {isValidating ? '验证中...' : '验证配置'}
                </Button>
                {category === 'ai' ? (
                  <Button type="button" variant="destructive" disabled={isPending} onClick={deleteAiCurrentKey}>
                    <Trash2 className="mr-2 h-4 w-4" />
                    删除配置
                  </Button>
                ) : null}
                {category === 'affiliate_sync' ? (
                  <Button
                    type="button"
                    variant="destructive"
                    disabled={isPending || !hasAffiliateSyncConfigToDelete}
                    onClick={() => {
                      if (!window.confirm('确认删除当前联盟同步配置？这会清空 Token，并将分页参数恢复为默认值。')) return
                      const nextItems = categoryItems.map((item) => {
                        if (item.key === 'partnerboost_token') {
                          return { ...item, value: '', hasValue: false }
                        }
                        if (item.key === 'partnerboost_base_url') {
                          return { ...item, value: DEFAULT_PARTNERBOOST_BASE_URL }
                        }
                        if (item.key === 'amazonPageSize') {
                          return { ...item, value: '20' }
                        }
                        if (item.key === 'dtcPageSize') {
                          return { ...item, value: '20' }
                        }
                        if (item.key === 'maxPagesPerSync') {
                          return { ...item, value: '5' }
                        }
                        return item
                      })
                      startTransition(async () => {
                        await persistItems(nextItems, '联盟同步配置已删除')
                      })
                    }}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    删除配置
                  </Button>
                ) : null}
              </div>
              {VALIDATABLE_CATEGORIES.includes(category as typeof VALIDATABLE_CATEGORIES[number]) && getValidateDisabledReason(category)?.includes('未保存') ? (
                <p className="mt-2 flex items-center gap-1 text-caption text-amber-600">
                  <Info className="h-3 w-3" />
                  {getValidateDisabledReason(category)}
                </p>
              ) : null}
            </Card>
          )
        })}
      </section>
    </div>
  )
}
