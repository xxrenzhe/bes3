import './load-env'
import { bootstrapApplication } from '@/lib/bootstrap'
import { evaluatePriceAlerts } from '@/lib/hardcore-ops'

function hasFlag(name: string) {
  return process.argv.includes(`--${name}`)
}

function readNumberFlag(name: string, fallback: number) {
  const prefix = `--${name}=`
  const raw = process.argv.find((item) => item.startsWith(prefix))?.slice(prefix.length)
  const parsed = Number(raw)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

async function main() {
  await bootstrapApplication()
  const queueNotifications = hasFlag('queue-notifications')
  const triggered = await evaluatePriceAlerts(readNumberFlag('limit', 250), hasFlag('mark-notified'), queueNotifications)
  console.log(
    JSON.stringify({
      queueNotifications,
      triggered: triggered.length,
      alerts: triggered.map((alert) => ({
        id: alert.id,
        notificationId: alert.notification_id || null,
        productId: alert.product_id,
        email: alert.email,
        productName: alert.product_name,
        slug: alert.slug,
        currentPrice: alert.current_price,
        currency: alert.price_currency,
        valueScore: alert.value_score,
        entryStatus: alert.entry_status
      }))
    })
  )
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
