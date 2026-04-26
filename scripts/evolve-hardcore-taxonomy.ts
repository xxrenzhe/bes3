import './load-env'
import { bootstrapApplication } from '@/lib/bootstrap'
import { exportTaxonomyRescanJobs, markTaxonomyRescanQueueProcessing, promotePendingTags } from '@/lib/hardcore-ops'

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

async function main() {
  await bootstrapApplication()
  const limit = readNumberFlag('limit', 50)
  const minPriorityScore = Number(readFlag('min-priority') || 0.5)
  const markProcessing = hasFlag('mark-processing')
  const dryRun = hasFlag('dry-run')

  const promoted = dryRun
    ? []
    : await promotePendingTags({
        limit,
        minPriorityScore: Number.isFinite(minPriorityScore) ? minPriorityScore : 0.5
      })
  const jobs = await exportTaxonomyRescanJobs(limit)
  const markedProcessing = markProcessing && !dryRun ? await markTaxonomyRescanQueueProcessing(jobs.map((job) => job.queueId)) : 0

  console.log(JSON.stringify({
    dryRun,
    promoted: promoted.length,
    promotedTags: promoted,
    rescanJobs: jobs.length,
    markedProcessing,
    jobs
  }))
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
