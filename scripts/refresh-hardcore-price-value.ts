import './load-env'
import { bootstrapApplication } from '@/lib/bootstrap'
import { previewPriceValueSnapshotsForProducts, refreshPriceValueSnapshotsForProducts } from '@/lib/hardcore-ops'

function readNumberFlag(name: string, fallback: number) {
  const prefix = `--${name}=`
  const raw = process.argv.find((item) => item.startsWith(prefix))?.slice(prefix.length)
  const parsed = Number(raw)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

function hasFlag(name: string) {
  return process.argv.includes(`--${name}`)
}

async function main() {
  await bootstrapApplication()
  const limit = readNumberFlag('limit', Number(process.env.PRICE_VALUE_REFRESH_LIMIT || 250))
  const dryRun = hasFlag('dry-run')
  const products = dryRun
    ? await previewPriceValueSnapshotsForProducts(limit)
    : await refreshPriceValueSnapshotsForProducts(limit)
  console.log(JSON.stringify({ dryRun, refreshed: dryRun ? 0 : products.length, previewed: dryRun ? products.length : 0, products }))
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
