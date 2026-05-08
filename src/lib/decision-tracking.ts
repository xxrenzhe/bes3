import { type DecisionEventType } from '@/lib/decision-event-types'
import { buildMerchantExitPath, normalizeMerchantSource, type MerchantExitContext } from '@/lib/merchant-links'

const DECISION_VISITOR_ID_KEY = 'bes3-decision-visitor-id'

let cachedVisitorId: string | null = null

function buildVisitorId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  return `bes3-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

export function getDecisionVisitorId() {
  if (typeof window === 'undefined') return null
  if (cachedVisitorId) return cachedVisitorId

  try {
    const existing = window.localStorage.getItem(DECISION_VISITOR_ID_KEY)
    if (existing) {
      cachedVisitorId = existing
      return existing
    }

    const nextId = buildVisitorId()
    window.localStorage.setItem(DECISION_VISITOR_ID_KEY, nextId)
    cachedVisitorId = nextId
    return nextId
  } catch {
    return null
  }
}

export function buildTrackedMerchantExitPath(productId: number, source: string, offerId?: number | null, context?: MerchantExitContext | null) {
  return buildMerchantExitPath(productId, source, getDecisionVisitorId(), offerId, context)
}

export function trackDecisionEvent({
  eventType,
  source = 'site',
  productId,
  metadata
}: {
  eventType: DecisionEventType
  source?: string
  productId?: number | null
  metadata?: Record<string, unknown>
}) {
  if (typeof window === 'undefined') return

  const visitorId = getDecisionVisitorId()
  if (!visitorId) return

  const payload = JSON.stringify({
    visitorId,
    eventType,
    source: normalizeMerchantSource(source),
    productId: Number.isInteger(productId) && Number(productId) > 0 ? Number(productId) : undefined,
    metadata
  })
  const shouldConfirmDelivery = eventType === 'purchase_decision_view'

  if (shouldConfirmDelivery) {
    void fetch('/api/decision-events', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: payload,
      keepalive: true
    }).catch(() => undefined)
    return
  }

  if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
    const succeeded = navigator.sendBeacon(
      '/api/decision-events',
      new Blob([payload], { type: 'application/json' })
    )
    if (succeeded) return
  }

  void fetch('/api/decision-events', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: payload,
    keepalive: true
  }).catch(() => undefined)
}
