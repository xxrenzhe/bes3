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

type ShortlistItemInput = Omit<ShortlistItem, 'reviewHighlights'> & {
  reviewHighlights?: string[] | null
}

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

  return [
    'Bes3 shortlist buying brief',
    `${summary.overview} ${summary.decisionNote}`,
    `Price range: ${summary.priceRangeLabel}.`,
    `Strongest signal: ${summary.strongestSignal}`,
    '',
    ...items.map((item, index) => {
      const notes = item.reviewHighlights[0] || item.description || 'Open the deep-dive for the full Bes3 read.'
      const ratingLabel = item.rating ? `${item.rating.toFixed(1)} / 5` : 'Signal building'

      return `${index + 1}. ${item.productName} (${humanizeCategory(item.category)}) - ${formatPriceSnapshot(
        item.priceAmount,
        item.priceCurrency || 'USD'
      )} - ${ratingLabel} - ${notes}`
    })
  ].join('\n')
}
