import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { PublicShell } from '@/components/layout/PublicShell'
import { HardcoreEvidenceMatrix } from '@/components/site/HardcoreEvidenceMatrix'
import { StructuredData } from '@/components/site/StructuredData'
import { getHardcoreCategory } from '@/lib/hardcore'
import { buildPageMetadata } from '@/lib/metadata'
import { getRequestLocale } from '@/lib/request-locale'
import { buildCollectionPageSchema, buildFaqSchema } from '@/lib/structured-data'

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const page = await getHardcoreCategory((await params).slug)
  if (!page) {
    return buildPageMetadata({
      title: 'Category Researching',
      description: 'This Bes3 hardcore category is not part of the current whitelist.',
      path: '/categories',
      locale: getRequestLocale(),
      robots: { index: false, follow: true }
    })
  }

  return buildPageMetadata({
    title: `${page.category.name} Evidence Matrix`,
    description: `Hardcore teardown evidence, canonical pain points, and price-value timing for ${page.category.name}.`,
    path: `/categories/${page.category.slug}`,
    locale: getRequestLocale(),
    keywords: [page.category.name, 'teardown evidence', 'Reddit consensus', ...page.category.painpoints]
  })
}

export default async function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const page = await getHardcoreCategory((await params).slug)
  if (!page) notFound()
  const faqEntries = [
    {
      question: `What counts as evidence for ${page.category.name}?`,
      answer: 'A product needs creator evidence tied to a canonical pain point, a rating enum, and a quote or timestamp. Official spec repetition is not enough.'
    },
    {
      question: 'Why are there only a few tags?',
      answer: 'The tag engine clusters Amazon, Google, Reddit, and site-search language into canonical pain points so the page stays decision-focused.'
    }
  ]

  return (
    <PublicShell>
      <StructuredData
        data={[
          buildCollectionPageSchema({
            path: `/categories/${page.category.slug}`,
            title: `${page.category.name} Evidence Matrix`,
            description: `Scenario-driven evidence matrix for ${page.category.name}.`,
            items: page.products.map((product) => ({
              name: product.name,
              path: `/products/${product.slug}`
            }))
          }),
          buildFaqSchema(`/categories/${page.category.slug}`, faqEntries)
        ]}
      />
      <section className="px-4 py-14 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[1fr_0.8fr]">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.28em] text-primary">Category Matrix</p>
            <h1 className="mt-4 max-w-5xl font-[var(--font-display)] text-5xl font-black tracking-tight sm:text-7xl">
              {page.category.name}: tested against real pain points.
            </h1>
            <p className="mt-6 max-w-3xl text-lg leading-8 text-muted-foreground">
              Official specs are stored as context, but the matrix is driven by creator tests: {page.category.metrics.join(', ')}.
            </p>
          </div>
          <div className="rounded-md border border-border bg-white p-6">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-muted-foreground">pSEO scenario routes</p>
            <div className="mt-4 flex flex-col gap-3">
              {page.tags.slice(0, 6).map((tag) => (
                <Link key={tag.slug} href={`/${page.category.slug}/best-${page.category.slug}-for-${tag.slug}`} className="rounded-md bg-slate-50 px-4 py-3 text-sm font-semibold hover:bg-emerald-50 hover:text-primary">
                  Best {page.category.name} for {tag.name}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>
      <HardcoreEvidenceMatrix products={page.products} emptyTitle={`${page.category.name} is still waiting for enough aligned evidence.`} />
    </PublicShell>
  )
}
