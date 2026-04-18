import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { PublicShell } from '@/components/layout/PublicShell'
import { OfferTransparencyFaqSection, buildOfferFaqEntries } from '@/components/site/OfferTransparencyFaqSection'
import { OfferTransparencyPanel } from '@/components/site/OfferTransparencyPanel'
import { OfferOpportunityCard } from '@/components/site/OfferOpportunityCard'
import { OfferShowdownSection } from '@/components/site/OfferShowdownSection'
import { StructuredData } from '@/components/site/StructuredData'
import { buildCategoryPath, categoryMatches } from '@/lib/category'
import { getCategoryLabel } from '@/lib/editorial'
import { buildPageMetadata } from '@/lib/metadata'
import { buildNewsletterPath } from '@/lib/newsletter-path'
import { buildBiggestDiscountsPath, buildOfferShowdowns, buildOffersPath, getLatestOfferRefresh, listOfferOpportunities } from '@/lib/offers'
import { getRequestLocale } from '@/lib/request-locale'
import { buildBreadcrumbSchema, buildCollectionPageSchema, buildFaqSchema, buildHowToSchema } from '@/lib/structured-data'
import { listCategories } from '@/lib/site-data'

export async function generateStaticParams() {
  const opportunities = await listOfferOpportunities()
  return Array.from(
    new Set(
      opportunities
        .map((item) => buildOffersPath(item.product.category))
        .filter((path) => path.startsWith('/offers/'))
        .map((path) => path.replace('/offers/', ''))
    )
  ).map((category) => ({ category }))
}

export async function generateMetadata({
  params
}: {
  params: Promise<{ category: string }>
}): Promise<Metadata> {
  const resolvedParams = await params
  const opportunities = await listOfferOpportunities({ category: resolvedParams.category })
  const freshnessDate = getLatestOfferRefresh(opportunities)
  const categoryLabel = getCategoryLabel(resolvedParams.category)
  const lead = opportunities[0] || null

  return buildPageMetadata({
    title: `${categoryLabel} Offers`,
    description:
      `See the strongest ${categoryLabel.toLowerCase()} offers with tracked timing, verified promotion depth, and a 3-pick final recommendation.`,
    path: buildOffersPath(resolvedParams.category),
    locale: getRequestLocale(),
    image: lead?.product.heroImageUrl,
    freshnessDate,
    freshnessInTitle: true,
    keywords: [`${categoryLabel} offers`, `${categoryLabel} promotions`, `best ${categoryLabel} price`, `${categoryLabel} price watch`]
  })
}

export default async function OfferCategoryPage({
  params
}: {
  params: Promise<{ category: string }>
}) {
  const resolvedParams = await params
  const [opportunities, categories] = await Promise.all([
    listOfferOpportunities({ category: resolvedParams.category }),
    listCategories()
  ])
  const matchedCategory = categories.find((category) => categoryMatches(category, resolvedParams.category)) || null

  if (!opportunities.length && !matchedCategory) {
    notFound()
  }

  const categoryName = opportunities[0]?.product.category || matchedCategory || resolvedParams.category
  const categoryLabel = getCategoryLabel(categoryName)
  const finalists = opportunities.slice(0, 3)
  const remainder = opportunities.slice(3, 9)
  const showdown = buildOfferShowdowns(opportunities, 1)
  const freshnessDate = getLatestOfferRefresh(opportunities)
  const freshCount = opportunities.filter((item) => item.isFresh).length
  const verifiedDiscountCount = opportunities.filter((item) => item.hasVerifiedDiscount).length
  const faqEntries = buildOfferFaqEntries({ scope: `${categoryLabel.toLowerCase()} offers`, categoryLabel })
  const categoryGuideHref = buildCategoryPath(categoryName)
  const categoryWaitHref = buildNewsletterPath({
    intent: 'category-brief',
    category: categoryName,
    cadence: 'weekly',
    returnTo: buildOffersPath(categoryName),
    returnLabel: `Resume ${categoryLabel} offers`,
    returnDescription: `Return to the ${categoryLabel.toLowerCase()} offers page when fresh affiliate opportunities are available again.`
  })
  const structuredData = [
    buildBreadcrumbSchema(buildOffersPath(categoryName), [
      { name: 'Home', path: '/' },
      { name: 'Offers', path: '/offers' },
      { name: categoryLabel, path: buildOffersPath(categoryName) }
    ]),
    buildCollectionPageSchema({
      path: buildOffersPath(categoryName),
      title: `${categoryLabel} Offers`,
      description: `Live ${categoryLabel.toLowerCase()} offers with timing guidance and a 3-pick recommendation layer.`,
      breadcrumbItems: [
        { name: 'Home', path: '/' },
        { name: 'Offers', path: '/offers' },
        { name: categoryLabel, path: buildOffersPath(categoryName) }
      ],
      dateModified: freshnessDate,
      items: opportunities.map((item) => ({
        name: item.product.productName,
        path: item.product.slug ? `/products/${item.product.slug}` : buildOffersPath(categoryName)
      }))
    }),
    buildHowToSchema(
      buildOffersPath(categoryName),
      `How to use ${categoryLabel} offers`,
      `Use this page to compare up to three ${categoryLabel.toLowerCase()} finalists, pick one winner, and decide whether the live timing is strong enough to buy now.`,
      [
        {
          name: 'Read the winner first',
          text: `Bes3 reduces the ${categoryLabel.toLowerCase()} recommendation layer to one winner and at most two alternatives.`
        },
        {
          name: 'Check the evidence behind the promotion',
          text: 'Verified discount percentages only appear when a reliable reference price exists. Otherwise the page falls back to timing language instead of invented savings labels.'
        },
        {
          name: 'Switch to a watch when timing is weak',
          text: 'If the tracked window still looks high, keep the same category on a watch instead of forcing the purchase from a discount headline.'
        }
      ]
    ),
    buildFaqSchema(buildOffersPath(categoryName), faqEntries)
  ]

  return (
    <PublicShell>
      <StructuredData data={structuredData} />
      <div className="space-y-14 px-4 py-14 sm:px-6 lg:px-8">
        <section className="mx-auto max-w-7xl rounded-[2.75rem] bg-[linear-gradient(135deg,#fff8ef_0%,#f8fbff_48%,#eefaf5_100%)] p-8 shadow-panel sm:p-10">
          <div className="grid gap-8 xl:grid-cols-[1.05fr_0.95fr] xl:items-end">
            <div>
              <p className="editorial-kicker">{categoryLabel}</p>
              <h1 className="mt-4 font-[var(--font-display)] text-5xl font-black tracking-tight text-foreground sm:text-6xl">
                {categoryLabel} offers with one clear winner.
              </h1>
              <p className="mt-4 max-w-3xl text-lg leading-8 text-muted-foreground">
                This page keeps the final recommendation layer small on purpose: at most three affiliate-eligible picks, one winner, and detailed pricing evidence instead of decision sprawl.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link href="/offers" className="rounded-full border border-border px-5 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-white">
                  Back to all offers
                </Link>
                <Link href={buildBiggestDiscountsPath()} className="rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground">
                  View biggest discounts
                </Link>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              {[
                { label: 'Finalists', value: String(finalists.length), note: '3 picks max in the recommendation layer.' },
                { label: 'Fresh', value: String(freshCount), note: 'Offers still inside the 72-hour window.' },
                { label: 'Verified discounts', value: String(verifiedDiscountCount), note: 'Only when a reliable reference price exists.' }
              ].map((item) => (
                <div key={item.label} className="rounded-[1.5rem] bg-white p-5">
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">{item.label}</p>
                  <p className="mt-3 text-3xl font-black text-foreground">{item.value}</p>
                  <p className="mt-2 text-sm leading-7 text-muted-foreground">{item.note}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {!opportunities.length ? (
          <>
            <section className="mx-auto max-w-7xl rounded-[2rem] bg-white p-8 shadow-panel">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">Best available now</p>
              <h2 className="mt-3 font-[var(--font-display)] text-4xl font-black tracking-tight text-foreground">
                No live {categoryLabel.toLowerCase()} offers are qualified right now.
              </h2>
              <p className="mt-4 max-w-3xl text-sm leading-7 text-muted-foreground">
                Bes3 does not fake a showdown when this category has no fresh affiliate-eligible opportunities. Use the category guide to keep researching, or save this category so a better timing window can bring you back.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link href={categoryWaitHref} className="rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground">
                  Start category updates
                </Link>
                <Link href={categoryGuideHref} className="rounded-full border border-border px-5 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-muted">
                  Open category guide
                </Link>
                <Link href="/offers" className="rounded-full border border-border px-5 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-muted">
                  Back to all offers
                </Link>
              </div>
            </section>

            <div className="mx-auto max-w-7xl">
              <OfferTransparencyPanel
                title={`How ${categoryLabel} promotions are explained`}
                description={`This page only shows a percentage discount when ${categoryLabel.toLowerCase()} pricing has a reliable fresh reference. When no live affiliate-eligible offers qualify, Bes3 falls back to category updates instead of pretending there is a winner.`}
              />
            </div>

            <div className="mx-auto max-w-7xl">
              <OfferTransparencyFaqSection title={`${categoryLabel} offer questions, answered clearly.`} entries={faqEntries} />
            </div>
          </>
        ) : null}

        {opportunities.length && showdown.length ? (
          <div className="mx-auto max-w-7xl">
            <OfferShowdownSection
              showdowns={showdown}
              title={`The ${categoryLabel} 3-way showdown.`}
              description="The winner is chosen from a maximum of three contenders using live price, discount credibility, tracked low distance, and freshness. Commission never acts as a ranking factor here."
            />
          </div>
        ) : null}

        {opportunities.length ? (
          <>
            <section className="mx-auto max-w-7xl space-y-8">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <p className="editorial-kicker">All Live Opportunities</p>
                  <h2 className="mt-3 font-[var(--font-display)] text-4xl font-black tracking-tight text-foreground">Everything still worth watching in {categoryLabel.toLowerCase()}.</h2>
                </div>
                <p className="max-w-2xl text-sm leading-7 text-muted-foreground">
                  The winner above reduces the final decision. The cards below keep the rest of the live market visible without expanding into an overwhelming endless list.
                </p>
              </div>
              <div className="grid gap-8 xl:grid-cols-2">
                {finalists.map((opportunity) => (
                  <OfferOpportunityCard key={opportunity.product.id} opportunity={opportunity} source="offers-category-card" />
                ))}
              </div>
              {remainder.length ? (
                <div className="grid gap-8 xl:grid-cols-2">
                  {remainder.map((opportunity) => (
                    <OfferOpportunityCard key={opportunity.product.id} opportunity={opportunity} source="offers-category-remainder" />
                  ))}
                </div>
              ) : null}
            </section>

            <div className="mx-auto max-w-7xl">
              <OfferTransparencyPanel
                title={`How ${categoryLabel} promotions are explained`}
                description={`This page only shows a percentage discount when ${categoryLabel.toLowerCase()} pricing has a reliable fresh reference. Otherwise Bes3 uses timing language and keeps the final recommendation to at most three picks.`}
              />
            </div>

            <div className="mx-auto max-w-7xl">
              <OfferTransparencyFaqSection title={`${categoryLabel} offer questions, answered clearly.`} entries={faqEntries} />
            </div>
          </>
        ) : null}
      </div>
    </PublicShell>
  )
}
