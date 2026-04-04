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
  const latestRefresh = [
    ...articles.map((article) => article.updatedAt || article.publishedAt || article.createdAt),
    ...products.map((product) => product.updatedAt || product.publishedAt)
  ].find(Boolean)
  const reviewCount = articles.filter((article) => article.type === 'review').length
  const comparisonCount = articles.filter((article) => article.type === 'comparison').length

  return (
    <PublicShell>
      <div className="mx-auto max-w-7xl space-y-12 px-4 py-14 sm:px-6 lg:px-8">
        <section className="overflow-hidden rounded-[2.5rem] bg-[linear-gradient(135deg,#0f172a_0%,#1d4ed8_55%,#0f766e_100%)] p-8 text-white shadow-[0_35px_80px_-45px_rgba(15,23,42,0.8)] sm:p-10">
          <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
            <div className="space-y-5">
              <Link href="/directory" className="inline-flex text-sm font-medium text-white/70 transition-colors hover:text-white">
                Directory / {slug.replace(/-/g, ' ')}
              </Link>
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-emerald-200">Category Hub</p>
              <h1 className="font-[var(--font-display)] text-5xl font-black tracking-tight sm:text-6xl">{slug.replace(/-/g, ' ')}</h1>
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

        {products.length ? (
          <section className="space-y-6">
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
              {rest.slice(0, 2).map((article) => (
                <Link key={article.id} href={getArticlePath(article.type, article.slug)} className="block rounded-[2rem] bg-white p-7 shadow-panel transition-transform hover:-translate-y-1">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-primary">{article.type}</p>
                  <h3 className="mt-3 font-[var(--font-display)] text-2xl font-black tracking-tight text-foreground">{article.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-muted-foreground">{article.summary}</p>
                </Link>
              ))}
            </div>
            {rest.slice(2).map((article) => (
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
