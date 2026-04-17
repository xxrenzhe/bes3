import Link from 'next/link'
import { ProductSpotlightCard } from '@/components/site/ProductSpotlightCard'
import { formatEditorialDate } from '@/lib/editorial'
import { buildProductFinalists, type ProductFinalist } from '@/lib/product-finalists'
import type { ProductRecord } from '@/lib/site-data'
import { formatPriceSnapshot } from '@/lib/utils'

function getModeLabel(finalists: ProductFinalist[]) {
  if (finalists.length >= 3) return '3-way shortlist'
  if (finalists.length === 2) return 'Head-to-head'
  return 'Best available now'
}

export function ProductFinalistsSection({
  products,
  title,
  description,
  source,
  browseHref,
  browseLabel,
  waitHref,
  waitLabel
}: {
  products: ProductRecord[]
  title: string
  description: string
  source: string
  browseHref: string
  browseLabel: string
  waitHref: string
  waitLabel: string
}) {
  const finalists = buildProductFinalists(products)

  if (!finalists.length) return null

  const winner = finalists[0]

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="editorial-kicker">3 Picks Max</p>
          <h2 className="mt-3 font-[var(--font-display)] text-4xl font-black tracking-tight text-foreground">{title}</h2>
        </div>
        <p className="max-w-3xl text-sm leading-7 text-muted-foreground">{description}</p>
      </div>

      <article className="overflow-hidden rounded-[2rem] bg-white shadow-panel">
        <div className="border-b border-border/50 bg-[linear-gradient(135deg,#0f172a_0%,#134e4a_100%)] px-6 py-6 text-white">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-200">Winner now</p>
            <span className="rounded-full border border-white/15 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-white/85">
              {getModeLabel(finalists)}
            </span>
          </div>
          <h3 className="mt-3 font-[var(--font-display)] text-3xl font-black tracking-tight">{winner.product.productName}</h3>
          <p className="mt-3 max-w-4xl text-sm leading-7 text-slate-200">{winner.reason}</p>
        </div>

        <div className="space-y-4 p-6">
          <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded-[1.5rem] bg-muted p-5">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">Why it wins</p>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">{winner.reason}</p>
            </div>
            <div className="rounded-[1.5rem] bg-muted p-5">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">If not buying today</p>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">
                Keep this set tight. If timing is still the blocker, switch into a price watch instead of widening the shortlist again.
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                <Link href={waitHref} className="rounded-full border border-border px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-white">
                  {waitLabel}
                </Link>
                <Link href={browseHref} className="rounded-full border border-border px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-white">
                  {browseLabel}
                </Link>
              </div>
            </div>
          </div>

          <div className="rounded-[1.5rem] border border-border/60">
            <div className="overflow-x-auto">
              <div className="min-w-[880px]">
                <div className="grid grid-cols-[1.7fr_1fr_1.1fr_1.1fr_1.2fr] gap-3 bg-muted/70 px-4 py-3 text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                  <span>Pick</span>
                  <span>Current</span>
                  <span>Buyer proof</span>
                  <span>Evidence</span>
                  <span>Last checked</span>
                </div>
                <div className="divide-y divide-border/60">
                  {finalists.map((item, index) => (
                    <div key={item.product.id} className="grid grid-cols-[1.7fr_1fr_1.1fr_1.1fr_1.2fr] gap-3 px-4 py-4 text-sm">
                      <div>
                        <p className="font-semibold text-foreground">
                          {index === 0 ? 'Winner' : `Option ${index + 1}`} · {item.product.productName}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">{item.caution}</p>
                      </div>
                      <div className="font-black text-foreground">
                        {formatPriceSnapshot(item.product.priceAmount, item.product.priceCurrency || 'USD')}
                      </div>
                      <div className="text-muted-foreground">
                        {item.product.rating
                          ? `${item.product.rating.toFixed(1)} / 5${item.product.reviewCount ? ` · ${item.product.reviewCount.toLocaleString()} reviews` : ''}`
                          : 'Proof still thin'}
                      </div>
                      <div className="text-muted-foreground">
                        {`${Math.round((item.product.dataConfidenceScore || 0) * 100)}% confidence · ${Math.round((item.product.attributeCompletenessScore || 0) * 100)}% specs`}
                      </div>
                      <div className="text-muted-foreground">
                        {formatEditorialDate(item.checkedAt)} · {item.freshnessLabel.toLowerCase()}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {finalists.length > 1 ? (
            <div className="rounded-[1.5rem] bg-muted p-5">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">Where the other options differ</p>
              <div className="mt-3 space-y-2">
                {finalists.slice(1).map((item, index) => (
                  <p key={item.product.id} className="text-sm leading-7 text-muted-foreground">
                    {`Option ${index + 2}: ${item.product.productName} stays viable, but ${item.caution.charAt(0).toLowerCase()}${item.caution.slice(1)}`}
                  </p>
                ))}
              </div>
            </div>
          ) : null}

          <div className="grid gap-6 xl:grid-cols-3">
            {finalists.map((item) => (
              <ProductSpotlightCard key={item.product.id} product={item.product} source={source} />
            ))}
          </div>
        </div>
      </article>
    </section>
  )
}
