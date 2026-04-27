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
    const summary = `${label} sync completed · ${created} new / ${updated} updated`
    if (!payload?.queuePipeline) {
      return summary
    }
    if (queued > 0) {
      return `${summary} · queued ${queued} new pipeline${queued === 1 ? '' : 's'}`
    }
    return `${summary} · no new products to queue`
  }

  return (
    <div className="space-y-8 p-6 lg:p-10">
      <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="min-w-0 rounded-[32px] border border-border bg-white p-8 shadow-panel">
          <p className="font-mono text-xs uppercase tracking-[0.28em] text-primary">Affiliate Sync</p>
          <h1 className="mt-3 font-[var(--font-display)] text-4xl font-semibold tracking-tight">Import and launch the full Bes3 workflow.</h1>
          <div className="mt-5 flex items-start gap-3 rounded-[24px] border border-border/70 bg-[#f7f1e4] p-4">
            <Checkbox
              checked={syncAndQueueNew}
              onCheckedChange={(value) => setSyncAndQueueNew(Boolean(value))}
              aria-label="Auto queue newly synced products"
            />
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground">Auto queue newly synced products</p>
              <p className="text-sm text-muted-foreground">
                When enabled, this sync also enqueues the full Bes3 pipeline for products newly imported in this batch.
              </p>
            </div>
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button
              disabled={isPending}
              onClick={() =>
                trigger('/api/admin/products/sync/amazon', {
                  body: { queuePipeline: syncAndQueueNew, queueScope: 'created' },
                  successMessage: (payload) => buildSyncSuccessMessage('PartnerBoost Amazon', payload)
                })
              }
            >
              Sync PartnerBoost Amazon
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
              Sync PartnerBoost DTC
            </Button>
          </div>
        </div>
        <div className="min-w-0 rounded-[32px] border border-border bg-white p-8 shadow-panel">
          <p className="font-mono text-xs uppercase tracking-[0.28em] text-primary">Direct Import</p>
          <h2 className="mt-3 font-[var(--font-display)] text-3xl font-semibold tracking-tight">Paste a link and seed exact product identity.</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <Input value={importLink} onChange={(event) => setImportLink(event.target.value)} placeholder="https://app.partnerboost.com/track/..." className="min-h-[52px] rounded-2xl" />
            </div>
            <Input value={importBrand} onChange={(event) => setImportBrand(event.target.value)} placeholder="Brand, e.g. Dolphin" className="min-h-[52px] rounded-2xl" />
            <Input value={importModel} onChange={(event) => setImportModel(event.target.value)} placeholder="Model, e.g. Nautilus CC Plus" className="min-h-[52px] rounded-2xl" />
            <Input value={importModelNumber} onChange={(event) => setImportModelNumber(event.target.value)} placeholder="Model number / SKU" className="min-h-[52px] rounded-2xl" />
            <Input value={importProductType} onChange={(event) => setImportProductType(event.target.value)} placeholder="Product type, e.g. robotic pool cleaner" className="min-h-[52px] rounded-2xl" />
            <Input value={importCategory} onChange={(event) => setImportCategory(event.target.value)} placeholder="Category, e.g. Yard & Pool Automation" className="min-h-[52px] rounded-2xl" />
            <Input value={importCategorySlug} onChange={(event) => setImportCategorySlug(event.target.value)} placeholder="Category slug, e.g. yard-pool-automation" className="min-h-[52px] rounded-2xl" />
            <Input value={importCountryCode} onChange={(event) => setImportCountryCode(event.target.value.toUpperCase())} placeholder="Country, e.g. US" className="min-h-[52px] rounded-2xl" />
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
                  successMessage: 'Link imported and pipeline queued',
                  navigateToProduct: true
                })
              }
              className="md:col-span-2"
            >
              Import and Queue Pipeline
            </Button>
          </div>
        </div>
      </section>

      <section className="min-w-0 rounded-[32px] border border-border bg-white p-8 shadow-panel">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.28em] text-primary">Affiliate Products</p>
            <h2 className="mt-2 font-[var(--font-display)] text-3xl font-semibold tracking-tight">Synced inventory</h2>
          </div>
          <Button
            disabled={selectedIds.length === 0 || isPending}
            onClick={() => trigger('/api/admin/products/batch-run-pipeline', { body: { ids: selectedIds }, successMessage: 'Batch pipeline queued' })}
          >
            Batch Queue Pipeline
          </Button>
        </div>
        <div className="mt-6 grid grid-cols-1 gap-4 md:hidden">
          {affiliateProducts.map((item) => {
            const checked = selectedIds.includes(item.id)
            const linkedProductId = productIdByAffiliateId.get(item.id)
            return (
              <article key={item.id} className="rounded-[24px] border border-border bg-[#f7f1e4] p-5">
                <div className="flex items-start gap-3">
                  <Checkbox
                    checked={checked}
                    onCheckedChange={(value) => {
                      setSelectedIds((current) => value ? [...current, item.id] : current.filter((id) => id !== item.id))
                    }}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="break-words font-medium">{item.product_name || item.promo_link || item.product_url}</div>
                    <div className="mt-2 break-words text-sm text-muted-foreground">
                      {[item.brand, item.product_model || item.model_number, item.category || item.category_slug].filter(Boolean).join(' · ') || 'No identity hints'}
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <StatusBadge value={item.platform} />
                      <span className="text-xs text-muted-foreground">{new Date(item.updated_at).toLocaleString()}</span>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {linkedProductId ? (
                        <Link
                          href={`/admin/products/${linkedProductId}`}
                          className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'rounded-full')}
                        >
                          Open Workspace
                        </Link>
                      ) : null}
                      <Button
                        disabled={isPending}
                        size="sm"
                        onClick={() =>
                          trigger(`/api/admin/products/${item.id}/run-pipeline`, {
                            successMessage: 'Pipeline queued',
                            navigateToProduct: true
                          })
                        }
                      >
                        Queue Pipeline
                      </Button>
                    </div>
                  </div>
                </div>
              </article>
            )
          })}
        </div>
        <div className="mt-6 hidden overflow-x-auto md:block">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-border text-xs uppercase tracking-[0.18em] text-muted-foreground">
              <tr>
                <th className="pb-3 pr-3"></th>
                <th className="pb-3 pr-3">Product</th>
                <th className="pb-3 pr-3">Platform</th>
                <th className="pb-3 pr-3">Updated</th>
                <th className="pb-3 pr-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {affiliateProducts.map((item) => {
                const checked = selectedIds.includes(item.id)
                const linkedProductId = productIdByAffiliateId.get(item.id)
                return (
                  <tr key={item.id} className="border-b border-border/70">
                    <td className="py-4 pr-3">
                      <Checkbox checked={checked} onCheckedChange={(value) => {
                        setSelectedIds((current) => value ? [...current, item.id] : current.filter((id) => id !== item.id))
                      }} />
                    </td>
                    <td className="py-4 pr-3">
                      <div className="break-words font-medium">{item.product_name || item.promo_link || item.product_url}</div>
                      <div className="break-words text-muted-foreground">
                        {[item.brand, item.product_model || item.model_number, item.category || item.category_slug].filter(Boolean).join(' · ') || 'No identity hints'}
                      </div>
                    </td>
                    <td className="py-4 pr-3">
                      <StatusBadge value={item.platform} />
                    </td>
                    <td className="py-4 pr-3 text-muted-foreground">{new Date(item.updated_at).toLocaleString()}</td>
                    <td className="py-4 pr-3">
                      <div className="flex flex-wrap gap-2">
                        {linkedProductId ? (
                          <Link
                            href={`/admin/products/${linkedProductId}`}
                            className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'rounded-full')}
                          >
                            Open Workspace
                          </Link>
                        ) : null}
                        <Button
                          disabled={isPending}
                          size="sm"
                          onClick={() =>
                            trigger(`/api/admin/products/${item.id}/run-pipeline`, {
                              successMessage: 'Pipeline queued',
                              navigateToProduct: true
                            })
                          }
                        >
                          Queue Pipeline
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

      <section className="min-w-0 rounded-[32px] border border-border bg-white p-8 shadow-panel">
        <p className="font-mono text-xs uppercase tracking-[0.28em] text-primary">Products</p>
        <h2 className="mt-2 font-[var(--font-display)] text-3xl font-semibold tracking-tight">Normalized product database</h2>
        <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-2">
          {products.map((product) => (
            <div key={product.id} className="rounded-[28px] border border-border bg-[#f7f1e4] p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-[20px] border border-border bg-white">
                  {product.hero_image_url ? (
                    <Image src={product.hero_image_url} alt={product.product_name} fill sizes="96px" className="object-cover" />
                  ) : null}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="break-words font-[var(--font-display)] text-2xl font-semibold">{product.product_name}</h3>
                  <p className="mt-2 break-words text-sm text-muted-foreground">
                    {[product.category || product.category_slug || 'uncategorized', product.product_model || product.model_number, product.product_type].filter(Boolean).join(' · ')}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {product.last_run_status ? <StatusBadge value={product.last_run_status} /> : null}
                    {product.last_run_stage ? <StatusBadge value={product.last_run_stage} /> : null}
                  </div>
                </div>
                <div className="text-sm text-muted-foreground sm:ml-auto sm:text-right">
                  <div>{product.price_amount ? `$${product.price_amount.toFixed(2)}` : 'N/A'}</div>
                  <div className="break-words">{product.slug || 'draft slug'}</div>
                </div>
              </div>
              <div className="mt-5 flex flex-wrap gap-3">
                <Link
                  href={`/admin/products/${product.id}`}
                  className={cn(buttonVariants({ variant: 'outline' }), 'rounded-full')}
                >
                  Open Workspace
                </Link>
                <Button
                  disabled={isPending}
                  variant="secondary"
                  onClick={() =>
                    trigger(`/api/admin/products/${product.id}/rescrape-media`, {
                      successMessage: 'Media rescraped'
                    })
                  }
                >
                  Rescrape Media
                </Button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
