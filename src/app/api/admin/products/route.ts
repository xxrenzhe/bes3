import { NextResponse } from 'next/server'
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

function normalizeInventoryPlatform(platform: string): 'partnerboost' | 'manual' | 'other' {
  if (platform === 'partnerboost_amazon' || platform === 'partnerboost_dtc') return 'partnerboost'
  if (platform === 'manual') return 'manual'
  return 'other'
}

export async function GET() {
  await requireAdmin()
  const db = await getDatabase()
  const products = await db.query(
    `
      SELECT p.*, (
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
    `
  )
  const affiliateProducts = await db.query<AdminAffiliateInventoryRow>(
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
      ORDER BY ap.updated_at DESC, ap.id DESC
    `
  )

  const summary = affiliateProducts.reduce(
    (accumulator, item) => {
      accumulator.totalAffiliateProducts += 1
      if (item.linked_product_id) accumulator.linkedProducts += 1
      else accumulator.inventoryOnlyProducts += 1
      if (item.promo_link || item.short_promo_link) accumulator.withPromoLink += 1
      else accumulator.withoutPromoLink += 1
      if (item.pipeline_status === 'queued' || item.pipeline_status === 'running') {
        accumulator.runningPipelines += 1
      }

      const platform = normalizeInventoryPlatform(item.platform)
      accumulator.platformGroups[platform] = (accumulator.platformGroups[platform] || 0) + 1
      return accumulator
    },
    {
      totalAffiliateProducts: 0,
      linkedProducts: 0,
      inventoryOnlyProducts: 0,
      withPromoLink: 0,
      withoutPromoLink: 0,
      runningPipelines: 0,
      platformGroups: {
        partnerboost: 0,
        manual: 0,
        other: 0
      } as Record<'partnerboost' | 'manual' | 'other', number>
    }
  )

  return NextResponse.json({
    affiliateProducts,
    products,
    summary
  })
}
