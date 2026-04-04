import { getDatabase } from '@/lib/db'

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
