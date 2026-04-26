import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { PublicShell } from '@/components/layout/PublicShell'
import { HardcoreEvidenceMatrix } from '@/components/site/HardcoreEvidenceMatrix'
import { StructuredData } from '@/components/site/StructuredData'
import { getValueLandingPage } from '@/lib/hardcore'
import { buildPageMetadata } from '@/lib/metadata'
import { getRequestLocale } from '@/lib/request-locale'
import { buildCollectionPageSchema } from '@/lib/structured-data'

function normalizeValueSlug(slug: string) {
  if (slug.startsWith('best-value-')) return slug.slice('best-value-'.length)
  if (slug.startsWith('best-')) return slug.slice('best-'.length)
  return ''
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const valueSlug = normalizeValueSlug((await params).slug)
  const page = valueSlug ? await getValueLandingPage(valueSlug) : null
  if (!page) {
    return buildPageMetadata({
      title: 'Best Value Researching',
      description: 'This Bes3 value page is not ready yet.',
      path: '/deals',
      locale: getRequestLocale(),
      robots: { index: false, follow: true }
    })
  }

  return buildPageMetadata({
    title: `Best Value ${page.category.name} Under $${page.priceLimit}`,
    description: `Bes3 ranks ${page.category.name} under $${page.priceLimit} by teardown consensus score, current price, 90-day average, and historical low.`,
    path: `/deals/best-${page.category.slug}-under-${page.priceLimit}`,
    locale: getRequestLocale(),
    keywords: [`best value ${page.category.name}`, `${page.category.name} under ${page.priceLimit}`, 'teardown consensus']
  })
}

export default async function BestValuePage({ params }: { params: Promise<{ slug: string }> }) {
  const valueSlug = normalizeValueSlug((await params).slug)
  const page = valueSlug ? await getValueLandingPage(valueSlug) : null
  if (!page) notFound()
  const path = `/deals/best-${page.category.slug}-under-${page.priceLimit}`

  return (
    <PublicShell>
      <StructuredData
        data={buildCollectionPageSchema({
          path,
          title: `Best Value ${page.category.name} Under $${page.priceLimit}`,
          description: 'Ranked by value score: consensus score multiplied by 100 and divided by current price.',
          items: page.products.map((product) => ({
            name: product.name,
            path: `/products/${product.slug}`
          }))
        })}
      />
      <section className="px-4 py-14 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <p className="text-xs font-bold uppercase tracking-[0.28em] text-primary">Best Value</p>
          <h1 className="mt-4 max-w-5xl font-[var(--font-display)] text-5xl font-black tracking-tight sm:text-7xl">
            Best value {page.category.name} under ${page.priceLimit}.
          </h1>
          <p className="mt-6 max-w-3xl text-lg leading-8 text-muted-foreground">
            Formula: value score equals consensus score times 100 divided by current price. Pages stay in researching mode until enough products have both evidence and price baselines.
          </p>
        </div>
      </section>
      <HardcoreEvidenceMatrix products={page.products} emptyTitle={`Not enough ${page.category.name} under $${page.priceLimit} are fully scored yet.`} />
    </PublicShell>
  )
}
