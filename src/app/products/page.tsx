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
    title: 'Reviewed Products',
    description: 'Browse Bes3 reviewed tech products by review proof, visible downsides, and current price context.',
    path: '/products',
    locale: await getRequestLocale(),
    keywords: ['reviewed tech products', 'independent tech reviews', 'current price checks', 'product downsides']
  })
}

export default async function ProductsIndexPage() {
  const products = await listHardcoreProducts()

  return (
    <PublicShell>
      <StructuredData
        data={buildCollectionPageSchema({
          path: '/products',
          title: 'Reviewed Products',
          description: 'Products ranked by review proof, current price context, and visible downsides.',
          items: products.map((product) => ({
            name: product.name,
            path: `/products/${product.slug}`
          }))
        })}
      />
      <section className="px-4 py-14 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <p className="text-xs font-bold uppercase tracking-[0.28em] text-primary">Reviewed Products</p>
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
