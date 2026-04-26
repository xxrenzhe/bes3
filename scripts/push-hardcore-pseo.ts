import './load-env'
import { bootstrapApplication } from '@/lib/bootstrap'
import { HARDCORE_CATEGORIES } from '@/lib/hardcore-catalog'
import { listHardcoreTags } from '@/lib/hardcore'
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

function isPushEligible(status: string) {
  return status !== 'low_priority' && status !== 'paused'
}

async function main() {
  await bootstrapApplication()
  const tags = await listHardcoreTags()
  const limit = readNumberFlag('limit', 200)
  const dryRun = hasFlag('dry-run')
  const paths = new Set<string>()

  for (const category of HARDCORE_CATEGORIES) {
    paths.add(`/categories/${category.slug}`)
    paths.add(`/deals/best-value-${category.slug}-under-500`)

    const categoryTags = tags
      .filter((tag) => tag.categorySlug === category.slug && isPushEligible(tag.status))
      .sort((left, right) => Number(right.isCorePainpoint) - Number(left.isCorePainpoint) || right.searchVolume - left.searchVolume)

    for (const tag of categoryTags.slice(0, 12)) {
      paths.add(`/${category.slug}/best-${category.slug}-for-${tag.slug}`)
    }

    const corePushTags = categoryTags.filter((tag) => tag.isCorePainpoint).slice(0, 4)
    for (const [firstIndex, first] of corePushTags.entries()) {
      for (const second of corePushTags.slice(firstIndex + 1, 4)) {
        paths.add(`/${category.slug}/best-${first.slug}-${second.slug}-${category.slug}`)
      }
    }
  }

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
