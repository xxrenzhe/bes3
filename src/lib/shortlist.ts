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
