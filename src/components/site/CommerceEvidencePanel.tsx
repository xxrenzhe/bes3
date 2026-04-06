'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { buildTrackedMerchantExitPath, trackDecisionEvent } from '@/lib/decision-tracking'
import { formatEditorialDate, getFreshnessLabel } from '@/lib/editorial'
import { buildMerchantExitPath } from '@/lib/merchant-links'
import { buildDealDecisionSignal, summarizePriceHistoryWindow } from '@/lib/price-insights'
import type {
  CommerceProductRecord,
  ProductAttributeFactRecord,
  ProductOfferRecord,
  ProductPriceHistoryRecord
} from '@/lib/site-data'
import { formatPriceSnapshot } from '@/lib/utils'
import { PriceTrendSparkline } from './PriceTrendSparkline'

function formatPercentScore(value: number | null | undefined) {
  const normalized = Number(value || 0)
  return `${Math.round(normalized * 100)}%`
}

function formatAvailabilityLabel(value: string | null | undefined) {
  if (!value) return 'Unknown'
  return value.replace(/_/g, ' ')
}

function formatPriceDelta(value: number | null | undefined, currency: string) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value === 0) return 'No change'
  const prefix = value > 0 ? '+' : '-'
  return `${prefix}${formatPriceSnapshot(Math.abs(value), currency)}`
}

export function CommerceEvidencePanel({
  product,
  offers,
  attributeFacts,
  priceHistory = [],
  title = 'What we checked',
  description = 'These are the latest prices, seller details, and product facts behind this recommendation.',
  compact = false,
  source = 'commerce-evidence-panel'
}: {
  product: CommerceProductRecord | null
  offers: ProductOfferRecord[]
  attributeFacts: ProductAttributeFactRecord[]
  priceHistory?: ProductPriceHistoryRecord[]
  title?: string
  description?: string
  compact?: boolean
  source?: string
}) {
  const [showAllOffers, setShowAllOffers] = useState(false)
  const [showPriceHistory, setShowPriceHistory] = useState(false)
  const [resolvedOfferHrefs, setResolvedOfferHrefs] = useState<Record<number, string>>({})

  useEffect(() => {
    if (!product) return

    setResolvedOfferHrefs(
      Object.fromEntries(
        offers.map((offer) => [offer.id, buildTrackedMerchantExitPath(product.id, `${source}-offer`, offer.id)])
      )
    )
  }, [offers, product, source])

  if (!product) return null

  const bestOffer = product.bestOffer || offers[0] || null
  const defaultVisibleOffers = compact ? 2 : 4
  const visibleOffers = showAllOffers ? offers : offers.slice(0, defaultVisibleOffers)
  const visibleFacts = attributeFacts.slice(0, compact ? 4 : 6)
  const historySummary = summarizePriceHistoryWindow(
    priceHistory,
    bestOffer?.priceAmount ?? product.priceAmount,
    bestOffer?.priceCurrency || product.priceCurrency || 'USD'
  )
  const timingSignal = historySummary ? buildDealDecisionSignal(historySummary) : null
  const visibleHistory = priceHistory.slice(0, showPriceHistory ? (compact ? 6 : 8) : 3)
  const historyCurrency = historySummary?.currency || bestOffer?.priceCurrency || product.priceCurrency || 'USD'

  return (
    <section className="rounded-[2rem] bg-white p-6 shadow-panel">
      <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-primary">{title}</p>
      <h2 className="mt-3 font-[var(--font-display)] text-2xl font-black tracking-tight text-foreground">
        What we checked before recommending this
      </h2>
      <p className="mt-3 text-sm leading-7 text-muted-foreground">{description}</p>

      <div className={`mt-5 grid gap-4 ${compact ? 'md:grid-cols-2' : 'md:grid-cols-4'}`}>
        <div className="rounded-[1.25rem] bg-muted p-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Best current price</p>
          <p className="mt-2 text-xl font-black text-foreground">
            {formatPriceSnapshot(bestOffer?.priceAmount ?? product.priceAmount, bestOffer?.priceCurrency || product.priceCurrency || 'USD')}
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            {bestOffer?.merchantName || 'Merchant pending'} · {formatAvailabilityLabel(bestOffer?.availabilityStatus)}
          </p>
        </div>
        <div className="rounded-[1.25rem] bg-muted p-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Price last checked</p>
          <p className="mt-2 text-xl font-black text-foreground">{formatEditorialDate(product.offerLastCheckedAt || product.priceLastCheckedAt)}</p>
          <p className="mt-2 text-xs text-muted-foreground">{getFreshnessLabel(product.offerLastCheckedAt || product.priceLastCheckedAt)}</p>
        </div>
        <div className="rounded-[1.25rem] bg-muted p-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">How much we verified</p>
          <p className="mt-2 text-xl font-black text-foreground">{formatPercentScore(product.dataConfidenceScore)}</p>
          <p className="mt-2 text-xs text-muted-foreground">{product.offerCount} offers · {product.evidenceCount} facts</p>
        </div>
        <div className="rounded-[1.25rem] bg-muted p-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Specs we checked</p>
          <p className="mt-2 text-xl font-black text-foreground">{formatPercentScore(product.attributeCompletenessScore)}</p>
          <p className="mt-2 text-xs text-muted-foreground">{product.sourceCount} source{product.sourceCount === 1 ? '' : 's'}</p>
        </div>
      </div>

      {historySummary ? (
        <div className="mt-6 rounded-[1.5rem] border border-emerald-100 bg-[linear-gradient(135deg,#fff8ef_0%,#f8fbff_48%,#eefaf5_100%)] p-5">
          {timingSignal ? (
            <div className="mb-4 rounded-[1.25rem] bg-white/90 px-4 py-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">{timingSignal.badge}</p>
              <p className="mt-2 text-base font-black text-foreground">{timingSignal.title}</p>
              <p className="mt-2 text-sm leading-7 text-muted-foreground">{timingSignal.description}</p>
            </div>
          ) : null}
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">Price history window</p>
              <p className="mt-2 text-sm leading-7 text-muted-foreground">
                Bes3 has tracked {historySummary.totalPoints} price check{historySummary.totalPoints === 1 ? '' : 's'} for this product.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                if (!showPriceHistory) {
                  trackDecisionEvent({
                    eventType: 'price_history_view',
                    source,
                    productId: product.id,
                    metadata: {
                      snapshotCount: historySummary.totalPoints,
                      currentPrice: historySummary.currentPrice ?? null,
                      lowestPrice: historySummary.lowestPrice ?? null,
                      highestPrice: historySummary.highestPrice ?? null
                    }
                  })
                }
                setShowPriceHistory((current) => !current)
              }}
              className="inline-flex min-h-[40px] items-center justify-center rounded-full border border-border bg-white px-4 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
            >
              {showPriceHistory ? 'Hide price history' : 'View price history'}
            </button>
          </div>

          <PriceTrendSparkline
            priceHistory={priceHistory}
            fallbackPrice={bestOffer?.priceAmount ?? product.priceAmount}
            fallbackCurrency={historyCurrency}
            className="mt-4"
            tone={historySummary.currentPrice != null && historySummary.lowestPrice != null && historySummary.currentPrice <= historySummary.lowestPrice * 1.02 ? 'positive' : 'default'}
          />

          <div className="mt-5 grid gap-3 md:grid-cols-4">
            <div className="rounded-[1.25rem] bg-white/90 px-4 py-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Current tracked</p>
              <p className="mt-2 text-lg font-black text-foreground">
                {formatPriceSnapshot(historySummary.currentPrice, historyCurrency)}
              </p>
            </div>
            <div className="rounded-[1.25rem] bg-white/90 px-4 py-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Lowest seen</p>
              <p className="mt-2 text-lg font-black text-foreground">
                {formatPriceSnapshot(historySummary.lowestPrice, historyCurrency)}
              </p>
            </div>
            <div className="rounded-[1.25rem] bg-white/90 px-4 py-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Highest seen</p>
              <p className="mt-2 text-lg font-black text-foreground">
                {formatPriceSnapshot(historySummary.highestPrice, historyCurrency)}
              </p>
            </div>
            <div className="rounded-[1.25rem] bg-white/90 px-4 py-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Last move</p>
              <p className="mt-2 text-lg font-black text-foreground">
                {formatPriceDelta(historySummary.deltaFromPrevious, historyCurrency)}
              </p>
            </div>
          </div>

          {showPriceHistory ? (
            <div className="mt-4 space-y-3">
              {visibleHistory.map((point) => (
                <div key={point.id} className="rounded-[1.25rem] bg-white/90 px-4 py-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-foreground">{point.merchantName || 'Tracked snapshot'}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {formatAvailabilityLabel(point.availabilityStatus)} · captured {formatEditorialDate(point.capturedAt)}
                      </p>
                    </div>
                    <p className="text-sm font-black text-foreground">
                      {formatPriceSnapshot(point.priceAmount, point.priceCurrency || historyCurrency)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      <div className={`mt-6 grid gap-6 ${compact ? 'lg:grid-cols-1' : 'lg:grid-cols-[1fr_1fr]'}`}>
        <div>
          <div className="flex items-center justify-between gap-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">Stores we checked</p>
            {offers.length > defaultVisibleOffers ? (
              <button
                type="button"
                onClick={() => {
                  if (!showAllOffers) {
                    trackDecisionEvent({
                      eventType: 'offer_expand',
                      source,
                      productId: product.id,
                      metadata: {
                        offerCount: offers.length
                      }
                    })
                  }
                  setShowAllOffers((current) => !current)
                }}
                className="text-xs font-semibold text-primary transition-colors hover:text-emerald-700"
              >
                {showAllOffers ? 'Show fewer offers' : `Show all ${offers.length} offers`}
              </button>
            ) : null}
          </div>
          <div className="mt-4 space-y-3">
            {visibleOffers.length ? visibleOffers.map((offer) => {
              const offerHref = resolvedOfferHrefs[offer.id] || buildMerchantExitPath(product.id, `${source}-offer`, undefined, offer.id)

              return (
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
                  {offer.offerUrl ? (
                    <Link
                      href={offerHref}
                      target="_blank"
                      prefetch={false}
                      onClick={() => {
                        trackDecisionEvent({
                          eventType: 'merchant_offer_select',
                          source,
                          productId: product.id,
                          metadata: {
                            offerId: offer.id,
                            merchantName: offer.merchantName || null,
                            availabilityStatus: offer.availabilityStatus || null,
                            priceAmount: offer.priceAmount ?? null,
                            couponText: offer.couponText || null
                          }
                        })
                      }}
                      className="mt-3 inline-flex text-sm font-semibold text-primary transition-colors hover:text-emerald-700"
                    >
                      Check this store →
                    </Link>
                  ) : null}
                </div>
              )
            }) : (
              <div className="rounded-[1.25rem] bg-muted px-4 py-4 text-sm text-muted-foreground">
                No store prices have been saved yet.
              </div>
            )}
          </div>
        </div>

        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">Product facts</p>
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
                No extra product facts have been saved yet.
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
