import { getDatabase } from '@/lib/db'
import { normalizeDecisionVisitorId } from '@/lib/decision-visitor'
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

const COACH_TYPES: DecisionEventType[] = [
  'decision_coach_primary_click',
  'decision_coach_secondary_click'
]

const COACH_PRIMARY_TYPES: DecisionEventType[] = ['decision_coach_primary_click']

const COACH_SECONDARY_TYPES: DecisionEventType[] = ['decision_coach_secondary_click']

const MERCHANT_INTENT_TYPES: DecisionEventType[] = ['merchant_cta_click', 'merchant_offer_select']
const SHORTLIST_DECISION_COACH_SOURCE = normalizeMerchantSource('shortlist-decision-coach')

type DecisionEventRow = {
  event_type: string
  visitor_id: string
  source: string
  metadata_json: string | null
  created_at: string | null
}

type RecentDecisionEventRow = {
  event_type: DecisionEventType
  visitor_id: string
  source: string
  metadata: Record<string, unknown> | null
}

type MerchantClickRow = {
  visitor_id: string | null
  source: string
  created_at: string | null
}

type AttributedMerchantClickRow = {
  visitor_id: string
  source: string
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
  coachEngagements: DecisionEventCounter
  coachPrimaryClicks: DecisionEventCounter
  coachSecondaryClicks: DecisionEventCounter
  coachCompareLoads: DecisionEventCounter
  merchantIntentClicks: DecisionEventCounter
  verifiedMerchantExits: DecisionEventCounter
  shortlistToCompareRate: number
  compareToMerchantRate: number
  coachInfluencedCompareRate: number
  compareToVerifiedMerchantRate: number
  sharedViewToImportRate: number
  topSource: string | null
  topSourceEvents: number
  topCoachAction: string | null
  topCoachActionEvents: number
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

function parseMetadata(metadataJson: string | null | undefined) {
  if (!metadataJson) return null
  try {
    const parsed = JSON.parse(metadataJson)
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as Record<string, unknown> : null
  } catch {
    return null
  }
}

function normalizeProductId(productId: number | null | undefined) {
  return Number.isInteger(productId) && Number(productId) > 0 ? Number(productId) : null
}

function buildVisitorCounter<T extends { visitor_id: string }>(rows: T[]): DecisionEventCounter {
  return {
    events: rows.length,
    visitors: new Set(rows.map((row) => row.visitor_id)).size
  }
}

function buildCounter(rows: RecentDecisionEventRow[], eventTypes: readonly DecisionEventType[]): DecisionEventCounter {
  const filtered = rows.filter((row) => eventTypes.includes(row.event_type))
  return buildVisitorCounter(filtered)
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
  const normalizedVisitorId = normalizeDecisionVisitorId(visitorId)
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
  const [rows, merchantClickRows] = await Promise.all([
    db.query<DecisionEventRow>(
      `
        SELECT event_type, visitor_id, source, metadata_json, created_at
        FROM buyer_decision_events
      `
    ),
    db.query<MerchantClickRow>(
      `
        SELECT visitor_id, source, created_at
        FROM merchant_click_events
      `
    )
  ])

  const threshold = Date.now() - Math.max(1, days) * DAY_MS
  const recentRows = rows
    .filter((row): row is DecisionEventRow & { event_type: DecisionEventType } => {
      if (!isDecisionEventType(row.event_type)) return false
      if (!normalizeDecisionVisitorId(row.visitor_id)) return false
      const timestamp = parseTimestamp(row.created_at)
      return Boolean(timestamp && timestamp >= threshold)
    })
    .map((row) => ({
      event_type: row.event_type,
      visitor_id: normalizeDecisionVisitorId(row.visitor_id),
      source: normalizeMerchantSource(row.source),
      metadata: parseMetadata(row.metadata_json)
    }))

  const recentMerchantRows = merchantClickRows
    .filter((row) => {
      const timestamp = parseTimestamp(row.created_at)
      return Boolean(timestamp && timestamp >= threshold)
    })
    .map((row) => ({
      visitor_id: normalizeDecisionVisitorId(row.visitor_id),
      source: normalizeMerchantSource(row.source)
    }))
    .filter((row): row is AttributedMerchantClickRow => Boolean(row.visitor_id))

  const shortlistActivations = buildCounter(recentRows, SHORTLIST_ACTIVATION_TYPES)
  const compareActivations = buildCounter(recentRows, COMPARE_ACTIVATION_TYPES)
  const sharedShortlistViews = buildCounter(recentRows, SHARED_VIEW_TYPES)
  const sharedShortlistImports = buildCounter(recentRows, SHARED_IMPORT_TYPES)
  const shareExports = buildCounter(recentRows, SHARE_EXPORT_TYPES)
  const coachEngagements = buildCounter(recentRows, COACH_TYPES)
  const coachPrimaryClicks = buildCounter(recentRows, COACH_PRIMARY_TYPES)
  const coachSecondaryClicks = buildCounter(recentRows, COACH_SECONDARY_TYPES)
  const coachCompareLoads = buildVisitorCounter(
    recentRows.filter((row) => row.event_type === 'shortlist_compare_load' && row.source === SHORTLIST_DECISION_COACH_SOURCE)
  )
  const merchantIntentClicks = buildCounter(recentRows, MERCHANT_INTENT_TYPES)
  const verifiedMerchantExits = buildVisitorCounter(recentMerchantRows)

  const sourceCounts = recentRows.reduce((result, row) => {
    result.set(row.source, (result.get(row.source) || 0) + 1)
    return result
  }, new Map<string, number>())

  const coachActionCounts = recentRows.reduce((result, row) => {
    if (!COACH_TYPES.includes(row.event_type)) return result
    const rawAction = typeof row.metadata?.action === 'string' ? row.metadata.action.trim() : ''
    const action = rawAction ? normalizeMerchantSource(rawAction) : null
    if (!action) return result
    result.set(action, (result.get(action) || 0) + 1)
    return result
  }, new Map<string, number>())

  const topSourceEntry = Array.from(sourceCounts.entries()).sort((left, right) => {
    if (right[1] !== left[1]) return right[1] - left[1]
    return left[0].localeCompare(right[0])
  })[0]

  const topCoachActionEntry = Array.from(coachActionCounts.entries()).sort((left, right) => {
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
    coachEngagements,
    coachPrimaryClicks,
    coachSecondaryClicks,
    coachCompareLoads,
    merchantIntentClicks,
    verifiedMerchantExits,
    shortlistToCompareRate: toPercent(compareActivations.visitors, shortlistActivations.visitors),
    compareToMerchantRate: toPercent(merchantIntentClicks.visitors, compareActivations.visitors),
    coachInfluencedCompareRate: toPercent(coachCompareLoads.visitors, compareActivations.visitors),
    compareToVerifiedMerchantRate: toPercent(verifiedMerchantExits.visitors, compareActivations.visitors),
    sharedViewToImportRate: toPercent(sharedShortlistImports.visitors, sharedShortlistViews.visitors),
    topSource: topSourceEntry?.[0] || null,
    topSourceEvents: Number(topSourceEntry?.[1] || 0),
    topCoachAction: topCoachActionEntry?.[0] || null,
    topCoachActionEvents: Number(topCoachActionEntry?.[1] || 0)
  }
}
