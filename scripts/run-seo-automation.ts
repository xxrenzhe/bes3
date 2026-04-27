import './load-env'
import fs from 'node:fs'
import { spawnSync } from 'node:child_process'
import { bootstrapApplication } from '@/lib/bootstrap'
import { HARDCORE_CATEGORIES, listHardcoreTags } from '@/lib/hardcore'
import {
  applyPseoSignalsToTaxonomy,
  exportTaxonomyRescanJobs,
  promotePendingTags,
  recordPseoPageSignal
} from '@/lib/hardcore-ops'
import { getMultiConstraintPseoRoutes, getScenarioPseoRoutes, getValuePseoRoutes } from '@/lib/pseo'
import { rerunGoogleIndexing } from '@/lib/seo-ops'

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
  const parsed = Number(readFlag(name) || process.env[`SEO_AUTOMATION_${name.replace(/-/g, '_').toUpperCase()}`])
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

function hasFlag(name: string) {
  return process.argv.includes(`--${name}`)
}

function readBooleanOption(name: string, envName: string) {
  return hasFlag(name) || process.env[envName] === 'true'
}

function parseCsv(content: string): SignalRow[] {
  const [headerLine, ...lines] = content.split(/\r?\n/).filter((line) => line.trim())
  if (!headerLine) return []
  const headers = headerLine.split(',').map((item) => item.trim())
  return lines.map((line) => {
    const values = line.split(',').map((item) => item.trim())
    return Object.fromEntries(headers.map((header, index) => [header, values[index] || ''])) as SignalRow
  })
}

function readSignalRows(filePath: string): SignalRow[] {
  const content = fs.readFileSync(filePath, 'utf8')
  if (filePath.endsWith('.json')) {
    const parsed = JSON.parse(content)
    return Array.isArray(parsed) ? parsed : parsed.rows || parsed.items || []
  }
  return parseCsv(content)
}

function runCheck(command: string, args: string[]) {
  const result = spawnSync(command, args, {
    cwd: process.cwd(),
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe']
  })

  return {
    command: [command, ...args].join(' '),
    ok: result.status === 0,
    status: result.status,
    stdout: result.stdout.trim(),
    stderr: result.stderr.trim()
  }
}

async function importSignals(filePath: string, source: string) {
  const rows = readSignalRows(filePath)
  let imported = 0

  for (const row of rows) {
    const pathname = String(row.pathname || row.path || row.url || '').trim()
    if (!pathname) continue
    await recordPseoPageSignal({
      pathname,
      impressions: row.impressions == null ? 0 : Number(row.impressions),
      clicks: row.clicks == null ? 0 : Number(row.clicks),
      source: row.source || source,
      capturedAt: row.capturedAt || row.date || null
    })
    imported += 1
  }

  return imported
}

async function main() {
  const apply = readBooleanOption('apply', 'SEO_AUTOMATION_APPLY')
  const pushIndex = readBooleanOption('push-index', 'SEO_AUTOMATION_PUSH_INDEX')
  const skipChecks = hasFlag('skip-checks')
  const limit = readNumberFlag('limit', 200)
  const signalDays = readNumberFlag('signal-days', 30)
  const minPriority = Number(readFlag('min-priority') || process.env.SEO_AUTOMATION_MIN_PRIORITY || 0.5)
  const signalFile = readFlag('signals-file') || process.env.SEO_AUTOMATION_SIGNAL_FILE || ''
  const signalSource = readFlag('signals-source') || process.env.SEO_AUTOMATION_SIGNAL_SOURCE || 'ga4'

  await bootstrapApplication()

  const checks = skipChecks ? [] : [runCheck('npm', ['run', 'hardcore:check-planv2-seo'])]
  const failedCheck = checks.find((check) => !check.ok)
  if (failedCheck) {
    console.log(JSON.stringify({ ok: false, phase: 'checks', apply, pushIndex, checks }, null, 2))
    process.exit(1)
  }

  const importedSignals = apply && signalFile ? await importSignals(signalFile, signalSource) : 0
  const updatedTags = apply ? await applyPseoSignalsToTaxonomy(signalDays) : []
  const promotedTags = apply
    ? await promotePendingTags({
        limit,
        minPriorityScore: Number.isFinite(minPriority) ? minPriority : 0.5
      })
    : []
  const rescanJobs = await exportTaxonomyRescanJobs(limit)
  const tags = await listHardcoreTags()
  const paths = new Set<string>()

  for (const category of HARDCORE_CATEGORIES) paths.add(`/categories/${category.slug}`)
  for (const route of getValuePseoRoutes(HARDCORE_CATEGORIES)) paths.add(route.path)
  for (const route of getScenarioPseoRoutes(tags, { limitPerCategory: 12 })) paths.add(route.path)
  for (const route of getMultiConstraintPseoRoutes(tags)) paths.add(route.path)

  const selectedPaths = Array.from(paths).slice(0, limit)
  const indexing = apply && pushIndex
    ? await rerunGoogleIndexing(selectedPaths)
    : 'dry-run'

  console.log(JSON.stringify({
    ok: true,
    apply,
    pushIndex,
    checks,
    importedSignals,
    updatedTags: updatedTags.length,
    promotedTags: promotedTags.length,
    rescanJobs: rescanJobs.length,
    pseoPaths: selectedPaths.length,
    indexing,
    samplePaths: selectedPaths.slice(0, 25),
    nextRunModes: {
      preview: 'npm run hardcore:seo-automation',
      applyWithoutIndexing: 'npm run hardcore:seo-automation -- --apply',
      applyAndPushIndex: 'npm run hardcore:seo-automation -- --apply --push-index'
    }
  }, null, 2))
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
