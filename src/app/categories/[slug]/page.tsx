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
      description: 'This category is not currently part of the public Bes3 coverage set.',
      path: '/categories',
      locale: await getRequestLocale(),
      robots: { index: false, follow: true }
    })
  }

  return buildPageMetadata({
    title: `${page.category.name} Evidence Matrix`,
    description: `Hands-on review evidence, buyer use cases, and price timing for ${page.category.name}.`,
    path: `/categories/${page.category.slug}`,
    locale: await getRequestLocale(),
    robots: page.products.filter((product) => product.consensus.evidenceCount > 0).length < 3 ? { index: false, follow: true } : undefined,
    keywords: [page.category.name, 'teardown evidence', 'Reddit consensus', ...page.category.painpoints]
  })
}

export default async function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const page = await getHardcoreCategory((await params).slug)
  if (!page) notFound()
  const faqEntries = [
    {
      question: `What counts as evidence for ${page.category.name}?`,
      answer: 'A product needs hands-on review evidence tied to a real buyer use case, plus a rating and a quote or timestamp. Official specs alone are not enough.'
    },
    {
      question: 'Why are there only a few tags?',
      answer: 'Bes3 groups search, community, and on-site questions into a smaller set of buyer use cases so the page stays decision-focused.'
    }
  ]
  const creatorStats = new Map<string, { evidenceCount: number; maxRank: number; authorityTier: string }>()
  for (const product of page.products) {
    for (const report of product.evidence) {
      const current = creatorStats.get(report.channelName) || {
        evidenceCount: 0,
        maxRank: 0,
        authorityTier: report.authorityTier
      }
      creatorStats.set(report.channelName, {
        evidenceCount: current.evidenceCount + 1,
        maxRank: Math.max(current.maxRank, report.bloggerRank),
        authorityTier: current.maxRank >= report.bloggerRank ? current.authorityTier : report.authorityTier
      })
    }
  }
  const topCreators = Array.from(creatorStats.entries())
    .map(([channelName, stats]) => ({ channelName, ...stats }))
    .sort((left, right) => right.maxRank - left.maxRank || right.evidenceCount - left.evidenceCount)
    .slice(0, 4)

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
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-muted-foreground">Browse by use case</p>
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
      <section className="border-y border-border bg-slate-50 px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <p className="text-xs font-bold uppercase tracking-[0.28em] text-primary">Review Sources</p>
          <h2 className="mt-3 max-w-4xl font-[var(--font-display)] text-3xl font-black tracking-tight">
            Strong review sources stay separate from store availability.
          </h2>
          <div className="mt-6 grid gap-4 md:grid-cols-4">
            {(topCreators.length ? topCreators : [{ channelName: 'Researching', evidenceCount: 0, maxRank: 0, authorityTier: 'pending' }]).map((creator) => (
              <div key={creator.channelName} className="rounded-md border border-border bg-white p-5">
                <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground">{creator.authorityTier}</p>
                <h3 className="mt-3 font-[var(--font-display)] text-2xl font-black tracking-tight">{creator.channelName}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {creator.evidenceCount} review excerpt{creator.evidenceCount === 1 ? '' : 's'} · source quality {creator.maxRank.toFixed(1)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
      <HardcoreEvidenceMatrix products={page.products} emptyTitle={`${page.category.name} is still waiting for enough aligned evidence.`} />
    </PublicShell>
  )
}
