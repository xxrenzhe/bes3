import Link from 'next/link'
import { PurchaseDecisionActionLink } from '@/components/commerce/PurchaseDecisionActionLink'
import { PurchaseDecisionTracker } from '@/components/commerce/PurchaseDecisionTracker'
import { PrimaryCta } from '@/components/site/PrimaryCta'
import { StickyMobileCta } from '@/components/site/StickyMobileCta'
import type { PurchaseDecision } from '@/lib/purchase-decision'

const STATE_STYLES: Record<PurchaseDecision['state'], { card: string; badge: string; accent: string; action: string }> = {
  buy_now: {
    card: 'border-emerald-200 bg-emerald-50/70',
    badge: 'bg-emerald-900 text-white',
    accent: 'text-emerald-950',
    action: 'bg-emerald-950 text-white shadow-lg shadow-emerald-950/10'
  },
  compare_first: {
    card: 'border-sky-200 bg-sky-50/70',
    badge: 'bg-sky-900 text-white',
    accent: 'text-sky-950',
    action: 'bg-sky-950 text-white shadow-lg shadow-sky-950/10'
  },
  watch_price: {
    card: 'border-amber-200 bg-amber-50/80',
    badge: 'bg-amber-900 text-white',
    accent: 'text-amber-950',
    action: 'bg-amber-950 text-white shadow-lg shadow-amber-950/10'
  },
  skip: {
    card: 'border-rose-200 bg-rose-50/70',
    badge: 'bg-rose-900 text-white',
    accent: 'text-rose-950',
    action: 'bg-white text-rose-950 ring-1 ring-rose-200'
  },
  researching: {
    card: 'border-slate-200 bg-slate-50',
    badge: 'bg-slate-900 text-white',
    accent: 'text-slate-950',
    action: 'bg-slate-950 text-white shadow-lg shadow-slate-950/10'
  },
  link_unavailable: {
    card: 'border-zinc-200 bg-zinc-50',
    badge: 'bg-zinc-900 text-white',
    accent: 'text-zinc-950',
    action: 'bg-white text-zinc-950 ring-1 ring-zinc-300'
  }
}

function isMerchantHref(href: string | null) {
  return Boolean(href?.startsWith('/go/'))
}

export function PurchaseDecisionCard({
  decision,
  className = '',
  showTracker = true,
  stickyEligible = false
}: {
  decision: PurchaseDecision
  className?: string
  showTracker?: boolean
  stickyEligible?: boolean
}) {
  const styles = STATE_STYLES[decision.state]
  const isPrimaryMerchant = isMerchantHref(decision.primaryActionHref)

  return (
    <section
      aria-labelledby={`purchase-decision-${decision.productId}`}
      className={`rounded-[1.75rem] border p-6 shadow-[0_22px_70px_-45px_rgba(15,23,42,0.55)] ${styles.card} ${className}`}
    >
      {showTracker ? <PurchaseDecisionTracker decision={decision} /> : null}
      <div className="flex flex-wrap items-center gap-3">
        <span className={`rounded-full px-3 py-1 text-xs font-black uppercase tracking-[0.18em] ${styles.badge}`}>
          {decision.stateLabel}
        </span>
        <span className="rounded-full border border-white/80 bg-white/80 px-3 py-1 text-xs font-semibold text-muted-foreground">
          {decision.pageType} decision
        </span>
      </div>
      <h2 id={`purchase-decision-${decision.productId}`} className={`mt-5 font-[var(--font-display)] text-3xl font-black tracking-tight ${styles.accent}`}>
        {decision.headline}
      </h2>
      <p className="mt-3 text-sm leading-7 text-muted-foreground">{decision.summary}</p>

      <div className="mt-5 grid gap-3 rounded-2xl border border-white/80 bg-white/80 p-4 text-sm sm:grid-cols-2">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">Current price</p>
          <p className="mt-1 font-mono text-xl font-black text-foreground">{decision.priceLine}</p>
        </div>
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">Confidence</p>
          <p className="mt-1 font-semibold text-foreground">{decision.confidenceLine}</p>
        </div>
      </div>

      <div className="mt-6">
        {isPrimaryMerchant ? (
          <PrimaryCta
            href={decision.primaryActionHref}
            label={decision.primaryActionLabel}
            productId={decision.productId}
            trackingSource={decision.trackingSource}
            trackingMetadata={decision.metadata}
            note="Bes3 may earn from qualifying purchases at no extra cost to you."
            trustBadge={`${decision.evidenceCount} evidence signal${decision.evidenceCount === 1 ? '' : 's'} checked before this CTA`}
          />
        ) : (
          <PurchaseDecisionActionLink
            decision={decision}
            className={`inline-flex min-h-[52px] items-center justify-center rounded-full px-6 py-3 text-sm font-semibold transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${styles.action}`}
          />
        )}
        {decision.secondaryActionHref ? (
          <Link href={decision.secondaryActionHref} className="ml-3 inline-flex min-h-[44px] items-center text-sm font-semibold text-foreground underline-offset-4 hover:underline">
            {decision.secondaryActionLabel}
          </Link>
        ) : null}
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-muted-foreground">Why this decision</p>
          <ul className="mt-3 space-y-2 text-sm leading-6 text-foreground">
            {decision.proofBullets.map((item) => <li key={item}>{item}</li>)}
          </ul>
        </div>
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-muted-foreground">Risks to check</p>
          <ul className="mt-3 space-y-2 text-sm leading-6 text-muted-foreground">
            {decision.riskBullets.map((item) => <li key={item}>{item}</li>)}
          </ul>
        </div>
      </div>

      <p className="mt-5 border-t border-white/80 pt-4 text-xs leading-6 text-muted-foreground">
        Affiliate disclosure: Bes3 may earn from qualifying purchases. Commission availability never changes the evidence score or recommendation order.
      </p>
      {stickyEligible ? (
        <StickyMobileCta
          href={decision.primaryActionHref}
          label={decision.primaryActionLabel}
          productId={decision.productId}
          trackingSource="mobile-sticky-decision"
          trackingMetadata={{
            ...decision.metadata,
            ctaVariant: `${decision.ctaVariant}-sticky`
          }}
          actionTone={decision.state}
          eyebrow={decision.stateLabel}
          trustBadge={decision.summary}
        />
      ) : null}
    </section>
  )
}
