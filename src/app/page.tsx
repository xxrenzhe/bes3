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
    title: 'Bes3 Tech Buying Decision Engine',
    description:
      'Bes3 helps shoppers decide whether to buy, compare, wait, or skip 3C tech products using current prices, visible downsides, independent review signals, and clean store links.',
    path: '/',
    locale: await getRequestLocale(),
    keywords: ['tech deals', '3C digital product reviews', 'current price checks', 'independent tech reviews']
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
  const commerceReadinessTiles = [
    {
      label: 'Categories tracked',
      value: String(trackedCategoryKeys.size),
      note: 'Tech product areas Alex watches for real shopping pain.',
      href: '/categories',
      action: 'Compare Picks'
    },
    {
      label: 'Checked store links',
      value: commerceBuyReadyProducts > 0 ? String(commerceBuyReadyProducts) : 'Gate active',
      note: commerceBuyReadyProducts > 0
        ? 'Published products with a current merchant path before the CTA appears.'
        : 'No strong store-link push is shown until merchant paths pass the buy-ready check.',
      href: commerceBuyReadyProducts > 0 ? '/products' : '/trust',
      action: commerceBuyReadyProducts > 0 ? 'Review Proof' : 'See Gate'
    },
    {
      label: 'Review signals',
      value: evidenceCount > 0 ? String(evidenceCount) : 'Proof pending',
      note: evidenceCount > 0
        ? 'Review reports and product facts behind the public recommendations.'
        : 'Bes3 keeps thin research visible, but blocks fake winners until review proof is attached.',
      href: evidenceCount > 0 ? '/products' : '/start',
      action: evidenceCount > 0 ? 'Check Proof' : 'Start Need'
    }
  ]
  const faqEntries = [
    {
      question: 'What is Bes3?',
      answer: 'Bes3 is a buyer decision engine for hard-to-judge 3C tech products. Alex checks current prices, visible downsides, review signals, and store links before a page asks you to leave for checkout.'
    },
    {
      question: 'Do affiliate links change the picks?',
      answer: 'No. Bes3 may earn a commission from some store links, but commission availability does not decide which product is recommended or which downside is shown.'
    }
  ]

  return (
    <PublicShell>
      <StructuredData
        data={[
          buildCollectionPageSchema({
            path: '/',
            title: 'Bes3 Tech Buying Decisions',
            description: 'Buy, compare, wait, or skip guidance built from current tech price checks, visible cons, independent review signals, and cleaner store links.',
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
            <p className="text-xs font-bold uppercase tracking-[0.32em] text-primary">Tech deals checked by Alex</p>
            <h1 className="mt-5 max-w-5xl font-[var(--font-display)] text-5xl font-black tracking-tight sm:text-7xl">
              Find the current price and the catch before you buy tech gear.
            </h1>
            <p className="mt-6 max-w-3xl text-lg leading-8 text-muted-foreground">
              Bes3 is a buyer decision engine for 3C tech products. Alex turns messy reviews, price windows, downsides, and store links into one next step: buy, compare, wait, or skip.
            </p>
            <div className="mt-7 grid gap-2 sm:grid-cols-4">
              {[
                ['Buy', 'Price, proof, and store path are ready.'],
                ['Compare', 'A close alternative could still be safer.'],
                ['Wait', 'The product fits, but the price window is weak.'],
                ['Skip', 'The downside or missing proof is too costly.']
              ].map(([state, note]) => (
                <div key={state} className="rounded-2xl border border-border bg-slate-50 p-4">
                  <p className="font-[var(--font-display)] text-2xl font-black tracking-tight">{state}</p>
                  <p className="mt-2 text-xs leading-6 text-muted-foreground">{note}</p>
                </div>
              ))}
            </div>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/categories" className="inline-flex min-h-[48px] items-center rounded-md bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground">
                Find Best Picks
              </Link>
              <Link href="/deals" className="inline-flex min-h-[48px] items-center rounded-md border border-border bg-white px-5 py-3 text-sm font-semibold hover:border-primary hover:text-primary">
                Check Current Price
              </Link>
              <Link href="/start" className="inline-flex min-h-[48px] items-center rounded-md border border-border bg-white px-5 py-3 text-sm font-semibold hover:border-primary hover:text-primary">
                Start With Your Need
              </Link>
            </div>
            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              {[
                ['Check current price', 'Primary CTAs stay low-pressure and point to live offer checks, not blind buy-now buttons.'],
                ['Show the downside', 'Visible cons sit near the recommendation so the catch is not buried after the store link.'],
                ['Independent review signals', 'Creator tests, buyer proof, and price history explain why a product earns attention.']
              ].map(([title, note]) => (
                <div key={title} className="rounded-2xl border border-border bg-slate-50 p-4">
                  <p className="text-sm font-black text-foreground">{title}</p>
                  <p className="mt-2 text-xs leading-6 text-muted-foreground">{note}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
            {commerceReadinessTiles.map((tile) => (
              <div key={tile.label} className="rounded-md border border-border bg-slate-50 p-5">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">{tile.label}</p>
                <p className="mt-3 font-mono text-4xl font-black">{tile.value}</p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{tile.note}</p>
                <Link href={tile.href} className="mt-4 inline-flex min-h-10 items-center rounded-full border border-border bg-white px-4 text-xs font-bold uppercase tracking-[0.16em] hover:border-primary hover:text-primary">
                  {tile.action}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-border bg-slate-50 px-4 py-14 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-4xl">
            <p className="text-xs font-bold uppercase tracking-[0.28em] text-primary">Shop by decision</p>
            <h2 className="mt-3 font-[var(--font-display)] text-4xl font-black tracking-tight">
              Start where the buying decision is stuck.
            </h2>
          </div>
          <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {[
              ['Buy or wait', '/deals', 'Use this when fit is clear and price timing is the blocker.'],
              ['Compare finalists', '/categories', 'Open the strongest picks by product area and see what could change the lead.'],
              ['Check review proof', '/products', 'Verify review score, source depth, visible catch, and store-link readiness.'],
              ['Start with a need', '/start', 'Describe the product, budget, and bad-buy signs to get a tighter tech shortlist.']
            ].map(([title, href, note]) => (
              <Link key={href} href={href} className="rounded-md border border-border bg-white p-5 hover:border-primary">
                <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Decision path</p>
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
            <p className="text-xs font-bold uppercase tracking-[0.28em] text-primary">Who this helps</p>
            <h2 className="mt-3 font-[var(--font-display)] text-4xl font-black tracking-tight">
              Built for shoppers who do not want another fake ranking.
            </h2>
            <p className="mt-4 text-sm leading-7 text-muted-foreground">
              Bes3 is for high-intent tech shoppers who already care enough to search, compare, and verify. It is not an ad list, not a coupon wall, and not a generic review feed.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {[
              ['Close-to-buy shoppers', 'I am nearly ready, but I need the current price, the obvious downside, and a cleaner store link.'],
              ['Comparison shoppers', 'I have two or three models and need the strongest pick plus the reason I might choose the runner-up.'],
              ['Deal-timing shoppers', 'I like the product, but I need to know if today is a real deal or just normal pricing.']
            ].map(([title, note]) => (
              <div key={title} className="rounded-md border border-border bg-slate-50 p-5">
                <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-muted-foreground">Shopping moment</p>
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
            <p className="text-xs font-bold uppercase tracking-[0.28em] text-emerald-300">How Alex checks a deal</p>
            <h2 className="mt-3 font-[var(--font-display)] text-4xl font-black tracking-tight">
              Current price, visible cons, and review proof belong on the same screen.
            </h2>
            <p className="mt-4 text-sm leading-7 text-slate-300">
              Store links only deserve a click after the page makes the tradeoff clear. That is why Bes3 keeps price, catch, proof, and disclosure visible together.
            </p>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {[
              ['1. Check the current price', 'The page looks for live offer context, tracked lows, shipping, and whether the store path is still usable.'],
              ['2. Put the catch up front', 'The first downside stays visible so a good discount does not hide the reason someone should pass.'],
              ['3. Verify review signals', 'Independent review excerpts, source depth, ratings, and buyer proof explain why a pick is trusted.'],
              ['4. Link out cleanly', 'Bes3 labels affiliate handoffs and keeps the CTA low-pressure: Check Current Price.']
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
            Focused tech areas where real review signals beat spec sheets.
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
