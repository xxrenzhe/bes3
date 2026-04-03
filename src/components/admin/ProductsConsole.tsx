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
  promo_link: string | null
  product_url: string | null
  updated_at: string
}

type Product = {
  id: number
  product_name: string
  category: string | null
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
  const [selectedIds, setSelectedIds] = useState<number[]>([])
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

  const trigger = (path: string, options?: {
    body?: unknown
    successMessage?: string
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
      toast.success(options?.successMessage || 'Action completed')
    })
  }

  return (
    <div className="space-y-8 p-6 lg:p-10">
      <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="rounded-[32px] border border-border bg-white p-8 shadow-panel">
          <p className="font-mono text-xs uppercase tracking-[0.28em] text-primary">Affiliate Sync</p>
          <h1 className="mt-3 font-[var(--font-display)] text-4xl font-semibold tracking-tight">Import and launch the full Bes3 workflow.</h1>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button disabled={isPending} onClick={() => trigger('/api/admin/products/sync/amazon', { successMessage: 'PartnerBoost Amazon sync completed' })}>
              Sync PartnerBoost Amazon
            </Button>
            <Button disabled={isPending} variant="secondary" onClick={() => trigger('/api/admin/products/sync/dtc', { successMessage: 'PartnerBoost DTC sync completed' })}>
              Sync PartnerBoost DTC
            </Button>
          </div>
        </div>
        <div className="rounded-[32px] border border-border bg-white p-8 shadow-panel">
          <p className="font-mono text-xs uppercase tracking-[0.28em] text-primary">Direct Import</p>
          <h2 className="mt-3 font-[var(--font-display)] text-3xl font-semibold tracking-tight">Paste an affiliate link and build content in one click.</h2>
          <div className="mt-6 space-y-4">
            <Input value={importLink} onChange={(event) => setImportLink(event.target.value)} placeholder="https://app.partnerboost.com/track/..." className="min-h-[52px] rounded-2xl" />
            <Button
              disabled={isPending || !importLink}
              onClick={() =>
                trigger('/api/admin/products/import-from-link', {
                  body: { link: importLink },
                  successMessage: 'Link imported and pipeline completed',
                  navigateToProduct: true
                })
              }
            >
              Import and Run Pipeline
            </Button>
          </div>
        </div>
      </section>

      <section className="rounded-[32px] border border-border bg-white p-8 shadow-panel">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.28em] text-primary">Affiliate Products</p>
            <h2 className="mt-2 font-[var(--font-display)] text-3xl font-semibold tracking-tight">Synced inventory</h2>
          </div>
          <Button
            disabled={selectedIds.length === 0 || isPending}
            onClick={() => trigger('/api/admin/products/batch-run-pipeline', { body: { ids: selectedIds }, successMessage: 'Batch pipeline completed' })}
          >
            Batch Run Pipeline
          </Button>
        </div>
        <div className="mt-6 overflow-x-auto">
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
                      <div className="font-medium">{item.product_name || item.promo_link || item.product_url}</div>
                      <div className="text-muted-foreground">{item.brand}</div>
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
                              successMessage: 'Pipeline completed',
                              navigateToProduct: true
                            })
                          }
                        >
                          Run Pipeline
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

      <section className="rounded-[32px] border border-border bg-white p-8 shadow-panel">
        <p className="font-mono text-xs uppercase tracking-[0.28em] text-primary">Products</p>
        <h2 className="mt-2 font-[var(--font-display)] text-3xl font-semibold tracking-tight">Normalized product database</h2>
        <div className="mt-6 grid gap-5 lg:grid-cols-2">
          {products.map((product) => (
            <div key={product.id} className="rounded-[28px] border border-border bg-[#f7f1e4] p-5">
              <div className="flex items-start gap-4">
                <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-[20px] border border-border bg-white">
                  {product.hero_image_url ? (
                    <Image src={product.hero_image_url} alt={product.product_name} fill sizes="96px" className="object-cover" />
                  ) : null}
                </div>
                <div>
                  <h3 className="font-[var(--font-display)] text-2xl font-semibold">{product.product_name}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{product.category || 'uncategorized'}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {product.last_run_status ? <StatusBadge value={product.last_run_status} /> : null}
                    {product.last_run_stage ? <StatusBadge value={product.last_run_stage} /> : null}
                  </div>
                </div>
                <div className="ml-auto text-right text-sm text-muted-foreground">
                  <div>{product.price_amount ? `$${product.price_amount.toFixed(2)}` : 'N/A'}</div>
                  <div>{product.slug || 'draft slug'}</div>
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
