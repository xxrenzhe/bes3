import { hasMerchantExitTarget, isCommissionableMerchantUrl } from '@/lib/merchant-links'
import type { EntryStatus, HardcoreProduct } from '@/lib/hardcore'
import type { CommerceProductRecord } from '@/lib/site-data'

export type DecisionReadinessState = 'buy-ready' | 'research-ready' | 'watch-price' | 'not-ready'
export type DecisionPrimaryAction = 'merchant_handoff' | 'start_price_watch' | 'compare_alternatives' | 'continue_research'

export interface DecisionReadinessSignal {
  state: DecisionReadinessState
  score: number
  label: string
  primaryAction: DecisionPrimaryAction
  summary: string
  reasons: string[]
  blockers: string[]
}

type CommerceReadinessInput = Pick<
  CommerceProductRecord,
  | 'bestOffer'
  | 'dataConfidenceScore'
  | 'evidenceCount'
  | 'freshness'
  | 'offerCount'
  | 'priceAmount'
  | 'reviewCount'
  | 'sourceAffiliateLink'
  | 'resolvedUrl'
>

type EvidenceReadinessInput = Pick<HardcoreProduct, 'affiliateUrl' | 'affiliateStatus' | 'consensus' | 'price'>

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)))
}

function hasUsableHardcoreExit(product: EvidenceReadinessInput) {
  return Boolean(
    isCommissionableMerchantUrl(product.affiliateUrl) &&
    product.affiliateStatus !== 'out_of_stock' &&
    product.affiliateStatus !== 'broken'
  )
}

function priceScoreForEntryStatus(status: EntryStatus) {
  switch (status) {
    case 'best-deal':
      return 20
    case 'great-value':
      return 16
    case 'normal':
      return 10
    case 'overpriced':
      return -8
    default:
      return 0
  }
}

export function buildCommerceDecisionReadiness(product: CommerceReadinessInput): DecisionReadinessSignal {
  const hasMerchantHandoff = hasMerchantExitTarget(product)
  const hasOffer = Boolean(product.bestOffer || product.offerCount > 0)
  const hasPrice = Boolean(product.bestOffer?.priceAmount || product.priceAmount)
  const confidence = Math.max(0, Math.min(1, Number(product.dataConfidenceScore || 0)))
  const hasFreshOffer = product.freshness === 'fresh' || product.freshness === 'recent'
  const hasBuyerSignal = Number(product.reviewCount || 0) > 0

  const reasons: string[] = []
  const blockers: string[] = []
  let score = 0

  if (hasMerchantHandoff) {
    score += 35
    reasons.push('Verified store link is available.')
  } else {
    blockers.push('No verified store link is attached.')
  }

  if (hasOffer) {
    score += 16
    reasons.push('At least one current offer is attached.')
  } else {
    blockers.push('No active offer is attached.')
  }

  if (hasPrice) {
    score += 12
    reasons.push('Current price is visible before the merchant click.')
  } else {
    blockers.push('Current price is not available yet.')
  }

  if (confidence >= 0.55) {
    score += 16
    reasons.push('Product details are complete enough for a shopping handoff.')
  } else if (confidence >= 0.35) {
    score += 8
    reasons.push('Product data has partial confidence and should be checked before checkout.')
  } else {
    blockers.push('Product data confidence is still thin.')
  }

  if (hasFreshOffer) {
    score += 12
    reasons.push('Offer freshness is recent.')
  } else {
    blockers.push('Offer freshness is stale or unknown.')
  }

  if (hasBuyerSignal) {
    score += 9
    reasons.push('Buyer rating or review count is available.')
  }

  const safeScore = clampScore(score)
  if (hasMerchantHandoff && hasOffer && hasPrice && confidence >= 0.55) {
    return {
      state: 'buy-ready',
      score: safeScore,
      label: 'Buy-ready',
      primaryAction: 'merchant_handoff',
    summary: 'The product has a verified store link, visible price context, and enough detail to support a checkout check.',
      reasons,
      blockers
    }
  }

  if (hasPrice && !hasMerchantHandoff) {
    return {
      state: 'watch-price',
      score: safeScore,
      label: 'Watch price',
      primaryAction: 'start_price_watch',
      summary: 'Use this page for price monitoring or comparison, but do not leave for a store until the link is verified.',
      reasons,
      blockers
    }
  }

  return {
    state: hasOffer || confidence >= 0.35 ? 'research-ready' : 'not-ready',
    score: safeScore,
    label: hasOffer || confidence >= 0.35 ? 'Research-ready' : 'Not ready',
    primaryAction: hasOffer || confidence >= 0.35 ? 'compare_alternatives' : 'continue_research',
    summary: hasOffer || confidence >= 0.35
      ? 'The product can help shortlist or compare, but it should not be treated as a direct buy recommendation yet.'
      : 'The product needs more offer, price, and review proof before it should influence a buy.',
    reasons,
    blockers
  }
}

export function buildEvidenceDecisionReadiness(product: EvidenceReadinessInput): DecisionReadinessSignal {
  const hasMerchantHandoff = hasUsableHardcoreExit(product)
  const evidenceCount = Number(product.consensus.evidenceCount || 0)
  const score10 = Number(product.consensus.score10 || 0)
  const hasEvidence = evidenceCount > 0
  const reasons: string[] = []
  const blockers: string[] = []
  let score = 0

  if (hasMerchantHandoff) {
    score += 35
    reasons.push('Verified store link is available.')
  } else {
    blockers.push('No verified store link is attached.')
  }

  if (hasEvidence) {
    score += Math.min(25, 10 + evidenceCount * 8)
    reasons.push(`${evidenceCount} usable review report${evidenceCount === 1 ? '' : 's'} cleared validation.`)
  } else {
    blockers.push('No usable review report has cleared validation.')
  }

  if (score10 >= 8) {
    score += 20
    reasons.push('Evidence score is strong enough to support a positive shortlist position.')
  } else if (score10 >= 6) {
    score += 12
    reasons.push('Evidence score is usable but should be compared against alternatives.')
  } else {
    blockers.push('Evidence score is not strong enough for a confident recommendation.')
  }

  score += priceScoreForEntryStatus(product.price.entryStatus)
  if (product.price.currentPrice != null) {
    reasons.push('Current price context is visible.')
  } else {
    blockers.push('Current price is not available yet.')
  }
  if (product.price.entryStatus === 'overpriced') {
    blockers.push('Price-value status suggests waiting before purchase.')
  }

  const safeScore = clampScore(score)
  if (hasMerchantHandoff && hasEvidence && score10 >= 7 && product.price.entryStatus !== 'overpriced') {
    return {
      state: 'buy-ready',
      score: safeScore,
      label: 'Buy-ready',
      primaryAction: 'merchant_handoff',
    summary: 'Review proof and price context are strong enough to support a checkout check through Bes3.',
      reasons,
      blockers
    }
  }

  if (hasEvidence) {
    return {
      state: product.price.entryStatus === 'overpriced' ? 'watch-price' : 'research-ready',
      score: safeScore,
      label: product.price.entryStatus === 'overpriced' ? 'Watch price' : 'Research-ready',
      primaryAction: product.price.entryStatus === 'overpriced' ? 'start_price_watch' : 'compare_alternatives',
      summary: hasMerchantHandoff
        ? 'Evidence is useful, but the buyer should compare fit or wait for price conditions before acting.'
        : 'Review proof is useful, but Bes3 should not send buyers to a store until a real link is verified.',
      reasons,
      blockers
    }
  }

  return {
    state: 'not-ready',
    score: safeScore,
    label: 'Not ready',
    primaryAction: 'continue_research',
    summary: 'The product should stay in research until review proof and store-link checks improve.',
    reasons,
    blockers
  }
}
