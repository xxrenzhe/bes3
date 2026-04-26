import './load-env'
import fs from 'node:fs'
import { bootstrapApplication } from '@/lib/bootstrap'
import { promoteIntentSourceToPendingTag, recordTaxonomyIntentSource } from '@/lib/hardcore-ops'
import { slugify } from '@/lib/slug'

interface KeywordPlannerRow {
  keyword?: string
  Keyword?: string
  query?: string
  category?: string
  categorySlug?: string
  competition?: string
  Competition?: string
  avgMonthlySearches?: number | string | null
  'Avg. monthly searches'?: number | string | null
  'Avg monthly searches'?: number | string | null
  searches?: number | string | null
}

function readFlag(name: string) {
  const prefix = `--${name}=`
  return process.argv.find((item) => item.startsWith(prefix))?.slice(prefix.length) || ''
}

function hasFlag(name: string) {
  return process.argv.includes(`--${name}`)
}

function parseCsvLine(line: string) {
  const cells: string[] = []
  let current = ''
  let quoted = false

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index]
    const next = line[index + 1]
    if (char === '"' && quoted && next === '"') {
      current += '"'
      index += 1
    } else if (char === '"') {
      quoted = !quoted
    } else if (char === ',' && !quoted) {
      cells.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }

  cells.push(current.trim())
  return cells
}

function parseCsv(content: string): KeywordPlannerRow[] {
  const [headerLine, ...lines] = content.split(/\r?\n/).filter((line) => line.trim())
  const headers = parseCsvLine(headerLine).map((header) => header.trim())
  return lines.map((line) => {
    const values = parseCsvLine(line)
    return Object.fromEntries(headers.map((header, index) => [header, values[index] || ''])) as KeywordPlannerRow
  })
}

function readRows(filePath: string): KeywordPlannerRow[] {
  const content = fs.readFileSync(filePath, 'utf8')
  if (filePath.endsWith('.json')) {
    const parsed = JSON.parse(content)
    return Array.isArray(parsed) ? parsed : parsed.rows || parsed.items || []
  }
  return parseCsv(content)
}

function parseSearchVolume(row: KeywordPlannerRow) {
  const raw = row.avgMonthlySearches ?? row['Avg. monthly searches'] ?? row['Avg monthly searches'] ?? row.searches ?? 0
  const normalized = String(raw || '0').replace(/[,+\s]/g, '')
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? Math.max(0, Math.round(parsed)) : 0
}

function getKeyword(row: KeywordPlannerRow) {
  return String(row.keyword || row.Keyword || row.query || '').replace(/\s+/g, ' ').trim()
}

async function main() {
  const filePath = readFlag('file')
  const defaultCategorySlug = slugify(readFlag('category'))
  const promote = hasFlag('promote-pending')
  const dryRun = hasFlag('dry-run')

  if (!filePath || !defaultCategorySlug) {
    throw new Error('Usage: npm run hardcore:import-keyword-planner -- --file=./keyword-planner.csv --category=yard-pool-automation [--promote-pending] [--dry-run]')
  }

  await bootstrapApplication()
  const rows = readRows(filePath)
  const normalized = rows
    .map((row) => ({
      categorySlug: slugify(row.categorySlug || row.category || defaultCategorySlug),
      rawQuery: getKeyword(row),
      searchVolume: parseSearchVolume(row),
      competition: String(row.competition || row.Competition || '').trim() || null
    }))
    .filter((row) => row.categorySlug && row.rawQuery)

  const results = []
  if (!dryRun) {
    for (const row of normalized) {
      const result = await recordTaxonomyIntentSource({
        categorySlug: row.categorySlug,
        sourceType: 'google_keyword_planner',
        rawQuery: row.rawQuery,
        searchVolume: row.searchVolume,
        competition: row.competition
      })
      if (promote) {
        await promoteIntentSourceToPendingTag({
          categorySlug: row.categorySlug,
          rawQuery: row.rawQuery,
          source: 'google_keyword_planner',
          searchVolume: row.searchVolume
        })
      }
      results.push(result)
    }
  }

  console.log(JSON.stringify({
    dryRun,
    imported: dryRun ? normalized.length : results.length,
    created: results.filter((result) => result.status === 'created').length,
    updated: results.filter((result) => result.status === 'updated').length,
    promotedToPending: promote,
    sample: normalized.slice(0, 10)
  }))
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
