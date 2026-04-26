import { getDatabase } from '@/lib/db'
import { classifyLinkHealth, extractAmazonUrls, type LinkHealthResult } from '@/lib/entity-resolution'
import type { EntryStatus } from '@/lib/hardcore'
import { summarizePriceValue } from '@/lib/hardcore'
import { slugify } from '@/lib/slug'

export interface SearchIntentInput {
  query: string
  matchedTagId?: number | null
  matchedCategorySlug?: string | null
  source?: string | null
}

export interface PriceSnapshotInput {
  productId: number
  currentPrice: number | null
  histLowPrice: number | null
  avg90dPrice: number | null
  currency?: string | null
  consensusScore5: number | null
  source?: string | null
}

export interface PriceAlertInput {
  productId: number
  email: string
  targetPrice?: number | null
  targetValueScore?: number | null
}

export interface TaxonomyIntentSourceInput {
  categorySlug: string
  sourceType: 'amazon_autosuggest' | 'google_keyword_planner' | 'reddit' | 'manual' | string
  rawQuery: string
  searchVolume?: number | null
  competition?: string | null
}

export interface EvidenceFeedbackInput {
  analysisReportId?: number | null
  videoId?: number | null
  feedbackType: 'inaccurate' | 'wrong_product' | 'bad_quote' | 'useful' | string
}

function normalizeQuery(value: string) {
  return value.replace(/\s+/g, ' ').trim().slice(0, 180)
}

function normalizeEmail(value: string) {
  return value.trim().toLowerCase()
}

function priorityFromHits(hitCount: number) {
  if (hitCount >= 10) return 1
  if (hitCount >= 5) return 0.75
  if (hitCount >= 3) return 0.5
  return 0.25
}

export async function queueTaxonomyRescan(categorySlug: string, tagSlug: string, reason: string) {
  const db = await getDatabase()
  const existing = await db.queryOne<{ id: number }>(
    `
      SELECT id
      FROM taxonomy_rescan_queue
      WHERE category_slug = ? AND tag_slug = ? AND status IN ('queued', 'processing')
      LIMIT 1
    `,
    [categorySlug, tagSlug]
  )
  if (existing?.id) return existing.id

  const result = await db.exec(
    `
      INSERT INTO taxonomy_rescan_queue (category_slug, tag_slug, reason, status)
      VALUES (?, ?, ?, 'queued')
    `,
    [categorySlug, tagSlug, reason]
  )
  return Number(result.lastInsertRowid || 0)
}

export async function recordSearchIntent(input: SearchIntentInput) {
  const query = normalizeQuery(input.query)
  const source = slugify(input.source || 'site_search') || 'site_search'
  const db = await getDatabase()
  const existing = await db.queryOne<{ id: number; hit_count: number }>(
    'SELECT id, hit_count FROM site_search_logs WHERE query_text = ? LIMIT 1',
    [query]
  )
  const hitCount = existing?.id ? existing.hit_count + 1 : 1
  const status = input.matchedTagId ? 'matched' : 'pending'

  if (existing?.id) {
    await db.exec(
      `
        UPDATE site_search_logs
        SET hit_count = ?, matched_tag_id = COALESCE(?, matched_tag_id), status = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
      [hitCount, input.matchedTagId || null, status, existing.id]
    )
  } else {
    await db.exec(
      `
        INSERT INTO site_search_logs (query_text, hit_count, matched_tag_id, status)
        VALUES (?, ?, ?, ?)
      `,
      [query, hitCount, input.matchedTagId || null, status]
    )
  }

  if (input.matchedTagId || !input.matchedCategorySlug) {
    return { query, hitCount, status, pendingTag: null }
  }

  const pendingSlug = slugify(query)
  const pendingName = query
    .split(' ')
    .map((word) => (word ? `${word.charAt(0).toUpperCase()}${word.slice(1)}` : word))
    .join(' ')
  const existingPending = await db.queryOne<{ id: number; hit_count: number }>(
    'SELECT id, hit_count FROM pending_tags WHERE category_slug = ? AND slug = ? LIMIT 1',
    [input.matchedCategorySlug, pendingSlug]
  )
  const pendingHitCount = existingPending?.id ? existingPending.hit_count + 1 : hitCount
  const priorityScore = priorityFromHits(pendingHitCount)

  if (existingPending?.id) {
    await db.exec(
      `
        UPDATE pending_tags
        SET hit_count = ?, priority_score = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
      [pendingHitCount, priorityScore, existingPending.id]
    )
  } else {
    await db.exec(
      `
        INSERT INTO pending_tags (category_slug, canonical_name, slug, trigger_query, hit_count, source, status, priority_score)
        VALUES (?, ?, ?, ?, ?, ?, 'pending', ?)
      `,
      [input.matchedCategorySlug, pendingName, pendingSlug, query, pendingHitCount, source, priorityScore]
    )
  }

  await queueTaxonomyRescan(input.matchedCategorySlug, pendingSlug, `New internal search intent: ${query}`)

  return {
    query,
    hitCount,
    status,
    pendingTag: {
      categorySlug: input.matchedCategorySlug,
      name: pendingName,
      slug: pendingSlug,
      priorityScore
    }
  }
}

export async function recordTaxonomyIntentSource(input: TaxonomyIntentSourceInput) {
  const categorySlug = slugify(input.categorySlug)
  const rawQuery = normalizeQuery(input.rawQuery)
  const normalizedQuery = slugify(rawQuery)
  const sourceType = slugify(input.sourceType) || 'manual'
  const searchVolume = Math.max(0, Math.round(Number(input.searchVolume || 0)))
  const competition = input.competition ? String(input.competition).trim().slice(0, 60) : null

  if (!categorySlug || !rawQuery || !normalizedQuery) {
    throw new Error('invalid_taxonomy_intent_source')
  }

  const db = await getDatabase()
  const existing = await db.queryOne<{ id: number }>(
    `
      SELECT id
      FROM taxonomy_intent_sources
      WHERE category_slug = ? AND source_type = ? AND normalized_query = ?
      LIMIT 1
    `,
    [categorySlug, sourceType, normalizedQuery]
  )

  if (existing?.id) {
    await db.exec(
      `
        UPDATE taxonomy_intent_sources
        SET raw_query = ?, search_volume = ?, competition = COALESCE(?, competition), updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
      [rawQuery, searchVolume, competition, existing.id]
    )
    return { id: existing.id, status: 'updated' as const }
  }

  const result = await db.exec(
    `
      INSERT INTO taxonomy_intent_sources (
        category_slug,
        source_type,
        raw_query,
        normalized_query,
        search_volume,
        competition,
        status
      ) VALUES (?, ?, ?, ?, ?, ?, 'new')
    `,
    [categorySlug, sourceType, rawQuery, normalizedQuery, searchVolume, competition]
  )

  return { id: Number(result.lastInsertRowid || 0), status: 'created' as const }
}

export async function promoteIntentSourceToPendingTag({
  categorySlug,
  rawQuery,
  source,
  searchVolume
}: {
  categorySlug: string
  rawQuery: string
  source: string
  searchVolume?: number | null
}) {
  const query = normalizeQuery(rawQuery)
  const pendingSlug = slugify(query)
  if (!pendingSlug) return null
  const priorityScore = Math.min(1, Math.max(priorityFromHits(1), Number(searchVolume || 0) / 10000))
  const canonicalName = query
    .split(' ')
    .map((word) => (word ? `${word.charAt(0).toUpperCase()}${word.slice(1)}` : word))
    .join(' ')
  const db = await getDatabase()
  const existing = await db.queryOne<{ id: number; hit_count: number }>(
    'SELECT id, hit_count FROM pending_tags WHERE category_slug = ? AND slug = ? LIMIT 1',
    [categorySlug, pendingSlug]
  )

  if (existing?.id) {
    await db.exec(
      `
        UPDATE pending_tags
        SET hit_count = ?, priority_score = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
      [existing.hit_count + 1, priorityScore, existing.id]
    )
    await queueTaxonomyRescan(categorySlug, pendingSlug, `Updated external taxonomy intent: ${query}`)
    return { id: existing.id, status: 'updated' as const }
  }

  const result = await db.exec(
    `
      INSERT INTO pending_tags (category_slug, canonical_name, slug, trigger_query, hit_count, source, status, priority_score)
      VALUES (?, ?, ?, ?, 1, ?, 'pending', ?)
    `,
    [categorySlug, canonicalName, pendingSlug, query, source, priorityScore]
  )
  await queueTaxonomyRescan(categorySlug, pendingSlug, `New external taxonomy intent: ${query}`)
  return { id: Number(result.lastInsertRowid || 0), status: 'created' as const }
}

export async function recordPriceValueSnapshot(input: PriceSnapshotInput) {
  const db = await getDatabase()
  const summary = summarizePriceValue({
    currentPrice: input.currentPrice,
    histLowPrice: input.histLowPrice,
    avg90dPrice: input.avg90dPrice,
    currency: input.currency || 'USD',
    consensusScore5: input.consensusScore5
  })

  await db.exec(
    `
      INSERT INTO price_value_snapshots (
        product_id,
        current_price,
        hist_low_price,
        avg_90d_price,
        consensus_score,
        value_score,
        entry_status,
        source
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      input.productId,
      input.currentPrice,
      input.histLowPrice,
      input.avg90dPrice,
      input.consensusScore5,
      summary.valueScore,
      summary.entryStatus,
      input.source || 'affiliate'
    ]
  )

  await db.exec(
    `
      UPDATE products
      SET current_price = ?, hist_low_price = ?, avg_90d_price = ?, price_status = ?, price_last_checked_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `,
    [input.currentPrice, input.histLowPrice, input.avg90dPrice, summary.entryStatus, input.productId]
  )

  return summary
}

export async function refreshPriceValueSnapshotsForProducts(limit = 250) {
  const db = await getDatabase()
  const rows = await db.query<{
    id: number
    price_amount: number | null
    price_currency: string | null
    current_price: number | null
    hist_low_price: number | null
    avg_90d_price: number | null
    consensus_score: number | null
  }>(
    `
      SELECT
        p.id,
        p.price_amount,
        p.price_currency,
        p.current_price,
        p.hist_low_price,
        p.avg_90d_price,
        (
          SELECT AVG(
            CASE ar.rating
              WHEN 'Excellent' THEN 5
              WHEN 'Good' THEN 4
              WHEN 'Average' THEN 3
              WHEN 'Struggles' THEN 2
              WHEN 'Fails' THEN 1
              ELSE NULL
            END
          )
          FROM analysis_reports ar
          WHERE ar.product_id = p.id
        ) AS consensus_score
      FROM products p
      WHERE p.slug IS NOT NULL
      ORDER BY COALESCE(p.price_last_checked_at, p.updated_at, p.created_at) ASC
      LIMIT ?
    `,
    [limit]
  )

  const results = []
  for (const row of rows) {
    const currentPrice = row.current_price ?? row.price_amount
    const summary = await recordPriceValueSnapshot({
      productId: row.id,
      currentPrice,
      histLowPrice: row.hist_low_price,
      avg90dPrice: row.avg_90d_price,
      currency: row.price_currency,
      consensusScore5: row.consensus_score,
      source: 'scheduled-refresh'
    })
    results.push({ productId: row.id, entryStatus: summary.entryStatus, valueScore: summary.valueScore })
  }

  return results
}

export async function upsertPriceAlert(input: PriceAlertInput) {
  const email = normalizeEmail(input.email)
  if (!email || !email.includes('@')) {
    throw new Error('valid_email_required')
  }

  const db = await getDatabase()
  const existing = await db.queryOne<{ id: number }>(
    'SELECT id FROM price_alerts WHERE product_id = ? AND email = ? LIMIT 1',
    [input.productId, email]
  )

  if (existing?.id) {
    await db.exec(
      `
        UPDATE price_alerts
        SET target_price = ?, target_value_score = ?, status = 'active', updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
      [input.targetPrice || null, input.targetValueScore || null, existing.id]
    )
    return { id: existing.id, status: 'updated' as const }
  }

  const result = await db.exec(
    `
      INSERT INTO price_alerts (product_id, email, target_price, target_value_score, status)
      VALUES (?, ?, ?, ?, 'active')
    `,
    [input.productId, email, input.targetPrice || null, input.targetValueScore || null]
  )
  return { id: Number(result.lastInsertRowid || 0), status: 'created' as const }
}

export async function evaluatePriceAlerts(limit = 250, markNotified = false) {
  const db = await getDatabase()
  const rows = await db.query<{
    id: number
    product_id: number
    email: string
    target_price: number | null
    target_value_score: number | null
    product_name: string
    slug: string | null
    current_price: number | null
    price_currency: string | null
    value_score: number | null
    entry_status: string | null
  }>(
    `
      SELECT
        pa.id,
        pa.product_id,
        pa.email,
        pa.target_price,
        pa.target_value_score,
        p.product_name,
        p.slug,
        p.current_price,
        p.price_currency,
        (
          SELECT pvs.value_score
          FROM price_value_snapshots pvs
          WHERE pvs.product_id = pa.product_id
          ORDER BY pvs.captured_at DESC, pvs.id DESC
          LIMIT 1
        ) AS value_score,
        (
          SELECT pvs.entry_status
          FROM price_value_snapshots pvs
          WHERE pvs.product_id = pa.product_id
          ORDER BY pvs.captured_at DESC, pvs.id DESC
          LIMIT 1
        ) AS entry_status
      FROM price_alerts pa
      JOIN products p ON p.id = pa.product_id
      WHERE pa.status = 'active'
      ORDER BY pa.updated_at ASC
      LIMIT ?
    `,
    [limit]
  )

  const triggered = rows.filter((row) => {
    const priceHit = row.target_price != null && row.current_price != null && row.current_price <= row.target_price
    const valueHit = row.target_value_score != null && row.value_score != null && row.value_score >= row.target_value_score
    const bestWindow = row.entry_status === 'best-deal' || row.entry_status === 'great-value'
    return priceHit || valueHit || bestWindow
  })

  if (markNotified && triggered.length) {
    const placeholders = triggered.map(() => '?').join(', ')
    await db.exec(
      `
        UPDATE price_alerts
        SET last_notified_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
        WHERE id IN (${placeholders})
      `,
      triggered.map((row) => row.id)
    )
  }

  return triggered
}

export async function recordEvidenceFeedback(input: EvidenceFeedbackInput) {
  const db = await getDatabase()
  const feedbackType = slugify(input.feedbackType) || 'inaccurate'
  const weightDelta = feedbackType === 'useful' ? 0.05 : -0.15
  const report = input.analysisReportId
    ? await db.queryOne<{ video_id: number }>('SELECT video_id FROM analysis_reports WHERE id = ? LIMIT 1', [input.analysisReportId])
    : null
  const videoId = input.videoId || report?.video_id || null

  const result = await db.exec(
    `
      INSERT INTO creator_feedback_events (analysis_report_id, video_id, feedback_type, weight_delta)
      VALUES (?, ?, ?, ?)
    `,
    [input.analysisReportId || null, videoId, feedbackType, weightDelta]
  )

  if (input.analysisReportId && weightDelta < 0) {
    await db.exec(
      `
        UPDATE analysis_reports
        SET evidence_confidence = CASE WHEN evidence_confidence + ? < 0.1 THEN 0.1 ELSE evidence_confidence + ? END, quality_flags_json = ?
        WHERE id = ?
      `,
      [weightDelta, weightDelta, JSON.stringify({ last_feedback: feedbackType }), input.analysisReportId]
    )
  }

  if (videoId && weightDelta < 0) {
    const aggregate = await db.queryOne<{ count: number }>(
      `
        SELECT COUNT(*) AS count
        FROM creator_feedback_events
        WHERE video_id = ? AND feedback_type IN ('inaccurate', 'wrong-product', 'bad-quote')
      `,
      [videoId]
    )
    if ((aggregate?.count || 0) >= 3) {
      await db.exec(
        `
          UPDATE analysis_reports
          SET evidence_confidence = CASE WHEN evidence_confidence - 0.1 < 0.1 THEN 0.1 ELSE evidence_confidence - 0.1 END,
              quality_flags_json = ?
          WHERE video_id = ?
        `,
        [JSON.stringify({ video_feedback_penalty: true, last_feedback: feedbackType }), videoId]
      )
    }
  }

  return { id: Number(result.lastInsertRowid || 0), feedbackType, weightDelta }
}

export async function updateAffiliateLinkHealth({
  linkId,
  httpStatus,
  responseSnippet
}: {
  linkId: number
  httpStatus: number | null
  responseSnippet?: string | null
}): Promise<LinkHealthResult> {
  const db = await getDatabase()
  const health = classifyLinkHealth({ httpStatus, responseSnippet })
  await db.exec(
    `
      UPDATE affiliate_links
      SET status = ?, last_verified = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `,
    [health.status, linkId]
  )
  return health
}

export async function extractVideoMerchantSignals(description: string) {
  return {
    amazonUrls: extractAmazonUrls(description)
  }
}

export function isBuyableAffiliateStatus(status: string | null | undefined) {
  return !status || status === 'active' || status === 'unknown'
}

export function getPriceAlertLabel(entryStatus: EntryStatus, score5: number | null) {
  if ((entryStatus === 'best-deal' || entryStatus === 'great-value') && score5 != null && score5 >= 4) {
    return '[Price Drop Alert]'
  }
  return ''
}
