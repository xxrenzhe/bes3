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

type ConversionReadiness =
  | 'buy-ready'
  | 'blocked-no-link'
  | 'blocked-price'
  | 'blocked-evidence'
  | 'blocked-stock'
  | 'blocked-risk'

type AdminProductRow = {
  id: number
  affiliate_product_id: number | null
  source_platform: string
  source_affiliate_link: string | null
  resolved_url: string | null
  canonical_url: string | null
  slug: string | null
  brand: string | null
  product_model: string | null
  model_number: string | null
  product_type: string | null
  category_slug: string | null
  product_name: string
  category: string | null
  description: string | null
  price_amount: number | null
  current_price: number | null
  price_currency: string | null
  price_status: string | null
  rating: number | null
  review_count: number | null
  updated_at: string
  hero_image_url: string | null
  last_run_status: string | null
  last_run_stage: string | null
  active_affiliate_links: number | string | null
  available_affiliate_links: number | string | null
  evidence_count: number | string | null
  risk_evidence_count: number | string | null
  advertorial_evidence_count: number | string | null
  out_of_stock_link_issues: number | string | null
  broken_link_issues: number | string | null
  latest_price_entry_status: string | null
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

function hasText(value: string | null | undefined) {
  return Boolean(String(value || '').trim())
}

function buildConversionReadiness(row: AdminProductRow): {
  conversion_readiness: ConversionReadiness
  conversion_blockers: string[]
  conversion_blocker_count: number
} {
  const activeAffiliateLinks = toNumber(row.active_affiliate_links)
  const availableAffiliateLinks = toNumber(row.available_affiliate_links)
  const evidenceCount = toNumber(row.evidence_count)
  const riskEvidenceCount = toNumber(row.risk_evidence_count)
  const advertorialEvidenceCount = toNumber(row.advertorial_evidence_count)
  const outOfStockIssues = toNumber(row.out_of_stock_link_issues)
  const brokenLinkIssues = toNumber(row.broken_link_issues)
  const priceStatus = String(row.price_status || row.latest_price_entry_status || '').trim()
  const hasAffiliatePath = hasText(row.source_affiliate_link) || hasText(row.resolved_url) || activeAffiliateLinks > 0 || availableAffiliateLinks > 0
  const hasPrice = row.current_price != null || row.price_amount != null
  const blockers: string[] = []

  if (!hasAffiliatePath) blockers.push('no-link')
  if (outOfStockIssues > 0 || brokenLinkIssues > 0) blockers.push(outOfStockIssues > 0 ? 'stock' : 'broken-link')
  if (!hasPrice || priceStatus === 'unknown' || priceStatus === 'overpriced') blockers.push(!hasPrice ? 'missing-price' : priceStatus)
  if (evidenceCount <= 0) blockers.push('no-evidence')
  if (riskEvidenceCount > 0 || advertorialEvidenceCount > 0) blockers.push(advertorialEvidenceCount > 0 ? 'advertorial-evidence' : 'weak-evidence')

  let conversionReadiness: ConversionReadiness = 'buy-ready'
  if (!hasAffiliatePath) conversionReadiness = 'blocked-no-link'
  else if (outOfStockIssues > 0 || brokenLinkIssues > 0) conversionReadiness = 'blocked-stock'
  else if (!hasPrice || priceStatus === 'unknown' || priceStatus === 'overpriced') conversionReadiness = 'blocked-price'
  else if (evidenceCount <= 0) conversionReadiness = 'blocked-evidence'
  else if (riskEvidenceCount > 0 || advertorialEvidenceCount > 0) conversionReadiness = 'blocked-risk'

  return {
    conversion_readiness: conversionReadiness,
    conversion_blockers: blockers,
    conversion_blocker_count: blockers.length
  }
}

export async function GET(request: NextRequest) {
  await requireAdmin()
  const db = await getDatabase()
  const { searchParams } = request.nextUrl
  const fullPayload = searchParams.get('full') === '1' || searchParams.get('full') === 'true'
  const productLimit = fullPayload ? 1000 : parseLimit(searchParams.get('productLimit'), 120, 1000)
  const affiliateLimit = fullPayload ? 5000 : parseLimit(searchParams.get('affiliateLimit'), 300, 5000)

  const productRows = await db.query<AdminProductRow>(
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
        p.price_status,
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
        ,
      (
        SELECT COUNT(*)
        FROM affiliate_links al
        WHERE al.product_id = p.id
          AND al.status = 'active'
      ) AS active_affiliate_links,
      (
        SELECT COUNT(*)
        FROM affiliate_links al
        WHERE al.product_id = p.id
          AND al.status IN ('active', 'unknown')
      ) AS available_affiliate_links,
      (
        SELECT COUNT(*)
        FROM analysis_reports ar
        WHERE ar.product_id = p.id
      ) AS evidence_count,
      (
        SELECT COUNT(*)
        FROM analysis_reports ar
        WHERE ar.product_id = p.id
          AND (ar.evidence_confidence < 0.65 OR ar.is_advertorial = 1)
      ) AS risk_evidence_count,
      (
        SELECT COUNT(*)
        FROM analysis_reports ar
        WHERE ar.product_id = p.id
          AND ar.is_advertorial = 1
      ) AS advertorial_evidence_count,
      (
        SELECT COUNT(*)
        FROM link_inspector_results lir
        WHERE lir.product_id = p.id
          AND lir.issue_type = 'out_of_stock'
      ) AS out_of_stock_link_issues,
      (
        SELECT COUNT(*)
        FROM link_inspector_results lir
        WHERE lir.product_id = p.id
          AND lir.issue_type IS NOT NULL
          AND lir.issue_type <> 'out_of_stock'
      ) AS broken_link_issues,
      (
        SELECT pvs.entry_status
        FROM price_value_snapshots pvs
        WHERE pvs.product_id = p.id
        ORDER BY pvs.captured_at DESC, pvs.id DESC
        LIMIT 1
      ) AS latest_price_entry_status
      FROM products p
      ORDER BY p.updated_at DESC, p.id DESC
      LIMIT ?
    `,
    [productLimit]
  )
  const products = productRows.map((row) => ({
    ...row,
    active_affiliate_links: toNumber(row.active_affiliate_links),
    available_affiliate_links: toNumber(row.available_affiliate_links),
    evidence_count: toNumber(row.evidence_count),
    risk_evidence_count: toNumber(row.risk_evidence_count),
    advertorial_evidence_count: toNumber(row.advertorial_evidence_count),
    out_of_stock_link_issues: toNumber(row.out_of_stock_link_issues),
    broken_link_issues: toNumber(row.broken_link_issues),
    ...buildConversionReadiness(row)
  }))
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
