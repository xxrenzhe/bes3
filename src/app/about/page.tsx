import type { Metadata } from 'next'
import { PublicShell } from '@/components/layout/PublicShell'
import { StructuredData } from '@/components/site/StructuredData'
import { HARDCORE_CATEGORIES } from '@/lib/hardcore'
import { buildPageMetadata } from '@/lib/metadata'
import { getRequestLocale } from '@/lib/request-locale'
import { buildAboutPageSchema, buildFaqSchema } from '@/lib/structured-data'

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadata({
    title: 'About Bes3',
    description: 'Bes3 is a hardcore product evidence engine built from hardware teardowns, canonical pain points, consensus scoring, and price-value analysis.',
    path: '/about',
    locale: getRequestLocale(),
    keywords: ['about Bes3', 'hardware teardown evidence', 'consensus scoring', 'price value analysis']
  })
}

export default function AboutPage() {
  const faqEntries = [
    {
      question: 'What is Bes3 now?',
      answer: 'Bes3 is a hardcore product evidence engine for high-value physical products. It turns YouTube teardown evidence into scenario-specific comparison matrices.'
    },
    {
      question: 'What does Bes3 refuse to do?',
      answer: 'Bes3 refuses to fabricate winners, rank by commission, or present official specs as proof when no physical test exists.'
    }
  ]

  return (
    <PublicShell>
      <StructuredData
        data={[
          buildAboutPageSchema('/about', 'About Bes3', 'Hardcore product evidence engine for teardown-backed buying decisions.'),
          buildFaqSchema('/about', faqEntries)
        ]}
      />
      <section className="px-4 py-14 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <p className="text-xs font-bold uppercase tracking-[0.28em] text-primary">About</p>
          <h1 className="mt-4 max-w-5xl font-[var(--font-display)] text-5xl font-black tracking-tight sm:text-7xl">
            Cut the crap. Real specs from hardware teardowns, not SEO spam.
          </h1>
          <p className="mt-6 max-w-3xl text-lg leading-8 text-muted-foreground">
            Bes3 focuses on products where the difference between marketing specs and physical reality can cost serious money: robot vacuums, power stations, security devices, creator gear, air and water systems, maker tools, and other hard-to-judge equipment.
          </p>
        </div>
      </section>
      <section className="px-4 pb-16 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-5 md:grid-cols-2 xl:grid-cols-3">
          {[
            ['Evidence first', 'Every score must trace back to a creator test, rating enum, and quote or timestamp.'],
            ['Scenario driven', 'The taxonomy engine clusters real search, Reddit, and site-search language into canonical pain points.'],
            ['No commission ranking', 'Affiliate availability is required for commercial execution, but commission does not choose the winner.'],
            ['Price-aware', 'Consensus score is combined with current price, historical low, and 90-day average to identify buy windows.'],
            ['No fake certainty', 'Researching states are valid. A thin page is better than a fabricated recommendation.'],
            ['Crawler readable', 'Core data is rendered in semantic HTML tables and JSON-LD so RAG crawlers can parse it.']
          ].map(([title, description]) => (
            <div key={title} className="rounded-md border border-border bg-white p-6">
              <h2 className="font-[var(--font-display)] text-2xl font-black">{title}</h2>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">{description}</p>
            </div>
          ))}
        </div>
        <div className="mx-auto mt-8 max-w-7xl rounded-md border border-border bg-slate-50 p-6">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-muted-foreground">Current roster</p>
          <p className="mt-3 text-sm leading-7 text-muted-foreground">
            {HARDCORE_CATEGORIES.map((category) => category.name).join(', ')}.
          </p>
        </div>
      </section>
    </PublicShell>
  )
}
