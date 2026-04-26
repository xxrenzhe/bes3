import './load-env'
import fs from 'node:fs'
import { bootstrapApplication } from '@/lib/bootstrap'
import { applyPseoSignalsToTaxonomy, recordPseoPageSignal } from '@/lib/hardcore-ops'

interface SignalRow {
  pathname?: string
  path?: string
  url?: string
  impressions?: string | number | null
  clicks?: string | number | null
  source?: string | null
  capturedAt?: string | null
  date?: string | null
}

function readFlag(name: string) {
  const prefix = `--${name}=`
  return process.argv.find((item) => item.startsWith(prefix))?.slice(prefix.length) || ''
}

function readNumberFlag(name: string, fallback: number) {
  const parsed = Number(readFlag(name))
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

function parseCsv(content: string): SignalRow[] {
  const [headerLine, ...lines] = content.split(/\r?\n/).filter((line) => line.trim())
  const headers = headerLine.split(',').map((item) => item.trim())
  return lines.map((line) => {
    const values = line.split(',').map((item) => item.trim())
    return Object.fromEntries(headers.map((header, index) => [header, values[index] || ''])) as SignalRow
  })
}

function readRows(filePath: string): SignalRow[] {
  const content = fs.readFileSync(filePath, 'utf8')
  if (filePath.endsWith('.json')) {
    const parsed = JSON.parse(content)
    return Array.isArray(parsed) ? parsed : parsed.rows || parsed.items || []
  }
  return parseCsv(content)
}

async function main() {
  const filePath = readFlag('file')
  const source = readFlag('source') || 'ga4'
  const days = readNumberFlag('days', 30)
  if (!filePath) {
    throw new Error('Usage: npm run hardcore:import-pseo-signals -- --file=./ga4-pseo.csv --source=ga4')
  }

  await bootstrapApplication()
  const rows = readRows(filePath)
  const imported = []

  for (const row of rows) {
    const pathname = String(row.pathname || row.path || row.url || '').trim()
    if (!pathname) continue
    imported.push(await recordPseoPageSignal({
      pathname,
      impressions: row.impressions == null ? 0 : Number(row.impressions),
      clicks: row.clicks == null ? 0 : Number(row.clicks),
      source: row.source || source,
      capturedAt: row.capturedAt || row.date || null
    }))
  }

  const updatedTags = await applyPseoSignalsToTaxonomy(days)

  console.log(JSON.stringify({
    imported: imported.length,
    updatedTags: updatedTags.length,
    tags: updatedTags
  }))
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
