import Link from 'next/link'
import { PublicShell } from '@/components/layout/PublicShell'
import { getArticlePath } from '@/lib/article-path'
import { getCategoryLabel } from '@/lib/editorial'
import { listCategories, listPublishedArticles } from '@/lib/site-data'

export default async function NotFound() {
  const [allArticles, categories] = await Promise.all([listPublishedArticles(), listCategories()])
  const articles = allArticles.slice(0, 3)
  const leadReview = allArticles.find((article) => article.type === 'review') || articles[0] || null
  const leadComparison = allArticles.find((article) => article.type === 'comparison') || articles[1] || null
  const leadCategory = leadReview?.product?.category || leadComparison?.product?.category || categories[0] || ''
  const recoveryRoutes = [
    {
      title: 'Search the site',
      description: 'Best when you know the product type, brand, or use case and want to recover the lane fast.',
      href: '/search?scope=products',
      label: 'Open search'
    },
    {
      title: leadCategory ? `Browse ${getCategoryLabel(leadCategory)}` : 'Browse the directory',
      description: 'Best when the exact page is gone but the broader category lane is still the right place to continue.',
      href: leadCategory ? `/categories/${leadCategory}` : '/directory',
      label: leadCategory ? 'Open category hub' : 'Open directory'
    },
    {
      title: 'Check live deals',
      description: 'Best when you were already near the end of the decision and just need current price-aware options.',
      href: '/deals',
      label: 'Open deals'
    }
  ]

  return (
    <PublicShell>
      <div className="mx-auto max-w-7xl space-y-16 px-4 py-16 sm:px-6 lg:px-8">
        <div className="text-center">
          <div className="relative mx-auto mb-8 max-w-3xl">
            <p className="text-[11rem] font-black leading-none text-muted">404</p>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <h1 className="font-[var(--font-display)] text-4xl font-black tracking-tight sm:text-5xl">Oops. Page not found.</h1>
              <p className="mt-4 max-w-xl text-lg leading-8 text-muted-foreground">
                It looks like this page was moved, unpublished, or never existed in the first place. The goal now is to recover the right buying lane instead of dropping you into a dead end.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap justify-center gap-3">
            <Link href="/" className="inline-flex rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground">
              Back to Home
            </Link>
            <Link href="/search?scope=products" className="inline-flex rounded-full border border-border bg-white px-6 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-muted">
              Search products
            </Link>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {recoveryRoutes.map((route) => (
            <Link key={route.title} href={route.href} className="rounded-[2rem] bg-white p-7 shadow-panel transition-transform hover:-translate-y-1">
              <h2 className="font-[var(--font-display)] text-2xl font-black tracking-tight">{route.title}</h2>
              <p className="mt-4 text-sm leading-7 text-muted-foreground">{route.description}</p>
              <p className="mt-5 text-sm font-semibold text-primary">{route.label} →</p>
            </Link>
          ))}
        </div>

        <div>
          <div className="mb-8 flex items-center justify-between">
            <h2 className="font-[var(--font-display)] text-2xl font-black tracking-tight">Try our trending picks</h2>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {articles.map((article) => (
              <Link key={article.id} href={getArticlePath(article.type, article.slug)} className="rounded-[2rem] bg-white p-7 shadow-panel transition-transform hover:-translate-y-1">
                <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-primary">{article.type}</p>
                <h2 className="mt-4 font-[var(--font-display)] text-2xl font-black tracking-tight">{article.title}</h2>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </PublicShell>
  )
}
