import { NextResponse } from 'next/server'
import { getDatabase } from '@/lib/db'
import { HARDCORE_CATEGORIES, listHardcoreProducts, listHardcoreTags } from '@/lib/hardcore'

export const dynamic = 'force-dynamic'

export async function GET() {
  const [products, tags] = await Promise.all([listHardcoreProducts(), listHardcoreTags()])
  const db = await getDatabase()
  const [pendingTags, rescanQueue, priceSnapshots] = await Promise.all([
    db.queryOne<{ count: number }>('SELECT COUNT(*) AS count FROM pending_tags WHERE status = ?', ['pending']),
    db.queryOne<{ count: number }>('SELECT COUNT(*) AS count FROM taxonomy_rescan_queue WHERE status = ?', ['queued']),
    db.queryOne<{ count: number }>('SELECT COUNT(*) AS count FROM price_value_snapshots')
  ])

  return NextResponse.json({
    version: 'bes3-evidence-v2',
    positioning: 'Hardcore product evidence engine built from creator teardown data, canonical pain points, and price-value windows.',
    counts: {
      categories: HARDCORE_CATEGORIES.length,
      tags: tags.length,
      products: products.length,
      evidenceReports: products.reduce((total, product) => total + product.consensus.evidenceCount, 0),
      pendingTags: pendingTags?.count || 0,
      queuedRescans: rescanQueue?.count || 0,
      priceValueSnapshots: priceSnapshots?.count || 0
    },
    categories: HARDCORE_CATEGORIES.map((category) => ({
      slug: category.slug,
      name: category.name,
      coreProducts: category.coreProducts,
      metrics: category.metrics,
      painpoints: category.painpoints,
      routes: {
        category: `/categories/${category.slug}`,
        value: `/deals/best-value-${category.slug}-under-500`,
        scenarios: tags
          .filter((tag) => tag.categorySlug === category.slug)
          .slice(0, 6)
          .map((tag) => `/${category.slug}/best-${category.slug}-for-${tag.slug}`),
        multiConstraint: tags
          .filter((tag) => tag.categorySlug === category.slug && tag.isCorePainpoint)
          .slice(0, 4)
          .flatMap((first, firstIndex, categoryTags) =>
            categoryTags.slice(firstIndex + 1).map((second) => `/${category.slug}/best-${first.slug}-${second.slug}-${category.slug}`)
          )
      }
    })),
    automation: {
      priceAlerts: '/api/open/evidence/price-alerts',
      evidenceFeedback: '/api/open/evidence/feedback',
      searchIntake: '/api/open/evidence/search-intake'
    },
    products: products.slice(0, 50).map((product) => ({
      id: product.id,
      slug: product.slug,
      name: product.name,
      brand: product.brand,
      categorySlug: product.categorySlug,
      consensus: product.consensus,
      price: product.price,
      route: `/products/${product.slug}`
    }))
  })
}
