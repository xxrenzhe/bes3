import { DECISION_VISITOR_QUERY_PARAM, normalizeDecisionVisitorId } from '@/lib/decision-visitor'

const MAX_SOURCE_LENGTH = 80
const PARTNERBOOST_HOSTS = new Set(['pboost.me', 'app.partnerboost.com'])

function parseUrl(value: string | null | undefined) {
  if (!value) return null
  try {
    return new URL(value)
  } catch {
    return null
  }
}

export function isCommissionableMerchantUrl(value: string | null | undefined) {
  const url = parseUrl(value)
  if (!url) return false

  const hostname = url.hostname.toLowerCase().replace(/^www\./, '')
  if (PARTNERBOOST_HOSTS.has(hostname)) return true

  if (hostname === 'amazon.com' || hostname.endsWith('.amazon.com')) {
    return Boolean(
      url.searchParams.get('tag') ||
      url.searchParams.get('maas') ||
      url.searchParams.get('ascsubtag') ||
      url.searchParams.get('linkCode')
    )
  }

  return false
}

export function getCommissionableMerchantUrl(...candidates: Array<string | null | undefined>) {
  return candidates.find(isCommissionableMerchantUrl) || null
}

export function hasMerchantExitTarget(
  product:
    | {
        resolvedUrl?: string | null
        sourceAffiliateLink?: string | null
      }
    | null
    | undefined
) {
  return Boolean(product && getCommissionableMerchantUrl(product.sourceAffiliateLink, product.resolvedUrl))
}

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
