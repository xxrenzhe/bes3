import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { getDatabase } from '@/lib/db'

type AdminAffiliateInventoryRow = {
  id: number
  platform: string
  external_id: string
  merchant_id: string | null
  asin: string | null
  brand: string | null
  product_name: string | null
  product_model: string | null
  model_number: string | null
  product_type: string | null
  category: string | null
  category_slug: string | null
  product_url: string | null
  promo_link: string | null
  short_promo_link: string | null
  image_url: string | null
  price_amount: number | null
  price_currency: string | null
  commission_rate: number | null
  review_count: number | null
  rating: number | null
  country_code: string | null
  created_at: string
  updated_at: string
  linked_product_id: number | null
  linked_product_slug: string | null
  linked_product_name: string | null
  linked_product_price_amount: number | null
  linked_product_updated_at: string | null
  pipeline_status: string | null
  pipeline_stage: string | null
  hero_image_url: string | null
}

type AdminProductsSummaryRow = {
  total_affiliate_products: number | string | null
  linked_products: number | string | null
  inventory_only_products: number | string | null
  with_promo_link: number | string | null
  without_promo_link: number | string | null
  running_pipelines: number | string | null
  partnerboost_products: number | string | null
  manual_products: number | string | null
  other_products: number | string | null
}

function parseLimit(value: string | null, fallback: number, maximum: number) {
  if (!value) return fallback
  if (value === 'all' || value === 'full') return maximum
  const parsed = Number.parseInt(value, 10)
  if (!Number.isFinite(parsed) || parsed < 0) return fallback
  return Math.min(parsed, maximum)
}

function toNumber(value: number | string | null | undefined) {
  return Number(value || 0)
}

export async function GET(request: NextRequest) {
  await requireAdmin()
  const db = await getDatabase()
  const { searchParams } = request.nextUrl
  const fullPayload = searchParams.get('full') === '1' || searchParams.get('full') === 'true'
  const productLimit = fullPayload ? 1000 : parseLimit(searchParams.get('productLimit'), 120, 1000)
  const affiliateLimit = fullPayload ? 5000 : parseLimit(searchParams.get('affiliateLimit'), 300, 5000)

  const products = await db.query(
    `
      SELECT
        p.id,
        p.affiliate_product_id,
        p.source_platform,
        p.source_affiliate_link,
        p.resolved_url,
        p.canonical_url,
        p.slug,
        p.brand,
        p.product_model,
        p.model_number,
        p.product_type,
        p.category_slug,
        p.product_name,
        p.category,
        p.description,
        p.price_amount,
        p.current_price,
        p.price_currency,
        p.rating,
        p.review_count,
        p.updated_at,
        (
        SELECT public_url
        FROM product_media_assets m
        WHERE m.product_id = p.id AND m.asset_role = 'hero'
        ORDER BY m.id ASC
        LIMIT 1
      ) AS hero_image_url,
      (
        SELECT status
        FROM content_pipeline_runs r
        WHERE r.product_id = p.id
        ORDER BY r.updated_at DESC, r.id DESC
        LIMIT 1
      ) AS last_run_status,
      (
        SELECT current_stage
        FROM content_pipeline_runs r
        WHERE r.product_id = p.id
        ORDER BY r.updated_at DESC, r.id DESC
        LIMIT 1
      ) AS last_run_stage
      FROM products p
      ORDER BY p.updated_at DESC, p.id DESC
      LIMIT ?
    `,
    [productLimit]
  )
  const [affiliateProducts, summaryRow] = await Promise.all([
    db.query<AdminAffiliateInventoryRow>(
      `
        SELECT
          ap.id,
          ap.platform,
          ap.external_id,
          ap.merchant_id,
          ap.asin,
          ap.brand,
          ap.product_name,
          ap.product_model,
          ap.model_number,
          ap.product_type,
          ap.category,
          ap.category_slug,
          ap.product_url,
          ap.promo_link,
          ap.short_promo_link,
          ap.image_url,
          ap.price_amount,
          ap.price_currency,
          ap.commission_rate,
          ap.review_count,
          ap.rating,
          ap.country_code,
          ap.created_at,
          ap.updated_at,
          p.id AS linked_product_id,
          p.slug AS linked_product_slug,
          p.product_name AS linked_product_name,
          p.price_amount AS linked_product_price_amount,
          p.updated_at AS linked_product_updated_at,
          (
            SELECT r.status
            FROM content_pipeline_runs r
            WHERE r.product_id = p.id OR r.affiliate_product_id = ap.id
            ORDER BY r.updated_at DESC, r.id DESC
            LIMIT 1
          ) AS pipeline_status,
          (
            SELECT r.current_stage
            FROM content_pipeline_runs r
            WHERE r.product_id = p.id OR r.affiliate_product_id = ap.id
            ORDER BY r.updated_at DESC, r.id DESC
            LIMIT 1
          ) AS pipeline_stage,
          (
            SELECT m.public_url
            FROM product_media_assets m
            WHERE m.product_id = p.id AND m.asset_role = 'hero'
            ORDER BY m.id ASC
            LIMIT 1
          ) AS hero_image_url
        FROM affiliate_products ap
        LEFT JOIN products p ON p.affiliate_product_id = ap.id
        ORDER BY
          CASE WHEN ap.promo_link IS NOT NULL OR ap.short_promo_link IS NOT NULL THEN 0 ELSE 1 END,
          CASE WHEN p.id IS NOT NULL THEN 0 ELSE 1 END,
          ap.updated_at DESC,
          ap.id DESC
        LIMIT ?
      `,
      [affiliateLimit]
    ),
    db.queryOne<AdminProductsSummaryRow>(
      `
        SELECT
          COUNT(*) AS total_affiliate_products,
          SUM(CASE WHEN p.id IS NOT NULL THEN 1 ELSE 0 END) AS linked_products,
          SUM(CASE WHEN p.id IS NULL THEN 1 ELSE 0 END) AS inventory_only_products,
          SUM(CASE WHEN ap.promo_link IS NOT NULL OR ap.short_promo_link IS NOT NULL THEN 1 ELSE 0 END) AS with_promo_link,
          SUM(CASE WHEN ap.promo_link IS NULL AND ap.short_promo_link IS NULL THEN 1 ELSE 0 END) AS without_promo_link,
          SUM(CASE WHEN (
            SELECT r.status
            FROM content_pipeline_runs r
            WHERE r.product_id = p.id OR r.affiliate_product_id = ap.id
            ORDER BY r.updated_at DESC, r.id DESC
            LIMIT 1
          ) IN ('queued', 'running') THEN 1 ELSE 0 END) AS running_pipelines,
          SUM(CASE WHEN ap.platform IN ('partnerboost_amazon', 'partnerboost_dtc') THEN 1 ELSE 0 END) AS partnerboost_products,
          SUM(CASE WHEN ap.platform = 'manual' THEN 1 ELSE 0 END) AS manual_products,
          SUM(CASE WHEN ap.platform NOT IN ('partnerboost_amazon', 'partnerboost_dtc', 'manual') OR ap.platform IS NULL THEN 1 ELSE 0 END) AS other_products
        FROM affiliate_products ap
        LEFT JOIN products p ON p.affiliate_product_id = ap.id
      `
    )
  ])

  const summary = {
    totalAffiliateProducts: toNumber(summaryRow?.total_affiliate_products),
    linkedProducts: toNumber(summaryRow?.linked_products),
    inventoryOnlyProducts: toNumber(summaryRow?.inventory_only_products),
    withPromoLink: toNumber(summaryRow?.with_promo_link),
    withoutPromoLink: toNumber(summaryRow?.without_promo_link),
    runningPipelines: toNumber(summaryRow?.running_pipelines),
    platformGroups: {
      partnerboost: toNumber(summaryRow?.partnerboost_products),
      manual: toNumber(summaryRow?.manual_products),
      other: toNumber(summaryRow?.other_products)
    } as Record<'partnerboost' | 'manual' | 'other', number>
  }

  return NextResponse.json({
    affiliateProducts,
    products,
    meta: {
      compact: !fullPayload,
      affiliateProductsReturned: affiliateProducts.length,
      productsReturned: products.length,
      affiliateLimit,
      productLimit
    },
    summary
  })
}
