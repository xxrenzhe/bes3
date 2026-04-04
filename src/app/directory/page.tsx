import Link from 'next/link'
import { PublicShell } from '@/components/layout/PublicShell'
import { ShortlistActionBar } from '@/components/site/ShortlistActionBar'
import { getArticlePath } from '@/lib/article-path'
import { formatEditorialDate, getCategoryLabel } from '@/lib/editorial'
import { toShortlistItem } from '@/lib/shortlist'
import { listCategories, listPublishedArticles, listPublishedProducts } from '@/lib/site-data'
import { formatPriceSnapshot } from '@/lib/utils'

export default async function DirectoryPage() {
  const [categories, articles, products] = await Promise.all([listCategories(), listPublishedArticles(), listPublishedProducts()])
  const leadCategory = categories[0] || ''
  const directoryRoutes = [
    {
      eyebrow: 'Start',
      title: 'Search a concrete need',
      description: 'Use search when you already know the product type or use case and want Bes3 to narrow it fast.',
      href: '/search?scope=products',
      label: 'Search candidates'
    },
    {
      eyebrow: 'Browse',
      title: leadCategory ? `Open ${getCategoryLabel(leadCategory)}` : 'Open a category hub',
      description: 'Category hubs work best once the lane is clear and you want the strongest products, reviews, and comparisons in one place.',
      href: leadCategory ? `/categories/${leadCategory}` : '/directory',
      label: leadCategory ? 'Open lead hub' : 'Browse hubs'
    },
    {
      eyebrow: 'Watch',
      title: 'Start category briefs',
      description: 'If you are researching now but buying later, save the category context as an alert flow instead of reopening the whole search later.',
      href: '/newsletter?intent=category-brief&cadence=weekly',
      label: 'Start alerts'
    },
    {
      eyebrow: 'Deals',
      title: 'Check live price opportunities',
      description: 'Move into deals only after category fit is credible, so markdowns do not pull you into the wrong product lane.',
      href: '/deals',
      label: 'Browse deals'
    }
  ]

  return (
    <PublicShell>
      <div className="mx-auto max-w-7xl space-y-14 px-4 py-14 sm:px-6 lg:px-8">
        <section className="rounded-[2.5rem] bg-[linear-gradient(135deg,#fff8ef_0%,#f8fbff_48%,#eefaf5_100%)] p-8 shadow-panel sm:p-10">
          <div className="grid gap-8 xl:grid-cols-[1fr_0.95fr] xl:items-start">
            <div>
              <p className="editorial-kicker">Buyer Directory</p>
              <h1 className="mt-4 font-[var(--font-display)] text-5xl font-black tracking-tight text-foreground sm:text-6xl">Browse the Bes3 shortlist by category.</h1>
              <p className="mt-4 max-w-3xl text-lg leading-8 text-muted-foreground">
                Use the directory once you know the general lane. Each category card now points buyers toward the cleanest next move instead of acting like a raw archive dump.
              </p>
              <div className="mt-6 rounded-[1.75rem] bg-slate-950 p-5 text-white">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-200">Best current route</p>
                <p className="mt-3 text-sm leading-7 text-slate-200">
                  Start in a category hub when you already know the market lane, switch to search when the need is still query-shaped, and use alerts when price timing matters more than immediate action.
                </p>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {directoryRoutes.map((route) => (
                <Link
                  key={route.title}
                  href={route.href}
                  className="rounded-[1.75rem] bg-white p-6 shadow-[0_24px_60px_-40px_rgba(15,23,42,0.35)] transition-transform hover:-translate-y-1"
                >
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">{route.eyebrow}</p>
                  <h2 className="mt-3 font-[var(--font-display)] text-2xl font-black tracking-tight text-foreground">{route.title}</h2>
                  <p className="mt-3 text-sm leading-7 text-muted-foreground">{route.description}</p>
                  <p className="mt-5 text-sm font-semibold text-primary">{route.label} →</p>
                </Link>
              ))}
            </div>
          </div>
        </section>
        <div className="grid gap-8 xl:grid-cols-3">
          {categories.map((category) => {
            const categoryArticles = articles.filter((article) => article.product?.category === category)
            const categoryProducts = products.filter((product) => product.category === category)
            const featuredArticle = categoryArticles[0] || null
            const featuredProduct = categoryProducts[0] || null
            const featuredReview = categoryArticles.find((article) => article.type === 'review') || null
            const featuredComparison = categoryArticles.find((article) => article.type === 'comparison') || null
            const featuredDecisionArticle = featuredComparison || featuredReview || featuredArticle
            const bestRouteLabel =
              categoryProducts.length >= 2
                ? 'Shortlist this category'
                : featuredComparison
                  ? 'Compare inside this lane'
                  : featuredReview
                  ? 'Validate with the lead review'
                  : featuredArticle
                    ? `Open the lead ${featuredArticle.type}`
                  : 'Use alerts while coverage builds'
            const latestRefresh =
              featuredArticle?.updatedAt ||
              featuredArticle?.publishedAt ||
              featuredProduct?.updatedAt ||
              featuredProduct?.publishedAt ||
              null

            return (
              <div key={category} className="rounded-[2rem] bg-white p-7 shadow-panel">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="border-l-2 border-primary pl-3 text-xs font-bold uppercase tracking-[0.16em] text-foreground">{category.replace(/-/g, ' ')}</h2>
                    <p className="mt-4 text-sm leading-7 text-muted-foreground">
                      {categoryProducts.length} products · {categoryArticles.length} published pages · Refreshed {formatEditorialDate(latestRefresh, 'soon')}
                    </p>
                    <p className="mt-3 text-sm font-semibold text-foreground">{bestRouteLabel}</p>
                  </div>
                  <Link href={`/categories/${category}`} className="text-sm font-semibold text-primary transition-colors hover:text-emerald-700">
                    Open hub →
                  </Link>
                </div>

                {featuredProduct ? (
                  <div className="mt-6 rounded-[1.5rem] bg-muted/50 p-5">
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">Start here</p>
                    <h3 className="mt-3 font-[var(--font-display)] text-2xl font-black tracking-tight text-foreground">{featuredProduct.productName}</h3>
                    <p className="mt-3 text-sm leading-7 text-muted-foreground">
                      {featuredProduct.description || 'Current price context and a clean path into the product-level Bes3 verdict.'}
                    </p>
                    <ShortlistActionBar item={toShortlistItem(featuredProduct)} compact className="mt-4" source="directory-category-start" />
                    <div className="mt-4 flex items-center justify-between gap-4">
                      <span className="text-sm font-semibold text-foreground">
                        {formatPriceSnapshot(featuredProduct.priceAmount, featuredProduct.priceCurrency || 'USD')}
                      </span>
                      {featuredProduct.slug ? (
                        <Link href={`/products/${featuredProduct.slug}`} className="text-sm font-semibold text-primary transition-colors hover:text-emerald-700">
                          Open deep-dive →
                        </Link>
                      ) : null}
                    </div>
                  </div>
                ) : null}

                <div className="mt-6 space-y-3 text-sm text-muted-foreground">
                  {categoryArticles.slice(0, 3).map((article) => (
                    <Link key={article.id} href={getArticlePath(article.type, article.slug)} className="block rounded-[1.25rem] border border-border/60 px-4 py-3 transition-colors hover:border-primary/30 hover:text-primary">
                      {article.title}
                    </Link>
                  ))}
                  {!featuredArticle && !featuredProduct ? <p>Coverage is still being built for this category.</p> : null}
                </div>

                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  <Link href={`/categories/${category}#category-shortlist`} className="rounded-[1.25rem] bg-muted px-4 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-emerald-50">
                    Open shortlist lane →
                  </Link>
                  <Link
                    href={
                      featuredComparison
                        ? getArticlePath(featuredComparison.type, featuredComparison.slug)
                        : featuredDecisionArticle
                          ? getArticlePath(featuredDecisionArticle.type, featuredDecisionArticle.slug)
                          : `/newsletter?intent=category-brief&category=${encodeURIComponent(category)}&cadence=weekly`
                    }
                    className="rounded-[1.25rem] bg-muted px-4 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-emerald-50"
                  >
                    {featuredComparison
                      ? 'Open comparison →'
                      : featuredReview
                        ? 'Open lead review →'
                        : featuredDecisionArticle
                          ? `Open ${featuredDecisionArticle.type} →`
                          : 'Track this category →'}
                  </Link>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </PublicShell>
  )
}
