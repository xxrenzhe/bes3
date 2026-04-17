import type { Metadata } from 'next'
import Link from 'next/link'
import { PublicShell } from '@/components/layout/PublicShell'
import { OfferOpportunityCard } from '@/components/site/OfferOpportunityCard'
import { OfferShowdownSection } from '@/components/site/OfferShowdownSection'
import { StructuredData } from '@/components/site/StructuredData'
import { getCategoryLabel } from '@/lib/editorial'
import { buildPageMetadata } from '@/lib/metadata'
import { buildBiggestDiscountsPath, buildOfferShowdowns, buildOffersPath, getLatestOfferRefresh, listOfferCategories, listOfferOpportunities } from '@/lib/offers'
import { getRequestLocale } from '@/lib/request-locale'
import { buildBreadcrumbSchema, buildCollectionPageSchema, buildHowToSchema } from '@/lib/structured-data'
import { formatPriceSnapshot } from '@/lib/utils'

export async function generateMetadata(): Promise<Metadata> {
  const opportunities = await listOfferOpportunities()
  const freshnessDate = getLatestOfferRefresh(opportunities)
  const lead = opportunities[0] || null

  return buildPageMetadata({
    title: 'Live Offers',
    description:
      'Browse affiliate-eligible products with tracked pricing, verified promotion depth, best-time-to-buy context, and a 3-pick recommendation layer.',
    path: '/offers',
    locale: getRequestLocale(),
    image: lead?.product.heroImageUrl,
    freshnessDate,
    freshnessInTitle: true,
    keywords: ['live offers', 'best time to buy', 'price tracking', 'verified promotions', 'affiliate shopping guide']
  })
}

export default async function OffersPage() {
  const opportunities = await listOfferOpportunities()
  const freshOpportunities = opportunities.filter((item) => item.isFresh)
  const heroItems = freshOpportunities.length ? freshOpportunities : opportunities
  const featured = heroItems.slice(0, 6)
  const showdowns = buildOfferShowdowns(heroItems, 4)
  const categoryLinks = listOfferCategories(heroItems).slice(0, 8)
  const discountPreview = [...heroItems]
    .filter((item) => item.savingsPercent != null)
    .sort((left, right) => (right.savingsPercent ?? -1) - (left.savingsPercent ?? -1) || right.opportunityScore - left.opportunityScore)
    .slice(0, 3)
  const freshnessDate = getLatestOfferRefresh(opportunities)
  const structuredData = [
    buildBreadcrumbSchema('/offers', [
      { name: 'Home', path: '/' },
      { name: 'Offers', path: '/offers' }
    ]),
    buildCollectionPageSchema({
      path: '/offers',
      title: 'Live Offers',
      description: 'Affiliate-eligible offers with tracked pricing, verified promotion depth, and shortlist-ready timing signals.',
      breadcrumbItems: [
        { name: 'Home', path: '/' },
        { name: 'Offers', path: '/offers' }
      ],
      dateModified: freshnessDate,
      items: featured.map((item) => ({
        name: item.product.productName,
        path: item.product.slug ? `/products/${item.product.slug}` : '/offers'
      }))
    }),
    buildHowToSchema(
      '/offers',
      'How to use Bes3 offers',
      'Use offers to find a shortlist-worthy promotion, compare up to three products per category, and decide whether to buy now or keep watching.',
      [
        {
          name: 'Start with live eligible products only',
          text: 'Every public offer on this page must have an affiliate path so the recommendation is actionable, not theoretical.'
        },
        {
          name: 'Check the 3-pick showdown before clicking out',
          text: 'Bes3 limits the final recommendation layer to at most three contenders per category, then picks one winner with evidence.'
        },
        {
          name: 'Use price watches when timing is not ready',
          text: 'If the current offer is credible but still sits high in the tracked range, switch to a price watch instead of forcing the purchase.'
        }
      ]
    )
  ]

  return (
    <PublicShell>
      <StructuredData data={structuredData} />
      <div className="space-y-14 px-4 py-14 sm:px-6 lg:px-8">
        <section className="mx-auto max-w-7xl overflow-hidden rounded-[2.75rem] bg-[linear-gradient(135deg,#0f172a_0%,#134e4a_46%,#e7f8ef_100%)] px-8 py-10 text-white shadow-panel sm:px-10 sm:py-12">
          <div className="grid gap-10 xl:grid-cols-[1.05fr_0.95fr] xl:items-end">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-emerald-200">Verified offers only</p>
              <h1 className="mt-4 max-w-4xl font-[var(--font-display)] text-5xl font-black tracking-tight sm:text-6xl">
                Find the best time to buy, not just the loudest price cut.
              </h1>
              <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-100/85">
                Bes3 only surfaces live products that can be bought through the affiliate path, then reduces each category to a maximum of three serious contenders with a single recommended winner.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href={buildBiggestDiscountsPath()} className="rounded-full bg-white px-6 py-3 text-sm font-semibold text-slate-950 transition-transform hover:-translate-y-0.5">
                  View biggest discounts
                </Link>
                <Link href="/directory" className="rounded-full border border-white/20 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/10">
                  Browse categories first
                </Link>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              {[
                {
                  label: 'Live opportunities',
                  value: String(opportunities.length),
                  note: 'Only public, affiliate-eligible products.'
                },
                {
                  label: 'Fresh in 72h',
                  value: String(freshOpportunities.length),
                  note: 'Main recommendation window.'
                },
                {
                  label: 'Tracked categories',
                  value: String(listOfferCategories(opportunities).length),
                  note: 'Each category resolves to 3 picks max.'
                }
              ].map((item) => (
                <div key={item.label} className="rounded-[1.75rem] bg-white/10 p-5 backdrop-blur">
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-200">{item.label}</p>
                  <p className="mt-3 text-3xl font-black">{item.value}</p>
                  <p className="mt-2 text-sm leading-7 text-slate-100/80">{item.note}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {showdowns.length ? (
          <div className="mx-auto max-w-7xl">
            <OfferShowdownSection
              showdowns={showdowns}
              title="The recommendation layer stays at 3 picks max."
              description="This is where Bes3 reduces decision load. Every category keeps at most three contenders in view, then names one winner based on live price, verified reference discount, tracked low distance, and freshness."
            />
          </div>
        ) : null}

        <section className="mx-auto grid max-w-7xl gap-8 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-8">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="editorial-kicker">Best Current Opportunities</p>
                <h2 className="mt-3 font-[var(--font-display)] text-4xl font-black tracking-tight text-foreground">Live offers worth opening right now.</h2>
              </div>
              <p className="max-w-2xl text-sm leading-7 text-muted-foreground">
                These cards combine current price, reference-price savings when available, tracked low distance, and freshness instead of pretending every discount is equally meaningful.
              </p>
            </div>
            {featured.length ? (
              <div className="grid gap-8 xl:grid-cols-2">
                {featured.map((opportunity) => (
                  <OfferOpportunityCard key={opportunity.product.id} opportunity={opportunity} />
                ))}
              </div>
            ) : (
              <div className="rounded-[2rem] bg-white p-8 shadow-panel">
                <p className="text-lg font-semibold text-foreground">No public offers are ready yet.</p>
                <p className="mt-3 text-sm leading-7 text-muted-foreground">
                  The offers hub only lists products that have a public page, an affiliate link path, and a live price signal.
                </p>
              </div>
            )}
          </div>

          <div className="space-y-8">
            <section className="rounded-[2rem] bg-white p-6 shadow-panel">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">Quick Category Paths</p>
              <h2 className="mt-3 font-[var(--font-display)] text-3xl font-black tracking-tight text-foreground">Jump straight into a category offer page.</h2>
              <div className="mt-6 flex flex-wrap gap-3">
                {categoryLinks.map((item) => (
                  <Link key={item.slug} href={buildOffersPath(item.category)} className="rounded-full bg-muted px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-emerald-50 hover:text-primary">
                    {getCategoryLabel(item.category)}
                  </Link>
                ))}
              </div>
            </section>

            <section className="rounded-[2rem] bg-white p-6 shadow-panel">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">Discount Lens</p>
                  <h2 className="mt-3 font-[var(--font-display)] text-3xl font-black tracking-tight text-foreground">Largest verified discounts in view.</h2>
                </div>
                <Link href={buildBiggestDiscountsPath()} className="text-sm font-semibold text-primary transition-colors hover:text-primary/80">
                  Open page →
                </Link>
              </div>
              <div className="mt-6 space-y-4">
                {discountPreview.map((item, index) => (
                  <Link
                    key={item.product.id}
                    href={item.product.slug ? `/products/${item.product.slug}` : buildOffersPath(item.product.category)}
                    className="block rounded-[1.5rem] bg-muted p-5 transition-colors hover:bg-emerald-50"
                  >
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">#{index + 1} verified promotion</p>
                    <h3 className="mt-3 text-xl font-black text-foreground">{item.product.productName}</h3>
                    <p className="mt-2 text-sm leading-7 text-muted-foreground">{item.winnerReason}</p>
                    <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
                      <span className="font-black text-foreground">{formatPriceSnapshot(item.currentPrice, item.currentCurrency)}</span>
                      {item.referencePrice != null && item.savingsPercent != null ? (
                        <span className="text-muted-foreground">
                          vs {formatPriceSnapshot(item.referencePrice, item.referenceCurrency || item.currentCurrency)} · {Math.round(item.savingsPercent)}% off
                        </span>
                      ) : null}
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          </div>
        </section>
      </div>
    </PublicShell>
  )
}
