import { categoryMatches, getCategorySlug, normalizeCategoryName } from '@/lib/category'
import { getDatabase } from '@/lib/db'
import { slugify } from '@/lib/slug'

export interface ProductRecord {
  id: number
  slug: string | null
  affiliateProductId: number | null
  brand: string | null
  productName: string
  category: string | null
  description: string | null
  heroImageUrl: string | null
  priceAmount: number | null
  priceCurrency: string | null
  rating: number | null
  reviewCount: number | null
  specs: Record<string, string>
  reviewHighlights: string[]
  resolvedUrl: string | null
  sourceAffiliateLink: string | null
  priceLastCheckedAt: string | null
  offerLastCheckedAt: string | null
  attributeCompletenessScore: number
  dataConfidenceScore: number
  sourceCount: number
  publishedAt: string | null
  updatedAt: string | null
}

export interface ProductOfferRecord {
  id: number
  productId: number
  merchantId: number | null
  merchantName: string | null
  merchantSlug: string | null
  websiteUrl: string | null
  offerUrl: string
  availabilityStatus: string | null
  priceAmount: number | null
  priceCurrency: string | null
  shippingCost: number | null
  couponText: string | null
  couponType: string | null
  referencePriceAmount: number | null
  referencePriceCurrency: string | null
  referencePriceType: string | null
  referencePriceSource: string | null
  referencePriceLastCheckedAt: string | null
  conditionLabel: string | null
  sourceType: string
  sourceUrl: string | null
  confidenceScore: number
  lastCheckedAt: string | null
}

export interface ProductAttributeFactRecord {
  id: number
  productId: number
  attributeKey: string
  attributeLabel: string
  attributeValue: string
  sourceUrl: string | null
  sourceType: string
  confidenceScore: number
  isVerified: boolean
  lastCheckedAt: string | null
}

export interface ProductPriceHistoryRecord {
  id: number
  productId: number
  productOfferId: number | null
  merchantName: string | null
  priceAmount: number | null
  priceCurrency: string | null
  availabilityStatus: string | null
  capturedAt: string | null
}

export interface CommerceProductRecord extends ProductRecord {
  bestOffer: ProductOfferRecord | null
  offerCount: number
  evidenceCount: number
  freshness: 'fresh' | 'recent' | 'stale' | 'unknown'
}

const SEARCH_STOP_WORDS = new Set([
  'a',
  'an',
  'and',
  'best',
  'buy',
  'for',
  'from',
  'i',
  'in',
  'of',
  'or',
  'the',
  'to',
  'under',
  'with'
])

const SITE_DATA_CACHE_TTL_MS = Math.max(
  1000,
  Number.parseInt(process.env.SITE_DATA_CACHE_TTL_MS || '15000', 10) || 15000
)

type AsyncCacheEntry<T> = {
  expiresAt: number
  value: Promise<T>
}

const asyncCache = new Map<string, AsyncCacheEntry<unknown>>()

function withCachedPromise<T>(key: string, factory: () => Promise<T>, ttlMs: number = SITE_DATA_CACHE_TTL_MS): Promise<T> {
  const now = Date.now()
  const existing = asyncCache.get(key) as AsyncCacheEntry<T> | undefined
  if (existing && existing.expiresAt > now) {
    return existing.value
  }

  const value = factory().catch((error) => {
    asyncCache.delete(key)
    throw error
  })
  asyncCache.set(key, {
    expiresAt: now + ttlMs,
    value
  })
  return value
}

function tokenizeSearchTerms(value: string): string[] {
  return Array.from(
    new Set(
      value
        .toLowerCase()
        .split(/[^a-z0-9]+/i)
        .map((term) => term.trim())
        .filter((term) => term.length >= 2 && !SEARCH_STOP_WORDS.has(term))
    )
  )
}

function countMatchedSearchTerms(corpus: string, query: string): number {
  const loweredCorpus = corpus.toLowerCase()
  const loweredQuery = query.trim().toLowerCase()
  if (!loweredQuery) return 0
  if (loweredCorpus.includes(loweredQuery)) return 999

  const terms = tokenizeSearchTerms(loweredQuery)
  if (!terms.length) return 0

  return terms.reduce((total, term) => total + (loweredCorpus.includes(term) ? 1 : 0), 0)
}

export async function getProductGalleryImageUrls(productId: number, limit: number = 6): Promise<string[]> {
  if (!Number.isInteger(productId) || productId <= 0) return []

  const db = await getDatabase()
  const rows = await db.query<{ public_url: string }>(
    `
      SELECT public_url
      FROM product_media_assets
      WHERE product_id = ?
        AND is_public = 1
        AND asset_role IN ('hero', 'gallery')
      ORDER BY
        CASE asset_role
          WHEN 'hero' THEN 0
          WHEN 'gallery' THEN 1
          ELSE 2
        END,
        id ASC
      LIMIT ?
    `,
    [productId, limit]
  )

  return Array.from(new Set(rows.map((row) => row.public_url).filter(Boolean)))
}

export interface ArticleRecord {
  id: number
  productId: number | null
  type: string
  title: string
  slug: string
  summary: string | null
  keyword: string | null
  heroImageUrl: string | null
  contentHtml: string
  seoTitle: string | null
  seoDescription: string | null
  publishedAt: string | null
  createdAt: string | null
  updatedAt: string | null
  product: ProductRecord | null
}

export interface BrandRecord {
  name: string
  slug: string
  productCount: number
  articleCount: number
  categories: string[]
  latestUpdate: string | null
  heroImageUrl: string | null
  description: string | null
}

export interface BrandCategoryRecord {
  brandName: string
  brandSlug: string
  category: string
  productCount: number
  articleCount: number
  latestUpdate: string | null
  heroImageUrl: string | null
  description: string | null
}

export interface BrandPolicyRecord {
  id: number
  brandName: string
  brandSlug: string
  shippingPolicy: string | null
  returnPolicy: string | null
  warrantyPolicy: string | null
  discountWindow: string | null
  supportPolicy: string | null
  sourceUrl: string | null
  sourceType: string
  confidenceScore: number
  lastVerifiedAt: string | null
  updatedAt: string | null
}

export interface CompatibilityFactRecord {
  id: number
  brandName: string
  brandSlug: string
  category: string | null
  factType: string
  factLabel: string
  factValue: string
  sourceUrl: string | null
  sourceType: string
  confidenceScore: number
  isVerified: boolean
  lastCheckedAt: string | null
}

export interface BrandKnowledgeRecord {
  brandSlug: string
  brandPolicy: BrandPolicyRecord | null
  compatibilityFacts: CompatibilityFactRecord[]
}

function parseJsonObject(value: string | null): Record<string, string> {
  if (!value) return {}
  try {
    return JSON.parse(value) as Record<string, string>
  } catch {
    return {}
  }
}

function parseJsonArray(value: string | null): string[] {
  if (!value) return []
  try {
    return JSON.parse(value) as string[]
  } catch {
    return []
  }
}

function parseBoolean(value: unknown): boolean {
  return value === true || value === 1 || value === '1'
}

function normalizeBrandName(value: string | null | undefined) {
  return value?.replace(/\s+/g, ' ').trim() || ''
}

function toTimestamp(value: string | null | undefined) {
  if (!value) return Number.NEGATIVE_INFINITY

  const parsed = Date.parse(value)
  return Number.isNaN(parsed) ? Number.NEGATIVE_INFINITY : parsed
}

function pickLatestDate(values: Array<string | null | undefined>) {
  return values.reduce<string | null>((latest, value) => {
    return toTimestamp(value) > toTimestamp(latest) ? value || null : latest
  }, null)
}

export function getBrandSlug(value: string | null | undefined) {
  const normalized = normalizeBrandName(value)
  return normalized ? slugify(normalized) : ''
}

function getFreshnessBucket(value: string | null | undefined): CommerceProductRecord['freshness'] {
  if (!value) return 'unknown'
  const deltaMs = Date.now() - Date.parse(value)
  if (!Number.isFinite(deltaMs)) return 'unknown'
  if (deltaMs <= 36 * 60 * 60 * 1000) return 'fresh'
  if (deltaMs <= 7 * 24 * 60 * 60 * 1000) return 'recent'
  return 'stale'
}

function mapProductRow(row: any): ProductRecord {
  return {
    id: row.id,
    slug: row.slug,
    affiliateProductId: row.affiliate_product_id ?? null,
    brand: row.brand,
    productName: row.product_name,
    category: row.category,
    description: row.description,
    heroImageUrl: row.hero_image_url || null,
    priceAmount: row.price_amount,
    priceCurrency: row.price_currency,
    rating: row.rating,
    reviewCount: row.review_count,
    specs: parseJsonObject(row.specs_json),
    reviewHighlights: parseJsonArray(row.review_highlights_json),
    resolvedUrl: row.resolved_url,
    sourceAffiliateLink: row.source_affiliate_link || null,
    priceLastCheckedAt: row.price_last_checked_at || null,
    offerLastCheckedAt: row.offer_last_checked_at || null,
    attributeCompletenessScore: Number(row.attribute_completeness_score || 0),
    dataConfidenceScore: Number(row.data_confidence_score || 0),
    sourceCount: Number(row.source_count || 0),
    publishedAt: row.published_at || null,
    updatedAt: row.updated_at || null
  }
}

function mapArticleRow(row: any): ArticleRecord {
  const product = row.product_id
      ? {
        id: row.product_id,
        slug: row.product_slug,
        affiliateProductId: row.affiliate_product_id ?? null,
        brand: row.brand,
        productName: row.product_name,
        category: row.category,
        description: row.product_description,
        heroImageUrl: row.product_hero_image_url || null,
        priceAmount: row.price_amount,
        priceCurrency: row.price_currency,
        rating: row.rating,
        reviewCount: row.review_count,
        specs: parseJsonObject(row.specs_json),
        reviewHighlights: parseJsonArray(row.review_highlights_json),
        resolvedUrl: row.resolved_url,
        sourceAffiliateLink: row.source_affiliate_link || null,
        priceLastCheckedAt: row.price_last_checked_at || null,
        offerLastCheckedAt: row.offer_last_checked_at || null,
        attributeCompletenessScore: Number(row.attribute_completeness_score || 0),
        dataConfidenceScore: Number(row.data_confidence_score || 0),
        sourceCount: Number(row.source_count || 0),
        publishedAt: row.product_published_at || row.product_created_at || null,
        updatedAt: row.product_updated_at || null
      }
    : null
  const publicProduct = product && isPublicProduct(product) ? product : null

  return {
    id: row.id,
    productId: row.product_id,
    type: row.article_type,
    title: row.title,
    slug: row.slug,
    summary: row.summary,
    keyword: row.keyword,
    heroImageUrl: row.hero_image_url,
    contentHtml: row.content_html,
    seoTitle: row.seo_title,
    seoDescription: row.seo_description,
    publishedAt: row.published_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    product: publicProduct
  }
}

function mapBrandPolicyRow(row: any): BrandPolicyRecord {
  return {
    id: row.id,
    brandName: row.brand_name,
    brandSlug: row.brand_slug,
    shippingPolicy: row.shipping_policy || null,
    returnPolicy: row.return_policy || null,
    warrantyPolicy: row.warranty_policy || null,
    discountWindow: row.discount_window || null,
    supportPolicy: row.support_policy || null,
    sourceUrl: row.source_url || null,
    sourceType: row.source_type || 'editorial',
    confidenceScore: Number(row.confidence_score || 0),
    lastVerifiedAt: row.last_verified_at || null,
    updatedAt: row.updated_at || null
  }
}

function mapCompatibilityFactRow(row: any): CompatibilityFactRecord {
  return {
    id: row.id,
    brandName: row.brand_name,
    brandSlug: row.brand_slug,
    category: row.category || null,
    factType: row.fact_type,
    factLabel: row.fact_label,
    factValue: row.fact_value,
    sourceUrl: row.source_url || null,
    sourceType: row.source_type || 'editorial',
    confidenceScore: Number(row.confidence_score || 0),
    isVerified: parseBoolean(row.is_verified),
    lastCheckedAt: row.last_checked_at || null
  }
}

function mapPriceHistoryRow(row: any): ProductPriceHistoryRecord {
  return {
    id: row.id,
    productId: row.product_id,
    productOfferId: row.product_offer_id || null,
    merchantName: row.merchant_name || null,
    priceAmount: row.price_amount,
    priceCurrency: row.price_currency || null,
    availabilityStatus: row.availability_status || null,
    capturedAt: row.captured_at || null
  }
}

const listPublishedArticlesCached = async (): Promise<ArticleRecord[]> => withCachedPromise('listPublishedArticles', async () => {
  const db = await getDatabase()
  const rows = await db.query(
    `
      SELECT a.*, p.slug AS product_slug, p.brand, p.product_name, p.category, p.description AS product_description,
        p.affiliate_product_id, p.source_affiliate_link, p.price_amount, p.price_currency, p.rating, p.review_count, p.specs_json, p.review_highlights_json, p.resolved_url,
        p.price_last_checked_at, p.offer_last_checked_at, p.attribute_completeness_score, p.data_confidence_score, p.source_count,
        p.published_at AS product_published_at, p.created_at AS product_created_at, p.updated_at AS product_updated_at,
        (
          SELECT public_url
          FROM product_media_assets m
          WHERE m.product_id = p.id AND m.asset_role = 'hero'
          ORDER BY m.id ASC
          LIMIT 1
        ) AS product_hero_image_url
      FROM articles a
      LEFT JOIN products p ON p.id = a.product_id
      WHERE a.status = 'published'
      ORDER BY a.published_at DESC, a.id DESC
    `
  )
  return rows.map(mapArticleRow)
})

export async function listPublishedArticles(): Promise<ArticleRecord[]> {
  return listPublishedArticlesCached()
}

const getArticleBySlugCached = async (slug: string): Promise<ArticleRecord | null> => withCachedPromise(`getArticleBySlug:${slug}`, async () => {
  const db = await getDatabase()
  const row = await db.queryOne(
    `
      SELECT a.*, p.slug AS product_slug, p.brand, p.product_name, p.category, p.description AS product_description,
        p.affiliate_product_id, p.source_affiliate_link, p.price_amount, p.price_currency, p.rating, p.review_count, p.specs_json, p.review_highlights_json, p.resolved_url,
        p.price_last_checked_at, p.offer_last_checked_at, p.attribute_completeness_score, p.data_confidence_score, p.source_count,
        p.published_at AS product_published_at, p.created_at AS product_created_at, p.updated_at AS product_updated_at,
        (
          SELECT public_url
          FROM product_media_assets m
          WHERE m.product_id = p.id AND m.asset_role = 'hero'
          ORDER BY m.id ASC
          LIMIT 1
        ) AS product_hero_image_url
      FROM articles a
      LEFT JOIN products p ON p.id = a.product_id
      WHERE a.slug = ? AND a.status = 'published'
      LIMIT 1
    `,
    [slug]
  )
  return row ? mapArticleRow(row) : null
})

export async function getArticleBySlug(slug: string): Promise<ArticleRecord | null> {
  return getArticleBySlugCached(slug)
}

export async function listArticlesByType(type: string): Promise<ArticleRecord[]> {
  const articles = await listPublishedArticles()
  return articles.filter((article) => article.type === type)
}

const listProductsCached = async (): Promise<ProductRecord[]> => withCachedPromise('listProducts', async () => {
  const db = await getDatabase()
  const rows = await db.query<any>(
    `
      SELECT id, slug, brand, product_name, category, description, price_amount, price_currency,
        affiliate_product_id, source_affiliate_link, rating, review_count, specs_json, review_highlights_json, resolved_url,
        price_last_checked_at, offer_last_checked_at, attribute_completeness_score, data_confidence_score, source_count,
        published_at, updated_at,
        (
          SELECT public_url
          FROM product_media_assets m
          WHERE m.product_id = products.id AND m.asset_role = 'hero'
          ORDER BY m.id ASC
          LIMIT 1
        ) AS hero_image_url
      FROM products
      ORDER BY published_at DESC, id DESC
    `
  )

  return rows.map(mapProductRow)
})

export async function listProducts(): Promise<ProductRecord[]> {
  return listProductsCached()
}

const getProductBySlugCached = async (slug: string): Promise<ProductRecord | null> => withCachedPromise(`getProductBySlug:${slug}`, async () => {
  const db = await getDatabase()
  const row = await db.queryOne<any>(
    `
      SELECT id, slug, brand, product_name, category, description, price_amount, price_currency,
        affiliate_product_id, source_affiliate_link, rating, review_count, specs_json, review_highlights_json, resolved_url,
        price_last_checked_at, offer_last_checked_at, attribute_completeness_score, data_confidence_score, source_count,
        published_at, updated_at,
        (
          SELECT public_url
          FROM product_media_assets m
          WHERE m.product_id = products.id AND m.asset_role = 'hero'
          ORDER BY m.id ASC
          LIMIT 1
        ) AS hero_image_url
      FROM products
      WHERE slug = ?
      LIMIT 1
    `,
    [slug]
  )

  if (!row) return null

  return mapProductRow(row)
})

export async function getProductBySlug(slug: string): Promise<ProductRecord | null> {
  return getProductBySlugCached(slug)
}

export async function getProductById(productId: number): Promise<ProductRecord | null> {
  if (!Number.isInteger(productId) || productId <= 0) return null

  const db = await getDatabase()
  const row = await db.queryOne<any>(
    `
      SELECT id, slug, brand, product_name, category, description, price_amount, price_currency,
        affiliate_product_id, source_affiliate_link, rating, review_count, specs_json, review_highlights_json, resolved_url,
        price_last_checked_at, offer_last_checked_at, attribute_completeness_score, data_confidence_score, source_count,
        published_at, updated_at,
        (
          SELECT public_url
          FROM product_media_assets m
          WHERE m.product_id = products.id AND m.asset_role = 'hero'
          ORDER BY m.id ASC
          LIMIT 1
        ) AS hero_image_url
      FROM products
      WHERE id = ?
      LIMIT 1
    `,
    [productId]
  )

  if (!row) return null

  return mapProductRow(row)
}

export async function listProductsByCategory(category: string): Promise<ProductRecord[]> {
  const products = await listProducts()
  return products.filter((product) => categoryMatches(product.category, category))
}

export function isPublicProduct(product: ProductRecord) {
  return Boolean(product.slug && product.affiliateProductId && (product.resolvedUrl || product.sourceAffiliateLink))
}

const listPublishedProductsCached = async (): Promise<ProductRecord[]> => withCachedPromise('listPublishedProducts', async () => {
  const products = await listProducts()
  return products.filter(isPublicProduct)
})

export async function listPublishedProducts(): Promise<ProductRecord[]> {
  return listPublishedProductsCached()
}

export async function listPublishedProductsByIds(ids: number[]): Promise<ProductRecord[]> {
  if (!ids.length) return []

  const products = await listPublishedProducts()
  const byId = new Map(products.map((product) => [product.id, product]))

  return ids.map((id) => byId.get(id)).filter(Boolean) as ProductRecord[]
}

function buildInClause(values: number[]) {
  return values.map(() => '?').join(', ')
}

function rankAvailability(value: string | null | undefined) {
  switch (value) {
    case 'in_stock':
      return 0
    case 'limited':
      return 1
    case 'preorder':
      return 2
    case 'backorder':
      return 3
    case 'out_of_stock':
      return 4
    default:
      return 5
  }
}

function compareOffers(left: ProductOfferRecord, right: ProductOfferRecord) {
  const availabilityDelta = rankAvailability(left.availabilityStatus) - rankAvailability(right.availabilityStatus)
  if (availabilityDelta !== 0) return availabilityDelta
  if (left.priceAmount == null && right.priceAmount != null) return 1
  if (left.priceAmount != null && right.priceAmount == null) return -1
  if (left.priceAmount != null && right.priceAmount != null && left.priceAmount !== right.priceAmount) {
    return left.priceAmount - right.priceAmount
  }
  if (left.confidenceScore !== right.confidenceScore) return right.confidenceScore - left.confidenceScore
  return toTimestamp(right.lastCheckedAt) - toTimestamp(left.lastCheckedAt)
}

function mapOfferRow(row: any): ProductOfferRecord {
  return {
    id: row.id,
    productId: row.product_id,
    merchantId: row.merchant_id ?? null,
    merchantName: row.merchant_name || null,
    merchantSlug: row.merchant_slug || null,
    websiteUrl: row.website_url || null,
    offerUrl: row.offer_url,
    availabilityStatus: row.availability_status || null,
    priceAmount: row.price_amount,
    priceCurrency: row.price_currency || null,
    shippingCost: row.shipping_cost,
    couponText: row.coupon_text || null,
    couponType: row.coupon_type || null,
    referencePriceAmount: row.reference_price_amount,
    referencePriceCurrency: row.reference_price_currency || null,
    referencePriceType: row.reference_price_type || null,
    referencePriceSource: row.reference_price_source || null,
    referencePriceLastCheckedAt: row.reference_price_last_checked_at || null,
    conditionLabel: row.condition_label || null,
    sourceType: row.source_type || 'scrape',
    sourceUrl: row.source_url || null,
    confidenceScore: Number(row.confidence_score || 0),
    lastCheckedAt: row.last_checked_at || null
  }
}

function mapAttributeFactRow(row: any): ProductAttributeFactRecord {
  return {
    id: row.id,
    productId: row.product_id,
    attributeKey: row.attribute_key,
    attributeLabel: row.attribute_label,
    attributeValue: row.attribute_value,
    sourceUrl: row.source_url || null,
    sourceType: row.source_type || 'scrape',
    confidenceScore: Number(row.confidence_score || 0),
    isVerified: parseBoolean(row.is_verified),
    lastCheckedAt: row.last_checked_at || null
  }
}

async function listOffersForProductIds(productIds: number[]): Promise<Map<number, ProductOfferRecord[]>> {
  if (!productIds.length) return new Map()

  const db = await getDatabase()
  const rows = await db.query<any>(
    `
      SELECT po.*, m.name AS merchant_name, m.slug AS merchant_slug, m.website_url
      FROM product_offers po
      LEFT JOIN merchants m ON m.id = po.merchant_id
      WHERE po.product_id IN (${buildInClause(productIds)})
      ORDER BY po.product_id ASC, po.last_checked_at DESC, po.id DESC
    `,
    productIds
  )

  const grouped = new Map<number, ProductOfferRecord[]>()
  for (const row of rows) {
    const mapped = mapOfferRow(row)
    const existing = grouped.get(mapped.productId) || []
    existing.push(mapped)
    grouped.set(mapped.productId, existing)
  }

  for (const [productId, offers] of grouped) {
    grouped.set(productId, offers.sort(compareOffers))
  }

  return grouped
}

async function listAttributeFactCountsForProductIds(productIds: number[]): Promise<Map<number, number>> {
  if (!productIds.length) return new Map()

  const db = await getDatabase()
  const rows = await db.query<{ product_id: number; count: number }>(
    `
      SELECT product_id, COUNT(*) AS count
      FROM product_attribute_facts
      WHERE product_id IN (${buildInClause(productIds)})
      GROUP BY product_id
    `,
    productIds
  )

  return new Map(rows.map((row) => [row.product_id, Number(row.count || 0)]))
}

export async function listProductOffers(productId: number): Promise<ProductOfferRecord[]> {
  const offersByProductId = await listOffersForProductIds([productId])
  return offersByProductId.get(productId) || []
}

export async function listProductPriceHistory(productId: number, limit: number = 30): Promise<ProductPriceHistoryRecord[]> {
  if (!Number.isInteger(productId) || productId <= 0) return []

  const db = await getDatabase()
  const rows = await db.query<any>(
    `
      SELECT h.id, h.product_id, h.product_offer_id, h.price_amount, h.price_currency, h.availability_status, h.captured_at,
        m.name AS merchant_name
      FROM product_price_history h
      LEFT JOIN product_offers o ON o.id = h.product_offer_id
      LEFT JOIN merchants m ON m.id = o.merchant_id
      WHERE h.product_id = ?
      ORDER BY h.captured_at DESC, h.id DESC
      LIMIT ?
    `,
    [productId, Math.max(1, limit)]
  )

  return rows.map(mapPriceHistoryRow)
}

export async function listProductAttributeFacts(productId: number, limit: number = 40): Promise<ProductAttributeFactRecord[]> {
  if (!Number.isInteger(productId) || productId <= 0) return []

  const db = await getDatabase()
  const rows = await db.query<any>(
    `
      SELECT id, product_id, attribute_key, attribute_label, attribute_value, source_url, source_type, confidence_score,
        is_verified, last_checked_at
      FROM product_attribute_facts
      WHERE product_id = ?
      ORDER BY confidence_score DESC, last_checked_at DESC, id DESC
      LIMIT ?
    `,
    [productId, limit]
  )

  return rows.map(mapAttributeFactRow)
}

export async function listOpenCommerceProducts(): Promise<CommerceProductRecord[]> {
  const products = await listPublishedProducts()
  if (!products.length) return []

  const productIds = products.map((product) => product.id)
  const [offersByProductId, evidenceCounts] = await Promise.all([
    listOffersForProductIds(productIds),
    listAttributeFactCountsForProductIds(productIds)
  ])

  return products.map((product) => {
    const offers = offersByProductId.get(product.id) || []
    return {
      ...product,
      bestOffer: offers[0] || null,
      offerCount: offers.length,
      evidenceCount: evidenceCounts.get(product.id) || 0,
      freshness: getFreshnessBucket(product.offerLastCheckedAt || product.priceLastCheckedAt || product.updatedAt)
    }
  })
}

export async function getOpenCommerceProductById(productId: number): Promise<CommerceProductRecord | null> {
  if (!Number.isInteger(productId) || productId <= 0) return null

  const [product, offersByProductId, evidenceCounts] = await Promise.all([
    getProductById(productId),
    listOffersForProductIds([productId]),
    listAttributeFactCountsForProductIds([productId])
  ])

  if (!product || !isPublicProduct(product)) return null

  const offers = offersByProductId.get(productId) || []

  return {
    ...product,
    bestOffer: offers[0] || null,
    offerCount: offers.length,
    evidenceCount: evidenceCounts.get(productId) || 0,
    freshness: getFreshnessBucket(product.offerLastCheckedAt || product.priceLastCheckedAt || product.updatedAt)
  }
}

const getOpenCommerceProductBySlugCached = async (slug: string): Promise<CommerceProductRecord | null> => withCachedPromise(`getOpenCommerceProductBySlug:${slug}`, async () => {
  if (!slug.trim()) return null

  const product = await getProductBySlug(slug)
  if (!product) return null
  return getOpenCommerceProductById(product.id)
})

export async function getOpenCommerceProductBySlug(slug: string): Promise<CommerceProductRecord | null> {
  return getOpenCommerceProductBySlugCached(slug)
}

export async function searchOpenCommerceProducts(query: string, options?: {
  category?: string
  minPrice?: number
  maxPrice?: number
  limit?: number
}): Promise<CommerceProductRecord[]> {
  const lowered = query.trim().toLowerCase()
  const queryTerms = tokenizeSearchTerms(lowered)
  const requiredMatches = lowered ? Math.min(3, Math.max(1, Math.ceil(queryTerms.length / 2))) : 0
  const products = await listOpenCommerceProducts()

  const ranked = products
    .map((product) => {
      const corpus = [
        product.productName,
        product.brand || '',
        product.category || '',
        product.description || '',
        product.reviewHighlights.join(' '),
        ...Object.keys(product.specs),
        ...Object.values(product.specs)
      ]
        .join(' ')
        .toLowerCase()
      const matchedTerms = lowered ? countMatchedSearchTerms(corpus, lowered) : 0

      return {
        product,
        matchedTerms
      }
    })
    .filter(({ product, matchedTerms }) => {
      if (options?.category && !categoryMatches(product.category, options.category)) return false
      if (typeof options?.minPrice === 'number' && (product.bestOffer?.priceAmount ?? product.priceAmount ?? -Infinity) < options.minPrice) return false
      if (typeof options?.maxPrice === 'number' && (product.bestOffer?.priceAmount ?? product.priceAmount ?? Infinity) > options.maxPrice) return false
      if (!lowered) return true
      return matchedTerms === 999 || matchedTerms >= requiredMatches
    })

  return ranked
    .sort((left, right) => {
      if (right.matchedTerms !== left.matchedTerms) return right.matchedTerms - left.matchedTerms
      const freshnessDelta = toTimestamp(right.product.offerLastCheckedAt || right.product.updatedAt) - toTimestamp(left.product.offerLastCheckedAt || left.product.updatedAt)
      if (freshnessDelta !== 0) return freshnessDelta
      return (right.product.dataConfidenceScore || 0) - (left.product.dataConfidenceScore || 0)
    })
    .slice(0, Math.max(1, options?.limit || 12))
    .map(({ product }) => product)
}

export async function searchArticles(query: string): Promise<ArticleRecord[]> {
  const lowered = query.trim().toLowerCase()
  const articles = await listPublishedArticles()
  if (!lowered) return articles
  return articles.filter((article) => {
    return [article.title, article.summary || '', article.keyword || '', article.product?.productName || '']
      .join(' ')
      .toLowerCase()
      .includes(lowered)
  })
}

export async function searchProducts(query: string): Promise<ProductRecord[]> {
  const lowered = query.trim().toLowerCase()
  const products = await listOpenCommerceProducts()
  if (!lowered) return products

  return products.filter((product) => {
    return [product.productName, product.brand || '', product.category || '', product.description || '', product.reviewHighlights.join(' ')]
      .join(' ')
      .toLowerCase()
      .includes(lowered)
  })
}

const listCategoriesCached = async (): Promise<string[]> => withCachedPromise('listCategories', async () => {
  const [products, articles] = await Promise.all([listOpenCommerceProducts(), listPublishedArticles()])
  return Array.from(
    new Set([
      ...products.map((product) => normalizeCategoryName(product.category)).filter(Boolean),
      ...articles.map((article) => normalizeCategoryName(article.product?.category)).filter(Boolean)
    ] as string[])
  ).sort((left, right) => left.localeCompare(right))
})

export async function listCategories(): Promise<string[]> {
  return listCategoriesCached()
}

const listBrandsCached = async (): Promise<BrandRecord[]> => withCachedPromise('listBrands', async () => {
  const [products, articles] = await Promise.all([listOpenCommerceProducts(), listPublishedArticles()])
  const brands = new Map<
    string,
    {
      name: string
      products: ProductRecord[]
      articles: ArticleRecord[]
    }
  >()

  for (const product of products) {
    const brandName = normalizeBrandName(product.brand)
    if (!brandName) continue

    const key = brandName.toLowerCase()
    const existing = brands.get(key)

    if (existing) {
      existing.products.push(product)
      continue
    }

    brands.set(key, {
      name: brandName,
      products: [product],
      articles: []
    })
  }

  for (const article of articles) {
    const brandName = normalizeBrandName(article.product?.brand)
    if (!brandName) continue

    const key = brandName.toLowerCase()
    const existing = brands.get(key)

    if (existing) {
      existing.articles.push(article)
      continue
    }

    brands.set(key, {
      name: brandName,
      products: [],
      articles: [article]
    })
  }

  return Array.from(brands.values())
    .map((brand) => {
      const categories = Array.from(
        new Set([
          ...brand.products.map((product) => normalizeCategoryName(product.category)).filter(Boolean),
          ...brand.articles.map((article) => normalizeCategoryName(article.product?.category)).filter(Boolean)
        ] as string[])
      ).sort((left, right) => left.localeCompare(right))
      const featuredProduct = brand.products[0] || brand.articles.find((article) => article.product)?.product || null
      const featuredArticle = brand.articles[0] || null

      return {
        name: brand.name,
        slug: getBrandSlug(brand.name),
        productCount: brand.products.length,
        articleCount: brand.articles.length,
        categories,
        latestUpdate: pickLatestDate([
          ...brand.products.flatMap((product) => [product.updatedAt, product.publishedAt]),
          ...brand.articles.flatMap((article) => [article.updatedAt, article.publishedAt, article.createdAt])
        ]),
        heroImageUrl: featuredProduct?.heroImageUrl || featuredArticle?.heroImageUrl || null,
        description: featuredArticle?.summary || featuredProduct?.description || null
      }
    })
    .sort((left, right) => {
      const coverageDelta = right.productCount + right.articleCount - (left.productCount + left.articleCount)
      if (coverageDelta !== 0) return coverageDelta

      const freshnessDelta = toTimestamp(right.latestUpdate) - toTimestamp(left.latestUpdate)
      if (freshnessDelta !== 0) return freshnessDelta

      return left.name.localeCompare(right.name)
    })
})

export async function listBrands(): Promise<BrandRecord[]> {
  return listBrandsCached()
}

export async function listBrandPolicies(): Promise<BrandPolicyRecord[]> {
  const db = await getDatabase()
  const rows = await db.query<any>(
    `
      SELECT id, brand_name, brand_slug, shipping_policy, return_policy, warranty_policy, discount_window,
        support_policy, source_url, source_type, confidence_score, last_verified_at, updated_at
      FROM brand_policies
      ORDER BY confidence_score DESC, last_verified_at DESC, brand_name ASC
    `
  )

  return rows.map(mapBrandPolicyRow)
}

export async function getBrandPolicyBySlug(brandSlug: string): Promise<BrandPolicyRecord | null> {
  if (!brandSlug.trim()) return null

  const db = await getDatabase()
  const row = await db.queryOne<any>(
    `
      SELECT id, brand_name, brand_slug, shipping_policy, return_policy, warranty_policy, discount_window,
        support_policy, source_url, source_type, confidence_score, last_verified_at, updated_at
      FROM brand_policies
      WHERE brand_slug = ?
      LIMIT 1
    `,
    [brandSlug]
  )

  return row ? mapBrandPolicyRow(row) : null
}

export async function listCompatibilityFacts(options?: {
  brandSlug?: string
  category?: string
  limit?: number
}): Promise<CompatibilityFactRecord[]> {
  const db = await getDatabase()
  const conditions: string[] = []
  const params: Array<string | number> = []

  if (options?.brandSlug) {
    conditions.push('brand_slug = ?')
    params.push(options.brandSlug)
  }

  if (options?.category) {
    conditions.push('(category = ? OR category IS NULL)')
    params.push(options.category)
  }

  const limit = Math.max(1, options?.limit || 12)
  params.push(limit)

  const rows = await db.query<any>(
    `
      SELECT id, brand_name, brand_slug, category, fact_type, fact_label, fact_value, source_url, source_type,
        confidence_score, is_verified, last_checked_at
      FROM compatibility_facts
      ${conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''}
      ORDER BY
        CASE WHEN category IS NULL THEN 1 ELSE 0 END ASC,
        confidence_score DESC,
        last_checked_at DESC,
        id DESC
      LIMIT ?
    `,
    params
  )

  return rows.map(mapCompatibilityFactRow)
}

export async function listBrandCompatibilityFacts(brandSlug: string, options?: {
  category?: string
  limit?: number
}): Promise<CompatibilityFactRecord[]> {
  if (!brandSlug.trim()) return []

  return listCompatibilityFacts({
    brandSlug,
    category: options?.category,
    limit: options?.limit
  })
}

export async function getBrandKnowledgeByProduct(input: {
  brandName: string | null | undefined
  category?: string | null
  compatibilityLimit?: number
}): Promise<BrandKnowledgeRecord> {
  const brandSlug = getBrandSlug(input.brandName)
  if (!brandSlug) {
    return {
      brandSlug: '',
      brandPolicy: null,
      compatibilityFacts: []
    }
  }

  const [brandPolicy, compatibilityFacts] = await Promise.all([
    getBrandPolicyBySlug(brandSlug),
    listBrandCompatibilityFacts(brandSlug, {
      category: input.category || undefined,
      limit: input.compatibilityLimit
    })
  ])

  return {
    brandSlug,
    brandPolicy,
    compatibilityFacts
  }
}

const listBrandCategoryHubsCached = async (): Promise<BrandCategoryRecord[]> => withCachedPromise('listBrandCategoryHubs', async () => {
  const [products, articles] = await Promise.all([listOpenCommerceProducts(), listPublishedArticles()])
  const hubs = new Map<
    string,
    {
      brandName: string
      category: string
      products: ProductRecord[]
      articles: ArticleRecord[]
    }
  >()

  for (const product of products) {
    const brandName = normalizeBrandName(product.brand)
    const category = normalizeCategoryName(product.category)
    const brandSlug = getBrandSlug(brandName)

    if (!brandName || !brandSlug || !category) continue

    const key = `${brandSlug}::${category}`
    const existing = hubs.get(key)

    if (existing) {
      existing.products.push(product)
      continue
    }

    hubs.set(key, {
      brandName,
      category,
      products: [product],
      articles: []
    })
  }

  for (const article of articles) {
    const brandName = normalizeBrandName(article.product?.brand)
    const category = normalizeCategoryName(article.product?.category)
    const brandSlug = getBrandSlug(brandName)

    if (!brandName || !brandSlug || !category) continue

    const key = `${brandSlug}::${category}`
    const existing = hubs.get(key)

    if (existing) {
      existing.articles.push(article)
      continue
    }

    hubs.set(key, {
      brandName,
      category,
      products: [],
      articles: [article]
    })
  }

  return Array.from(hubs.values())
    .map((hub) => {
      const featuredProduct = hub.products[0] || hub.articles.find((article) => article.product)?.product || null
      const featuredArticle = hub.articles[0] || null

      return {
        brandName: hub.brandName,
        brandSlug: getBrandSlug(hub.brandName),
        category: hub.category,
        productCount: hub.products.length,
        articleCount: hub.articles.length,
        latestUpdate: pickLatestDate([
          ...hub.products.flatMap((product) => [product.updatedAt, product.publishedAt]),
          ...hub.articles.flatMap((article) => [article.updatedAt, article.publishedAt, article.createdAt])
        ]),
        heroImageUrl: featuredProduct?.heroImageUrl || featuredArticle?.heroImageUrl || null,
        description: featuredArticle?.summary || featuredProduct?.description || null
      }
    })
    .sort((left, right) => {
      const coverageDelta = right.productCount + right.articleCount - (left.productCount + left.articleCount)
      if (coverageDelta !== 0) return coverageDelta

      const freshnessDelta = toTimestamp(right.latestUpdate) - toTimestamp(left.latestUpdate)
      if (freshnessDelta !== 0) return freshnessDelta

      const brandDelta = left.brandName.localeCompare(right.brandName)
      if (brandDelta !== 0) return brandDelta

      return left.category.localeCompare(right.category)
    })
})

export async function listBrandCategoryHubs(): Promise<BrandCategoryRecord[]> {
  return listBrandCategoryHubsCached()
}

const getBrandBySlugCached = async (slug: string): Promise<BrandRecord | null> => withCachedPromise(`getBrandBySlug:${slug}`, async () => {
  const brands = await listBrands()
  return brands.find((brand) => brand.slug === slug) || null
})

export async function getBrandBySlug(slug: string): Promise<BrandRecord | null> {
  return getBrandBySlugCached(slug)
}

export async function getBrandCategoryHub(brandSlug: string, category: string): Promise<BrandCategoryRecord | null> {
  const hubs = await listBrandCategoryHubs()
  return hubs.find((hub) => hub.brandSlug === brandSlug && categoryMatches(hub.category, category)) || null
}
