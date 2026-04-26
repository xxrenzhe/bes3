import './load-env'
import { bootstrapApplication } from '@/lib/bootstrap'
import { HARDCORE_CATEGORIES } from '@/lib/hardcore-catalog'
import { formatHardcorePrice, listHardcoreProducts, listHardcoreTags, type HardcoreProduct } from '@/lib/hardcore'
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
      const rankedProducts = categoryProducts
        .map((product) => ({
          ...product,
          evidenceForTag: product.evidence.filter((report) => report.tagSlug === tag.slug)
        }))
        .filter((product) => product.evidenceForTag.length > 0 || product.consensus.evidenceCount > 0)
        .sort((left, right) => (right.consensus.score10 || 0) - (left.consensus.score10 || 0))
        .slice(0, 5)
      const evidenceCount = categoryProducts.reduce(
        (total, product) => total + product.evidence.filter((report) => report.tagSlug === tag.slug).length,
        0
      )
      const targetUrl = `${siteUrl}/${category.slug}/best-${category.slug}-for-${tag.slug}`
      const markdownTable = buildMarkdownTable(rankedProducts)
      kits.push({
        categorySlug: category.slug,
        tagSlug: tag.slug,
        targetUrl,
        screenshotTarget: `${targetUrl}#consensus-matrix`,
        suggestedThreadSearch: `${category.coreProducts[0]} ${tag.name} reddit help me choose`,
        reply: [
          `I built a data tool to compare YouTube teardown evidence for ${category.name} and ${tag.name}.`,
          'It turns creator quotes into a consensus table instead of just listing specs.',
          markdownTable,
          `Full matrix: ${targetUrl}`
        ].filter(Boolean).join('\n\n'),
        markdownTable,
        evidenceSummary: rankedProducts.map((product) => {
          const report = product.evidenceForTag[0] || product.consensus.bestQuote || product.evidence[0]
          return {
            product: product.name,
            score: product.consensus.score10,
            price: formatHardcorePrice(product.price.currentPrice, product.price.currency),
            quote: report?.evidenceQuote || null,
            creator: report?.channelName || null
          }
        }),
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

function buildMarkdownTable(products: Array<HardcoreProduct & { evidenceForTag: HardcoreProduct['evidence'] }>) {
  if (!products.length) return ''
  const rows = products.slice(0, 3).map((product) => {
    const report = product.evidenceForTag[0] || product.consensus.bestQuote || product.evidence[0]
    return [
      product.name.replace(/\|/g, '/'),
      product.consensus.score10 == null ? 'Researching' : `${product.consensus.score10.toFixed(1)}/10`,
      product.price.label.replace(/\|/g, '/'),
      (report?.evidenceQuote || 'Evidence pending').replace(/\|/g, '/').slice(0, 120)
    ]
  })
  return [
    '| Model | Consensus | Price signal | Evidence note |',
    '| --- | ---: | --- | --- |',
    ...rows.map((row) => `| ${row.join(' | ')} |`)
  ].join('\n')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
