import type { Metadata } from 'next'
import Link from 'next/link'
import { PublicShell } from '@/components/layout/PublicShell'
import { HardcoreEvidenceMatrix } from '@/components/site/HardcoreEvidenceMatrix'
import { StructuredData } from '@/components/site/StructuredData'
import { getHardcoreHome } from '@/lib/hardcore'
import { buildPageMetadata } from '@/lib/metadata'
import { getRequestLocale } from '@/lib/request-locale'
import { buildCollectionPageSchema, buildFaqSchema } from '@/lib/structured-data'

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadata({
    title: 'Independent Product Ratings',
    description:
      'Bes3 turns YouTube hardware teardowns into scenario-driven comparison matrices with consensus scores, source quotes, and price-value timing.',
    path: '/',
    locale: getRequestLocale(),
    keywords: ['hardware teardown reviews', 'real specs', 'Reddit consensus', 'product evidence matrix']
  })
}

export default async function HomePage() {
  const home = await getHardcoreHome()
  const liveCategories = home.categories.filter((item) => item.status === 'Live matrix').length
  const evidenceCount = home.products.reduce((total, product) => total + product.consensus.evidenceCount, 0)
  const faqEntries = [
    {
      question: 'What changed in Bes3?',
      answer: 'Bes3 is no longer a generic buying guide. It now focuses on hands-on review evidence, real buyer questions, and price-aware comparisons.'
    },
    {
      question: 'Why does Bes3 show researching states?',
      answer: 'Bes3 does not invent winners. If exact product matching, review evidence, store availability, or price baselines are missing, the page says so.'
    }
  ]

  return (
    <PublicShell>
      <StructuredData
        data={[
          buildCollectionPageSchema({
            path: '/',
            title: 'Independent Product Ratings',
            description: 'Comparison pages built from hands-on review evidence.',
            items: home.categories.map((item) => ({
              name: item.category.name,
              path: `/categories/${item.category.slug}`
            }))
          }),
          buildFaqSchema('/', faqEntries)
        ]}
      />
      <section className="border-b border-border bg-white px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:items-end">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.32em] text-primary">Buyer-First Ratings</p>
            <h1 className="mt-5 max-w-5xl font-[var(--font-display)] text-5xl font-black tracking-tight sm:text-7xl">
              Real testing insights for better buying decisions.
            </h1>
            <p className="mt-6 max-w-3xl text-lg leading-8 text-muted-foreground">
              Bes3 converts long-form video reviews, real buyer concerns, exact product matching, and price history into clearer comparisons for products that are hard to judge from specs alone.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/categories" className="rounded-md bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground">
                Browse categories
              </Link>
              <Link href="/deals" className="rounded-md border border-border bg-white px-5 py-3 text-sm font-semibold hover:border-primary hover:text-primary">
                Check best value windows
              </Link>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
            {[
              ['Categories tracked', String(home.categories.length), 'Product areas where hands-on testing matters most.'],
              ['Live comparisons', String(liveCategories), 'Categories with enough verified review coverage.'],
              ['Review excerpts', String(evidenceCount), 'Source-backed quotes currently available.']
            ].map(([label, value, note]) => (
              <div key={label} className="rounded-md border border-border bg-slate-50 p-5">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">{label}</p>
                <p className="mt-3 font-mono text-4xl font-black">{value}</p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{note}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-border bg-slate-50 px-4 py-14 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-4xl">
            <p className="text-xs font-bold uppercase tracking-[0.28em] text-primary">Pain-Point Selector</p>
            <h2 className="mt-3 font-[var(--font-display)] text-4xl font-black tracking-tight">
              Start with the failure mode you actually care about.
            </h2>
          </div>
          <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {home.categories.slice(0, 8).flatMap((item) =>
              item.coreTags.slice(0, 2).map((tag) => (
                <Link
                  key={`${item.category.slug}-${tag.slug}`}
                  href={`/${item.category.slug}/best-${item.category.slug}-for-${tag.slug}`}
                  className="rounded-md border border-border bg-white p-5 hover:border-primary"
                >
                  <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground">{item.category.name}</p>
                  <h3 className="mt-3 font-[var(--font-display)] text-2xl font-black tracking-tight">{tag.name}</h3>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">
                    See which products handle {tag.name.toLowerCase()} best based on review evidence and price timing.
                  </p>
                </Link>
              ))
            )}
          </div>
        </div>
      </section>

      <section className="px-4 py-14 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <p className="text-xs font-bold uppercase tracking-[0.28em] text-primary">Categories</p>
          <h2 className="mt-3 max-w-4xl font-[var(--font-display)] text-4xl font-black tracking-tight">
            Fourteen product areas where real-world testing beats spec sheets.
          </h2>
          <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {home.categories.map((item) => (
              <Link key={item.category.slug} href={`/categories/${item.category.slug}`} className="rounded-md border border-border bg-white p-6 hover:border-primary">
                <div className="flex items-center justify-between gap-4">
                  <h3 className="font-[var(--font-display)] text-2xl font-black">{item.category.name}</h3>
                  <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold">{item.status}</span>
                </div>
                <p className="mt-4 text-sm leading-7 text-muted-foreground">{item.category.metrics.slice(0, 3).join(' | ')}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {item.coreTags.slice(0, 3).map((tag) => (
                    <span key={tag.slug} className="rounded-md bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-900">
                      {tag.name}
                    </span>
                  ))}
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <HardcoreEvidenceMatrix products={home.products.slice(0, 8)} />

      <section className="px-4 py-14 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-6 md:grid-cols-2">
          {faqEntries.map((entry) => (
            <div key={entry.question} className="rounded-md border border-border bg-white p-6">
              <h2 className="font-semibold">{entry.question}</h2>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">{entry.answer}</p>
            </div>
          ))}
        </div>
      </section>
    </PublicShell>
  )
}
