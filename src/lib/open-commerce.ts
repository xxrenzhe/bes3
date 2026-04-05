import { buildBestFor, buildConfidenceSignals, buildNotFor, getFreshnessLabel } from '@/lib/editorial'
import { normalizeMerchantSource, buildMerchantExitPath } from '@/lib/merchant-links'
import type {
  ArticleRecord,
  BrandPolicyRecord,
  CommerceProductRecord,
  CompatibilityFactRecord,
  ProductAttributeFactRecord,
  ProductOfferRecord,
  ProductPriceHistoryRecord
} from '@/lib/site-data'
import { toAbsoluteUrl } from '@/lib/site-url'

export const COMMERCE_PROTOCOL_VERSION = 'commerce.v2'
const MAX_ALTERNATIVE_OFFERS = 3
const MAX_EVIDENCE_FACTS = 6
const MAX_PRICE_HISTORY_POINTS = 12

export interface CommerceAction {
  type: string
  label: string
  href: string
  method: 'GET' | 'POST'
  description: string
}

export interface CommerceDisclaimer {
  type: string
  message: string
}

export function summarizePriceHistory(priceHistory: ProductPriceHistoryRecord[], fallbackCurrency?: string | null) {
  if (!priceHistory.length) return null

  const points = [...priceHistory]
    .filter((point) => point.capturedAt)
    .sort((left, right) => Date.parse(left.capturedAt || '') - Date.parse(right.capturedAt || ''))

  if (!points.length) return null

  const pricedPoints = points.filter((point) => typeof point.priceAmount === 'number')
  const current = pricedPoints[pricedPoints.length - 1] || null
  const previous = pricedPoints.length > 1 ? pricedPoints[pricedPoints.length - 2] : null
  const lowest = pricedPoints.reduce<ProductPriceHistoryRecord | null>((best, point) => {
    if (!best) return point
    return Number(point.priceAmount) < Number(best.priceAmount) ? point : best
  }, null)
  const highest = pricedPoints.reduce<ProductPriceHistoryRecord | null>((best, point) => {
    if (!best) return point
    return Number(point.priceAmount) > Number(best.priceAmount) ? point : best
  }, null)

  return {
    totalPoints: points.length,
    latestCapturedAt: points[points.length - 1]?.capturedAt || null,
    currency: current?.priceCurrency || lowest?.priceCurrency || highest?.priceCurrency || fallbackCurrency || null,
    currentPrice: current?.priceAmount ?? null,
    previousPrice: previous?.priceAmount ?? null,
    deltaFromPrevious: current && previous ? Number(current.priceAmount) - Number(previous.priceAmount) : null,
    lowestPrice: lowest?.priceAmount ?? null,
    highestPrice: highest?.priceAmount ?? null
  }
}

function buildProductPath(product: CommerceProductRecord) {
  return product.slug ? `/products/${product.slug}` : null
}

function getCategoryPath(category: string | null | undefined) {
  return category ? `/categories/${category}` : '/directory'
}

function getAlertPath(product: CommerceProductRecord) {
  const params = new URLSearchParams({
    intent: 'price-alert',
    cadence: 'priority'
  })
  if (product.category) {
    params.set('category', product.category)
  }
  return `/newsletter?${params.toString()}`
}

export function buildCommerceActions(product: CommerceProductRecord, options?: {
  source?: string | null
  visitorId?: string | null
}): CommerceAction[] {
  const source = normalizeMerchantSource(options?.source || 'open-commerce')
  const actions: CommerceAction[] = []
  const productPath = buildProductPath(product)

  if (productPath) {
    actions.push({
      type: 'view_product',
      label: 'Open product detail',
      href: toAbsoluteUrl(productPath),
      method: 'GET',
      description: 'Open the Bes3 product page with the current recommendation context.'
    })
  }

  if (product.resolvedUrl) {
    actions.push({
      type: 'merchant_handoff',
      label: 'Check current price',
      href: toAbsoluteUrl(buildMerchantExitPath(product.id, source, options?.visitorId)),
      method: 'GET',
      description: 'Send the buyer to the merchant handoff page for live price and stock confirmation.'
    })
  }

  actions.push({
    type: 'start_alert',
    label: 'Start price alert',
    href: toAbsoluteUrl(getAlertPath(product)),
    method: 'GET',
    description: 'Open the Bes3 alert flow instead of forcing a buy decision now.'
  })

  actions.push({
    type: 'browse_category',
    label: 'Browse category',
    href: toAbsoluteUrl(getCategoryPath(product.category)),
    method: 'GET',
    description: 'Return to the nearby category coverage when the shortlist is not final yet.'
  })

  return actions
}

export function buildCommerceDisclaimers(product?: CommerceProductRecord | null): CommerceDisclaimer[] {
  const freshnessMessage = product
    ? `Live offer freshness: ${getFreshnessLabel(product.offerLastCheckedAt || product.priceLastCheckedAt || product.updatedAt)}.`
    : 'Live offer freshness can vary by merchant and may change after the last Bes3 check.'

  return [
    {
      type: 'affiliate',
      message: 'Bes3 recommendations may include affiliate handoff links, but recommendations should still be validated against fit and current merchant details.'
    },
    {
      type: 'freshness',
      message: freshnessMessage
    },
    {
      type: 'final-verification',
      message: 'Use the merchant page as the final source of truth for live price, coupon eligibility, shipping, and stock status.'
    }
  ]
}

export function serializeBrandKnowledge(brandName: string, policy: BrandPolicyRecord | null, compatibilityFacts: CompatibilityFactRecord[]) {
  if (!policy && !compatibilityFacts.length) return null

  return {
    brandName,
    policy: policy
      ? {
          shippingPolicy: policy.shippingPolicy,
          returnPolicy: policy.returnPolicy,
          warrantyPolicy: policy.warrantyPolicy,
          discountWindow: policy.discountWindow,
          supportPolicy: policy.supportPolicy,
          confidence: policy.confidenceScore,
          sourceType: policy.sourceType,
          sourceUrl: policy.sourceUrl,
          lastVerifiedAt: policy.lastVerifiedAt
        }
      : null,
    compatibilityFacts: compatibilityFacts.map((fact) => ({
      category: fact.category,
      factType: fact.factType,
      factLabel: fact.factLabel,
      factValue: fact.factValue,
      confidence: fact.confidenceScore,
      isVerified: fact.isVerified,
      sourceType: fact.sourceType,
      sourceUrl: fact.sourceUrl,
      lastCheckedAt: fact.lastCheckedAt
    }))
  }
}

function dedupeAlternativeOffers(bestOffer: ProductOfferRecord | null, offers: ProductOfferRecord[]) {
  return offers
    .filter((offer) => !bestOffer || offer.id !== bestOffer.id)
    .slice(0, MAX_ALTERNATIVE_OFFERS)
}

export function serializeCommerceProduct(
  product: CommerceProductRecord,
  options?: {
    offers?: ProductOfferRecord[]
    attributeFacts?: ProductAttributeFactRecord[]
    priceHistory?: ProductPriceHistoryRecord[]
    brandPolicy?: BrandPolicyRecord | null
    compatibilityFacts?: CompatibilityFactRecord[]
    source?: string | null
    visitorId?: string | null
  }
) {
  const offers = options?.offers || []
  const attributeFacts = options?.attributeFacts || []
  const priceHistory = options?.priceHistory || []
  const path = buildProductPath(product)
  const bestOffer = product.bestOffer || offers[0] || null
  const alternativeOffers = dedupeAlternativeOffers(bestOffer, offers)
  const fitSummary = buildBestFor(product, 'product')
  const notForSummary = buildNotFor(product, 'product')
  const priceHistorySummary = summarizePriceHistory(priceHistory, bestOffer?.priceCurrency || product.priceCurrency)

  return {
    entity: {
      type: 'product',
      id: product.id,
      slug: product.slug,
      brand: product.brand,
      productName: product.productName,
      category: product.category,
      description: product.description,
      heroImageUrl: product.heroImageUrl,
      path,
      absoluteUrl: path ? toAbsoluteUrl(path) : null
    },
    attributes: attributeFacts.map((fact) => ({
      key: fact.attributeKey,
      label: fact.attributeLabel,
      value: fact.attributeValue,
      isVerified: fact.isVerified,
      confidence: fact.confidenceScore,
      sourceType: fact.sourceType,
      sourceUrl: fact.sourceUrl,
      lastCheckedAt: fact.lastCheckedAt
    })),
    decisionSummaries: {
      fitSummary,
      notForSummary,
      confidence: product.dataConfidenceScore,
      confidenceSignals: buildConfidenceSignals(product),
      freshness: product.freshness
    },
    bestOffer,
    alternativeOffers,
    fitSummary,
    notForSummary,
    evidence: {
      offerCount: product.offerCount,
      evidenceCount: product.evidenceCount,
      sourceCount: product.sourceCount,
      attributeCompletenessScore: product.attributeCompletenessScore,
      dataConfidenceScore: product.dataConfidenceScore,
      freshness: product.freshness,
      freshnessLabel: getFreshnessLabel(product.offerLastCheckedAt || product.priceLastCheckedAt || product.updatedAt),
      priceLastCheckedAt: product.priceLastCheckedAt,
      offerLastCheckedAt: product.offerLastCheckedAt,
      priceHistorySummary,
      priceHistory: priceHistory.slice(0, MAX_PRICE_HISTORY_POINTS),
      facts: attributeFacts.slice(0, MAX_EVIDENCE_FACTS),
      offers: offers.slice(0, MAX_ALTERNATIVE_OFFERS + 1)
    },
    actions: buildCommerceActions(product, {
      source: options?.source,
      visitorId: options?.visitorId
    }),
    brandKnowledge: serializeBrandKnowledge(product.brand || product.productName, options?.brandPolicy || null, options?.compatibilityFacts || []),
    disclaimers: buildCommerceDisclaimers(product)
  }
}

function getArticlePath(article: ArticleRecord) {
  switch (article.type) {
    case 'review':
      return `/reviews/${article.slug}`
    case 'comparison':
      return `/compare/${article.slug}`
    default:
      return `/guides/${article.slug}`
  }
}

export function serializeCommerceArticle(article: ArticleRecord) {
  const path = getArticlePath(article)

  return {
    entity: {
      type: article.type,
      id: article.id,
      slug: article.slug,
      title: article.title,
      summary: article.summary,
      keyword: article.keyword,
      productId: article.productId,
      productName: article.product?.productName || null,
      category: article.product?.category || null,
      heroImageUrl: article.heroImageUrl || article.product?.heroImageUrl || null,
      path,
      absoluteUrl: toAbsoluteUrl(path)
    },
    decisionSummaries: {
      fitSummary: article.product ? buildBestFor(article.product, article.type === 'comparison' ? 'comparison' : 'review') : null,
      notForSummary: article.product ? buildNotFor(article.product, article.type === 'comparison' ? 'comparison' : 'review') : null
    },
    actions: [
      {
        type: 'open_editorial',
        label: 'Open editorial page',
        href: toAbsoluteUrl(path),
        method: 'GET' as const,
        description: 'Open the Bes3 editorial page that explains the recommendation in full.'
      }
    ],
    disclaimers: buildCommerceDisclaimers()
  }
}

function getFreshnessRank(value: CommerceProductRecord['freshness']) {
  switch (value) {
    case 'fresh':
      return 3
    case 'recent':
      return 2
    case 'stale':
      return 1
    default:
      return 0
  }
}

function getComparablePrice(product: CommerceProductRecord) {
  return product.bestOffer?.priceAmount ?? product.priceAmount ?? Number.POSITIVE_INFINITY
}

export function compareCommerceProducts(left: CommerceProductRecord, right: CommerceProductRecord) {
  if (right.dataConfidenceScore !== left.dataConfidenceScore) {
    return right.dataConfidenceScore - left.dataConfidenceScore
  }

  const freshnessDelta = getFreshnessRank(right.freshness) - getFreshnessRank(left.freshness)
  if (freshnessDelta !== 0) return freshnessDelta

  if ((right.rating || 0) !== (left.rating || 0)) {
    return (right.rating || 0) - (left.rating || 0)
  }

  if ((right.reviewCount || 0) !== (left.reviewCount || 0)) {
    return (right.reviewCount || 0) - (left.reviewCount || 0)
  }

  return getComparablePrice(left) - getComparablePrice(right)
}

export function buildComparisonReason(winner: CommerceProductRecord, runnerUp?: CommerceProductRecord | null) {
  if (!runnerUp) return 'Only one qualified product was available, so Bes3 returned the strongest current candidate.'

  if (winner.dataConfidenceScore !== runnerUp.dataConfidenceScore) {
    return 'The lead product has stronger evidence confidence across offers and verified facts.'
  }

  if (winner.freshness !== runnerUp.freshness) {
    return 'The lead product has more recent live-offer checks, making the decision less stale.'
  }

  if ((winner.rating || 0) !== (runnerUp.rating || 0)) {
    return 'The lead product has the stronger buyer-rating signal among the compared options.'
  }

  if ((winner.reviewCount || 0) !== (runnerUp.reviewCount || 0)) {
    return 'The lead product has a deeper review base, giving the recommendation broader social proof.'
  }

  return 'The lead product offered the best overall balance of evidence confidence, freshness, and current buyer signal.'
}
