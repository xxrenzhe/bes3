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

function readSyncPlatform(): CommercialLoopOptions['syncPlatform'] {
  const raw = String(readFlag('sync') || readFlag('sync-platform') || process.env.COMMERCIAL_LOOP_SYNC_PLATFORM || 'none')
    .trim()
    .toLowerCase()
  if (raw === 'amazon' || raw === 'dtc' || raw === 'all' || raw === 'none') return raw
  return 'none'
}

async function main() {
  if (hasFlag('guide')) {
    console.log(JSON.stringify(buildCommercialLoopRuntimeGuide(), null, 2))
    return
  }

  await bootstrapApplication()
  const execute = hasFlag('execute') || hasFlag('apply')
  const options: CommercialLoopOptions = {
    execute,
    limit: readNumberFlag('limit', 10),
    minScore: readNumberFlag('min-score', 65),
    syncPlatform: readSyncPlatform(),
    discoverVideos: !hasFlag('skip-discover-videos') && (hasFlag('discover-videos') || execute),
    enrichProducts: hasFlag('enrich-products'),
    fetchTranscripts: !hasFlag('skip-fetch-transcripts') && (hasFlag('fetch-transcripts') || execute),
    extractEvidence: !hasFlag('skip-extract-evidence') && (hasFlag('extract-evidence') || execute),
    publishArticles: !hasFlag('skip-publish') && (hasFlag('publish') || execute),
    pushIndex: hasFlag('push-index'),
    maxVideosPerProduct: readNumberFlag('max-videos-per-product', 3)
  }
  const result = await runCommercialLoop(options)
  console.log(JSON.stringify(result, null, 2))
  if (!result.ok) process.exit(1)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
