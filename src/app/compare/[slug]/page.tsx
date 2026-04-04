import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { PublicShell } from '@/components/layout/PublicShell'
import { PrimaryCta } from '@/components/site/PrimaryCta'
import { ShortlistActionBar } from '@/components/site/ShortlistActionBar'
import { getArticlePath } from '@/lib/article-path'
import { buildBestFor, buildDecisionChecklist, buildNotFor, formatEditorialDate, getCategoryLabel, getFreshnessLabel, getSnapshotDate } from '@/lib/editorial'
import { buildPageMetadata, pickMetadataDescription } from '@/lib/metadata'
import { buildMerchantExitPath } from '@/lib/merchant-links'
import { toShortlistItem } from '@/lib/shortlist'
import { getArticleBySlug, listPublishedArticles } from '@/lib/site-data'
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
      robots: {
        index: false,
        follow: false
      }
    })
  }

  return buildPageMetadata({
    title: article.seoTitle || article.title,
    description:
      pickMetadataDescription(article.seoDescription, article.summary) ||
      'Use this Bes3 comparison to settle a shortlist, understand the tradeoffs, and move into the winner with less buyer regret.',
    path: `/compare/${article.slug}`,
    image: article.heroImageUrl || article.product?.heroImageUrl,
    type: 'article'
  })
}

export default async function ComparisonPage({
  params
}: {
  params: Promise<{ slug: string }>
}) {
  const article = await getArticleBySlug((await params).slug)
  if (!article || article.type !== 'comparison') notFound()

  const allArticles = await listPublishedArticles()
  const contenders = splitComparisonTitle(article.title)
  const winner = article.product?.productName || contenders.left
  const category = article.product?.category || null
  const categoryLabel = getCategoryLabel(category)
  const priceLabel = formatPriceSnapshot(article.product?.priceAmount, article.product?.priceCurrency || 'USD')
  const snapshotDate = getSnapshotDate(article, article.product)
  const decisionChecklist = buildDecisionChecklist(article.product)
  const relatedReview = allArticles.find((candidate) => {
    if (candidate.type !== 'review') return false
    if (article.productId && candidate.productId === article.productId) return true
    if (category && candidate.product?.category === category) return true
    return false
  }) || null
  const comparisonRoutes = [
    {
      eyebrow: 'Winner',
      title: article.product?.slug ? 'Open the winning product' : 'Use this winner as the default',
      description: article.product?.slug
        ? 'Move into the product page when the comparison answered the lane and you now just need pricing, specs, and merchant verification.'
        : 'The comparison already did the hard narrowing work. Treat the editorial winner as your default answer unless a blocker remains.',
      href: article.product?.slug ? `/products/${article.product.slug}` : getArticlePath(article.type, article.slug),
      label: article.product?.slug ? 'Open winner deep-dive' : 'Stay with the verdict'
    },
    {
      eyebrow: 'Validate',
      title: relatedReview ? 'Read the supporting review' : 'Recheck the category lane',
      description: relatedReview
        ? 'Use the review when you want the strongest product-level rationale behind the winner before clicking through.'
        : 'Go back to the category lane if the finalists still do not feel grounded in your actual use case.',
      href: relatedReview ? getArticlePath(relatedReview.type, relatedReview.slug) : category ? `/categories/${category}` : '/shortlist',
      label: relatedReview ? 'Open review verdict' : 'Browse category hub'
    },
    {
      eyebrow: 'Watch',
      title: category ? `Track ${categoryLabel}` : 'Track a better deal',
      description: 'If price timing is the only unresolved variable, convert this comparison into a watch flow instead of restarting your research later.',
      href: category
        ? `/newsletter?intent=price-alert&category=${encodeURIComponent(category)}&cadence=priority`
        : '/newsletter?intent=deals&cadence=priority',
      label: 'Start price watch'
    },
    {
      eyebrow: 'Return',
      title: 'Keep the shortlist clean',
      description: 'If neither finalist is quite right, go back to the shortlist or category lane instead of branching into unrelated products.',
      href: category ? `/categories/${category}#category-shortlist` : '/shortlist',
      label: 'Reopen shortlist lane'
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
                  <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground">Freshness</p>
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
                <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-primary">Editorial Verdict</p>
                <h2 className="mt-3 font-[var(--font-display)] text-3xl font-black tracking-tight text-foreground">{winner}</h2>
                <p className="mt-3 text-sm leading-7 text-muted-foreground">
                  Best overall for shoppers who want the cleanest balance of confidence, practicality, and lowest-regret purchase risk.
                </p>
                <div className="mt-5 grid gap-3">
                  <div className="rounded-[1.25rem] bg-white p-4">
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Current price snapshot</p>
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
              <h2 className="mt-3 font-[var(--font-display)] text-4xl font-black tracking-tight text-foreground">Land the decision without restarting research.</h2>
              <p className="mt-4 max-w-3xl text-sm leading-8 text-muted-foreground">
                A comparison should settle the buying lane, not create a new one. Pick the action that matches what is still unresolved: product confidence, price timing, or one last category pass.
              </p>
              <div className="mt-6 rounded-[1.75rem] bg-slate-950 p-5 text-white">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-200">Best current route</p>
                <p className="mt-3 text-sm leading-7 text-slate-200">
                  {article.product?.slug
                    ? 'This comparison already gave you a likely winner. The cleanest next move is the product page, where price, specs, and merchant readiness can be checked without reopening the whole decision.'
                    : 'This page already carries the main decision weight. Use a review or shortlist route only if you still need extra buyer-fit confidence.'}
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
            <div className="editorial-prose mt-6" dangerouslySetInnerHTML={{ __html: article.contentHtml }} />
          </article>

          <aside className="space-y-6">
            <div className="rounded-[2rem] bg-white p-6 shadow-panel">
              <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-primary">Decision Framework</p>
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
                If you only need the answer fast, start with <span className="font-semibold text-foreground">{winner}</span>. The supporting article below exists for buyers who want the why, not just the verdict.
              </p>
            </div>
          </aside>
        </section>
      </div>
    </PublicShell>
  )
}
