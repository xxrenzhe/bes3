import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { PublicShell } from '@/components/layout/PublicShell'
import { PriceValueBadge } from '@/components/site/PriceValueBadge'
import { PriceAlertForm } from '@/components/site/PriceAlertForm'
import { EvidenceFeedbackButtons } from '@/components/site/EvidenceFeedbackButtons'
import { StructuredData } from '@/components/site/StructuredData'
import { formatHardcorePrice, getHardcoreProductBySlug } from '@/lib/hardcore'
import { buildPageMetadata } from '@/lib/metadata'
import { getRequestLocale } from '@/lib/request-locale'
import { buildBreadcrumbSchema, buildFaqSchema } from '@/lib/structured-data'
import { toAbsoluteUrl } from '@/lib/site-url'

function formatScore(value: number | null) {
  return value == null ? 'Researching' : `${value.toFixed(1)}/10`
}

function timestampUrl(youtubeId: string | null, seconds: number | null) {
  if (!youtubeId) return null
  return `https://www.youtube.com/watch?v=${youtubeId}${seconds ? `&t=${seconds}s` : ''}`
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const product = await getHardcoreProductBySlug((await params).slug)
  if (!product) {
    return buildPageMetadata({
      title: 'Product Researching',
      description: 'This Bes3 product is not available in the public ratings system yet.',
      path: '/products',
      locale: getRequestLocale(),
      robots: { index: false, follow: true }
    })
  }

  return buildPageMetadata({
    title: `${product.name} Evidence Report`,
    description: `${product.name} scored from teardown evidence, scenario tags, affiliate link health, and price-value timing.`,
    path: `/products/${product.slug}`,
    locale: getRequestLocale(),
    robots: product.consensus.evidenceCount === 0 ? { index: false, follow: true } : undefined,
    image: product.imageUrl,
    category: product.categoryName,
    keywords: [product.name, product.categoryName, 'teardown evidence', 'consensus score']
  })
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const product = await getHardcoreProductBySlug((await params).slug)
  if (!product) notFound()
  const path = `/products/${product.slug}`
  const faqEntries = [
    {
      question: 'Why might the score still be researching?',
      answer: 'Bes3 needs exact product matching, enough review evidence, use-case coverage, and trustworthy quotes before making a confident claim.'
    },
    {
      question: 'Does commission change the score?',
      answer: 'No. A store link only makes a product purchasable from the page. The score comes from review quality, evidence confidence, and rating consistency.'
    }
  ]

  return (
    <PublicShell>
      <StructuredData
        data={[
          buildBreadcrumbSchema(path, [
            { name: 'Home', path: '/' },
            { name: product.categoryName, path: `/categories/${product.categorySlug}` },
            { name: product.name, path }
          ]),
          {
            '@context': 'https://schema.org',
            '@type': 'Product',
            '@id': `${toAbsoluteUrl(path)}#product`,
            name: product.name,
            brand: product.brand ? { '@type': 'Brand', name: product.brand } : undefined,
            image: product.imageUrl ? [toAbsoluteUrl(product.imageUrl)] : undefined,
            description: product.description || `${product.name} evidence report from Bes3.`,
            aggregateRating:
              product.consensus.score10 != null
                ? {
                    '@type': 'AggregateRating',
                    ratingValue: product.consensus.score5?.toFixed(1),
                    reviewCount: product.consensus.evidenceCount,
                    bestRating: '5',
                    worstRating: '1'
                  }
                : undefined,
            offers:
              product.price.currentPrice != null
                ? {
                    '@type': 'Offer',
                    url: toAbsoluteUrl(product.affiliateUrl ? `/go/${product.id}` : path),
                    price: product.price.currentPrice.toFixed(2),
                    priceCurrency: product.price.currency,
                    availability:
                      product.affiliateStatus === 'out_of_stock'
                        ? 'https://schema.org/OutOfStock'
                        : product.affiliateStatus === 'broken'
                          ? 'https://schema.org/Discontinued'
                          : 'https://schema.org/InStock'
                  }
                : undefined
          },
          buildFaqSchema(path, faqEntries)
        ]}
      />
      <section className="border-b border-border bg-white px-4 py-14 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[1fr_0.75fr]">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.28em] text-primary">Evidence Report</p>
            <h1 className="mt-4 max-w-5xl font-[var(--font-display)] text-5xl font-black tracking-tight sm:text-7xl">
              {product.brand ? `${product.brand} ` : ''}
              {product.name}
            </h1>
            <p className="mt-6 max-w-3xl text-lg leading-8 text-muted-foreground">
              {product.description || 'This product is in the public catalog, but the full review summary is still being built from source material.'}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href={`/categories/${product.categorySlug}`} className="rounded-md border border-border bg-white px-4 py-2 text-sm font-semibold hover:border-primary hover:text-primary">
                Back to {product.categoryName}
              </Link>
              {product.affiliateUrl && product.affiliateStatus !== 'out_of_stock' && product.affiliateStatus !== 'broken' ? (
                <a href={`/go/${product.id}`} className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
                  Check price
                </a>
              ) : null}
            </div>
          </div>
          <div className="rounded-md border border-border bg-slate-50 p-6">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-muted-foreground">Current verdict</p>
            <p className="mt-4 font-mono text-5xl font-black">{formatScore(product.consensus.score10)}</p>
            <p className="mt-2 text-sm text-muted-foreground">
              {product.consensus.confidence} confidence from {product.consensus.evidenceCount} evidence reports.
            </p>
            <div className="mt-5">
              <PriceValueBadge price={product.price} />
            </div>
            <p className="mt-4 text-xs leading-6 text-muted-foreground">
              Current {formatHardcorePrice(product.price.currentPrice, product.price.currency)} | Historical low{' '}
              {formatHardcorePrice(product.price.histLowPrice, product.price.currency)} | 90-day avg{' '}
              {formatHardcorePrice(product.price.avg90dPrice, product.price.currency)}
            </p>
            <PriceAlertForm
              productId={product.id}
              targetPrice={product.price.histLowPrice}
              targetValueScore={product.price.valueScore}
            />
          </div>
        </div>
      </section>

      <section className="px-4 py-14 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <p className="text-xs font-bold uppercase tracking-[0.28em] text-primary">Scenario Evidence</p>
          <h2 className="mt-3 max-w-4xl font-[var(--font-display)] text-4xl font-black tracking-tight">
            What creators actually tested.
          </h2>
          <div className="mt-8 grid gap-5 lg:grid-cols-2">
            {product.evidence.length ? (
              product.evidence.map((report) => {
                const url = timestampUrl(report.youtubeId, report.timestampSeconds)
                return (
                  <article key={report.id} className="rounded-md border border-border bg-white p-6">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-md bg-slate-950 px-2 py-1 text-xs font-semibold text-white">{report.rating}</span>
                      <span className="rounded-md bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-900">{report.tagName}</span>
                      {report.isAdvertorial ? <span className="rounded-md bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-900">Advertorial penalty</span> : null}
                    </div>
                    <blockquote className="mt-4 border-l-2 border-primary pl-4 text-sm leading-7 text-muted-foreground">{report.evidenceQuote}</blockquote>
                    {report.contextSnippet ? <p className="mt-3 text-xs leading-6 text-muted-foreground">Context: {report.contextSnippet}</p> : null}
                    <p className="mt-4 text-sm font-semibold">
                      {url ? (
                        <a href={url} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                          Review by {report.channelName}
                        </a>
                      ) : (
                        `Review by ${report.channelName}`
                      )}
                    </p>
                    <EvidenceFeedbackButtons analysisReportId={report.id} />
                  </article>
                )
              })
            ) : (
              <div className="rounded-md border border-border bg-white p-6">
                <p className="font-semibold">No source quote has cleared validation yet.</p>
                <p className="mt-3 text-sm leading-7 text-muted-foreground">
                  A product page can exist before the score is ready. Bes3 keeps it visible but blocks false winner claims until evidence is attached.
                </p>
              </div>
            )}
          </div>
        </div>
      </section>
    </PublicShell>
  )
}
