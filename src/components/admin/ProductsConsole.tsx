'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { EmptyState } from '@/components/ui/empty-state'
import { Input } from '@/components/ui/input'
import { Select, SelectItem } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { StatusBadge } from '@/components/admin/StatusBadge'
import { cn } from '@/lib/utils'
import { AlertCircle, ChevronDown, ExternalLink, RefreshCw, Settings2, Wand2, XCircle } from 'lucide-react'

type AffiliateInventoryItem = {
  id: number
  platform: string
  external_id: string
  merchant_id: string | null
  asin: string | null
  brand: string | null
  product_name: string | null
  product_model: string | null
  model_number: string | null
  product_type: string | null
  category: string | null
  category_slug: string | null
  product_url: string | null
  promo_link: string | null
  short_promo_link: string | null
  image_url: string | null
  price_amount: number | null
  price_currency: string | null
  commission_rate: number | null
  review_count: number | null
  rating: number | null
  country_code: string | null
  created_at: string
  updated_at: string
  linked_product_id: number | null
  linked_product_slug: string | null
  linked_product_name: string | null
  linked_product_price_amount: number | null
  linked_product_updated_at: string | null
  pipeline_status: string | null
  pipeline_stage: string | null
  hero_image_url: string | null
}

type Product = {
  id: number
  product_name: string
  category: string | null
  product_model: string | null
  model_number: string | null
  product_type: string | null
  category_slug: string | null
  price_amount: number | null
  slug: string | null
  affiliate_product_id: number | null
  hero_image_url: string | null
  last_run_status: string | null
  last_run_stage: string | null
  conversion_readiness: ConversionReadiness
  conversion_blockers: string[]
  conversion_blocker_count: number
  evidence_count: number
  active_affiliate_links: number
  available_affiliate_links: number
  risk_evidence_count: number
  out_of_stock_link_issues: number
  broken_link_issues: number
  updated_at: string
}

type Summary = {
  totalAffiliateProducts: number
  linkedProducts: number
  inventoryOnlyProducts: number
  withPromoLink: number
  withoutPromoLink: number
  runningPipelines: number
  platformGroups: Record<'partnerboost' | 'manual' | 'other', number>
}

type ProductsPayloadMeta = {
  compact: boolean
  affiliateProductsReturned: number
  productsReturned: number
  affiliateLimit: number
  productLimit: number
}

type SortMode = 'updated_desc' | 'updated_asc' | 'price_desc' | 'reviews_desc' | 'linked_first'
type PlatformFilter = 'all' | 'partnerboost' | 'manual' | 'other'
type LinkStateFilter = 'all' | 'linked' | 'inventory_only'
type CountryFilter = 'all' | 'US' | 'GB' | 'CA' | 'AU' | 'DE' | 'FR' | 'ROW' | 'unknown'
type WorkspaceActionId = 'contentPack' | 'mineKeywords' | 'generateReview' | 'generateComparison' | 'refreshSeo'
type ConversionReadiness =
  | 'buy-ready'
  | 'blocked-no-link'
  | 'blocked-price'
  | 'blocked-evidence'
  | 'blocked-stock'
  | 'blocked-risk'
type ConversionReadinessFilter = 'all' | ConversionReadiness

const WORKSPACE_ACTIONS: Array<{
  id: WorkspaceActionId
  label: string
  successMessage: string
}> = [
  { id: 'contentPack', label: '排队内容包', successMessage: '内容包已排队' },
  { id: 'mineKeywords', label: '排队关键词挖掘', successMessage: '关键词挖掘已排队' },
  { id: 'generateReview', label: '排队评测', successMessage: '评测生成已排队' },
  { id: 'generateComparison', label: '排队对比', successMessage: '对比生成已排队' },
  { id: 'refreshSeo', label: '排队 SEO 刷新', successMessage: 'SEO 刷新已排队' }
]

function normalizeInventoryPlatform(platform: string): PlatformFilter {
  if (platform === 'partnerboost_amazon' || platform === 'partnerboost_dtc') return 'partnerboost'
  if (platform === 'manual') return 'manual'
  return 'other'
}

function formatMoney(amount: number | null, currency: string | null) {
  if (amount == null) return 'N/A'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency || 'USD',
    maximumFractionDigits: 2
  }).format(amount)
}

function formatNumber(value: number | null) {
  if (value == null) return 'N/A'
  return new Intl.NumberFormat('en-US').format(value)
}

function formatPercent(value: number | null) {
  if (value == null) return 'N/A'
  return `${value}%`
}

function formatDate(value: string | null) {
  if (!value) return 'N/A'
  return new Date(value).toLocaleString()
}

function renderInventoryState(item: AffiliateInventoryItem) {
  if (item.linked_product_id) {
    return (
      <span className="inline-flex rounded-full bg-emerald-100 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-800">
        已挂接商品
      </span>
    )
  }

  return (
    <span className="inline-flex rounded-full bg-amber-100 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-800">
      仅库存
    </span>
  )
}

function renderLinkState(item: AffiliateInventoryItem) {
  if (item.promo_link || item.short_promo_link) {
    return (
      <span className="inline-flex rounded-full bg-sky-100 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-sky-800">
        推广链接就绪
      </span>
    )
  }

  return (
    <span className="inline-flex rounded-full bg-rose-100 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-rose-800">
      缺少推广链接
    </span>
  )
}

function renderConversionReadiness(value: ConversionReadiness) {
  return <StatusBadge value={value} />
}

export function ProductsConsole() {
  const router = useRouter()
  const [affiliateProducts, setAffiliateProducts] = useState<AffiliateInventoryItem[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [summary, setSummary] = useState<Summary>({
    totalAffiliateProducts: 0,
    linkedProducts: 0,
    inventoryOnlyProducts: 0,
    withPromoLink: 0,
    withoutPromoLink: 0,
    runningPipelines: 0,
    platformGroups: {
      partnerboost: 0,
      manual: 0,
      other: 0
    }
  })
  const [payloadMeta, setPayloadMeta] = useState<ProductsPayloadMeta | null>(null)
  const [importLink, setImportLink] = useState('')
  const [importBrand, setImportBrand] = useState('')
  const [importModel, setImportModel] = useState('')
  const [importModelNumber, setImportModelNumber] = useState('')
  const [importProductType, setImportProductType] = useState('')
  const [importCategory, setImportCategory] = useState('')
  const [importCategorySlug, setImportCategorySlug] = useState('')
  const [importCountryCode, setImportCountryCode] = useState('US')
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [syncAndQueueNew, setSyncAndQueueNew] = useState(true)
  const [search, setSearch] = useState('')
  const [midFilter, setMidFilter] = useState('')
  const [platformFilter, setPlatformFilter] = useState<PlatformFilter>('all')
  const [linkStateFilter, setLinkStateFilter] = useState<LinkStateFilter>('all')
  const [countryFilter, setCountryFilter] = useState<CountryFilter>('all')
  const [sortMode, setSortMode] = useState<SortMode>('updated_desc')
  const [conversionReadinessFilter, setConversionReadinessFilter] = useState<ConversionReadinessFilter>('all')
  const [isPending, startTransition] = useTransition()

  const load = async () => {
    const response = await fetch('/api/admin/products?affiliateLimit=300&productLimit=120')
    const body = await response.json()
    setAffiliateProducts(body.affiliateProducts || [])
    setProducts(body.products || [])
    setPayloadMeta(body.meta || null)
    setSummary(body.summary || {
      totalAffiliateProducts: 0,
      linkedProducts: 0,
      inventoryOnlyProducts: 0,
      withPromoLink: 0,
      withoutPromoLink: 0,
      runningPipelines: 0,
      platformGroups: { partnerboost: 0, manual: 0, other: 0 }
    })
  }

  useEffect(() => {
    void load()
  }, [])

  const hasActiveRuns = affiliateProducts.some((item) => item.pipeline_status === 'queued' || item.pipeline_status === 'running')
    || products.some((product) => product.last_run_status === 'queued' || product.last_run_status === 'running')

  useEffect(() => {
    if (!hasActiveRuns) return
    const intervalId = window.setInterval(() => {
      void load()
    }, 4000)
    return () => window.clearInterval(intervalId)
  }, [hasActiveRuns])

  const filteredAffiliateProducts = useMemo(() => {
    const normalizedQuery = search.trim().toLowerCase()
    const normalizedMid = midFilter.trim().toLowerCase()
    const nextItems = affiliateProducts.filter((item) => {
      if (platformFilter !== 'all' && normalizeInventoryPlatform(item.platform) !== platformFilter) {
        return false
      }

      if (linkStateFilter === 'linked' && !item.linked_product_id) return false
      if (linkStateFilter === 'inventory_only' && item.linked_product_id) return false
      if (countryFilter !== 'all') {
        const code = String(item.country_code || '').trim().toUpperCase()
        if (countryFilter === 'unknown' ? Boolean(code) : code !== countryFilter) return false
      }
      if (normalizedMid && !`${item.merchant_id || ''}`.toLowerCase().includes(normalizedMid)) return false

      if (!normalizedQuery) return true

      const haystack = [
        item.product_name,
        item.brand,
        item.external_id,
        item.asin,
        item.product_model,
        item.model_number,
        item.category,
        item.category_slug,
        item.product_url,
        item.promo_link,
        item.linked_product_name
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()

      return haystack.includes(normalizedQuery)
    })

    nextItems.sort((left, right) => {
      if (sortMode === 'updated_asc') {
        return new Date(left.updated_at).getTime() - new Date(right.updated_at).getTime()
      }
      if (sortMode === 'price_desc') {
        return (right.price_amount || -1) - (left.price_amount || -1)
      }
      if (sortMode === 'reviews_desc') {
        return (right.review_count || -1) - (left.review_count || -1)
      }
      if (sortMode === 'linked_first') {
        return Number(Boolean(right.linked_product_id)) - Number(Boolean(left.linked_product_id))
      }
      return new Date(right.updated_at).getTime() - new Date(left.updated_at).getTime()
    })

    return nextItems
  }, [affiliateProducts, countryFilter, linkStateFilter, midFilter, platformFilter, search, sortMode])

  const filteredSummary = useMemo(() => {
    return filteredAffiliateProducts.reduce(
      (accumulator, item) => {
        accumulator.visible += 1
        if (normalizeInventoryPlatform(item.platform) === 'partnerboost') accumulator.partnerboost += 1
        if (item.linked_product_id) accumulator.linked += 1
        if (item.promo_link || item.short_promo_link) accumulator.withPromo += 1
        return accumulator
      },
      {
        visible: 0,
        partnerboost: 0,
        linked: 0,
        withPromo: 0
      }
    )
  }, [filteredAffiliateProducts])

  const visibleSelectedCount = filteredAffiliateProducts.filter((item) => selectedIds.includes(item.id)).length
  const allVisibleSelected = filteredAffiliateProducts.length > 0 && visibleSelectedCount === filteredAffiliateProducts.length
  const selectedLinkedProductIds = useMemo(
    () => [
      ...new Set(
        affiliateProducts
          .filter((item) => selectedIds.includes(item.id))
          .map((item) => item.linked_product_id)
          .filter((value): value is number => Number.isFinite(value))
      )
    ],
    [affiliateProducts, selectedIds]
  )

  const filteredProducts = useMemo(() => {
    if (conversionReadinessFilter === 'all') return products
    return products.filter((product) => product.conversion_readiness === conversionReadinessFilter)
  }, [conversionReadinessFilter, products])

  const conversionReadinessSummary = useMemo(() => {
    return products.reduce(
      (accumulator, product) => {
        accumulator.total += 1
        if (product.conversion_readiness === 'buy-ready') accumulator.buyReady += 1
        else accumulator.blocked += 1
        accumulator.byState[product.conversion_readiness] += 1
        return accumulator
      },
      {
        total: 0,
        buyReady: 0,
        blocked: 0,
        byState: {
          'buy-ready': 0,
          'blocked-no-link': 0,
          'blocked-price': 0,
          'blocked-evidence': 0,
          'blocked-stock': 0,
          'blocked-risk': 0
        } as Record<ConversionReadiness, number>
      }
    )
  }, [products])

  const trigger = (path: string, options?: {
    body?: unknown
    successMessage?: string | ((payload: any) => string)
    navigateToProduct?: boolean
  }) => {
    startTransition(async () => {
      const response = await fetch(path, {
        method: 'POST',
        headers: options?.body ? { 'Content-Type': 'application/json' } : undefined,
        body: options?.body ? JSON.stringify(options.body) : undefined
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) {
        toast.error(payload.error || 'Action failed')
        return
      }
      await load()
      if (options?.navigateToProduct && payload.productId) {
        router.push(`/admin/products/${payload.productId}`)
      }
      const successMessage =
        typeof options?.successMessage === 'function'
          ? options.successMessage(payload)
          : options?.successMessage
      toast.success(successMessage || 'Action completed')
    })
  }

  const buildSyncSuccessMessage = (label: string, payload: any) => {
    const created = Number(payload?.created || 0)
    const updated = Number(payload?.updated || 0)
    const queued = Number(payload?.queued || 0)
    const summaryText = `${label} 同步完成 · 新增 ${created} 个 / 更新 ${updated} 个`
    if (!payload?.queuePipeline) return summaryText
    return queued > 0 ? `${summaryText} · 已排队 ${queued} 个新流水线任务` : `${summaryText} · 没有需要排队的新商品`
  }

  const triggerSync = (
    platform: 'amazon' | 'dtc',
    options: { queuePipeline: boolean; queueScope: 'created' | 'createdOrUpdated' }
  ) => {
    const label = platform === 'amazon' ? 'PartnerBoost Amazon' : 'PartnerBoost DTC'
    trigger(`/api/admin/products/sync/${platform}`, {
      body: options,
      successMessage: (payload) => buildSyncSuccessMessage(label, payload)
    })
  }

  const triggerWorkspaceAction = (productId: number, action: WorkspaceActionId) => {
    const meta = WORKSPACE_ACTIONS.find((item) => item.id === action)
    if (!meta) return
    trigger(`/api/admin/products/${productId}/workspace-action`, {
      body: { action },
      successMessage: meta.successMessage
    })
  }

  const triggerBatchWorkspaceAction = (action: WorkspaceActionId) => {
    const meta = WORKSPACE_ACTIONS.find((item) => item.id === action)
    if (!meta || selectedLinkedProductIds.length === 0) return

    startTransition(async () => {
      let successCount = 0
      for (const productId of selectedLinkedProductIds) {
        const response = await fetch(`/api/admin/products/${productId}/workspace-action`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action })
        })
        if (response.ok) successCount += 1
      }
      await load()
      if (successCount === 0) {
        toast.error('批量工作台动作提交失败')
        return
      }
      toast.success(`${meta.label}：成功提交 ${successCount} 个商品`)
    })
  }

  const clearFilters = () => {
    setSearch('')
    setMidFilter('')
    setPlatformFilter('all')
    setLinkStateFilter('all')
    setCountryFilter('all')
    setSortMode('updated_desc')
    setSelectedIds([])
  }

  const clearSelection = () => {
    setSelectedIds([])
  }

  const scrollToInventory = () => {
    document.getElementById('affiliate-inventory')?.scrollIntoView({
      behavior: 'smooth',
      block: 'start'
    })
  }

  const hasActiveFilters = Boolean(
    search.trim()
      || midFilter.trim()
      || platformFilter !== 'all'
      || linkStateFilter !== 'all'
      || countryFilter !== 'all'
      || sortMode !== 'updated_desc'
  )

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <div>
        <h1 className="page-title">商品管理</h1>
        <p className="page-subtitle">按 autobb 的库存台思路管理联盟库存，再决定哪些商品进入 Bes3 内容流水线</p>
      </div>

      <Card className="p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium">联盟平台配置</p>
            <p className="mt-1 text-sm text-muted-foreground">联盟同步配置统一收口到设置页，商品管理页只保留同步、导入和流水线动作。</p>
          </div>
          <Button variant="outline" onClick={() => router.push('/admin/settings')}>
            <Settings2 className="mr-2 h-4 w-4" />
            前往设置页配置
          </Button>
        </div>
      </Card>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
        <Card className="p-4 xl:col-span-1">
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">总库存</p>
          <p className="mt-2 text-3xl font-semibold">{formatNumber(summary.totalAffiliateProducts)}</p>
          <p className="mt-1 text-xs text-muted-foreground">联盟商品总量</p>
        </Card>
        <Card className="p-4 xl:col-span-1">
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">已挂接商品</p>
          <p className="mt-2 text-3xl font-semibold">{formatNumber(summary.linkedProducts)}</p>
          <p className="mt-1 text-xs text-muted-foreground">已进入标准化商品库</p>
        </Card>
        <Card className="p-4 xl:col-span-1">
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">待处理库存</p>
          <p className="mt-2 text-3xl font-semibold">{formatNumber(summary.inventoryOnlyProducts)}</p>
          <p className="mt-1 text-xs text-muted-foreground">还未挂接内容工作台</p>
        </Card>
        <Card className="p-4 xl:col-span-1">
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">推广链接就绪</p>
          <p className="mt-2 text-3xl font-semibold">{formatNumber(summary.withPromoLink)}</p>
          <p className="mt-1 text-xs text-muted-foreground">有 promo/short promo link</p>
        </Card>
        <Card className="p-4 xl:col-span-1">
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">运行中流水线</p>
          <p className="mt-2 text-3xl font-semibold">{formatNumber(summary.runningPipelines)}</p>
          <p className="mt-1 text-xs text-muted-foreground">排队中或运行中的商品</p>
        </Card>
        <Card className="p-4 xl:col-span-1">
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">平台分布</p>
          <div className="mt-2 space-y-1 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">PartnerBoost</span>
              <span className="font-medium">{formatNumber(summary.platformGroups.partnerboost)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Manual</span>
              <span className="font-medium">{formatNumber(summary.platformGroups.manual)}</span>
            </div>
          </div>
        </Card>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="min-w-0 rounded-lg border bg-card p-4 shadow-sm">
          <p className="text-overline font-semibold text-primary">联盟同步</p>
          <h2 className="card-title mt-1">按 autobb 的动作组织方式同步库存</h2>
          <div className="mt-3 flex items-start gap-3 rounded-md border bg-muted/40 p-3">
            <Checkbox
              checked={syncAndQueueNew}
              onCheckedChange={(value) => setSyncAndQueueNew(Boolean(value))}
              aria-label="自动排队新同步商品"
            />
            <div className="space-y-1">
              <p className="label-text">自动排队新同步商品</p>
              <p className="helper-text">开启后，新同步进来的库存会直接进入 Bes3 完整流水线。</p>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            {([
              { platform: 'amazon' as const, label: 'PB Amazon' },
              { platform: 'dtc' as const, label: 'PB DTC' }
            ]).map((item) => (
              <div key={item.platform} className="inline-flex">
                <Button
                  variant="outline"
                  disabled={isPending}
                  className="rounded-r-none border-r-0 bg-white"
                  onClick={() => triggerSync(item.platform, { queuePipeline: syncAndQueueNew, queueScope: 'created' })}
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  {item.label} 默认同步
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="icon" disabled={isPending} className="h-10 w-10 rounded-l-none bg-white">
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuItem onClick={() => triggerSync(item.platform, { queuePipeline: syncAndQueueNew, queueScope: 'created' })}>
                      默认同步（仅新增）
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => triggerSync(item.platform, { queuePipeline: false, queueScope: 'created' })}>
                      只同步，不排队流水线
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => triggerSync(item.platform, { queuePipeline: true, queueScope: 'createdOrUpdated' })}>
                      同步并排队新增 + 更新
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ))}
          </div>
        </div>

        <div className="min-w-0 rounded-lg border bg-card p-4 shadow-sm">
          <p className="text-overline font-semibold text-primary">直接导入</p>
          <h2 className="card-title mt-1">手动导入，或先深度抓取再进入流水线</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <div className="md:col-span-2">
              <Input value={importLink} onChange={(event) => setImportLink(event.target.value)} placeholder="https://app.partnerboost.com/track/..." className="min-h-10 rounded-xl" />
            </div>
            <Input value={importBrand} onChange={(event) => setImportBrand(event.target.value)} placeholder="品牌，例如 Dolphin" className="min-h-10 rounded-xl" />
            <Input value={importModel} onChange={(event) => setImportModel(event.target.value)} placeholder="型号，例如 Nautilus CC Plus" className="min-h-10 rounded-xl" />
            <Input value={importModelNumber} onChange={(event) => setImportModelNumber(event.target.value)} placeholder="型号编号 / SKU" className="min-h-10 rounded-xl" />
            <Input value={importProductType} onChange={(event) => setImportProductType(event.target.value)} placeholder="商品类型，例如 robotic pool cleaner" className="min-h-10 rounded-xl" />
            <Input value={importCategory} onChange={(event) => setImportCategory(event.target.value)} placeholder="分类，例如 Yard & Pool Automation" className="min-h-10 rounded-xl" />
            <Input value={importCategorySlug} onChange={(event) => setImportCategorySlug(event.target.value)} placeholder="分类 slug，例如 yard-pool-automation" className="min-h-10 rounded-xl" />
            <Input value={importCountryCode} onChange={(event) => setImportCountryCode(event.target.value.toUpperCase())} placeholder="国家，例如 US" className="min-h-10 rounded-xl" />
            <Button
              disabled={isPending || !importLink}
              onClick={() =>
                trigger('/api/admin/products/import-from-link', {
                  body: {
                    link: importLink,
                    brandName: importBrand,
                    productModel: importModel,
                    modelNumber: importModelNumber,
                    productType: importProductType,
                    category: importCategory,
                    categorySlug: importCategorySlug,
                    countryCode: importCountryCode
                  },
                  successMessage: '链接已导入并排队流水线',
                  navigateToProduct: true
                })
              }
              className="md:col-span-2"
            >
              <Wand2 className="mr-2 h-4 w-4" />
              导入并排队流水线
            </Button>
            <Button
              disabled={isPending || !importLink}
              variant="outline"
              onClick={() =>
                trigger('/api/admin/products/deep-scrape', {
                  body: {
                    link: importLink,
                    brandName: importBrand,
                    productModel: importModel,
                    modelNumber: importModelNumber,
                    productType: importProductType,
                    category: importCategory,
                    categorySlug: importCategorySlug,
                    countryCode: importCountryCode
                  },
                  successMessage: '深度抓取任务已排队',
                  navigateToProduct: true
                })
              }
              className="md:col-span-2"
            >
              <ExternalLink className="mr-2 h-4 w-4" />
              先深度抓取，再生成商品
            </Button>
          </div>
        </div>
      </section>

      <section id="affiliate-inventory" className="min-w-0 rounded-lg border bg-card p-4 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-overline font-semibold text-primary">联盟库存</p>
            <h2 className="card-title mt-1">像 autobb 一样先看库存，再决定是否进入工作台</h2>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {hasActiveRuns ? (
              <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-700">
                <RefreshCw className="mr-1 h-3 w-3 animate-spin" />
                后台更新中
              </Badge>
            ) : null}
            <Button
              disabled={selectedIds.length === 0 || isPending}
              onClick={() => trigger('/api/admin/products/batch-run-pipeline', { body: { ids: selectedIds }, successMessage: '批量流水线已排队' })}
            >
              批量排队流水线
            </Button>
          </div>
        </div>

        <div className="mt-4 flex items-start gap-2 rounded-md border border-border/60 bg-muted/25 px-3 py-2 text-xs text-muted-foreground">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>同一 ASIN 可能对应多个联盟库存条目（不同链接、佣金或抓取来源），当前列表按库存条目展示，而不是按标准化商品去重。</span>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <Card className="p-4">
            <p className="text-xs text-muted-foreground">当前筛选条目</p>
            <p className="mt-1 text-2xl font-semibold">{formatNumber(filteredSummary.visible)}</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs text-muted-foreground">PartnerBoost 可见条目</p>
            <p className="mt-1 text-2xl font-semibold">{formatNumber(filteredSummary.partnerboost)}</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs text-muted-foreground">已挂接商品</p>
            <p className="mt-1 text-2xl font-semibold">{formatNumber(filteredSummary.linked)}</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs text-muted-foreground">推广链接就绪</p>
            <p className="mt-1 text-2xl font-semibold">{formatNumber(filteredSummary.withPromo)}</p>
          </Card>
        </div>

        <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1.4fr)_160px_160px_150px_180px]">
          <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="搜索商品名、品牌、MID、ASIN、链接" />
          <Input value={midFilter} onChange={(event) => setMidFilter(event.target.value)} placeholder="MID / Merchant ID" />
          <Select value={platformFilter} onValueChange={(value) => setPlatformFilter(value as PlatformFilter)}>
            <SelectItem value="all">全部平台</SelectItem>
            <SelectItem value="partnerboost">PartnerBoost</SelectItem>
            <SelectItem value="manual">Manual</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </Select>
          <Select value={linkStateFilter} onValueChange={(value) => setLinkStateFilter(value as LinkStateFilter)}>
            <SelectItem value="all">全部状态</SelectItem>
            <SelectItem value="linked">已挂接商品</SelectItem>
            <SelectItem value="inventory_only">仅库存</SelectItem>
          </Select>
          <Select value={countryFilter} onValueChange={(value) => setCountryFilter(value as CountryFilter)}>
            <SelectItem value="all">全部国家</SelectItem>
            <SelectItem value="US">US</SelectItem>
            <SelectItem value="GB">GB</SelectItem>
            <SelectItem value="CA">CA</SelectItem>
            <SelectItem value="AU">AU</SelectItem>
            <SelectItem value="DE">DE</SelectItem>
            <SelectItem value="FR">FR</SelectItem>
            <SelectItem value="ROW">ROW</SelectItem>
            <SelectItem value="unknown">未知国家</SelectItem>
          </Select>
          <Select value={sortMode} onValueChange={(value) => setSortMode(value as SortMode)}>
            <SelectItem value="updated_desc">按更新时间倒序</SelectItem>
            <SelectItem value="updated_asc">按更新时间正序</SelectItem>
            <SelectItem value="linked_first">已挂接商品优先</SelectItem>
            <SelectItem value="price_desc">按价格倒序</SelectItem>
            <SelectItem value="reviews_desc">按评价数倒序</SelectItem>
          </Select>
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
          <p>支持搜索、平台筛选、挂接状态筛选和排序；结构按 autobb 的商品台方式收口到单一过滤区。</p>
          {hasActiveFilters ? (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              <XCircle className="mr-2 h-4 w-4" />
              清除筛选
            </Button>
          ) : null}
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
          <p>
            当前显示 {filteredAffiliateProducts.length} / {summary.totalAffiliateProducts} 个库存商品
            {payloadMeta?.compact ? `（已加载最新 ${payloadMeta.affiliateProductsReturned} 个，避免生产控制台阻塞）` : ''}
          </p>
          <div className="flex items-center gap-2">
            <Checkbox
              checked={allVisibleSelected}
              onCheckedChange={(value) => {
                if (value) {
                  setSelectedIds((current) => [...new Set([...current, ...filteredAffiliateProducts.map((item) => item.id)])])
                  return
                }
                setSelectedIds((current) => current.filter((id) => !filteredAffiliateProducts.some((item) => item.id === id)))
              }}
              aria-label="选择当前筛选结果"
            />
            <span>选择当前筛选结果</span>
          </div>
        </div>

        {selectedIds.length > 0 ? (
          <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
            <Badge variant="secondary">已选择 {selectedIds.length} 条库存</Badge>
            <Badge variant="outline">已挂接商品 {selectedLinkedProductIds.length} 个</Badge>
            <Button variant="ghost" size="sm" onClick={clearSelection}>
              清空选择
            </Button>
            {selectedLinkedProductIds.length > 0 ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" disabled={isPending}>
                    批量工作台动作
                    <ChevronDown className="ml-2 h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-56">
                  {WORKSPACE_ACTIONS.map((action) => (
                    <DropdownMenuItem key={action.id} onClick={() => triggerBatchWorkspaceAction(action.id)}>
                      {action.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            ) : null}
          </div>
        ) : null}

        {filteredAffiliateProducts.length === 0 ? (
          <div className="mt-4">
            {hasActiveFilters ? (
              <EmptyState
                variant="no-results"
                title="当前筛选条件下暂无库存条目"
                description="试试清除筛选，或切换平台 / 国家 / 挂接状态后再查看。"
                actionLabel="清除筛选"
                onAction={clearFilters}
                inCard={false}
              />
            ) : (
              <EmptyState
                variant="no-data"
                title="暂无商品数据"
                description="请先执行联盟平台同步，系统会自动拉取可推广商品并进入库存台。"
                actionLabel="同步 PB Amazon"
                onAction={() => triggerSync('amazon', { queuePipeline: syncAndQueueNew, queueScope: 'created' })}
                secondaryActionLabel="同步 PB DTC"
                onSecondaryAction={() => triggerSync('dtc', { queuePipeline: syncAndQueueNew, queueScope: 'created' })}
                inCard={false}
              />
            )}
          </div>
        ) : (
          <>
            <div className="mt-4 grid grid-cols-1 gap-3 md:hidden">
              {filteredAffiliateProducts.map((item) => {
                const checked = selectedIds.includes(item.id)
                const heroImage = item.hero_image_url || item.image_url
                return (
                  <article key={item.id} className="rounded-md border bg-muted/40 p-3">
                    <div className="flex items-start gap-3">
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(value) => {
                          setSelectedIds((current) => value ? [...current, item.id] : current.filter((id) => id !== item.id))
                        }}
                      />
                      <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border bg-white">
                        {heroImage ? (
                          <Image
                            src={heroImage}
                            alt={item.product_name || item.external_id}
                            fill
                            sizes="64px"
                            className="object-cover"
                            unoptimized
                            onError={(event) => {
                              event.currentTarget.style.display = 'none'
                            }}
                          />
                        ) : null}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="break-words font-medium">{item.product_name || item.promo_link || item.product_url || item.external_id}</div>
                        <div className="mt-1 break-words text-xs text-muted-foreground">
                          {[item.brand, item.product_model || item.model_number, item.category || item.category_slug].filter(Boolean).join(' · ') || '暂无身份线索'}
                        </div>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <StatusBadge value={item.platform} />
                          {item.pipeline_status ? <StatusBadge value={item.pipeline_status} /> : null}
                          {renderInventoryState(item)}
                          {renderLinkState(item)}
                        </div>
                        <div className="mt-2 text-xs text-muted-foreground">
                          <div>MID: {item.external_id}</div>
                          <div>ASIN: {item.asin || 'N/A'}</div>
                          <div>价格: {formatMoney(item.price_amount, item.price_currency)}</div>
                          <div>佣金: {formatPercent(item.commission_rate)}</div>
                          <div>更新: {formatDate(item.updated_at)}</div>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {item.linked_product_id ? (
                            <Link
                              href={`/admin/products/${item.linked_product_id}`}
                              className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'rounded-full')}
                            >
                              打开工作台
                            </Link>
                          ) : null}
                          <Button
                            disabled={isPending}
                            size="sm"
                            onClick={() =>
                              trigger(`/api/admin/products/${item.id}/run-pipeline`, {
                                successMessage: '流水线已排队',
                                navigateToProduct: true
                              })
                            }
                          >
                            排队流水线
                          </Button>
                          {item.linked_product_id ? (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm">
                                  更多动作
                                  <ChevronDown className="ml-2 h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-56">
                                {WORKSPACE_ACTIONS.map((action) => (
                                  <DropdownMenuItem
                                    key={action.id}
                                    onClick={() => triggerWorkspaceAction(item.linked_product_id as number, action.id)}
                                  >
                                    {action.label}
                                  </DropdownMenuItem>
                                ))}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </article>
                )
              })}
            </div>

            <div className="mt-4 hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10"></TableHead>
                    <TableHead>商品</TableHead>
                    <TableHead>平台</TableHead>
                    <TableHead>库存状态</TableHead>
                    <TableHead>MID / ASIN</TableHead>
                    <TableHead>国家 / 评分</TableHead>
                    <TableHead>价格 / 佣金</TableHead>
                    <TableHead>推广链接</TableHead>
                    <TableHead>工作台</TableHead>
                    <TableHead>更新时间</TableHead>
                    <TableHead>操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAffiliateProducts.map((item) => {
                    const checked = selectedIds.includes(item.id)
                    const heroImage = item.hero_image_url || item.image_url
                    return (
                      <TableRow key={item.id} className="hover:bg-muted/20">
                        <TableCell>
                          <Checkbox
                            checked={checked}
                            onCheckedChange={(value) => {
                              setSelectedIds((current) => value ? [...current, item.id] : current.filter((id) => id !== item.id))
                            }}
                          />
                        </TableCell>
                        <TableCell className="min-w-[260px]">
                          <div className="flex items-start gap-3">
                            <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl border bg-white">
                              {heroImage ? (
                                <Image
                                  src={heroImage}
                                  alt={item.product_name || item.external_id}
                                  fill
                                  sizes="56px"
                                  className="object-cover"
                                  unoptimized
                                  onError={(event) => {
                                    event.currentTarget.style.display = 'none'
                                  }}
                                />
                              ) : null}
                            </div>
                            <div className="min-w-0">
                              <div className="break-words font-medium">{item.product_name || item.promo_link || item.product_url || item.external_id}</div>
                              <div className="mt-1 break-words text-xs text-muted-foreground">
                                {[item.brand, item.product_model || item.model_number, item.category || item.category_slug].filter(Boolean).join(' · ') || '暂无身份线索'}
                              </div>
                              {item.product_url ? (
                                <a href={item.product_url} target="_blank" rel="noreferrer" className="mt-1 block truncate text-xs text-primary hover:underline">
                                  {item.product_url}
                                </a>
                              ) : null}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-2">
                            <StatusBadge value={item.platform} />
                            <div className="text-xs text-muted-foreground">{normalizeInventoryPlatform(item.platform)}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex max-w-[220px] flex-wrap gap-2">
                            {renderInventoryState(item)}
                            {renderLinkState(item)}
                            {item.pipeline_status ? <StatusBadge value={item.pipeline_status} /> : null}
                            {item.pipeline_stage ? <StatusBadge value={item.pipeline_stage} /> : null}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1 text-xs">
                            <div className="font-medium">{item.external_id}</div>
                            <div className="text-muted-foreground">{item.asin || 'No ASIN'}</div>
                            {item.merchant_id ? <div className="text-muted-foreground">Merchant {item.merchant_id}</div> : null}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1 text-xs">
                            <div className="font-medium">{item.country_code || '未知国家'}</div>
                            <div className="text-muted-foreground">评分 {item.rating != null ? item.rating.toFixed(1) : 'N/A'}</div>
                            <div className="text-muted-foreground">评价 {formatNumber(item.review_count)}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1 text-xs">
                            <div className="font-medium">{formatMoney(item.price_amount, item.price_currency)}</div>
                            <div className="text-muted-foreground">佣金 {formatPercent(item.commission_rate)}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {item.promo_link || item.short_promo_link ? (
                            <div className="space-y-1 text-xs">
                              <a
                                href={item.short_promo_link || item.promo_link || '#'}
                                target="_blank"
                                rel="noreferrer"
                                className="block max-w-[160px] truncate text-primary hover:underline"
                                title={item.short_promo_link || item.promo_link || ''}
                              >
                                {item.short_promo_link ? '短链已就绪' : '推广链接已就绪'}
                              </a>
                              {item.promo_link && item.short_promo_link ? (
                                <a
                                  href={item.promo_link}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="block max-w-[160px] truncate text-muted-foreground hover:text-primary hover:underline"
                                  title={item.promo_link}
                                >
                                  查看原始链接
                                </a>
                              ) : null}
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">未生成</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {item.linked_product_id ? (
                            <div className="space-y-1 text-xs">
                              <Link
                                href={`/admin/products/${item.linked_product_id}`}
                                className="block max-w-[180px] truncate font-medium text-primary hover:underline"
                                title={item.linked_product_name || `Product #${item.linked_product_id}`}
                              >
                                {item.linked_product_name || `Product #${item.linked_product_id}`}
                              </Link>
                              <div className="text-muted-foreground">{item.linked_product_slug || '未生成 slug'}</div>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">仅库存，未挂接</span>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {formatDate(item.updated_at)}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-2">
                            {item.linked_product_id ? (
                              <Link
                                href={`/admin/products/${item.linked_product_id}`}
                                className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'rounded-full')}
                              >
                                打开工作台
                              </Link>
                            ) : null}
                            <Button
                              disabled={isPending}
                              size="sm"
                              onClick={() =>
                                trigger(`/api/admin/products/${item.id}/run-pipeline`, {
                                  successMessage: '流水线已排队',
                                  navigateToProduct: true
                                })
                              }
                            >
                              排队流水线
                            </Button>
                            {item.linked_product_id ? (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="outline" size="sm">
                                    更多动作
                                    <ChevronDown className="ml-2 h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-56">
                                  {WORKSPACE_ACTIONS.map((action) => (
                                    <DropdownMenuItem
                                      key={action.id}
                                      onClick={() => triggerWorkspaceAction(item.linked_product_id as number, action.id)}
                                    >
                                      {action.label}
                                    </DropdownMenuItem>
                                  ))}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            ) : null}
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </section>

      <section className="min-w-0 rounded-lg border bg-card p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-overline font-semibold text-primary">标准化商品库</p>
            <h2 className="card-title mt-1">已经进入 Bes3 内容工作台的商品</h2>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm text-muted-foreground">共 {products.length} 个标准化商品</p>
            <Select value={conversionReadinessFilter} onValueChange={(value) => setConversionReadinessFilter(value as ConversionReadinessFilter)}>
              <SelectItem value="all">全部转化状态</SelectItem>
              <SelectItem value="buy-ready">buy-ready</SelectItem>
              <SelectItem value="blocked-no-link">blocked-no-link</SelectItem>
              <SelectItem value="blocked-price">blocked-price</SelectItem>
              <SelectItem value="blocked-evidence">blocked-evidence</SelectItem>
              <SelectItem value="blocked-stock">blocked-stock</SelectItem>
              <SelectItem value="blocked-risk">blocked-risk</SelectItem>
            </Select>
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-3 xl:grid-cols-6">
          <Card className="p-3">
            <p className="text-xs text-muted-foreground">Conversion readiness</p>
            <p className="mt-1 text-2xl font-semibold">{formatNumber(conversionReadinessSummary.buyReady)}</p>
            <p className="mt-1 text-xs text-muted-foreground">buy-ready 商品</p>
          </Card>
          <Card className="p-3">
            <p className="text-xs text-muted-foreground">商业阻塞</p>
            <p className="mt-1 text-2xl font-semibold">{formatNumber(conversionReadinessSummary.blocked)}</p>
            <p className="mt-1 text-xs text-muted-foreground">需要修复后才能主推</p>
          </Card>
          {(['blocked-no-link', 'blocked-price', 'blocked-evidence', 'blocked-stock'] as ConversionReadiness[]).map((state) => (
            <Card key={state} className="p-3">
              <p className="text-xs text-muted-foreground">{state}</p>
              <p className="mt-1 text-2xl font-semibold">{formatNumber(conversionReadinessSummary.byState[state])}</p>
              <p className="mt-1 text-xs text-muted-foreground">转化阻塞</p>
            </Card>
          ))}
        </div>

        {products.length === 0 ? (
          <div className="mt-4">
            <EmptyState
              variant="no-data"
              title="还没有商品进入标准化商品库"
              description="先从上方库存台同步或导入，再把需要的库存条目排队进 Bes3 工作台。"
              actionLabel="回到库存台"
              onAction={scrollToInventory}
              secondaryActionLabel="同步 PB Amazon"
              onSecondaryAction={() => triggerSync('amazon', { queuePipeline: syncAndQueueNew, queueScope: 'created' })}
              inCard={false}
            />
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="mt-4">
            <EmptyState
              variant="no-results"
              title="当前转化状态下没有商品"
              description="切换 Conversion readiness 筛选，或先修复推广链接、价格、证据和库存阻塞。"
              actionLabel="查看全部转化状态"
              onAction={() => setConversionReadinessFilter('all')}
              inCard={false}
            />
          </div>
        ) : (
          <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-2">
            {filteredProducts.map((product) => (
              <div key={product.id} className="rounded-md border bg-muted/40 p-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                  <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-border bg-white">
                    {product.hero_image_url ? (
                      <Image
                        src={product.hero_image_url}
                        alt={product.product_name}
                        fill
                        sizes="96px"
                        className="object-cover"
                        unoptimized
                        onError={(event) => {
                          event.currentTarget.style.display = 'none'
                        }}
                      />
                    ) : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="break-words font-[var(--font-display)] text-xl font-semibold">{product.product_name}</h3>
                    <p className="mt-1 break-words text-xs text-muted-foreground">
                      {[product.category || product.category_slug || '未分类', product.product_model || product.model_number, product.product_type].filter(Boolean).join(' · ')}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {renderConversionReadiness(product.conversion_readiness)}
                      {product.last_run_status ? <StatusBadge value={product.last_run_status} /> : null}
                      {product.last_run_stage ? <StatusBadge value={product.last_run_stage} /> : null}
                    </div>
                    <div className="mt-3 grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
                      <div>
                        <span className="font-medium text-foreground">Conversion readiness:</span> {product.conversion_readiness}
                      </div>
                      <div>
                        <span className="font-medium text-foreground">Evidence:</span> {formatNumber(product.evidence_count)}
                      </div>
                      <div>
                        <span className="font-medium text-foreground">Affiliate links:</span> {formatNumber(product.available_affiliate_links || product.active_affiliate_links)}
                      </div>
                      <div>
                        <span className="font-medium text-foreground">Blockers:</span> {product.conversion_blockers.length ? product.conversion_blockers.join(', ') : 'none'}
                      </div>
                    </div>
                  </div>
                  <div className="text-sm text-muted-foreground sm:ml-auto sm:text-right">
                    <div>{product.price_amount ? `$${product.price_amount.toFixed(2)}` : '暂无价格'}</div>
                    <div className="break-words">{product.slug || '草稿 slug'}</div>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Link
                    href={`/admin/products/${product.id}`}
                    className={cn(buttonVariants({ variant: 'outline' }), 'rounded-full')}
                  >
                    打开工作台
                  </Link>
                  <Button
                    disabled={isPending}
                    variant="secondary"
                    onClick={() =>
                      trigger(`/api/admin/products/${product.id}/rescrape-media`, {
                        successMessage: '媒体已重新抓取'
                      })
                    }
                  >
                    重新抓取媒体
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline">
                        更多动作
                        <ChevronDown className="ml-2 h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                      {WORKSPACE_ACTIONS.map((action) => (
                        <DropdownMenuItem key={action.id} onClick={() => triggerWorkspaceAction(product.id, action.id)}>
                          {action.label}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
