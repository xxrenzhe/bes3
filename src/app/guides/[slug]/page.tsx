import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { PublicShell } from '@/components/layout/PublicShell'
import { GuideTableOfContents } from '@/components/site/GuideTableOfContents'
import { SeoFaqSection } from '@/components/site/SeoFaqSection'
import { StructuredData } from '@/components/site/StructuredData'
import { getArticlePath } from '@/lib/article-path'
import { prepareEditorialHtmlWithToc } from '@/lib/editorial-html'
import { formatEditorialDate, getCategoryLabel, getFreshnessLabel, getSnapshotDate } from '@/lib/editorial'
import { buildPageMetadata, pickMetadataDescription } from '@/lib/metadata'
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
      title: 'Guide Not Found',
      description: 'This Bes3 buying guide is unavailable.',
      path: `/guides/${slug}`,
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
      'Use this guide to understand what matters, narrow your options, and avoid repeating the same research later.',
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
  const article = await getArticleBySlug((await params).slug)
  if (!article || article.type !== 'guide') notFound()

  const [allArticles, allProducts] = await Promise.all([listPublishedArticles(), listPublishedProducts()])
  const category = article.product?.category || null
  const categoryLabel = getCategoryLabel(category)
  const brandSlug = getBrandSlug(article.product?.brand)
  const snapshotDate = getSnapshotDate(article, article.product)
  const relatedReview = allArticles.find((candidate) => {
    if (candidate.type !== 'review') return false
    if (article.productId && candidate.productId === article.productId) return true
    if (category && candidate.product?.category === category) return true
    return false
  }) || null
  const relatedComparison = allArticles.find((candidate) => {
    if (candidate.type !== 'comparison') return false
    if (article.productId && candidate.productId === article.productId) return true
    if (category && candidate.product?.category === category) return true
    return false
  }) || null
  const peerProducts = allProducts
    .filter((candidate) => candidate.id !== article.product?.id && candidate.category === category)
    .slice(0, 3)
  const path = `/guides/${article.slug}`
  const guideDescription =
    pickMetadataDescription(article.seoDescription, article.summary) ||
    'Use this guide to understand what matters, narrow your options, and avoid repeating the same research later.'
  const guideDocument = prepareEditorialHtmlWithToc(article.contentHtml)
  const breadcrumbItems = [
    { name: 'Home', path: '/' },
    { name: category ? categoryLabel : 'Directory', path: category ? `/categories/${category}` : '/directory' },
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
      text: 'If you are not ready to buy yet, turn the category into a weekly update or alert instead of repeating the same research later.'
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
      answer: 'Guides reduce confusion before your shortlist is tight enough for a review or comparison. They should help you understand the category, not trap you in abstract research.'
    },
    {
      question: 'When should I open a brand page from a guide?',
      answer: article.product?.brand
        ? `Open the ${article.product.brand} page when the brand already looks promising and you want its related Bes3 coverage in one place.`
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
      href: relatedReview ? getArticlePath(relatedReview.type, relatedReview.slug) : category ? `/categories/${category}` : '/directory',
      label: relatedReview ? 'Open review' : 'Visit category page'
    },
    {
      eyebrow: 'Decide',
      title: relatedComparison ? 'Compare top picks' : 'Build a shortlist',
      description: relatedComparison
        ? 'Use the comparison only after the guide has clarified which tradeoffs actually matter to you.'
        : 'If you still need concrete options, move into a shortlist or category page before trying to compare.',
      href: relatedComparison ? getArticlePath(relatedComparison.type, relatedComparison.slug) : category ? `/categories/${category}#category-shortlist` : '/shortlist',
      label: relatedComparison ? 'Open comparison' : 'Open shortlist'
    },
    {
      eyebrow: 'Watch',
      title: category ? `Track ${categoryLabel}` : 'Track market changes',
      description: 'If this guide changed what you are looking for but you are not ready to buy yet, keep the category in view with a weekly update or alert.',
      href: category
        ? `/newsletter?intent=category-brief&category=${encodeURIComponent(category)}&cadence=weekly`
        : '/newsletter?intent=deals&cadence=weekly',
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
              <Link href={category ? `/categories/${category}` : '/directory'} className="inline-flex text-sm font-medium text-white/70 transition-colors hover:text-white">
                {category ? `Category / ${categoryLabel}` : 'Guide Library'}
              </Link>
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-emerald-200">Buying Guide</p>
              <h1 className="font-[var(--font-display)] text-5xl font-black tracking-tight sm:text-6xl">{article.title}</h1>
              <p className="max-w-3xl text-lg leading-8 text-slate-200">
                {article.summary || 'Use this guide to understand the category well enough to narrow a shortlist, validate tradeoffs, and avoid repeating the same research later.'}
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
                Guides exist to make the category clearer before you compare or click through. Once the category rules are clear, move into a review, a shortlist, or an alert instead of staying stuck in research mode.
              </p>
              <div className="mt-6 rounded-[1.75rem] bg-slate-950 p-5 text-white">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-200">Best next step</p>
                <p className="mt-3 text-sm leading-7 text-slate-200">
                  {relatedReview
                    ? 'This guide already has enough nearby coverage to hand you into a real review next. Use it to narrow what matters, then move on.'
                    : 'Use this guide to frame the choice. The next useful move is a category page, shortlist, or alert rather than another abstract explainer.'}
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
                    <Link href={`/categories/${category}`} className="block rounded-[1.25rem] bg-muted px-4 py-4 transition-colors hover:bg-emerald-50">
                      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">Category Page</p>
                      <p className="mt-2 text-base font-semibold text-foreground">{categoryLabel}</p>
                      <p className="mt-2 text-sm leading-7 text-muted-foreground">Reopen the full category page if you need more reviews, comparisons, and shortlist options.</p>
                    </Link>
                  ) : null}
                  {brandSlug && article.product?.brand ? (
                    <Link href={`/brands/${brandSlug}`} className="block rounded-[1.25rem] bg-muted px-4 py-4 transition-colors hover:bg-emerald-50">
                      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">Brand Page</p>
                      <p className="mt-2 text-base font-semibold text-foreground">{article.product.brand}</p>
                      <p className="mt-2 text-sm leading-7 text-muted-foreground">Use the brand page if one brand now looks promising and you want the rest of its Bes3 coverage in one place.</p>
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
