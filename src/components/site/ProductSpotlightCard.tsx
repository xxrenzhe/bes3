import Image from 'next/image'
import Link from 'next/link'
import { PrimaryCta } from '@/components/site/PrimaryCta'
import { ShortlistActionBar } from '@/components/site/ShortlistActionBar'
import { formatEditorialDate, getFreshnessLabel } from '@/lib/editorial'
import { buildMerchantExitPath, hasMerchantExitTarget } from '@/lib/merchant-links'
import { toShortlistItem } from '@/lib/shortlist'
import type { ProductRecord } from '@/lib/site-data'
import { cn, formatPriceSnapshot } from '@/lib/utils'

export function ProductSpotlightCard({
  product,
  source,
  supportingHref,
  supportingLabel = 'Open details',
  className
}: {
  product: ProductRecord
  source: string
  supportingHref?: string | null
  supportingLabel?: string
  className?: string
}) {
  const freshnessDate = product.updatedAt || product.publishedAt
  const productHref = product.slug ? `/products/${product.slug}` : supportingHref || null
  const merchantHref = hasMerchantExitTarget(product) ? buildMerchantExitPath(product.id, source) : null
  const shortlistItem = toShortlistItem(product)

  return (
    <article className={cn('overflow-hidden rounded-[2rem] bg-white shadow-panel', className)}>
      <div className="relative aspect-[16/10] overflow-hidden bg-[linear-gradient(135deg,#e5eeff,#dfe9fa)]">
        {product.heroImageUrl ? (
          <Image
            src={product.heroImageUrl}
            alt={product.productName}
            fill
            sizes="(max-width: 768px) 100vw, 40vw"
            className="object-cover"
          />
        ) : (
          <div className="bg-grid absolute inset-0" />
        )}
        <div className="absolute left-4 top-4 rounded-full bg-white/92 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.22em] text-primary shadow-sm">
          {product.category ? product.category.replace(/-/g, ' ') : 'Buyer shortlist'}
        </div>
      </div>

      <div className="space-y-5 p-6">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-3 text-xs font-semibold text-muted-foreground">
            <span>{product.brand || 'Bes3 pick'}</span>
            <span className="hidden sm:inline">•</span>
            <span>{getFreshnessLabel(freshnessDate)}</span>
          </div>
          <h3 className="font-[var(--font-display)] text-3xl font-black tracking-tight text-foreground">{product.productName}</h3>
          <p className="text-sm leading-7 text-muted-foreground">
            {product.description || 'Current price context, buyer reviews, and a direct path into the full Bes3 product page.'}
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-[1.25rem] bg-muted p-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Current price</p>
            <p className="mt-2 text-lg font-black text-foreground">{formatPriceSnapshot(product.priceAmount, product.priceCurrency || 'USD')}</p>
          </div>
          <div className="rounded-[1.25rem] bg-muted p-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">User rating</p>
            <p className="mt-2 text-lg font-black text-foreground">
              {product.rating ? `${product.rating.toFixed(1)} / 5` : 'Rating pending'}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {product.reviewCount ? `${product.reviewCount.toLocaleString()} reviews` : 'Review count pending'}
            </p>
          </div>
          <div className="rounded-[1.25rem] bg-muted p-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Last checked</p>
            <p className="mt-2 text-lg font-black text-foreground">{formatEditorialDate(freshnessDate, 'Tracking soon')}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          {productHref ? (
            <Link href={productHref} className="text-sm font-semibold text-primary transition-colors hover:text-emerald-700">
              {supportingLabel} →
            </Link>
          ) : null}
          {product.reviewHighlights[0] ? <p className="text-xs text-muted-foreground">{product.reviewHighlights[0]}</p> : null}
        </div>

        <ShortlistActionBar item={shortlistItem} compact source={source} />

        <PrimaryCta
          href={merchantHref}
          productId={product.id}
          trackingSource={source}
          note="Use the full Bes3 product page first if you still need to verify fit, specs, or tradeoffs."
        />
      </div>
    </article>
  )
}
