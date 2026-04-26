import './load-env'
import { bootstrapApplication } from '@/lib/bootstrap'
import { getDatabase } from '@/lib/db'

interface NotificationRow {
  id: number
  price_alert_id: number
  product_id: number
  email: string
  channel: string
  status: string
  dedupe_key: string
  payload_json: string | null
  queued_at: string
}

function readFlag(name: string) {
  const prefix = `--${name}=`
  return process.argv.find((item) => item.startsWith(prefix))?.slice(prefix.length) || ''
}

function readNumberFlag(name: string, fallback: number) {
  const parsed = Number(readFlag(name))
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

function hasFlag(name: string) {
  return process.argv.includes(`--${name}`)
}

function parsePayload(value: string | null) {
  if (!value) return {}
  try {
    return JSON.parse(value) as Record<string, unknown>
  } catch {
    return { rawPayload: value }
  }
}

async function postWebhook(webhookUrl: string, notification: NotificationRow) {
  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: {
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      notificationId: notification.id,
      priceAlertId: notification.price_alert_id,
      productId: notification.product_id,
      email: notification.email,
      channel: notification.channel,
      dedupeKey: notification.dedupe_key,
      queuedAt: notification.queued_at,
      payload: parsePayload(notification.payload_json)
    })
  })

  if (!response.ok) {
    const body = await response.text().catch(() => '')
    throw new Error(`Webhook returned HTTP ${response.status}${body ? `: ${body.slice(0, 240)}` : ''}`)
  }
}

async function main() {
  await bootstrapApplication()
  const db = await getDatabase()
  const limit = readNumberFlag('limit', 50)
  const webhookUrl = readFlag('webhook-url') || process.env.PRICE_ALERT_WEBHOOK_URL || ''
  const dryRun = hasFlag('dry-run')
  const markSent = hasFlag('mark-sent')

  const rows = await db.query<NotificationRow>(
    `
      SELECT id, price_alert_id, product_id, email, channel, status, dedupe_key, payload_json, queued_at
      FROM price_alert_notifications
      WHERE status = 'queued'
      ORDER BY queued_at ASC, id ASC
      LIMIT ?
    `,
    [limit]
  )

  const dispatched = []
  const failed = []

  for (const row of rows) {
    if (dryRun || !webhookUrl) {
      dispatched.push({ id: row.id, mode: dryRun ? 'dry-run' : 'export-only', email: row.email, payload: parsePayload(row.payload_json) })
      continue
    }

    try {
      await postWebhook(webhookUrl, row)
      if (markSent) {
        await db.exec(
          `
            UPDATE price_alert_notifications
            SET status = 'sent', sent_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP, error_message = NULL
            WHERE id = ?
          `,
          [row.id]
        )
      }
      dispatched.push({ id: row.id, mode: markSent ? 'sent' : 'posted-unmarked', email: row.email })
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      await db.exec(
        `
          UPDATE price_alert_notifications
          SET status = 'failed', updated_at = CURRENT_TIMESTAMP, error_message = ?
          WHERE id = ?
        `,
        [message.slice(0, 500), row.id]
      )
      failed.push({ id: row.id, email: row.email, error: message })
    }
  }

  console.log(JSON.stringify({
    dryRun,
    webhookConfigured: Boolean(webhookUrl),
    scanned: rows.length,
    dispatched: dispatched.length,
    failed: failed.length,
    notifications: dispatched,
    failures: failed
  }))
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
