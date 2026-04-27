import './load-env'
import { bootstrapApplication } from '@/lib/bootstrap'
import { getSeoAutomationDefaults, runSeoAutomation } from '@/lib/seo-automation'

function readFlag(name: string) {
  const prefix = `--${name}=`
  return process.argv.find((item) => item.startsWith(prefix))?.slice(prefix.length) || ''
}

function hasFlag(name: string) {
  return process.argv.includes(`--${name}`)
}

function readNumberFlag(name: string, fallback: number) {
  const parsed = Number(readFlag(name) || process.env[`SEO_AUTOMATION_${name.replace(/-/g, '_').toUpperCase()}`])
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

async function main() {
  await bootstrapApplication()
  const defaults = getSeoAutomationDefaults()
  const result = await runSeoAutomation({
    apply: hasFlag('apply') || defaults.apply,
    pushIndex: hasFlag('push-index') || defaults.pushIndex,
    skipChecks: hasFlag('skip-checks'),
    limit: readNumberFlag('limit', defaults.limit),
    signalDays: readNumberFlag('signal-days', defaults.signalDays),
    minPriority: Number(readFlag('min-priority') || defaults.minPriority),
    signalFile: readFlag('signals-file') || defaults.signalFile,
    signalSource: readFlag('signals-source') || defaults.signalSource
  })

  console.log(JSON.stringify(result, null, 2))
  if (!result.ok) process.exit(1)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
