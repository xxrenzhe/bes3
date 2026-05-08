import Link from 'next/link'
import { PurchaseDecisionActionLink } from '@/components/commerce/PurchaseDecisionActionLink'
import { PrimaryCta } from '@/components/site/PrimaryCta'
import { ShortlistActionBar } from '@/components/site/ShortlistActionBar'
import { PriceTrendSparkline } from '@/components/site/PriceTrendSparkline'
import { getCategoryLabel, getFreshnessLabel } from '@/lib/editorial'
import { buildNewsletterPath } from '@/lib/newsletter-path'
import { buildOffersPath, type OfferOpportunity } from '@/lib/offers'
import { buildCommercePurchaseDecision } from '@/lib/purchase-decision'
import { toShortlistItem } from '@/lib/shortlist'
import { formatPriceSnapshot } from '@/lib/utils'

function formatTrackedPosition(opportunity: OfferOpportunity) {
  if (opportunity.distanceFromTrackedLowPercent == null) return 'Tracked floor still developing'
  if (opportunity.distanceFromTrackedLowPercent <= 0.25) return 'At tracked low'
  return `${opportunity.distanceFromTrackedLowPercent.toFixed(opportunity.distanceFromTrackedLowPercent < 10 ? 1 : 0)}% above low`
}

export function OfferOpportunityCard({
  opportunity,
  source = 'offers-card'
}: {
  opportunity: OfferOpportunity
  source?: string
}) {
  const purchaseDecision = buildCommercePurchaseDecision(opportunity.product, {
    pageType: 'deal',
    trackingSource: source,
    categoryHref: buildOffersPath(opportunity.product.category),
    alternativeHref: buildOffersPath(opportunity.product.category),
    userIntent: opportunity.signal.title
  })
  const alertHref = buildNewsletterPath({
    intent: opportunity.product.category ? 'price-alert' : 'offers',
    category: opportunity.product.category || '',
    cadence: 'priority',
    returnTo: buildOffersPath(opportunity.product.category),
    returnLabel: opportunity.product.category ? `Resume ${getCategoryLabel(opportunity.product.category)} offers` : 'Resume offers',
    returnDescription: 'Return to the same offers view with the same shortlist-ready context still visible.'
  })

  return (
    <article className="overflow-hidden rounded-[2rem] bg-white shadow-panel">
      <div className="border-b border-border/50 bg-[linear-gradient(135deg,#fff8ef_0%,#f8fbff_48%,#eefaf5_100%)] px-6 py-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-emerald-100 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-emerald-900">
              {opportunity.primaryBadge}
            </span>
            <span className="rounded-full bg-slate-950 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-white">
              {opportunity.signal.badge}
            </span>
          </div>
          <span className="text-xs font-semibold text-muted-foreground">
            {getFreshnessLabel(opportunity.product.bestOffer?.lastCheckedAt || opportunity.product.offerLastCheckedAt || opportunity.product.priceLastCheckedAt)}
          </span>
        </div>
        <h2 className="mt-4 font-[var(--font-display)] text-3xl font-black tracking-tight text-foreground">
          {opportunity.product.productName}
        </h2>
        <p className="mt-3 text-sm leading-7 text-muted-foreground">
          {opportunity.product.description || 'Live affiliate-eligible product with pricing, timing context, and a direct store path.'}
        </p>
      </div>

      <div className="space-y-5 p-6">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-[1.5rem] bg-muted p-5">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Current price</p>
            <p className="mt-3 text-3xl font-black text-foreground">
              {formatPriceSnapshot(opportunity.currentPrice, opportunity.currentCurrency)}
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              {opportunity.product.bestOffer?.merchantName || 'Affiliate merchant'} · {opportunity.product.offerCount} live offer{opportunity.product.offerCount === 1 ? '' : 's'}
            </p>
          </div>
          <div className="rounded-[1.5rem] bg-muted p-5">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Reference price</p>
            <p className="mt-3 text-3xl font-black text-foreground">
              {opportunity.referencePrice != null
                ? formatPriceSnapshot(opportunity.referencePrice, opportunity.referenceCurrency || opportunity.currentCurrency)
                : 'No reliable reference'}
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              {opportunity.hasVerifiedDiscount && opportunity.savingsAmount != null && opportunity.savingsPercent != null
                ? `Save ${formatPriceSnapshot(opportunity.savingsAmount, opportunity.currentCurrency)} · ${Math.round(opportunity.savingsPercent)}% below reference`
                : 'We only show a discount badge when a verifiable reference price exists.'}
            </p>
          </div>
          <div className="rounded-[1.5rem] bg-muted p-5">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Tracked position</p>
            <p className="mt-3 text-3xl font-black text-foreground">{formatTrackedPosition(opportunity)}</p>
            <p className="mt-2 text-xs text-muted-foreground">
              Lowest tracked: {formatPriceSnapshot(opportunity.summary.lowestPrice, opportunity.summary.currency || opportunity.currentCurrency)}
            </p>
          </div>
        </div>

        <div className="rounded-[1.5rem] border border-border/60 p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">Why this is live now</p>
              <h3 className="mt-3 text-xl font-black text-foreground">{opportunity.signal.title}</h3>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">{opportunity.winnerReason}</p>
            </div>
            <div className="rounded-[1.25rem] bg-muted px-4 py-3 text-right">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Opportunity score</p>
              <p className="mt-2 text-2xl font-black text-foreground">{Math.round(opportunity.opportunityScore)}</p>
            </div>
          </div>

          <PriceTrendSparkline
            priceHistory={opportunity.priceHistory}
            fallbackPrice={opportunity.currentPrice}
            fallbackCurrency={opportunity.currentCurrency}
            className="mt-5"
            tone={opportunity.signal.id === 'buy-now' ? 'positive' : opportunity.signal.id === 'watch' ? 'warning' : 'default'}
            showSummary={false}
          />

          <p className="mt-4 text-sm leading-7 text-muted-foreground">{opportunity.nextStepReason}</p>
        </div>

        <div className="flex flex-wrap gap-3">
          {opportunity.product.slug ? (
            <Link href={`/products/${opportunity.product.slug}`} className="rounded-full border border-border px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-muted">
              Open product page
            </Link>
          ) : null}
          {opportunity.product.category ? (
            <Link href={buildOffersPath(opportunity.product.category)} className="rounded-full border border-border px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-muted">
              See {getCategoryLabel(opportunity.product.category)} offers
            </Link>
          ) : null}
          <Link href={alertHref} className="rounded-full border border-border px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-muted">
            Start price watch
          </Link>
        </div>

        <ShortlistActionBar item={toShortlistItem(opportunity.product)} compact source={source} />

        {purchaseDecision.primaryActionHref?.startsWith('/go/') ? (
          <PrimaryCta
            href={purchaseDecision.primaryActionHref}
            label={purchaseDecision.primaryActionLabel}
            productId={opportunity.product.id}
            trackingSource={source}
            trackingMetadata={purchaseDecision.metadata}
            note="Affiliate disclosure stays attached to the store handoff."
            trustBadge={`${purchaseDecision.stateLabel} · ${purchaseDecision.confidenceLine}`}
          />
        ) : (
          <div className="space-y-2">
            <PurchaseDecisionActionLink
              decision={purchaseDecision}
              className="inline-flex min-h-[52px] items-center justify-center rounded-full bg-slate-950 px-6 py-3 text-sm font-semibold text-white transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            />
            <p className="text-xs text-muted-foreground">Bes3 keeps non-buy states out of the merchant handoff until the decision is purchase-ready.</p>
            <p className="text-xs font-medium text-muted-foreground">{purchaseDecision.stateLabel} · {purchaseDecision.confidenceLine}</p>
          </div>
        )}
      </div>
    </article>
  )
}
