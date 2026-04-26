import './load-env'
import { bootstrapApplication } from '@/lib/bootstrap'
import { HARDCORE_CATEGORIES } from '@/lib/hardcore-catalog'
import { listHardcoreProducts, listHardcoreTags } from '@/lib/hardcore'
import { getSiteUrl } from '@/lib/site-url'

function readNumberFlag(name: string, fallback: number) {
  const prefix = `--${name}=`
  const raw = process.argv.find((item) => item.startsWith(prefix))?.slice(prefix.length)
  const parsed = Number(raw)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

async function main() {
  await bootstrapApplication()
  const siteUrl = getSiteUrl().replace(/\/$/, '')
  const limit = readNumberFlag('limit', 40)
  const [products, tags] = await Promise.all([listHardcoreProducts(), listHardcoreTags()])
  const kits = []

  for (const category of HARDCORE_CATEGORIES) {
    const categoryProducts = products.filter((product) => product.categorySlug === category.slug)
    const categoryTags = tags.filter((tag) => tag.categorySlug === category.slug && tag.isCorePainpoint)

    for (const tag of categoryTags.slice(0, 4)) {
      const evidenceCount = categoryProducts.reduce(
        (total, product) => total + product.evidence.filter((report) => report.tagSlug === tag.slug).length,
        0
      )
      const targetUrl = `${siteUrl}/${category.slug}/best-${category.slug}-for-${tag.slug}`
      kits.push({
        categorySlug: category.slug,
        tagSlug: tag.slug,
        targetUrl,
        suggestedThreadSearch: `${category.coreProducts[0]} ${tag.name} reddit help me choose`,
        reply: `I built a data tool to compare YouTube teardown evidence for ${category.name} and ${tag.name}. It turns creator quotes into a consensus table instead of just listing specs: ${targetUrl}`,
        evidenceCount,
        productsCovered: categoryProducts.length
      })
    }
  }

  console.log(JSON.stringify({
    generated: Math.min(kits.length, limit),
    kits: kits
      .sort((left, right) => right.evidenceCount - left.evidenceCount || right.productsCovered - left.productsCovered)
      .slice(0, limit)
  }))
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
