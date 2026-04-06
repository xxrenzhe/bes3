import type { ArticleRecord, BrandRecord, ProductRecord } from '@/lib/site-data'

export function deslugify(value: string | null | undefined) {
  return String(value || '')
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function normalize(value: string | null | undefined) {
  return String(value || '').toLowerCase().replace(/\s+/g, ' ').trim()
}

function tokenize(value: string | null | undefined) {
  return Array.from(
    new Set(
      normalize(deslugify(value))
        .split(/[^a-z0-9]+/i)
        .map((part) => part.trim())
        .filter((part) => part.length >= 2)
    )
  )
}

function scoreMatch(query: string, candidate: string) {
  const normalizedQuery = normalize(query)
  const normalizedCandidate = normalize(candidate)

  if (!normalizedQuery || !normalizedCandidate) return 0
  if (normalizedCandidate === normalizedQuery) return 1000
  if (normalizedCandidate.includes(normalizedQuery)) return 500

  const queryTerms = tokenize(normalizedQuery)
  if (!queryTerms.length) return 0

  return queryTerms.reduce((score, term) => {
    if (normalizedCandidate.startsWith(term)) return score + 50
    if (normalizedCandidate.includes(term)) return score + 20
    return score
  }, 0)
}

function rankItems<T>(
  items: T[],
  query: string,
  buildCorpus: (item: T) => string,
  tieBreaker: (item: T) => number,
  limit: number
) {
  return items
    .map((item) => ({
      item,
      score: scoreMatch(query, buildCorpus(item))
    }))
    .filter((entry) => entry.score > 0)
    .sort((left, right) => right.score - left.score || tieBreaker(right.item) - tieBreaker(left.item))
    .slice(0, limit)
    .map((entry) => entry.item)
}

function toTimestamp(value: string | null | undefined) {
  if (!value) return 0
  const parsed = Date.parse(value)
  return Number.isFinite(parsed) ? parsed : 0
}

export function findSuggestedCategories(categories: string[], query: string, limit: number = 6) {
  return rankItems(
    categories,
    query,
    (category) => `${category} ${deslugify(category)}`,
    () => 0,
    limit
  )
}

export function findSuggestedBrands(brands: BrandRecord[], query: string, limit: number = 6) {
  return rankItems(
    brands,
    query,
    (brand) => `${brand.name} ${brand.slug} ${brand.categories.join(' ')} ${brand.description || ''}`,
    (brand) => brand.productCount + brand.articleCount,
    limit
  )
}

export function findSuggestedProducts(products: ProductRecord[], query: string, limit: number = 6) {
  return rankItems(
    products,
    query,
    (product) =>
      [
        product.productName,
        product.slug || '',
        product.brand || '',
        product.category || '',
        product.description || ''
      ].join(' '),
    (product) => toTimestamp(product.updatedAt || product.publishedAt),
    limit
  )
}

export function findSuggestedArticles(
  articles: ArticleRecord[],
  query: string,
  options?: {
    type?: string
    limit?: number
  }
) {
  const filtered = options?.type ? articles.filter((article) => article.type === options.type) : articles

  return rankItems(
    filtered,
    query,
    (article) =>
      [
        article.title,
        article.slug,
        article.keyword || '',
        article.summary || '',
        article.product?.productName || '',
        article.product?.brand || '',
        article.product?.category || ''
      ].join(' '),
    (article) => toTimestamp(article.updatedAt || article.publishedAt || article.createdAt),
    options?.limit || 6
  )
}
