import { DECISION_VISITOR_QUERY_PARAM, normalizeDecisionVisitorId } from '@/lib/decision-visitor'

const MAX_SOURCE_LENGTH = 80
const PARTNERBOOST_HOSTS = new Set(['pboost.me', 'app.partnerboost.com'])
const MERCHANT_CONTEXT_QUERY_PARAMS = {
  pageType: 'pageType',
  purchaseDecisionState: 'pdState',
  priceStatus: 'priceStatus',
  evidenceCount: 'evidenceCount',
  ctaVariant: 'ctaVariant'
} as const

export interface MerchantExitContext {
  pageType?: string | null
  purchaseDecisionState?: string | null
  priceStatus?: string | null
  evidenceCount?: number | string | null
  ctaVariant?: string | null
}

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

export function normalizeMerchantExitContext(context?: MerchantExitContext | Record<string, unknown> | null): MerchantExitContext | null {
  if (!context) return null
  const normalized: MerchantExitContext = {}
  if (context.pageType) normalized.pageType = normalizeMerchantSource(String(context.pageType))
  if (context.purchaseDecisionState) normalized.purchaseDecisionState = normalizeMerchantSource(String(context.purchaseDecisionState))
  if (context.priceStatus) normalized.priceStatus = normalizeMerchantSource(String(context.priceStatus))
  if (context.ctaVariant) normalized.ctaVariant = normalizeMerchantSource(String(context.ctaVariant))
  const evidenceCount = Number(context.evidenceCount)
  if (Number.isFinite(evidenceCount) && evidenceCount >= 0) {
    normalized.evidenceCount = Math.round(evidenceCount)
  }
  return Object.keys(normalized).length ? normalized : null
}

export function buildMerchantExitPath(
  productId: number,
  source: string,
  visitorId?: string | null,
  offerId?: number | null,
  context?: MerchantExitContext | null
) {
  const params = new URLSearchParams({ source: normalizeMerchantSource(source) })
  const normalizedVisitorId = normalizeDecisionVisitorId(visitorId)
  if (normalizedVisitorId) {
    params.set(DECISION_VISITOR_QUERY_PARAM, normalizedVisitorId)
  }
  if (Number.isInteger(offerId) && Number(offerId) > 0) {
    params.set('offerId', String(offerId))
  }
  const normalizedContext = normalizeMerchantExitContext(context)
  if (normalizedContext?.pageType) params.set(MERCHANT_CONTEXT_QUERY_PARAMS.pageType, normalizedContext.pageType)
  if (normalizedContext?.purchaseDecisionState) params.set(MERCHANT_CONTEXT_QUERY_PARAMS.purchaseDecisionState, normalizedContext.purchaseDecisionState)
  if (normalizedContext?.priceStatus) params.set(MERCHANT_CONTEXT_QUERY_PARAMS.priceStatus, normalizedContext.priceStatus)
  if (normalizedContext?.ctaVariant) params.set(MERCHANT_CONTEXT_QUERY_PARAMS.ctaVariant, normalizedContext.ctaVariant)
  if (normalizedContext?.evidenceCount != null) {
    params.set(MERCHANT_CONTEXT_QUERY_PARAMS.evidenceCount, String(normalizedContext.evidenceCount))
  }
  return `/go/${productId}?${params.toString()}`
}

export function getMerchantExitContextFromSearchParams(searchParams: URLSearchParams): MerchantExitContext | null {
  return normalizeMerchantExitContext({
    pageType: searchParams.get(MERCHANT_CONTEXT_QUERY_PARAMS.pageType),
    purchaseDecisionState: searchParams.get(MERCHANT_CONTEXT_QUERY_PARAMS.purchaseDecisionState),
    priceStatus: searchParams.get(MERCHANT_CONTEXT_QUERY_PARAMS.priceStatus),
    evidenceCount: searchParams.get(MERCHANT_CONTEXT_QUERY_PARAMS.evidenceCount),
    ctaVariant: searchParams.get(MERCHANT_CONTEXT_QUERY_PARAMS.ctaVariant)
  })
}

export function formatMerchantSource(source: string | null | undefined) {
  return source ? source.replace(/[-_]/g, ' ') : 'unknown surface'
}
