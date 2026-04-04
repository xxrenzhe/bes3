import Link from 'next/link'
import { notFound } from 'next/navigation'
import { PublicShell } from '@/components/layout/PublicShell'
import { getArticlePath } from '@/lib/article-path'
import { formatEditorialDate, getCategoryLabel, getFreshnessLabel, getSnapshotDate } from '@/lib/editorial'
import { getArticleBySlug, listPublishedArticles } from '@/lib/site-data'

export default async function GuidePage({
  params
}: {
  params: Promise<{ slug: string }>
}) {
  const article = await getArticleBySlug((await params).slug)
  if (!article || article.type !== 'guide') notFound()

  const allArticles = await listPublishedArticles()
  const category = article.product?.category || null
  const categoryLabel = getCategoryLabel(category)
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
  const guideRoutes = [
    {
      eyebrow: 'Validate',
      title: relatedReview ? 'Open the lead review' : 'Browse the category hub',
      description: relatedReview
        ? 'Once the guide helped you frame the decision, move into the strongest product verdict for buyer-fit confirmation.'
        : 'Use the category lane when you are ready to narrow general guidance into concrete product candidates.',
      href: relatedReview ? getArticlePath(relatedReview.type, relatedReview.slug) : category ? `/categories/${category}` : '/directory',
      label: relatedReview ? 'Open review verdict' : 'Visit category hub'
    },
    {
      eyebrow: 'Decide',
      title: relatedComparison ? 'Compare real finalists' : 'Build a shortlist',
      description: relatedComparison
        ? 'Use the comparison only after the guide has clarified what tradeoffs actually matter for your decision.'
        : 'If you still need concrete options, move into shortlist or category coverage before trying to compare.',
      href: relatedComparison ? getArticlePath(relatedComparison.type, relatedComparison.slug) : category ? `/categories/${category}#category-shortlist` : '/shortlist',
      label: relatedComparison ? 'Open comparison' : 'Open shortlist lane'
    },
    {
      eyebrow: 'Watch',
      title: category ? `Track ${categoryLabel}` : 'Track market changes',
      description: 'If this guide changed what you are looking for but you are not ready to buy yet, keep the context alive with a category briefing flow.',
      href: category
        ? `/newsletter?intent=category-brief&category=${encodeURIComponent(category)}&cadence=weekly`
        : '/newsletter?intent=deals&cadence=weekly',
      label: 'Start category alerts'
    }
  ]

  return (
    <PublicShell>
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
                {article.summary || 'Use this guide to understand the category well enough to narrow a shortlist, validate tradeoffs, and avoid reopening the same research loop later.'}
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
              <div className="rounded-[1.75rem] border border-white/12 bg-white/10 p-5 backdrop-blur-sm">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-200/85">Guide freshness</p>
                <p className="mt-3 text-lg font-black">{formatEditorialDate(snapshotDate)}</p>
                <p className="mt-2 text-sm leading-7 text-slate-200">{getFreshnessLabel(snapshotDate)}</p>
              </div>
              <div className="rounded-[1.75rem] border border-white/12 bg-white/10 p-5 backdrop-blur-sm">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-200/85">Best use</p>
                <p className="mt-3 text-sm leading-7 text-slate-200">
                  Use this guide when you still need category logic, compatibility context, or buying heuristics before comparing products.
                </p>
              </div>
              <div className="rounded-[1.75rem] border border-white/12 bg-white/10 p-5 backdrop-blur-sm">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-200/85">Next route</p>
                <p className="mt-3 text-sm leading-7 text-slate-200">
                  {relatedReview
                    ? 'Move into the strongest review once the category logic is clear.'
                    : 'Use the category hub or shortlist once you are ready to narrow candidates.'}
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-[2.5rem] bg-[linear-gradient(135deg,#fff8ef_0%,#f8fbff_48%,#eefaf5_100%)] p-8 shadow-panel sm:p-10">
          <div className="grid gap-6 xl:grid-cols-[1fr_0.95fr] xl:items-start">
            <div>
              <p className="editorial-kicker">How To Use This Guide</p>
              <h2 className="mt-3 font-[var(--font-display)] text-4xl font-black tracking-tight text-foreground">Turn category knowledge into a cleaner buying lane.</h2>
              <p className="mt-4 max-w-3xl text-sm leading-8 text-muted-foreground">
                Guides exist to reduce ambiguity before you compare or click through. Once the category rules are clear, move into a verdict, a shortlist, or an alert flow instead of staying in pure research mode.
              </p>
              <div className="mt-6 rounded-[1.75rem] bg-slate-950 p-5 text-white">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-200">Best current route</p>
                <p className="mt-3 text-sm leading-7 text-slate-200">
                  {relatedReview
                    ? 'This guide already has enough nearby editorial coverage to hand you into a real verdict next. Use it to narrow what matters, then move on.'
                    : 'Use this guide as decision framing. The next useful move is a category hub, shortlist, or alert flow rather than another abstract explainer.'}
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
            <div className="editorial-prose" dangerouslySetInnerHTML={{ __html: article.contentHtml }} />
          </article>

          <aside className="space-y-6">
            {relatedReview ? (
              <Link href={getArticlePath(relatedReview.type, relatedReview.slug)} className="block rounded-[2rem] bg-white p-6 shadow-panel transition-transform hover:-translate-y-1">
                <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-primary">Lead Review</p>
                <h2 className="mt-3 font-[var(--font-display)] text-2xl font-black tracking-tight text-foreground">{relatedReview.title}</h2>
                <p className="mt-3 text-sm leading-7 text-muted-foreground">{relatedReview.summary}</p>
                <p className="mt-5 text-sm font-semibold text-primary">Open review verdict →</p>
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
            <div className="rounded-[2rem] bg-[linear-gradient(180deg,#f8fbff,#eef4ff)] p-6 shadow-panel">
              <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-primary">Guide Outcome</p>
              <p className="mt-4 text-sm leading-7 text-muted-foreground">
                A Bes3 guide is successful when it removes just enough ambiguity for you to narrow the field. If you still cannot act after reading, the next problem is usually shortlist quality, not missing more generic advice.
              </p>
            </div>
          </aside>
        </section>
      </div>
    </PublicShell>
  )
}
