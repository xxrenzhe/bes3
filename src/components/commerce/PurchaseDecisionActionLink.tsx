'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { isExternalCtaHref } from '@/lib/cta-link-behavior'
import { buildTrackedMerchantExitPath, trackDecisionEvent } from '@/lib/decision-tracking'
import type { PurchaseDecision } from '@/lib/purchase-decision'

export function PurchaseDecisionActionLink({
  decision,
  className
}: {
  decision: PurchaseDecision
  className: string
}) {
  const [resolvedHref, setResolvedHref] = useState(decision.primaryActionHref)
  const metadataKey = JSON.stringify(decision.metadata || null)
  const opensNewTab = isExternalCtaHref(resolvedHref)

  useEffect(() => {
    if (!decision.primaryActionHref) {
      setResolvedHref(null)
      return
    }

    if (!decision.primaryActionHref.startsWith('/go/')) {
      setResolvedHref(decision.primaryActionHref)
      return
    }

    setResolvedHref(buildTrackedMerchantExitPath(decision.productId, decision.trackingSource, null, decision.metadata))
  }, [decision.primaryActionHref, decision.productId, decision.trackingSource, metadataKey, decision.metadata])

  if (!resolvedHref) {
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
      href={resolvedHref}
      target={opensNewTab ? '_blank' : undefined}
      rel={opensNewTab ? 'noopener noreferrer' : undefined}
      prefetch={false}
      className={className}
      onClick={() => {
        if (resolvedHref.startsWith('/go/')) {
          trackDecisionEvent({
            eventType: 'merchant_cta_click',
            source: decision.trackingSource,
            productId: decision.productId,
            metadata: decision.metadata
          })
          return
        }

        trackDecisionEvent({
          eventType: 'purchase_decision_cta_click',
          source: decision.trackingSource,
          productId: decision.productId,
          metadata: decision.metadata
        })
      }}
    >
      {decision.primaryActionLabel}
      {opensNewTab ? <span aria-hidden="true">↗</span> : null}
    </Link>
  )
}
