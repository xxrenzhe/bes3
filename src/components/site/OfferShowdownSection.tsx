import Link from 'next/link'
import { formatEditorialDate, getCategoryLabel } from '@/lib/editorial'
import { buildNewsletterPath } from '@/lib/newsletter-path'
import { buildOffersPath, type OfferShowdown } from '@/lib/offers'
import { formatPriceSnapshot } from '@/lib/utils'

function formatTrackedLabel(distanceFromTrackedLowPercent: number | null) {
  if (distanceFromTrackedLowPercent == null) return 'Needs more tracked data'
  if (distanceFromTrackedLowPercent <= 0.25) return 'At tracked low'
  return `${distanceFromTrackedLowPercent.toFixed(distanceFromTrackedLowPercent < 10 ? 1 : 0)}% above low`
}

function formatPromotionLabel(showdown: OfferShowdown['contenders'][number]) {
  if (showdown.hasVerifiedDiscount && showdown.savingsAmount != null && showdown.savingsPercent != null) {
    return `${Math.round(showdown.savingsPercent)}% off · save ${formatPriceSnapshot(showdown.savingsAmount, showdown.currentCurrency)}`
  }

  if (showdown.signal.id === 'buy-now') return 'Near tracked low'
  if (showdown.signal.id === 'watch') return 'Watch timing'
  return 'Live offer'
}

function formatReferenceLabel(item: OfferShowdown['contenders'][number]) {
  if (item.referencePrice == null) return 'No reliable reference'
  return formatPriceSnapshot(item.referencePrice, item.referenceCurrency || item.currentCurrency)
}

function formatShippingLabel(item: OfferShowdown['contenders'][number]) {
  const shippingCost = item.product.bestOffer?.shippingCost
  if (shippingCost == null) return 'Shipping not listed'
  if (shippingCost <= 0) return 'Free shipping'
  return formatPriceSnapshot(shippingCost, item.currentCurrency)
}

function formatRatingLabel(item: OfferShowdown['contenders'][number]) {
  if (!item.product.rating) return 'Rating not listed'
  const reviews = item.product.reviewCount ? ` · ${item.product.reviewCount.toLocaleString()} reviews` : ''
  return `${item.product.rating.toFixed(1)} / 5${reviews}`
}

function formatLastCheckedLabel(item: OfferShowdown['contenders'][number]) {
  return formatEditorialDate(item.product.bestOffer?.lastCheckedAt || item.product.offerLastCheckedAt || item.product.priceLastCheckedAt)
}

function buildWaitHref(showdown: OfferShowdown) {
  const categoryLabel = getCategoryLabel(showdown.category)

  return buildNewsletterPath({
    intent: 'price-alert',
    category: showdown.category,
    cadence: 'priority',
    returnTo: buildOffersPath(showdown.category),
    returnLabel: `Resume ${categoryLabel} offers`,
    returnDescription: `Return to the ${categoryLabel.toLowerCase()} offers page when a stronger buying window appears.`
  })
}

function buildWaitReason(showdown: OfferShowdown) {
  if (!showdown.winner.isFresh) {
    return 'The winner is still useful, but the freshness window has drifted. Save the category and come back after the next live offer check instead of forcing the purchase now.'
  }

  if (showdown.winner.signal.id === 'watch') {
    return showdown.winner.nextStepReason
  }

  return 'If fit is clear but timing still feels early, keep this category on a price watch instead of reopening the shortlist or browsing sideways into weaker options.'
}

function getShowdownModeLabel(showdown: OfferShowdown) {
  if (showdown.contenders.length >= 3) return '3-way showdown'
  if (showdown.contenders.length === 2) return 'Head-to-head'
  return 'Best available now'
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
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-200">{getCategoryLabel(showdown.category)}</p>
                <span className="rounded-full border border-white/15 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-white/85">
                  {getShowdownModeLabel(showdown)}
                </span>
              </div>
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

              <div className="rounded-[1.5rem] border border-border/60">
                <div className="overflow-x-auto">
                  <div className="min-w-[1340px]">
                    <div className="grid grid-cols-[1.7fr_1fr_1fr_1fr_1fr_1fr_1fr_1.1fr_1.2fr] gap-3 bg-muted/70 px-4 py-3 text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                      <span>Pick</span>
                      <span>Current</span>
                      <span>Reference</span>
                      <span>Promotion</span>
                      <span>Timing</span>
                      <span>Merchant</span>
                      <span>Shipping</span>
                      <span>Buyer proof</span>
                      <span>Last checked</span>
                    </div>
                    <div className="divide-y divide-border/60">
                      {showdown.contenders.map((item, index) => (
                        <div key={item.product.id} className="grid grid-cols-[1.7fr_1fr_1fr_1fr_1fr_1fr_1fr_1.1fr_1.2fr] gap-3 px-4 py-4 text-sm">
                          <div>
                            <p className="font-semibold text-foreground">
                              {index === 0 ? 'Winner' : `Option ${index + 1}`} · {item.product.productName}
                            </p>
                            <p className="mt-1 text-xs text-muted-foreground">{item.nextStepReason}</p>
                          </div>
                          <div className="font-black text-foreground">
                            {formatPriceSnapshot(item.currentPrice, item.currentCurrency)}
                          </div>
                          <div className="text-muted-foreground">
                            {formatReferenceLabel(item)}
                          </div>
                          <div className="text-muted-foreground">
                            {formatPromotionLabel(item)}
                          </div>
                          <div className="text-muted-foreground">
                            {formatTrackedLabel(item.distanceFromTrackedLowPercent)}
                          </div>
                          <div className="text-muted-foreground">
                            {item.product.bestOffer?.merchantName || 'Affiliate merchant'}
                          </div>
                          <div className="text-muted-foreground">
                            {formatShippingLabel(item)}
                          </div>
                          <div className="text-muted-foreground">
                            {formatRatingLabel(item)}
                          </div>
                          <div className="text-muted-foreground">
                            {formatLastCheckedLabel(item)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-[1.5rem] bg-muted p-5">
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">Why it wins</p>
                  <p className="mt-3 text-sm leading-7 text-muted-foreground">{showdown.winner.winnerReason}</p>
                </div>
                <div className="rounded-[1.5rem] bg-muted p-5">
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">If not buying today</p>
                  <p className="mt-3 text-sm leading-7 text-muted-foreground">{buildWaitReason(showdown)}</p>
                  <div className="mt-4 flex flex-wrap gap-3">
                    <Link href={buildWaitHref(showdown)} className="rounded-full border border-border px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-white">
                      {`Track ${getCategoryLabel(showdown.category)}`}
                    </Link>
                    <Link href={buildOffersPath(showdown.category)} className="rounded-full border border-border px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-white">
                      {`View ${getCategoryLabel(showdown.category)} page`}
                    </Link>
                  </div>
                </div>
              </div>

              {showdown.contenders.length > 1 ? (
                <div className="rounded-[1.5rem] bg-muted p-5">
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">Where the other options differ</p>
                  <div className="mt-3 space-y-2">
                    {showdown.contenders.slice(1).map((item, index) => (
                      <p key={item.product.id} className="text-sm leading-7 text-muted-foreground">
                        {`Option ${index + 2}: ${item.product.productName} is sitting at ${formatTrackedLabel(item.distanceFromTrackedLowPercent).toLowerCase()} and ${formatPromotionLabel(item).toLowerCase()}. ${item.nextStepReason}`}
                      </p>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="rounded-[1.5rem] bg-muted p-5">
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">Fallback mode</p>
                  <p className="mt-3 text-sm leading-7 text-muted-foreground">
                    Only one affiliate-eligible contender is available in this category right now, so Bes3 treats it as the best available now instead of pretending a full showdown exists.
                  </p>
                </div>
              )}

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
