import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { PublicShell } from '@/components/layout/PublicShell'
import { HardcoreEvidenceMatrix } from '@/components/site/HardcoreEvidenceMatrix'
import { StructuredData } from '@/components/site/StructuredData'
import { getValueLandingPage } from '@/lib/hardcore'
import { getPriceAlertLabel } from '@/lib/hardcore-ops'
import { buildPageMetadata } from '@/lib/metadata'
import { getRequestLocale } from '@/lib/request-locale'
import { buildCollectionPageSchema, buildFaqSchema, buildProductAggregateSchema } from '@/lib/structured-data'

function normalizeValueSlug(slug: string) {
  if (slug.startsWith('best-value-')) return slug.slice('best-value-'.length)
  if (slug.startsWith('best-')) return slug.slice('best-'.length)
  return ''
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const valueSlug = normalizeValueSlug((await params).slug)
  const page = valueSlug ? await getValueLandingPage(valueSlug) : null
  if (!page) {
    return buildPageMetadata({
      title: 'Best Value Researching',
      description: 'This Bes3 value page is not ready yet.',
      path: '/deals',
      locale: getRequestLocale(),
      robots: { index: false, follow: true }
    })
  }
  const priceAlertPrefix = page.products.some((product) => getPriceAlertLabel(product.price.entryStatus, product.consensus.score5))
    ? '[Price Drop Alert] '
    : ''

  return buildPageMetadata({
    title: `${priceAlertPrefix}Best Value ${page.category.name} Under $${page.priceLimit}`,
    description: `Bes3 ranks ${page.category.name} under $${page.priceLimit} by teardown consensus score, current price, 90-day average, and historical low.`,
    path: `/deals/best-value-${page.category.slug}-under-${page.priceLimit}`,
    locale: getRequestLocale(),
    robots: page.status === 'researching' ? { index: false, follow: true } : undefined,
    keywords: [`best value ${page.category.name}`, `${page.category.name} under ${page.priceLimit}`, 'teardown consensus']
  })
}

export default async function BestValuePage({ params }: { params: Promise<{ slug: string }> }) {
  const valueSlug = normalizeValueSlug((await params).slug)
  const page = valueSlug ? await getValueLandingPage(valueSlug) : null
  if (!page) notFound()
  const path = `/deals/best-value-${page.category.slug}-under-${page.priceLimit}`
  const priceAlertPrefix = page.products.some((product) => getPriceAlertLabel(product.price.entryStatus, product.consensus.score5))
    ? '[Price Drop Alert] '
    : ''
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
          buildFaqSchema(path, faqEntries)
        ]}
      />
      <section className="px-4 py-14 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <p className="text-xs font-bold uppercase tracking-[0.28em] text-primary">Best Value</p>
          <h1 className="mt-4 max-w-5xl font-[var(--font-display)] text-5xl font-black tracking-tight sm:text-7xl">
            {priceAlertPrefix}Best value {page.category.name} under ${page.priceLimit}.
          </h1>
          <p className="mt-6 max-w-3xl text-lg leading-8 text-muted-foreground">
            Formula: value score equals consensus score times 100 divided by current price. Pages stay in researching mode until enough products have both evidence and price baselines.
          </p>
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
    </PublicShell>
  )
}
