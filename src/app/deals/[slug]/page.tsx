import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { PurchaseDecisionCard } from '@/components/commerce/PurchaseDecisionCard'
import { PublicShell } from '@/components/layout/PublicShell'
import { HardcoreEvidenceMatrix } from '@/components/site/HardcoreEvidenceMatrix'
import { StructuredData } from '@/components/site/StructuredData'
import { getValueLandingPage } from '@/lib/hardcore'
import { getPriceAlertLabel } from '@/lib/hardcore-ops'
import { buildPageMetadata } from '@/lib/metadata'
import { buildValuePseoPath, getValuePseoStaticParams, normalizeValuePseoSlug, parseValuePseoSlug } from '@/lib/pseo'
import { buildEvidencePurchaseDecision } from '@/lib/purchase-decision'
import { getRequestLocale } from '@/lib/request-locale'
import { buildBreadcrumbSchema, buildCollectionPageSchema, buildFaqSchema, buildProductAggregateSchema } from '@/lib/structured-data'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export function generateStaticParams() {
  return getValuePseoStaticParams()
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const valueSlug = normalizeValuePseoSlug((await params).slug)
  const page = valueSlug ? await getValueLandingPage(valueSlug) : null
  if (!page) {
    return buildPageMetadata({
      title: 'Best Value Researching',
      description: 'This Bes3 value page is not ready yet.',
      path: '/deals',
      locale: await getRequestLocale(),
      robots: { index: false, follow: true }
    })
  }
  const priceAlertPrefix = page.products.some((product) => getPriceAlertLabel(product.price.entryStatus, product.consensus.score5))
    ? '[Price Drop Alert] '
    : ''
  const purchaseDecisions = page.products.slice(0, 3).map((product) =>
    buildEvidencePurchaseDecision(product, {
      pageType: 'deal',
      trackingSource: 'deal-decision-card',
      categoryHref: `/categories/${product.categorySlug}`,
      alternativeHref: `/categories/${product.categorySlug}`,
      userIntent: `${page.category.name} under $${page.priceLimit}`
    })
  )

  return buildPageMetadata({
    title: `${priceAlertPrefix}Best Value ${page.category.name} Under $${page.priceLimit}`,
    description: `Bes3 ranks ${page.category.name} under $${page.priceLimit} by teardown consensus score, current price, 90-day average, and historical low.`,
    path: buildValuePseoPath(page.category.slug, page.priceLimit),
    locale: await getRequestLocale(),
    robots: page.status === 'researching' ? { index: false, follow: true } : undefined,
    keywords: [`best value ${page.category.name}`, `${page.category.name} under ${page.priceLimit}`, 'teardown consensus']
  })
}

export default async function BestValuePage({ params }: { params: Promise<{ slug: string }> }) {
  const rawSlug = (await params).slug
  const parsedSlug = parseValuePseoSlug(rawSlug)
  if (rawSlug.startsWith('best-value-') && parsedSlug) {
    redirect(buildValuePseoPath(parsedSlug.categorySlug, parsedSlug.priceLimit))
  }
  const valueSlug = parsedSlug?.valueSlug || ''
  const page = valueSlug ? await getValueLandingPage(valueSlug) : null
  if (!page) notFound()
  const path = buildValuePseoPath(page.category.slug, page.priceLimit)
  const priceAlertPrefix = page.products.some((product) => getPriceAlertLabel(product.price.entryStatus, product.consensus.score5))
    ? '[Price Drop Alert] '
    : ''
  const purchaseDecisions = page.products.slice(0, 3).map((product) =>
    buildEvidencePurchaseDecision(product, {
      pageType: 'deal',
      trackingSource: 'deal-decision-card',
      categoryHref: `/categories/${product.categorySlug}`,
      alternativeHref: `/categories/${product.categorySlug}`,
      userIntent: `${page.category.name} under $${page.priceLimit}`
    })
  )
  const breadcrumbItems = [
    { name: 'Home', path: '/' },
    { name: 'Deals', path: '/deals' },
    { name: page.category.name, path: `/categories/${page.category.slug}` },
    { name: `Under $${page.priceLimit}`, path }
  ]
  const faqEntries = [
    {
      question: `How does Bes3 rank ${page.category.name} under $${page.priceLimit}?`,
      answer: 'Products are sorted by value score, which combines creator consensus score with current price. Products without enough price and evidence data stay behind fully scored options.'
    },
    {
      question: 'Why can a cheap product lose this page?',
      answer: 'A low price is not enough. Bes3 requires a weighted evidence score from creator tests before a product can rank as a best-value recommendation.'
    },
    {
      question: 'When does a price drop become an alert?',
      answer: 'The system flags stronger buy windows when current price reaches the historical low or falls more than 10% below the 90-day average.'
    }
  ]

  return (
    <PublicShell>
      <StructuredData
        data={[
          buildCollectionPageSchema({
            path,
            title: `${priceAlertPrefix}Best Value ${page.category.name} Under $${page.priceLimit}`,
            description: 'Ranked by value score: consensus score multiplied by 100 and divided by current price.',
            about: [
              { '@type': 'Thing', name: page.category.name },
              { '@type': 'Thing', name: 'price-value ranking' },
              { '@type': 'Thing', name: `under $${page.priceLimit}` }
            ],
            breadcrumbItems,
            items: page.products.map((product) => ({
              name: product.name,
              path: `/products/${product.slug}`
            }))
          }),
          ...page.products.slice(0, 10).map((product) =>
            buildProductAggregateSchema({
              path: `/products/${product.slug}`,
              name: product.name,
              description: `${product.name} is included in this best-value page using consensus score, current price, and 90-day price baselines.`,
              image: product.imageUrl,
              ratingValue: product.consensus.score5,
              reviewCount: product.consensus.evidenceCount,
              offerUrl: product.affiliateUrl ? `/go/${product.id}` : null,
              price: product.price.currentPrice,
              priceCurrency: product.price.currency,
              availabilityStatus: product.affiliateStatus
            })
          ),
          buildBreadcrumbSchema(path, breadcrumbItems),
          buildFaqSchema(path, faqEntries)
        ]}
      />
      <section className="px-4 py-14 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <p className="text-xs font-bold uppercase tracking-[0.28em] text-primary">Best Value</p>
          <h1 className="mt-4 max-w-5xl font-[var(--font-display)] text-5xl font-black tracking-tight sm:text-7xl">
            {priceAlertPrefix}Should you buy {page.category.name} under ${page.priceLimit} right now?
          </h1>
          <p className="mt-6 max-w-3xl text-lg leading-8 text-muted-foreground">
            The first screen ranks by buying action, not formula curiosity: buy now, compare first, watch price, or skip.
          </p>
        </div>
      </section>
      <section className="border-y border-border bg-slate-50 px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <p className="text-xs font-bold uppercase tracking-[0.28em] text-primary">Top 3 decision cards</p>
          <div className="mt-6 grid gap-5 lg:grid-cols-3">
            {purchaseDecisions.map((decision) => (
              <PurchaseDecisionCard key={decision.productId} decision={decision} className="h-full" />
            ))}
          </div>
        </div>
      </section>
      <HardcoreEvidenceMatrix products={page.products} emptyTitle={`Not enough ${page.category.name} under $${page.priceLimit} are fully scored yet.`} />
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
      <section className="px-4 pb-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl border-t border-border pt-8">
          <p className="text-xs font-bold uppercase tracking-[0.28em] text-primary">Related Evidence</p>
          <h2 className="mt-3 font-[var(--font-display)] text-3xl font-black tracking-tight">
            Looking beyond the under ${page.priceLimit} filter?
          </h2>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href={`/categories/${page.category.slug}`}
              className="rounded-md border border-border bg-white px-4 py-2 text-sm font-semibold text-muted-foreground hover:border-primary hover:text-primary"
            >
              Top {page.category.name} list
            </Link>
            <Link
              href="/products"
              className="rounded-md border border-border bg-white px-4 py-2 text-sm font-semibold text-muted-foreground hover:border-primary hover:text-primary"
            >
              Full evidence matrix
            </Link>
            <Link
              href="/deals"
              className="rounded-md border border-border bg-white px-4 py-2 text-sm font-semibold text-muted-foreground hover:border-primary hover:text-primary"
            >
              Best Value Lab
            </Link>
          </div>
        </div>
      </section>
    </PublicShell>
  )
}
