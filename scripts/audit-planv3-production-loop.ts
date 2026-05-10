#!/usr/bin/env tsx

import fs from 'node:fs/promises'
import path from 'node:path'
import postgres from 'postgres'

type AuditStatus = 'passed' | 'failed' | 'warning'

type AuditCheck = {
  name: string
  status: AuditStatus
  detail: string
  evidence?: Record<string, unknown>
}

type AuditSummary = {
  generatedAt: string
  mode: 'production-postgres-readonly'
  appUrl: string
  thresholds: Record<string, number>
  totals: {
    passed: number
    failed: number
    warning: number
  }
  checks: AuditCheck[]
  metrics: Record<string, unknown>
  publicSurface?: Record<string, unknown>
}

type QueryClient = {
  unsafe: (query: string, params?: unknown[]) => Promise<Array<Record<string, unknown>>>
}

const requiredTables = [
  'affiliate_products',
  'products',
  'affiliate_links',
  'review_videos',
  'analysis_reports',
  'taxonomy_tags',
  'taxonomy_intent_sources',
  'pending_tags',
  'articles',
  'seo_pages',
  'merchant_click_events',
  'buyer_decision_events',
  'content_pipeline_runs'
]

const forbiddenSqlStart = /^\s*(insert|update|delete|drop|alter|create|truncate|grant|revoke|merge|call|copy|vacuum|analyze)\b/i

function hasFlag(name: string) {
  return process.argv.includes(`--${name}`)
}

function readFlag(name: string) {
  const prefix = `--${name}=`
  return process.argv.find((item) => item.startsWith(prefix))?.slice(prefix.length) || ''
}

async function parseEnvFileIfExists(filePath: string): Promise<Record<string, string>> {
  try {
    const content = await fs.readFile(filePath, 'utf8')
    const values: Record<string, string> = {}
    for (const rawLine of content.split(/\r?\n/)) {
      const trimmed = rawLine.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/)
      if (!match) continue
      let [, key, value] = match
      value = value.trim()
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1)
      }
      values[key] = value
    }
    return values
  } catch (error: any) {
    if (error?.code === 'ENOENT') return {}
    throw error
  }
}

async function buildEnvValues() {
  const envFiles = [
    process.env.BES3_ENV_FILE || '',
    '.env.production.local',
    '.env.local',
    '.env.production',
    '.env'
  ].filter(Boolean)

  const values: Record<string, string> = {}
  for (const filePath of envFiles) {
    const parsed = await parseEnvFileIfExists(path.resolve(process.cwd(), filePath))
    for (const [key, value] of Object.entries(parsed)) {
      if (values[key] == null && value.trim()) values[key] = value
    }
  }

  for (const [key, value] of Object.entries(process.env)) {
    if (value && value.trim()) values[key] = value
  }

  return values
}

function normalizeProductionAppUrl(value: string | undefined) {
  const candidate = String(value || '').trim().replace(/\/+$/, '')
  if (candidate && !/localhost|127\.0\.0\.1|0\.0\.0\.0/i.test(candidate)) return candidate
  return 'https://www.bes3.com'
}

function readInteger(values: Record<string, string>, key: string, fallback: number) {
  const raw = readFlag(key.toLowerCase().replace(/_/g, '-')) || values[key]
  const parsed = Number.parseInt(String(raw || ''), 10)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback
}

function assertPostgresUrl(databaseUrl: string) {
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is not available in the current process or env files. Production DB audit refuses to fall back to SQLite.')
  }
  let parsed: URL
  try {
    parsed = new URL(databaseUrl)
  } catch {
    throw new Error('DATABASE_URL is present but is not a valid URL.')
  }
  if (parsed.protocol !== 'postgres:' && parsed.protocol !== 'postgresql:') {
    throw new Error('DATABASE_URL must use postgres:// or postgresql:// for this production audit.')
  }
}

function toNumber(value: unknown) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function firstRow<T extends Record<string, unknown>>(rows: Array<Record<string, unknown>>): T {
  return (rows[0] || {}) as T
}

async function selectRows<T extends Record<string, unknown>>(sql: QueryClient, query: string, params: unknown[] = []): Promise<T[]> {
  const trimmed = query.trim()
  if (!/^(select|with)\b/i.test(trimmed) || forbiddenSqlStart.test(trimmed)) {
    throw new Error('Production DB audit attempted to run a non-read-only query.')
  }
  return await sql.unsafe(query, params) as T[]
}

async function selectOne<T extends Record<string, unknown>>(sql: QueryClient, query: string, params: unknown[] = []): Promise<T> {
  return firstRow<T>(await selectRows(sql, query, params))
}

function addCheck(checks: AuditCheck[], name: string, passed: boolean, detail: string, evidence?: Record<string, unknown>) {
  checks.push({
    name,
    status: passed ? 'passed' : 'failed',
    detail,
    evidence
  })
}

function addWarning(checks: AuditCheck[], name: string, detail: string, evidence?: Record<string, unknown>) {
  checks.push({ name, status: 'warning', detail, evidence })
}

function requireMinimum(checks: AuditCheck[], name: string, actual: number, minimum: number, evidence?: Record<string, unknown>) {
  addCheck(
    checks,
    name,
    actual >= minimum,
    `${actual} observed, minimum ${minimum}`,
    evidence
  )
}

function formatTableList(items: string[]) {
  return items.map((item) => `'${item.replace(/'/g, "''")}'`).join(', ')
}

async function auditDatabase(sql: QueryClient, thresholds: Record<string, number>) {
  const metrics: Record<string, unknown> = {}
  const checks: AuditCheck[] = []

  const tableRows = await selectRows<{ table_name: string }>(
    sql,
    `
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name IN (${formatTableList(requiredTables)})
      ORDER BY table_name
    `
  )
  const existingTables = new Set(tableRows.map((row) => String(row.table_name)))
  const missingTables = requiredTables.filter((table) => !existingTables.has(table))
  metrics.requiredTables = {
    required: requiredTables.length,
    present: tableRows.length,
    missing: missingTables
  }
  addCheck(checks, 'Production schema contains PlanV3 tables', missingTables.length === 0, missingTables.length ? `missing ${missingTables.join(', ')}` : 'all required tables are present')

  const affiliate = await selectOne(
    sql,
    `
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE COALESCE(NULLIF(TRIM(promo_link), ''), NULLIF(TRIM(short_promo_link), '')) IS NOT NULL)::int AS with_promo_link,
        COUNT(*) FILTER (WHERE COALESCE(NULLIF(TRIM(short_promo_link), ''), NULLIF(TRIM(promo_link), '')) IS NOT NULL)::int AS with_short_or_promo_link,
        COUNT(*) FILTER (
          WHERE youtube_match_terms_json IS NOT NULL
            AND jsonb_typeof(youtube_match_terms_json) = 'array'
            AND jsonb_array_length(youtube_match_terms_json) > 0
        )::int AS with_youtube_match_terms,
        COUNT(*) FILTER (WHERE updated_at >= NOW() - INTERVAL '24 hours')::int AS updated_24h,
        COUNT(*) FILTER (WHERE updated_at >= NOW() - INTERVAL '7 days')::int AS updated_7d,
        COUNT(*) FILTER (WHERE price_amount IS NOT NULL AND price_amount > 0)::int AS with_price,
        COUNT(*) FILTER (WHERE review_count IS NOT NULL AND review_count > 0)::int AS with_reviews
      FROM affiliate_products
    `
  )
  const affiliateByPlatform = await selectRows(
    sql,
    `
      SELECT
        platform,
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE COALESCE(NULLIF(TRIM(promo_link), ''), NULLIF(TRIM(short_promo_link), '')) IS NOT NULL)::int AS with_promo_link,
        COUNT(*) FILTER (WHERE updated_at >= NOW() - INTERVAL '7 days')::int AS updated_7d
      FROM affiliate_products
      GROUP BY platform
      ORDER BY total DESC, platform ASC
    `
  )
  metrics.affiliateProducts = {
    ...affiliate,
    byPlatform: affiliateByPlatform
  }
  requireMinimum(checks, 'PartnerBoost affiliate inventory exists', toNumber(affiliate.total), thresholds.minAffiliateProducts, affiliate)
  requireMinimum(checks, 'Affiliate inventory has monetizable promo links', toNumber(affiliate.with_promo_link), thresholds.minAffiliateProducts, affiliate)
  requireMinimum(checks, 'Affiliate inventory has YouTube matching terms', toNumber(affiliate.with_youtube_match_terms), thresholds.minAffiliateProducts, affiliate)
  requireMinimum(checks, 'Affiliate sync freshness is visible in production', toNumber(affiliate.updated_7d), thresholds.minFreshAffiliateProducts, affiliate)

  const products = await selectOne(
    sql,
    `
      WITH product_quality AS (
        SELECT
          p.id,
          p.slug,
          p.affiliate_product_id,
          p.source_affiliate_link,
          p.resolved_url,
          p.canonical_url,
          p.category,
          p.category_slug,
          p.price_amount,
          p.current_price,
          p.review_count,
          EXISTS (
            SELECT 1
            FROM affiliate_links al
            WHERE al.product_id = p.id
              AND al.status NOT IN ('broken', 'inactive')
              AND COALESCE(NULLIF(TRIM(al.affiliate_url), ''), '') <> ''
          ) AS has_active_affiliate_link,
          (
            SELECT COUNT(*)
            FROM analysis_reports ar
            INNER JOIN review_videos rv ON rv.id = ar.video_id
            WHERE ar.product_id = p.id
              AND COALESCE(NULLIF(TRIM(rv.youtube_id), ''), '') <> ''
              AND COALESCE(NULLIF(TRIM(ar.evidence_quote), ''), '') <> ''
              AND ar.evidence_confidence >= 0.65
              AND COALESCE(ar.is_advertorial, 0) = 0
          ) AS public_evidence_count
        FROM products p
      )
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE affiliate_product_id IS NOT NULL)::int AS linked_affiliate_products,
        COUNT(*) FILTER (
          WHERE COALESCE(NULLIF(TRIM(source_affiliate_link), ''), NULLIF(TRIM(resolved_url), ''), NULLIF(TRIM(canonical_url), '')) IS NOT NULL
             OR has_active_affiliate_link
        )::int AS with_merchant_target,
        COUNT(*) FILTER (WHERE COALESCE(NULLIF(TRIM(category), ''), NULLIF(TRIM(category_slug), '')) IS NOT NULL)::int AS with_category,
        COUNT(*) FILTER (WHERE COALESCE(price_amount, current_price, 0) > 0)::int AS with_price,
        COUNT(*) FILTER (WHERE COALESCE(review_count, 0) > 0)::int AS with_reviews,
        COUNT(*) FILTER (
          WHERE COALESCE(NULLIF(TRIM(slug), ''), '') <> ''
            AND (
              COALESCE(NULLIF(TRIM(source_affiliate_link), ''), NULLIF(TRIM(resolved_url), ''), NULLIF(TRIM(canonical_url), '')) IS NOT NULL
              OR has_active_affiliate_link
              OR public_evidence_count > 0
            )
        )::int AS public_eligible,
        COUNT(*) FILTER (WHERE public_evidence_count > 0)::int AS with_public_evidence
      FROM product_quality
    `
  )
  metrics.products = products
  requireMinimum(checks, 'Synced products are linked to affiliate inventory', toNumber(products.linked_affiliate_products), thresholds.minLinkedProducts, products)
  requireMinimum(checks, 'Products have public merchant handoff targets', toNumber(products.with_merchant_target), thresholds.minLinkedProducts, products)
  requireMinimum(checks, 'Products are public-eligible without blank/dead cards', toNumber(products.public_eligible), thresholds.minLinkedProducts, products)

  const videos = await selectOne(
    sql,
    `
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE COALESCE(NULLIF(TRIM(transcript), ''), '') <> '' AND LENGTH(TRIM(transcript)) >= 120)::int AS with_full_transcript,
        COUNT(*) FILTER (WHERE processed_status = 'success')::int AS success_status,
        COUNT(*) FILTER (WHERE entity_match_json IS NOT NULL AND entity_match_json::text <> 'null' AND entity_match_json::text <> '{}')::int AS with_entity_match,
        COUNT(*) FILTER (WHERE updated_at >= NOW() - INTERVAL '7 days')::int AS updated_7d
      FROM review_videos
    `
  )
  const videosByStatus = await selectRows(
    sql,
    `
      SELECT processed_status, COUNT(*)::int AS total
      FROM review_videos
      GROUP BY processed_status
      ORDER BY total DESC, processed_status ASC
    `
  )
  metrics.reviewVideos = {
    ...videos,
    byStatus: videosByStatus
  }
  requireMinimum(checks, 'YouTube review videos exist', toNumber(videos.total), thresholds.minReviewVideos, videos)
  requireMinimum(checks, 'YouTube transcripts are available for evidence extraction', toNumber(videos.with_full_transcript), thresholds.minTranscriptVideos, videos)
  requireMinimum(checks, 'YouTube videos are entity-matched to products', toNumber(videos.with_entity_match), thresholds.minMatchedVideos, videos)

  const evidence = await selectOne(
    sql,
    `
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (
          WHERE COALESCE(NULLIF(TRIM(rv.youtube_id), ''), '') <> ''
            AND COALESCE(NULLIF(TRIM(ar.evidence_quote), ''), '') <> ''
            AND LENGTH(TRIM(ar.evidence_quote)) >= 40
            AND COALESCE(NULLIF(TRIM(ar.context_snippet), ''), '') <> ''
            AND LENGTH(TRIM(ar.context_snippet)) >= 20
            AND ar.evidence_confidence >= 0.65
            AND COALESCE(ar.is_advertorial, 0) = 0
        )::int AS usable_reports,
        COUNT(DISTINCT ar.product_id) FILTER (
          WHERE COALESCE(NULLIF(TRIM(rv.youtube_id), ''), '') <> ''
            AND ar.evidence_confidence >= 0.65
            AND COALESCE(ar.is_advertorial, 0) = 0
        )::int AS products_with_usable_evidence,
        COUNT(DISTINCT ar.video_id) FILTER (
          WHERE COALESCE(NULLIF(TRIM(rv.youtube_id), ''), '') <> ''
            AND ar.evidence_confidence >= 0.65
            AND COALESCE(ar.is_advertorial, 0) = 0
        )::int AS videos_with_usable_evidence,
        COUNT(*) FILTER (WHERE COALESCE(ar.is_advertorial, 0) <> 0)::int AS advertorial_reports,
        COUNT(*) FILTER (WHERE ar.evidence_confidence < 0.65)::int AS low_confidence_reports
      FROM analysis_reports ar
      INNER JOIN review_videos rv ON rv.id = ar.video_id
    `
  )
  metrics.analysisReports = evidence
  requireMinimum(checks, 'Review evidence reports are usable and non-advertorial', toNumber(evidence.usable_reports), thresholds.minUsableEvidenceReports, evidence)
  requireMinimum(checks, 'Evidence covers reviewable products', toNumber(evidence.products_with_usable_evidence), thresholds.minProductsWithEvidence, evidence)

  const intent = await selectOne(
    sql,
    `
      WITH intent_sources AS (
        SELECT normalized_query AS text_value FROM taxonomy_intent_sources
        UNION ALL
        SELECT trigger_query AS text_value FROM pending_tags
      ),
      long_tail_intents AS (
        SELECT text_value
        FROM intent_sources
        WHERE array_length(
          regexp_split_to_array(trim(regexp_replace(lower(COALESCE(text_value, '')), '[^a-z0-9]+', ' ', 'g')), '\\s+'),
          1
        ) >= 3
      ),
      long_tail_tags AS (
        SELECT canonical_name
        FROM taxonomy_tags
        WHERE array_length(
          regexp_split_to_array(trim(regexp_replace(lower(COALESCE(canonical_name, '')), '[^a-z0-9]+', ' ', 'g')), '\\s+'),
          1
        ) >= 3
      )
      SELECT
        (SELECT COUNT(*) FROM taxonomy_intent_sources)::int AS intent_sources,
        (SELECT COUNT(*) FROM pending_tags)::int AS pending_tags,
        (SELECT COUNT(*) FROM taxonomy_tags)::int AS taxonomy_tags,
        (SELECT COUNT(*) FROM long_tail_intents)::int AS long_tail_intents,
        (SELECT COUNT(*) FROM long_tail_tags)::int AS long_tail_tags,
        (SELECT COUNT(*) FROM site_search_logs)::int AS site_search_logs
    `
  )
  metrics.intentMining = intent
  requireMinimum(checks, 'Long-tail keyword and intent mining is populated', toNumber(intent.long_tail_intents) + toNumber(intent.long_tail_tags), thresholds.minLongTailIntents, intent)

  const articles = await selectOne(
    sql,
    `
      WITH review_quality AS (
        SELECT
          a.id,
          a.product_id,
          a.slug,
          a.title,
          a.summary,
          a.keyword,
          a.content_html,
          (
            SELECT COUNT(*)
            FROM analysis_reports ar
            INNER JOIN review_videos rv ON rv.id = ar.video_id
            WHERE ar.product_id = a.product_id
              AND COALESCE(NULLIF(TRIM(rv.youtube_id), ''), '') <> ''
              AND COALESCE(NULLIF(TRIM(ar.evidence_quote), ''), '') <> ''
              AND ar.evidence_confidence >= 0.65
              AND COALESCE(ar.is_advertorial, 0) = 0
          ) AS public_evidence_count
        FROM articles a
        WHERE a.article_type = 'review'
          AND a.status = 'published'
      )
      SELECT
        COUNT(*)::int AS published_reviews,
        COUNT(*) FILTER (WHERE product_id IS NOT NULL)::int AS with_product,
        COUNT(*) FILTER (WHERE COALESCE(NULLIF(TRIM(slug), ''), '') <> '')::int AS with_slug,
        COUNT(*) FILTER (WHERE COALESCE(NULLIF(TRIM(keyword), ''), '') <> '')::int AS with_keyword,
        COUNT(*) FILTER (WHERE content_html ILIKE '%Quick answer:%')::int AS with_quick_answer,
        COUNT(*) FILTER (WHERE content_html ILIKE '%Review Verdict%')::int AS with_review_verdict,
        COUNT(*) FILTER (WHERE content_html ILIKE '%YouTube Review Proof%')::int AS with_youtube_proof,
        COUNT(*) FILTER (WHERE public_evidence_count > 0)::int AS with_public_evidence,
        COUNT(*) FILTER (
          WHERE LENGTH(TRIM(COALESCE(title, ''))) < 20
             OR LENGTH(TRIM(COALESCE(summary, ''))) < 60
             OR LENGTH(TRIM(COALESCE(content_html, ''))) < 500
        )::int AS thin_or_blank_reviews,
        COUNT(*) FILTER (WHERE public_evidence_count <= 0)::int AS reviews_without_public_evidence
      FROM review_quality
    `
  )
  metrics.articles = articles
  requireMinimum(checks, 'Published pSEO review pages exist', toNumber(articles.published_reviews), thresholds.minPublishedReviews, articles)
  requireMinimum(checks, 'Published reviews carry YouTube proof modules', toNumber(articles.with_youtube_proof), thresholds.minPublishedReviews, articles)
  addCheck(
    checks,
    'Published reviews are not blank, thin, or evidence-free',
    toNumber(articles.thin_or_blank_reviews) === 0 && toNumber(articles.reviews_without_public_evidence) === 0,
    `${articles.thin_or_blank_reviews} thin/blank, ${articles.reviews_without_public_evidence} without public evidence`,
    articles
  )

  const seo = await selectOne(
    sql,
    `
      SELECT
        COUNT(*) FILTER (WHERE status = 'published' AND (page_type = 'review' OR pathname LIKE '/reviews/%'))::int AS published_review_pages,
        COUNT(*) FILTER (WHERE status = 'published' AND (page_type = 'review' OR pathname LIKE '/reviews/%') AND article_id IS NOT NULL)::int AS linked_review_pages,
        COUNT(*) FILTER (WHERE status = 'published' AND (page_type = 'review' OR pathname LIKE '/reviews/%') AND COALESCE(NULLIF(TRIM(canonical_url), ''), '') <> '')::int AS with_canonical,
        COUNT(*) FILTER (
          WHERE status = 'published'
            AND (
              COALESCE(NULLIF(TRIM(title), ''), '') = ''
              OR COALESCE(NULLIF(TRIM(meta_description), ''), '') = ''
              OR COALESCE(NULLIF(TRIM(canonical_url), ''), '') = ''
            )
        )::int AS incomplete_published_pages
      FROM seo_pages
    `
  )
  metrics.seoPages = seo
  requireMinimum(checks, 'SEO page records exist for published reviews', toNumber(seo.published_review_pages), thresholds.minSeoReviewPages, seo)
  requireMinimum(checks, 'Published review SEO records have canonical URLs', toNumber(seo.with_canonical), thresholds.minSeoReviewPages, seo)
  addCheck(checks, 'No incomplete published SEO pages', toNumber(seo.incomplete_published_pages) === 0, `${seo.incomplete_published_pages} incomplete published pages`, seo)

  const conversion = await selectOne(
    sql,
    `
      WITH eligible_handoffs AS (
        SELECT DISTINCT p.id
        FROM products p
        LEFT JOIN affiliate_links al ON al.product_id = p.id AND al.status NOT IN ('broken', 'inactive')
        WHERE COALESCE(NULLIF(TRIM(p.slug), ''), '') <> ''
          AND (
            COALESCE(NULLIF(TRIM(p.source_affiliate_link), ''), NULLIF(TRIM(p.resolved_url), ''), NULLIF(TRIM(p.canonical_url), '')) IS NOT NULL
            OR COALESCE(NULLIF(TRIM(al.affiliate_url), ''), '') <> ''
          )
      )
      SELECT
        (SELECT COUNT(*) FROM eligible_handoffs)::int AS eligible_handoff_products,
        (SELECT COUNT(*) FROM merchant_click_events)::int AS merchant_click_events,
        (SELECT COUNT(*) FROM merchant_click_events WHERE created_at >= NOW() - INTERVAL '24 hours')::int AS merchant_clicks_24h,
        (SELECT COUNT(*) FROM merchant_click_events WHERE created_at >= NOW() - INTERVAL '7 days')::int AS merchant_clicks_7d,
        (SELECT COUNT(DISTINCT product_id) FROM merchant_click_events)::int AS clicked_products,
        (SELECT COUNT(*) FROM buyer_decision_events)::int AS buyer_decision_events,
        (SELECT COUNT(*) FROM buyer_decision_events WHERE created_at >= NOW() - INTERVAL '7 days')::int AS buyer_decision_events_7d
    `
  )
  metrics.conversion = conversion
  requireMinimum(checks, 'Eligible affiliate handoff products exist', toNumber(conversion.eligible_handoff_products), thresholds.minLinkedProducts, conversion)
  requireMinimum(checks, 'Merchant click telemetry table is production-readable', toNumber(conversion.merchant_click_events), thresholds.minMerchantClickEvents, conversion)

  const pipeline = await selectOne(
    sql,
    `
      SELECT
        COUNT(*)::int AS total_runs,
        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days')::int AS runs_7d,
        COUNT(*) FILTER (
          WHERE run_type ILIKE '%commercial%'
             OR COALESCE(requested_action, '') ILIKE '%commercial%'
             OR COALESCE(payload_json::text, '') ILIKE '%commercial%'
        )::int AS commercial_runs
      FROM content_pipeline_runs
    `
  )
  metrics.pipeline = pipeline
  if (toNumber(pipeline.commercial_runs) === 0) {
    addWarning(checks, 'Commercial loop pipeline history is empty', 'No commercial content_pipeline_runs rows found; continuous CLI may run outside the pipeline table.', pipeline)
  } else {
    addCheck(checks, 'Commercial loop pipeline history is visible', true, `${pipeline.commercial_runs} commercial runs`, pipeline)
  }

  const latestReviews = await selectRows(
    sql,
    `
      SELECT
        a.id,
        a.slug,
        '/reviews/' || a.slug AS path,
        p.id AS product_id,
        p.product_name,
        sp.pathname AS seo_pathname,
        COUNT(ar.id)::int AS usable_evidence_count,
        MAX(rv.youtube_id) AS sample_youtube_id,
        MAX(rv.channel_name) AS sample_channel_name
      FROM articles a
      INNER JOIN products p ON p.id = a.product_id
      LEFT JOIN seo_pages sp ON sp.article_id = a.id
      LEFT JOIN analysis_reports ar ON ar.product_id = p.id
        AND ar.evidence_confidence >= 0.65
        AND COALESCE(ar.is_advertorial, 0) = 0
      LEFT JOIN review_videos rv ON rv.id = ar.video_id
      WHERE a.article_type = 'review'
        AND a.status = 'published'
      GROUP BY a.id, a.slug, p.id, p.product_name, sp.pathname, a.published_at
      ORDER BY a.published_at DESC NULLS LAST, a.id DESC
      LIMIT 5
    `
  )
  metrics.latestPublishedReviews = latestReviews

  return { checks, metrics, latestReviews }
}

async function fetchPublicSurface(appUrl: string, latestReviews: Array<Record<string, unknown>>) {
  if (!hasFlag('fetch-public')) return { skipped: true, reason: 'pass --fetch-public to verify public review pages over HTTPS' }
  const sample = latestReviews.find((item) => String(item.path || '').startsWith('/reviews/'))
  if (!sample) return { skipped: true, reason: 'no published review sample found in production DB' }

  const target = `${appUrl}${sample.path}`
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 30_000)
  try {
    const response = await fetch(target, {
      method: 'GET',
      redirect: 'manual',
      signal: controller.signal,
      headers: {
        Accept: 'text/html'
      }
    })
    const body = await response.text()
    return {
      url: target,
      status: response.status,
      ok: response.status >= 200 && response.status < 300,
      hasQuickAnswer: body.includes('Quick answer:'),
      hasYouTubeProof: body.includes('YouTube Review Proof'),
      hasAffiliateDisclosure: /commission|affiliate/i.test(body)
    }
  } finally {
    clearTimeout(timeout)
  }
}

async function writeReport(outputDir: string, summary: AuditSummary) {
  await fs.mkdir(outputDir, { recursive: true })
  const reportPath = path.join(outputDir, `planv3-production-db-audit-${new Date().toISOString().replace(/[:.]/g, '-')}.json`)
  await fs.writeFile(reportPath, `${JSON.stringify(summary, null, 2)}\n`)
  console.log(`REPORT ${reportPath}`)
}

function buildSummary(appUrl: string, thresholds: Record<string, number>, checks: AuditCheck[], metrics: Record<string, unknown>, publicSurface?: Record<string, unknown>): AuditSummary {
  return {
    generatedAt: new Date().toISOString(),
    mode: 'production-postgres-readonly',
    appUrl,
    thresholds,
    totals: {
      passed: checks.filter((check) => check.status === 'passed').length,
      failed: checks.filter((check) => check.status === 'failed').length,
      warning: checks.filter((check) => check.status === 'warning').length
    },
    checks,
    metrics,
    publicSurface
  }
}

async function main() {
  const envValues = await buildEnvValues()
  const databaseUrl = envValues.DATABASE_URL || envValues.PLANV3_DATABASE_URL || ''
  const appUrl = normalizeProductionAppUrl(envValues.PLANV3_PRODUCTION_APP_URL || envValues.NEXT_PUBLIC_APP_URL)
  const outputDir = envValues.PLANV3_PRODUCTION_DB_AUDIT_OUTPUT_DIR || 'qa-results'
  const thresholds = {
    minAffiliateProducts: readInteger(envValues, 'PLANV3_AUDIT_MIN_AFFILIATE_PRODUCTS', 1),
    minFreshAffiliateProducts: readInteger(envValues, 'PLANV3_AUDIT_MIN_FRESH_AFFILIATE_PRODUCTS', 1),
    minLinkedProducts: readInteger(envValues, 'PLANV3_AUDIT_MIN_LINKED_PRODUCTS', 1),
    minReviewVideos: readInteger(envValues, 'PLANV3_AUDIT_MIN_REVIEW_VIDEOS', 1),
    minTranscriptVideos: readInteger(envValues, 'PLANV3_AUDIT_MIN_TRANSCRIPT_VIDEOS', 1),
    minMatchedVideos: readInteger(envValues, 'PLANV3_AUDIT_MIN_MATCHED_VIDEOS', 1),
    minUsableEvidenceReports: readInteger(envValues, 'PLANV3_AUDIT_MIN_USABLE_EVIDENCE_REPORTS', 1),
    minProductsWithEvidence: readInteger(envValues, 'PLANV3_AUDIT_MIN_PRODUCTS_WITH_EVIDENCE', 1),
    minLongTailIntents: readInteger(envValues, 'PLANV3_AUDIT_MIN_LONG_TAIL_INTENTS', 1),
    minPublishedReviews: readInteger(envValues, 'PLANV3_AUDIT_MIN_PUBLISHED_REVIEWS', 1),
    minSeoReviewPages: readInteger(envValues, 'PLANV3_AUDIT_MIN_SEO_REVIEW_PAGES', 1),
    minMerchantClickEvents: readInteger(envValues, 'PLANV3_AUDIT_MIN_MERCHANT_CLICK_EVENTS', 0)
  }

  try {
    assertPostgresUrl(databaseUrl)
  } catch (error: any) {
    const checks: AuditCheck[] = [{
      name: 'Production Postgres DATABASE_URL is configured',
      status: 'failed',
      detail: error?.message || String(error)
    }]
    const summary = buildSummary(appUrl, thresholds, checks, {
      databaseUrlPresent: Boolean(databaseUrl),
      databaseUrlPrinted: false,
      sqliteFallbackAllowed: false
    })
    await writeReport(outputDir, summary)
    throw new Error(`${checks[0].detail} Run with DATABASE_URL set to the production Postgres URL; this script intentionally does not read SQLite.`)
  }

  const sql = postgres(databaseUrl, {
    max: 1,
    idle_timeout: 5,
    connect_timeout: 10,
    prepare: false,
    onnotice: () => {}
  })

  try {
    const result = await sql.begin('read only', async (tx) => {
      return await auditDatabase(tx as unknown as QueryClient, thresholds)
    })
    const publicSurface = await fetchPublicSurface(appUrl, result.latestReviews)
    const checks = [...result.checks]
    if (publicSurface && publicSurface.skipped !== true) {
      addCheck(
        checks,
        'Public review surface responds over production HTTPS',
        Boolean(publicSurface.ok && publicSurface.hasQuickAnswer && publicSurface.hasYouTubeProof),
        `status ${publicSurface.status}, quickAnswer=${publicSurface.hasQuickAnswer}, youtubeProof=${publicSurface.hasYouTubeProof}`,
        publicSurface
      )
    }
    const summary = buildSummary(appUrl, thresholds, checks, result.metrics, publicSurface)
    await writeReport(outputDir, summary)
    for (const check of checks) {
      const prefix = check.status.toUpperCase()
      console.log(`${prefix} ${check.name} - ${check.detail}`)
    }
    if (summary.totals.failed > 0) {
      throw new Error(`PlanV3 production DB audit failed: ${summary.totals.failed} failed, ${summary.totals.warning} warnings`)
    }
    console.log(`PlanV3 production DB audit passed: ${summary.totals.passed} passed, ${summary.totals.warning} warnings`)
  } finally {
    await sql.end({ timeout: 5 })
  }
}

main().catch((error) => {
  console.error(error?.message || String(error))
  process.exit(1)
})
