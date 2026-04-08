import type { Metadata } from 'next'
import Link from 'next/link'
import { PublicShell } from '@/components/layout/PublicShell'
import { DecisionReasonPanel } from '@/components/site/DecisionReasonPanel'
import { DecisionSummaryPanel } from '@/components/site/DecisionSummaryPanel'
import { GuideTableOfContents } from '@/components/site/GuideTableOfContents'
import { RouteRecoveryPanel } from '@/components/site/RouteRecoveryPanel'
import { SeoFaqSection } from '@/components/site/SeoFaqSection'
import { StructuredData } from '@/components/site/StructuredData'
import { getArticlePath } from '@/lib/article-path'
import { buildCategoryPath, categoryMatches } from '@/lib/category'
import { prepareEditorialHtmlWithToc } from '@/lib/editorial-html'
import { formatEditorialDate, getCategoryLabel, getFreshnessLabel, getSnapshotDate } from '@/lib/editorial'
import { buildPageMetadata, pickMetadataDescription } from '@/lib/metadata'
import { buildNewsletterPath } from '@/lib/newsletter-path'
import { deslugify, findSuggestedArticles, findSuggestedCategories, findSuggestedProducts } from '@/lib/route-recovery'
import { getRequestLocale } from '@/lib/request-locale'
import { toAbsoluteUrl } from '@/lib/site-url'
import { buildArticleSchema, buildBreadcrumbSchema, buildFaqSchema, buildHowToSchema, buildWebPageSchema } from '@/lib/structured-data'
import { getArticleBySlug, getBrandSlug, listPublishedArticles, listPublishedProducts } from '@/lib/site-data'

export async function generateMetadata({
  params
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const slug = (await params).slug
  const article = await getArticleBySlug(slug)

  if (!article || article.type !== 'guide') {
    return buildPageMetadata({
      title: `${deslugify(slug) || 'Guide'} Recovery`,
      description: 'The exact Bes3 buying guide is unavailable. Use nearby guides, products, and category pages instead of a dead end.',
      path: `/guides/${slug}`,
      locale: getRequestLocale(),
      robots: {
        index: false,
        follow: true
      }
    })
  }

  const freshnessDate = article.updatedAt || article.publishedAt || article.createdAt
  const categoryLabel = getCategoryLabel(article.product?.category || null)

  return buildPageMetadata({
    title: article.seoTitle || article.title,
    description:
      pickMetadataDescription(article.seoDescription, article.summary) ||
      'Use this guide to understand what matters, narrow your options, and avoid starting over later.',
    path: `/guides/${article.slug}`,
    locale: getRequestLocale(),
    image: article.heroImageUrl || article.product?.heroImageUrl,
    type: 'article',
    category: categoryLabel || undefined,
    freshnessDate,
    freshnessInTitle: true,
    modifiedTime: freshnessDate,
    publishedTime: article.publishedAt || article.createdAt,
    section: categoryLabel || 'Guides',
    keywords: [article.title, article.product?.productName || '', categoryLabel, 'buying guide'].filter(Boolean)
  })
}

export default async function GuidePage({
  params
}: {
  params: Promise<{ slug: string }>
}) {
  const slug = (await params).slug
  const article = await getArticleBySlug(slug)

  if (!article || article.type !== 'guide') {
    const [allArticles, allProducts] = await Promise.all([listPublishedArticles(), listPublishedProducts()])
    const categories = Array.from(
      new Set([
        ...allProducts.map((product) => product.category).filter(Boolean),
        ...allArticles.map((candidate) => candidate.product?.category).filter(Boolean)
      ] as string[])
    ).sort((left, right) => left.localeCompare(right))
    const queryLabel = deslugify(slug) || slug

    return (
      <PublicShell>
        <RouteRecoveryPanel
          kicker="Guide Recovery"
          title="This exact buying guide is not available."
          description="Bes3 could not find that exact guide, so this route points you to nearby guides, likely products, and category pages instead."
          queryLabel={queryLabel}
          searchHref={`/search?q=${encodeURIComponent(queryLabel)}&scope=guide`}
          sections={[
            {
              eyebrow: 'Nearby guides',
              title: 'Closest guide pages',
              links: findSuggestedArticles(allArticles, slug, { type: 'guide', limit: 6 }).map((candidate) => ({
                href: getArticlePath(candidate.type, candidate.slug),
                label: candidate.title,
                note: candidate.summary || 'Open the nearest guide page.'
              }))
            },
            {
              eyebrow: 'Nearby products',
              title: 'Likely product matches',
              links: findSuggestedProducts(allProducts, slug, 6)
                .filter((candidate) => candidate.slug)
                .map((candidate) => ({
                  href: `/products/${candidate.slug}`,
                  label: candidate.productName,
                  note: candidate.description || 'Open the closest product page.'
                }))
            },
            {
              eyebrow: 'Nearby categories',
              title: 'Category pages that may match',
              links: findSuggestedCategories(categories, slug, 6).map((category) => ({
                href: buildCategoryPath(category),
                label: getCategoryLabel(category),
                note: 'Open the category page if the guide topic is still right but the exact slug was wrong.'
              }))
            }
          ]}
        />
      </PublicShell>
    )
  }

  const [allArticles, allProducts] = await Promise.all([listPublishedArticles(), listPublishedProducts()])
  const category = article.product?.category || null
  const categoryLabel = getCategoryLabel(category)
  const brandSlug = getBrandSlug(article.product?.brand)
  const snapshotDate = getSnapshotDate(article, article.product)
  const relatedReview = allArticles.find((candidate) => {
    if (candidate.type !== 'review') return false
    if (article.productId && candidate.productId === article.productId) return true
    if (category && categoryMatches(candidate.product?.category, category)) return true
    return false
  }) || null
  const relatedComparison = allArticles.find((candidate) => {
    if (candidate.type !== 'comparison') return false
    if (article.productId && candidate.productId === article.productId) return true
    if (category && categoryMatches(candidate.product?.category, category)) return true
    return false
  }) || null
  const peerProducts = allProducts
    .filter((candidate) => candidate.id !== article.product?.id && categoryMatches(candidate.category, category))
    .slice(0, 3)
  const path = `/guides/${article.slug}`
  const guideAlertHref = buildNewsletterPath({
    intent: category ? 'category-brief' : 'deals',
    category: category || '',
    cadence: 'weekly',
    returnTo: path,
    returnLabel: `Resume ${article.title}`,
    returnDescription: 'Come back to the same guide with the category framing and next-step context still intact.'
  })
  const guideDescription =
    pickMetadataDescription(article.seoDescription, article.summary) ||
    'Use this guide to understand what matters, narrow your options, and avoid starting over later.'
  const guideDocument = prepareEditorialHtmlWithToc(article.contentHtml)
  const breadcrumbItems = [
    { name: 'Home', path: '/' },
    { name: category ? categoryLabel : 'Directory', path: buildCategoryPath(category) },
    { name: article.title, path }
  ]
  const howToSteps = [
    {
      name: 'Start with what matters',
      text: 'Use the guide to understand the category basics, compatibility concerns, and the details that matter before you compare products.'
    },
    {
      name: 'Move into a real review',
      text: relatedReview
        ? 'Open the strongest review once the guide has narrowed what matters for your actual use case.'
        : 'Use the category page or shortlist when you are ready to move from general guidance into real options.'
    },
    {
      name: 'Keep your place',
      text: 'If you are not ready to buy yet, turn the category into a weekly update or alert so you can pick back up later without starting over.'
    }
  ]
  const structuredData = [
    buildBreadcrumbSchema(path, breadcrumbItems),
    buildWebPageSchema({
      path,
      title: article.seoTitle || article.title,
      description: guideDescription,
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
        '@id': `${toAbsoluteUrl(path)}#article`
      }
    }),
    buildArticleSchema({
      path,
      title: article.seoTitle || article.title,
      description: guideDescription,
      image: article.heroImageUrl || article.product?.heroImageUrl,
      datePublished: article.publishedAt || article.createdAt,
      dateModified: article.updatedAt || article.publishedAt || article.createdAt,
      type: 'Article',
      about: category
        ? {
            '@type': 'Thing',
            name: categoryLabel
          }
        : undefined
    }),
    buildHowToSchema(path, `How to use the ${article.title} guide`, 'Use the guide to understand the category, move into a real review, and keep your place if you are not ready to buy yet.', howToSteps)
  ]
  const faqEntries = [
    {
      question: 'What is this guide supposed to solve?',
      answer: 'Guides reduce confusion before your shortlist is tight enough for a review or comparison. They should help you understand the category, not keep you stuck in general browsing.'
    },
    {
      question: 'When should I open a brand page from a guide?',
      answer: article.product?.brand
        ? `Open the ${article.product.brand} page when the brand already looks promising and you want its related products and reviews in one place.`
        : 'Use the category page when you still need broader discovery before focusing on one brand.'
    },
    {
      question: 'What is the best next step after reading this guide?',
      answer: relatedReview
        ? 'Move into the strongest review next so the guidance becomes a real product choice.'
        : 'Go to the category page or shortlist next so the guide turns into concrete options instead of more open-ended browsing.'
    }
  ]
  const guideRoutes = [
    {
      eyebrow: 'Validate',
      title: relatedReview ? 'Open the lead review' : 'Browse the category page',
      description: relatedReview
        ? 'Once the guide helped you frame what matters, move into the strongest product review for a final fit check.'
        : 'Use the category page when you are ready to turn general guidance into concrete product options.',
      href: relatedReview ? getArticlePath(relatedReview.type, relatedReview.slug) : buildCategoryPath(category),
      label: relatedReview ? 'Open review' : 'Visit category page'
    },
    {
      eyebrow: 'Decide',
      title: relatedComparison ? 'Compare top picks' : 'Build a shortlist',
      description: relatedComparison
        ? 'Use the comparison only after the guide has clarified which tradeoffs actually matter to you.'
        : 'If you still need concrete options, move into a shortlist or category page before trying to compare.',
      href: relatedComparison ? getArticlePath(relatedComparison.type, relatedComparison.slug) : buildCategoryPath(category, 'category-shortlist'),
      label: relatedComparison ? 'Open comparison' : 'Open shortlist'
    },
    {
      eyebrow: 'Watch',
      title: category ? `Track ${categoryLabel}` : 'Track market changes',
      description: 'If this guide changed what you are looking for but you are not ready to buy yet, keep the category in view with a weekly update or alert.',
      href: guideAlertHref,
      label: 'Start category alerts'
    }
  ]

  return (
    <PublicShell>
      <StructuredData data={[...structuredData, buildFaqSchema(path, faqEntries)]} />
      <div className="mx-auto max-w-7xl space-y-12 px-4 py-14 sm:px-6 lg:px-8">
        <section className="overflow-hidden rounded-[2.5rem] bg-[linear-gradient(135deg,#0f172a_0%,#1d4ed8_55%,#0f766e_100%)] p-8 text-white shadow-[0_35px_80px_-45px_rgba(15,23,42,0.8)] sm:p-10">
          <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
            <div className="space-y-5">
              <Link href={buildCategoryPath(category)} className="inline-flex text-sm font-medium text-white/70 transition-colors hover:text-white">
                {category ? `Category / ${categoryLabel}` : 'Guide Library'}
              </Link>
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-emerald-200">Buying Guide</p>
              <h1 className="font-[var(--font-display)] text-5xl font-black tracking-tight sm:text-6xl">{article.title}</h1>
              <p className="max-w-3xl text-lg leading-8 text-slate-200">
                {article.summary || 'Use this guide to understand the category well enough to narrow a shortlist, validate tradeoffs, and avoid starting over later.'}
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
              <div className="rounded-[1.75rem] border border-white/12 bg-white/10 p-5 backdrop-blur-sm">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-200/85">Last checked</p>
                <p className="mt-3 text-lg font-black">{formatEditorialDate(snapshotDate)}</p>
                <p className="mt-2 text-sm leading-7 text-slate-200">{getFreshnessLabel(snapshotDate)}</p>
              </div>
              <div className="rounded-[1.75rem] border border-white/12 bg-white/10 p-5 backdrop-blur-sm">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-200/85">Best use</p>
                <p className="mt-3 text-sm leading-7 text-slate-200">
                  Use this guide when you still need category basics, compatibility context, or shopping advice before comparing products.
                </p>
              </div>
              <div className="rounded-[1.75rem] border border-white/12 bg-white/10 p-5 backdrop-blur-sm">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-200/85">Best next step</p>
                <p className="mt-3 text-sm leading-7 text-slate-200">
                  {relatedReview
                    ? 'Move into the strongest review once the category logic is clear.'
                    : 'Use the category page or shortlist once you are ready to narrow candidates.'}
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-[2.5rem] bg-[linear-gradient(135deg,#fff8ef_0%,#f8fbff_48%,#eefaf5_100%)] p-8 shadow-panel sm:p-10">
          <div className="grid gap-6 xl:grid-cols-[1fr_0.95fr] xl:items-start">
            <div>
              <p className="editorial-kicker">How To Use This Guide</p>
              <h2 className="mt-3 font-[var(--font-display)] text-4xl font-black tracking-tight text-foreground">Turn category knowledge into a clearer shortlist.</h2>
              <p className="mt-4 max-w-3xl text-sm leading-8 text-muted-foreground">
                Guides exist to make the category clearer before you compare or click through. Once the category rules are clear, move into a review, a shortlist, or an alert instead of circling the same choices again.
              </p>
              <div className="mt-6 rounded-[1.75rem] bg-slate-950 p-5 text-white">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-200">Best next step</p>
                <p className="mt-3 text-sm leading-7 text-slate-200">
                  {relatedReview
        ? 'This guide already has enough nearby pages to hand you into a real review next. Use it to narrow what matters, then move on.'
                    : 'Use this guide to frame the choice. The next useful move is a category page, shortlist, or alert rather than another general explainer.'}
                </p>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              {guideRoutes.map((route) => (
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

        <DecisionSummaryPanel
          eyebrow="Decision Summary"
          title="Use this guide to remove ambiguity, then move on purpose."
          description="A strong guide should answer four things fast: who still needs this explanation, who should stop reading, why the guide matters now, and what the next decision page should be."
          items={[
            {
              eyebrow: 'Who should use this',
              title: 'Buyers who still need category logic',
              description: 'Use the guide when you are still figuring out what matters, what to avoid, or how to evaluate products honestly before you start comparing.'
            },
            {
              eyebrow: 'Who should leave',
              title: relatedReview ? 'Buyers with one serious product candidate already' : 'Buyers whose category understanding is already clear',
              description: relatedReview
                ? 'Once one product looks promising, the guide has done its job. Move into the review instead of reading sideways forever.'
                : 'Once the category rules make sense, stop collecting more explanation and move into a category page or shortlist.',
              tone: 'muted'
            },
            {
              eyebrow: 'Why now',
              title: 'This guide is the explanation checkpoint',
              description: 'Use it to understand the category well enough that the next page can become a real shortlist, review, or comparison decision.'
            },
            {
              eyebrow: 'Next step',
              title: 'Shortlist, validate, or wait on purpose',
              description: 'If this guide already changed how you think about the category, move into the review, category page, or alerts instead of restarting from generic browsing later.',
              tone: 'strong'
            }
          ]}
        />

        <section className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr]">
          <article className="rounded-[2.5rem] bg-white p-8 shadow-panel sm:p-10">
            <div className="editorial-prose" dangerouslySetInnerHTML={{ __html: guideDocument.html }} />
          </article>

          <aside className="space-y-6">
            <GuideTableOfContents entries={guideDocument.toc} />
            {relatedReview ? (
              <Link href={getArticlePath(relatedReview.type, relatedReview.slug)} className="block rounded-[2rem] bg-white p-6 shadow-panel transition-transform hover:-translate-y-1">
                <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-primary">Lead Review</p>
                <h2 className="mt-3 font-[var(--font-display)] text-2xl font-black tracking-tight text-foreground">{relatedReview.title}</h2>
                <p className="mt-3 text-sm leading-7 text-muted-foreground">{relatedReview.summary}</p>
                <p className="mt-5 text-sm font-semibold text-primary">Open review →</p>
              </Link>
            ) : null}
            {relatedComparison ? (
              <Link href={getArticlePath(relatedComparison.type, relatedComparison.slug)} className="block rounded-[2rem] bg-white p-6 shadow-panel transition-transform hover:-translate-y-1">
                <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-primary">Related Comparison</p>
                <h2 className="mt-3 font-[var(--font-display)] text-2xl font-black tracking-tight text-foreground">{relatedComparison.title}</h2>
                <p className="mt-3 text-sm leading-7 text-muted-foreground">{relatedComparison.summary}</p>
                <p className="mt-5 text-sm font-semibold text-primary">Open comparison →</p>
              </Link>
            ) : null}
            {category || peerProducts.length ? (
              <div className="rounded-[2rem] bg-white p-6 shadow-panel">
                <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-primary">More In This Category</p>
                <div className="mt-5 space-y-3">
                  {category ? (
                    <Link href={buildCategoryPath(category)} className="block rounded-[1.25rem] bg-muted px-4 py-4 transition-colors hover:bg-emerald-50">
                      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">Category Page</p>
                      <p className="mt-2 text-base font-semibold text-foreground">{categoryLabel}</p>
                      <p className="mt-2 text-sm leading-7 text-muted-foreground">Reopen the full category page if you need more reviews, comparisons, and shortlist options.</p>
                    </Link>
                  ) : null}
                  {brandSlug && article.product?.brand ? (
                    <Link href={`/brands/${brandSlug}`} className="block rounded-[1.25rem] bg-muted px-4 py-4 transition-colors hover:bg-emerald-50">
                      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">Brand Page</p>
                      <p className="mt-2 text-base font-semibold text-foreground">{article.product.brand}</p>
                      <p className="mt-2 text-sm leading-7 text-muted-foreground">Use the brand page if one brand now looks promising and you want the rest of its related products and reviews in one place.</p>
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
            <div className="rounded-[2rem] bg-[linear-gradient(180deg,#f8fbff,#eef4ff)] p-6 shadow-panel">
              <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-primary">Guide Outcome</p>
              <p className="mt-4 text-sm leading-7 text-muted-foreground">
                A Bes3 guide is successful when it removes just enough ambiguity for you to narrow the field. If you still cannot act after reading, the next problem is usually shortlist quality, not missing more generic advice.
              </p>
            </div>
            <div className="rounded-[2rem] bg-white p-6 shadow-panel">
              <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-primary">Leave This Guide With A Plan</p>
              <div className="mt-5 space-y-3">
                <Link href={relatedReview ? getArticlePath(relatedReview.type, relatedReview.slug) : buildCategoryPath(category)} className="block rounded-[1.25rem] bg-muted px-4 py-4 transition-colors hover:bg-emerald-50">
                  <p className="text-sm font-semibold text-foreground">{relatedReview ? 'Open the lead review next' : 'Open the category page next'}</p>
                  <p className="mt-2 text-sm leading-7 text-muted-foreground">
                    {relatedReview
                      ? 'Use the review when one product now looks close enough for a real fit check.'
                      : 'Use the category page when the guide made the market clearer and you are ready to narrow real candidates.'}
                  </p>
                </Link>
                <Link href={relatedComparison ? getArticlePath(relatedComparison.type, relatedComparison.slug) : buildCategoryPath(category, 'category-shortlist')} className="block rounded-[1.25rem] bg-muted px-4 py-4 transition-colors hover:bg-emerald-50">
                  <p className="text-sm font-semibold text-foreground">{relatedComparison ? 'Compare top picks' : 'Build a shortlist'}</p>
                  <p className="mt-2 text-sm leading-7 text-muted-foreground">
                    {relatedComparison
                      ? 'Use comparison only after the guide has made the tradeoff criteria obvious.'
                      : 'If you still need options, move into shortlist instead of opening more generic explainers.'}
                  </p>
                </Link>
                <Link href={guideAlertHref} className="block rounded-[1.25rem] bg-muted px-4 py-4 transition-colors hover:bg-emerald-50">
                  <p className="text-sm font-semibold text-foreground">Track this category and come back later</p>
                  <p className="mt-2 text-sm leading-7 text-muted-foreground">
                    Save the category if timing is the blocker, so this guide stays attached to the same shopping task.
                  </p>
                </Link>
              </div>
            </div>
          </aside>
        </section>

        <SeoFaqSection
          title="Guide-page questions, answered clearly."
          entries={faqEntries}
          description="This FAQ explains the role of a guide in the Bes3 journey: reduce ambiguity, then move the buyer into a product, review, category, or brand page."
        />
      </div>
    </PublicShell>
  )
}
