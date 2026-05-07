import { HARDCORE_CATEGORIES } from '@/lib/hardcore-catalog'
import type { EvidenceReport, HardcoreProduct } from '@/lib/hardcore'

export const COMMERCIAL_FOCUS_CATEGORY_SLUGS = [
  'yard-pool-automation',
  'power-stations',
  'smart-pet-gear'
] as const

export const PSEO_INDEX_QUALITY_GATE = {
  minEligibleProducts: 3,
  minTotalEvidenceReports: 3,
  minUniqueSources: 3,
  requireAffiliatePath: true,
  requirePriceContext: true
} as const

export type CommercialFocusCategorySlug = typeof COMMERCIAL_FOCUS_CATEGORY_SLUGS[number]

export interface ScenarioIndexEligibility {
  indexable: boolean
  metrics: {
    eligibleProducts: number
    totalEvidenceReports: number
    uniqueSources: number
    productsWithAffiliatePath: number
    productsWithPriceContext: number
  }
  reasons: string[]
}

export interface ProductSchemaEligibilityInput {
  ratingValue?: number | null
  reviewCount?: number | null
  offerUrl?: string | null
  price?: number | null
}

export interface ProductSchemaEligibility {
  includeAggregateRating: boolean
  includeOffer: boolean
}

export interface CommissionAuditCandidate {
  affiliateProductId: number
  productName: string
  categorySlug: string | null
  asin: string | null
  promoLink: string | null
  shortPromoLink?: string | null
  priceAmount: number | null
  commissionRate: number | null
  expectedCommissionValue: number | null
  reviewCount: number | null
  rating: number | null
  dataFreshnessDays: number | null
  youtubeMatchTerms: string[]
  evidenceCount: number
  videoCount: number
  merchantClicks: number
  reviewValueScore: number
}

export interface CommissionBlindAuditItem {
  affiliateProductId: number
  productName: string
  reviewValueScore: number
  commissionBlindScore: number
  commissionInfluenceDelta: number
  reviewValueRank: number
  commissionBlindRank: number
  rankDelta: number
  flagged: boolean
}

export interface CommissionBlindAudit {
  flaggedCount: number
  maxCommissionInfluenceDelta: number
  topInfluence: CommissionBlindAuditItem[]
  items: CommissionBlindAuditItem[]
}

export function getCommercialFocusCategorySlugs() {
  return [...COMMERCIAL_FOCUS_CATEGORY_SLUGS]
}

export function getCommercialFocusCategories() {
  const slugs = new Set(COMMERCIAL_FOCUS_CATEGORY_SLUGS)
  return HARDCORE_CATEGORIES.filter((category) => slugs.has(category.slug as CommercialFocusCategorySlug))
}

export function isCommercialFocusCategory(categorySlug: string | null | undefined) {
  return COMMERCIAL_FOCUS_CATEGORY_SLUGS.includes(String(categorySlug || '') as CommercialFocusCategorySlug)
}

function hasWorkingAffiliatePath(product: HardcoreProduct) {
  return Boolean(product.affiliateUrl && product.affiliateStatus !== 'broken' && product.affiliateStatus !== 'out_of_stock')
}

function hasPriceContext(product: HardcoreProduct) {
  return product.price.currentPrice != null && (product.price.histLowPrice != null || product.price.avg90dPrice != null)
}

function hasUsableEvidence(report: EvidenceReport) {
  return Boolean(report.evidenceQuote.trim() && report.timestampSeconds != null && report.channelName.trim())
}

export function getScenarioIndexEligibility(status: string | null | undefined, products: HardcoreProduct[]): ScenarioIndexEligibility {
  const usableEvidence = products.flatMap((product) => product.evidence.filter(hasUsableEvidence))
  const eligibleProducts = products.filter((product) =>
    product.consensus.evidenceCount > 0 &&
    hasWorkingAffiliatePath(product) &&
    hasPriceContext(product)
  )
  const uniqueSources = new Set(usableEvidence.map((report) => report.channelName.toLowerCase())).size
  const metrics = {
    eligibleProducts: eligibleProducts.length,
    totalEvidenceReports: usableEvidence.length,
    uniqueSources,
    productsWithAffiliatePath: products.filter(hasWorkingAffiliatePath).length,
    productsWithPriceContext: products.filter(hasPriceContext).length
  }
  const reasons: string[] = []

  if (status !== 'live') reasons.push('page_status_not_live')
  if (metrics.eligibleProducts < PSEO_INDEX_QUALITY_GATE.minEligibleProducts) reasons.push('not_enough_eligible_products')
  if (metrics.totalEvidenceReports < PSEO_INDEX_QUALITY_GATE.minTotalEvidenceReports) reasons.push('not_enough_timestamped_evidence')
  if (metrics.uniqueSources < PSEO_INDEX_QUALITY_GATE.minUniqueSources) reasons.push('not_enough_independent_sources')
  if (metrics.productsWithAffiliatePath < PSEO_INDEX_QUALITY_GATE.minEligibleProducts) reasons.push('not_enough_commercially_actionable_products')
  if (metrics.productsWithPriceContext < PSEO_INDEX_QUALITY_GATE.minEligibleProducts) reasons.push('not_enough_price_context')

  return {
    indexable: reasons.length === 0,
    metrics,
    reasons
  }
}

export function getProductSchemaEligibility(input: ProductSchemaEligibilityInput): ProductSchemaEligibility {
  const ratingValue = Number(input.ratingValue)
  const reviewCount = Number(input.reviewCount)
  const price = Number(input.price)

  return {
    includeAggregateRating: Number.isFinite(ratingValue) && ratingValue >= 1 && ratingValue <= 5 && Number.isFinite(reviewCount) && reviewCount >= 1,
    includeOffer: Boolean(input.offerUrl && Number.isFinite(price) && price > 0)
  }
}

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)))
}

export function scoreCommissionBlindCandidate(candidate: CommissionAuditCandidate) {
  let score = 0

  if (isCommercialFocusCategory(candidate.categorySlug)) score += 10
  if (candidate.categorySlug) score += 18
  if (candidate.promoLink || candidate.shortPromoLink) score += 12
  if (candidate.asin) score += 12
  if (candidate.youtubeMatchTerms.length) score += Math.min(12, candidate.youtubeMatchTerms.length * 2)
  if (Number(candidate.priceAmount || 0) >= 80) score += Math.min(10, Number(candidate.priceAmount || 0) / 100)
  if (Number(candidate.reviewCount || 0) >= 20) score += Math.min(8, Math.log10(Number(candidate.reviewCount || 0)) * 3)
  if (Number(candidate.rating || 0) >= 3.8) score += Math.min(6, Number(candidate.rating || 0))
  if (candidate.evidenceCount > 0) score += Math.min(10, candidate.evidenceCount * 2)
  if (candidate.videoCount > 0) score += Math.min(8, candidate.videoCount * 2)
  if (candidate.merchantClicks > 0) score += Math.min(6, candidate.merchantClicks)
  if (candidate.dataFreshnessDays != null && candidate.dataFreshnessDays <= 7) score += 4
  if (candidate.dataFreshnessDays != null && candidate.dataFreshnessDays > 30) score -= 8

  return clampScore(score)
}

export function auditCommissionBlindCandidateOrder(candidates: CommissionAuditCandidate[]): CommissionBlindAudit {
  const blindScores = new Map(candidates.map((candidate) => [candidate.affiliateProductId, scoreCommissionBlindCandidate(candidate)]))
  const blindRanks = new Map(
    [...candidates]
      .sort((left, right) => (blindScores.get(right.affiliateProductId) || 0) - (blindScores.get(left.affiliateProductId) || 0))
      .map((candidate, index) => [candidate.affiliateProductId, index + 1])
  )

  const items = candidates.map((candidate, index) => {
    const commissionBlindScore = blindScores.get(candidate.affiliateProductId) || 0
    const reviewValueRank = index + 1
    const commissionBlindRank = blindRanks.get(candidate.affiliateProductId) || reviewValueRank
    const commissionInfluenceDelta = candidate.reviewValueScore - commissionBlindScore
    const rankDelta = commissionBlindRank - reviewValueRank
    return {
      affiliateProductId: candidate.affiliateProductId,
      productName: candidate.productName,
      reviewValueScore: candidate.reviewValueScore,
      commissionBlindScore,
      commissionInfluenceDelta,
      reviewValueRank,
      commissionBlindRank,
      rankDelta,
      flagged: commissionInfluenceDelta >= 18 || rankDelta >= 5
    }
  })

  const topInfluence = [...items]
    .sort((left, right) => right.commissionInfluenceDelta - left.commissionInfluenceDelta || right.rankDelta - left.rankDelta)
    .slice(0, 5)

  return {
    flaggedCount: items.filter((item) => item.flagged).length,
    maxCommissionInfluenceDelta: topInfluence[0]?.commissionInfluenceDelta || 0,
    topInfluence,
    items
  }
}
