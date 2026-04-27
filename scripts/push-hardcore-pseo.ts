import './load-env'
import { bootstrapApplication } from '@/lib/bootstrap'
import { HARDCORE_CATEGORIES } from '@/lib/hardcore-catalog'
import { listHardcoreTags } from '@/lib/hardcore'
import { getMultiConstraintPseoRoutes, getScenarioPseoRoutes, getValuePseoRoutes } from '@/lib/pseo'
import { rerunGoogleIndexing } from '@/lib/seo-ops'

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
  const tags = await listHardcoreTags()
  const limit = readNumberFlag('limit', 200)
  const dryRun = hasFlag('dry-run')
  const paths = new Set<string>()

  for (const category of HARDCORE_CATEGORIES) {
    paths.add(`/categories/${category.slug}`)
  }

  for (const route of getValuePseoRoutes(HARDCORE_CATEGORIES)) paths.add(route.path)
  for (const route of getScenarioPseoRoutes(tags, { limitPerCategory: 12 })) paths.add(route.path)
  for (const route of getMultiConstraintPseoRoutes(tags)) paths.add(route.path)

  const selectedPaths = Array.from(paths).slice(0, limit)
  const result = dryRun ? 'dry-run' : await rerunGoogleIndexing(selectedPaths)

  console.log(JSON.stringify({
    dryRun,
    pushed: dryRun ? 0 : selectedPaths.length,
    result,
    paths: selectedPaths
  }))
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
