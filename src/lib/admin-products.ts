import { getDatabase } from '@/lib/db'
import type { PipelineStage, PipelineStatus } from '@/lib/types'

export interface AdminWorkspaceProduct {
  id: number
  affiliateProductId: number | null
  sourcePlatform: string
  sourceAffiliateLink: string
  resolvedUrl: string | null
  canonicalUrl: string | null
  slug: string | null
  brand: string | null
  productName: string
  category: string | null
  description: string | null
  priceAmount: number | null
  priceCurrency: string | null
  rating: number | null
  reviewCount: number | null
  specs: Record<string, string>
  reviewHighlights: string[]
  updatedAt: string
  publishedAt: string | null
}

export interface AdminWorkspaceAffiliateSource {
  id: number
  platform: string
  productName: string | null
  brand: string | null
  promoLink: string | null
  shortPromoLink: string | null
  productUrl: string | null
  imageUrl: string | null
  commissionRate: number | null
  updatedAt: string
}

export interface AdminWorkspaceMediaAsset {
  id: number
  assetRole: string
  publicUrl: string
  sourceUrl: string | null
  mimeType: string | null
  checksum: string | null
  createdAt: string
}

export interface AdminWorkspaceKeyword {
  id: number
  keyword: string
  buyerIntent: number
  serpWeakness: number
  commissionPotential: number
  contentFit: number
  freshness: number
  totalScore: number
}

export interface AdminWorkspaceArticle {
  id: number
  articleType: string
  title: string
  slug: string
  status: string
  summary: string | null
  keyword: string | null
  seoTitle: string | null
  seoDescription: string | null
  publishedAt: string | null
  updatedAt: string
}

export interface AdminWorkspaceSeoPage {
  id: number
  articleId: number | null
  articleTitle: string | null
  pageType: string
  pathname: string
  title: string
  metaDescription: string
  status: string
  publishedAt: string | null
  updatedAt: string
}

export interface AdminWorkspaceRun {
  id: number
  status: PipelineStatus
  currentStage: PipelineStage | null
  errorMessage: string | null
  sourceLink: string
  createdAt: string
  updatedAt: string
}

export interface AdminWorkspaceJob {
  id: number
  stage: PipelineStage
  status: string
  message: string | null
  startedAt: string | null
  finishedAt: string | null
}

export interface AdminProductWorkspace {
  product: AdminWorkspaceProduct
  affiliateSource: AdminWorkspaceAffiliateSource | null
  mediaAssets: AdminWorkspaceMediaAsset[]
  keywords: AdminWorkspaceKeyword[]
  articles: AdminWorkspaceArticle[]
  seoPages: AdminWorkspaceSeoPage[]
  recentRuns: AdminWorkspaceRun[]
  latestRunJobs: AdminWorkspaceJob[]
}

type ProductRow = {
  id: number
  affiliate_product_id: number | null
  source_platform: string
  source_affiliate_link: string
  resolved_url: string | null
  canonical_url: string | null
  slug: string | null
  brand: string | null
  product_name: string
  category: string | null
  description: string | null
  price_amount: number | null
  price_currency: string | null
  rating: number | null
  review_count: number | null
  specs_json: string | null
  review_highlights_json: string | null
  updated_at: string
  published_at: string | null
}

type AffiliateRow = {
  id: number
  platform: string
  product_name: string | null
  brand: string | null
  promo_link: string | null
  short_promo_link: string | null
  product_url: string | null
  image_url: string | null
  commission_rate: number | null
  updated_at: string
}

type MediaRow = {
  id: number
  asset_role: string
  public_url: string
  source_url: string | null
  mime_type: string | null
  checksum: string | null
  created_at: string
}

type KeywordRow = {
  id: number
  keyword: string
  buyer_intent: number
  serp_weakness: number
  commission_potential: number
  content_fit: number
  freshness: number
  total_score: number
}

type ArticleRow = {
  id: number
  article_type: string
  title: string
  slug: string
  status: string
  summary: string | null
  keyword: string | null
  seo_title: string | null
  seo_description: string | null
  published_at: string | null
  updated_at: string
}

type SeoPageRow = {
  id: number
  article_id: number | null
  article_title: string | null
  page_type: string
  pathname: string
  title: string
  meta_description: string
  status: string
  published_at: string | null
  updated_at: string
}

type RunRow = {
  id: number
  status: PipelineStatus
  current_stage: PipelineStage | null
  error_message: string | null
  source_link: string
  created_at: string
  updated_at: string
}

type JobRow = {
  id: number
  stage: PipelineStage
  status: string
  message: string | null
  started_at: string | null
  finished_at: string | null
}

function parseObject(value: string | null): Record<string, string> {
  if (!value) return {}
  try {
    return JSON.parse(value) as Record<string, string>
  } catch {
    return {}
  }
}

function parseArray(value: string | null): string[] {
  if (!value) return []
  try {
    return JSON.parse(value) as string[]
  } catch {
    return []
  }
}

export async function getAdminProductWorkspace(productId: number): Promise<AdminProductWorkspace | null> {
  const db = await getDatabase()
  const productRow = await db.queryOne<ProductRow>(
    `
      SELECT id, affiliate_product_id, source_platform, source_affiliate_link, resolved_url, canonical_url, slug, brand,
        product_name, category, description, price_amount, price_currency, rating, review_count, specs_json,
        review_highlights_json, updated_at, published_at
      FROM products
      WHERE id = ?
      LIMIT 1
    `,
    [productId]
  )

  if (!productRow) return null

  const [affiliateRow, mediaRows, keywordRows, articleRows, seoPageRows, runRows] = await Promise.all([
    productRow.affiliate_product_id
      ? db.queryOne<AffiliateRow>(
          `
            SELECT id, platform, product_name, brand, promo_link, short_promo_link, product_url, image_url,
              commission_rate, updated_at
            FROM affiliate_products
            WHERE id = ?
            LIMIT 1
          `,
          [productRow.affiliate_product_id]
        )
      : Promise.resolve(undefined),
    db.query<MediaRow>(
      `
        SELECT id, asset_role, public_url, source_url, mime_type, checksum, created_at
        FROM product_media_assets
        WHERE product_id = ?
        ORDER BY
          CASE asset_role
            WHEN 'hero' THEN 0
            WHEN 'gallery' THEN 1
            WHEN 'review' THEN 2
            ELSE 3
          END,
          id ASC
      `,
      [productId]
    ),
    db.query<KeywordRow>(
      `
        SELECT id, keyword, buyer_intent, serp_weakness, commission_potential, content_fit, freshness, total_score
        FROM keyword_opportunities
        WHERE product_id = ?
        ORDER BY total_score DESC, id DESC
      `,
      [productId]
    ),
    db.query<ArticleRow>(
      `
        SELECT id, article_type, title, slug, status, summary, keyword, seo_title, seo_description, published_at, updated_at
        FROM articles
        WHERE product_id = ?
        ORDER BY published_at DESC, id DESC
      `,
      [productId]
    ),
    db.query<SeoPageRow>(
      `
        SELECT s.id, s.article_id, a.title AS article_title, s.page_type, s.pathname, s.title, s.meta_description,
          s.status, s.published_at, s.updated_at
        FROM seo_pages s
        LEFT JOIN articles a ON a.id = s.article_id
        WHERE a.product_id = ?
        ORDER BY s.updated_at DESC, s.id DESC
      `,
      [productId]
    ),
    db.query<RunRow>(
      `
        SELECT id, status, current_stage, error_message, source_link, created_at, updated_at
        FROM content_pipeline_runs
        WHERE product_id = ? OR affiliate_product_id = ? OR source_link = ?
        ORDER BY updated_at DESC, id DESC
        LIMIT 8
      `,
      [productId, productRow.affiliate_product_id, productRow.source_affiliate_link]
    )
  ])

  const latestRun = runRows[0]
  const latestRunJobs = latestRun
    ? await db.query<JobRow>(
        `
          SELECT id, stage, status, message, started_at, finished_at
          FROM content_pipeline_jobs
          WHERE run_id = ?
          ORDER BY id ASC
        `,
        [latestRun.id]
      )
    : []

  return {
    product: {
      id: productRow.id,
      affiliateProductId: productRow.affiliate_product_id,
      sourcePlatform: productRow.source_platform,
      sourceAffiliateLink: productRow.source_affiliate_link,
      resolvedUrl: productRow.resolved_url,
      canonicalUrl: productRow.canonical_url,
      slug: productRow.slug,
      brand: productRow.brand,
      productName: productRow.product_name,
      category: productRow.category,
      description: productRow.description,
      priceAmount: productRow.price_amount,
      priceCurrency: productRow.price_currency,
      rating: productRow.rating,
      reviewCount: productRow.review_count,
      specs: parseObject(productRow.specs_json),
      reviewHighlights: parseArray(productRow.review_highlights_json),
      updatedAt: productRow.updated_at,
      publishedAt: productRow.published_at
    },
    affiliateSource: affiliateRow
      ? {
          id: affiliateRow.id,
          platform: affiliateRow.platform,
          productName: affiliateRow.product_name,
          brand: affiliateRow.brand,
          promoLink: affiliateRow.promo_link,
          shortPromoLink: affiliateRow.short_promo_link,
          productUrl: affiliateRow.product_url,
          imageUrl: affiliateRow.image_url,
          commissionRate: affiliateRow.commission_rate,
          updatedAt: affiliateRow.updated_at
        }
      : null,
    mediaAssets: mediaRows.map((item) => ({
      id: item.id,
      assetRole: item.asset_role,
      publicUrl: item.public_url,
      sourceUrl: item.source_url,
      mimeType: item.mime_type,
      checksum: item.checksum,
      createdAt: item.created_at
    })),
    keywords: keywordRows.map((item) => ({
      id: item.id,
      keyword: item.keyword,
      buyerIntent: item.buyer_intent,
      serpWeakness: item.serp_weakness,
      commissionPotential: item.commission_potential,
      contentFit: item.content_fit,
      freshness: item.freshness,
      totalScore: item.total_score
    })),
    articles: articleRows.map((item) => ({
      id: item.id,
      articleType: item.article_type,
      title: item.title,
      slug: item.slug,
      status: item.status,
      summary: item.summary,
      keyword: item.keyword,
      seoTitle: item.seo_title,
      seoDescription: item.seo_description,
      publishedAt: item.published_at,
      updatedAt: item.updated_at
    })),
    seoPages: seoPageRows.map((item) => ({
      id: item.id,
      articleId: item.article_id,
      articleTitle: item.article_title,
      pageType: item.page_type,
      pathname: item.pathname,
      title: item.title,
      metaDescription: item.meta_description,
      status: item.status,
      publishedAt: item.published_at,
      updatedAt: item.updated_at
    })),
    recentRuns: runRows.map((item) => ({
      id: item.id,
      status: item.status,
      currentStage: item.current_stage,
      errorMessage: item.error_message,
      sourceLink: item.source_link,
      createdAt: item.created_at,
      updatedAt: item.updated_at
    })),
    latestRunJobs: latestRunJobs.map((item) => ({
      id: item.id,
      stage: item.stage,
      status: item.status,
      message: item.message,
      startedAt: item.started_at,
      finishedAt: item.finished_at
    }))
  }
}
