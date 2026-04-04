import Image from 'next/image'
import Link from 'next/link'
import { PublicShell } from '@/components/layout/PublicShell'
import { ProductSpotlightCard } from '@/components/site/ProductSpotlightCard'
import { getArticlePath } from '@/lib/article-path'
import { formatEditorialDate } from '@/lib/editorial'
import { listPublishedArticles, listPublishedProducts } from '@/lib/site-data'

export default async function CategoryPage({
  params
}: {
  params: Promise<{ slug: string }>
}) {
  const slug = (await params).slug
  const [allArticles, allProducts] = await Promise.all([listPublishedArticles(), listPublishedProducts()])
  const articles = allArticles.filter((article) => article.product?.category === slug)
  const products = allProducts.filter((product) => product.category === slug)
  const [featured, ...rest] = articles
  const featuredReview = articles.find((article) => article.type === 'review') || featured || null
  const featuredComparison = articles.find((article) => article.type === 'comparison') || null
  const featuredGuide = articles.find((article) => article.type === 'guide') || null
  const latestRefresh = [
    ...articles.map((article) => article.updatedAt || article.publishedAt || article.createdAt),
    ...products.map((product) => product.updatedAt || product.publishedAt)
  ].find(Boolean)
  const reviewCount = articles.filter((article) => article.type === 'review').length
  const comparisonCount = articles.filter((article) => article.type === 'comparison').length
  const categoryLabel = slug.replace(/-/g, ' ')
  const secondaryArticles = rest.filter((article) => article.id !== featuredGuide?.id)
  const buyerRoutes = [
    {
      eyebrow: 'Start',
      title: 'Find serious candidates',
      description: 'Open the shortlist cards first when you still need Bes3 to narrow this category into products worth saving.',
      href: '#category-shortlist',
      label: 'Jump to category shortlist'
    },
    {
      eyebrow: 'Validate',
      title: 'Read the lead verdict',
      description: 'Use the strongest review when one product is already catching your eye and you want buyer fit before comparing.',
      href: featuredReview ? getArticlePath(featuredReview.type, featuredReview.slug) : '/search',
      label: featuredReview ? 'Open lead review' : 'Search review archive'
    },
    {
      eyebrow: 'Decide',
      title: 'Compare finalists',
      description: 'Keep compare inside one category lane so tradeoffs stay honest, especially once you already have two credible options.',
      href: featuredComparison ? getArticlePath(featuredComparison.type, featuredComparison.slug) : '/shortlist',
      label: featuredComparison ? 'Open category comparison' : 'Use shortlist compare'
    },
    {
      eyebrow: 'Watch',
      title: 'Track this category',
      description: 'If the purchase is not happening today, turn this category into a price watch or briefing flow instead of losing the decision context.',
      href: `/newsletter?intent=category-brief&category=${encodeURIComponent(slug)}&cadence=weekly`,
      label: 'Start category alerts'
    }
  ]

  return (
    <PublicShell>
      <div className="mx-auto max-w-7xl space-y-12 px-4 py-14 sm:px-6 lg:px-8">
        <section className="overflow-hidden rounded-[2.5rem] bg-[linear-gradient(135deg,#0f172a_0%,#1d4ed8_55%,#0f766e_100%)] p-8 text-white shadow-[0_35px_80px_-45px_rgba(15,23,42,0.8)] sm:p-10">
          <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
            <div className="space-y-5">
              <Link href="/directory" className="inline-flex text-sm font-medium text-white/70 transition-colors hover:text-white">
                Directory / {categoryLabel}
              </Link>
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-emerald-200">Category Hub</p>
              <h1 className="font-[var(--font-display)] text-5xl font-black tracking-tight sm:text-6xl">{categoryLabel}</h1>
              <p className="max-w-3xl text-lg leading-8 text-slate-200">
                Bes3 uses this hub to narrow the category into real product options, current editorial verdicts, and the shortest path from research mode to an informed click.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
              <div className="rounded-[1.75rem] border border-white/12 bg-white/10 p-5 backdrop-blur-sm">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-200/85">Product deep-dives</p>
                <p className="mt-3 text-3xl font-black">{products.length}</p>
              </div>
              <div className="rounded-[1.75rem] border border-white/12 bg-white/10 p-5 backdrop-blur-sm">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-200/85">Reviews + comparisons</p>
                <p className="mt-3 text-3xl font-black">{reviewCount + comparisonCount}</p>
              </div>
              <div className="rounded-[1.75rem] border border-white/12 bg-white/10 p-5 backdrop-blur-sm">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-200/85">Latest refresh</p>
                <p className="mt-3 text-lg font-black">{formatEditorialDate(latestRefresh, 'Building coverage')}</p>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-[2.5rem] bg-[linear-gradient(135deg,#fff8ef_0%,#f8fbff_48%,#eefaf5_100%)] p-8 shadow-panel sm:p-10">
          <div className="grid gap-6 xl:grid-cols-[1fr_0.95fr] xl:items-start">
            <div>
              <p className="editorial-kicker">How To Use This Category</p>
              <h2 className="mt-3 font-[var(--font-display)] text-4xl font-black tracking-tight text-foreground">Move from browsing to a real buying lane.</h2>
              <p className="mt-4 max-w-3xl text-sm leading-8 text-muted-foreground">
                {categoryLabel} works best when you treat it as one clean decision lane: shortlist credible candidates, validate one product with a verdict page, compare only real finalists, and switch to alerts if the purchase is still waiting.
              </p>
              <div className="mt-6 rounded-[1.75rem] bg-slate-950 p-5 text-white">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-200">Best current route</p>
                <p className="mt-3 text-sm leading-7 text-slate-200">
                  {products.length >= 2
                    ? 'This category already has enough product coverage to shortlist and compare inside one lane. Start with the top candidates below, then use a review or comparison page once the field is smaller.'
                    : 'Coverage here is still early. Start with the strongest available product or verdict, then use alerts to wait for deeper category coverage if needed.'}
                </p>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {buyerRoutes.map((route) => (
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

        {products.length ? (
          <section id="category-shortlist" className="space-y-6">
            <div>
              <p className="editorial-kicker">Shortlist</p>
              <h2 className="mt-3 font-[var(--font-display)] text-4xl font-black tracking-tight text-foreground">Start with the strongest buying options.</h2>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-muted-foreground">
                These product pages give buyers the fastest path into price context, specs, and merchant-ready decisions without losing the category view.
              </p>
            </div>
            <div className="grid gap-6 xl:grid-cols-3">
              {products.slice(0, 3).map((product) => (
                <ProductSpotlightCard key={product.id} product={product} source="category-hub-shortlist" />
              ))}
            </div>
          </section>
        ) : null}

        {featured ? (
          <div className="grid gap-8 lg:grid-cols-12">
            <Link href={getArticlePath(featured.type, featured.slug)} className="group overflow-hidden rounded-[2.5rem] bg-white shadow-panel lg:col-span-8">
              <div className="relative aspect-[16/9] overflow-hidden bg-[linear-gradient(135deg,#e5eeff,#dfe9fa)]">
                {featured.heroImageUrl ? (
                  <Image
                    src={featured.heroImageUrl}
                    alt={featured.title}
                    fill
                    sizes="(max-width: 1024px) 100vw, 60vw"
                    className="object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                ) : (
                  <div className="bg-grid absolute inset-0" />
                )}
              </div>
              <div className="space-y-5 p-10">
                <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-[0.22em] text-primary">
                  <span className="rounded-full bg-secondary px-3 py-1 text-secondary-foreground">{featured.type}</span>
                  <span>Featured verdict</span>
                </div>
                <h2 className="font-[var(--font-display)] text-4xl font-black tracking-tight text-foreground">{featured.title}</h2>
                <p className="max-w-3xl text-base leading-8 text-muted-foreground">{featured.summary}</p>
              </div>
            </Link>
            <div className="space-y-6 lg:col-span-4">
              {featuredGuide ? (
                <Link href={getArticlePath(featuredGuide.type, featuredGuide.slug)} className="block rounded-[2rem] border border-emerald-200 bg-emerald-50/80 p-7 shadow-panel transition-transform hover:-translate-y-1">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-emerald-700">Guide</p>
                  <h3 className="mt-3 font-[var(--font-display)] text-2xl font-black tracking-tight text-foreground">{featuredGuide.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-muted-foreground">{featuredGuide.summary}</p>
                </Link>
              ) : null}
              {secondaryArticles.slice(0, 2).map((article) => (
                <Link key={article.id} href={getArticlePath(article.type, article.slug)} className="block rounded-[2rem] bg-white p-7 shadow-panel transition-transform hover:-translate-y-1">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-primary">{article.type}</p>
                  <h3 className="mt-3 font-[var(--font-display)] text-2xl font-black tracking-tight text-foreground">{article.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-muted-foreground">{article.summary}</p>
                </Link>
              ))}
            </div>
            {secondaryArticles.slice(2).map((article) => (
              <Link key={article.id} href={getArticlePath(article.type, article.slug)} className="block rounded-[2rem] bg-white p-7 shadow-panel transition-transform hover:-translate-y-1 lg:col-span-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-primary">{article.type}</p>
                <h3 className="mt-3 font-[var(--font-display)] text-2xl font-black tracking-tight text-foreground">{article.title}</h3>
                <p className="mt-3 text-sm leading-7 text-muted-foreground">{article.summary}</p>
              </Link>
            ))}
          </div>
        ) : (
          <div className="rounded-[2rem] bg-white p-10 text-center shadow-panel">
            <h2 className="font-[var(--font-display)] text-3xl font-black tracking-tight">Editorial coverage is still being built.</h2>
            <p className="mt-3 text-sm leading-7 text-muted-foreground">
              Bes3 already recognizes this category, but the supporting review and comparison archive is still being expanded.
            </p>
          </div>
        )}
      </div>
    </PublicShell>
  )
}
