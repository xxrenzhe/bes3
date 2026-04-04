import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { PrimaryCta } from '@/components/site/PrimaryCta'
import { PublicShell } from '@/components/layout/PublicShell'
import { ShortlistActionBar } from '@/components/site/ShortlistActionBar'
import { StructuredData } from '@/components/site/StructuredData'
import { getArticlePath } from '@/lib/article-path'
import { normalizeEditorialHtml } from '@/lib/editorial-html'
import { buildBestFor, buildConfidenceSignals, buildNotFor, formatEditorialDate, getFreshnessLabel, getSnapshotDate } from '@/lib/editorial'
import { buildPageMetadata, pickMetadataDescription } from '@/lib/metadata'
import { buildMerchantExitPath } from '@/lib/merchant-links'
import { toAbsoluteUrl } from '@/lib/site-url'
import { buildBreadcrumbSchema, buildHowToSchema, buildProductSchema, buildWebPageSchema } from '@/lib/structured-data'
import { toShortlistItem } from '@/lib/shortlist'
import { getProductBySlug, listPublishedArticles } from '@/lib/site-data'
import { formatPriceSnapshot } from '@/lib/utils'

function getCategoryLabelValue(category: string | null) {
  return category ? category.replace(/-/g, ' ') : ''
}

export async function generateMetadata({
  params
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const slug = (await params).slug
  const product = await getProductBySlug(slug)

  if (!product) {
    return buildPageMetadata({
      title: 'Product Not Found',
      description: 'This Bes3 product deep-dive is unavailable.',
      path: `/products/${slug}`,
      robots: {
        index: false,
        follow: false
      }
    })
  }

  const articles = await listPublishedArticles()
  const reviewArticle = articles.find((article) => article.productId === product.id && article.type === 'review') || null
  const freshnessDate = reviewArticle?.updatedAt || reviewArticle?.publishedAt || reviewArticle?.createdAt || product.updatedAt || product.publishedAt
  const category = getCategoryLabelValue(product.category)

  return buildPageMetadata({
    title: product.productName,
    description:
      pickMetadataDescription(reviewArticle?.seoDescription, reviewArticle?.summary, product.description) ||
      `${product.productName} on Bes3 includes specs, shortlist context, and buyer-fit notes before you click out to a merchant.`,
    path: `/products/${product.slug}`,
    image: product.heroImageUrl || reviewArticle?.heroImageUrl,
    category: category || undefined,
    freshnessDate,
    freshnessInTitle: true,
    keywords: [product.productName, product.brand || '', category, 'product review', 'buying guide'].filter(Boolean)
  })
}

export default async function ProductPage({
  params
}: {
  params: Promise<{ slug: string }>
}) {
  const product = await getProductBySlug((await params).slug)
  if (!product) notFound()

  const articles = await listPublishedArticles()
  const reviewArticle = articles.find((article) => article.productId === product.id && article.type === 'review') || null
  const comparisonArticle = articles.find((article) => article.productId === product.id && article.type === 'comparison') || null
  const heroImageUrl = product.heroImageUrl || reviewArticle?.heroImageUrl || null
  const specs = Object.entries(product.specs).slice(0, 6)
  const snapshotDate = getSnapshotDate(reviewArticle, product)
  const confidenceSignals = buildConfidenceSignals(product)
  const shortlistItem = toShortlistItem(product)
  const categoryLabel = product.category ? product.category.replace(/-/g, ' ') : 'this category'
  const path = `/products/${product.slug}`
  const productDescription =
    pickMetadataDescription(reviewArticle?.seoDescription, reviewArticle?.summary, product.description) ||
    `${product.productName} on Bes3 includes specs, shortlist context, and buyer-fit notes before you click out to a merchant.`
  const breadcrumbItems = [
    { name: 'Home', path: '/' },
    { name: product.category ? product.category.replace(/-/g, ' ') : 'Directory', path: product.category ? `/categories/${product.category}` : '/directory' },
    { name: product.productName, path }
  ]
  const howToSteps = [
    {
      name: 'Check the product fit',
      text: 'Start with the freshness, best-for, and skip-if signals on this page before price influences the decision.'
    },
    {
      name: 'Validate the verdict',
      text: reviewArticle
        ? 'Open the full review when you need deeper buyer-fit context before you save or click through.'
        : 'Use the product facts and confidence signals here to decide whether the product deserves a place on the shortlist.'
    },
    {
      name: 'Compare or watch the lane',
      text: `If the product looks plausible but not final, move into ${categoryLabel} comparisons or price-watch flows instead of restarting research.`
    }
  ]
  const structuredData = [
    buildBreadcrumbSchema(path, breadcrumbItems),
    buildWebPageSchema({
      path,
      title: product.productName,
      description: productDescription,
      image: heroImageUrl,
      breadcrumbItems,
      datePublished: product.publishedAt || reviewArticle?.publishedAt || reviewArticle?.createdAt || null,
      dateModified: snapshotDate,
      about: product.category
        ? {
            '@type': 'Thing',
            name: categoryLabel
          }
        : undefined,
      mainEntity: {
        '@id': `${toAbsoluteUrl(path)}#product`
      }
    }),
    buildProductSchema(product, path, productDescription, heroImageUrl),
    buildHowToSchema(path, `How to use ${product.productName} on Bes3`, 'Use the product page to validate fit, pressure-test the verdict, and choose the cleanest next move.', howToSteps)
  ]
  const nextMoves = [
    reviewArticle
      ? {
          eyebrow: 'Validate',
          title: 'Read the full verdict',
          description: 'Use the full review when you want the strongest buyer-fit read before you save or click through.',
          href: getArticlePath(reviewArticle.type, reviewArticle.slug),
          label: 'Open review verdict'
        }
      : null,
    comparisonArticle
      ? {
          eyebrow: 'Compare',
          title: 'See close alternatives',
          description: 'Open the comparison once this product is good enough to become a finalist against nearby substitutes.',
          href: getArticlePath(comparisonArticle.type, comparisonArticle.slug),
          label: 'Open comparison'
        }
      : null,
    {
      eyebrow: 'Watch',
      title: `Track ${categoryLabel}`,
      description: 'If you are not ready to buy yet, turn this product interest into a category-level watch instead of losing the thread.',
      href: `/newsletter?intent=price-alert&category=${encodeURIComponent(product.category || '')}&cadence=priority`,
      label: 'Start a price watch'
    },
    {
      eyebrow: 'Explore',
      title: 'Go back to the lane',
      description: 'Return to the category hub if you still need Bes3 to narrow the field before comparing or checking price.',
      href: product.category ? `/categories/${product.category}` : '/directory',
      label: 'Browse category hub'
    }
  ].filter(Boolean) as Array<{
    eyebrow: string
    title: string
    description: string
    href: string
    label: string
  }>

  return (
    <PublicShell>
      <StructuredData data={structuredData} />
      <div className="mx-auto max-w-7xl space-y-14 px-4 py-14 sm:px-6 lg:px-8">
        <section className="space-y-8">
          <nav className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
            <Link href="/" className="transition-colors hover:text-primary">Home</Link>
            <span>/</span>
            <Link href={product.category ? `/categories/${product.category}` : '/directory'} className="transition-colors hover:text-primary">
              {product.category ? product.category.replace(/-/g, ' ') : 'Products'}
            </Link>
            <span>/</span>
            <span className="text-foreground">{product.productName}</span>
          </nav>

          <div className="grid gap-10 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="space-y-6">
              <p className="editorial-kicker">Independent Product Deep-Dive</p>
              <h1 className="font-[var(--font-display)] text-5xl font-black tracking-tight text-balance sm:text-6xl">
                {product.productName}
              </h1>
              <p className="max-w-3xl text-lg leading-8 text-muted-foreground">
                {reviewArticle?.summary || product.description || `${product.productName} is part of the current Bes3 shortlist and this page captures the product facts, price context, and deep-dive notes that matter before you buy.`}
              </p>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-[1.5rem] bg-white p-5 shadow-panel">
                  <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground">Review freshness</p>
                  <p className="mt-2 text-lg font-black text-foreground">{formatEditorialDate(snapshotDate)}</p>
                  <p className="mt-2 text-sm leading-7 text-muted-foreground">{getFreshnessLabel(snapshotDate)}</p>
                </div>
                <div className="rounded-[1.5rem] bg-white p-5 shadow-panel">
                  <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground">Best for</p>
                  <p className="mt-2 text-sm leading-7 text-muted-foreground">{buildBestFor(product, 'product')}</p>
                </div>
                <div className="rounded-[1.5rem] bg-white p-5 shadow-panel">
                  <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground">Skip if</p>
                  <p className="mt-2 text-sm leading-7 text-muted-foreground">{buildNotFor(product, 'product')}</p>
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-[1.5rem] bg-white p-5 shadow-panel">
                  <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground">Current Price</p>
                  <p className="mt-2 text-2xl font-black text-foreground">{formatPriceSnapshot(product.priceAmount, product.priceCurrency || 'USD')}</p>
                </div>
                <div className="rounded-[1.5rem] bg-white p-5 shadow-panel">
                  <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground">Rating</p>
                  <p className="mt-2 text-2xl font-black text-foreground">{product.rating ? `${product.rating.toFixed(1)} / 5` : 'N/A'}</p>
                </div>
                <div className="rounded-[1.5rem] bg-white p-5 shadow-panel">
                  <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground">Reviews</p>
                  <p className="mt-2 text-2xl font-black text-foreground">{product.reviewCount ? product.reviewCount.toLocaleString() : 'N/A'}</p>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="overflow-hidden rounded-[2rem] bg-[linear-gradient(135deg,#e5eeff,#dfe9fa)] shadow-panel">
                <div className="relative aspect-[4/3]">
                  {heroImageUrl ? (
                    <Image
                      src={heroImageUrl}
                      alt={product.productName}
                      fill
                      sizes="(max-width: 1024px) 100vw, 40vw"
                      className="object-cover"
                    />
                  ) : (
                    <div className="bg-grid absolute inset-0" />
                  )}
                </div>
              </div>
              <div className="rounded-[2rem] bg-white p-6 shadow-panel">
                <ShortlistActionBar item={shortlistItem} className="mb-5" source="product-page" />
                <PrimaryCta
                  href={product.resolvedUrl ? buildMerchantExitPath(product.id, 'product-page-primary-cta') : null}
                  productId={product.id}
                  trackingSource="product-page-primary-cta"
                  label="Check Current Price"
                  note={`Confidence signals: ${confidenceSignals.join(' · ')}`}
                />
              </div>
              <div className="rounded-[2rem] bg-[linear-gradient(135deg,#fff8ef_0%,#f8fbff_48%,#eefaf5_100%)] p-6 shadow-panel">
                <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-primary">Next Best Move</p>
                <h2 className="mt-3 font-[var(--font-display)] text-2xl font-black tracking-tight text-foreground">Keep the decision chain intact.</h2>
                <p className="mt-3 text-sm leading-7 text-muted-foreground">
                  This product page should not be a dead end. Use the next route that matches your buying stage: validate, compare, or switch to a watch flow.
                </p>
                <div className="mt-5 grid gap-3">
                  {nextMoves.map((move) => (
                    <Link key={move.title} href={move.href} className="rounded-[1.25rem] bg-white/80 px-4 py-4 shadow-[0_20px_45px_-35px_rgba(15,23,42,0.45)] transition-transform hover:-translate-y-0.5">
                      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">{move.eyebrow}</p>
                      <p className="mt-2 text-base font-semibold text-foreground">{move.title}</p>
                      <p className="mt-2 text-sm leading-7 text-muted-foreground">{move.description}</p>
                      <p className="mt-3 text-sm font-semibold text-primary">{move.label} →</p>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="space-y-8">
            <div className="rounded-[2rem] bg-white p-8 shadow-panel">
              <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-primary">What stands out</p>
              <div className="mt-5 space-y-4">
                {(product.reviewHighlights.length ? product.reviewHighlights : ['Strong buyer confidence', 'Useful value proposition', 'Worth shortlisting']).map((item) => (
                  <div key={item} className="flex items-start gap-3 text-sm leading-7 text-muted-foreground">
                    <span className="mt-2 flex h-2.5 w-2.5 shrink-0 rounded-full bg-primary" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
            {reviewArticle ? (
              <div className="rounded-[2rem] bg-white p-8 shadow-panel">
                <div className="editorial-prose" dangerouslySetInnerHTML={{ __html: normalizeEditorialHtml(reviewArticle.contentHtml) }} />
              </div>
            ) : (
              <div className="rounded-[2rem] bg-white p-8 shadow-panel">
                <div className="editorial-prose">
                  <h2>The Deep Dive Analysis</h2>
                  <p>
                    Bes3 uses this page to capture the product-level detail that sits underneath a shortlist recommendation: the price context, core specs, and the signals that make the product worth considering in the first place.
                  </p>
                </div>
              </div>
            )}
          </div>

          <aside className="space-y-6">
            <div className="rounded-[2rem] bg-[linear-gradient(135deg,#eefaf5,#f6fffb)] p-6 shadow-panel">
              <h2 className="font-[var(--font-display)] text-2xl font-black tracking-tight">Specs Snapshot</h2>
              <div className="mt-5 space-y-3">
                {specs.map(([label, value]) => (
                  <div key={label} className="flex items-center justify-between gap-4 rounded-[1rem] bg-white px-4 py-3">
                    <span className="text-sm text-muted-foreground">{label}</span>
                    <span className="text-sm font-semibold text-foreground">{value}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-[2rem] bg-white p-6 shadow-panel">
              <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-primary">Decision Checklist</p>
              <div className="mt-4 space-y-3">
                {[
                  'Confirm this product still fits your actual use case before clicking through.',
                  'Treat price as a final check, not the only reason to buy.',
                  'Use the specs snapshot to verify there is no hidden mismatch.',
                  comparisonArticle ? 'If this product survives the checklist, move into the comparison page next instead of opening unrelated alternatives.' : `If you still need options, return to the ${categoryLabel} hub and narrow the lane before comparing.`
                ].map((item) => (
                  <div key={item} className="flex items-start gap-3 text-sm leading-7 text-muted-foreground">
                    <span className="mt-2 h-2.5 w-2.5 rounded-full bg-primary" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
            {comparisonArticle ? (
              <div className="rounded-[2rem] bg-white p-6 shadow-panel">
                <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-primary">Related Comparison</p>
                <h3 className="mt-3 font-[var(--font-display)] text-2xl font-black tracking-tight">{comparisonArticle.title}</h3>
                <p className="mt-3 text-sm leading-7 text-muted-foreground">{comparisonArticle.summary}</p>
                <Link href={getArticlePath(comparisonArticle.type, comparisonArticle.slug)} className="mt-5 inline-flex text-sm font-semibold text-primary">
                  Open comparison →
                </Link>
              </div>
            ) : null}
          </aside>
        </section>
      </div>
    </PublicShell>
  )
}
