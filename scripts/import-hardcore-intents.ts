import './load-env'
import fs from 'node:fs'
import { bootstrapApplication } from '@/lib/bootstrap'
import { promoteIntentSourceToPendingTag, recordTaxonomyIntentSource } from '@/lib/hardcore-ops'
import { slugify } from '@/lib/slug'

interface IntentImportRow {
  categorySlug?: string
  category?: string
  sourceType?: string
  source?: string
  rawQuery?: string
  query?: string
  searchVolume?: number | string | null
  competition?: string | null
}

function readFlag(name: string) {
  const prefix = `--${name}=`
  return process.argv.find((item) => item.startsWith(prefix))?.slice(prefix.length) || ''
}

function parseCsv(content: string): IntentImportRow[] {
  const [headerLine, ...lines] = content.split(/\r?\n/).filter((line) => line.trim())
  const headers = headerLine.split(',').map((item) => item.trim())
  return lines.map((line) => {
    const values = line.split(',').map((item) => item.trim())
    return Object.fromEntries(headers.map((header, index) => [header, values[index] || ''])) as IntentImportRow
  })
}

function readRows(filePath: string): IntentImportRow[] {
  const content = fs.readFileSync(filePath, 'utf8')
  if (filePath.endsWith('.json')) {
    const parsed = JSON.parse(content)
    return Array.isArray(parsed) ? parsed : parsed.rows || parsed.items || []
  }
  return parseCsv(content)
}

async function main() {
  const filePath = readFlag('file')
  const defaultCategorySlug = slugify(readFlag('category'))
  const defaultSourceType = readFlag('source') || 'manual'
  const promote = process.argv.includes('--promote-pending')

  if (!filePath) {
    throw new Error('Usage: npm run hardcore:import-intents -- --file=./intents.json --category=robot-vacuums --source=reddit')
  }

  await bootstrapApplication()
  const rows = readRows(filePath)
  const results = []

  for (const row of rows) {
    const categorySlug = slugify(row.categorySlug || row.category || defaultCategorySlug)
    const rawQuery = String(row.rawQuery || row.query || '').trim()
    const sourceType = String(row.sourceType || row.source || defaultSourceType)
    if (!categorySlug || !rawQuery) continue

    const result = await recordTaxonomyIntentSource({
      categorySlug,
      sourceType,
      rawQuery,
      searchVolume: row.searchVolume == null ? null : Number(row.searchVolume),
      competition: row.competition || null
    })

    if (promote) {
      await promoteIntentSourceToPendingTag({
        categorySlug,
        rawQuery,
        source: sourceType,
        searchVolume: row.searchVolume == null ? null : Number(row.searchVolume)
      })
    }

    results.push(result)
  }

  console.log(
    JSON.stringify({
      imported: results.length,
      created: results.filter((result) => result.status === 'created').length,
      updated: results.filter((result) => result.status === 'updated').length,
      promotedToPending: promote
    })
  )
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
