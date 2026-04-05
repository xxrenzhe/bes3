import type { ProductPriceHistoryRecord } from '@/lib/site-data'

export interface PriceHistoryWindowSummary {
  totalPoints: number
  currentPrice: number | null
  previousPrice: number | null
  lowestPrice: number | null
  highestPrice: number | null
  currency: string | null
  latestCapturedAt: string | null
  deltaFromPrevious: number | null
}

export type DealDecisionSignalId = 'buy-now' | 'good-value' | 'watch' | 'needs-data'

export interface DealDecisionSignal {
  id: DealDecisionSignalId
  badge: string
  title: string
  description: string
}

export function summarizePriceHistoryWindow(
  priceHistory: ProductPriceHistoryRecord[],
  fallbackPrice?: number | null,
  fallbackCurrency?: string | null
): PriceHistoryWindowSummary {
  if (!priceHistory.length) {
    return {
      totalPoints: 0,
      currentPrice: fallbackPrice ?? null,
      previousPrice: null,
      lowestPrice: fallbackPrice ?? null,
      highestPrice: fallbackPrice ?? null,
      currency: fallbackCurrency || null,
      latestCapturedAt: null,
      deltaFromPrevious: null
    }
  }

  const points = [...priceHistory]
    .filter((point) => point.capturedAt)
    .sort((left, right) => Date.parse(left.capturedAt || '') - Date.parse(right.capturedAt || ''))

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
    currentPrice: current?.priceAmount ?? fallbackPrice ?? null,
    previousPrice: previous?.priceAmount ?? null,
    lowestPrice: lowest?.priceAmount ?? fallbackPrice ?? null,
    highestPrice: highest?.priceAmount ?? fallbackPrice ?? null,
    currency: current?.priceCurrency || lowest?.priceCurrency || highest?.priceCurrency || fallbackCurrency || null,
    latestCapturedAt: points[points.length - 1]?.capturedAt || null,
    deltaFromPrevious: current && previous ? Number(current.priceAmount) - Number(previous.priceAmount) : null
  }
}

export function buildDealDecisionSignal(summary: PriceHistoryWindowSummary): DealDecisionSignal {
  if (summary.totalPoints <= 0 || summary.currentPrice == null || summary.lowestPrice == null || summary.highestPrice == null) {
    return {
      id: 'needs-data',
      badge: 'Needs more tracking',
      title: 'The current price window is still thin.',
      description: 'Bes3 needs more tracked price points before calling this a strong buy-now or wait signal.'
    }
  }

  const current = Number(summary.currentPrice)
  const lowest = Number(summary.lowestPrice)
  const highest = Number(summary.highestPrice)

  if (current <= lowest * 1.02) {
    return {
      id: 'buy-now',
      badge: 'Buy window',
      title: 'This sits near the best tracked price.',
      description: 'The current offer is at or very close to the lowest verified point in the tracked window.'
    }
  }

  if (summary.totalPoints >= 3 && current >= highest * 0.94) {
    return {
      id: 'watch',
      badge: 'Wait if you can',
      title: 'The current price is near the top of the tracked range.',
      description: 'Fit may still be good, but timing does not look favorable unless you need to buy now.'
    }
  }

  return {
    id: 'good-value',
    badge: 'Fair value',
    title: 'This is a workable price, but not the strongest window yet.',
    description: 'The current offer is inside a credible tracked range and may be acceptable if fit matters more than perfect timing.'
  }
}

export function getDealDecisionSignalRank(signal: DealDecisionSignalId) {
  switch (signal) {
    case 'buy-now':
      return 0
    case 'good-value':
      return 1
    case 'watch':
      return 2
    default:
      return 3
  }
}
