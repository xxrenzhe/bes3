'use client'

import { useEffect } from 'react'
import { trackDecisionEvent } from '@/lib/decision-tracking'
import type { PurchaseDecision } from '@/lib/purchase-decision'

export function PurchaseDecisionTracker({ decision }: { decision: PurchaseDecision }) {
  useEffect(() => {
    trackDecisionEvent({
      eventType: 'purchase_decision_view',
      source: decision.trackingSource,
      productId: decision.productId,
      metadata: decision.metadata
    })
  }, [decision])

  return null
}
