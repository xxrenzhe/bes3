import { formatEditorialDate, getFreshnessLabel } from '@/lib/editorial'
import type { CommerceProductRecord, ProductAttributeFactRecord, ProductOfferRecord } from '@/lib/site-data'
import { formatPriceSnapshot } from '@/lib/utils'

function formatPercentScore(value: number | null | undefined) {
  const normalized = Number(value || 0)
  return `${Math.round(normalized * 100)}%`
}

function formatAvailabilityLabel(value: string | null | undefined) {
  if (!value) return 'Unknown'
  return value.replace(/_/g, ' ')
}

export function CommerceEvidencePanel({
  product,
  offers,
  attributeFacts,
  title = 'Decision evidence',
  description = 'These are the current offer and attribute signals Bes3 used to support the recommendation.',
  compact = false
}: {
  product: CommerceProductRecord | null
  offers: ProductOfferRecord[]
  attributeFacts: ProductAttributeFactRecord[]
  title?: string
  description?: string
  compact?: boolean
}) {
  if (!product) return null

  const bestOffer = product.bestOffer || offers[0] || null
  const visibleOffers = offers.slice(0, compact ? 2 : 4)
  const visibleFacts = attributeFacts.slice(0, compact ? 4 : 6)

  return (
    <section className="rounded-[2rem] bg-white p-6 shadow-panel">
      <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-primary">{title}</p>
      <h2 className="mt-3 font-[var(--font-display)] text-2xl font-black tracking-tight text-foreground">
        Evidence behind the current pick
      </h2>
      <p className="mt-3 text-sm leading-7 text-muted-foreground">{description}</p>

      <div className={`mt-5 grid gap-4 ${compact ? 'md:grid-cols-2' : 'md:grid-cols-4'}`}>
        <div className="rounded-[1.25rem] bg-muted p-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Best live offer</p>
          <p className="mt-2 text-xl font-black text-foreground">
            {formatPriceSnapshot(bestOffer?.priceAmount ?? product.priceAmount, bestOffer?.priceCurrency || product.priceCurrency || 'USD')}
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            {bestOffer?.merchantName || 'Merchant pending'} · {formatAvailabilityLabel(bestOffer?.availabilityStatus)}
          </p>
        </div>
        <div className="rounded-[1.25rem] bg-muted p-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Offer freshness</p>
          <p className="mt-2 text-xl font-black text-foreground">{formatEditorialDate(product.offerLastCheckedAt || product.priceLastCheckedAt)}</p>
          <p className="mt-2 text-xs text-muted-foreground">{getFreshnessLabel(product.offerLastCheckedAt || product.priceLastCheckedAt)}</p>
        </div>
        <div className="rounded-[1.25rem] bg-muted p-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Data confidence</p>
          <p className="mt-2 text-xl font-black text-foreground">{formatPercentScore(product.dataConfidenceScore)}</p>
          <p className="mt-2 text-xs text-muted-foreground">{product.offerCount} offers · {product.evidenceCount} facts</p>
        </div>
        <div className="rounded-[1.25rem] bg-muted p-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Attribute coverage</p>
          <p className="mt-2 text-xl font-black text-foreground">{formatPercentScore(product.attributeCompletenessScore)}</p>
          <p className="mt-2 text-xs text-muted-foreground">{product.sourceCount} source signal{product.sourceCount === 1 ? '' : 's'}</p>
        </div>
      </div>

      <div className={`mt-6 grid gap-6 ${compact ? 'lg:grid-cols-1' : 'lg:grid-cols-[1fr_1fr]'}`}>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">Tracked offers</p>
          <div className="mt-4 space-y-3">
            {visibleOffers.length ? visibleOffers.map((offer) => (
              <div key={offer.id} className="rounded-[1.25rem] bg-muted px-4 py-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{offer.merchantName || 'Merchant pending'}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {formatAvailabilityLabel(offer.availabilityStatus)} · checked {formatEditorialDate(offer.lastCheckedAt)}
                    </p>
                  </div>
                  <p className="text-sm font-black text-foreground">
                    {formatPriceSnapshot(offer.priceAmount, offer.priceCurrency || product.priceCurrency || 'USD')}
                  </p>
                </div>
                {offer.couponText ? (
                  <p className="mt-2 text-xs text-muted-foreground">Coupon: {offer.couponText}</p>
                ) : null}
              </div>
            )) : (
              <div className="rounded-[1.25rem] bg-muted px-4 py-4 text-sm text-muted-foreground">
                No tracked offer rows yet.
              </div>
            )}
          </div>
        </div>

        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">Verified facts</p>
          <div className="mt-4 space-y-3">
            {visibleFacts.length ? visibleFacts.map((fact) => (
              <div key={fact.id} className="rounded-[1.25rem] bg-muted px-4 py-4">
                <div className="flex items-start justify-between gap-4">
                  <p className="text-sm font-semibold text-foreground">{fact.attributeLabel}</p>
                  <span className="rounded-full bg-white px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    {fact.isVerified ? 'verified' : fact.sourceType}
                  </span>
                </div>
                <p className="mt-2 text-sm leading-7 text-muted-foreground">{fact.attributeValue}</p>
              </div>
            )) : (
              <div className="rounded-[1.25rem] bg-muted px-4 py-4 text-sm text-muted-foreground">
                No attribute evidence rows yet.
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
