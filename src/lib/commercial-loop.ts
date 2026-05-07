import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { fetchWithBrowserProxy, getBrowserProxyUrl } from '@/lib/browser-proxy'
import { buildSeoPagePersistencePayload } from '@/lib/seo-page-payload'
import { dispatchSeoNotifications } from '@/lib/seo-ops'
import { getDatabase } from '@/lib/db'
import { runDeepProductScrapeTask } from '@/lib/deep-product-scraper'
import { extractJsonTextBlock, generateGeminiContent } from '@/lib/gemini'
import {
  HARDCORE_CATEGORIES,
  formatHardcorePrice,
  listHardcoreTags,
  summarizeConsensus,
  summarizePriceValue,
  type EvidenceReport,
  type HardcoreRating,
  type HardcoreTag
} from '@/lib/hardcore'
import { buildVideoEvidencePrompt, parseVideoEvidenceWithRetry, shouldKeepPositiveEvidence } from '@/lib/hardcore-prompts'
import {
  auditCommissionBlindCandidateOrder,
  isCommercialFocusCategory,
  scoreCommissionBlindCandidate,
  type CommissionBlindAudit
} from '@/lib/recommendation-quality'
import { getArticlePath } from '@/lib/article-path'
import { isPublicEvidenceUsable } from '@/lib/evidence-quality'
import { escapeHtml } from '@/lib/html'
import { getCommissionableMerchantUrl } from '@/lib/merchant-links'
import { slugify } from '@/lib/slug'
import { toAbsoluteUrl } from '@/lib/site-url'
import { syncPartnerboostAmazonProducts, syncPartnerboostDtcProducts } from '@/lib/partnerboost'

export interface CommercialLoopOptions {
  limit?: number
  minScore?: number
  syncPlatform?: 'none' | 'amazon' | 'dtc' | 'all'
  execute?: boolean
  discoverVideos?: boolean
  enrichProducts?: boolean
  fetchTranscripts?: boolean
  extractEvidence?: boolean
  publishArticles?: boolean
  pushIndex?: boolean
  maxVideosPerProduct?: number
}

export interface CommercialLoopCandidate {
  affiliateProductId: number
  productId: number | null
  platform: string
  productName: string
  brand: string | null
  asin: string | null
  category: string | null
  categorySlug: string | null
  promoLink: string | null
  productUrl: string | null
  priceAmount: number | null
  priceCurrency: string | null
  commissionRate: number | null
  reviewCount: number | null
  rating: number | null
  expectedCommissionValue: number | null
  dataFreshnessDays: number | null
  youtubeMatchTerms: string[]
  evidenceCount: number
  videoCount: number
  merchantClicks: number
  reviewValueScore: number
  commissionBlindReviewScore: number
  commissionInfluenceDelta: number
  reasons: string[]
}

export interface CommercialLoopResult {
  ok: boolean
  execute: boolean
  options: Required<CommercialLoopOptions>
  sync: {
    amazon?: unknown
    dtc?: unknown
  }
  candidates: CommercialLoopCandidate[]
  selected: CommercialLoopCandidate[]
  videosDiscovered: number
  transcriptsFetched: number
  evidenceReportsWritten: number
  articlesPublished: Array<{
    productId: number
    articleId: number
    seoPageId: number
    path: string
    title: string
  }>
  commissionBlindAudit: CommissionBlindAudit
  indexing: string
  skipped: Array<{
    scope: string
    reason: string
    detail?: unknown
  }>
}

export interface CommercialLoopEvidenceImportInput {
  affiliateProductId?: number
  productId?: number
  youtubeId?: string
  videoTitle?: string
  channelName?: string
  channelUrl?: string | null
  transcript?: string
  tagSlug?: string
  rating?: HardcoreRating
  evidenceQuote?: string
  contextSnippet?: string
  timestampSeconds?: number
  evidenceConfidence?: number
  publishArticle?: boolean
}

interface AffiliateCandidateRow {
  affiliate_product_id: number
  product_id: number | null
  platform: string
  asin: string | null
  brand: string | null
  product_name: string | null
  category: string | null
  category_slug: string | null
  promo_link: string | null
  short_promo_link: string | null
  product_url: string | null
  image_url: string | null
  price_amount: number | null
  price_currency: string | null
  commission_rate: number | null
  review_count: number | null
  rating: number | null
  updated_at: string | null
  expected_commission_value: number | null
  data_freshness_days: number | null
  youtube_match_terms_json: string | null
  evidence_count: number | null
  video_count: number | null
  merchant_clicks: number | null
}

interface ProductArticleRow {
  id: number
  slug: string | null
  brand: string | null
  product_model: string | null
  model_number: string | null
  product_name: string
  category: string | null
  category_slug: string | null
  description: string | null
  price_amount: number | null
  price_currency: string | null
  current_price: number | null
  hist_low_price: number | null
  avg_90d_price: number | null
  source_affiliate_link: string | null
  active_affiliate_url: string | null
  resolved_url: string | null
  hero_image_url: string | null
}

interface VideoSearchResult {
  youtubeId: string
  title: string
  channelName: string
  channelUrl: string | null
  publishedAt: string | null
  description: string | null
}

interface VideoRow {
  id: number
  youtube_id: string
  title: string
  channel_name: string
  channel_url: string | null
  video_type: string
  transcript: string | null
  description: string | null
  entity_match_json: string | null
}

const DEFAULT_OPTIONS: Required<CommercialLoopOptions> = {
  limit: 10,
  minScore: 65,
  syncPlatform: 'none',
  execute: false,
  discoverVideos: true,
  enrichProducts: false,
  fetchTranscripts: false,
  extractEvidence: true,
  publishArticles: true,
  pushIndex: false,
  maxVideosPerProduct: 3
}

const RATING_TO_SCORE: Record<HardcoreRating, number> = {
  Excellent: 5,
  Good: 4,
  Average: 3,
  Struggles: 2,
  Fails: 1
}

function normalizeOptions(input: CommercialLoopOptions = {}): Required<CommercialLoopOptions> {
  return {
    ...DEFAULT_OPTIONS,
    ...input,
    limit: Math.max(1, Math.min(Number(input.limit || DEFAULT_OPTIONS.limit), 100)),
    minScore: Math.max(0, Math.min(Number(input.minScore ?? DEFAULT_OPTIONS.minScore), 100)),
    maxVideosPerProduct: Math.max(1, Math.min(Number(input.maxVideosPerProduct || DEFAULT_OPTIONS.maxVideosPerProduct), 10))
  }
}

function parseJsonArray(value: unknown): string[] {
  if (!value) return []
  if (Array.isArray(value)) return value.map((item) => String(item)).filter(Boolean)
  try {
    const parsed = typeof value === 'string' ? JSON.parse(value) : value
    if (Array.isArray(parsed)) return parsed.map((item) => String(item)).filter(Boolean)
  } catch {
    return []
  }
  return []
}

function normalizeText(value: string | null | undefined) {
  return String(value || '').replace(/\s+/g, ' ').trim()
}

function normalizeYoutubeId(value: unknown) {
  const raw = normalizeText(String(value || ''))
  const match = raw.match(/(?:v=|youtu\.be\/|shorts\/)?([A-Za-z0-9_-]{11})/)
  return match?.[1] || ''
}

function looksSynthetic(value: unknown) {
  return /\b(demo|fixture|sample|test|seeded|qa)\b/i.test(normalizeText(String(value || '')))
}

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)))
}

function daysSince(value: string | null | undefined): number | null {
  if (!value) return null
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return null
  return Math.max(0, Math.floor((Date.now() - parsed.getTime()) / 86_400_000))
}

function estimateCommissionValue(priceAmount: number | null, commissionRate: number | null): number | null {
  const price = Number(priceAmount || 0)
  const rate = Number(commissionRate || 0)
  if (!Number.isFinite(price) || !Number.isFinite(rate) || price <= 0 || rate <= 0) return null

  return Number((price * (rate > 1 ? rate / 100 : rate)).toFixed(2))
}

function isProxyConnectionError(error: unknown): boolean {
  const message = String((error as any)?.message || error || '')
  return message.includes('407') ||
    message.includes('Proxy Authentication Required') ||
    message.includes('Proxy connection ended') ||
    message.includes('net::ERR_PROXY') ||
    message.includes('ERR_TUNNEL_CONNECTION_FAILED') ||
    message.includes('ERR_HTTP2_PROTOCOL_ERROR') ||
    message.includes('ERR_EMPTY_RESPONSE') ||
    message.includes('net::ERR_TIMED_OUT') ||
    (message.includes('page.goto: Timeout') && message.includes('exceeded')) ||
    ((message.includes('ECONNRESET') || message.includes('ECONNREFUSED') || message.includes('ETIMEDOUT')) && message.toLowerCase().includes('proxy'))
}

function categoryAllowed(categorySlug: string | null, category: string | null) {
  const normalized = slugify(categorySlug || category || '')
  return HARDCORE_CATEGORIES.some((item) => item.slug === normalized || slugify(item.name) === normalized)
}

function inferHardcoreCategorySlug(categorySlug: string | null, category: string | null, productName: string) {
  const normalized = slugify(categorySlug || category || '')
  const direct = HARDCORE_CATEGORIES.find((item) => item.slug === normalized || slugify(item.name) === normalized)
  if (direct) return direct.slug

  const haystack = `${productName} ${categorySlug || ''} ${category || ''}`.toLowerCase()
  if (/\b(smart toilet|bidet|toilet seat|bathroom vanity|vanity unit|marble top|bathroom fixture)\b/.test(haystack)) {
    return 'bathroom-fixtures'
  }
  return null
}

function isReviewablePhysicalProduct(productName: string, categorySlug: string | null, category: string | null) {
  const haystack = `${productName} ${categorySlug || ''} ${category || ''}`.toLowerCase()
  if (/\b(product protection|shipping protection|existing orders only|warranty|insurance|gift card|replacement plan)\b/.test(haystack)) {
    return false
  }
  return Boolean(inferHardcoreCategorySlug(categorySlug, category, productName))
}

function getCandidateAffiliateUrl(candidate: CommercialLoopCandidate) {
  return getCommissionableMerchantUrl(candidate.promoLink, candidate.productUrl)
}

function hasAffiliatePromotionLink(candidate: CommercialLoopCandidate) {
  return Boolean(getCandidateAffiliateUrl(candidate))
}

function scoreAffiliateCandidate(row: AffiliateCandidateRow): CommercialLoopCandidate {
  const productName = normalizeText(row.product_name) || `Affiliate product ${row.affiliate_product_id}`
  const youtubeMatchTerms = parseJsonArray(row.youtube_match_terms_json)
  const expectedCommissionValue = row.expected_commission_value ?? estimateCommissionValue(row.price_amount, row.commission_rate)
  const dataFreshnessDays = row.data_freshness_days ?? daysSince(row.updated_at)
  const inferredCategorySlug = inferHardcoreCategorySlug(row.category_slug, row.category, productName)
  const inferredCategory = HARDCORE_CATEGORIES.find((item) => item.slug === inferredCategorySlug) || null
  const reasons: string[] = []
  let score = 0

  if (isCommercialFocusCategory(inferredCategorySlug)) {
    score += 10
    reasons.push('inside current commercial focus category')
  }
  if (inferredCategorySlug) {
    score += 18
    reasons.push('inside hardcore category whitelist')
  }
  if (row.promo_link || row.short_promo_link) {
    score += 12
    reasons.push('has affiliate promotion link')
  }
  if (row.asin) {
    score += 12
    reasons.push('has ASIN for SKU matching')
  }
  if (youtubeMatchTerms.length) {
    score += Math.min(12, youtubeMatchTerms.length * 2)
    reasons.push('has YouTube match terms')
  }
  if (Number(row.price_amount || 0) >= 80) {
    score += Math.min(10, Number(row.price_amount || 0) / 100)
    reasons.push('meaningful order value')
  }
  if (Number(row.commission_rate || 0) > 0) {
    score += Math.min(10, Number(row.commission_rate || 0) * 2)
    reasons.push('known commission rate')
  }
  if (Number(expectedCommissionValue || 0) >= 3) {
    score += Math.min(12, Number(expectedCommissionValue || 0) * 1.8)
    reasons.push('meaningful estimated commission value')
  }
  if (Number(row.review_count || 0) >= 20) {
    score += Math.min(8, Math.log10(Number(row.review_count || 0)) * 3)
    reasons.push('market demand signal from merchant reviews')
  }
  if (Number(row.rating || 0) >= 3.8) {
    score += Math.min(6, Number(row.rating || 0))
    reasons.push('merchant rating clears baseline')
  }
  if (Number(row.evidence_count || 0) > 0) {
    score += Math.min(10, Number(row.evidence_count || 0) * 2)
    reasons.push('already has review evidence')
  }
  if (Number(row.video_count || 0) > 0) {
    score += Math.min(8, Number(row.video_count || 0) * 2)
    reasons.push('already has matched YouTube videos')
  }
  if (Number(row.merchant_clicks || 0) > 0) {
    score += Math.min(6, Number(row.merchant_clicks || 0))
    reasons.push('existing buyer click demand')
  }
  if (dataFreshnessDays != null && dataFreshnessDays <= 7) {
    score += 4
    reasons.push('freshly synced affiliate data')
  } else if (dataFreshnessDays != null && dataFreshnessDays > 30) {
    score -= 8
    reasons.push('stale affiliate data should be refreshed before publishing')
  }

  const baseCandidate = {
    affiliateProductId: row.affiliate_product_id,
    productId: row.product_id,
    platform: row.platform,
    productName,
    brand: row.brand,
    asin: row.asin,
    category: inferredCategory?.name || row.category,
    categorySlug: inferredCategorySlug || row.category_slug,
    promoLink: row.short_promo_link || row.promo_link,
    productUrl: row.product_url,
    priceAmount: row.price_amount,
    priceCurrency: row.price_currency,
    commissionRate: row.commission_rate,
    reviewCount: row.review_count,
    rating: row.rating,
    expectedCommissionValue,
    dataFreshnessDays,
    youtubeMatchTerms,
    evidenceCount: Number(row.evidence_count || 0),
    videoCount: Number(row.video_count || 0),
    merchantClicks: Number(row.merchant_clicks || 0),
    reviewValueScore: clampScore(score),
    reasons
  }
  const commissionBlindReviewScore = scoreCommissionBlindCandidate(baseCandidate)

  return {
    ...baseCandidate,
    commissionBlindReviewScore,
    commissionInfluenceDelta: baseCandidate.reviewValueScore - commissionBlindReviewScore
  }
}

export async function listAffiliateReviewCandidates(limit = 50): Promise<CommercialLoopCandidate[]> {
  const db = await getDatabase()
  const sourceLimit = Math.max(limit * 25, 250)
  const dataFreshnessSql = db.type === 'postgres'
    ? `CAST(EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - ap.updated_at)) / 86400 AS INTEGER) AS data_freshness_days`
    : `CAST((julianday('now') - julianday(ap.updated_at)) AS INTEGER) AS data_freshness_days`
  const entityMatchTextSql = db.type === 'postgres' ? 'rv.entity_match_json::text' : 'rv.entity_match_json'
  const rows = await db.query<AffiliateCandidateRow>(
    `
      SELECT
        ap.id AS affiliate_product_id,
        p.id AS product_id,
        ap.platform,
        COALESCE(p.asin, ap.asin) AS asin,
        COALESCE(p.brand, ap.brand) AS brand,
        COALESCE(p.product_name, ap.product_name) AS product_name,
        COALESCE(p.category, ap.category) AS category,
        COALESCE(p.category_slug, ap.category_slug) AS category_slug,
        ap.promo_link,
        ap.short_promo_link,
        ap.product_url,
        ap.image_url,
        ap.updated_at,
        COALESCE(p.price_amount, ap.price_amount) AS price_amount,
        COALESCE(p.price_currency, ap.price_currency) AS price_currency,
        ap.commission_rate,
        CASE
          WHEN COALESCE(p.price_amount, ap.price_amount) IS NOT NULL AND ap.commission_rate IS NOT NULL
          THEN COALESCE(p.price_amount, ap.price_amount) * CASE WHEN ap.commission_rate > 1 THEN ap.commission_rate / 100.0 ELSE ap.commission_rate END
          ELSE NULL
        END AS expected_commission_value,
        ${dataFreshnessSql},
        ap.review_count,
        ap.rating,
        COALESCE(p.youtube_match_terms_json, ap.youtube_match_terms_json) AS youtube_match_terms_json,
        (
          SELECT COUNT(*)
          FROM analysis_reports ar
          WHERE ar.product_id = p.id
        ) AS evidence_count,
        (
          SELECT COUNT(*)
          FROM review_videos rv
          WHERE ${entityMatchTextSql} LIKE '%' || '"productId":' || p.id || '%'
        ) AS video_count,
        (
          SELECT COUNT(*)
          FROM merchant_click_events mce
          WHERE mce.product_id = p.id
        ) AS merchant_clicks
      FROM affiliate_products ap
      LEFT JOIN products p ON p.affiliate_product_id = ap.id
      WHERE COALESCE(ap.product_name, p.product_name, '') <> ''
        AND (ap.promo_link IS NOT NULL OR ap.short_promo_link IS NOT NULL OR ap.product_url IS NOT NULL)
      ORDER BY ap.updated_at DESC, ap.id DESC
      LIMIT ?
    `,
    [sourceLimit]
  )

  return rows
    .map(scoreAffiliateCandidate)
    .filter((candidate) => isReviewablePhysicalProduct(candidate.productName, candidate.categorySlug, candidate.category))
    .sort((left, right) => right.reviewValueScore - left.reviewValueScore || right.affiliateProductId - left.affiliateProductId)
    .slice(0, limit)
}

async function ensureProductForCandidate(candidate: CommercialLoopCandidate): Promise<number> {
  if (candidate.productId) return candidate.productId

  const db = await getDatabase()
  const productSlug = slugify(candidate.productName)
  const sourceLink = getCandidateAffiliateUrl(candidate)
  if (!sourceLink) throw new Error('candidate_missing_source_link')

  const existing =
    await db.queryOne<{ id: number }>('SELECT id FROM products WHERE affiliate_product_id = ? LIMIT 1', [candidate.affiliateProductId]) ||
    await db.queryOne<{ id: number }>('SELECT id FROM products WHERE slug = ? LIMIT 1', [productSlug])

  if (existing?.id) return existing.id

  const result = await db.exec(
    `
      INSERT INTO products (
        affiliate_product_id,
        source_platform,
        source_affiliate_link,
        resolved_url,
        canonical_url,
        slug,
        brand,
        product_name,
        category,
        category_slug,
        price_amount,
        price_currency,
        rating,
        review_count,
        asin,
        youtube_match_terms_json,
        source_payload_json,
        published_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `,
    [
      candidate.affiliateProductId,
      candidate.platform,
      sourceLink,
      candidate.promoLink || sourceLink,
      candidate.productUrl || sourceLink,
      productSlug,
      candidate.brand,
      candidate.productName,
      candidate.category,
      candidate.categorySlug,
      candidate.priceAmount,
      candidate.priceCurrency || 'USD',
      candidate.rating,
      candidate.reviewCount,
      candidate.asin,
      candidate.youtubeMatchTerms.length ? JSON.stringify(candidate.youtubeMatchTerms) : null,
      JSON.stringify({
        commercialLoop: true,
        reviewValueScore: candidate.reviewValueScore,
        reasons: candidate.reasons
      })
    ]
  )
  const productId = Number(result.lastInsertRowid || 0)
  if (productId && sourceLink) {
    const existingLink = await db.queryOne<{ id: number }>(
      'SELECT id FROM affiliate_links WHERE product_id = ? AND platform = ? AND country_code = ? LIMIT 1',
      [productId, candidate.platform, 'US']
    )
    if (!existingLink?.id) {
      await db.exec(
        `
          INSERT INTO affiliate_links (product_id, platform, affiliate_url, original_url, country_code, commission_rate, status, last_verified)
          VALUES (?, ?, ?, ?, 'US', ?, 'active', CURRENT_TIMESTAMP)
        `,
        [productId, candidate.platform, sourceLink, candidate.productUrl, candidate.commissionRate]
      )
    } else {
      await db.exec(
        `
          UPDATE affiliate_links
          SET affiliate_url = ?, original_url = ?, commission_rate = ?, status = 'active',
              last_verified = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `,
        [sourceLink, candidate.productUrl, candidate.commissionRate, existingLink.id]
      )
    }
  }
  return productId
}

async function enrichProductFromAffiliateSource(candidate: CommercialLoopCandidate, productId: number): Promise<boolean> {
  const sourceLink = candidate.promoLink || candidate.productUrl
  if (!sourceLink) return false
  const db = await getDatabase()
  const runResult = await db.exec(
    `
      INSERT INTO content_pipeline_runs (
        product_id, affiliate_product_id, source_link, run_type, requested_action, status, current_stage,
        worker_id, locked_at, started_at, finished_at, attempt_count, priority, scheduled_at, locked_by,
        lock_expires_at, last_heartbeat_at, cancel_requested_at, payload_json
      )
      VALUES (?, ?, ?, 'deepProductScrape', 'commercial-loop-enrich', 'running', 'deepBrowserScrape',
        'commercial-loop', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, NULL, 0, 60, NULL, NULL, NULL, CURRENT_TIMESTAMP, NULL, ?)
    `,
    [
      productId,
      candidate.affiliateProductId,
      sourceLink,
      JSON.stringify({
        commercialLoop: true,
        reusedFrom: 'autobb.stealth-scraper.deep-scrape-strategy',
        reviewValueScore: candidate.reviewValueScore
      })
    ]
  )
  const runId = Number(runResult.lastInsertRowid || 0)
  if (!runId) return false

  try {
    const deepScrape = await runDeepProductScrapeTask({
      runId,
      sourceLink,
      affiliateProductId: candidate.affiliateProductId,
      productId,
      countryCode: 'US'
    })
    const scraped = deepScrape.scraped
    await db.exec(
      `
        UPDATE products
        SET resolved_url = COALESCE(?, resolved_url),
            canonical_url = COALESCE(?, canonical_url),
            brand = COALESCE(?, brand),
            product_model = COALESCE(?, product_model),
            model_number = COALESCE(?, model_number),
            product_type = COALESCE(?, product_type),
            category = COALESCE(?, category),
            category_slug = COALESCE(?, category_slug),
            description = COALESCE(?, description),
            price_amount = COALESCE(?, price_amount),
            price_currency = COALESCE(?, price_currency),
            rating = COALESCE(?, rating),
            review_count = COALESCE(?, review_count),
            youtube_match_terms_json = COALESCE(?, youtube_match_terms_json),
            specs_json = COALESCE(?, specs_json),
            review_highlights_json = COALESCE(?, review_highlights_json),
            source_payload_json = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
      [
        deepScrape.finalUrl,
        deepScrape.finalUrl,
        scraped.brand,
        scraped.productModel,
        scraped.modelNumber,
        scraped.productType,
        scraped.category,
        scraped.categorySlug,
        scraped.description,
        scraped.priceAmount,
        scraped.priceCurrency,
        scraped.rating,
        scraped.reviewCount,
        scraped.youtubeMatchTerms.length ? JSON.stringify(scraped.youtubeMatchTerms) : null,
        Object.keys(scraped.specs).length ? JSON.stringify(scraped.specs) : null,
        scraped.reviewHighlights.length ? JSON.stringify(scraped.reviewHighlights) : null,
        JSON.stringify({
          commercialLoop: true,
          deepScrapeTaskId: deepScrape.taskId,
          browserUsed: deepScrape.browserUsed,
          fallbackUsed: deepScrape.fallbackUsed,
          dataConfidenceScore: scraped.dataConfidenceScore,
          attributeCompletenessScore: scraped.attributeCompletenessScore
        }),
        productId
      ]
    )

    if (scraped.imageUrls[0]) {
      const existingMedia = await db.queryOne<{ id: number }>(
        'SELECT id FROM product_media_assets WHERE product_id = ? AND source_url = ? LIMIT 1',
        [productId, scraped.imageUrls[0]]
      )
      if (!existingMedia?.id) {
        await db.exec(
          `
            INSERT INTO product_media_assets (
              product_id, source_url, public_url, asset_role, storage_provider, storage_key, is_public
            ) VALUES (?, ?, ?, 'hero', 'local', ?, 1)
          `,
          [productId, scraped.imageUrls[0], scraped.imageUrls[0], `external/${productId}/hero`]
        )
      }
    }

    await db.exec(
      `
        UPDATE content_pipeline_runs
        SET status = 'completed', current_stage = 'deepBrowserScrape', finished_at = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
      [runId]
    )
    return true
  } catch (error) {
    await db.exec(
      `
        UPDATE content_pipeline_runs
        SET status = 'partialFailed', current_stage = 'deepBrowserScrape', error_message = ?,
            finished_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
      [error instanceof Error ? error.message : String(error), runId]
    )
    throw error
  }
}

function productSearchTerms(candidate: CommercialLoopCandidate) {
  return Array.from(
    new Set([
      candidate.asin,
      ...candidate.youtubeMatchTerms,
      candidate.brand ? `${candidate.brand} ${candidate.productName}` : candidate.productName,
      candidate.productName
    ].map((item) => normalizeText(item)).filter(Boolean))
  ).slice(0, 4)
}

function extractJsonObjectAt(source: string, markerIndex: number) {
  const start = source.indexOf('{', markerIndex)
  if (start < 0) return null

  let depth = 0
  let inString = false
  let escaped = false

  for (let index = start; index < source.length; index += 1) {
    const char = source[index]
    if (inString) {
      if (escaped) {
        escaped = false
      } else if (char === '\\') {
        escaped = true
      } else if (char === '"') {
        inString = false
      }
      continue
    }
    if (char === '"') {
      inString = true
      continue
    }
    if (char === '{') depth += 1
    if (char === '}') {
      depth -= 1
      if (depth === 0) return source.slice(start, index + 1)
    }
  }

  return null
}

function readRendererText(value: any): string {
  if (!value) return ''
  if (typeof value.simpleText === 'string') return value.simpleText
  if (Array.isArray(value.runs)) return value.runs.map((run: any) => run?.text || '').join('').trim()
  return ''
}

function parseYoutubeSearchHtml(html: string, fallbackQuery: string, maxResults: number): VideoSearchResult[] {
  const results: VideoSearchResult[] = []
  const seen = new Set<string>()
  let cursor = 0

  while (results.length < maxResults) {
    const markerIndex = html.indexOf('"videoRenderer"', cursor)
    if (markerIndex < 0) break
    cursor = markerIndex + 15
    const json = extractJsonObjectAt(html, markerIndex)
    if (!json) continue

    try {
      const renderer = JSON.parse(json)
      const youtubeId = String(renderer.videoId || '').trim()
      if (!youtubeId || seen.has(youtubeId)) continue
      seen.add(youtubeId)
      results.push({
        youtubeId,
        title: readRendererText(renderer.title) || `${fallbackQuery} review`,
        channelName: readRendererText(renderer.ownerText) || readRendererText(renderer.longBylineText) || 'YouTube reviewer',
        channelUrl: renderer.ownerText?.runs?.[0]?.navigationEndpoint?.commandMetadata?.webCommandMetadata?.url
          ? `https://www.youtube.com${renderer.ownerText.runs[0].navigationEndpoint.commandMetadata.webCommandMetadata.url}`
          : null,
        publishedAt: null,
        description: readRendererText(renderer.detailedMetadataSnippets?.[0]?.snippetText) || null
      })
    } catch {
      continue
    }
  }

  return results
}

async function discoverYoutubeVideos(candidate: CommercialLoopCandidate, maxResults: number): Promise<VideoSearchResult[]> {
  const queries = productSearchTerms(candidate).map((term) => `${term} review test teardown`)
  const allResults: VideoSearchResult[] = []
  const seen = new Set<string>()

  for (const query of queries) {
    const url = new URL('https://www.youtube.com/results')
    url.searchParams.set('search_query', query)
    url.searchParams.set('sp', 'EgIQAQ%3D%3D')
    const response = await fetchWithBrowserProxy(
      url.toString(),
      {
        headers: {
          accept: 'text/html,application/xhtml+xml',
          'accept-language': 'en-US,en;q=0.9',
          'user-agent': 'Mozilla/5.0 Bes3ReviewDiscovery/1.0'
        }
      },
      'US'
    )
    if (!response.ok) continue
    const html = await response.text()
    for (const result of parseYoutubeSearchHtml(html, query, maxResults)) {
      if (seen.has(result.youtubeId)) continue
      seen.add(result.youtubeId)
      allResults.push(result)
      if (allResults.length >= maxResults) return allResults
    }
  }

  return allResults
}

async function upsertReviewVideo(video: VideoSearchResult, candidate: CommercialLoopCandidate, productId: number): Promise<number> {
  const db = await getDatabase()
  const existing = await db.queryOne<{ id: number; entity_match_json: string | null }>(
    'SELECT id, entity_match_json FROM review_videos WHERE youtube_id = ? LIMIT 1',
    [video.youtubeId]
  )
  const entityMatch = {
    matchedAt: new Date().toISOString(),
    productId,
    confidence: candidate.asin ? 1 : 0.92,
    strategy: candidate.asin ? 'asin' : 'commercial-loop-search',
    reason: 'Discovered from affiliate product review-value search terms.'
  }

  if (existing?.id) {
    await db.exec(
      `
        UPDATE review_videos
        SET title = COALESCE(?, title),
            channel_name = COALESCE(?, channel_name),
            channel_url = COALESCE(?, channel_url),
            description = COALESCE(?, description),
            entity_match_json = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
      [video.title, video.channelName, video.channelUrl, video.description, JSON.stringify(entityMatch), existing.id]
    )
    return existing.id
  }

  const result = await db.exec(
    `
      INSERT INTO review_videos (
        youtube_id,
        channel_name,
        channel_url,
        blogger_rank,
        authority_tier,
        title,
        video_type,
        transcript,
        description,
        processed_status,
        published_at,
        entity_match_json
      ) VALUES (?, ?, ?, 1, 'general', ?, 'long-form', NULL, ?, 'pending', ?, ?)
    `,
    [
      video.youtubeId,
      video.channelName,
      video.channelUrl,
      video.title,
      video.description,
      video.publishedAt,
      JSON.stringify(entityMatch)
    ]
  )
  return Number(result.lastInsertRowid || 0)
}

function parseVttTranscript(content: string) {
  return content
    .split(/\r?\n/)
    .filter((line) => line && !line.startsWith('WEBVTT') && !line.includes('-->') && !/^\d+$/.test(line.trim()))
    .map((line) => line.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()
}

async function fetchTranscriptWithYtDlp(youtubeId: string): Promise<string | null> {
  const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bes3-youtube-'))
  const proxy = await getBrowserProxyUrl('US')
  const baseArgs = [
    '--skip-download',
    '--write-auto-sub',
    '--write-sub',
    '--sub-lang',
    'en.*',
    '--sub-format',
    'vtt',
    '--no-playlist',
    '--skip-unavailable-fragments',
    '--sleep-interval',
    '3',
    '--max-sleep-interval',
    '15',
    '--output',
    `${outputDir}/%(id)s.%(ext)s`
  ]
  const runYtDlp = (proxyUrl: string) => {
    const args = [...baseArgs]
    if (proxyUrl) args.push('--proxy', proxyUrl)
    args.push(`https://www.youtube.com/watch?v=${youtubeId}`)
    return spawnSync('yt-dlp', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
  }

  let result = runYtDlp(proxy)
  if (result.status !== 0 && proxy) result = runYtDlp('')
  if (result.status !== 0) return null

  const transcriptFile = fs.readdirSync(outputDir).find((file) => file.endsWith('.vtt'))
  if (!transcriptFile) return null
  const transcript = parseVttTranscript(fs.readFileSync(path.join(outputDir, transcriptFile), 'utf8'))
  return transcript || null
}

async function maybeFetchTranscript(videoId: number, youtubeId: string, enabled: boolean) {
  if (!enabled) return false
  const transcript = await fetchTranscriptWithYtDlp(youtubeId)
  if (!transcript) return false
  const db = await getDatabase()
  await db.exec(
    `
      UPDATE review_videos
      SET transcript = ?, processed_status = 'success', updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `,
    [transcript, videoId]
  )
  return true
}

function parseAiJson(text: string | null): unknown {
  if (!text) return null
  const candidate = extractJsonTextBlock(text) || text
  try {
    return JSON.parse(candidate)
  } catch {
    return text
  }
}

function categoryForCandidate(candidate: CommercialLoopCandidate) {
  const slug = slugify(candidate.categorySlug || candidate.category || '')
  return HARDCORE_CATEGORIES.find((item) => item.slug === slug || slugify(item.name) === slug) || null
}

async function loadCandidateForEvidenceImport(input: CommercialLoopEvidenceImportInput): Promise<CommercialLoopCandidate> {
  const candidates = await listAffiliateReviewCandidates(100)
  const matched = candidates.find((candidate) =>
    (input.affiliateProductId && Number(candidate.affiliateProductId) === Number(input.affiliateProductId)) ||
    (input.productId && Number(candidate.productId) === Number(input.productId))
  ) || candidates.find(hasAffiliatePromotionLink)
  if (!matched) throw new Error('no_reviewable_affiliate_candidate')
  return matched
}

export async function importCommercialLoopEvidence(input: CommercialLoopEvidenceImportInput) {
  const candidate = await loadCandidateForEvidenceImport(input)
  const productId = input.productId ? Number(input.productId) : await ensureProductForCandidate(candidate)
  candidate.productId = productId

  const category = categoryForCandidate(candidate)
  if (!category) throw new Error('candidate_category_not_supported')
  const tags = await listHardcoreTags(category.slug)
  const requestedTagSlug = slugify(input.tagSlug || '')
  const tag = tags.find((entry) => entry.slug === requestedTagSlug) || tags.find((entry) => entry.id)
  if (!tag?.id) throw new Error('candidate_category_has_no_tags')

  const youtubeId = normalizeYoutubeId(input.youtubeId)
  const videoTitle = normalizeText(input.videoTitle || `${candidate.productName} review`)
  const channelName = normalizeText(input.channelName || 'YouTube reviewer')
  const evidenceQuote = normalizeText(input.evidenceQuote)
  const contextSnippet = normalizeText(input.contextSnippet)
  const transcript = normalizeText(input.transcript || `${contextSnippet} ${evidenceQuote}`)
  const combinedText = `${youtubeId} ${videoTitle} ${channelName} ${evidenceQuote} ${contextSnippet}`
  if (!youtubeId) throw new Error('youtube_id_required')
  if (looksSynthetic(combinedText)) throw new Error('synthetic_evidence_rejected')
  if (evidenceQuote.length < 40) throw new Error('evidence_quote_too_short')
  if (contextSnippet.length < 20) throw new Error('context_snippet_too_short')
  if (transcript.length < 120) throw new Error('transcript_too_short')
  if (!isPublicEvidenceUsable(
    {
      productName: candidate.productName,
      brand: candidate.brand
    },
    {
      youtubeId,
      title: videoTitle,
      channelName,
      evidenceQuote,
      contextSnippet
    }
  )) throw new Error('evidence_identity_not_public_usable')

  const db = await getDatabase()
  const sourceLink = getCandidateAffiliateUrl(candidate)
  await db.exec(
    `
      UPDATE products
      SET category = COALESCE(category, ?),
          category_slug = COALESCE(category_slug, ?),
          source_affiliate_link = COALESCE(source_affiliate_link, ?),
          resolved_url = COALESCE(resolved_url, ?),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `,
    [
      category.name,
      category.slug,
      sourceLink,
      sourceLink,
      productId
    ]
  )
  const existingVideo = await db.queryOne<{ id: number }>('SELECT id FROM review_videos WHERE youtube_id = ? LIMIT 1', [youtubeId])
  const entityMatch = {
    matchedAt: new Date().toISOString(),
    productId,
    confidence: 0.92,
    strategy: 'commercial-loop-import',
    reason: 'Operator-imported real YouTube review evidence for production business audit.'
  }
  let videoId: number
  if (existingVideo?.id) {
    videoId = existingVideo.id
    await db.exec(
      `
        UPDATE review_videos
        SET title = ?, channel_name = ?, channel_url = ?, transcript = ?, description = ?,
            processed_status = 'success', entity_match_json = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
      [videoTitle, channelName, input.channelUrl || null, transcript, contextSnippet, JSON.stringify(entityMatch), videoId]
    )
  } else {
    const insertedVideo = await db.exec(
      `
        INSERT INTO review_videos (
          youtube_id, channel_name, channel_url, blogger_rank, authority_tier, title, video_type,
          transcript, description, processed_status, published_at, entity_match_json
        ) VALUES (?, ?, ?, 1, 'general', ?, 'long-form', ?, ?, 'success', CURRENT_TIMESTAMP, ?)
      `,
      [youtubeId, channelName, input.channelUrl || null, videoTitle, transcript, contextSnippet, JSON.stringify(entityMatch)]
    )
    videoId = Number(insertedVideo.lastInsertRowid || 0)
  }
  if (!videoId) throw new Error('video_import_failed')

  const rating = (['Excellent', 'Good', 'Average', 'Struggles', 'Fails'] as HardcoreRating[]).includes(input.rating as HardcoreRating)
    ? input.rating as HardcoreRating
    : 'Good'
  const timestampSeconds = Number.isFinite(Number(input.timestampSeconds)) ? Math.max(0, Number(input.timestampSeconds)) : 0
  const evidenceConfidence = Math.max(0.65, Math.min(Number(input.evidenceConfidence || 0.82), 0.98))
  const existingReport = await db.queryOne<{ id: number }>(
    'SELECT id FROM analysis_reports WHERE product_id = ? AND video_id = ? AND tag_id = ? LIMIT 1',
    [productId, videoId, tag.id]
  )
  if (existingReport?.id) {
    await db.exec(
      `
        UPDATE analysis_reports
        SET rating = ?, evidence_quote = ?, timestamp_seconds = ?, context_snippet = ?,
            evidence_confidence = ?, evidence_type = 'standard-review', is_advertorial = 0, quality_flags_json = ?
        WHERE id = ?
      `,
      [rating, evidenceQuote, timestampSeconds, contextSnippet, evidenceConfidence, JSON.stringify({ commercial_loop: true, imported_real_youtube: true }), existingReport.id]
    )
  } else {
    await db.exec(
      `
        INSERT INTO analysis_reports (
          product_id, video_id, tag_id, rating, evidence_quote, timestamp_seconds, context_snippet,
          evidence_confidence, evidence_type, is_advertorial, quality_flags_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'standard-review', 0, ?)
      `,
      [productId, videoId, tag.id, rating, evidenceQuote, timestampSeconds, contextSnippet, evidenceConfidence, JSON.stringify({ commercial_loop: true, imported_real_youtube: true })]
    )
  }

  const article = input.publishArticle !== false ? await upsertEvidenceArticle(productId, candidate) : null
  return {
    productId,
    affiliateProductId: candidate.affiliateProductId,
    videoId,
    youtubeId,
    tagSlug: tag.slug,
    article
  }
}

async function extractEvidenceForProduct(productId: number, candidate: CommercialLoopCandidate): Promise<number> {
  const category = categoryForCandidate(candidate)
  if (!category) return 0
  const tags = (await listHardcoreTags(category.slug)).slice(0, 20)
  if (!tags.length) return 0

  const db = await getDatabase()
  const entityMatchTextSql = db.type === 'postgres' ? 'entity_match_json::text' : 'entity_match_json'
  const videos = await db.query<VideoRow>(
    `
      SELECT id, youtube_id, title, channel_name, channel_url, video_type, transcript, description, entity_match_json
      FROM review_videos
      WHERE transcript IS NOT NULL
        AND ${entityMatchTextSql} LIKE '%' || '"productId":' || ? || '%'
      ORDER BY updated_at DESC, id DESC
      LIMIT 8
    `,
    [productId]
  )
  let written = 0

  for (const video of videos) {
    if (!video.transcript) continue
    const prompt = buildVideoEvidencePrompt({ category, tags, transcript: video.transcript.slice(0, 120_000) })
    const aiResult = await generateGeminiContent({
      prompt,
      temperature: 0.2,
      maxOutputTokens: 4096,
      responseMimeType: 'application/json'
    })
    const parsed = parseVideoEvidenceWithRetry(parseAiJson(aiResult?.text || null), tags, video.transcript)
    if (!parsed.ok || !parsed.data) continue

    for (const item of parsed.data.scenario_performance) {
      const tag = tags.find((entry) => entry.name.toLowerCase() === item.canonical_tag.toLowerCase())
      if (!tag?.id) continue
      const rating = item.rating as HardcoreRating
      if (!shouldKeepPositiveEvidence({ isAdvertorial: parsed.data.is_advertorial, rating })) continue
      if (!isPublicEvidenceUsable(
        {
          productName: candidate.productName,
          brand: candidate.brand
        },
        {
          youtubeId: video.youtube_id,
          title: video.title,
          channelName: video.channel_name,
          evidenceQuote: item.evidence_quote,
          contextSnippet: item.context_snippet
        }
      )) continue
      const existing = await db.queryOne<{ id: number }>(
        'SELECT id FROM analysis_reports WHERE product_id = ? AND video_id = ? AND tag_id = ? LIMIT 1',
        [productId, video.id, tag.id]
      )
      if (existing?.id) {
        await db.exec(
          `
            UPDATE analysis_reports
            SET rating = ?, evidence_quote = ?, timestamp_seconds = ?, context_snippet = ?,
                evidence_confidence = ?, evidence_type = ?, is_advertorial = ?, quality_flags_json = ?
            WHERE id = ?
          `,
          [
            rating,
            item.evidence_quote,
            item.timestamp_seconds,
            item.context_snippet,
            parsed.data.is_advertorial ? 0.35 : video.video_type === 'shorts' ? 0.7 : 0.9,
            video.video_type === 'shorts' ? 'shorts' : 'standard-review',
            parsed.data.is_advertorial ? 1 : 0,
            JSON.stringify({ commercial_loop: true, overall_sentiment: parsed.data.overall_sentiment }),
            existing.id
          ]
        )
      } else {
        await db.exec(
          `
            INSERT INTO analysis_reports (
              product_id,
              video_id,
              tag_id,
              rating,
              evidence_quote,
              timestamp_seconds,
              context_snippet,
              evidence_confidence,
              evidence_type,
              is_advertorial,
              quality_flags_json
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `,
          [
            productId,
            video.id,
            tag.id,
            rating,
            item.evidence_quote,
            item.timestamp_seconds,
            item.context_snippet,
            parsed.data.is_advertorial ? 0.35 : video.video_type === 'shorts' ? 0.7 : 0.9,
            video.video_type === 'shorts' ? 'shorts' : 'standard-review',
            parsed.data.is_advertorial ? 1 : 0,
            JSON.stringify({ commercial_loop: true, overall_sentiment: parsed.data.overall_sentiment })
          ]
        )
      }
      written += 1
    }
  }

  return written
}

async function loadProductArticleRow(productId: number): Promise<ProductArticleRow | null> {
  const db = await getDatabase()
  const row = await db.queryOne<ProductArticleRow>(
    `
      SELECT
        p.id,
        p.slug,
        p.brand,
        p.product_model,
        p.model_number,
        p.product_name,
        p.category,
        p.category_slug,
        p.description,
        p.price_amount,
        p.price_currency,
        p.current_price,
        p.hist_low_price,
        p.avg_90d_price,
        p.source_affiliate_link,
        (
          SELECT affiliate_url
          FROM affiliate_links al
          WHERE al.product_id = p.id
            AND al.status NOT IN ('broken', 'inactive')
          ORDER BY CASE al.status WHEN 'active' THEN 0 WHEN 'unknown' THEN 1 ELSE 2 END, al.updated_at DESC, al.id DESC
          LIMIT 1
        ) AS active_affiliate_url,
        p.resolved_url,
        (
          SELECT public_url
          FROM product_media_assets
          WHERE product_id = p.id AND is_public = 1
          ORDER BY CASE asset_role WHEN 'hero' THEN 0 WHEN 'thumbnail' THEN 1 ELSE 2 END, id ASC
          LIMIT 1
        ) AS hero_image_url
      FROM products p
      WHERE p.id = ?
      LIMIT 1
    `,
    [productId]
  )
  return row || null
}

async function loadEvidenceReports(productId: number): Promise<EvidenceReport[]> {
  const db = await getDatabase()
  const rows = await db.query<any>(
    `
      SELECT
        ar.id,
        ar.product_id,
        ar.tag_id,
        tt.canonical_name AS tag_name,
        tt.slug AS tag_slug,
        ar.rating,
        ar.evidence_quote,
        ar.timestamp_seconds,
        ar.context_snippet,
        ar.evidence_confidence,
        ar.evidence_type,
        ar.is_advertorial,
        rv.channel_name,
        rv.channel_url,
        rv.youtube_id,
        rv.blogger_rank,
        rv.authority_tier,
        rv.title AS video_title,
        0 AS negative_feedback_count,
        0 AS useful_feedback_count,
        0 AS video_negative_feedback_count
      FROM analysis_reports ar
      LEFT JOIN taxonomy_tags tt ON tt.id = ar.tag_id
      LEFT JOIN review_videos rv ON rv.id = ar.video_id
      WHERE ar.product_id = ?
      ORDER BY ar.evidence_confidence DESC, ar.created_at DESC
      LIMIT 24
    `,
    [productId]
  )

  const reports = rows
    .map((row): EvidenceReport | null => {
      const rating = String(row.rating || '') as HardcoreRating
      if (!RATING_TO_SCORE[rating]) return null
      return {
        id: Number(row.id),
        productId: Number(row.product_id),
        tagId: row.tag_id == null ? null : Number(row.tag_id),
        tagName: row.tag_name || 'Evidence',
        tagSlug: row.tag_slug || 'evidence',
        rating,
        ratingScore: RATING_TO_SCORE[rating],
        evidenceQuote: String(row.evidence_quote || ''),
        timestampSeconds: row.timestamp_seconds == null ? null : Number(row.timestamp_seconds),
        contextSnippet: row.context_snippet,
        evidenceConfidence: Number(row.evidence_confidence || 1),
        evidenceType: row.evidence_type || 'standard-review',
        isAdvertorial: Boolean(row.is_advertorial),
        channelName: row.channel_name || 'YouTube reviewer',
        channelUrl: row.channel_url,
        youtubeId: row.youtube_id,
        bloggerRank: Number(row.blogger_rank || 1),
        authorityTier: row.authority_tier || 'general',
        videoTitle: row.video_title || 'Review evidence',
        negativeFeedbackCount: 0,
        usefulFeedbackCount: 0,
        videoNegativeFeedbackCount: 0,
        feedbackPenalty: 0
      }
    })
    .filter((item): item is EvidenceReport => Boolean(item))

  const product = reports[0]
    ? await loadProductArticleRow(productId)
    : null
  if (!product) return []

  return reports.filter((report) =>
    report.youtubeId &&
    report.evidenceQuote.trim() &&
    report.evidenceConfidence >= 0.65 &&
    !report.isAdvertorial &&
    isPublicEvidenceUsable(
      {
        productName: product.product_name,
        brand: product.brand,
        productModel: product.product_model,
        modelNumber: product.model_number
      },
      {
        youtubeId: report.youtubeId,
        title: report.videoTitle,
        channelName: report.channelName,
        evidenceQuote: report.evidenceQuote,
        contextSnippet: report.contextSnippet
      }
    )
  )
}

function youtubeTimestampUrl(report: EvidenceReport) {
  if (!report.youtubeId) return null
  return `https://www.youtube.com/watch?v=${report.youtubeId}${report.timestampSeconds ? `&t=${report.timestampSeconds}s` : ''}`
}

function buildEvidenceArticleHtml({
  product,
  candidate,
  evidence,
  keyword,
  summary
}: {
  product: ProductArticleRow
  candidate: CommercialLoopCandidate
  evidence: EvidenceReport[]
  keyword: string
  summary: string
}) {
  const consensus = summarizeConsensus(evidence)
  const currentPrice = product.current_price ?? product.price_amount
  const commissionableUrl = getCommissionableMerchantUrl(product.source_affiliate_link, product.active_affiliate_url, product.resolved_url)
  const price = summarizePriceValue({
    currentPrice,
    histLowPrice: product.hist_low_price,
    avg90dPrice: product.avg_90d_price,
    currency: product.price_currency,
    consensusScore5: consensus.score5
  })
  const topEvidence = evidence.slice(0, 8)
  const ctaPath = commissionableUrl ? `/go/${product.id}?source=evidence-review` : null
  const score = consensus.score10 == null ? 'Researching' : `${consensus.score10.toFixed(1)}/10`
  const rows = topEvidence.map((report) => {
    const timestamp = youtubeTimestampUrl(report)
    return [
      '<tr>',
      `<td>${escapeHtml(report.tagName)}</td>`,
      `<td>${escapeHtml(report.rating)}</td>`,
      `<td><blockquote>${escapeHtml(report.evidenceQuote)}</blockquote></td>`,
      `<td>${timestamp ? `<a href="${escapeHtml(timestamp)}" rel="nofollow noopener" target="_blank">Review by ${escapeHtml(report.channelName)}</a>` : `Review by ${escapeHtml(report.channelName)}`}</td>`,
      '</tr>'
    ].join('')
  }).join('')

  return [
    `<p><strong>BLUF:</strong> ${escapeHtml(summary)}</p>`,
    '<h2>Evidence Verdict</h2>',
    `<p>${escapeHtml(product.product_name)} currently has a Bes3 consensus score of <strong>${escapeHtml(score)}</strong> from ${evidence.length} validated YouTube evidence reports. The buying window is <strong>${escapeHtml(price.label)}</strong>: ${escapeHtml(price.explanation)}</p>`,
    '<h2>Why This Product Was Worth Reviewing</h2>',
    '<ul>',
    ...candidate.reasons.slice(0, 8).map((reason) => `<li>${escapeHtml(reason)}</li>`),
    `<li>Review-value score: ${candidate.reviewValueScore}/100.</li>`,
    '</ul>',
    '<h2>YouTube Evidence Matrix</h2>',
    '<table><thead><tr><th>Scenario</th><th>Verdict</th><th>Creator proof</th><th>Source</th></tr></thead><tbody>',
    rows || '<tr><td colspan="4">Bes3 has not validated a quote yet, so this page should stay in research mode.</td></tr>',
    '</tbody></table>',
    '<h2>Who Should Buy</h2>',
    '<ul>',
    `<li>Buy if your use case matches the strongest tested scenarios: ${escapeHtml(topEvidence.slice(0, 3).map((item) => item.tagName).join(', ') || keyword)}.</li>`,
    `<li>Buy if ${escapeHtml(price.label.toLowerCase())} makes the current price acceptable for your budget.</li>`,
    '<li>Buy if timestamped creator proof matters more to you than merchant spec sheets.</li>',
    '</ul>',
    '<h2>Who Should Skip</h2>',
    '<ul>',
    '<li>Skip if the evidence quotes do not cover your exact use case.</li>',
    '<li>Skip if the price window is normal or overpriced and you can wait for a sale.</li>',
    '<li>Skip if you need a product with broader creator agreement than the current evidence set.</li>',
    '</ul>',
    '<h2>Price and Affiliate Link</h2>',
    ctaPath
      ? `<p>Current tracked price: <strong>${escapeHtml(formatHardcorePrice(currentPrice, price.currency))}</strong>. Bes3 may earn a commission if you buy through the link, but the article is generated from evidence, not commission rank.</p>`
      : `<p>Current tracked price: <strong>${escapeHtml(formatHardcorePrice(currentPrice, price.currency))}</strong>. Bes3 is not showing a purchase button because no verified commissionable merchant link is attached yet.</p>`,
    ctaPath ? `<p><a href="${escapeHtml(ctaPath)}" rel="nofollow sponsored">Check current price</a></p>` : ''
  ].join('\n')
}

function buildEvidenceArticleMarkdown(html: string) {
  return html
    .replace(/<h2>(.*?)<\/h2>/g, '\n\n## $1\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

async function upsertEvidenceArticle(productId: number, candidate: CommercialLoopCandidate) {
  const product = await loadProductArticleRow(productId)
  if (!product) throw new Error('product_not_found')
  const evidence = await loadEvidenceReports(productId)
  if (!evidence.length) throw new Error('product_has_no_validated_evidence')

  const consensus = summarizeConsensus(evidence)
  const primaryTag = evidence[0]?.tagName || 'real-world tests'
  const keyword = `${product.product_name} review after YouTube tests`
  const title = `${product.product_name} Review: YouTube Evidence, Price Window, and Buyer Fit`
  const slug = slugify(`${product.product_name} youtube evidence review`)
  const hasCommissionableLink = Boolean(getCommissionableMerchantUrl(product.source_affiliate_link, product.active_affiliate_url, product.resolved_url))
  const summary = `${product.product_name} is reviewed from ${evidence.length} timestamped YouTube evidence reports, with ${primaryTag} proof, a ${consensus.confidence.toLowerCase()} confidence score${hasCommissionableLink ? ', and a direct affiliate price check.' : ', with purchase handoff held until a commissionable merchant link is verified.'}`
  const contentHtml = buildEvidenceArticleHtml({ product, candidate, evidence, keyword, summary })
  const contentMd = buildEvidenceArticleMarkdown(contentHtml)
  const pathName = getArticlePath('review', slug)
  const schemaJson = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'Review',
    itemReviewed: {
      '@type': 'Product',
      name: product.product_name,
      brand: product.brand ? { '@type': 'Brand', name: product.brand } : undefined
    },
    reviewRating: consensus.score5 == null
      ? undefined
      : {
          '@type': 'Rating',
          ratingValue: Number(consensus.score5.toFixed(1)),
          bestRating: 5,
          worstRating: 1
        },
    author: { '@type': 'Organization', name: 'Bes3' },
    reviewBody: summary
  })
  const db = await getDatabase()
  const existing =
    await db.queryOne<{ id: number }>('SELECT id FROM articles WHERE product_id = ? AND article_type = ? LIMIT 1', [productId, 'review']) ||
    await db.queryOne<{ id: number }>('SELECT id FROM articles WHERE slug = ? LIMIT 1', [slug])
  let articleId: number

  if (existing?.id) {
    await db.exec(
      `
        UPDATE articles
        SET title = ?, slug = ?, summary = ?, keyword = ?, hero_image_url = ?, content_md = ?, content_html = ?,
            seo_title = ?, seo_description = ?, schema_json = ?, status = 'published',
            published_at = COALESCE(published_at, CURRENT_TIMESTAMP), updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
      [
        title,
        slug,
        summary,
        keyword,
        product.hero_image_url,
        contentMd,
        contentHtml,
        title,
        summary.slice(0, 155),
        schemaJson,
        existing.id
      ]
    )
    articleId = existing.id
  } else {
    const result = await db.exec(
      `
        INSERT INTO articles (
          product_id, article_type, title, slug, summary, keyword, hero_image_url, content_md, content_html,
          seo_title, seo_description, schema_json, status, published_at
        ) VALUES (?, 'review', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'published', CURRENT_TIMESTAMP)
      `,
      [productId, title, slug, summary, keyword, product.hero_image_url, contentMd, contentHtml, title, summary.slice(0, 155), schemaJson]
    )
    articleId = Number(result.lastInsertRowid || 0)
  }

  const seoPayload = buildSeoPagePersistencePayload({
    pageType: 'review',
    pathname: pathName,
    title,
    description: summary.slice(0, 155),
    image: product.hero_image_url,
    schemaJson
  })
  const existingSeo =
    await db.queryOne<{ id: number }>('SELECT id FROM seo_pages WHERE article_id = ? LIMIT 1', [articleId]) ||
    await db.queryOne<{ id: number }>('SELECT id FROM seo_pages WHERE pathname = ? LIMIT 1', [seoPayload.pathname])
  let seoPageId: number

  if (existingSeo?.id) {
    await db.exec(
      `
        UPDATE seo_pages
        SET article_id = ?, page_type = ?, pathname = ?, title = ?, meta_description = ?, canonical_url = ?,
            open_graph_json = ?, schema_json = ?, status = 'published',
            published_at = COALESCE(published_at, CURRENT_TIMESTAMP), updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
      [
        articleId,
        seoPayload.pageType,
        seoPayload.pathname,
        seoPayload.title,
        seoPayload.metaDescription,
        seoPayload.canonicalUrl,
        seoPayload.openGraphJson,
        seoPayload.schemaJson,
        existingSeo.id
      ]
    )
    seoPageId = existingSeo.id
  } else {
    const result = await db.exec(
      `
        INSERT INTO seo_pages (article_id, page_type, pathname, title, meta_description, canonical_url, open_graph_json, schema_json, status, published_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'published', CURRENT_TIMESTAMP)
      `,
      [
        articleId,
        seoPayload.pageType,
        seoPayload.pathname,
        seoPayload.title,
        seoPayload.metaDescription,
        seoPayload.canonicalUrl,
        seoPayload.openGraphJson,
        seoPayload.schemaJson
      ]
    )
    seoPageId = Number(result.lastInsertRowid || 0)
  }

  await db.exec(
    'INSERT INTO publish_events (seo_page_id, event_type, status, payload_json) VALUES (?, ?, ?, ?)',
    [seoPageId, 'commercial_loop.review_published', 'success', JSON.stringify({ productId, path: pathName, evidenceCount: evidence.length })]
  )

  return { productId, articleId, seoPageId, path: pathName, title }
}

async function runSync(platform: Required<CommercialLoopOptions>['syncPlatform']) {
  const sync: CommercialLoopResult['sync'] = {}
  if (platform === 'amazon' || platform === 'all') sync.amazon = await syncPartnerboostAmazonProducts()
  if (platform === 'dtc' || platform === 'all') sync.dtc = await syncPartnerboostDtcProducts()
  return sync
}

export async function runCommercialLoop(input: CommercialLoopOptions = {}): Promise<CommercialLoopResult> {
  const options = normalizeOptions(input)
  const sync = options.execute ? await runSync(options.syncPlatform) : {}
  const candidates = await listAffiliateReviewCandidates(Math.max(options.limit, 25))
  const commissionBlindAudit = auditCommissionBlindCandidateOrder(candidates)
  const qualified = candidates.filter((candidate) => candidate.reviewValueScore >= options.minScore)
  const conversionBlocked = qualified.filter((candidate) => !hasAffiliatePromotionLink(candidate))
  const skipped: CommercialLoopResult['skipped'] = conversionBlocked.map((candidate) => ({
    scope: `candidate:${candidate.affiliateProductId}`,
    reason: 'missing_affiliate_promotion_link',
    detail: {
      productName: candidate.productName,
      reviewValueScore: candidate.reviewValueScore
    }
  }))
  const selected = qualified.filter(hasAffiliatePromotionLink).slice(0, options.limit)
  let videosDiscovered = 0
  let transcriptsFetched = 0
  let evidenceReportsWritten = 0
  const articlesPublished: CommercialLoopResult['articlesPublished'] = []

  if (options.execute) {
    for (const candidate of selected) {
      let productId: number
      try {
        productId = await ensureProductForCandidate(candidate)
        candidate.productId = productId
      } catch (error) {
        skipped.push({ scope: `candidate:${candidate.affiliateProductId}`, reason: 'product_upsert_failed', detail: error instanceof Error ? error.message : String(error) })
        continue
      }

      if (options.enrichProducts) {
        try {
          await enrichProductFromAffiliateSource(candidate, productId)
        } catch (error) {
          skipped.push({
            scope: `product:${productId}`,
            reason: isProxyConnectionError(error) ? 'product_enrichment_proxy_failed' : 'product_enrichment_failed',
            detail: error instanceof Error ? error.message : String(error)
          })
        }
      }

      if (options.discoverVideos) {
        try {
          const videos = await discoverYoutubeVideos(candidate, options.maxVideosPerProduct)
          for (const video of videos) {
            const videoId = await upsertReviewVideo(video, candidate, productId)
            videosDiscovered += 1
            if (options.fetchTranscripts) {
              const fetched = await maybeFetchTranscript(videoId, video.youtubeId, true)
              if (fetched) transcriptsFetched += 1
            }
          }
        } catch (error) {
          skipped.push({ scope: `candidate:${candidate.affiliateProductId}`, reason: 'youtube_discovery_failed', detail: error instanceof Error ? error.message : String(error) })
        }
      }

      if (options.extractEvidence) {
        try {
          evidenceReportsWritten += await extractEvidenceForProduct(productId, candidate)
        } catch (error) {
          skipped.push({ scope: `product:${productId}`, reason: 'evidence_extraction_failed', detail: error instanceof Error ? error.message : String(error) })
        }
      }

      if (options.publishArticles) {
        try {
          articlesPublished.push(await upsertEvidenceArticle(productId, candidate))
        } catch (error) {
          skipped.push({ scope: `product:${productId}`, reason: 'article_publish_skipped', detail: error instanceof Error ? error.message : String(error) })
        }
      }
    }
  }

  const paths = articlesPublished.map((article) => article.path)
  const indexing = options.execute && options.pushIndex && paths.length
    ? await dispatchSeoNotifications(paths, articlesPublished[0]?.seoPageId || null).then(() => 'queued')
    : 'dry-run'

  return {
    ok: skipped.length === 0 || articlesPublished.length > 0 || !options.execute,
    execute: options.execute,
    options,
    sync,
    candidates,
    selected,
    videosDiscovered,
    transcriptsFetched,
    evidenceReportsWritten,
    articlesPublished,
    commissionBlindAudit,
    indexing,
    skipped
  }
}

export function buildCommercialLoopRuntimeGuide() {
  return {
    env: [
      'PARTNERBOOST_AMAZON_TOKEN or affiliate_sync.partnerboost_token',
      'PARTNERBOOST_DTC_TOKEN or affiliate_sync.partnerboost_token',
      'AI_PROVIDER=relay and GEMINI_RELAY_API_KEY, or official GEMINI_API_KEY',
      'BROWSER_PROXY_URLS_JSON for YouTube and merchant discovery proxying'
    ],
    commands: {
      preview: 'npm run commercial-loop:run',
      liveReadiness: 'npm run commercial-loop:check-live-readiness -- --dry-run --limit=50',
      execute: 'npm run commercial-loop:run -- --execute --sync=amazon --discover-videos --fetch-transcripts --extract-evidence --publish',
      productEnrichment: 'npm run commercial-loop:run -- --execute --enrich-products',
      transcriptMode: 'npm run commercial-loop:run -- --execute --fetch-transcripts'
    },
    reusedAutobbPatterns: [
      'PartnerBoost platform sync as the source of affiliate truth',
      'estimated commission value and merchant review count for hot-product prioritization',
      'commission-blind audit reports how much payout data influenced candidate priority',
      'stealth browser scrape with proxy-aware failure classification and fetch fallback',
      'affiliate click redirect attribution through /go/{productId}'
    ],
    publicSurfaces: ['/reviews/[slug]', '/sitemap.xml', '/go/[productId]'],
    ctaTracking: toAbsoluteUrl('/go/{productId}?source=evidence-review')
  }
}
