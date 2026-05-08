'use client'

import Link from 'next/link'
import { trackDecisionEvent } from '@/lib/decision-tracking'
import type { PurchaseDecision } from '@/lib/purchase-decision'

export function PurchaseDecisionActionLink({
  decision,
  className
}: {
  decision: PurchaseDecision
  className: string
}) {
  if (!decision.primaryActionHref) {
    return (
      <div
        aria-disabled="true"
        className="inline-flex min-h-[52px] items-center justify-center rounded-full bg-white/80 px-6 py-3 text-sm font-semibold text-muted-foreground"
      >
        {decision.primaryActionLabel}
      </div>
    )
  }

  return (
    <Link
      href={decision.primaryActionHref}
      className={className}
      onClick={() => {
        trackDecisionEvent({
          eventType: 'purchase_decision_cta_click',
          source: decision.trackingSource,
          productId: decision.productId,
          metadata: decision.metadata
        })
      }}
    >
      {decision.primaryActionLabel}
    </Link>
  )
}
