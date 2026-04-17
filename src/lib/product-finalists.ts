import { formatEditorialDate, getFreshnessLabel } from '@/lib/editorial'
import type { ProductRecord } from '@/lib/site-data'

export interface ProductFinalist {
  product: ProductRecord
  score: number
  checkedAt: string | null
  freshnessLabel: string
  reason: string
  caution: string
}

function toTimestamp(value: string | null | undefined) {
  if (!value) return Number.NEGATIVE_INFINITY
  const parsed = Date.parse(value)
  return Number.isFinite(parsed) ? parsed : Number.NEGATIVE_INFINITY
}

function getCheckedAt(product: ProductRecord) {
  return product.updatedAt || product.publishedAt || null
}

function getProofScore(product: ProductRecord) {
  const rating = product.rating || 0
  const reviewCount = product.reviewCount || 0

  if (rating >= 4.4 && reviewCount >= 1000) return 28
  if (rating >= 4.2 && reviewCount >= 250) return 22
  if (rating >= 4.0 || reviewCount >= 200) return 16
  if (rating > 0 || reviewCount > 0) return 10
  return 0
}

function getFreshnessScore(product: ProductRecord) {
  const checkedAt = getCheckedAt(product)
  const ageMs = Date.now() - toTimestamp(checkedAt)
  if (!Number.isFinite(ageMs) || ageMs < 0) return 0

  const ageDays = ageMs / 86_400_000
  if (ageDays <= 7) return 18
  if (ageDays <= 30) return 12
  if (ageDays <= 60) return 6
  return 0
}

function getValueScore(product: ProductRecord) {
  if (typeof product.priceAmount !== 'number' || !Number.isFinite(product.priceAmount) || product.priceAmount <= 0) {
    return 0
  }
  if (product.priceAmount <= 150) return 12
  if (product.priceAmount <= 400) return 8
  if (product.priceAmount <= 900) return 4
  return 2
}

function buildReason(product: ProductRecord) {
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

  if (typeof product.priceAmount === 'number' && Number.isFinite(product.priceAmount)) {
    reasons.push('The current listed price is already visible, so the next step can stay concrete.')
  }

  reasons.push(`${getFreshnessLabel(getCheckedAt(product))}, so the page can act as a current recommendation instead of an archive.`)

  return reasons.join(' ')
}

function buildCaution(product: ProductRecord) {
  if ((product.reviewCount || 0) < 200) {
    return 'Buyer proof is still thinner here, so validate the product page before treating it as final.'
  }
  if ((product.attributeCompletenessScore || 0) < 0.6) {
    return 'The core recommendation looks viable, but the spec coverage is still lighter than the lead pick.'
  }
  if ((product.dataConfidenceScore || 0) < 0.7) {
    return 'This product can stay in view, but the supporting evidence is less complete than the winner.'
  }

  return `Last checked ${formatEditorialDate(getCheckedAt(product))}, so keep it as an alternative unless its specific tradeoff matches your priorities better.`
}

function scoreProduct(product: ProductRecord) {
  const confidenceScore = Math.round((product.dataConfidenceScore || 0) * 28)
  const completenessScore = Math.round((product.attributeCompletenessScore || 0) * 18)
  const proofScore = getProofScore(product)
  const freshnessScore = getFreshnessScore(product)
  const valueScore = getValueScore(product)
  const sourceScore = Math.min(product.sourceCount || 0, 6)

  return confidenceScore + completenessScore + proofScore + freshnessScore + valueScore + sourceScore
}

export function buildProductFinalists(products: ProductRecord[], limit: number = 3): ProductFinalist[] {
  return [...products]
    .sort((left, right) => {
      const scoreDelta = scoreProduct(right) - scoreProduct(left)
      if (scoreDelta !== 0) return scoreDelta
      const freshnessDelta = toTimestamp(getCheckedAt(right)) - toTimestamp(getCheckedAt(left))
      if (freshnessDelta !== 0) return freshnessDelta
      return (left.priceAmount ?? Number.POSITIVE_INFINITY) - (right.priceAmount ?? Number.POSITIVE_INFINITY)
    })
    .slice(0, Math.max(1, limit))
    .map((product) => ({
      product,
      score: scoreProduct(product),
      checkedAt: getCheckedAt(product),
      freshnessLabel: getFreshnessLabel(getCheckedAt(product)),
      reason: buildReason(product),
      caution: buildCaution(product)
    }))
}
