import Link from 'next/link'
import { PublicShell } from '@/components/layout/PublicShell'
import { RouteRecoveryPanel } from '@/components/site/RouteRecoveryPanel'
import { getArticlePath } from '@/lib/article-path'
import { buildCategoryPath } from '@/lib/category'
import { getCategoryLabel } from '@/lib/editorial'
import { deslugify, findSuggestedArticles, findSuggestedBrands, findSuggestedCategories, findSuggestedProducts } from '@/lib/route-recovery'
import { getRequestBasePath } from '@/lib/request-locale'
import { listBrands, listCategories, listPublishedArticles, listPublishedProducts } from '@/lib/site-data'

function buildRecoveryQuery(pathname: string) {
  const cleanPath = String(pathname || '/')
    .replace(/[?#].*$/, '')
    .replace(/^\/+|\/+$/g, '')

  if (!cleanPath) {
    return 'bes3'
  }

  const segments = cleanPath
    .split('/')
    .map((segment) => deslugify(segment))
    .filter(Boolean)

  const lastSegment = segments[segments.length - 1] || ''
  const fullLabel = segments.join(' ')

  if (!lastSegment) return fullLabel || 'bes3'
  if (!fullLabel || lastSegment.toLowerCase() === fullLabel.toLowerCase()) return lastSegment

  return `${lastSegment} ${fullLabel}`.trim()
}

export default async function NotFound() {
  const requestPath = getRequestBasePath()
  const recoveryQuery = buildRecoveryQuery(requestPath)
  const [articles, brands, categories, products] = await Promise.all([
    listPublishedArticles(),
    listBrands(),
    listCategories(),
    listPublishedProducts()
  ])

  const featuredArticles = articles.slice(0, 3)
  const suggestedProducts = findSuggestedProducts(products, recoveryQuery, 6).filter((product) => product.slug)
  const suggestedArticles = findSuggestedArticles(articles, recoveryQuery, { limit: 6 })
  const suggestedBrands = findSuggestedBrands(brands, recoveryQuery, 6)
  const suggestedCategories = findSuggestedCategories(categories, recoveryQuery, 6)

  return (
    <PublicShell>
      <RouteRecoveryPanel
        kicker="404 Recovery"
        title="This exact page is not available."
        description="Bes3 uses the missing route as a recovery step instead of a dead end. The suggestions below are based on the URL you tried to open, so you can jump back into the closest product, editorial, brand, or category path."
        queryLabel={requestPath === '/' ? recoveryQuery : `${requestPath} → ${recoveryQuery}`}
        searchHref={`/search?q=${encodeURIComponent(recoveryQuery)}&scope=products`}
        sections={[
          {
            eyebrow: 'Nearby products',
            title: 'Closest product pages',
            links: suggestedProducts.map((product) => ({
              href: `/products/${product.slug}`,
              label: product.productName,
              note: product.description || 'Open the closest live product page Bes3 could match from this URL.'
            }))
          },
          {
            eyebrow: 'Nearby editorial',
            title: 'Reviews, guides, and comparisons nearby',
            links: suggestedArticles.map((article) => ({
              href: getArticlePath(article.type, article.slug),
              label: article.title,
              note: article.summary || 'Open the closest live decision page.'
            }))
          },
          {
            eyebrow: 'Nearby brands',
            title: 'Brand hubs that may match',
            links: suggestedBrands.map((brand) => ({
              href: `/brands/${brand.slug}`,
              label: brand.name,
              note: `${brand.productCount} products and ${brand.articleCount} editorial pages already live on Bes3.`
            }))
          },
          {
            eyebrow: 'Nearby categories',
            title: 'Category hubs that may match',
            links: suggestedCategories.map((category) => ({
              href: buildCategoryPath(category),
              label: getCategoryLabel(category),
              note: 'Open the category hub if the exact URL was wrong but the buying intent is still right.'
            }))
          }
        ]}
      />

      <div className="mx-auto max-w-7xl space-y-10 px-4 pb-16 sm:px-6 lg:px-8">
        <section className="grid gap-6 md:grid-cols-3">
          {[
            {
              title: 'Back to Home',
              description: 'Reset to the main Bes3 entry point when this URL was completely off-track.',
              href: '/',
              label: 'Open home'
            },
            {
              title: 'Search the site',
              description: 'Best when you know the product type, brand, or use case and want a fresh search instead of guessing paths.',
              href: `/search?q=${encodeURIComponent(recoveryQuery)}&scope=products`,
              label: 'Search Bes3'
            },
            {
              title: 'Check live deals',
              description: 'Best when you were already close to buying and now just need the freshest live deals.',
              href: '/deals',
              label: 'Open deals'
            }
          ].map((route) => (
            <Link key={route.title} href={route.href} className="rounded-[2rem] bg-white p-7 shadow-panel transition-transform hover:-translate-y-1">
              <h2 className="font-[var(--font-display)] text-2xl font-black tracking-tight text-foreground">{route.title}</h2>
              <p className="mt-4 text-sm leading-7 text-muted-foreground">{route.description}</p>
              <p className="mt-5 text-sm font-semibold text-primary">{route.label} →</p>
            </Link>
          ))}
        </section>

        <section>
          <div className="mb-6 flex items-center justify-between gap-4">
            <h2 className="font-[var(--font-display)] text-2xl font-black tracking-tight text-foreground">Try current live content instead</h2>
            <Link href="/site-map" className="text-sm font-semibold text-primary transition-colors hover:text-primary/80">
              Open site map →
            </Link>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {featuredArticles.map((article) => (
              <Link key={article.id} href={getArticlePath(article.type, article.slug)} className="rounded-[2rem] bg-white p-7 shadow-panel transition-transform hover:-translate-y-1">
                <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-primary">{article.type}</p>
                <h2 className="mt-4 font-[var(--font-display)] text-2xl font-black tracking-tight text-foreground">{article.title}</h2>
                <p className="mt-3 text-sm leading-7 text-muted-foreground">{article.summary || 'Open one of the strongest live Bes3 pages instead of retrying broken paths.'}</p>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </PublicShell>
  )
}
