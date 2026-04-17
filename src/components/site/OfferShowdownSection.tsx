import Link from 'next/link'
import { getCategoryLabel } from '@/lib/editorial'
import { buildOffersPath, type OfferShowdown } from '@/lib/offers'
import { formatPriceSnapshot } from '@/lib/utils'

function formatTrackedLabel(distanceFromTrackedLowPercent: number | null) {
  if (distanceFromTrackedLowPercent == null) return 'Needs more tracked data'
  if (distanceFromTrackedLowPercent <= 0.25) return 'At tracked low'
  return `${distanceFromTrackedLowPercent.toFixed(distanceFromTrackedLowPercent < 10 ? 1 : 0)}% above low`
}

function formatPromotionLabel(showdown: OfferShowdown['contenders'][number]) {
  if (showdown.savingsAmount != null && showdown.savingsPercent != null) {
    return `${Math.round(showdown.savingsPercent)}% off · save ${formatPriceSnapshot(showdown.savingsAmount, showdown.currentCurrency)}`
  }

  return 'Live affiliate promotion'
}

export function OfferShowdownSection({
  showdowns,
  title,
  description
}: {
  showdowns: OfferShowdown[]
  title: string
  description: string
}) {
  if (!showdowns.length) return null

  return (
    <section className="space-y-8">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="editorial-kicker">3 Picks Max</p>
          <h2 className="mt-3 font-[var(--font-display)] text-4xl font-black tracking-tight text-foreground">{title}</h2>
        </div>
        <p className="max-w-3xl text-sm leading-7 text-muted-foreground">{description}</p>
      </div>

      <div className="grid gap-8 xl:grid-cols-2">
        {showdowns.map((showdown) => (
          <article key={showdown.categorySlug} className="overflow-hidden rounded-[2rem] bg-white shadow-panel">
            <div className="border-b border-border/50 bg-[linear-gradient(135deg,#0f172a_0%,#134e4a_100%)] px-6 py-6 text-white">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-200">{getCategoryLabel(showdown.category)}</p>
              <h3 className="mt-3 font-[var(--font-display)] text-3xl font-black tracking-tight">{showdown.winner.product.productName}</h3>
              <p className="mt-3 text-sm leading-7 text-slate-200">{showdown.winner.winnerReason}</p>
            </div>

            <div className="space-y-4 p-6">
              <div className="rounded-[1.5rem] bg-muted p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Winner now</p>
                    <p className="mt-2 text-2xl font-black text-foreground">
                      {formatPriceSnapshot(showdown.winner.currentPrice, showdown.winner.currentCurrency)}
                    </p>
                  </div>
                  <span className="rounded-full bg-emerald-100 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-emerald-900">
                    {showdown.winner.primaryBadge}
                  </span>
                </div>
                <p className="mt-3 text-sm leading-7 text-muted-foreground">{showdown.winner.nextStepReason}</p>
              </div>

              <div className="overflow-hidden rounded-[1.5rem] border border-border/60">
                <div className="overflow-x-auto">
                  <div className="min-w-[680px]">
                    <div className="grid grid-cols-[1.5fr_1fr_1fr_1fr] gap-3 bg-muted/70 px-4 py-3 text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                      <span>Pick</span>
                      <span>Current</span>
                      <span>Promotion</span>
                      <span>Timing</span>
                    </div>
                    <div className="divide-y divide-border/60">
                      {showdown.contenders.map((item, index) => (
                        <div key={item.product.id} className="grid grid-cols-[1.5fr_1fr_1fr_1fr] gap-3 px-4 py-4 text-sm">
                          <div>
                            <p className="font-semibold text-foreground">
                              {index === 0 ? 'Winner' : `Option ${index + 1}`} · {item.product.productName}
                            </p>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {item.product.bestOffer?.merchantName || 'Affiliate merchant'} · proof score {Math.round(item.product.dataConfidenceScore * 100)}%
                            </p>
                          </div>
                          <div className="font-black text-foreground">
                            {formatPriceSnapshot(item.currentPrice, item.currentCurrency)}
                          </div>
                          <div className="text-muted-foreground">
                            {formatPromotionLabel(item)}
                          </div>
                          <div className="text-muted-foreground">
                            {formatTrackedLabel(item.distanceFromTrackedLowPercent)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <Link href={buildOffersPath(showdown.category)} className="rounded-full border border-border px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-muted">
                  View {getCategoryLabel(showdown.category)} page
                </Link>
                {showdown.winner.product.slug ? (
                  <Link href={`/products/${showdown.winner.product.slug}`} className="rounded-full border border-border px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-muted">
                    Open winner
                  </Link>
                ) : null}
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}
