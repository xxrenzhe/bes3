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

export interface PriceAlertTrigger {
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
  notification_id?: number | null
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

export interface PseoPageSignalInput {
  pathname: string
  impressions?: number | null
  clicks?: number | null
  source?: string | null
  capturedAt?: string | null
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

function normalizePathname(value: string) {
  const raw = String(value || '').trim()
  if (!raw) return '/'
  try {
    const url = raw.startsWith('http') ? new URL(raw) : null
    return url ? url.pathname.replace(/\/+$/, '') || '/' : `/${raw.replace(/^\/+/, '').replace(/\/+$/, '')}`
  } catch {
    return `/${raw.replace(/^\/+/, '').replace(/\/+$/, '')}`
  }
}

function parsePseoPath(pathname: string) {
  const parts = pathname.split('/').filter(Boolean)
  if (parts[0] === 'deals') {
    const match = parts[1]?.match(/^best-value-(.+)-under-\d+$/)
    return match ? { categorySlug: match[1], tagSlug: null } : { categorySlug: null, tagSlug: null }
  }
  const categorySlug = parts[0] || null
  const landing = parts[1] || ''
  const singleTagPrefix = categorySlug ? `best-${categorySlug}-for-` : ''
  if (categorySlug && landing.startsWith(singleTagPrefix)) {
    return { categorySlug, tagSlug: landing.slice(singleTagPrefix.length) || null }
  }
  return { categorySlug, tagSlug: null }
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

export async function promotePendingTags({
  limit = 50,
  minPriorityScore = 0.5
}: {
  limit?: number
  minPriorityScore?: number
} = {}) {
  const db = await getDatabase()
  const rows = await db.query<{
    id: number
    category_slug: string
    canonical_name: string
    slug: string
    trigger_query: string
    hit_count: number
    source: string
    priority_score: number
  }>(
    `
      SELECT id, category_slug, canonical_name, slug, trigger_query, hit_count, source, priority_score
      FROM pending_tags
      WHERE status = 'pending' AND priority_score >= ?
      ORDER BY priority_score DESC, hit_count DESC, updated_at ASC
      LIMIT ?
    `,
    [minPriorityScore, limit]
  )

  const promoted = []
  for (const row of rows) {
    const category = await db.queryOne<{ id: number }>(
      'SELECT id FROM hardcore_categories WHERE slug = ? LIMIT 1',
      [row.category_slug]
    )
    const keywordsJson = JSON.stringify({
      synonyms: [row.trigger_query, row.canonical_name],
      source: row.source,
      pending_tag_id: row.id
    })
    const searchVolume = Math.max(100, Math.round(row.priority_score * 10000))
    const isCorePainpoint = row.priority_score >= 0.75 ? 1 : 0
    const existing = await db.queryOne<{ id: number; search_volume: number }>(
      'SELECT id, search_volume FROM taxonomy_tags WHERE category_slug = ? AND slug = ? LIMIT 1',
      [row.category_slug, row.slug]
    )

    if (existing?.id) {
      await db.exec(
        `
          UPDATE taxonomy_tags
          SET canonical_name = ?, keywords_json = COALESCE(keywords_json, ?), search_volume = ?, status = 'active', updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `,
        [row.canonical_name, keywordsJson, Math.max(existing.search_volume || 0, searchVolume), existing.id]
      )
    } else {
      await db.exec(
        `
          INSERT INTO taxonomy_tags (
            category_id,
            category_slug,
            canonical_name,
            slug,
            keywords_json,
            search_volume,
            is_core_painpoint,
            status
          ) VALUES (?, ?, ?, ?, ?, ?, ?, 'active')
        `,
        [category?.id || null, row.category_slug, row.canonical_name, row.slug, keywordsJson, searchVolume, isCorePainpoint]
      )
    }

    await db.exec(
      `
        UPDATE pending_tags
        SET status = 'promoted', updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
      [row.id]
    )
    await queueTaxonomyRescan(row.category_slug, row.slug, `Promoted pending tag: ${row.trigger_query}`)
    promoted.push({ id: row.id, categorySlug: row.category_slug, tagSlug: row.slug, searchVolume })
  }

  return promoted
}

export async function exportTaxonomyRescanJobs(limit = 100) {
  const db = await getDatabase()
  const rows = await db.query<{
    id: number
    category_slug: string
    tag_slug: string
    reason: string
    canonical_name: string | null
    keywords_json: string | null
    video_id: number
    youtube_id: string
    title: string
    transcript: string | null
  }>(
    `
      SELECT
        trq.id,
        trq.category_slug,
        trq.tag_slug,
        trq.reason,
        tt.canonical_name,
        tt.keywords_json,
        rv.id AS video_id,
        rv.youtube_id,
        rv.title,
        rv.transcript
      FROM taxonomy_rescan_queue trq
      LEFT JOIN taxonomy_tags tt ON tt.category_slug = trq.category_slug AND tt.slug = trq.tag_slug
      JOIN review_videos rv ON rv.processed_status IN ('success', 'pending')
      WHERE trq.status = 'queued'
        AND (rv.transcript IS NOT NULL OR rv.description IS NOT NULL)
      ORDER BY trq.created_at ASC, rv.published_at DESC
      LIMIT ?
    `,
    [limit]
  )

  return rows.map((row) => ({
    queueId: row.id,
    categorySlug: row.category_slug,
    tagSlug: row.tag_slug,
    reason: row.reason,
    canonicalName: row.canonical_name || row.tag_slug,
    keywords: row.keywords_json ? JSON.parse(row.keywords_json) : null,
    video: {
      id: row.video_id,
      youtubeId: row.youtube_id,
      title: row.title,
      transcriptPreview: row.transcript?.slice(0, 1200) || null
    }
  }))
}

export async function markTaxonomyRescanQueueProcessing(ids: number[]) {
  if (!ids.length) return 0
  const db = await getDatabase()
  const placeholders = ids.map(() => '?').join(', ')
  const result = await db.exec(
    `
      UPDATE taxonomy_rescan_queue
      SET status = 'processing', updated_at = CURRENT_TIMESTAMP
      WHERE id IN (${placeholders}) AND status = 'queued'
    `,
    ids
  )
  return result.changes
}

export async function recordPseoPageSignal(input: PseoPageSignalInput) {
  const pathname = normalizePathname(input.pathname)
  const { categorySlug, tagSlug } = parsePseoPath(pathname)
  const impressions = Math.max(0, Math.round(Number(input.impressions || 0)))
  const clicks = Math.max(0, Math.round(Number(input.clicks || 0)))
  const ctr = impressions > 0 ? clicks / impressions : 0
  const db = await getDatabase()
  const result = await db.exec(
    `
      INSERT INTO pseo_page_signals (pathname, category_slug, tag_slug, impressions, clicks, ctr, source, captured_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, COALESCE(?, CURRENT_TIMESTAMP))
    `,
    [pathname, categorySlug, tagSlug, impressions, clicks, ctr, input.source || 'ga4', input.capturedAt || null]
  )
  return { id: Number(result.lastInsertRowid || 0), pathname, categorySlug, tagSlug, impressions, clicks, ctr }
}

export async function applyPseoSignalsToTaxonomy(days = 30) {
  const db = await getDatabase()
  const cutoff = new Date(Date.now() - Math.max(1, days) * 24 * 60 * 60 * 1000).toISOString()
  const longCutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()
  const rows = await db.query<{
    category_slug: string
    tag_slug: string
    impressions: number
    clicks: number
  }>(
    `
      SELECT category_slug, tag_slug, SUM(impressions) AS impressions, SUM(clicks) AS clicks
      FROM pseo_page_signals
      WHERE tag_slug IS NOT NULL AND captured_at >= ?
      GROUP BY category_slug, tag_slug
    `,
    [cutoff]
  )

  const updated = []
  for (const row of rows) {
    const impressions = Number(row.impressions || 0)
    const clicks = Number(row.clicks || 0)
    const ctr = impressions > 0 ? clicks / impressions : 0
    const multiplier = impressions > 0 ? (ctr >= 0.05 ? 1.32 : 1.1) : 1
    const status = impressions === 0 ? 'low_priority' : 'active'
    await db.exec(
      `
        UPDATE taxonomy_tags
        SET search_volume = CASE
              WHEN ? = 'active' THEN CAST(search_volume * ? AS INTEGER)
              ELSE search_volume
            END,
            status = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE category_slug = ? AND slug = ?
      `,
      [status, multiplier, status, row.category_slug, row.tag_slug]
    )
    updated.push({ categorySlug: row.category_slug, tagSlug: row.tag_slug, impressions, clicks, ctr, status })
  }

  const zeroSignalRows = await db.query<{
    category_slug: string
    slug: string
    status: string
    updated_at: string | null
  }>(
    `
      SELECT tt.category_slug, tt.slug, tt.status, tt.updated_at
      FROM taxonomy_tags tt
      WHERE tt.status IN ('active', 'low_priority')
        AND NOT EXISTS (
          SELECT 1
          FROM pseo_page_signals pps
          WHERE pps.category_slug = tt.category_slug
            AND pps.tag_slug = tt.slug
            AND pps.impressions > 0
            AND pps.captured_at >= ?
        )
    `,
    [cutoff]
  )

  for (const row of zeroSignalRows) {
    const updatedAt = row.updated_at ? new Date(row.updated_at).toISOString() : new Date().toISOString()
    const status = updatedAt < longCutoff ? 'paused' : 'low_priority'
    await db.exec(
      `
        UPDATE taxonomy_tags
        SET status = ?, updated_at = CURRENT_TIMESTAMP
        WHERE category_slug = ? AND slug = ?
      `,
      [status, row.category_slug, row.slug]
    )
    updated.push({
      categorySlug: row.category_slug,
      tagSlug: row.slug,
      impressions: 0,
      clicks: 0,
      ctr: 0,
      status
    })
  }

  return updated
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

function buildPriceAlertDedupeKey(row: PriceAlertTrigger) {
  return [
    row.id,
    row.current_price == null ? 'price-pending' : row.current_price.toFixed(2),
    row.value_score == null ? 'value-pending' : row.value_score.toFixed(4),
    row.entry_status || 'unknown'
  ].join(':')
}

async function queuePriceAlertNotification(row: PriceAlertTrigger) {
  const db = await getDatabase()
  const dedupeKey = buildPriceAlertDedupeKey(row)
  const existing = await db.queryOne<{ id: number }>(
    'SELECT id FROM price_alert_notifications WHERE dedupe_key = ? LIMIT 1',
    [dedupeKey]
  )
  if (existing?.id) return existing.id

  const payload = {
    type: 'price_drop_alert',
    productId: row.product_id,
    productName: row.product_name,
    productSlug: row.slug,
    email: row.email,
    currentPrice: row.current_price,
    currency: row.price_currency || 'USD',
    valueScore: row.value_score,
    entryStatus: row.entry_status,
    targetPrice: row.target_price,
    targetValueScore: row.target_value_score
  }
  const result = await db.exec(
    `
      INSERT INTO price_alert_notifications (
        price_alert_id,
        product_id,
        email,
        channel,
        status,
        dedupe_key,
        payload_json
      ) VALUES (?, ?, ?, 'email', 'queued', ?, ?)
    `,
    [row.id, row.product_id, row.email, dedupeKey, JSON.stringify(payload)]
  )
  return Number(result.lastInsertRowid || 0)
}

export async function evaluatePriceAlerts(limit = 250, markNotified = false, queueNotifications = false): Promise<PriceAlertTrigger[]> {
  const db = await getDatabase()
  const rows = await db.query<PriceAlertTrigger>(
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

  if (queueNotifications) {
    for (const row of triggered) {
      row.notification_id = await queuePriceAlertNotification(row)
    }
  }

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
