'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useTransition } from 'react'
import { toast } from 'sonner'
import { buttonVariants, Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { StatusBadge } from '@/components/admin/StatusBadge'
import { cn } from '@/lib/utils'

type AffiliateProduct = {
  id: number
  platform: string
  product_name: string | null
  brand: string | null
  product_model: string | null
  model_number: string | null
  product_type: string | null
  category: string | null
  category_slug: string | null
  promo_link: string | null
  product_url: string | null
  updated_at: string
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
  updated_at: string
}

export function ProductsConsole() {
  const router = useRouter()
  const [affiliateProducts, setAffiliateProducts] = useState<AffiliateProduct[]>([])
  const [products, setProducts] = useState<Product[]>([])
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
  const [isPending, startTransition] = useTransition()

  const load = async () => {
    const response = await fetch('/api/admin/products')
    const body = await response.json()
    setAffiliateProducts(body.affiliateProducts || [])
    setProducts(body.products || [])
  }

  useEffect(() => {
    void load()
  }, [])

  const productIdByAffiliateId = new Map<number, number>()
  for (const product of products) {
    if (product.affiliate_product_id) {
      productIdByAffiliateId.set(product.affiliate_product_id, product.id)
    }
  }
  const hasActiveRuns = products.some((product) => product.last_run_status === 'queued' || product.last_run_status === 'running')

  useEffect(() => {
    if (!hasActiveRuns) return
    const intervalId = window.setInterval(() => {
      void load()
    }, 4000)
    return () => window.clearInterval(intervalId)
  }, [hasActiveRuns])

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
    const summary = `${label} 同步完成 · 新增 ${created} 个 / 更新 ${updated} 个`
    if (!payload?.queuePipeline) {
      return summary
    }
    if (queued > 0) {
      return `${summary} · 已排队 ${queued} 个新流水线任务`
    }
    return `${summary} · 没有需要排队的新商品`
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <div>
        <h1 className="page-title">商品管理</h1>
        <p className="page-subtitle">同步联盟库存、导入单品，并将商品送入 Bes3 内容流水线</p>
      </div>

      <section className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="min-w-0 rounded-lg border bg-card p-4 shadow-sm">
          <p className="text-overline font-semibold text-primary">联盟同步</p>
          <h2 className="card-title mt-1">导入商品并启动完整 Bes3 工作流</h2>
          <div className="mt-3 flex items-start gap-3 rounded-md border bg-muted/40 p-3">
            <Checkbox
              checked={syncAndQueueNew}
              onCheckedChange={(value) => setSyncAndQueueNew(Boolean(value))}
              aria-label="自动排队新同步商品"
            />
            <div className="space-y-1">
              <p className="label-text">自动排队新同步商品</p>
              <p className="helper-text">
                开启后，本次同步中新导入的商品会自动进入完整 Bes3 流水线。
              </p>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              disabled={isPending}
              onClick={() =>
                trigger('/api/admin/products/sync/amazon', {
                  body: { queuePipeline: syncAndQueueNew, queueScope: 'created' },
                  successMessage: (payload) => buildSyncSuccessMessage('PartnerBoost Amazon', payload)
                })
              }
            >
              同步 PartnerBoost Amazon
            </Button>
            <Button
              disabled={isPending}
              variant="secondary"
              onClick={() =>
                trigger('/api/admin/products/sync/dtc', {
                  body: { queuePipeline: syncAndQueueNew, queueScope: 'created' },
                  successMessage: (payload) => buildSyncSuccessMessage('PartnerBoost DTC', payload)
                })
              }
            >
              同步 PartnerBoost DTC
            </Button>
          </div>
        </div>
        <div className="min-w-0 rounded-lg border bg-card p-4 shadow-sm">
          <p className="text-overline font-semibold text-primary">直接导入</p>
          <h2 className="card-title mt-1">粘贴链接并补充准确的商品身份</h2>
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
              导入并排队流水线
            </Button>
          </div>
        </div>
      </section>

      <section className="min-w-0 rounded-lg border bg-card p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-overline font-semibold text-primary">联盟商品</p>
            <h2 className="card-title mt-1">已同步库存</h2>
          </div>
          <Button
            disabled={selectedIds.length === 0 || isPending}
            onClick={() => trigger('/api/admin/products/batch-run-pipeline', { body: { ids: selectedIds }, successMessage: '批量流水线已排队' })}
          >
            批量排队流水线
          </Button>
        </div>
        <div className="mt-4 grid grid-cols-1 gap-3 md:hidden">
          {affiliateProducts.map((item) => {
            const checked = selectedIds.includes(item.id)
            const linkedProductId = productIdByAffiliateId.get(item.id)
            return (
              <article key={item.id} className="rounded-md border bg-muted/40 p-3">
                <div className="flex items-start gap-3">
                  <Checkbox
                    checked={checked}
                    onCheckedChange={(value) => {
                      setSelectedIds((current) => value ? [...current, item.id] : current.filter((id) => id !== item.id))
                    }}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="break-words font-medium">{item.product_name || item.promo_link || item.product_url}</div>
                    <div className="mt-1 break-words text-xs text-muted-foreground">
                      {[item.brand, item.product_model || item.model_number, item.category || item.category_slug].filter(Boolean).join(' · ') || '暂无身份线索'}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <StatusBadge value={item.platform} />
                      <span className="text-xs text-muted-foreground">{new Date(item.updated_at).toLocaleString()}</span>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {linkedProductId ? (
                        <Link
                          href={`/admin/products/${linkedProductId}`}
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
                    </div>
                  </div>
                </div>
              </article>
            )
          })}
        </div>
        <div className="mt-4 hidden overflow-x-auto rounded-md border md:block">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b bg-white text-xs text-muted-foreground">
              <tr>
                <th className="px-3 py-2"></th>
                <th className="px-3 py-2">商品</th>
                <th className="px-3 py-2">平台</th>
                <th className="px-3 py-2">更新时间</th>
                <th className="px-3 py-2">操作</th>
              </tr>
            </thead>
            <tbody>
              {affiliateProducts.map((item) => {
                const checked = selectedIds.includes(item.id)
                const linkedProductId = productIdByAffiliateId.get(item.id)
                return (
                  <tr key={item.id} className="border-b border-border/70 hover:bg-muted/30">
                    <td className="px-3 py-2">
                      <Checkbox checked={checked} onCheckedChange={(value) => {
                        setSelectedIds((current) => value ? [...current, item.id] : current.filter((id) => id !== item.id))
                      }} />
                    </td>
                    <td className="px-3 py-2">
                      <div className="break-words font-medium">{item.product_name || item.promo_link || item.product_url}</div>
                      <div className="break-words text-xs text-muted-foreground">
                        {[item.brand, item.product_model || item.model_number, item.category || item.category_slug].filter(Boolean).join(' · ') || '暂无身份线索'}
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <StatusBadge value={item.platform} />
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">{new Date(item.updated_at).toLocaleString()}</td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap gap-2">
                        {linkedProductId ? (
                          <Link
                            href={`/admin/products/${linkedProductId}`}
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
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="min-w-0 rounded-lg border bg-card p-4 shadow-sm">
        <p className="text-overline font-semibold text-primary">商品库</p>
        <h2 className="card-title mt-1">标准化商品数据库</h2>
        <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-2">
          {products.map((product) => (
            <div key={product.id} className="rounded-md border bg-muted/40 p-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-border bg-white">
                  {product.hero_image_url ? (
                    <Image src={product.hero_image_url} alt={product.product_name} fill sizes="96px" className="object-cover" />
                  ) : null}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="break-words font-[var(--font-display)] text-xl font-semibold">{product.product_name}</h3>
                  <p className="mt-1 break-words text-xs text-muted-foreground">
                    {[product.category || product.category_slug || '未分类', product.product_model || product.model_number, product.product_type].filter(Boolean).join(' · ')}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {product.last_run_status ? <StatusBadge value={product.last_run_status} /> : null}
                    {product.last_run_stage ? <StatusBadge value={product.last_run_stage} /> : null}
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
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
