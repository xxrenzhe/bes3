import { getDatabase } from '@/lib/db'
import { DECISION_EVENT_TYPES, isDecisionEventType, type DecisionEventType } from '@/lib/decision-event-types'
import { normalizeMerchantSource } from '@/lib/merchant-links'

const DAY_MS = 86_400_000

const SHORTLIST_ACTIVATION_TYPES: DecisionEventType[] = [
  'shortlist_add',
  'shared_shortlist_import',
  'shared_shortlist_replace'
]

const COMPARE_ACTIVATION_TYPES: DecisionEventType[] = [
  'compare_add',
  'shortlist_compare_load',
  'shared_shortlist_compare_load'
]

const SHARED_VIEW_TYPES: DecisionEventType[] = ['shared_shortlist_view']

const SHARED_IMPORT_TYPES: DecisionEventType[] = [
  'shared_shortlist_import',
  'shared_shortlist_replace',
  'shared_shortlist_compare_load'
]

const SHARE_EXPORT_TYPES: DecisionEventType[] = [
  'shortlist_share_link_copy',
  'shared_shortlist_brief_copy'
]

const MERCHANT_INTENT_TYPES: DecisionEventType[] = ['merchant_cta_click']

type DecisionEventRow = {
  event_type: string
  visitor_id: string
  source: string
  created_at: string | null
}

export interface DecisionEventCounter {
  events: number
  visitors: number
}

export interface DecisionFunnelSummary {
  lookbackDays: number
  shortlistActivations: DecisionEventCounter
  compareActivations: DecisionEventCounter
  sharedShortlistViews: DecisionEventCounter
  sharedShortlistImports: DecisionEventCounter
  shareExports: DecisionEventCounter
  merchantIntentClicks: DecisionEventCounter
  shortlistToCompareRate: number
  compareToMerchantRate: number
  sharedViewToImportRate: number
  topSource: string | null
  topSourceEvents: number
}

function parseTimestamp(value: string | null | undefined) {
  if (!value) return null
  const timestamp = new Date(value).getTime()
  return Number.isNaN(timestamp) ? null : timestamp
}

function serializeMetadata(metadata: Record<string, unknown> | null | undefined) {
  if (!metadata) return null
  try {
    return JSON.stringify(metadata)
  } catch {
    return null
  }
}

function normalizeVisitorId(visitorId: string | null | undefined) {
  return String(visitorId || '').trim().slice(0, 120)
}

function normalizeProductId(productId: number | null | undefined) {
  return Number.isInteger(productId) && Number(productId) > 0 ? Number(productId) : null
}

function buildCounter(rows: Array<DecisionEventRow & { event_type: DecisionEventType }>, eventTypes: readonly DecisionEventType[]): DecisionEventCounter {
  const filtered = rows.filter((row) => eventTypes.includes(row.event_type))
  return {
    events: filtered.length,
    visitors: new Set(filtered.map((row) => row.visitor_id)).size
  }
}

function toPercent(numerator: number, denominator: number) {
  if (!denominator) return 0
  return Math.round((numerator / denominator) * 100)
}

export async function recordDecisionEvent({
  visitorId,
  eventType,
  source,
  productId,
  metadata,
  referer,
  userAgent
}: {
  visitorId: string
  eventType: DecisionEventType
  source?: string | null
  productId?: number | null
  metadata?: Record<string, unknown> | null
  referer?: string | null
  userAgent?: string | null
}) {
  const normalizedVisitorId = normalizeVisitorId(visitorId)
  if (!normalizedVisitorId || !DECISION_EVENT_TYPES.includes(eventType)) return

  const db = await getDatabase()
  await db.exec(
    `
      INSERT INTO buyer_decision_events (visitor_id, event_type, product_id, source, metadata_json, referer, user_agent)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `,
    [
      normalizedVisitorId,
      eventType,
      normalizeProductId(productId),
      normalizeMerchantSource(source),
      serializeMetadata(metadata),
      referer || null,
      userAgent || null
    ]
  )
}

export async function getDecisionFunnelSummary(days: number = 7): Promise<DecisionFunnelSummary> {
  const db = await getDatabase()
  const rows = await db.query<DecisionEventRow>(
    `
      SELECT event_type, visitor_id, source, created_at
      FROM buyer_decision_events
    `
  )

  const threshold = Date.now() - Math.max(1, days) * DAY_MS
  const recentRows = rows
    .filter((row): row is DecisionEventRow & { event_type: DecisionEventType } => {
      if (!isDecisionEventType(row.event_type)) return false
      const timestamp = parseTimestamp(row.created_at)
      return Boolean(timestamp && timestamp >= threshold)
    })
    .map((row) => ({
      ...row,
      source: normalizeMerchantSource(row.source)
    }))

  const shortlistActivations = buildCounter(recentRows, SHORTLIST_ACTIVATION_TYPES)
  const compareActivations = buildCounter(recentRows, COMPARE_ACTIVATION_TYPES)
  const sharedShortlistViews = buildCounter(recentRows, SHARED_VIEW_TYPES)
  const sharedShortlistImports = buildCounter(recentRows, SHARED_IMPORT_TYPES)
  const shareExports = buildCounter(recentRows, SHARE_EXPORT_TYPES)
  const merchantIntentClicks = buildCounter(recentRows, MERCHANT_INTENT_TYPES)

  const sourceCounts = recentRows.reduce((result, row) => {
    result.set(row.source, (result.get(row.source) || 0) + 1)
    return result
  }, new Map<string, number>())

  const topSourceEntry = Array.from(sourceCounts.entries()).sort((left, right) => {
    if (right[1] !== left[1]) return right[1] - left[1]
    return left[0].localeCompare(right[0])
  })[0]

  return {
    lookbackDays: Math.max(1, days),
    shortlistActivations,
    compareActivations,
    sharedShortlistViews,
    sharedShortlistImports,
    shareExports,
    merchantIntentClicks,
    shortlistToCompareRate: toPercent(compareActivations.visitors, shortlistActivations.visitors),
    compareToMerchantRate: toPercent(merchantIntentClicks.visitors, compareActivations.visitors),
    sharedViewToImportRate: toPercent(sharedShortlistImports.visitors, sharedShortlistViews.visitors),
    topSource: topSourceEntry?.[0] || null,
    topSourceEvents: Number(topSourceEntry?.[1] || 0)
  }
}
