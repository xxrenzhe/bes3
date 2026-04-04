import { getDatabase } from '@/lib/db'
import { normalizeDecisionVisitorId } from '@/lib/decision-visitor'
import { normalizeMerchantSource } from '@/lib/merchant-links'

export async function recordMerchantClick({
  productId,
  visitorId,
  source,
  targetUrl,
  referer,
  userAgent
}: {
  productId: number
  visitorId?: string | null
  source: string
  targetUrl: string
  referer?: string | null
  userAgent?: string | null
}) {
  const db = await getDatabase()
  await db.exec(
    `
      INSERT INTO merchant_click_events (product_id, visitor_id, source, target_url, referer, user_agent)
      VALUES (?, ?, ?, ?, ?, ?)
    `,
    [
      productId,
      normalizeDecisionVisitorId(visitorId) || null,
      normalizeMerchantSource(source),
      targetUrl,
      referer || null,
      userAgent || null
    ]
  )
}

function parseTimestamp(value: string | null | undefined) {
  if (!value) return null
  const timestamp = new Date(value).getTime()
  return Number.isNaN(timestamp) ? null : timestamp
}

export async function getMerchantClickSummary() {
  const db = await getDatabase()
  const [totalRow, sourceRows, clickRows] = await Promise.all([
    db.queryOne<{ count: number }>('SELECT COUNT(*) AS count FROM merchant_click_events'),
    db.query<{ source: string; count: number }>(
      `
        SELECT source, COUNT(*) AS count
        FROM merchant_click_events
        GROUP BY source
        ORDER BY count DESC, source ASC
      `
    ),
    db.query<{ created_at: string }>('SELECT created_at FROM merchant_click_events')
  ])

  const recentThreshold = Date.now() - 7 * 86_400_000
  const recentClicks = clickRows.reduce((count, row) => {
    const timestamp = parseTimestamp(row.created_at)
    return timestamp && timestamp >= recentThreshold ? count + 1 : count
  }, 0)

  return {
    totalClicks: Number(totalRow?.count || 0),
    recentClicks,
    topSource: sourceRows[0]?.source || null,
    topSourceClicks: Number(sourceRows[0]?.count || 0)
  }
}
