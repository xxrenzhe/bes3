import { getDatabase } from '@/lib/db'
import { slugify } from '@/lib/slug'

export interface ProductRecord {
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
  specs: Record<string, string>
  reviewHighlights: string[]
  resolvedUrl: string | null
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

export interface CommerceProductRecord extends ProductRecord {
  bestOffer: ProductOfferRecord | null
  offerCount: number
  evidenceCount: number
  freshness: 'fresh' | 'recent' | 'stale' | 'unknown'
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
        priceLastCheckedAt: row.price_last_checked_at || null,
        offerLastCheckedAt: row.offer_last_checked_at || null,
        attributeCompletenessScore: Number(row.attribute_completeness_score || 0),
        dataConfidenceScore: Number(row.data_confidence_score || 0),
        sourceCount: Number(row.source_count || 0),
        publishedAt: row.product_published_at || row.product_created_at || null,
        updatedAt: row.product_updated_at || null
      }
    : null

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
    product
  }
}

export async function listPublishedArticles(): Promise<ArticleRecord[]> {
  const db = await getDatabase()
  const rows = await db.query(
    `
      SELECT a.*, p.slug AS product_slug, p.brand, p.product_name, p.category, p.description AS product_description,
        p.price_amount, p.price_currency, p.rating, p.review_count, p.specs_json, p.review_highlights_json, p.resolved_url,
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
}

export async function getArticleBySlug(slug: string): Promise<ArticleRecord | null> {
  const db = await getDatabase()
  const row = await db.queryOne(
    `
      SELECT a.*, p.slug AS product_slug, p.brand, p.product_name, p.category, p.description AS product_description,
        p.price_amount, p.price_currency, p.rating, p.review_count, p.specs_json, p.review_highlights_json, p.resolved_url,
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
}

export async function listArticlesByType(type: string): Promise<ArticleRecord[]> {
  const articles = await listPublishedArticles()
  return articles.filter((article) => article.type === type)
}

export async function listProducts(): Promise<ProductRecord[]> {
  const db = await getDatabase()
  const rows = await db.query<any>(
    `
      SELECT id, slug, brand, product_name, category, description, price_amount, price_currency,
        rating, review_count, specs_json, review_highlights_json, resolved_url,
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
}

export async function getProductBySlug(slug: string): Promise<ProductRecord | null> {
  const db = await getDatabase()
  const row = await db.queryOne<any>(
    `
      SELECT id, slug, brand, product_name, category, description, price_amount, price_currency,
        rating, review_count, specs_json, review_highlights_json, resolved_url,
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
}

export async function listProductsByCategory(category: string): Promise<ProductRecord[]> {
  const products = await listProducts()
  return products.filter((product) => product.category === category)
}

export function isPublicProduct(product: ProductRecord) {
  return Boolean(product.slug)
}

export async function listPublishedProducts(): Promise<ProductRecord[]> {
  const products = await listProducts()
  return products.filter(isPublicProduct)
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

  const products = await listOpenCommerceProducts()
  return products.find((product) => product.id === productId) || null
}

export async function searchOpenCommerceProducts(query: string, options?: {
  category?: string
  minPrice?: number
  maxPrice?: number
  limit?: number
}): Promise<CommerceProductRecord[]> {
  const lowered = query.trim().toLowerCase()
  const products = await listOpenCommerceProducts()

  const filtered = products.filter((product) => {
    if (options?.category && product.category !== options.category) return false
    if (typeof options?.minPrice === 'number' && (product.bestOffer?.priceAmount ?? product.priceAmount ?? -Infinity) < options.minPrice) return false
    if (typeof options?.maxPrice === 'number' && (product.bestOffer?.priceAmount ?? product.priceAmount ?? Infinity) > options.maxPrice) return false
    if (!lowered) return true

    return [
      product.productName,
      product.brand || '',
      product.category || '',
      product.description || '',
      product.reviewHighlights.join(' '),
      ...Object.values(product.specs)
    ]
      .join(' ')
      .toLowerCase()
      .includes(lowered)
  })

  return filtered
    .sort((left, right) => {
      const freshnessDelta = toTimestamp(right.offerLastCheckedAt || right.updatedAt) - toTimestamp(left.offerLastCheckedAt || left.updatedAt)
      if (freshnessDelta !== 0) return freshnessDelta
      return (right.dataConfidenceScore || 0) - (left.dataConfidenceScore || 0)
    })
    .slice(0, Math.max(1, options?.limit || 12))
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
  const products = await listPublishedProducts()
  if (!lowered) return products

  return products.filter((product) => {
    return [product.productName, product.brand || '', product.category || '', product.description || '', product.reviewHighlights.join(' ')]
      .join(' ')
      .toLowerCase()
      .includes(lowered)
  })
}

export async function listCategories(): Promise<string[]> {
  const [products, articles] = await Promise.all([listPublishedProducts(), listPublishedArticles()])
  return Array.from(
    new Set([
      ...products.map((product) => product.category).filter(Boolean),
      ...articles.map((article) => article.product?.category).filter(Boolean)
    ] as string[])
  ).sort()
}

export async function listBrands(): Promise<BrandRecord[]> {
  const [products, articles] = await Promise.all([listPublishedProducts(), listPublishedArticles()])
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
          ...brand.products.map((product) => product.category).filter(Boolean),
          ...brand.articles.map((article) => article.product?.category).filter(Boolean)
        ] as string[])
      ).sort()
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
}

export async function listBrandCategoryHubs(): Promise<BrandCategoryRecord[]> {
  const [products, articles] = await Promise.all([listPublishedProducts(), listPublishedArticles()])
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
    const category = product.category?.trim() || ''
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
    const category = article.product?.category?.trim() || ''
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
}

export async function getBrandBySlug(slug: string): Promise<BrandRecord | null> {
  const brands = await listBrands()
  return brands.find((brand) => brand.slug === slug) || null
}

export async function getBrandCategoryHub(brandSlug: string, category: string): Promise<BrandCategoryRecord | null> {
  const hubs = await listBrandCategoryHubs()
  return hubs.find((hub) => hub.brandSlug === brandSlug && hub.category === category) || null
}
