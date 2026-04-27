import type { Metadata } from 'next'
import Link from 'next/link'
import { PublicShell } from '@/components/layout/PublicShell'
import { StructuredData } from '@/components/site/StructuredData'
import { getHardcoreHome } from '@/lib/hardcore'
import { buildPageMetadata } from '@/lib/metadata'
import { getRequestLocale } from '@/lib/request-locale'
import { buildCollectionPageSchema } from '@/lib/structured-data'

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadata({
    title: 'Hardcore Roster',
    description: 'The Bes3 category whitelist covers high-value physical products where teardown evidence matters more than official specs.',
    path: '/categories',
    locale: getRequestLocale(),
    keywords: ['hardcore product categories', 'teardown tests', 'product evidence']
  })
}

export default async function CategoriesIndexPage() {
  const home = await getHardcoreHome()

  return (
    <PublicShell>
      <StructuredData
        data={buildCollectionPageSchema({
          path: '/categories',
          title: 'Hardcore Roster',
          description: 'White-listed Bes3 categories for teardown-driven product evidence.',
          items: home.categories.map((item) => ({
            name: item.category.name,
            path: `/categories/${item.category.slug}`
          }))
        })}
      />
      <section className="px-4 py-14 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <p className="text-xs font-bold uppercase tracking-[0.28em] text-primary">Hardcore Roster</p>
          <h1 className="mt-4 max-w-5xl font-[var(--font-display)] text-5xl font-black tracking-tight sm:text-7xl">
            The whitelist is the product strategy.
          </h1>
          <p className="mt-6 max-w-3xl text-lg leading-8 text-muted-foreground">
            Bes3 rejects low-stakes shopping lists. These are the categories where physical testing, creator disagreement, SKU precision, and price timing materially change the decision.
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
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Hard tests</p>
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
