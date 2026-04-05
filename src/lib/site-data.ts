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
  publishedAt: string | null
  updatedAt: string | null
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
        rating, review_count, specs_json, review_highlights_json, resolved_url, published_at, updated_at,
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
        rating, review_count, specs_json, review_highlights_json, resolved_url, published_at, updated_at,
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
