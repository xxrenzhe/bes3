import { formatEditorialDate, getFreshnessLabel } from '@/lib/editorial'
import { OFFERS_FRESHNESS_WINDOW_HOURS } from '@/lib/offers'
import { summarizePriceHistoryWindow } from '@/lib/price-insights'
import { listProductPriceHistory, type CommerceProductRecord } from '@/lib/site-data'

export interface ProductFinalist {
  product: CommerceProductRecord
  score: number
  checkedAt: string | null
  freshnessLabel: string
  reason: string
  caution: string
  currentPrice: number | null
  currentCurrency: string
  referencePrice: number | null
  referenceCurrency: string | null
  savingsAmount: number | null
  savingsPercent: number | null
  distanceFromTrackedLowPercent: number | null
  merchantName: string | null
  shippingCost: number | null
  hasVerifiedDiscount: boolean
}

function toTimestamp(value: string | null | undefined) {
  if (!value) return Number.NEGATIVE_INFINITY
  const parsed = Date.parse(value)
  return Number.isFinite(parsed) ? parsed : Number.NEGATIVE_INFINITY
}

function getCheckedAt(product: CommerceProductRecord) {
  return product.bestOffer?.lastCheckedAt || product.offerLastCheckedAt || product.priceLastCheckedAt || product.updatedAt || product.publishedAt || null
}

function getProofScore(product: CommerceProductRecord) {
  const rating = product.rating || 0
  const reviewCount = product.reviewCount || 0

  if (rating >= 4.4 && reviewCount >= 1000) return 28
  if (rating >= 4.2 && reviewCount >= 250) return 22
  if (rating >= 4.0 || reviewCount >= 200) return 16
  if (rating > 0 || reviewCount > 0) return 10
  return 0
}

function getFreshnessScore(product: CommerceProductRecord) {
  const checkedAt = getCheckedAt(product)
  const ageMs = Date.now() - toTimestamp(checkedAt)
  if (!Number.isFinite(ageMs) || ageMs < 0) return 0

  const ageDays = ageMs / 86_400_000
  if (ageDays <= 7) return 18
  if (ageDays <= 30) return 12
  if (ageDays <= 60) return 6
  return 0
}

function getValueScore(product: CommerceProductRecord) {
  const effectivePrice = product.bestOffer?.priceAmount ?? product.priceAmount

  if (typeof effectivePrice !== 'number' || !Number.isFinite(effectivePrice) || effectivePrice <= 0) {
    return 0
  }
  if (effectivePrice <= 150) return 12
  if (effectivePrice <= 400) return 8
  if (effectivePrice <= 900) return 4
  return 2
}

function buildReason(product: CommerceProductRecord, finalist: {
  savingsPercent: number | null
  distanceFromTrackedLowPercent: number | null
}) {
  const reasons: string[] = []

  if ((product.rating || 0) >= 4.4 && (product.reviewCount || 0) >= 1000) {
    reasons.push('It has the strongest mix of buyer proof and review quality in this set.')
  } else if ((product.rating || 0) >= 4.2 && (product.reviewCount || 0) >= 250) {
    reasons.push('It carries stronger buyer proof than most nearby alternatives.')
  } else if ((product.dataConfidenceScore || 0) >= 0.8 && (product.attributeCompletenessScore || 0) >= 0.7) {
    reasons.push('Its product facts and evidence coverage are stronger than the rest of the shortlist.')
  } else {
    reasons.push('It is the clearest all-around fit based on the product signals Bes3 has right now.')
  }

  if (finalist.savingsPercent != null) {
    reasons.push(`It is showing a verified ${Math.round(finalist.savingsPercent)}% reference-price discount inside the freshness window.`)
  } else if (typeof (product.bestOffer?.priceAmount ?? product.priceAmount) === 'number') {
    reasons.push('The current listed price is already visible, so the next step can stay concrete.')
  }

  if (finalist.distanceFromTrackedLowPercent != null && finalist.distanceFromTrackedLowPercent <= 5) {
    reasons.push('The tracked price position is still close enough to the recent low to keep timing credible.')
  }

  reasons.push(`${getFreshnessLabel(getCheckedAt(product))}, so the page can act as a current recommendation instead of an archive.`)

  return reasons.join(' ')
}

function buildCaution(product: CommerceProductRecord, finalist: {
  savingsPercent: number | null
  distanceFromTrackedLowPercent: number | null
}) {
  if ((product.reviewCount || 0) < 200) {
    return 'Buyer proof is still thinner here, so validate the product page before treating it as final.'
  }
  if ((product.attributeCompletenessScore || 0) < 0.6) {
    return 'The core recommendation looks viable, but the spec coverage is still lighter than the lead pick.'
  }
  if ((product.dataConfidenceScore || 0) < 0.7) {
    return 'This product can stay in view, but the supporting evidence is less complete than the winner.'
  }
  if (finalist.distanceFromTrackedLowPercent != null && finalist.distanceFromTrackedLowPercent > 10) {
    return 'The product fit can stay viable, but the tracked timing sits high enough that waiting may still improve the outcome.'
  }
  if (finalist.savingsPercent == null && product.bestOffer?.referencePriceAmount) {
    return 'A reference exists, but it is no longer fresh enough to support a public discount claim, so treat timing language as the safer signal.'
  }

  return `Last checked ${formatEditorialDate(getCheckedAt(product))}, so keep it as an alternative unless its specific tradeoff matches your priorities better.`
}

function scoreProduct(product: CommerceProductRecord) {
  const confidenceScore = Math.round((product.dataConfidenceScore || 0) * 28)
  const completenessScore = Math.round((product.attributeCompletenessScore || 0) * 18)
  const proofScore = getProofScore(product)
  const freshnessScore = getFreshnessScore(product)
  const valueScore = getValueScore(product)
  const sourceScore = Math.min(product.sourceCount || 0, 6) + Math.min(product.offerCount || 0, 4)

  return confidenceScore + completenessScore + proofScore + freshnessScore + valueScore + sourceScore
}

function getReferenceAgeHours(value: string | null | undefined) {
  if (!value) return null
  const parsed = Date.parse(value)
  if (!Number.isFinite(parsed)) return null
  return Math.max(0, (Date.now() - parsed) / 3_600_000)
}

function getDistanceFromTrackedLowPercent(currentPrice: number | null, lowestPrice: number | null) {
  if (currentPrice == null || lowestPrice == null || !Number.isFinite(currentPrice) || !Number.isFinite(lowestPrice) || lowestPrice <= 0) {
    return null
  }

  return ((currentPrice - lowestPrice) / lowestPrice) * 100
}

export async function buildProductFinalists(products: CommerceProductRecord[], limit: number = 3): Promise<ProductFinalist[]> {
  const shortlist = [...products]
    .sort((left, right) => {
      const scoreDelta = scoreProduct(right) - scoreProduct(left)
      if (scoreDelta !== 0) return scoreDelta
      const freshnessDelta = toTimestamp(getCheckedAt(right)) - toTimestamp(getCheckedAt(left))
      if (freshnessDelta !== 0) return freshnessDelta
      return (left.bestOffer?.priceAmount ?? left.priceAmount ?? Number.POSITIVE_INFINITY) - (right.bestOffer?.priceAmount ?? right.priceAmount ?? Number.POSITIVE_INFINITY)
    })
    .slice(0, Math.max(1, limit))

  return Promise.all(
    shortlist.map(async (product) => {
      const currentPrice = product.bestOffer?.priceAmount ?? product.priceAmount
      const currentCurrency = product.bestOffer?.priceCurrency || product.priceCurrency || 'USD'
      const priceHistory = await listProductPriceHistory(product.id, 12)
      const summary = summarizePriceHistoryWindow(priceHistory, currentPrice, currentCurrency)
      const distanceFromTrackedLowPercent = getDistanceFromTrackedLowPercent(summary.currentPrice, summary.lowestPrice)
      const referencePriceAmount = product.bestOffer?.referencePriceAmount ?? null
      const checkedAgeHours = getReferenceAgeHours(getCheckedAt(product))
      const referenceAgeHours = getReferenceAgeHours(product.bestOffer?.referencePriceLastCheckedAt || product.bestOffer?.lastCheckedAt)
      const hasVerifiedDiscount =
        referencePriceAmount != null &&
        currentPrice != null &&
        referencePriceAmount > currentPrice &&
        Boolean(product.bestOffer?.referencePriceType) &&
        Boolean(product.bestOffer?.referencePriceSource) &&
        checkedAgeHours != null &&
        checkedAgeHours <= OFFERS_FRESHNESS_WINDOW_HOURS &&
        referenceAgeHours != null &&
        referenceAgeHours <= OFFERS_FRESHNESS_WINDOW_HOURS
      const savingsAmount = hasVerifiedDiscount ? Number((referencePriceAmount - currentPrice).toFixed(2)) : null
      const savingsPercent =
        hasVerifiedDiscount && currentPrice != null
          ? Number((((referencePriceAmount - currentPrice) / referencePriceAmount) * 100).toFixed(1))
          : null

      const finalist = {
        product,
        score: scoreProduct(product),
        checkedAt: getCheckedAt(product),
        freshnessLabel: getFreshnessLabel(getCheckedAt(product)),
        currentPrice,
        currentCurrency,
        referencePrice: hasVerifiedDiscount ? referencePriceAmount : null,
        referenceCurrency: hasVerifiedDiscount ? product.bestOffer?.referencePriceCurrency || currentCurrency : null,
        savingsAmount,
        savingsPercent,
        distanceFromTrackedLowPercent,
        merchantName: product.bestOffer?.merchantName || null,
        shippingCost: product.bestOffer?.shippingCost ?? null,
        hasVerifiedDiscount,
        reason: '',
        caution: ''
      }

      finalist.reason = buildReason(product, finalist)
      finalist.caution = buildCaution(product, finalist)

      return finalist
    })
  )
}
