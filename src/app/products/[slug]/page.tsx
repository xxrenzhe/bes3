import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { PublicShell } from '@/components/layout/PublicShell'
import { PriceValueBadge } from '@/components/site/PriceValueBadge'
import { PriceAlertForm } from '@/components/site/PriceAlertForm'
import { EvidenceFeedbackButtons } from '@/components/site/EvidenceFeedbackButtons'
import { PrimaryCta } from '@/components/site/PrimaryCta'
import { PriceTrendSparkline } from '@/components/site/PriceTrendSparkline'
import { StructuredData } from '@/components/site/StructuredData'
import { buildProductDecisionContent } from '@/lib/decision-content'
import { formatEditorialDate, getFreshnessLabel } from '@/lib/editorial'
import { formatHardcorePrice, getHardcoreProductBySlug, listHardcoreProducts } from '@/lib/hardcore'
import { buildIntentMetadataDescription, buildPageMetadata } from '@/lib/metadata'
import { buildMerchantExitPath, hasMerchantExitTarget } from '@/lib/merchant-links'
import { getRequestLocale } from '@/lib/request-locale'
import { buildBreadcrumbSchema, buildFaqSchema, buildProductAggregateSchema } from '@/lib/structured-data'
import {
  getBrandPolicyBySlug,
  getBrandSlug,
  getOpenCommerceProductBySlug,
  listBrandCompatibilityFacts,
  listProductAttributeFacts,
  listProductOffers,
  listProductPriceHistory
} from '@/lib/site-data'
import { formatPriceSnapshot } from '@/lib/utils'

export const dynamic = 'force-dynamic'
export const revalidate = 0

function formatScore(value: number | null) {
  return value == null ? 'Researching' : `${value.toFixed(1)}/10`
}

function timestampUrl(youtubeId: string | null, seconds: number | null) {
  if (!youtubeId) return null
  return `https://www.youtube.com/watch?v=${youtubeId}${seconds ? `&t=${seconds}s` : ''}`
}

async function CommerceProductPage({ slug }: { slug: string }) {
  const product = await getOpenCommerceProductBySlug(slug)
  if (!product) notFound()

  const brandSlug = getBrandSlug(product.brand)
  const [attributeFacts, offers, priceHistory, brandPolicy, compatibilityFacts] = await Promise.all([
    listProductAttributeFacts(product.id, 12),
    listProductOffers(product.id),
    listProductPriceHistory(product.id),
    brandSlug ? getBrandPolicyBySlug(brandSlug) : Promise.resolve(null),
    brandSlug ? listBrandCompatibilityFacts(brandSlug, { category: product.category || undefined, limit: 6 }) : Promise.resolve([])
  ])
  const bestOffer = product.bestOffer || offers[0] || null
  const path = `/products/${product.slug}`
  const merchantHref = hasMerchantExitTarget(product) ? buildMerchantExitPath(product.id, 'product-detail') : null
  const decisionModules = buildProductDecisionContent(product, 'product', {
    nextStepTitle: 'Choose the next action from current evidence',
    nextStepDescription: 'Open the merchant only after the price, attributes, and fit notes match what you need.'
  })
  const breadcrumbItems = [
    { name: 'Home', path: '/' },
    { name: 'Products', path: '/products' },
    { name: product.productName, path }
  ]
  const faqEntries = [
    {
      question: `Is ${product.productName} ready to buy from this page?`,
      answer: bestOffer
        ? 'Use this page to confirm the current offer, product attributes, freshness, and merchant handoff before checkout.'
        : 'Bes3 has a product record, but no active offer is attached yet, so use it for research rather than checkout.'
    },
    {
      question: 'Does Bes3 change recommendations for affiliate commission?',
      answer: 'No. Affiliate links only make a product purchasable from Bes3. The page keeps price, evidence, and freshness signals visible so the decision can be audited.'
    }
  ]

  return (
    <PublicShell>
      <StructuredData
        data={[
          buildBreadcrumbSchema(path, breadcrumbItems),
          buildProductAggregateSchema({
            path,
            name: product.productName,
            description: product.description || `${product.productName} product brief from Bes3.`,
            image: product.heroImageUrl,
            ratingValue: product.rating,
            reviewCount: product.reviewCount,
            offerUrl: merchantHref,
            price: bestOffer?.priceAmount || product.priceAmount,
            priceCurrency: bestOffer?.priceCurrency || product.priceCurrency,
            availabilityStatus: bestOffer?.availabilityStatus
          }),
          buildFaqSchema(path, faqEntries)
        ]}
      />
      <section className="border-b border-border bg-white px-4 py-14 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[1fr_0.72fr] lg:items-start">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.28em] text-primary">Product Brief</p>
            <h1 className="mt-4 max-w-5xl font-[var(--font-display)] text-5xl font-black tracking-tight sm:text-7xl">
              {product.productName}
            </h1>
            <p className="mt-6 max-w-3xl text-lg leading-8 text-muted-foreground">
              {product.description || 'Bes3 is tracking this product with offer, attribute, freshness, and merchant handoff context.'}
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-3 text-sm font-semibold text-muted-foreground">
              {product.brand ? <span>{product.brand}</span> : null}
              {product.category ? <span>{product.category}</span> : null}
              <span>{getFreshnessLabel(product.offerLastCheckedAt || product.priceLastCheckedAt || product.updatedAt)}</span>
            </div>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/products" className="rounded-md border border-border bg-white px-4 py-2 text-sm font-semibold hover:border-primary hover:text-primary">
                Back to products
              </Link>
              <Link href={`/api/open/commerce/products/${product.id}`} className="rounded-md border border-border bg-white px-4 py-2 text-sm font-semibold hover:border-primary hover:text-primary">
                Open machine payload
              </Link>
            </div>
          </div>
          <div className="rounded-md border border-border bg-slate-50 p-6">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-muted-foreground">Current offer</p>
            <p className="mt-4 font-mono text-5xl font-black">
              {formatPriceSnapshot(bestOffer?.priceAmount || product.priceAmount, bestOffer?.priceCurrency || product.priceCurrency || 'USD')}
            </p>
            <p className="mt-3 text-sm leading-7 text-muted-foreground">
              {bestOffer?.merchantName ? `${bestOffer.merchantName} offer` : 'Merchant offer'} · checked {formatEditorialDate(bestOffer?.lastCheckedAt || product.offerLastCheckedAt || product.updatedAt, 'Tracking soon')}.
            </p>
            <div className="mt-6">
              <PrimaryCta
                href={merchantHref}
                productId={product.id}
                trackingSource="product-detail"
                note="Verify live price, stock, shipping, and promotion terms on the merchant page before ordering."
                trustBadge={`${product.evidenceCount} product facts tracked by Bes3`}
              />
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 py-14 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[0.82fr_1.18fr]">
          <PriceTrendSparkline
            priceHistory={priceHistory}
            fallbackPrice={bestOffer?.priceAmount || product.priceAmount}
            fallbackCurrency={bestOffer?.priceCurrency || product.priceCurrency}
          />
          <div className="rounded-md border border-border bg-white p-6">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-primary">Decision Notes</p>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              {decisionModules.map((module) => (
                <article key={module.id} className="rounded-md bg-slate-50 p-4">
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">{module.eyebrow}</p>
                  <h2 className="mt-2 text-lg font-black tracking-tight">{module.title}</h2>
                  <ul className="mt-3 space-y-2 text-sm leading-6 text-muted-foreground">
                    {module.items.map((item) => <li key={item}>{item}</li>)}
                  </ul>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-border bg-slate-50 px-4 py-14 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-2">
          <div className="rounded-md border border-border bg-white p-6">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-primary">Product Facts</p>
            <div className="mt-5 divide-y divide-border">
              {attributeFacts.length ? attributeFacts.map((fact) => (
                <div key={fact.id} className="grid gap-2 py-3 text-sm sm:grid-cols-[0.38fr_0.62fr]">
                  <span className="font-semibold text-foreground">{fact.attributeLabel}</span>
                  <span className="text-muted-foreground">{fact.attributeValue}</span>
                </div>
              )) : (
                <p className="text-sm leading-7 text-muted-foreground">Product facts are still being enriched for this item.</p>
              )}
            </div>
          </div>
          <div className="rounded-md border border-border bg-white p-6">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-primary">Brand Context</p>
            <div className="mt-5 space-y-4 text-sm leading-7 text-muted-foreground">
              {brandPolicy ? (
                <>
                  {brandPolicy.shippingPolicy ? <p><span className="font-semibold text-foreground">Shipping:</span> {brandPolicy.shippingPolicy}</p> : null}
                  {brandPolicy.returnPolicy ? <p><span className="font-semibold text-foreground">Returns:</span> {brandPolicy.returnPolicy}</p> : null}
                  {brandPolicy.warrantyPolicy ? <p><span className="font-semibold text-foreground">Warranty:</span> {brandPolicy.warrantyPolicy}</p> : null}
                </>
              ) : (
                <p>Brand policy details are not verified yet.</p>
              )}
              {compatibilityFacts.slice(0, 4).map((fact) => (
                <p key={fact.id}><span className="font-semibold text-foreground">{fact.factLabel}:</span> {fact.factValue}</p>
              ))}
            </div>
          </div>
        </div>
      </section>
    </PublicShell>
  )
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const slug = (await params).slug
  const product = await getHardcoreProductBySlug(slug)
  if (!product) {
    const commerceProduct = await getOpenCommerceProductBySlug(slug)
    if (commerceProduct) {
      return buildPageMetadata({
        title: `${commerceProduct.productName} Product Brief`,
        description: buildIntentMetadataDescription({
          title: commerceProduct.productName,
          description: commerceProduct.description || `${commerceProduct.productName} product brief with offer, price, and buyer-fit context.`,
          pageType: 'product'
        }),
        path: `/products/${commerceProduct.slug}`,
        locale: await getRequestLocale(),
        image: commerceProduct.heroImageUrl,
        category: commerceProduct.category || undefined,
        freshnessDate: commerceProduct.updatedAt || commerceProduct.priceLastCheckedAt || commerceProduct.offerLastCheckedAt,
        keywords: [
          commerceProduct.productName,
          commerceProduct.brand || '',
          commerceProduct.category || '',
          'product brief',
          'price check'
        ].filter(Boolean)
      })
    }

    return buildPageMetadata({
      title: 'Product Researching',
      description: 'This Bes3 product is not available in the public ratings system yet.',
      path: '/products',
      locale: await getRequestLocale(),
      robots: { index: false, follow: true }
    })
  }

  return buildPageMetadata({
    title: `${product.name} Evidence Report`,
    description: `${product.name} scored from teardown evidence, scenario tags, affiliate link health, and price-value timing.`,
    path: `/products/${product.slug}`,
    locale: await getRequestLocale(),
    robots: product.consensus.evidenceCount === 0 ? { index: false, follow: true } : undefined,
    image: product.imageUrl,
    category: product.categoryName,
    keywords: [product.name, product.categoryName, 'teardown evidence', 'consensus score']
  })
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const slug = (await params).slug
  const products = await listHardcoreProducts()
  const product = products.find((item) => item.slug === slug) || null
  if (!product) return <CommerceProductPage slug={slug} />
  const path = `/products/${product.slug}`
  const hasCommissionableExit = Boolean(
    product.affiliateUrl &&
    product.affiliateStatus !== 'out_of_stock' &&
    product.affiliateStatus !== 'broken'
  )
  const monetizedAlternatives = hasCommissionableExit
    ? []
    : products
        .filter((item) =>
          item.id !== product.id &&
          item.categorySlug === product.categorySlug &&
          item.affiliateUrl &&
          item.affiliateStatus !== 'out_of_stock' &&
          item.affiliateStatus !== 'broken'
        )
        .slice(0, 3)
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
          buildProductAggregateSchema({
            path,
            name: product.name,
            description: product.description || `${product.name} evidence report from Bes3.`,
            image: product.imageUrl,
            ratingValue: product.consensus.score5,
            reviewCount: product.consensus.evidenceCount,
            offerUrl: product.affiliateUrl ? `/go/${product.id}` : null,
            price: product.price.currentPrice,
            priceCurrency: product.price.currency,
            availabilityStatus: product.affiliateStatus
          }),
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
              {hasCommissionableExit ? (
                <a href={`/go/${product.id}`} className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
                  Check price
                </a>
              ) : null}
            </div>
            {!hasCommissionableExit ? (
              <div className="mt-6 max-w-3xl rounded-md border border-amber-200 bg-amber-50 p-4">
                <p className="text-sm font-black text-amber-950">Evidence-ready, not monetization-ready.</p>
                <p className="mt-2 text-sm leading-7 text-amber-900">
                  Bes3 found usable review evidence for this exact product, but it is not showing a purchase button because no verified commissionable merchant link is attached yet.
                </p>
              </div>
            ) : null}
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
            {!hasCommissionableExit ? (
              <div className="mt-5 rounded-md border border-border bg-white p-4">
                <p className="text-xs font-bold uppercase tracking-[0.22em] text-primary">Buying path</p>
                <p className="mt-2 text-sm leading-7 text-muted-foreground">
                  No outbound store handoff is available for this item until a real affiliate URL is verified.
                </p>
                {monetizedAlternatives.length ? (
                  <div className="mt-4 space-y-3">
                    <p className="text-sm font-semibold">Commissionable alternatives in {product.categoryName}</p>
                    {monetizedAlternatives.map((alternative) => (
                      <div key={alternative.id} className="rounded-md bg-slate-50 p-3">
                        <Link href={`/products/${alternative.slug}`} className="block text-sm font-semibold text-foreground hover:text-primary">
                          {alternative.brand ? `${alternative.brand} ` : ''}{alternative.name}
                        </Link>
                        <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                          <span>{formatScore(alternative.consensus.score10)}</span>
                          <span>{alternative.consensus.evidenceCount} evidence reports</span>
                          <a href={`/go/${alternative.id}`} className="font-semibold text-primary hover:underline">
                            Check affiliate price
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <Link href={`/categories/${product.categorySlug}`} className="mt-4 inline-flex rounded-md border border-border px-3 py-2 text-sm font-semibold hover:border-primary hover:text-primary">
                    Browse category research
                  </Link>
                )}
              </div>
            ) : null}
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
