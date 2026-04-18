import { DecisionSummaryPanel } from '@/components/site/DecisionSummaryPanel'
import { ProductSpotlightCard } from '@/components/site/ProductSpotlightCard'
import { TrackedDecisionLink } from '@/components/site/TrackedDecisionLink'
import { formatEditorialDate } from '@/lib/editorial'
import {
  buildIntentContextChips,
  buildIntentRecommendationNote,
  type IntentSearchResult
} from '@/lib/commerce-intent'
import { formatPriceSnapshot } from '@/lib/utils'

function formatTrackedLabel(distanceFromTrackedLowPercent: number | null) {
  if (distanceFromTrackedLowPercent == null) return 'Tracked floor still developing'
  if (distanceFromTrackedLowPercent <= 0.25) return 'At tracked low'
  return `${distanceFromTrackedLowPercent.toFixed(distanceFromTrackedLowPercent < 10 ? 1 : 0)}% above low`
}

function formatPromotionLabel(item: IntentSearchResult['recommendations'][number]) {
  if (item.hasVerifiedDiscount && item.savingsAmount != null && item.savingsPercent != null) {
    return `${Math.round(item.savingsPercent)}% off · save ${formatPriceSnapshot(item.savingsAmount, item.currentCurrency)}`
  }

  return 'Timing-led recommendation'
}

function formatShippingLabel(item: IntentSearchResult['recommendations'][number]) {
  if (item.shippingCost == null) return 'Shipping not listed'
  if (item.shippingCost <= 0) return 'Free shipping'
  return formatPriceSnapshot(item.shippingCost, item.currentCurrency)
}

function formatReferenceLabel(item: IntentSearchResult['recommendations'][number]) {
  if (item.referencePrice == null) return 'No reliable reference'
  return formatPriceSnapshot(item.referencePrice, item.referenceCurrency || item.currentCurrency)
}

function formatProofLabel(item: IntentSearchResult['recommendations'][number]) {
  if (!item.product.rating) return 'Proof still thin'
  const reviews = item.product.reviewCount ? ` · ${item.product.reviewCount.toLocaleString()} reviews` : ''
  return `${item.product.rating.toFixed(1)} / 5${reviews}`
}

export function IntentRecommendationPanel({
  result,
  source = 'intent-search-results'
}: {
  result: IntentSearchResult
  source?: string
}) {
  const chips = buildIntentContextChips(result)
  const note = buildIntentRecommendationNote(result)
  const lead = result.recommendations[0] || null
  const leadProductId = lead?.product.id || null
  const comparisonReady = result.recommendations.length >= 2

  return (
    <div className="space-y-8">
      <DecisionSummaryPanel
        eyebrow="Decision Summary"
        title="Bes3 is narrowing this shortlist for a practical reason."
        description="A strong assistant result should answer four things fast: who the shortlist fits, who should pause, why these picks matter now, and what the clean next move is."
        items={[
          {
            eyebrow: 'Who should use this',
            title: note.title,
            description: lead?.reasons.join(' ') || 'These picks match the current use case, constraints, and available evidence best.'
          },
          {
            eyebrow: 'Who should skip',
            title: lead?.concerns.length ? 'Keep one concern in mind' : 'Only skip this path if the problem changed',
            description: lead?.concerns[0] || (comparisonReady
              ? 'If you still do not have true finalists, go back and tighten the request instead of forcing a compare.'
              : 'If the use case, budget, or deal-breakers changed, rerun the request instead of forcing the current shortlist.'),
            tone: 'muted'
          },
          {
            eyebrow: 'Why now',
            title: 'This is the narrowing checkpoint',
            description: comparisonReady
              ? 'You now have enough proof to stop broad browsing and decide whether the shortlist is ready for compare.'
              : 'You now have enough signal to validate the lead product instead of searching the whole market again.'
          },
          {
            eyebrow: 'Next step',
            title: result.nextAction.title,
            description: result.nextAction.description,
            tone: 'strong'
          }
        ]}
      />

      <section className="rounded-[2rem] bg-white p-8 shadow-panel">
        <div className="flex flex-col gap-4 border-b border-border/40 pb-6 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="editorial-kicker">Best Matches</p>
            <h2 className="mt-3 font-[var(--font-display)] text-3xl font-black tracking-tight text-foreground">
              Here are the strongest options for what you need.
            </h2>
          </div>
          <p className="max-w-2xl text-sm leading-7 text-muted-foreground">
            We start with product fit, then look at price timing, then point you to the fastest next step.
          </p>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          {chips.map((chip) => (
            <span
              key={chip}
              className="rounded-full bg-muted px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground"
            >
              {chip}
            </span>
          ))}
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="rounded-[1.5rem] bg-[linear-gradient(135deg,#fff8ef_0%,#f8fbff_48%,#eefaf5_100%)] p-6">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">Best match</p>
            <h3 className="mt-3 font-[var(--font-display)] text-2xl font-black tracking-tight text-foreground">{note.title}</h3>
            <p className="mt-3 text-sm leading-7 text-muted-foreground">{note.description}</p>
            <div className="mt-5 flex flex-wrap gap-3">
              <TrackedDecisionLink
                href={result.nextAction.href}
                className="inline-flex min-h-[44px] items-center justify-center rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground"
                eventType={result.nextAction.href.includes('/newsletter') ? 'alert_subscribe_from_assistant' : 'assistant_recommendation_accept'}
                source={source}
                productId={leadProductId}
                metadata={{
                  href: result.nextAction.href,
                  label: result.nextAction.label
                }}
              >
                {result.nextAction.label}
              </TrackedDecisionLink>
              <TrackedDecisionLink
                href={result.shortlistPath}
                className="inline-flex min-h-[44px] items-center justify-center rounded-full border border-border px-5 text-sm font-semibold text-foreground"
                eventType="assistant_recommendation_accept"
                source={source}
                productId={leadProductId}
                metadata={{
                  href: result.shortlistPath,
                  label: 'Save this shortlist'
                }}
              >
                Save this shortlist
              </TrackedDecisionLink>
              {note.brandHref ? (
                <TrackedDecisionLink
                  href={note.brandHref}
                  className="inline-flex min-h-[44px] items-center justify-center rounded-full border border-border px-5 text-sm font-semibold text-foreground"
                  eventType="assistant_recommendation_accept"
                  source={source}
                  productId={leadProductId}
                  metadata={{
                    href: note.brandHref,
                    label: 'Open brand page'
                  }}
                >
                  Open brand page
                </TrackedDecisionLink>
              ) : null}
            </div>
          </div>

          <div className="rounded-[1.5rem] bg-slate-950 p-6 text-white">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-200">Best next move</p>
            <h3 className="mt-3 font-[var(--font-display)] text-2xl font-black tracking-tight">{result.nextAction.title}</h3>
            <p className="mt-3 text-sm leading-7 text-slate-200">{result.nextAction.description}</p>
            <div className="mt-5 rounded-[1.25rem] bg-white/10 p-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-200">If this is not it</p>
              <p className="mt-2 text-sm leading-7 text-slate-200">{result.fallbackAction.description}</p>
              <TrackedDecisionLink
                href={result.fallbackAction.href}
                className="mt-4 inline-flex text-sm font-semibold text-emerald-200"
                eventType="assistant_recommendation_reject"
                source={source}
                productId={leadProductId}
                metadata={{
                  href: result.fallbackAction.href,
                  label: result.fallbackAction.label
                }}
              >
                {result.fallbackAction.label} →
              </TrackedDecisionLink>
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-5">
        <div className="flex items-baseline justify-between border-b border-border/30 pb-4">
          <div>
            <p className="editorial-kicker">3 Picks Max</p>
            <h2 className="mt-3 font-[var(--font-display)] text-3xl font-black tracking-tight">The current shortlist stays inside one category, with one lead and at most two alternatives.</h2>
          </div>
          <span className="text-sm text-muted-foreground">{result.recommendations.length} recommended pick{result.recommendations.length === 1 ? '' : 's'}</span>
        </div>
        <article className="overflow-hidden rounded-[2rem] bg-white shadow-panel">
          <div className="border-b border-border/50 bg-[linear-gradient(135deg,#0f172a_0%,#134e4a_100%)] px-6 py-6 text-white">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-200">Winner now</p>
              <span className="rounded-full border border-white/15 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-white/85">
                {result.recommendations.length >= 3 ? '3-way shortlist' : result.recommendations.length === 2 ? 'Head-to-head' : 'Best available now'}
              </span>
            </div>
            <h3 className="mt-3 font-[var(--font-display)] text-3xl font-black tracking-tight">{lead?.product.productName}</h3>
            <p className="mt-3 max-w-4xl text-sm leading-7 text-slate-200">{lead?.reasons.join(' ')}</p>
          </div>

          <div className="space-y-4 p-6">
            <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
              <div className="rounded-[1.5rem] bg-muted p-5">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">Why it wins</p>
                <p className="mt-3 text-sm leading-7 text-muted-foreground">{lead?.reasons.join(' ')}</p>
              </div>
              <div className="rounded-[1.5rem] bg-muted p-5">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">If not buying today</p>
                <p className="mt-3 text-sm leading-7 text-muted-foreground">{result.nextAction.description}</p>
                <div className="mt-4 flex flex-wrap gap-3">
                  <TrackedDecisionLink
                    href={result.nextAction.href}
                    className="rounded-full border border-border px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-white"
                    eventType={result.nextAction.href.includes('/newsletter') ? 'alert_subscribe_from_assistant' : 'assistant_recommendation_accept'}
                    source={source}
                    productId={leadProductId}
                    metadata={{
                      href: result.nextAction.href,
                      label: result.nextAction.label
                    }}
                  >
                    {result.nextAction.label}
                  </TrackedDecisionLink>
                  <TrackedDecisionLink
                    href={result.fallbackAction.href}
                    className="rounded-full border border-border px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-white"
                    eventType="assistant_recommendation_reject"
                    source={source}
                    productId={leadProductId}
                    metadata={{
                      href: result.fallbackAction.href,
                      label: result.fallbackAction.label
                    }}
                  >
                    {result.fallbackAction.label}
                  </TrackedDecisionLink>
                </div>
              </div>
            </div>

            <div className="rounded-[1.5rem] border border-border/60">
              <div className="overflow-x-auto">
                <div className="min-w-[1220px]">
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
                    {result.recommendations.map((item, index) => (
                      <div key={item.product.id} className="grid grid-cols-[1.7fr_1fr_1fr_1fr_1fr_1fr_1fr_1.1fr_1.2fr] gap-3 px-4 py-4 text-sm">
                        <div>
                          <p className="font-semibold text-foreground">
                            {index === 0 ? 'Winner' : `Option ${index + 1}`} · {item.product.productName}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {item.concerns[0] || 'No major blocker is visible yet, but validate the product page before treating it as final.'}
                          </p>
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
                          {item.merchantName || 'Affiliate merchant'}
                        </div>
                        <div className="text-muted-foreground">
                          {formatShippingLabel(item)}
                        </div>
                        <div className="text-muted-foreground">
                          {formatProofLabel(item)}
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

            {result.recommendations.length > 1 ? (
              <div className="rounded-[1.5rem] bg-muted p-5">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">Where the other options differ</p>
                <div className="mt-3 space-y-2">
                  {result.recommendations.slice(1).map((item, index) => (
                    <p key={item.product.id} className="text-sm leading-7 text-muted-foreground">
                      {`Option ${index + 2}: ${item.product.productName} stays viable, but it is currently ${formatTrackedLabel(item.distanceFromTrackedLowPercent).toLowerCase()} and ${formatPromotionLabel(item).toLowerCase()}. ${item.concerns[0] || 'Validate the product page before treating it as final.'}`}
                    </p>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="grid gap-6 xl:grid-cols-3">
              {result.recommendations.map((item) => (
                <ProductSpotlightCard key={item.product.id} product={item.product} source="intent-search-results" />
              ))}
            </div>
          </div>
        </article>
      </section>
    </div>
  )
}
