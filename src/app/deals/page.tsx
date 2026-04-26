import type { Metadata } from 'next'
import Link from 'next/link'
import { PublicShell } from '@/components/layout/PublicShell'
import { HardcoreEvidenceMatrix } from '@/components/site/HardcoreEvidenceMatrix'
import { StructuredData } from '@/components/site/StructuredData'
import { ValueMap } from '@/components/site/ValueMap'
import { HARDCORE_CATEGORIES, getHardcoreHome } from '@/lib/hardcore'
import { buildPageMetadata } from '@/lib/metadata'
import { getRequestLocale } from '@/lib/request-locale'
import { buildCollectionPageSchema, buildFaqSchema } from '@/lib/structured-data'

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadata({
    title: 'Best Value Lab',
    description:
      'Bes3 ranks buying windows by combining teardown consensus scores, current price, historical lows, and 90-day average price baselines.',
    path: '/deals',
    locale: getRequestLocale(),
    keywords: ['best value tech', 'price value score', 'teardown consensus', 'price drop alerts']
  })
}

export default async function DealsPage() {
  const home = await getHardcoreHome()
  const faqEntries = [
    {
      question: 'How does Bes3 decide whether something is a deal?',
      answer: 'V2 combines the consensus score from teardown evidence with current price, historical low, and 90-day average price. A cheap weak product should not outrank a proven product automatically.'
    },
    {
      question: 'Why do some products show price baseline pending?',
      answer: 'The page refuses to call a product a deal until current and historical price data are both present.'
    }
  ]

  return (
    <PublicShell>
      <StructuredData
        data={[
          buildCollectionPageSchema({
            path: '/deals',
            title: 'Best Value Lab',
            description: 'Price-value pages ranked by teardown consensus and live price baselines.',
            items: HARDCORE_CATEGORIES.map((category) => ({
              name: `Best value ${category.name}`,
              path: `/deals/best-value-${category.slug}-under-500`
            }))
          }),
          buildFaqSchema('/deals', faqEntries)
        ]}
      />
      <section className="px-4 py-14 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <p className="text-xs font-bold uppercase tracking-[0.28em] text-primary">Price-Value Entry Point</p>
          <h1 className="mt-4 max-w-5xl font-[var(--font-display)] text-5xl font-black tracking-tight sm:text-7xl">
            Deals are meaningless without teardown scores.
          </h1>
          <p className="mt-6 max-w-3xl text-lg leading-8 text-muted-foreground">
            The old offers hub is gone. Bes3 now treats price as one input inside a harder question: is this tested product cheap enough to buy right now?
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            {HARDCORE_CATEGORIES.slice(0, 6).map((category) => (
              <Link
                key={category.slug}
                href={`/deals/best-value-${category.slug}-under-500`}
                className="rounded-md border border-border bg-white px-4 py-2 text-sm font-semibold hover:border-primary hover:text-primary"
              >
                {category.name} under $500
              </Link>
            ))}
          </div>
        </div>
      </section>
      <ValueMap products={home.products} />
      <HardcoreEvidenceMatrix products={home.bestValueProducts} emptyTitle="No value-ranked products are ready yet." />
      <section className="px-4 py-14 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-5 md:grid-cols-3">
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
