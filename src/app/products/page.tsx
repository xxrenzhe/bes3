import type { Metadata } from 'next'
import { PublicShell } from '@/components/layout/PublicShell'
import { HardcoreEvidenceMatrix } from '@/components/site/HardcoreEvidenceMatrix'
import { StructuredData } from '@/components/site/StructuredData'
import { listHardcoreProducts } from '@/lib/hardcore'
import { buildPageMetadata } from '@/lib/metadata'
import { getRequestLocale } from '@/lib/request-locale'
import { buildCollectionPageSchema } from '@/lib/structured-data'

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadata({
    title: 'Evidence Matrix',
    description: 'Browse products through Bes3 consensus scores, source evidence, and price-value windows.',
    path: '/products',
    locale: getRequestLocale(),
    keywords: ['product evidence matrix', 'consensus score', 'teardown reviews']
  })
}

export default async function ProductsIndexPage() {
  const products = await listHardcoreProducts()

  return (
    <PublicShell>
      <StructuredData
        data={buildCollectionPageSchema({
          path: '/products',
          title: 'Evidence Matrix',
          description: 'Products ranked by teardown consensus and price-value timing.',
          items: products.map((product) => ({
            name: product.name,
            path: `/products/${product.slug}`
          }))
        })}
      />
      <section className="px-4 py-14 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <p className="text-xs font-bold uppercase tracking-[0.28em] text-primary">Evidence Matrix</p>
          <h1 className="mt-4 max-w-5xl font-[var(--font-display)] text-5xl font-black tracking-tight sm:text-7xl">
            Products sorted by proof, not product-page copy.
          </h1>
          <p className="mt-6 max-w-3xl text-lg leading-8 text-muted-foreground">
            This table is intentionally blunt: consensus score, evidence count, creator quote, current price, and buy-window state.
          </p>
        </div>
      </section>
      <HardcoreEvidenceMatrix products={products} />
    </PublicShell>
  )
}
