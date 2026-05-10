import type { Metadata } from 'next'
import Link from 'next/link'
import { PublicShell } from '@/components/layout/PublicShell'
import { StructuredData } from '@/components/site/StructuredData'
import { getHardcoreHome } from '@/lib/hardcore'
import { buildPageMetadata } from '@/lib/metadata'
import { getRequestLocale } from '@/lib/request-locale'
import { buildCollectionPageSchema } from '@/lib/structured-data'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadata({
    title: 'Compare Tech Picks by Category',
    description: 'Browse product categories where Bes3 compares reviewed picks, visible downsides, and price context before a buy decision.',
    path: '/categories',
    locale: await getRequestLocale(),
    keywords: ['product categories', 'hands-on tests', 'product evidence']
  })
}

export default async function CategoriesIndexPage() {
  const home = await getHardcoreHome()

  return (
    <PublicShell>
      <StructuredData
        data={buildCollectionPageSchema({
          path: '/categories',
          title: 'Compare Tech Picks by Category',
          description: 'Bes3 categories for evidence-backed product comparisons that lead to buy, compare, wait, or skip.',
          items: home.categories.map((item) => ({
            name: item.category.name,
            path: `/categories/${item.category.slug}`
          }))
        })}
      />
      <section className="px-4 py-14 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <p className="text-xs font-bold uppercase tracking-[0.28em] text-primary">Compare Picks</p>
          <h1 className="mt-4 max-w-5xl font-[var(--font-display)] text-5xl font-black tracking-tight sm:text-7xl">
            Compare products where the wrong pick is expensive.
          </h1>
          <p className="mt-6 max-w-3xl text-lg leading-8 text-muted-foreground">
            These are the categories where physical testing, reviewer disagreement, exact model matching, and price timing materially change whether you should buy, compare, wait, or skip.
          </p>
        </div>
      </section>
      <section className="px-4 pb-16 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-5 md:grid-cols-2 xl:grid-cols-3">
          {home.categories.map((item) => (
            <Link key={item.category.slug} href={`/categories/${item.category.slug}`} className="rounded-md border border-border bg-white p-6 hover:border-primary">
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-primary">{item.status}</p>
              <h2 className="mt-3 font-[var(--font-display)] text-3xl font-black tracking-tight">{item.category.name}</h2>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">{item.category.coreProducts.join(', ')}</p>
              <div className="mt-5 border-t border-border pt-5">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">What changes the decision</p>
                <ul className="mt-3 space-y-2 text-sm text-foreground">
                  {item.category.metrics.slice(0, 4).map((metric) => (
                    <li key={metric}>{metric}</li>
                  ))}
                </ul>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </PublicShell>
  )
}
