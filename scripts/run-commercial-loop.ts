import './load-env'
import { bootstrapApplication } from '@/lib/bootstrap'
import { buildCommercialLoopRuntimeGuide, runCommercialLoop, type CommercialLoopOptions } from '@/lib/commercial-loop'

function readFlag(name: string) {
  const prefix = `--${name}=`
  return process.argv.find((item) => item.startsWith(prefix))?.slice(prefix.length) || ''
}

function hasFlag(name: string) {
  return process.argv.includes(`--${name}`)
}

function readNumberFlag(name: string, fallback: number) {
  const raw = readFlag(name) || process.env[`COMMERCIAL_LOOP_${name.replace(/-/g, '_').toUpperCase()}`]
  const parsed = Number(raw)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

function readBooleanFlag(name: string, fallback = false) {
  const raw = readFlag(name) || process.env[`COMMERCIAL_LOOP_${name.replace(/-/g, '_').toUpperCase()}`]
  if (!raw) return fallback
  return ['1', 'true', 'yes', 'on'].includes(raw.trim().toLowerCase())
}

function readSyncPlatform(): CommercialLoopOptions['syncPlatform'] {
  const raw = String(readFlag('sync') || readFlag('sync-platform') || process.env.COMMERCIAL_LOOP_SYNC_PLATFORM || 'none')
    .trim()
    .toLowerCase()
  if (raw === 'amazon' || raw === 'dtc' || raw === 'all' || raw === 'none') return raw
  return 'none'
}

function assertWritableDatabaseIsExplicit(execute: boolean) {
  if (!execute) return
  if (hasFlag('allow-sqlite') || readBooleanFlag('allow-sqlite')) return

  const databaseUrl = String(process.env.DATABASE_URL || '').trim()
  if (!databaseUrl) {
    throw new Error('Refusing to execute the commercial loop without DATABASE_URL. Production execution must target Postgres; pass --allow-sqlite only for an intentional local rehearsal.')
  }

  let parsed: URL
  try {
    parsed = new URL(databaseUrl)
  } catch {
    throw new Error('Refusing to execute the commercial loop because DATABASE_URL is not a valid URL.')
  }

  if (parsed.protocol !== 'postgres:' && parsed.protocol !== 'postgresql:') {
    throw new Error('Refusing to execute the commercial loop because DATABASE_URL is not a Postgres URL.')
  }
}

function buildOptions(execute: boolean): CommercialLoopOptions {
  return {
    execute,
    limit: readNumberFlag('limit', 10),
    minScore: readNumberFlag('min-score', 65),
    syncPlatform: readSyncPlatform(),
    discoverVideos: !hasFlag('skip-discover-videos') && (hasFlag('discover-videos') || execute),
    enrichProducts: hasFlag('enrich-products') || readBooleanFlag('enrich-products'),
    fetchTranscripts: !hasFlag('skip-fetch-transcripts') && (hasFlag('fetch-transcripts') || execute),
    extractEvidence: !hasFlag('skip-extract-evidence') && (hasFlag('extract-evidence') || execute),
    publishArticles: !hasFlag('skip-publish') && (hasFlag('publish') || execute),
    pushIndex: hasFlag('push-index') || readBooleanFlag('push-index'),
    maxVideosPerProduct: readNumberFlag('max-videos-per-product', 3)
  }
}

function shouldStopAfterRun(runCount: number, maxRuns: number) {
  return maxRuns > 0 && runCount >= maxRuns
}

async function runContinuousLoop(execute: boolean) {
  if (!execute) {
    throw new Error('Continuous commercial loop requires --execute so production operators cannot start a no-op daemon by accident.')
  }
  assertWritableDatabaseIsExplicit(execute)

  const intervalMs = Math.max(60_000, readNumberFlag('interval-ms', 30 * 60_000))
  const maxRuns = Math.max(0, Math.floor(readNumberFlag('max-runs', 0)))
  const continueOnError = hasFlag('continue-on-error') || readBooleanFlag('continue-on-error')
  let runCount = 0

  await bootstrapApplication()

  while (true) {
    runCount += 1
    const startedAt = new Date().toISOString()
    try {
      const result = await runCommercialLoop(buildOptions(true))
      console.log(JSON.stringify({
        mode: 'continuous',
        runCount,
        startedAt,
        finishedAt: new Date().toISOString(),
        ok: result.ok,
        sync: result.sync,
        selected: result.selected.length,
        videosDiscovered: result.videosDiscovered,
        transcriptsFetched: result.transcriptsFetched,
        evidenceReportsWritten: result.evidenceReportsWritten,
        articlesPublished: result.articlesPublished.length,
        indexing: result.indexing,
        skipped: result.skipped
      }, null, 2))

      if (!result.ok && !continueOnError) process.exit(1)
    } catch (error) {
      console.error(JSON.stringify({
        mode: 'continuous',
        runCount,
        startedAt,
        finishedAt: new Date().toISOString(),
        ok: false,
        error: error instanceof Error ? error.message : String(error)
      }, null, 2))
      if (!continueOnError) process.exit(1)
    }

    if (shouldStopAfterRun(runCount, maxRuns)) return
    await new Promise((resolve) => setTimeout(resolve, intervalMs))
  }
}

async function main() {
  if (hasFlag('guide')) {
    console.log(JSON.stringify(buildCommercialLoopRuntimeGuide(), null, 2))
    return
  }

  const execute = hasFlag('execute') || hasFlag('apply')
  if (hasFlag('continuous')) {
    await runContinuousLoop(execute)
    return
  }

  const options = buildOptions(execute)
  assertWritableDatabaseIsExplicit(options.execute)
  await bootstrapApplication()
  const result = await runCommercialLoop(options)
  console.log(JSON.stringify(result, null, 2))
  if (!result.ok) process.exit(1)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
