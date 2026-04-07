import { DecisionReasonPanel } from '@/components/site/DecisionReasonPanel'
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
      <DecisionReasonPanel
        eyebrow="Why these picks"
        title="Bes3 is narrowing for a reason, not just listing options."
        description="Every intent result should explain why these products made the shortlist, why the next step is what it is, and when you should stop browsing."
        cards={[
          {
            eyebrow: 'Why these made it',
            title: lead?.product.productName || 'Current shortlist',
            description: lead?.reasons.join(' ') || 'These picks match the current use case, constraints, and available evidence best.',
            tone: 'default'
          },
          {
            eyebrow: 'Why this next',
            title: result.nextAction.label,
            description: result.nextAction.description,
            tone: 'muted'
          },
          {
            eyebrow: 'Who should skip',
            title: lead?.concerns.length ? 'Keep one concern in mind' : 'Only skip this path if the problem changed',
            description: lead?.concerns[0] || (comparisonReady
              ? 'If you still do not have true finalists, go back and tighten the request instead of forcing a compare.'
              : 'If the use case, budget, or deal-breakers changed, rerun the request instead of forcing the current shortlist.'),
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
            <p className="editorial-kicker">Recommended products</p>
            <h2 className="mt-3 font-[var(--font-display)] text-3xl font-black tracking-tight">The current shortlist</h2>
          </div>
          <span className="text-sm text-muted-foreground">{result.recommendations.length} recommended pick{result.recommendations.length === 1 ? '' : 's'}</span>
        </div>
        <div className="grid gap-6 xl:grid-cols-2">
          {result.recommendations.map((item) => (
            <div key={item.product.id} className="space-y-4">
              <ProductSpotlightCard product={item.product} source="intent-search-results" />
              <div className="rounded-[1.5rem] bg-white p-5 shadow-panel">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">Why it made the shortlist</p>
                  <span className="rounded-full bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground">
                    Match {item.score}
                  </span>
                </div>
                <div className="mt-4 space-y-2">
                  {item.reasons.map((reason) => (
                    <p key={reason} className="text-sm leading-7 text-muted-foreground">
                      {reason}
                    </p>
                  ))}
                  {item.concerns.length ? (
                    <div className="rounded-[1rem] border border-amber-200 bg-amber-50 px-4 py-3">
                      {item.concerns.map((concern) => (
                        <p key={concern} className="text-sm leading-7 text-amber-900">
                          {concern}
                        </p>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
