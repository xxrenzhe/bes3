import './load-env'
import { bootstrapApplication } from '@/lib/bootstrap'
import { getDatabase } from '@/lib/db'
import { updateAffiliateLinkHealth } from '@/lib/hardcore-ops'

interface AffiliateLinkRow {
  id: number
  affiliate_url: string
  status: string
}

function readNumberFlag(name: string, fallback: number) {
  const prefix = `--${name}=`
  const raw = process.argv.find((item) => item.startsWith(prefix))?.slice(prefix.length)
  const parsed = Number(raw)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

function hasFlag(name: string) {
  return process.argv.includes(`--${name}`)
}

async function fetchHealthSignals(url: string) {
  try {
    const head = await fetch(url, {
      method: 'HEAD',
      redirect: 'follow',
      signal: AbortSignal.timeout(10000)
    })
    return { httpStatus: head.status, responseSnippet: '' }
  } catch {
    try {
      const response = await fetch(url, {
        method: 'GET',
        redirect: 'follow',
        signal: AbortSignal.timeout(12000)
      })
      const text = await response.text().catch(() => '')
      return { httpStatus: response.status, responseSnippet: text.slice(0, 5000) }
    } catch {
      return { httpStatus: null, responseSnippet: '' }
    }
  }
}

async function main() {
  await bootstrapApplication()
  const db = await getDatabase()
  const dryRun = hasFlag('dry-run')
  const links = await db.query<AffiliateLinkRow>(
    `
      SELECT id, affiliate_url, status
      FROM affiliate_links
      WHERE status IN ('active', 'unknown', 'out_of_stock')
      ORDER BY COALESCE(last_verified, created_at) ASC, id ASC
      LIMIT ?
    `,
    [readNumberFlag('limit', 50)]
  )
  const results = []

  for (const link of links) {
    const signals = await fetchHealthSignals(link.affiliate_url)
    const health = dryRun
      ? { status: signals.httpStatus && signals.httpStatus >= 200 && signals.httpStatus < 400 ? 'active' : 'unknown', httpStatus: signals.httpStatus, reason: 'Dry run did not mutate affiliate link status.' }
      : await updateAffiliateLinkHealth({
          linkId: link.id,
          httpStatus: signals.httpStatus,
          responseSnippet: signals.responseSnippet
        })
    results.push({ id: link.id, previousStatus: link.status, ...health })
  }

  console.log(JSON.stringify({ inspected: results.length, dryRun, results }))
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
