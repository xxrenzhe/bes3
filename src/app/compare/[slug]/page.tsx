import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { PublicShell } from '@/components/layout/PublicShell'
import { PrimaryCta } from '@/components/site/PrimaryCta'
import { SeoFaqSection } from '@/components/site/SeoFaqSection'
import { ShortlistActionBar } from '@/components/site/ShortlistActionBar'
import { StickyMobileCta } from '@/components/site/StickyMobileCta'
import { StructuredData } from '@/components/site/StructuredData'
import { getArticlePath } from '@/lib/article-path'
import { normalizeEditorialHtml } from '@/lib/editorial-html'
import { buildBestFor, buildDecisionChecklist, buildNotFor, formatEditorialDate, getCategoryLabel, getFreshnessLabel, getSnapshotDate } from '@/lib/editorial'
import { buildPageMetadata, pickMetadataDescription } from '@/lib/metadata'
import { buildMerchantExitPath } from '@/lib/merchant-links'
import { getRequestLocale } from '@/lib/request-locale'
import { toAbsoluteUrl } from '@/lib/site-url'
import { buildArticleSchema, buildBreadcrumbSchema, buildFaqSchema, buildHowToSchema, buildWebPageSchema } from '@/lib/structured-data'
import { toShortlistItem } from '@/lib/shortlist'
import { getArticleBySlug, getBrandSlug, listPublishedArticles, listPublishedProducts } from '@/lib/site-data'
import { formatPriceSnapshot } from '@/lib/utils'

function splitComparisonTitle(title: string) {
  const parts = title.split(/\s+(?:vs\.?|versus)\s+/i)
  if (parts.length >= 2) {
    return {
      left: parts[0].trim(),
      right: parts.slice(1).join(' vs ').trim()
    }
  }

  return {
    left: title,
    right: 'Alternative pick'
  }
}

export async function generateMetadata({
  params
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const slug = (await params).slug
  const article = await getArticleBySlug(slug)

  if (!article || article.type !== 'comparison') {
    return buildPageMetadata({
      title: 'Comparison Not Found',
      description: 'This Bes3 comparison page is unavailable.',
      path: `/compare/${slug}`,
      locale: getRequestLocale(),
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
      'Use this comparison to settle a shortlist, understand the tradeoffs, and choose the better fit with less second-guessing.',
    path: `/compare/${article.slug}`,
    locale: getRequestLocale(),
    image: article.heroImageUrl || article.product?.heroImageUrl,
    type: 'article',
    category: categoryLabel || undefined,
    freshnessDate,
    freshnessInTitle: true,
    modifiedTime: freshnessDate,
    publishedTime: article.publishedAt || article.createdAt,
    section: categoryLabel || 'Comparisons',
    keywords: [article.title, article.product?.productName || '', categoryLabel, 'comparison', 'buying guide'].filter(Boolean)
  })
}

export default async function ComparisonPage({
  params
}: {
  params: Promise<{ slug: string }>
}) {
  const article = await getArticleBySlug((await params).slug)
  if (!article || article.type !== 'comparison') notFound()

  const [allArticles, allProducts] = await Promise.all([listPublishedArticles(), listPublishedProducts()])
  const contenders = splitComparisonTitle(article.title)
  const winner = article.product?.productName || contenders.left
  const category = article.product?.category || null
  const categoryLabel = getCategoryLabel(category)
  const brandSlug = getBrandSlug(article.product?.brand)
  const priceLabel = formatPriceSnapshot(article.product?.priceAmount, article.product?.priceCurrency || 'USD')
  const snapshotDate = getSnapshotDate(article, article.product)
  const decisionChecklist = buildDecisionChecklist(article.product)
  const relatedReview = allArticles.find((candidate) => {
    if (candidate.type !== 'review') return false
    if (article.productId && candidate.productId === article.productId) return true
    if (category && candidate.product?.category === category) return true
    return false
  }) || null
  const relatedGuide = allArticles.find((candidate) => {
    if (candidate.type !== 'guide') return false
    if (candidate.id === article.id) return false
    if (article.productId && candidate.productId === article.productId) return true
    if (category && candidate.product?.category === category) return true
    return false
  }) || null
  const peerProducts = allProducts
    .filter((candidate) => candidate.id !== article.product?.id && candidate.category === category)
    .slice(0, 3)
  const path = `/compare/${article.slug}`
  const comparisonDescription =
    pickMetadataDescription(article.seoDescription, article.summary) ||
    'Use this comparison to settle a shortlist, understand the tradeoffs, and choose the better fit with less second-guessing.'
  const breadcrumbItems = [
    { name: 'Home', path: '/' },
    { name: article.product?.category ? article.product.category.replace(/-/g, ' ') : 'Comparisons', path: article.product?.category ? `/categories/${article.product.category}` : '/directory' },
    { name: article.title, path }
  ]
  const howToSteps = [
    {
      name: 'Confirm the top picks',
      text: 'Use the comparison only when the shortlist is already narrow enough that the tradeoffs stay honest and you are close to choosing.'
    },
    {
      name: 'Pick the winner',
      text: article.product?.slug
        ? 'Open the winning product page when you need pricing, specs, and current store details before clicking through.'
        : 'Treat the winner here as the default answer unless you still have an open question.'
    },
    {
      name: 'Keep other options open',
      text: 'If price is the only thing holding you back, switch into a category price alert. If neither option is right, reopen the shortlist instead of branching into unrelated products.'
    }
  ]
  const structuredData = [
    buildBreadcrumbSchema(path, breadcrumbItems),
    buildWebPageSchema({
      path,
      title: article.seoTitle || article.title,
      description: comparisonDescription,
      image: article.heroImageUrl || article.product?.heroImageUrl,
      breadcrumbItems,
      datePublished: article.publishedAt || article.createdAt,
      dateModified: article.updatedAt || article.publishedAt || article.createdAt,
      about: [
        {
          '@type': 'Thing',
          name: contenders.left
        },
        {
          '@type': 'Thing',
          name: contenders.right
        }
      ],
      mainEntity: {
        '@id': `${toAbsoluteUrl(path)}#article`
      }
    }),
    buildArticleSchema({
      path,
      title: article.seoTitle || article.title,
      description: comparisonDescription,
      image: article.heroImageUrl || article.product?.heroImageUrl,
      datePublished: article.publishedAt || article.createdAt,
      dateModified: article.updatedAt || article.publishedAt || article.createdAt,
      type: 'Article',
      about: [
        {
          '@type': 'Thing',
          name: contenders.left
        },
        {
          '@type': 'Thing',
          name: contenders.right
        }
      ]
    }),
    buildHowToSchema(path, `How to use the ${article.title} comparison`, 'Use the comparison to confirm the top picks, choose the better fit, and decide whether to buy now, set a price alert, or reopen the shortlist.', howToSteps)
  ]
  const faqEntries = [
    {
      question: 'What should I do after this comparison?',
      answer: article.product?.slug
        ? 'If the winner is clear, move into the product page next for specs, pricing, and current store details. Reopen the shortlist only if neither option feels right.'
        : 'Treat the winner here as the default answer unless you still have a real concern.'
    },
    {
      question: 'When does a brand page help after a comparison?',
      answer: article.product?.brand
        ? `Use the ${article.product.brand} page when the brand looks right but you want the rest of its products and editorial coverage before buying.`
        : 'Use the category page instead when you still need broader market context.'
    },
    {
      question: 'Why keep this page tightly scoped to the top picks?',
      answer: 'Because comparisons only stay trustworthy when the shortlist is already narrow. Pulling in unrelated products makes the recommendation weaker and the page less useful.'
    }
  ]
  const comparisonRoutes = [
    {
      eyebrow: 'Winner',
      title: article.product?.slug ? 'Open the winning product' : 'Use this winner as the default',
      description: article.product?.slug
        ? 'Move into the product page when the comparison settled the choice and you now just need pricing, specs, and current store details.'
        : 'The comparison already did the hard narrowing work. Treat the winner here as your default unless you still have a real concern.',
      href: article.product?.slug ? `/products/${article.product.slug}` : getArticlePath(article.type, article.slug),
      label: article.product?.slug ? 'Open winner details' : 'Stay with this pick'
    },
    {
      eyebrow: 'Validate',
      title: relatedReview ? 'Read the supporting review' : 'Recheck the category page',
      description: relatedReview
        ? 'Use the review when you want the strongest product-level rationale behind the winner before clicking through.'
        : 'Go back to the category page if the current picks still do not feel grounded in your actual use case.',
      href: relatedReview ? getArticlePath(relatedReview.type, relatedReview.slug) : category ? `/categories/${category}` : '/shortlist',
      label: relatedReview ? 'Open review' : 'Browse category page'
    },
    {
      eyebrow: 'Watch',
      title: category ? `Track ${categoryLabel}` : 'Track a better deal',
      description: 'If price is the only unresolved variable, convert this comparison into a price alert instead of restarting your research later.',
      href: category
        ? `/newsletter?intent=price-alert&category=${encodeURIComponent(category)}&cadence=priority`
        : '/newsletter?intent=deals&cadence=priority',
      label: 'Start price watch'
    },
    {
      eyebrow: 'Return',
      title: 'Keep the shortlist clean',
      description: 'If neither option feels quite right, go back to the shortlist or category page instead of branching into unrelated products.',
      href: category ? `/categories/${category}#category-shortlist` : '/shortlist',
      label: 'Reopen shortlist'
    }
  ]
  const scoreCards = [
    {
      label: contenders.left,
      detail: category ? `${categoryLabel} buyer fit` : 'Broad buyer fit',
      badge: winner === contenders.left ? 'Recommended' : 'Close contender'
    },
    {
      label: contenders.right,
      detail: 'Worth considering if your priorities differ from the main recommendation',
      badge: winner === contenders.right ? 'Recommended' : 'Alternative'
    }
  ]

  return (
    <PublicShell>
      <StructuredData data={[...structuredData, buildFaqSchema(path, faqEntries)]} />
      <StickyMobileCta
        href={article.product?.resolvedUrl ? buildMerchantExitPath(article.product.id, 'comparison-page-sticky-cta') : null}
        productId={article.product?.id || null}
        trackingSource="comparison-page-sticky-cta"
        label="Check Current Price"
        eyebrow="Winner picked?"
      />
      <div className="mx-auto max-w-7xl space-y-14 px-4 py-14 sm:px-6 lg:px-8">
        <section className="space-y-8">
          <nav className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
            <Link href="/" className="transition-colors hover:text-primary">Home</Link>
            <span>/</span>
            <Link href={article.product?.category ? `/categories/${article.product.category}` : '/directory'} className="transition-colors hover:text-primary">
              {article.product?.category ? article.product.category.replace(/-/g, ' ') : 'Comparisons'}
            </Link>
            <span>/</span>
            <span className="text-foreground">{article.title}</span>
          </nav>

          <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
            <div className="rounded-[2.5rem] bg-white p-8 shadow-panel sm:p-10">
              <p className="editorial-kicker">Head-to-Head Comparison</p>
              <h1 className="mt-4 font-[var(--font-display)] text-5xl font-black tracking-tight text-balance text-foreground sm:text-6xl">
                {article.title}
              </h1>
              <p className="mt-5 max-w-3xl text-lg leading-8 text-muted-foreground">{article.summary}</p>
              <div className="mt-8 grid gap-4 md:grid-cols-3">
                <div className="rounded-[1.5rem] border border-border/60 bg-muted/40 p-5">
                  <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground">Last checked</p>
                  <p className="mt-2 text-lg font-black text-foreground">{formatEditorialDate(snapshotDate)}</p>
                  <p className="mt-2 text-sm leading-7 text-muted-foreground">{getFreshnessLabel(snapshotDate)}</p>
                </div>
                <div className="rounded-[1.5rem] border border-border/60 bg-muted/40 p-5">
                  <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground">Best for</p>
                  <p className="mt-2 text-sm leading-7 text-muted-foreground">{buildBestFor(article.product, 'comparison')}</p>
                </div>
                <div className="rounded-[1.5rem] border border-border/60 bg-muted/40 p-5">
                  <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground">Watch out</p>
                  <p className="mt-2 text-sm leading-7 text-muted-foreground">{buildNotFor(article.product, 'comparison')}</p>
                </div>
              </div>

              <div className="mt-8 grid gap-4 md:grid-cols-2">
                {scoreCards.map((card) => (
                  <div key={card.label} className="rounded-[1.75rem] border border-border/60 bg-muted/40 p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-primary">{card.badge}</p>
                        <h2 className="mt-3 font-[var(--font-display)] text-3xl font-black tracking-tight text-foreground">{card.label}</h2>
                      </div>
                      <div className="rounded-full bg-white px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">VS</div>
                    </div>
                    <p className="mt-4 text-sm leading-7 text-muted-foreground">{card.detail}</p>
                  </div>
                ))}
              </div>
            </div>

            <aside className="space-y-6">
              <div className="rounded-[2rem] bg-[linear-gradient(135deg,#eefaf5,#f6fffb)] p-6 shadow-panel">
                <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-primary">Winner</p>
                <h2 className="mt-3 font-[var(--font-display)] text-3xl font-black tracking-tight text-foreground">{winner}</h2>
                <p className="mt-3 text-sm leading-7 text-muted-foreground">
                  Best overall for shoppers who want the clearest mix of reliability, practicality, and low-regret value.
                </p>
                <div className="mt-5 grid gap-3">
                  <div className="rounded-[1.25rem] bg-white p-4">
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Current price</p>
                    <p className="mt-2 text-2xl font-black text-foreground">{priceLabel}</p>
                  </div>
                  <div className="rounded-[1.25rem] bg-white p-4">
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Best for</p>
                    <p className="mt-2 text-sm leading-7 text-muted-foreground">
                      Buyers who want a confident default recommendation instead of manually sorting every minor tradeoff.
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-[2rem] bg-white p-6 shadow-panel">
                {article.product ? <ShortlistActionBar item={toShortlistItem(article.product)} className="mb-5" source="comparison-page" /> : null}
                <PrimaryCta
                  href={article.product?.resolvedUrl ? buildMerchantExitPath(article.product.id, 'comparison-page-primary-cta') : null}
                  productId={article.product?.id || null}
                  trackingSource="comparison-page-primary-cta"
                  label="Check Current Price"
                  note={`Price reviewed ${formatEditorialDate(snapshotDate)}. Use the winner only if it fits your actual requirements.`}
                />
              </div>
            </aside>
          </div>
        </section>

        <section className="rounded-[2.5rem] bg-[linear-gradient(135deg,#fff8ef_0%,#f8fbff_48%,#eefaf5_100%)] p-8 shadow-panel sm:p-10">
          <div className="grid gap-6 xl:grid-cols-[1fr_0.95fr] xl:items-start">
            <div>
              <p className="editorial-kicker">After This Comparison</p>
              <h2 className="mt-3 font-[var(--font-display)] text-4xl font-black tracking-tight text-foreground">Finish the choice without restarting research.</h2>
              <p className="mt-4 max-w-3xl text-sm leading-8 text-muted-foreground">
                A comparison should help settle the choice, not create a new one. Pick the action that matches what is still unresolved: product fit, price timing, or one last category check.
              </p>
              <div className="mt-6 rounded-[1.75rem] bg-slate-950 p-5 text-white">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-200">Best next step</p>
                <p className="mt-3 text-sm leading-7 text-slate-200">
                  {article.product?.slug
                    ? 'This comparison already gave you a likely winner. The cleanest next move is the product page, where price, specs, and current store details can be checked without reopening the whole choice.'
                    : 'This page already carries the main recommendation. Use a review or shortlist next only if you still need one more reason before buying.'}
                </p>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {comparisonRoutes.map((route) => (
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

        <section className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr]">
          <article className="rounded-[2.5rem] bg-white p-8 shadow-panel sm:p-10">
            <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-primary">Full Breakdown</p>
            <div className="editorial-prose mt-6" dangerouslySetInnerHTML={{ __html: normalizeEditorialHtml(article.contentHtml) }} />
          </article>

          <aside className="space-y-6">
            <div className="rounded-[2rem] bg-white p-6 shadow-panel">
              <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-primary">What to check</p>
              <div className="mt-5 space-y-4">
                {decisionChecklist.map((item) => (
                  <div key={item} className="flex items-start gap-3 text-sm leading-7 text-muted-foreground">
                    <span className="mt-2 h-2.5 w-2.5 rounded-full bg-primary" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[2rem] bg-[linear-gradient(180deg,#f8fbff,#eef4ff)] p-6 shadow-panel">
              <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-primary">Quick Take</p>
              <p className="mt-4 text-sm leading-7 text-muted-foreground">
                If you only need the answer fast, start with <span className="font-semibold text-foreground">{winner}</span>. The supporting article below exists for buyers who want the why, not just the recommendation.
              </p>
            </div>
            {relatedReview || relatedGuide || peerProducts.length ? (
              <div className="rounded-[2rem] bg-white p-6 shadow-panel">
                <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-primary">More In This Category</p>
                <div className="mt-5 space-y-3">
                  {relatedReview ? (
                    <Link href={getArticlePath(relatedReview.type, relatedReview.slug)} className="block rounded-[1.25rem] bg-muted px-4 py-4 transition-colors hover:bg-emerald-50">
                      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">Supporting Review</p>
                      <p className="mt-2 text-base font-semibold text-foreground">{relatedReview.title}</p>
                      <p className="mt-2 text-sm leading-7 text-muted-foreground">{relatedReview.summary}</p>
                    </Link>
                  ) : null}
                  {relatedGuide ? (
                    <Link href={getArticlePath(relatedGuide.type, relatedGuide.slug)} className="block rounded-[1.25rem] bg-muted px-4 py-4 transition-colors hover:bg-emerald-50">
                      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">Supporting Guide</p>
                      <p className="mt-2 text-base font-semibold text-foreground">{relatedGuide.title}</p>
                      <p className="mt-2 text-sm leading-7 text-muted-foreground">{relatedGuide.summary}</p>
                    </Link>
                  ) : null}
                  {category ? (
                    <Link href={`/categories/${category}`} className="block rounded-[1.25rem] bg-muted px-4 py-4 transition-colors hover:bg-emerald-50">
                      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">Category Page</p>
                      <p className="mt-2 text-base font-semibold text-foreground">{categoryLabel}</p>
                      <p className="mt-2 text-sm leading-7 text-muted-foreground">Reopen the main category page if you need more context before accepting the winner.</p>
                    </Link>
                  ) : null}
                  {brandSlug && article.product?.brand ? (
                    <Link href={`/brands/${brandSlug}`} className="block rounded-[1.25rem] bg-muted px-4 py-4 transition-colors hover:bg-emerald-50">
                      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">Brand Page</p>
                      <p className="mt-2 text-base font-semibold text-foreground">{article.product.brand}</p>
                      <p className="mt-2 text-sm leading-7 text-muted-foreground">Open the brand page if the brand looks right and you want to see its other options without widening the field too early.</p>
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
          title="Comparison-page questions, answered fast."
          entries={faqEntries}
          description="This FAQ explains how to use the comparison: keep the shortlist narrow, choose the better fit, and move to the next action without starting over."
        />
      </div>
    </PublicShell>
  )
}
