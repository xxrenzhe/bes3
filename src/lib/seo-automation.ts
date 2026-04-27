import fs from 'node:fs'
import { spawnSync } from 'node:child_process'
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

export interface SeoAutomationInput {
  apply?: boolean
  pushIndex?: boolean
  skipChecks?: boolean
  limit?: number
  signalDays?: number
  minPriority?: number
  signalFile?: string
  signalSource?: string
}

export interface SeoAutomationResult {
  ok: boolean
  apply: boolean
  pushIndex: boolean
  checks: Array<{
    command: string
    ok: boolean
    status: number | null
    stdout: string
    stderr: string
  }>
  importedSignals: number
  updatedTags: number
  promotedTags: number
  rescanJobs: number
  pseoPaths: number
  indexing: string
  samplePaths: string[]
  nextRunModes: {
    preview: string
    applyWithoutIndexing: string
    applyAndPushIndex: string
  }
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

function normalizeLimit(value: number | null | undefined, fallback: number) {
  return Number.isFinite(value) && Number(value) > 0 ? Number(value) : fallback
}

export function getSeoAutomationDefaults() {
  return {
    apply: process.env.SEO_AUTOMATION_APPLY === 'true',
    pushIndex: process.env.SEO_AUTOMATION_PUSH_INDEX === 'true',
    limit: normalizeLimit(Number(process.env.SEO_AUTOMATION_LIMIT), 200),
    signalFile: process.env.SEO_AUTOMATION_SIGNAL_FILE || '',
    signalSource: process.env.SEO_AUTOMATION_SIGNAL_SOURCE || 'ga4',
    minPriority: Number(process.env.SEO_AUTOMATION_MIN_PRIORITY || 0.5),
    signalDays: normalizeLimit(Number(process.env.SEO_AUTOMATION_SIGNAL_DAYS), 30)
  }
}

export async function runSeoAutomation(input: SeoAutomationInput = {}): Promise<SeoAutomationResult> {
  const defaults = getSeoAutomationDefaults()
  const apply = Boolean(input.apply ?? defaults.apply)
  const pushIndex = Boolean(input.pushIndex ?? defaults.pushIndex)
  const skipChecks = Boolean(input.skipChecks)
  const limit = normalizeLimit(input.limit ?? defaults.limit, 200)
  const signalDays = normalizeLimit(input.signalDays ?? defaults.signalDays, 30)
  const minPriority = Number.isFinite(input.minPriority) ? Number(input.minPriority) : defaults.minPriority
  const signalFile = input.signalFile ?? defaults.signalFile
  const signalSource = input.signalSource || defaults.signalSource

  const checks = skipChecks ? [] : [runCheck('npm', ['run', 'hardcore:check-planv2-seo'])]
  const failedCheck = checks.find((check) => !check.ok)
  if (failedCheck) {
    return {
      ok: false,
      apply,
      pushIndex,
      checks,
      importedSignals: 0,
      updatedTags: 0,
      promotedTags: 0,
      rescanJobs: 0,
      pseoPaths: 0,
      indexing: 'skipped',
      samplePaths: [],
      nextRunModes: buildNextRunModes()
    }
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
  const indexing = apply && pushIndex ? await rerunGoogleIndexing(selectedPaths) : 'dry-run'

  return {
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
    nextRunModes: buildNextRunModes()
  }
}

function buildNextRunModes() {
  return {
    preview: 'npm run hardcore:seo-automation',
    applyWithoutIndexing: 'npm run hardcore:seo-automation -- --apply',
    applyAndPushIndex: 'npm run hardcore:seo-automation -- --apply --push-index'
  }
}
