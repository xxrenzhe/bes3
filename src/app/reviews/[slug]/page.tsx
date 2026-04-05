import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { PublicShell } from '@/components/layout/PublicShell'
import { SeoFaqSection } from '@/components/site/SeoFaqSection'
import { ShortlistActionBar } from '@/components/site/ShortlistActionBar'
import { StructuredData } from '@/components/site/StructuredData'
import { getArticlePath } from '@/lib/article-path'
import { normalizeEditorialHtml } from '@/lib/editorial-html'
import { buildBestFor, buildConfidenceSignals, buildNotFor, formatEditorialDate, getCategoryLabel, getFreshnessLabel, getSnapshotDate } from '@/lib/editorial'
import { buildPageMetadata, pickMetadataDescription } from '@/lib/metadata'
import { toAbsoluteUrl } from '@/lib/site-url'
import { buildArticleSchema, buildBreadcrumbSchema, buildFaqSchema, buildHowToSchema, buildReviewSchema, buildWebPageSchema } from '@/lib/structured-data'
import { toShortlistItem } from '@/lib/shortlist'
import { getArticleBySlug, getBrandSlug, listPublishedArticles, listPublishedProducts } from '@/lib/site-data'
import { formatPriceSnapshot } from '@/lib/utils'

function buildFallbackNote(productName: string) {
  return `${productName} is best for buyers who want a straightforward recommendation without spending another week comparing near-identical options.`
}

export async function generateMetadata({
  params
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const slug = (await params).slug
  const article = await getArticleBySlug(slug)

  if (!article || article.type !== 'review') {
    return buildPageMetadata({
      title: 'Review Not Found',
      description: 'This Bes3 review page is unavailable.',
      path: `/reviews/${slug}`,
      robots: {
        index: false,
        follow: false
      }
    })
  }

  const freshnessDate = article.updatedAt || article.publishedAt || article.createdAt
  const categoryLabel = getCategoryLabel(article.product?.category || null)

  return buildPageMetadata({
    title: article.seoTitle || article.title,
    description:
      pickMetadataDescription(article.seoDescription, article.summary) ||
      buildFallbackNote(article.product?.productName || article.title),
    path: `/reviews/${article.slug}`,
    image: article.heroImageUrl || article.product?.heroImageUrl,
    type: 'article',
    category: categoryLabel || undefined,
    freshnessDate,
    freshnessInTitle: true,
    modifiedTime: freshnessDate,
    publishedTime: article.publishedAt || article.createdAt,
    section: categoryLabel || 'Reviews',
    keywords: [article.title, article.product?.productName || '', categoryLabel, 'review', 'buying guide'].filter(Boolean)
  })
}

export default async function ReviewPage({
  params
}: {
  params: Promise<{ slug: string }>
}) {
  const article = await getArticleBySlug((await params).slug)
  if (!article || article.type !== 'review') notFound()

  const [articles, allProducts] = await Promise.all([listPublishedArticles(), listPublishedProducts()])
  const category = article.product?.category || null
  const categoryLabel = getCategoryLabel(category)
  const snapshotDate = getSnapshotDate(article, article.product)
  const confidenceSignals = buildConfidenceSignals(article.product)
  const brandSlug = getBrandSlug(article.product?.brand)
  const relatedComparison = articles.find((candidate) => {
    if (candidate.type !== 'comparison') return false
    if (article.productId && candidate.productId === article.productId) return true
    if (category && candidate.product?.category === category) return true
    return false
  }) || null
  const relatedGuide = articles.find((candidate) => {
    if (candidate.type !== 'guide') return false
    if (candidate.id === article.id) return false
    if (article.productId && candidate.productId === article.productId) return true
    if (category && candidate.product?.category === category) return true
    return false
  }) || null
  const peerProducts = allProducts
    .filter((candidate) => candidate.id !== article.product?.id && candidate.category === category)
    .slice(0, 3)
  const path = `/reviews/${article.slug}`
  const reviewDescription =
    pickMetadataDescription(article.seoDescription, article.summary) ||
    buildFallbackNote(article.product?.productName || article.title)
  const breadcrumbItems = [
    { name: 'Home', path: '/' },
    { name: category ? category.replace(/-/g, ' ') : 'Reviews', path: category ? `/categories/${category}` : '/directory' },
    { name: article.title, path }
  ]
  const howToSteps = [
    {
      name: 'Read the buyer fit first',
      text: 'Use the summary, freshness, best-for, and skip-if notes to decide whether this product deserves deeper attention.'
    },
    {
      name: 'Validate against product details',
      text: article.product?.slug
        ? 'Open the product page when you need specs, pricing, and current store details before acting on the review.'
        : 'Use the review itself as the main source of truth when a separate product page is not available yet.'
    },
    {
      name: 'Choose the next step',
      text: relatedComparison
        ? 'Move into the related comparison if you are down to finalists, or switch to a price alert if timing is the only blocker left.'
        : 'Use the category page or a price alert if you are not ready to compare finalists yet.'
    }
  ]
  const structuredData = [
    buildBreadcrumbSchema(path, breadcrumbItems),
    buildWebPageSchema({
      path,
      title: article.seoTitle || article.title,
      description: reviewDescription,
      image: article.heroImageUrl || article.product?.heroImageUrl,
      breadcrumbItems,
      datePublished: article.publishedAt || article.createdAt,
      dateModified: article.updatedAt || article.publishedAt || article.createdAt,
      about: category
        ? {
            '@type': 'Thing',
            name: categoryLabel
          }
        : undefined,
      mainEntity: {
        '@id': `${toAbsoluteUrl(path)}#review`
      }
    }),
    buildArticleSchema({
      path,
      title: article.seoTitle || article.title,
      description: reviewDescription,
      image: article.heroImageUrl || article.product?.heroImageUrl,
      datePublished: article.publishedAt || article.createdAt,
      dateModified: article.updatedAt || article.publishedAt || article.createdAt,
      type: 'Article'
    }),
    buildReviewSchema(article, path),
    buildHowToSchema(path, `How to use the ${article.title} review`, 'Use the review to confirm buyer fit, validate the product details, and choose the next useful step.', howToSteps)
  ]
  const faqEntries = [
    {
      question: 'What should this review help me decide?',
      answer: 'It should tell you whether this product deserves to stay on the shortlist at all. Once the fit is credible, the next step is usually the product page, a comparison, or a price alert.'
    },
    {
      question: 'When should I open the brand page from a review?',
      answer: article.product?.brand
        ? `Open the ${article.product.brand} page when the manufacturer itself looks promising and you want the rest of that brand's Bes3 coverage without broadening your search too early.`
        : 'Use the category page instead when you still need nearby context before comparing or clicking through.'
    },
    {
      question: 'Should I compare now or keep reading?',
      answer: relatedComparison
        ? 'If this product already feels credible, move into the comparison next. Keep reading only if you still need the deeper rationale behind the recommendation.'
        : 'If no comparison is live yet, use the product page or category page next instead of reopening broad research.'
    }
  ]

  const reviewPicks = [
    article,
    ...articles.filter((candidate) => {
      if (candidate.id === article.id) return false
      if (candidate.type !== 'review') return false
      if (category && candidate.product?.category !== category) return false
      return true
    })
  ].slice(0, 3)
  const reviewRoutes = [
    {
      eyebrow: 'Deep Dive',
      title: article.product?.slug ? 'Open the product page' : 'Stay with this review',
      description: article.product?.slug
        ? 'Move into the product page when this recommendation is already credible enough and you want specs, pricing, and current store details.'
        : 'Use this review as the main answer when a separate product page is not available yet.',
      href: article.product?.slug ? `/products/${article.product.slug}` : getArticlePath(article.type, article.slug),
      label: article.product?.slug ? 'Open product details' : 'Keep reading this review'
    },
    {
      eyebrow: 'Compare',
      title: relatedComparison ? 'Compare the finalist' : 'Narrow the shortlist first',
      description: relatedComparison
        ? 'Use the comparison when this pick is strong enough to deserve a head-to-head comparison against nearby alternatives.'
        : 'If you are not ready to decide, go back to the category page and narrow real alternatives before comparing.',
      href: relatedComparison
        ? getArticlePath(relatedComparison.type, relatedComparison.slug)
        : category
          ? `/categories/${category}#category-shortlist`
          : '/shortlist',
      label: relatedComparison ? 'Open related comparison' : 'Browse shortlist'
    },
    {
      eyebrow: 'Learn',
      title: relatedGuide ? 'Read the supporting guide' : 'Browse the category page',
      description: relatedGuide
        ? 'Use the guide if you still need category basics, compatibility context, or setup advice before finalizing the shortlist.'
        : 'Return to the category page when you still need broader coverage before acting on this review.',
      href: relatedGuide ? getArticlePath(relatedGuide.type, relatedGuide.slug) : category ? `/categories/${category}` : '/directory',
      label: relatedGuide ? 'Open category guide' : 'Visit category page'
    },
    {
      eyebrow: 'Watch',
      title: category ? `Track ${categoryLabel}` : 'Track the market',
      description: 'If the purchase is waiting on a better price, turn this review into a price alert instead of reopening research from scratch later.',
      href: category
        ? `/newsletter?intent=price-alert&category=${encodeURIComponent(category)}&cadence=priority`
        : '/newsletter?intent=deals&cadence=priority',
      label: 'Start price alert'
    }
  ]

  return (
    <PublicShell>
      <StructuredData data={[...structuredData, buildFaqSchema(path, faqEntries)]} />
      <div className="mx-auto max-w-7xl space-y-14 px-4 py-14 sm:px-6 lg:px-8">
        <section className="space-y-8">
          <nav className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
            <Link href="/" className="transition-colors hover:text-primary">Home</Link>
            <span>/</span>
            <Link href={category ? `/categories/${category}` : '/directory'} className="transition-colors hover:text-primary">
              {category ? category.replace(/-/g, ' ') : 'Reviews'}
            </Link>
            <span>/</span>
            <span className="text-foreground">{article.title}</span>
          </nav>
          <div className="space-y-6">
            <div className="inline-flex items-center rounded-full bg-secondary px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.28em] text-secondary-foreground">
              Review
            </div>
            <h1 className="max-w-5xl font-[var(--font-display)] text-5xl font-black tracking-tight text-balance sm:text-6xl">
              {article.title}
            </h1>
            <div className="flex flex-wrap items-center gap-4 border-y border-border/30 py-6 text-sm text-muted-foreground">
              <span>{article.publishedAt ? `Updated ${new Date(article.publishedAt).toLocaleDateString()}` : 'Freshly curated'}</span>
            </div>
            <p className="max-w-3xl text-lg leading-8 text-muted-foreground">
              {article.summary || buildFallbackNote(article.product?.productName || article.title)}
            </p>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-[1.5rem] bg-white p-5 shadow-panel">
                <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground">Freshness</p>
                <p className="mt-2 text-lg font-black text-foreground">{formatEditorialDate(snapshotDate)}</p>
                <p className="mt-2 text-sm leading-7 text-muted-foreground">{getFreshnessLabel(snapshotDate)}</p>
              </div>
              <div className="rounded-[1.5rem] bg-white p-5 shadow-panel">
                <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground">Best for</p>
                <p className="mt-2 text-sm leading-7 text-muted-foreground">{buildBestFor(article.product, 'review')}</p>
              </div>
              <div className="rounded-[1.5rem] bg-white p-5 shadow-panel">
                <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground">Skip if</p>
                <p className="mt-2 text-sm leading-7 text-muted-foreground">{buildNotFor(article.product, 'review')}</p>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-[2.5rem] bg-[linear-gradient(135deg,#fff8ef_0%,#f8fbff_48%,#eefaf5_100%)] p-8 shadow-panel sm:p-10">
          <div className="grid gap-6 xl:grid-cols-[1fr_0.95fr] xl:items-start">
            <div>
              <p className="editorial-kicker">How To Use This Review</p>
              <h2 className="mt-3 font-[var(--font-display)] text-4xl font-black tracking-tight text-foreground">Use the review, then choose the next move.</h2>
              <p className="mt-4 max-w-3xl text-sm leading-8 text-muted-foreground">
                Bes3 reviews are meant to compress research, not trap buyers on a content page. Validate the recommendation, compare it if needed, and switch into an alert if timing is the only remaining blocker.
              </p>
              <div className="mt-6 rounded-[1.75rem] bg-slate-950 p-5 text-white">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-200">Best next step</p>
                <p className="mt-3 text-sm leading-7 text-slate-200">
                  {relatedComparison
                    ? `This review already has enough adjacent coverage in ${categoryLabel} to support a head-to-head comparison. Move into the comparison once the core fit feels right.`
                    : 'This review is the clearest current answer. Use the product page or a price watch next if you do not need another comparison yet.'}
                </p>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {reviewRoutes.map((route) => (
                <Link
                  key={route.title}
                  href={route.href}
                  className="rounded-[1.75rem] bg-white p-6 shadow-[0_24px_60px_-40px_rgba(15,23,42,0.35)] transition-transform hover:-translate-y-1"
                >
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">{route.eyebrow}</p>
                  <h3 className="mt-3 font-[var(--font-display)] text-2xl font-black tracking-tight text-foreground">{route.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-muted-foreground">{route.description}</p>
                  <p className="mt-5 text-sm font-semibold text-primary">{route.label} →</p>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section className="grid gap-10">
          {reviewPicks.map((pick, index) => {
            const product = pick.product
            const productHref = product?.slug ? `/products/${product.slug}` : getArticlePath(pick.type, pick.slug)
            const specs = Object.entries(product?.specs || {}).slice(0, 2)

            return (
              <article key={pick.id} className="overflow-hidden rounded-[2rem] bg-white shadow-panel">
                <div className={`grid gap-8 p-8 md:p-10 ${index % 2 === 0 ? 'md:grid-cols-[1.1fr_0.9fr]' : 'md:grid-cols-[0.9fr_1.1fr]'}`}>
                  <div className={`space-y-8 ${index % 2 === 1 ? 'md:order-2' : ''}`}>
                    <div className="space-y-4">
                      <span className={`inline-flex rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.24em] ${index === 0 ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                        #{index + 1} {index === 0 ? 'Best Overall' : index === 1 ? 'Best Value' : 'Alternative Pick'}
                      </span>
                      <h2 className="font-[var(--font-display)] text-4xl font-black tracking-tight text-foreground">
                        {product?.productName || pick.title}
                      </h2>
                      <p className="text-sm leading-7 text-muted-foreground">
                        <strong className="text-foreground">Bottom line:</strong> {pick.summary || buildFallbackNote(product?.productName || pick.title)}
                      </p>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-[1.25rem] bg-muted p-4">
                        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Current Price</p>
                        <p className="mt-2 text-lg font-black text-foreground">{formatPriceSnapshot(product?.priceAmount, product?.priceCurrency || 'USD')}</p>
                      </div>
                      <div className="rounded-[1.25rem] bg-muted p-4">
                        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">User rating</p>
                        <p className="mt-2 text-lg font-black text-foreground">
                          {product?.rating ? `${product.rating.toFixed(1)} / 5` : 'No rating yet'}
                        </p>
                      </div>
                      {specs.map(([label, value]) => (
                        <div key={label} className="rounded-[1.25rem] bg-muted p-4">
                          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">{label}</p>
                          <p className="mt-2 text-lg font-black text-foreground">{value}</p>
                        </div>
                      ))}
                    </div>

                    <div className="grid gap-6 md:grid-cols-2">
                      <div className="rounded-[1.5rem] bg-[linear-gradient(135deg,#eefaf5,#f6fffb)] p-6">
                        <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-primary">Quick scorecard</p>
                        <div className="mt-5 space-y-4">
                          {[
                            ['Build quality', product?.rating ? Math.min(9.8, product.rating * 2) : 8.2],
                            ['Review volume', product?.reviewCount ? Math.min(9.9, 6 + Math.log10(product.reviewCount + 1)) : 7.4],
                            ['Price value', product?.priceAmount ? Math.max(6.6, 10 - Math.min(product.priceAmount / 200, 3)) : 7.8]
                          ].map(([label, score]) => (
                            <div key={label}>
                              <div className="mb-1 flex items-center justify-between text-xs font-semibold text-foreground">
                                <span>{label}</span>
                                <span>{Number(score).toFixed(1)}</span>
                              </div>
                              <div className="h-2 overflow-hidden rounded-full bg-white">
                                <div className="h-full rounded-full bg-[linear-gradient(135deg,hsl(var(--primary)),#00855d)]" style={{ width: `${(Number(score) / 10) * 100}%` }} />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="rounded-[1.5rem] bg-rose-50 p-6">
                        <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-rose-700">Who it&apos;s not for</p>
                        <p className="mt-4 text-sm leading-7 text-rose-900/80">
                          Buyers chasing the most extreme niche performance or a radically different use case should keep comparing before buying.
                        </p>
                      </div>
                    </div>

                    <Link
                      href={productHref}
                      className="inline-flex rounded-full bg-[linear-gradient(135deg,hsl(var(--primary)),#00855d)] px-8 py-4 text-lg font-semibold text-primary-foreground shadow-lg shadow-emerald-950/10 transition-transform hover:-translate-y-0.5"
                    >
                      Open Deep-Dive
                    </Link>
                    {product ? <ShortlistActionBar item={toShortlistItem(product)} compact source="review-page" /> : null}
                    {index === 0 ? (
                      <p className="text-xs leading-6 text-muted-foreground">
                        Why this looks strong: {confidenceSignals.join(' · ')}
                      </p>
                    ) : null}
                  </div>

                  <div className={index % 2 === 1 ? 'md:order-1' : ''}>
                    <div className="relative overflow-hidden rounded-[1.75rem] bg-[linear-gradient(135deg,#e5eeff,#dfe9fa)]">
                      <div className="relative aspect-square">
                        {pick.heroImageUrl ? (
                          <Image
                            src={pick.heroImageUrl}
                            alt={pick.title}
                            fill
                            sizes="(max-width: 768px) 100vw, 36vw"
                            className="object-cover"
                          />
                        ) : (
                          <div className="bg-grid absolute inset-0" />
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </article>
            )
          })}
        </section>

        <section className="rounded-[2.5rem] bg-white p-8 shadow-panel sm:p-10">
          <div className="editorial-prose" dangerouslySetInnerHTML={{ __html: normalizeEditorialHtml(article.contentHtml) }} />
        </section>

        {(category || relatedGuide || relatedComparison || peerProducts.length) ? (
          <section className="rounded-[2.5rem] bg-[linear-gradient(135deg,#fff8ef_0%,#f8fbff_48%,#eefaf5_100%)] p-8 shadow-panel sm:p-10">
            <div className="flex flex-col gap-3 border-b border-border/40 pb-6 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="editorial-kicker">Keep Browsing Nearby</p>
                <h2 className="mt-3 font-[var(--font-display)] text-4xl font-black tracking-tight text-foreground">Keep the related pages one click away.</h2>
              </div>
              <p className="max-w-2xl text-sm leading-7 text-muted-foreground">
                This review should connect you to the surrounding pages: the category page, the supporting guide, the head-to-head comparison, and nearby product pages.
              </p>
            </div>
            <div className="mt-6 grid gap-4 lg:grid-cols-3">
              {category ? (
                <Link href={`/categories/${category}`} className="rounded-[1.75rem] bg-white p-6 transition-transform hover:-translate-y-1">
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">Category Page</p>
                  <h3 className="mt-3 font-[var(--font-display)] text-2xl font-black tracking-tight text-foreground">{categoryLabel}</h3>
                  <p className="mt-3 text-sm leading-7 text-muted-foreground">Return to the main category page if you still need adjacent reviews, comparisons, or shortlist coverage.</p>
                </Link>
              ) : null}
              {brandSlug && article.product?.brand ? (
                <Link href={`/brands/${brandSlug}`} className="rounded-[1.75rem] bg-white p-6 transition-transform hover:-translate-y-1">
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">Brand Page</p>
                  <h3 className="mt-3 font-[var(--font-display)] text-2xl font-black tracking-tight text-foreground">{article.product.brand}</h3>
                  <p className="mt-3 text-sm leading-7 text-muted-foreground">Stay with the same manufacturer if the brand already looks promising and you want related Bes3 coverage in one place.</p>
                </Link>
              ) : null}
              {relatedGuide ? (
                <Link href={getArticlePath(relatedGuide.type, relatedGuide.slug)} className="rounded-[1.75rem] bg-white p-6 transition-transform hover:-translate-y-1">
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">Supporting Guide</p>
                  <h3 className="mt-3 font-[var(--font-display)] text-2xl font-black tracking-tight text-foreground">{relatedGuide.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-muted-foreground">{relatedGuide.summary}</p>
                </Link>
              ) : null}
              {relatedComparison ? (
                <Link href={getArticlePath(relatedComparison.type, relatedComparison.slug)} className="rounded-[1.75rem] bg-white p-6 transition-transform hover:-translate-y-1">
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">Related Comparison</p>
                  <h3 className="mt-3 font-[var(--font-display)] text-2xl font-black tracking-tight text-foreground">{relatedComparison.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-muted-foreground">{relatedComparison.summary}</p>
                </Link>
              ) : null}
              {peerProducts.map((candidate) => (
                <Link key={candidate.id} href={`/products/${candidate.slug}`} className="rounded-[1.75rem] bg-white p-6 transition-transform hover:-translate-y-1">
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">Similar Product</p>
                  <h3 className="mt-3 font-[var(--font-display)] text-2xl font-black tracking-tight text-foreground">{candidate.productName}</h3>
                  <p className="mt-3 text-sm leading-7 text-muted-foreground">
                    {candidate.description || `Another ${categoryLabel} option worth checking.`}
                  </p>
                </Link>
              ))}
            </div>
          </section>
        ) : null}

        <SeoFaqSection
          title="Review-page questions, answered clearly."
          entries={faqEntries}
          description="This FAQ explains what the review is supposed to help you decide and what page to open next."
        />
      </div>
    </PublicShell>
  )
}
