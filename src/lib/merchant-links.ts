import { DECISION_VISITOR_QUERY_PARAM, normalizeDecisionVisitorId } from '@/lib/decision-visitor'

const MAX_SOURCE_LENGTH = 80

export function normalizeMerchantSource(source: string | null | undefined) {
  const normalized = String(source || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-|-$/g, '')

  return normalized.slice(0, MAX_SOURCE_LENGTH) || 'site'
}

export function buildMerchantExitPath(productId: number, source: string, visitorId?: string | null, offerId?: number | null) {
  const params = new URLSearchParams({ source: normalizeMerchantSource(source) })
  const normalizedVisitorId = normalizeDecisionVisitorId(visitorId)
  if (normalizedVisitorId) {
    params.set(DECISION_VISITOR_QUERY_PARAM, normalizedVisitorId)
  }
  if (Number.isInteger(offerId) && Number(offerId) > 0) {
    params.set('offerId', String(offerId))
  }
  return `/go/${productId}?${params.toString()}`
}

export function formatMerchantSource(source: string | null | undefined) {
  return source ? source.replace(/[-_]/g, ' ') : 'unknown surface'
}
