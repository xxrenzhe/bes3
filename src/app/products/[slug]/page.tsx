import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { PrimaryCta } from '@/components/site/PrimaryCta'
import { PublicShell } from '@/components/layout/PublicShell'
import { SeoFaqSection } from '@/components/site/SeoFaqSection'
import { ShortlistActionBar } from '@/components/site/ShortlistActionBar'
import { StickyMobileCta } from '@/components/site/StickyMobileCta'
import { StructuredData } from '@/components/site/StructuredData'
import { getArticlePath } from '@/lib/article-path'
import { normalizeEditorialHtml } from '@/lib/editorial-html'
import { buildBestFor, buildConfidenceSignals, buildNotFor, formatEditorialDate, getFreshnessLabel, getSnapshotDate } from '@/lib/editorial'
import { buildPageMetadata, pickMetadataDescription } from '@/lib/metadata'
import { buildMerchantExitPath } from '@/lib/merchant-links'
import { getRequestLocale } from '@/lib/request-locale'
import { toAbsoluteUrl } from '@/lib/site-url'
import { buildBreadcrumbSchema, buildFaqSchema, buildHowToSchema, buildProductSchema, buildWebPageSchema } from '@/lib/structured-data'
import { toShortlistItem } from '@/lib/shortlist'
import { getBrandSlug, getProductBySlug, listPublishedArticles, listPublishedProducts } from '@/lib/site-data'
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
      description: 'This Bes3 product page is unavailable.',
      path: `/products/${slug}`,
      locale: getRequestLocale(),
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
      `${product.productName} on Bes3 includes specs, shortlist context, and fit notes before you click through to a store.`,
    path: `/products/${product.slug}`,
    locale: getRequestLocale(),
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

  const [articles, allProducts] = await Promise.all([listPublishedArticles(), listPublishedProducts()])
  const reviewArticle = articles.find((article) => article.productId === product.id && article.type === 'review') || null
  const comparisonArticle = articles.find((article) => article.productId === product.id && article.type === 'comparison') || null
  const guideArticle = articles.find((article) => {
    if (article.type !== 'guide') return false
    if (article.productId === product.id) return true
    return Boolean(product.category && article.product?.category === product.category)
  }) || null
  const peerProducts = allProducts.filter((candidate) => candidate.id !== product.id && candidate.category === product.category).slice(0, 3)
  const heroImageUrl = product.heroImageUrl || reviewArticle?.heroImageUrl || null
  const specs = Object.entries(product.specs).slice(0, 6)
  const snapshotDate = getSnapshotDate(reviewArticle, product)
  const confidenceSignals = buildConfidenceSignals(product)
  const shortlistItem = toShortlistItem(product)
  const categoryLabel = product.category ? product.category.replace(/-/g, ' ') : 'this category'
  const brandSlug = getBrandSlug(product.brand)
  const path = `/products/${product.slug}`
  const productDescription =
    pickMetadataDescription(reviewArticle?.seoDescription, reviewArticle?.summary, product.description) ||
    `${product.productName} on Bes3 includes specs, shortlist context, and fit notes before you click through to a store.`
  const breadcrumbItems = [
    { name: 'Home', path: '/' },
    { name: product.category ? product.category.replace(/-/g, ' ') : 'Directory', path: product.category ? `/categories/${product.category}` : '/directory' },
    { name: product.productName, path }
  ]
  const howToSteps = [
    {
      name: 'Check the product fit',
      text: 'Start with the last-checked note, buyer fit, and watch-out details on this page before price starts driving the choice.'
    },
    {
      name: 'Validate the pick',
      text: reviewArticle
        ? 'Open the full review when you need deeper fit context before you save or click through.'
        : 'Use the product facts and review signals here to decide whether the product deserves a place on the shortlist.'
    },
    {
      name: 'Compare or set a price alert',
      text: `If the product looks good but not final, move into ${categoryLabel} comparisons or a price alert instead of restarting research.`
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
    buildHowToSchema(path, `How to use ${product.productName} on Bes3`, 'Use the product page to validate fit, read the supporting review when needed, and choose the clearest next step.', howToSteps)
  ]
  const faqEntries = [
    {
      question: `What is this ${product.productName} page for?`,
      answer: 'It is meant to be the clean product-level checkpoint: confirm fit, verify specs and pricing, and choose whether to compare, click through, or keep watching the category.'
    },
    {
      question: 'When should I use the brand page from here?',
      answer: product.brand
        ? `Use the ${product.brand} page when you want to see nearby products and editorial pages from the same brand without reopening site-wide search.`
        : 'Use the category page when you still need adjacent products and articles around this product before comparing or buying.'
    },
    {
      question: 'What should I do if this product looks good but not final?',
      answer: comparisonArticle
        ? 'Open the related comparison next if you are down to your top picks. If price is the only thing holding you back instead of fit, switch to the category price watch.'
        : 'Return to the category page or start a price alert so you can keep following this category without forcing the purchase today.'
    }
  ]
  const nextMoves = [
    reviewArticle
      ? {
          eyebrow: 'Validate',
          title: 'Read the full review',
          description: 'Use the full review when you want the strongest fit check before you save or click through.',
          href: getArticlePath(reviewArticle.type, reviewArticle.slug),
          label: 'Open review'
        }
      : null,
    comparisonArticle
      ? {
          eyebrow: 'Compare',
          title: 'See close alternatives',
          description: 'Open the comparison once this product is good enough to become a top pick against nearby substitutes.',
          href: getArticlePath(comparisonArticle.type, comparisonArticle.slug),
          label: 'Open comparison'
        }
      : null,
    brandSlug && product.brand
      ? {
          eyebrow: 'Brand',
          title: `More from ${product.brand}`,
          description: 'Open the brand page when you want adjacent products and editorial pages from the same brand without broadening the search too early.',
          href: `/brands/${brandSlug}`,
          label: `Open ${product.brand} page`
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
      title: 'Browse the category',
      description: 'Return to the category page if you still need Bes3 to narrow the field before comparing or checking price.',
      href: product.category ? `/categories/${product.category}` : '/directory',
      label: 'Open category page'
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
      <StructuredData data={[...structuredData, buildFaqSchema(path, faqEntries)]} />
      <StickyMobileCta
        href={product.resolvedUrl ? buildMerchantExitPath(product.id, 'product-page-sticky-cta') : null}
        productId={product.id}
        trackingSource="product-page-sticky-cta"
        label="Check Current Price"
        eyebrow="Ready to buy?"
      />
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
              <p className="editorial-kicker">Product Page</p>
              <h1 className="font-[var(--font-display)] text-5xl font-black tracking-tight text-balance sm:text-6xl">
                {product.productName}
              </h1>
              <p className="max-w-3xl text-lg leading-8 text-muted-foreground">
                {reviewArticle?.summary || product.description || `${product.productName} is part of the current Bes3 shortlist and this page captures the product facts, price context, and product notes that matter before you buy.`}
              </p>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-[1.5rem] bg-white p-5 shadow-panel">
                  <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground">Last checked</p>
                  <p className="mt-2 text-lg font-black text-foreground">{formatEditorialDate(snapshotDate)}</p>
                  <p className="mt-2 text-sm leading-7 text-muted-foreground">{getFreshnessLabel(snapshotDate)}</p>
                </div>
                <div className="rounded-[1.5rem] bg-white p-5 shadow-panel">
                  <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground">Best for</p>
                  <p className="mt-2 text-sm leading-7 text-muted-foreground">{buildBestFor(product, 'product')}</p>
                </div>
                <div className="rounded-[1.5rem] bg-white p-5 shadow-panel">
                  <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground">Watch out</p>
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
                  note={`Why this looks strong: ${confidenceSignals.join(' · ')}`}
                />
              </div>
              <div className="rounded-[2rem] bg-[linear-gradient(135deg,#fff8ef_0%,#f8fbff_48%,#eefaf5_100%)] p-6 shadow-panel">
                <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-primary">Next Best Move</p>
                <h2 className="mt-3 font-[var(--font-display)] text-2xl font-black tracking-tight text-foreground">Keep your next step clear.</h2>
                <p className="mt-3 text-sm leading-7 text-muted-foreground">
                  This product page should not be a dead end. Use the next step that matches your buying stage: validate, compare, or switch to a price alert.
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
                {(product.reviewHighlights.length ? product.reviewHighlights : ['Strong buyer reviews', 'Good value for the price', 'Worth shortlisting']).map((item) => (
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
                  <h2>Product Notes</h2>
                  <p>
                    Bes3 uses this page to capture the product-level details behind a shortlist recommendation: price context, core specs, and the reasons this product is worth considering.
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
              <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-primary">What to check before buying</p>
              <div className="mt-4 space-y-3">
                {[
                  'Confirm this product still fits your actual use case before clicking through.',
                  'Treat price as a final check, not the only reason to buy.',
                  'Use the specs snapshot to verify there is no hidden mismatch.',
                  comparisonArticle ? 'If this product still looks good after this checklist, move into the comparison page next instead of opening unrelated alternatives.' : `If you still need options, return to the ${categoryLabel} category page and narrow the shortlist before comparing.`
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
            {guideArticle || peerProducts.length ? (
              <div className="rounded-[2rem] bg-white p-6 shadow-panel">
                <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-primary">More In This Category</p>
                <div className="mt-5 space-y-3">
                  {guideArticle ? (
                    <Link href={getArticlePath(guideArticle.type, guideArticle.slug)} className="block rounded-[1.25rem] bg-muted px-4 py-4 transition-colors hover:bg-emerald-50">
                      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">Supporting Guide</p>
                      <p className="mt-2 text-base font-semibold text-foreground">{guideArticle.title}</p>
                      <p className="mt-2 text-sm leading-7 text-muted-foreground">{guideArticle.summary}</p>
                    </Link>
                  ) : null}
                  {product.category ? (
                    <Link href={`/categories/${product.category}`} className="block rounded-[1.25rem] bg-muted px-4 py-4 transition-colors hover:bg-emerald-50">
                      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">Category Page</p>
                      <p className="mt-2 text-base font-semibold text-foreground">{categoryLabel}</p>
                      <p className="mt-2 text-sm leading-7 text-muted-foreground">Return to the main category page if you need adjacent coverage before committing to this product.</p>
                    </Link>
                  ) : null}
                  {brandSlug && product.brand ? (
                    <Link href={`/brands/${brandSlug}`} className="block rounded-[1.25rem] bg-muted px-4 py-4 transition-colors hover:bg-emerald-50">
                      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">Brand Page</p>
                      <p className="mt-2 text-base font-semibold text-foreground">{product.brand}</p>
                      <p className="mt-2 text-sm leading-7 text-muted-foreground">Stay with the same brand if you want adjacent products and brand-level editorial context.</p>
                    </Link>
                  ) : null}
                  {peerProducts.map((candidate) => (
                    <Link key={candidate.id} href={`/products/${candidate.slug}`} className="block rounded-[1.25rem] bg-muted px-4 py-4 transition-colors hover:bg-emerald-50">
                      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">Similar Product</p>
                      <p className="mt-2 text-base font-semibold text-foreground">{candidate.productName}</p>
                      <p className="mt-2 text-sm leading-7 text-muted-foreground">
                        {candidate.description || `Another ${categoryLabel} option worth checking.`}
                      </p>
                    </Link>
                  ))}
                </div>
              </div>
            ) : null}
          </aside>
        </section>

        <SeoFaqSection
          title={`${product.productName} buyer questions, answered fast.`}
          entries={faqEntries}
          description="These quick answers cover the questions most buyers ask before they save, compare, or buy."
        />
      </div>
    </PublicShell>
  )
}
