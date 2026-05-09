import type { Metadata } from 'next'
import Link from 'next/link'
import { PublicShell } from '@/components/layout/PublicShell'
import { StructuredData } from '@/components/site/StructuredData'
import { buildCommerceDecisionReadiness } from '@/lib/decision-readiness'
import { getHardcoreHome } from '@/lib/hardcore'
import { buildPageMetadata } from '@/lib/metadata'
import { getRequestLocale } from '@/lib/request-locale'
import { listOpenCommerceProducts } from '@/lib/site-data'
import { buildCollectionPageSchema, buildFaqSchema } from '@/lib/structured-data'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadata({
    title: 'Bes3 Buyer Decision Engine',
    description:
      'Bes3 turns evidence, price timing, risk, and affiliate link health into direct buy, compare, wait, or skip decisions.',
    path: '/',
    locale: await getRequestLocale(),
    keywords: ['best picks', 'buying decisions', 'product reviews', 'best value deals']
  })
}

export default async function HomePage() {
  const [home, commerceProducts] = await Promise.all([
    getHardcoreHome(),
    listOpenCommerceProducts()
  ])
  const trackedCategoryKeys = new Set(home.categories.map((item) => item.category.slug))
  let commerceBuyReadyProducts = 0
  let commerceEvidenceSignals = 0

  for (const product of commerceProducts) {
    if (buildCommerceDecisionReadiness(product).state === 'buy-ready') {
      commerceBuyReadyProducts += 1
    }
    commerceEvidenceSignals += Number(product.evidenceCount || 0) + Number(product.publicEvidenceCount || 0)

    const categoryKey = product.categorySlug || product.category
    if (categoryKey) trackedCategoryKeys.add(categoryKey)
  }

  const evidenceCount = home.products.reduce((total, product) => total + product.consensus.evidenceCount, commerceEvidenceSignals)
  const faqEntries = [
    {
      question: 'What changed in Bes3?',
      answer: 'Bes3 now focuses on hands-on review evidence, real buyer questions, and price-aware comparisons for products that are hard to judge from specs alone.'
    },
    {
      question: 'Why do some pages show limited coverage?',
      answer: 'Bes3 does not invent winners. If exact product matching, trusted review evidence, store availability, or price history are still incomplete, the page says so clearly.'
    }
  ]

  return (
    <PublicShell>
      <StructuredData
        data={[
          buildCollectionPageSchema({
            path: '/',
            title: 'Bes3 Best Picks',
            description: 'Buying decision pages built from evidence, price timing, and verified merchant paths.',
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
            <p className="text-xs font-bold uppercase tracking-[0.32em] text-primary">Buyer decision engine</p>
            <h1 className="mt-5 max-w-5xl font-[var(--font-display)] text-5xl font-black tracking-tight sm:text-7xl">
              Know what to buy, compare, wait on, or skip.
            </h1>
            <p className="mt-6 max-w-3xl text-lg leading-8 text-muted-foreground">
              Bes3 turns review evidence, current price context, risk checks, and verified merchant paths into a buy / compare / wait / skip decision before you leave for a store.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/categories" className="inline-flex min-h-[48px] items-center rounded-md bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground">
                Find Best Picks
              </Link>
              <Link href="/deals" className="inline-flex min-h-[48px] items-center rounded-md border border-border bg-white px-5 py-3 text-sm font-semibold hover:border-primary hover:text-primary">
                See Deals
              </Link>
            </div>
            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              {[
                ['Evidence first', 'Creator evidence and buyer signals explain every recommendation.'],
                ['Price aware', 'Deal pages distinguish buy windows from wait states.'],
                ['Commission neutral', 'Affiliate availability never changes recommendation order.']
              ].map(([title, note]) => (
                <div key={title} className="rounded-2xl border border-border bg-slate-50 p-4">
                  <p className="text-sm font-black text-foreground">{title}</p>
                  <p className="mt-2 text-xs leading-6 text-muted-foreground">{note}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
            {[
              ['Categories tracked', String(trackedCategoryKeys.size), 'Public category surfaces with buying or evidence coverage.'],
              ['Buy-ready products', String(commerceBuyReadyProducts), 'Published products with verified commissionable merchant paths.'],
              ['Evidence signals', String(evidenceCount), 'Review reports and product facts behind the buying calls.']
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
            <p className="text-xs font-bold uppercase tracking-[0.28em] text-primary">Start From The Task</p>
            <h2 className="mt-3 font-[var(--font-display)] text-4xl font-black tracking-tight">
              Pick the page that matches your buying question.
            </h2>
          </div>
          <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {[
              ['Best Picks', '/categories', 'Start with the current Top 3 in a category.'],
              ['Deals', '/deals', 'Find buy windows and price-watch states.'],
              ['Reviews', '/reviews', 'Check whether a specific product is safe to buy.'],
              ['Trust', '/trust', 'See how evidence, links, and commission neutrality work.']
            ].map(([title, href, note]) => (
              <Link key={href} href={href} className="rounded-md border border-border bg-white p-5 hover:border-primary">
                <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Shopping path</p>
                <h3 className="mt-3 font-[var(--font-display)] text-2xl font-black tracking-tight">{title}</h3>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">{note}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-border bg-white px-4 py-14 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-5 lg:grid-cols-[0.72fr_1.28fr] lg:items-start">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.28em] text-primary">Who this is for</p>
            <h2 className="mt-3 font-[var(--font-display)] text-4xl font-black tracking-tight">
              Start with the anxiety behind the purchase.
            </h2>
            <p className="mt-4 text-sm leading-7 text-muted-foreground">
              Bes3 is built for high-intent shoppers who already care enough to search, compare, and verify. Not an ad list, not a coupon wall, and not a generic review feed.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {[
              ['For anxious buyers', 'I am close to buying, but I need to know if this product is safe, durable, and worth the money today.'],
              ['For comparison buyers', 'I have a shortlist and need a default winner, the strongest alternative, and the condition that would reverse the decision.'],
              ['For deal-timing buyers', 'I like the product, but I need to know whether the current price is a buy window or a wait state.']
            ].map(([title, note]) => (
              <div key={title} className="rounded-md border border-border bg-slate-50 p-5">
                <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-muted-foreground">Persona path</p>
                <h3 className="mt-3 font-[var(--font-display)] text-2xl font-black tracking-tight">{title}</h3>
                <p className="mt-3 text-sm leading-7 text-muted-foreground">{note}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-border bg-slate-950 px-4 py-14 text-white sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[0.85fr_1.15fr]">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.28em] text-emerald-300">Decision loop</p>
            <h2 className="mt-3 font-[var(--font-display)] text-4xl font-black tracking-tight">
              Every page should shorten the path from doubt to a defensible next step.
            </h2>
            <p className="mt-4 text-sm leading-7 text-slate-300">
              Revenue comes from compliant merchant exits, but the loop only works if the recommendation is trusted enough to earn the click.
            </p>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {[
              ['High-intent question', 'The user arrives with a product, category, scenario, or price-timing problem.'],
              ['Evidence and price check', 'Bes3 checks creator evidence, risk flags, current price, historical context, and offer health.'],
              ['buy / compare / wait / skip', 'The page gives one primary decision state instead of another wall of review prose.'],
              ['Admin repair queue', 'Broken links, thin evidence, overpriced CTAs, and blocked pSEO pages flow back to operators.']
            ].map(([title, note]) => (
              <div key={title} className="rounded-md border border-white/10 bg-white/5 p-5">
                <h3 className="font-[var(--font-display)] text-2xl font-black">{title}</h3>
                <p className="mt-3 text-sm leading-7 text-slate-300">{note}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-14 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <p className="text-xs font-bold uppercase tracking-[0.28em] text-primary">Categories</p>
          <h2 className="mt-3 max-w-4xl font-[var(--font-display)] text-4xl font-black tracking-tight">
            Focused product areas where real-world testing beats spec sheets.
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
