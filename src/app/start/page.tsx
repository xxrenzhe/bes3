import type { Metadata } from 'next'
import Link from 'next/link'
import { PublicShell } from '@/components/layout/PublicShell'
import { IntentSearchPanel } from '@/components/site/IntentSearchPanel'
import { StructuredData } from '@/components/site/StructuredData'
import { buildPageMetadata } from '@/lib/metadata'
import { getRequestLocale } from '@/lib/request-locale'
import { listCategories } from '@/lib/site-data'
import { buildCollectionPageSchema, buildFaqSchema } from '@/lib/structured-data'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadata({
    title: 'Start a Buying Decision',
    description: 'Tell Bes3 what you need, what cannot go wrong, and whether you want to buy, compare, or wait for price.',
    path: '/start',
    locale: await getRequestLocale(),
    keywords: ['buying decision', 'product recommendation', 'shortlist builder', 'compare products']
  })
}

export default async function StartPage() {
  const categories = await listCategories()
  const faqEntries = [
    {
      question: 'What should I type first?',
      answer: 'Start with the job to be done, the budget if you have one, and the thing you most want to avoid. Bes3 works better from constraints than from generic words like best.'
    },
    {
      question: 'What happens after I submit?',
      answer: 'Bes3 narrows the request into a short recommendation set, explains why the lead fits, names concerns, and points you to buy, compare, save, or wait.'
    }
  ]

  return (
    <PublicShell>
      <StructuredData
        data={[
          buildCollectionPageSchema({
            path: '/start',
            title: 'Start a Buying Decision',
            description: 'Intent-first product decision entry point for Bes3.',
            items: [
              { name: 'Best Picks', path: '/categories' },
              { name: 'Deals', path: '/deals' },
              { name: 'Compare', path: '/compare' },
              { name: 'Evidence Matrix', path: '/products' }
            ]
          }),
          buildFaqSchema('/start', faqEntries)
        ]}
      />
      <section className="overflow-hidden border-b border-border bg-[radial-gradient(circle_at_top_left,#dcfce7_0,#f8fafc_34%,#fff7ed_100%)] px-4 py-14 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.82fr_1.18fr] lg:items-start">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.32em] text-primary">Start Here</p>
            <h1 className="mt-5 font-[var(--font-display)] text-5xl font-black tracking-tight sm:text-7xl">
              Tell Bes3 the mistake you are trying not to make.
            </h1>
            <p className="mt-6 text-lg leading-8 text-muted-foreground">
              Do not start by browsing categories. Start with the buying job, the tradeoff, and the regret you want to avoid. Bes3 will turn that into a narrow next step: buy, compare, wait, or skip.
            </p>
            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              {[
                ['1', 'Describe the use case', 'What are you buying for?'],
                ['2', 'Name the deal-breakers', 'What would make it a bad buy?'],
                ['3', 'Pick the next move', 'Buy now, compare soon, or wait for price.']
              ].map(([step, title, note]) => (
                <div key={step} className="rounded-[1.5rem] border border-white/70 bg-white/75 p-4 shadow-sm backdrop-blur">
                  <p className="font-mono text-2xl font-black text-primary">{step}</p>
                  <h2 className="mt-2 text-sm font-black text-foreground">{title}</h2>
                  <p className="mt-2 text-xs leading-6 text-muted-foreground">{note}</p>
                </div>
              ))}
            </div>
          </div>
          <IntentSearchPanel action="/search" categoryOptions={categories} compact className="border border-white/70" />
        </div>
      </section>

      <section className="px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-5 md:grid-cols-3">
          {[
            ['Already know the category?', '/categories', 'Open Best Picks when you want the current leaders by product area.'],
            ['Only care about timing?', '/deals', 'Open Deals when the product fit is clear but price is the blocker.'],
            ['Need proof before trusting it?', '/products', 'Open the Evidence Matrix when you want the blunt score and evidence count first.']
          ].map(([title, href, note]) => (
            <Link key={href} href={href} className="rounded-md border border-border bg-white p-6 hover:border-primary">
              <h2 className="font-[var(--font-display)] text-2xl font-black tracking-tight">{title}</h2>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">{note}</p>
            </Link>
          ))}
        </div>
      </section>
    </PublicShell>
  )
}
