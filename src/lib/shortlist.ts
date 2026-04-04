import { formatPriceSnapshot } from '@/lib/utils'

export interface ShortlistItem {
  id: number
  slug: string | null
  brand: string | null
  productName: string
  category: string | null
  description: string | null
  heroImageUrl: string | null
  priceAmount: number | null
  priceCurrency: string | null
  rating: number | null
  reviewCount: number | null
  reviewHighlights: string[]
  resolvedUrl: string | null
  publishedAt: string | null
  updatedAt: string | null
}

export const SHORTLIST_STORAGE_KEY = 'bes3-shortlist'
export const COMPARE_STORAGE_KEY = 'bes3-compare'
export const MAX_COMPARE_ITEMS = 3
export const MAX_SHARED_SHORTLIST_ITEMS = 8

export interface ShortlistSummary {
  itemCount: number
  categoryCount: number
  categoryLabel: string
  categoryNote: string
  priceRangeLabel: string
  priceRangeNote: string
  averageRating: number | null
  averageRatingLabel: string
  buyerProofLabel: string
  buyerProofNote: string
  strongestSignal: string
  overview: string
  decisionNote: string
}

export interface ShortlistDecisionState {
  score: number
  stage: 'signal-building' | 'needs-check' | 'compare-ready' | 'finalist'
  label: string
  note: string
  whySaved: string[]
  gaps: string[]
}

export interface ShortlistDecisionSummary {
  averageScore: number
  compareReadyCount: number
  finalistCount: number
  needsCheckCount: number
  buildingCount: number
  label: string
  note: string
  topGap: string
  nextAction: string
}

type ShortlistItemInput = Omit<ShortlistItem, 'reviewHighlights'> & {
  reviewHighlights?: string[] | null
}

const DAY_MS = 86_400_000

export function toShortlistItem(product: ShortlistItemInput): ShortlistItem {
  return {
    id: product.id,
    slug: product.slug,
    brand: product.brand,
    productName: product.productName,
    category: product.category,
    description: product.description,
    heroImageUrl: product.heroImageUrl,
    priceAmount: product.priceAmount,
    priceCurrency: product.priceCurrency,
    rating: product.rating,
    reviewCount: product.reviewCount,
    reviewHighlights: (product.reviewHighlights || []).slice(0, 3),
    resolvedUrl: product.resolvedUrl,
    publishedAt: product.publishedAt,
    updatedAt: product.updatedAt
  }
}

export function getShortlistProductPath(item: Pick<ShortlistItem, 'slug'>) {
  return item.slug ? `/products/${item.slug}` : '/directory'
}

function normalizeShortlistIds(ids: number[]) {
  return ids
    .filter((id) => Number.isInteger(id) && id > 0)
    .filter((id, index, list) => list.indexOf(id) === index)
    .slice(0, MAX_SHARED_SHORTLIST_ITEMS)
}

export function parseShortlistShareValue(value: string | string[] | undefined) {
  const rawValue = Array.isArray(value) ? value[0] : value
  if (!rawValue) return []

  return normalizeShortlistIds(
    rawValue
      .split(',')
      .map((item) => Number(item.trim()))
  )
}

export function buildShortlistSharePath(items: Array<Pick<ShortlistItem, 'id'> | number>) {
  const ids = normalizeShortlistIds(items.map((item) => (typeof item === 'number' ? item : item.id)))
  if (!ids.length) return '/shortlist'

  const params = new URLSearchParams({ items: ids.join(',') })
  return `/shortlist?${params.toString()}`
}

function humanizeCategory(category: string | null) {
  return category ? category.replace(/-/g, ' ') : 'buyer shortlist'
}

function pushUnique(items: string[], value: string | null | undefined) {
  if (!value || items.includes(value)) return
  items.push(value)
}

function parseShortlistTimestamp(value: string | null | undefined) {
  if (!value) return null
  const timestamp = new Date(value).getTime()
  return Number.isNaN(timestamp) ? null : timestamp
}

export function getShortlistDecisionState(
  item: ShortlistItem,
  options?: {
    shortlistSize?: number
    compareIds?: number[]
  }
): ShortlistDecisionState {
  const shortlistSize = Math.max(1, options?.shortlistSize || 1)
  const inCompare = (options?.compareIds || []).includes(item.id)
  const whySaved: string[] = []
  const gaps: string[] = []
  let score = 0

  if (item.priceAmount !== null && item.priceAmount !== undefined && Number.isFinite(item.priceAmount) && item.priceAmount > 0) {
    score += 15
    pushUnique(whySaved, 'Verified price')
  } else {
    pushUnique(gaps, 'Price snapshot still missing')
  }

  if (item.resolvedUrl) {
    score += 15
    pushUnique(whySaved, 'Merchant ready')
  } else {
    pushUnique(gaps, 'Merchant link still pending')
  }

  const rating = item.rating || 0
  const reviewCount = item.reviewCount || 0

  if (rating >= 4.4 && reviewCount >= 1000) {
    score += 20
    pushUnique(whySaved, 'Strong buyer proof')
  } else if (rating >= 4.1 && reviewCount >= 200) {
    score += 16
    pushUnique(whySaved, 'Review-backed')
  } else if (rating >= 4.4) {
    score += 12
    pushUnique(whySaved, 'High rating signal')
  } else if (reviewCount >= 1000) {
    score += 12
    pushUnique(whySaved, 'Heavy review volume')
  } else if (rating >= 4 || reviewCount >= 200) {
    score += 8
    pushUnique(whySaved, 'Early buyer proof')
  } else {
    pushUnique(gaps, 'Buyer proof still thin')
  }

  if (item.reviewHighlights.length) {
    score += 15
    pushUnique(whySaved, 'Clear tradeoff clue')
  } else if (item.description) {
    score += 10
    pushUnique(whySaved, 'Use-case signal')
  } else {
    pushUnique(gaps, 'Deep-dive signal still thin')
  }

  const signalTimestamp = parseShortlistTimestamp(item.updatedAt || item.publishedAt)
  if (signalTimestamp !== null) {
    const ageDays = Math.max(0, Math.floor((Date.now() - signalTimestamp) / DAY_MS))

    if (ageDays <= 14) {
      score += 15
      pushUnique(whySaved, 'Freshly checked')
    } else if (ageDays <= 45) {
      score += 10
      pushUnique(whySaved, 'Recently checked')
    } else {
      score += 5
      pushUnique(gaps, 'Snapshot needs a fresher check')
    }
  } else {
    pushUnique(gaps, 'Freshness still unclear')
  }

  if (inCompare) {
    score += 20
    pushUnique(whySaved, 'Finalist in compare')
  } else if (shortlistSize >= 2) {
    score += 10
    pushUnique(whySaved, 'Ready for compare')
  } else {
    pushUnique(gaps, 'Needs one more contender')
  }

  const boundedScore = Math.max(0, Math.min(100, score))

  if (inCompare && boundedScore >= 70) {
    return {
      score: boundedScore,
      stage: 'finalist',
      label: 'Finalist',
      note: 'Already in compare with enough verified signal to move toward the decision matrix and merchant checks.',
      whySaved: whySaved.slice(0, 4),
      gaps: gaps.slice(0, 2)
    }
  }

  if (boundedScore >= 70) {
    return {
      score: boundedScore,
      stage: 'compare-ready',
      label: 'Compare-ready',
      note: 'This pick already carries enough price, proof, and freshness context to become a finalist now.',
      whySaved: whySaved.slice(0, 4),
      gaps: gaps.slice(0, 2)
    }
  }

  if (boundedScore >= 45) {
    return {
      score: boundedScore,
      stage: 'needs-check',
      label: 'Needs one more check',
      note: gaps[0]
        ? `Strong option, but ${gaps[0].charAt(0).toLowerCase()}${gaps[0].slice(1)} before it deserves finalist status.`
        : 'Strong option, but it still needs one tighter proof point before it belongs in compare.',
      whySaved: whySaved.slice(0, 4),
      gaps: gaps.slice(0, 2)
    }
  }

  return {
    score: boundedScore,
    stage: 'signal-building',
    label: 'Signal building',
    note: 'Worth keeping visible, but the decision evidence is still too thin to treat this as a serious finalist.',
    whySaved: whySaved.slice(0, 4),
    gaps: gaps.slice(0, 2)
  }
}

export function summarizeShortlistDecisionReadiness(items: ShortlistItem[], compareIds: number[] = []): ShortlistDecisionSummary {
  if (!items.length) {
    return {
      averageScore: 0,
      compareReadyCount: 0,
      finalistCount: 0,
      needsCheckCount: 0,
      buildingCount: 0,
      label: 'No shortlist yet',
      note: 'Save a few products first so Bes3 can tell you which ones are actually decision-ready.',
      topGap: 'No saved picks yet.',
      nextAction: 'Add products from search, deals, or category hubs to start building a real decision set.'
    }
  }

  const states = items.map((item) =>
    getShortlistDecisionState(item, {
      shortlistSize: items.length,
      compareIds
    })
  )

  const averageScore = Math.round(states.reduce((sum, state) => sum + state.score, 0) / states.length)
  const compareReadyCount = states.filter((state) => state.stage === 'compare-ready').length
  const finalistCount = states.filter((state) => state.stage === 'finalist').length
  const needsCheckCount = states.filter((state) => state.stage === 'needs-check').length
  const buildingCount = states.filter((state) => state.stage === 'signal-building').length

  const missingPriceCount = items.filter((item) => item.priceAmount === null || item.priceAmount === undefined || !Number.isFinite(item.priceAmount)).length
  const missingMerchantCount = items.filter((item) => !item.resolvedUrl).length
  const thinProofCount = items.filter((item) => (item.rating || 0) < 4 && (item.reviewCount || 0) < 200).length
  const staleCheckCount = items.filter((item) => {
    const timestamp = parseShortlistTimestamp(item.updatedAt || item.publishedAt)
    if (timestamp === null) return true
    return Date.now() - timestamp > 45 * DAY_MS
  }).length

  const topGap = missingMerchantCount
    ? `${missingMerchantCount} ${missingMerchantCount === 1 ? 'pick still lacks' : 'picks still lack'} a verified merchant exit.`
    : missingPriceCount
      ? `${missingPriceCount} ${missingPriceCount === 1 ? 'pick is still missing' : 'picks are still missing'} a price snapshot.`
      : thinProofCount
        ? `${thinProofCount} ${thinProofCount === 1 ? 'pick still needs' : 'picks still need'} stronger buyer proof.`
        : staleCheckCount
          ? `${staleCheckCount} ${staleCheckCount === 1 ? 'pick needs' : 'picks need'} a fresher verification pass.`
          : 'The shortlist has enough signal to move toward compare.'

  if (finalistCount >= 2) {
    return {
      averageScore,
      compareReadyCount,
      finalistCount,
      needsCheckCount,
      buildingCount,
      label: 'Decision in motion',
      note: `${finalistCount} finalists already sit in compare, so the shortlist is now supporting a real choice instead of passive saving.`,
      topGap,
      nextAction: 'Use the decision matrix, then check merchant pricing only for the finalists instead of reopening the whole search.'
    }
  }

  if (compareReadyCount >= 2) {
    return {
      averageScore,
      compareReadyCount,
      finalistCount,
      needsCheckCount,
      buildingCount,
      label: 'Ready to compare',
      note: `${compareReadyCount} saved ${compareReadyCount === 1 ? 'pick already has' : 'picks already have'} enough proof to become finalists.`,
      topGap,
      nextAction: 'Move the strongest two or three picks into compare before adding anything new.'
    }
  }

  if (items.length === 1) {
    return {
      averageScore,
      compareReadyCount,
      finalistCount,
      needsCheckCount,
      buildingCount,
      label: 'Too early to decide',
      note: 'One saved product is still a preference, not a real decision set.',
      topGap,
      nextAction: 'Add one same-category alternative so the tradeoffs become obvious.'
    }
  }

  if (buildingCount >= Math.ceil(items.length / 2)) {
    return {
      averageScore,
      compareReadyCount,
      finalistCount,
      needsCheckCount,
      buildingCount,
      label: 'Proof still uneven',
      note: `${buildingCount} saved ${buildingCount === 1 ? 'pick is' : 'picks are'} still building evidence, so the shortlist is not ready to collapse into finalists yet.`,
      topGap,
      nextAction: `Close the biggest gap next: ${topGap}`
    }
  }

  return {
    averageScore,
    compareReadyCount,
    finalistCount,
    needsCheckCount,
    buildingCount,
    label: 'Shortlist taking shape',
    note: `${needsCheckCount} ${needsCheckCount === 1 ? 'pick is' : 'picks are'} close, but the shortlist still has one main proof gap to close before compare gets cleaner.`,
    topGap,
    nextAction: `Tighten the shortlist by fixing the biggest gap first: ${topGap}`
  }
}

function formatShortlistPriceRange(items: ShortlistItem[]) {
  const pricedItems = items.filter(
    (item) =>
      item.priceAmount !== null &&
      item.priceAmount !== undefined &&
      Number.isFinite(item.priceAmount) &&
      item.priceAmount > 0 &&
      item.priceCurrency
  )

  if (!pricedItems.length) {
    return {
      label: 'Price pending',
      note: 'Bes3 is still waiting on stable price snapshots.'
    }
  }

  const currencies = Array.from(new Set(pricedItems.map((item) => item.priceCurrency)))
  if (currencies.length > 1) {
    return {
      label: 'Mixed pricing',
      note: 'The shared picks span multiple currencies.'
    }
  }

  const currency = currencies[0] || 'USD'
  const amounts = pricedItems
    .map((item) => item.priceAmount as number)
    .sort((left, right) => left - right)

  const minLabel = formatPriceSnapshot(amounts[0], currency)
  const maxLabel = formatPriceSnapshot(amounts[amounts.length - 1], currency)

  if (amounts[0] === amounts[amounts.length - 1]) {
    return {
      label: minLabel,
      note: pricedItems.length === 1 ? 'Only one shared pick has a confirmed price.' : 'Every shared pick currently sits at the same price point.'
    }
  }

  return {
    label: `${minLabel} - ${maxLabel}`,
    note: `${pricedItems.length} of ${items.length} shared picks have a confirmed price.`
  }
}

function pickStrongestSignal(items: ShortlistItem[]) {
  const candidates = items
    .map((item) => ({
      item,
      clue: item.reviewHighlights[0] || item.description,
      rating: item.rating ?? 0,
      reviewCount: item.reviewCount ?? 0
    }))
    .filter((candidate) => candidate.clue)
    .sort((left, right) => {
      if (right.rating !== left.rating) return right.rating - left.rating
      return right.reviewCount - left.reviewCount
    })

  const strongest = candidates[0]
  if (!strongest) {
    return 'Open the deep-dive pages to review the full Bes3 verdict on each option.'
  }

  return `${strongest.item.productName}: ${strongest.clue}`
}

export function summarizeShortlist(items: ShortlistItem[]): ShortlistSummary {
  const categories = Array.from(new Set(items.map((item) => humanizeCategory(item.category))))
  const ratedItems = items.filter((item) => item.rating !== null && item.rating !== undefined && item.rating > 0)
  const totalReviews = items.reduce((sum, item) => sum + (item.reviewCount || 0), 0)
  const averageRating = ratedItems.length
    ? Math.round(
        (ratedItems.reduce((sum, item) => sum + (item.rating || 0), 0) / ratedItems.length) * 10
      ) / 10
    : null
  const priceRange = formatShortlistPriceRange(items)

  const categoryLabel =
    categories.length <= 1
      ? categories[0] || 'Mixed shortlist'
      : `${categories.length} categories`
  const categoryNote =
    categories.length <= 2
      ? categories.join(' and ')
      : `${categories.slice(0, 2).join(', ')} and ${categories.length - 2} more`

  const averageRatingLabel = averageRating ? `${averageRating.toFixed(1)} / 5` : 'Signal building'
  const buyerProofLabel = totalReviews
    ? `${totalReviews.toLocaleString()} reviews`
    : ratedItems.length
      ? `${ratedItems.length} rated picks`
      : 'Early signal'

  return {
    itemCount: items.length,
    categoryCount: categories.length,
    categoryLabel,
    categoryNote: categoryNote || 'Bes3 is still clustering the category mix.',
    priceRangeLabel: priceRange.label,
    priceRangeNote: priceRange.note,
    averageRating,
    averageRatingLabel,
    buyerProofLabel,
    buyerProofNote: totalReviews
      ? 'Enough buyer proof to share the decision context with someone else.'
      : 'This shortlist is still early, so use the product pages for deeper validation.',
    strongestSignal: pickStrongestSignal(items),
    overview: items.length
      ? `${items.length} ${items.length === 1 ? 'pick' : 'picks'} across ${
          categories.length || 1
        } ${categories.length === 1 ? 'category' : 'categories'}.`
      : 'No shared picks yet.',
    decisionNote: averageRating
      ? `Average buyer signal sits at ${averageRating.toFixed(1)} / 5${totalReviews ? ` across ${totalReviews.toLocaleString()} reviews` : ''}.`
      : totalReviews
        ? `${totalReviews.toLocaleString()} buyer reviews are already tracked across the shared set.`
        : 'Signal is still building, so lean on the product deep-dives before deciding.'
  }
}

export function buildShortlistBuyingBrief(items: ShortlistItem[]) {
  if (!items.length) return 'No shortlist items selected.'

  const summary = summarizeShortlist(items)
  const decisionSummary = summarizeShortlistDecisionReadiness(items)

  return [
    'Bes3 shortlist buying brief',
    `${summary.overview} ${summary.decisionNote}`,
    `Decision readiness: ${decisionSummary.label} (${decisionSummary.averageScore}/100 average).`,
    `Next move: ${decisionSummary.nextAction}`,
    `Price range: ${summary.priceRangeLabel}.`,
    `Strongest signal: ${summary.strongestSignal}`,
    '',
    ...items.map((item, index) => {
      const notes = item.reviewHighlights[0] || item.description || 'Open the deep-dive for the full Bes3 read.'
      const ratingLabel = item.rating ? `${item.rating.toFixed(1)} / 5` : 'Signal building'
      const decisionState = getShortlistDecisionState(item, { shortlistSize: items.length })
      const whySaved = decisionState.whySaved.length ? `Why saved: ${decisionState.whySaved.slice(0, 3).join(', ')}.` : ''

      return `${index + 1}. ${item.productName} (${humanizeCategory(item.category)}) - ${formatPriceSnapshot(
        item.priceAmount,
        item.priceCurrency || 'USD'
      )} - ${ratingLabel} - ${decisionState.label} ${decisionState.score}/100 - ${whySaved} ${notes}`.trim()
    })
  ].join('\n')
}
