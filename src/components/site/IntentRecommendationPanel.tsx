import { DecisionSummaryPanel } from '@/components/site/DecisionSummaryPanel'
import { ProductSpotlightCard } from '@/components/site/ProductSpotlightCard'
import { TrackedDecisionLink } from '@/components/site/TrackedDecisionLink'
import {
  buildIntentContextChips,
  buildIntentRecommendationNote,
  type IntentSearchResult
} from '@/lib/commerce-intent'

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
            <h2 className="mt-3 font-[var(--font-display)] text-3xl font-black tracking-tight">The current shortlist, with one lead and at most two alternatives.</h2>
          </div>
          <span className="text-sm text-muted-foreground">{result.recommendations.length} recommended pick{result.recommendations.length === 1 ? '' : 's'}</span>
        </div>
        <div className="grid gap-6 xl:grid-cols-2">
          {result.recommendations.map((item, index) => {
            const itemHref = item.product.slug ? `/products/${item.product.slug}` : result.shortlistPath
            const itemNextAction: {
              href: string
              label: string
              eventType: 'alert_subscribe_from_assistant' | 'assistant_recommendation_accept'
            } = index === 0
              ? {
                  href: result.nextAction.href,
                  label: result.nextAction.label,
                  eventType: result.nextAction.href.includes('/newsletter') ? 'alert_subscribe_from_assistant' : 'assistant_recommendation_accept'
                }
              : comparisonReady && index < 2
                ? {
                    href: result.comparePath,
                    label: 'Open shortlist finalists',
                    eventType: 'assistant_recommendation_accept' as const
                  }
                : {
                    href: itemHref,
                    label: 'Open product page',
                    eventType: 'assistant_recommendation_accept' as const
                  }

            return (
            <div key={item.product.id} className="space-y-4">
              <ProductSpotlightCard product={item.product} source="intent-search-results" />
              <div className="rounded-[1.5rem] bg-white p-5 shadow-panel">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">
                      {index === 0 ? 'Lead recommendation' : 'Shortlist recommendation'}
                    </p>
                    <h3 className="mt-2 font-[var(--font-display)] text-2xl font-black tracking-tight text-foreground">
                      {item.product.productName}
                    </h3>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {index === 0 ? (
                      <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800">
                        Best match now
                      </span>
                    ) : null}
                    <span className="rounded-full bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground">
                      Match {item.score}
                    </span>
                  </div>
                </div>
                <div className="mt-5 grid gap-4 md:grid-cols-3">
                  <div className="rounded-[1.25rem] bg-muted/70 p-4 md:col-span-2">
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Why it made the shortlist</p>
                    <div className="mt-3 space-y-2">
                      {item.reasons.map((reason) => (
                        <p key={reason} className="text-sm leading-7 text-muted-foreground">
                          {reason}
                        </p>
                      ))}
                    </div>
                  </div>
                  <div className="rounded-[1.25rem] border border-amber-200 bg-amber-50 p-4">
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-800">Biggest risk</p>
                    <p className="mt-3 text-sm leading-7 text-amber-900">
                      {item.concerns[0] || 'No major blocker is visible yet, but validate the product page before treating it as final.'}
                    </p>
                  </div>
                </div>
                <div className="mt-4 rounded-[1.25rem] border border-slate-200 bg-slate-50 p-4">
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Next move</p>
                  <p className="mt-3 text-sm leading-7 text-foreground">
                    {index === 0
                      ? result.nextAction.description
                      : comparisonReady && index < 2
                        ? 'This pick is strong enough to keep in the finalist set. Use compare next if you are down to the last serious options.'
                        : 'Open the product page next if you need one more fit check before saving, comparing, or waiting.'}
                  </p>
                  <TrackedDecisionLink
                    href={itemNextAction.href}
                    className="mt-4 inline-flex text-sm font-semibold text-primary"
                    eventType={itemNextAction.eventType}
                    source={source}
                    productId={item.product.id}
                    metadata={{
                      href: itemNextAction.href,
                      label: itemNextAction.label
                    }}
                  >
                    {itemNextAction.label} →
                  </TrackedDecisionLink>
                </div>
              </div>
            </div>
          )})}
        </div>
      </section>
    </div>
  )
}
