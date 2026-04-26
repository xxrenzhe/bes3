import './load-env'
import { bootstrapApplication } from '@/lib/bootstrap'
import { refreshPriceValueSnapshotsForProducts } from '@/lib/hardcore-ops'

async function main() {
  await bootstrapApplication()
  const refreshed = await refreshPriceValueSnapshotsForProducts(Number(process.env.PRICE_VALUE_REFRESH_LIMIT || 250))
  console.log(JSON.stringify({ refreshed: refreshed.length, products: refreshed }))
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
