import { categoryMatches, getCategorySlug } from '@/lib/category'
import {
  buildDealDecisionSignal,
  getDealDecisionSignalRank,
  summarizePriceHistoryWindow,
  type DealDecisionSignal,
  type PriceHistoryWindowSummary
} from '@/lib/price-insights'
import {
  listOpenCommerceProducts,
  listProductPriceHistory,
  type CommerceProductRecord,
  type ProductPriceHistoryRecord
} from '@/lib/site-data'

export const OFFERS_FRESHNESS_WINDOW_HOURS = 72
export const OFFER_SHOWDOWN_SIZE = 3

export interface OfferOpportunity {
  product: CommerceProductRecord
  priceHistory: ProductPriceHistoryRecord[]
  summary: PriceHistoryWindowSummary
  signal: DealDecisionSignal
  currentPrice: number | null
  currentCurrency: string
  referencePrice: number | null
  referenceCurrency: string | null
  referencePriceType: string | null
  savingsAmount: number | null
  savingsPercent: number | null
  distanceFromTrackedLowPercent: number | null
  freshnessHours: number | null
  isFresh: boolean
  opportunityScore: number
  primaryBadge: string
  winnerReason: string
  nextStepReason: string
}

export interface OfferShowdown {
  category: string
  categorySlug: string
  winner: OfferOpportunity
  contenders: OfferOpportunity[]
}

function toTimestamp(value: string | null | undefined) {
  if (!value) return Number.NaN
  const parsed = Date.parse(value)
  return Number.isFinite(parsed) ? parsed : Number.NaN
}

function getDistanceFromTrackedLowPercent(currentPrice: number | null | undefined, lowestPrice: number | null | undefined) {
  if (typeof currentPrice !== 'number' || !Number.isFinite(currentPrice)) return null
  if (typeof lowestPrice !== 'number' || !Number.isFinite(lowestPrice) || lowestPrice <= 0) return null
  return ((currentPrice - lowestPrice) / lowestPrice) * 100
}

function getFreshnessHours(values: Array<string | null | undefined>) {
  const latestTimestamp = values.reduce<number>((latest, value) => {
    const parsed = toTimestamp(value)
    return Number.isFinite(parsed) && parsed > latest ? parsed : latest
  }, Number.NEGATIVE_INFINITY)

  if (!Number.isFinite(latestTimestamp)) return null
  return Math.max(0, (Date.now() - latestTimestamp) / 3_600_000)
}

function getAgeHours(value: string | null | undefined) {
  const timestamp = toTimestamp(value)
  if (!Number.isFinite(timestamp)) return null
  return Math.max(0, (Date.now() - timestamp) / 3_600_000)
}

function getReferencePrice(product: CommerceProductRecord, currentPrice: number | null) {
  const bestOffer = product.bestOffer
  if (!bestOffer) {
    return {
      amount: null,
      currency: null,
      type: null,
      lastCheckedAt: null
    }
  }

  const amount =
    bestOffer.referencePriceAmount != null &&
    currentPrice != null &&
    bestOffer.referencePriceAmount > currentPrice
      ? bestOffer.referencePriceAmount
      : null

  return {
    amount,
    currency: amount != null ? bestOffer.referencePriceCurrency || bestOffer.priceCurrency || product.priceCurrency || 'USD' : null,
    type: amount != null ? bestOffer.referencePriceType || 'unknown' : null,
    lastCheckedAt: amount != null ? bestOffer.referencePriceLastCheckedAt || bestOffer.lastCheckedAt || null : null
  }
}

function formatDistanceNarrative(signal: DealDecisionSignal['id'], distanceFromTrackedLowPercent: number | null) {
  if (distanceFromTrackedLowPercent == null) {
    return signal === 'needs-data'
      ? 'Tracked price history is still thin, so use this as a monitored opportunity rather than a rush decision.'
      : 'The tracked range is still incomplete, so the timing signal is directional rather than final.'
  }

  if (distanceFromTrackedLowPercent <= 0.25) {
    return 'The current price is sitting at the tracked floor, which is the cleanest possible buy window.'
  }

  if (distanceFromTrackedLowPercent <= 5) {
    return `The current price is only ${distanceFromTrackedLowPercent.toFixed(1)}% above the tracked low, so timing still looks strong.`
  }

  if (distanceFromTrackedLowPercent <= 10) {
    return `The current price is ${distanceFromTrackedLowPercent.toFixed(1)}% above the tracked low, which is workable but no longer a clear floor.`
  }

  return `The current price is ${distanceFromTrackedLowPercent.toFixed(1)}% above the tracked low, so waiting may still improve the outcome.`
}

function buildPrimaryBadge(signal: DealDecisionSignal['id'], savingsPercent: number | null) {
  if (savingsPercent != null && savingsPercent >= 5) {
    return `-${Math.round(savingsPercent)}% OFF`
  }

  if (signal === 'buy-now') return 'Best buy window'
  if (signal === 'watch') return 'Watch timing'
  if (signal === 'good-value') return 'Live offer'
  return 'Needs more tracking'
}

function buildWinnerReason(input: {
  product: CommerceProductRecord
  signal: DealDecisionSignal
  savingsAmount: number | null
  savingsPercent: number | null
  distanceFromTrackedLowPercent: number | null
}) {
  const savingsText =
    input.savingsPercent != null && input.savingsAmount != null
      ? `It is currently ${Math.round(input.savingsPercent)}% below the reference price.`
      : 'It still qualifies because the live price can be actioned through the affiliate route.'

  return `${input.signal.title} ${savingsText} ${formatDistanceNarrative(input.signal.id, input.distanceFromTrackedLowPercent)}`
}

function buildNextStepReason(input: {
  signal: DealDecisionSignal
  isFresh: boolean
  savingsPercent: number | null
}) {
  if (!input.isFresh) {
    return 'Treat this as a monitored promotion until the offer is checked again. Freshness has already drifted beyond the main recommendation window.'
  }

  if (input.signal.id === 'buy-now') {
    return 'If fit is already clear, check the merchant now. This is the kind of window that should move from shortlist to store review.'
  }

  if (input.signal.id === 'watch') {
    return 'Keep this on a price watch. The promotion exists, but the timing is still too high in the tracked range.'
  }

  if (input.savingsPercent != null && input.savingsPercent >= 10) {
    return 'Use this as a shortlist finalist. The promotion is meaningful even if the timing signal is not the absolute floor.'
  }

  return 'Use this as a compare-first pick. The live offer is credible, but one more validation step still makes sense.'
}

function calculateOpportunityScore(input: {
  product: CommerceProductRecord
  signal: DealDecisionSignal
  savingsPercent: number | null
  distanceFromTrackedLowPercent: number | null
  freshnessHours: number | null
  isFresh: boolean
}) {
  const signalBase = {
    'buy-now': 82,
    'good-value': 64,
    watch: 40,
    'needs-data': 26
  }[input.signal.id]

  const savingsScore = input.savingsPercent != null ? Math.min(28, input.savingsPercent * 1.4) : 0
  const distanceScore =
    input.distanceFromTrackedLowPercent == null
      ? 0
      : input.distanceFromTrackedLowPercent <= 0.25
        ? 18
        : input.distanceFromTrackedLowPercent <= 5
          ? 14
          : input.distanceFromTrackedLowPercent <= 10
            ? 8
            : -10
  const freshnessScore =
    input.freshnessHours == null
      ? -6
      : input.freshnessHours <= 24
        ? 12
        : input.freshnessHours <= OFFERS_FRESHNESS_WINDOW_HOURS
          ? 6
          : -12
  const trustScore =
    Math.round(input.product.dataConfidenceScore * 8) +
    Math.round(input.product.attributeCompletenessScore * 6) +
    Math.min(input.product.sourceCount, 4)

  return Number((signalBase + savingsScore + distanceScore + freshnessScore + trustScore + (input.isFresh ? 4 : -6)).toFixed(2))
}

function compareByOpportunity(left: OfferOpportunity, right: OfferOpportunity) {
  if (right.opportunityScore !== left.opportunityScore) return right.opportunityScore - left.opportunityScore
  if ((right.savingsPercent ?? -1) !== (left.savingsPercent ?? -1)) return (right.savingsPercent ?? -1) - (left.savingsPercent ?? -1)
  if ((right.savingsAmount ?? -1) !== (left.savingsAmount ?? -1)) return (right.savingsAmount ?? -1) - (left.savingsAmount ?? -1)
  const signalDelta = getDealDecisionSignalRank(left.signal.id) - getDealDecisionSignalRank(right.signal.id)
  if (signalDelta !== 0) return signalDelta
  return (left.currentPrice ?? Number.POSITIVE_INFINITY) - (right.currentPrice ?? Number.POSITIVE_INFINITY)
}

function compareByDiscount(left: OfferOpportunity, right: OfferOpportunity) {
  if ((right.savingsPercent ?? -1) !== (left.savingsPercent ?? -1)) return (right.savingsPercent ?? -1) - (left.savingsPercent ?? -1)
  if ((right.savingsAmount ?? -1) !== (left.savingsAmount ?? -1)) return (right.savingsAmount ?? -1) - (left.savingsAmount ?? -1)
  return compareByOpportunity(left, right)
}

async function buildOfferOpportunity(product: CommerceProductRecord): Promise<OfferOpportunity | null> {
  const currentPrice = product.bestOffer?.priceAmount ?? product.priceAmount
  const currentCurrency = product.bestOffer?.priceCurrency || product.priceCurrency || 'USD'

  if (currentPrice == null) return null

  const priceHistory = await listProductPriceHistory(product.id, 12)
  const summary = summarizePriceHistoryWindow(priceHistory, currentPrice, currentCurrency)
  const signal = buildDealDecisionSignal(summary)
  const reference = getReferencePrice(product, currentPrice)
  const savingsAmount = reference.amount != null ? Number((reference.amount - currentPrice).toFixed(2)) : null
  const savingsPercent = reference.amount != null ? Number((((reference.amount - currentPrice) / reference.amount) * 100).toFixed(1)) : null
  const distanceFromTrackedLowPercent = getDistanceFromTrackedLowPercent(summary.currentPrice, summary.lowestPrice)
  const offerFreshnessHours = getFreshnessHours([
    product.bestOffer?.lastCheckedAt,
    product.offerLastCheckedAt,
    product.priceLastCheckedAt
  ])
  const referenceFreshnessHours = getAgeHours(reference.lastCheckedAt)
  const freshnessHours = getFreshnessHours([
    product.bestOffer?.lastCheckedAt,
    product.offerLastCheckedAt,
    product.priceLastCheckedAt,
    reference.lastCheckedAt
  ])
  const isFresh =
    offerFreshnessHours != null &&
    offerFreshnessHours <= OFFERS_FRESHNESS_WINDOW_HOURS &&
    (referenceFreshnessHours == null || referenceFreshnessHours <= OFFERS_FRESHNESS_WINDOW_HOURS)
  const opportunityScore = calculateOpportunityScore({
    product,
    signal,
    savingsPercent,
    distanceFromTrackedLowPercent,
    freshnessHours,
    isFresh
  })

  return {
    product,
    priceHistory,
    summary,
    signal,
    currentPrice,
    currentCurrency,
    referencePrice: reference.amount,
    referenceCurrency: reference.currency,
    referencePriceType: reference.type,
    savingsAmount,
    savingsPercent,
    distanceFromTrackedLowPercent,
    freshnessHours,
    isFresh,
    opportunityScore,
    primaryBadge: buildPrimaryBadge(signal.id, savingsPercent),
    winnerReason: buildWinnerReason({
      product,
      signal,
      savingsAmount,
      savingsPercent,
      distanceFromTrackedLowPercent
    }),
    nextStepReason: buildNextStepReason({
      signal,
      isFresh,
      savingsPercent
    })
  }
}

export async function listOfferOpportunities(options?: {
  category?: string
  limit?: number
  sort?: 'opportunity' | 'discount'
}): Promise<OfferOpportunity[]> {
  const products = await listOpenCommerceProducts()
  const filteredProducts = options?.category
    ? products.filter((product) => categoryMatches(product.category, options.category))
    : products

  const items = (await Promise.all(filteredProducts.map((product) => buildOfferOpportunity(product)))).filter(Boolean) as OfferOpportunity[]
  const sorted = [...items].sort(options?.sort === 'discount' ? compareByDiscount : compareByOpportunity)

  return typeof options?.limit === 'number' ? sorted.slice(0, Math.max(1, options.limit)) : sorted
}

export function buildOfferShowdowns(items: OfferOpportunity[], limit: number = 6): OfferShowdown[] {
  const grouped = items.reduce<Map<string, OfferOpportunity[]>>((result, item) => {
    if (!item.product.category) return result
    const existing = result.get(item.product.category) || []
    existing.push(item)
    result.set(item.product.category, existing)
    return result
  }, new Map())

  return Array.from(grouped.entries())
    .map(([category, contenders]) => {
      const ranked = [...contenders].sort(compareByOpportunity).slice(0, OFFER_SHOWDOWN_SIZE)
      if (!ranked.length) return null

      return {
        category,
        categorySlug: getCategorySlug(category),
        winner: ranked[0],
        contenders: ranked
      }
    })
    .filter((item): item is OfferShowdown => Boolean(item))
    .sort((left, right) => compareByOpportunity(left.winner, right.winner))
    .slice(0, Math.max(1, limit))
}

export function buildOffersPath(category?: string | null) {
  const categorySlug = getCategorySlug(category)
  return categorySlug ? `/offers/${categorySlug}` : '/offers'
}

export function buildBiggestDiscountsPath() {
  return '/biggest-discounts'
}

export function listOfferCategories(items: OfferOpportunity[]) {
  return Array.from(
    new Map(
      items
        .filter((item) => item.product.category)
        .map((item) => [getCategorySlug(item.product.category), item.product.category as string])
    ).entries()
  )
    .map(([slug, category]) => ({ slug, category }))
    .filter((item) => Boolean(item.slug))
}

export function getLatestOfferRefresh(items: OfferOpportunity[]) {
  return items.reduce<string | null>((latest, item) => {
    const candidate =
      item.product.bestOffer?.lastCheckedAt ||
      item.product.offerLastCheckedAt ||
      item.product.priceLastCheckedAt ||
      item.product.updatedAt ||
      item.product.publishedAt ||
      null
    return toTimestamp(candidate) > toTimestamp(latest) ? candidate : latest
  }, null)
}
