import type { Metadata } from 'next'
import Link from 'next/link'
import { PublicShell } from '@/components/layout/PublicShell'
import { OfferTransparencyFaqSection, buildOfferFaqEntries } from '@/components/site/OfferTransparencyFaqSection'
import { OfferTransparencyPanel } from '@/components/site/OfferTransparencyPanel'
import { OfferOpportunityCard } from '@/components/site/OfferOpportunityCard'
import { OfferShowdownSection } from '@/components/site/OfferShowdownSection'
import { StructuredData } from '@/components/site/StructuredData'
import { buildPageMetadata } from '@/lib/metadata'
import { buildOfferShowdowns, buildOffersPath, getLatestOfferRefresh, listOfferCategories, listOfferOpportunities } from '@/lib/offers'
import { getRequestLocale } from '@/lib/request-locale'
import { buildBreadcrumbSchema, buildCollectionPageSchema, buildFaqSchema, buildHowToSchema } from '@/lib/structured-data'
import { formatPriceSnapshot } from '@/lib/utils'

export async function generateMetadata(): Promise<Metadata> {
  const allDiscounts = await listOfferOpportunities({ sort: 'discount' })
  const verifiedDiscounts = allDiscounts.filter((item) => item.hasVerifiedDiscount)
  const freshnessDate = getLatestOfferRefresh(verifiedDiscounts)
  const lead = verifiedDiscounts[0] || null

  return buildPageMetadata({
    title: 'Biggest Discounts',
    description:
      'See the largest verified live discounts across affiliate-eligible products, based on reliable reference prices rather than invented savings labels.',
    path: '/biggest-discounts',
    locale: getRequestLocale(),
    image: lead?.product.heroImageUrl,
    freshnessDate,
    freshnessInTitle: true,
    keywords: ['biggest discounts', 'verified discounts', 'best promotions', 'reference price offers']
  })
}

export default async function BiggestDiscountsPage() {
  const allDiscounts = await listOfferOpportunities({ sort: 'discount' })
  const verifiedDiscounts = allDiscounts.filter((item) => item.hasVerifiedDiscount)
  const activeDiscounts = verifiedDiscounts.filter((item) => item.isFresh)
  const items = (activeDiscounts.length ? activeDiscounts : verifiedDiscounts).slice(0, 12)
  const leader = items[0] || null
  const freshnessDate = getLatestOfferRefresh(items)
  const showdowns = buildOfferShowdowns(items, 3)
  const faqEntries = buildOfferFaqEntries({ scope: 'biggest discounts' })
  const structuredData = [
    buildBreadcrumbSchema('/biggest-discounts', [
      { name: 'Home', path: '/' },
      { name: 'Biggest Discounts', path: '/biggest-discounts' }
    ]),
    buildCollectionPageSchema({
      path: '/biggest-discounts',
      title: 'Biggest Discounts',
      description: 'Largest verified live discounts based on reliable reference prices and affiliate-eligible purchase paths.',
      breadcrumbItems: [
        { name: 'Home', path: '/' },
        { name: 'Biggest Discounts', path: '/biggest-discounts' }
      ],
      dateModified: freshnessDate,
      items: items.map((item) => ({
        name: item.product.productName,
        path: item.product.slug ? `/products/${item.product.slug}` : '/biggest-discounts'
      }))
    }),
    buildHowToSchema(
      '/biggest-discounts',
      'How Bes3 ranks biggest discounts',
      'This page only counts live promotions that have a reliable reference price and an affiliate checkout path. Savings labels are only shown when the reference is real.',
      [
        {
          name: 'Require a real reference price',
          text: 'The page only ranks offers that have an original, compare-at, or MSRP reference we can actually point to.'
        },
        {
          name: 'Keep timing in the ranking',
          text: 'A large discount still gets downgraded when the tracked price position or freshness is weak.'
        },
        {
          name: 'Use the category page for the final choice',
          text: 'When several discounted products live in the same category, move into the category offer page to see the 3-pick showdown.'
        }
      ]
    ),
    buildFaqSchema('/biggest-discounts', faqEntries)
  ]

  return (
    <PublicShell>
      <StructuredData data={structuredData} />
      <div className="space-y-14 px-4 py-14 sm:px-6 lg:px-8">
        <section className="mx-auto max-w-7xl rounded-[2.75rem] bg-[linear-gradient(135deg,#0f172a_0%,#1d4ed8_42%,#f8fbff_100%)] p-8 text-white shadow-panel sm:p-10">
          <div className="grid gap-8 xl:grid-cols-[1.05fr_0.95fr] xl:items-end">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-sky-200">Verified reference-price leaderboard</p>
              <h1 className="mt-4 font-[var(--font-display)] text-5xl font-black tracking-tight sm:text-6xl">
                The biggest live discounts that Bes3 can actually verify.
              </h1>
              <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-100/85">
                Every item here has a current affiliate-eligible price and a reliable reference price, so the discount math stays explainable.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/offers" className="rounded-full bg-white px-6 py-3 text-sm font-semibold text-slate-950 transition-transform hover:-translate-y-0.5">
                  Back to all offers
                </Link>
                {leader?.product.category ? (
                  <Link href={buildOffersPath(leader.product.category)} className="rounded-full border border-white/20 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/10">
                    Open winner category
                  </Link>
                ) : null}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              {[
                { label: 'Verified discounts', value: String(verifiedDiscounts.length), note: 'Reliable reference price required.' },
                { label: 'Fresh now', value: String(activeDiscounts.length), note: 'Inside the 72-hour window.' },
                { label: 'Covered categories', value: String(listOfferCategories(items).length), note: 'Use category pages for 3-pick finals.' }
              ].map((item) => (
                <div key={item.label} className="rounded-[1.5rem] bg-white/10 p-5 backdrop-blur">
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-sky-200">{item.label}</p>
                  <p className="mt-3 text-3xl font-black">{item.value}</p>
                  <p className="mt-2 text-sm leading-7 text-slate-100/80">{item.note}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {leader ? (
          <section className="mx-auto max-w-7xl rounded-[2rem] bg-white p-8 shadow-panel">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">Current leader</p>
            <div className="mt-4 grid gap-6 xl:grid-cols-[1.05fr_0.95fr] xl:items-start">
              <div>
                <h2 className="font-[var(--font-display)] text-4xl font-black tracking-tight text-foreground">{leader.product.productName}</h2>
                <p className="mt-4 text-sm leading-7 text-muted-foreground">{leader.winnerReason}</p>
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-[1.5rem] bg-muted p-5">
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Current</p>
                  <p className="mt-3 text-2xl font-black text-foreground">{formatPriceSnapshot(leader.currentPrice, leader.currentCurrency)}</p>
                </div>
                <div className="rounded-[1.5rem] bg-muted p-5">
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Reference</p>
                  <p className="mt-3 text-2xl font-black text-foreground">
                    {formatPriceSnapshot(leader.referencePrice, leader.referenceCurrency || leader.currentCurrency)}
                  </p>
                </div>
                <div className="rounded-[1.5rem] bg-muted p-5">
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Savings</p>
                  <p className="mt-3 text-2xl font-black text-foreground">
                    {leader.savingsPercent != null ? `${Math.round(leader.savingsPercent)}%` : 'N/A'}
                  </p>
                </div>
              </div>
            </div>
          </section>
        ) : null}

        {showdowns.length ? (
          <div className="mx-auto max-w-7xl">
            <OfferShowdownSection
              showdowns={showdowns}
              title="When the largest discount still needs a category winner."
              description="A big headline percentage does not automatically win the buying decision. These category showdowns keep the final pick grounded in timing and product fit."
            />
          </div>
        ) : null}

        <section className="mx-auto max-w-7xl space-y-8">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="editorial-kicker">Leaderboard</p>
              <h2 className="mt-3 font-[var(--font-display)] text-4xl font-black tracking-tight text-foreground">Largest verified promotions checked recently.</h2>
            </div>
            <p className="max-w-2xl text-sm leading-7 text-muted-foreground">
              Ranking is driven by verified discount depth first, then timing quality and freshness. Commission is not part of the public score.
            </p>
          </div>
          <div className="grid gap-8 xl:grid-cols-2">
            {items.map((opportunity) => (
              <OfferOpportunityCard key={opportunity.product.id} opportunity={opportunity} source="biggest-discounts-card" />
            ))}
          </div>
        </section>

        <div className="mx-auto max-w-7xl">
          <OfferTransparencyPanel
            title="Why this leaderboard can trust a big percentage"
            description="This page is stricter than a generic offers list. Every headline discount requires a reliable reference price, and stale reference checks are removed from the main leaderboard."
          />
        </div>

        <div className="mx-auto max-w-7xl">
          <OfferTransparencyFaqSection title="Discount leaderboard questions, answered clearly." entries={faqEntries} />
        </div>
      </div>
    </PublicShell>
  )
}
