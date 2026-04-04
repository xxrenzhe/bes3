import type { Metadata } from 'next'
import Link from 'next/link'
import { PublicShell } from '@/components/layout/PublicShell'
import { ProductSpotlightCard } from '@/components/site/ProductSpotlightCard'
import { getArticlePath } from '@/lib/article-path'
import { getCategoryLabel } from '@/lib/editorial'
import { buildPageMetadata } from '@/lib/metadata'
import { listCategories, searchArticles, searchProducts } from '@/lib/site-data'

const SEARCH_SCOPES = [
  { id: 'all', label: 'All' },
  { id: 'products', label: 'Products' },
  { id: 'review', label: 'Reviews' },
  { id: 'comparison', label: 'Comparisons' },
  { id: 'guide', label: 'Guides' }
] as const

type SearchScope = (typeof SEARCH_SCOPES)[number]['id']

const SEARCH_SCOPE_META: Record<SearchScope, string> = {
  all: 'Use this when you only know the need. Bes3 will surface product candidates and the editorial context around them.',
  products: 'Best for mid-funnel shoppers who want Bes3 to narrow a noisy category into concrete candidates worth saving.',
  review: 'Use reviews when you need a verdict on one product before you put it on the shortlist.',
  comparison: 'Use comparisons when you are already down to finalists and want the tradeoffs laid out side by side.',
  guide: 'Use guides when you still need buying heuristics, compatibility help, or category education before choosing candidates.'
}

function normalizeSearchScope(value: string | undefined): SearchScope {
  return SEARCH_SCOPES.some((scope) => scope.id === value) ? (value as SearchScope) : 'all'
}

export async function generateMetadata({
  searchParams
}: {
  searchParams: Promise<{ q?: string; scope?: string; category?: string }>
}): Promise<Metadata> {
  const resolvedParams = await searchParams
  const query = resolvedParams.q?.trim() || ''
  const categories = await listCategories()
  const selectedCategory = categories.includes(resolvedParams.category || '') ? String(resolvedParams.category) : ''
  const selectedScope = normalizeSearchScope(resolvedParams.scope)
  const hasSearchState = Boolean(query || selectedCategory || selectedScope !== 'all')
  const scopeLabel =
    selectedScope === 'all'
      ? 'products, reviews, comparisons, and buying guides'
      : selectedScope === 'products'
        ? 'product candidates'
        : selectedScope === 'review'
          ? 'review verdicts'
          : selectedScope === 'comparison'
            ? 'finalist comparisons'
            : 'buying guides'
  const categorySuffix = selectedCategory ? ` in ${getCategoryLabel(selectedCategory)}` : ''

  return buildPageMetadata({
    title: query ? `Search "${query}"` : 'Search',
    description: query
      ? `Search Bes3 ${scopeLabel}${categorySuffix} to narrow the buyer journey without reopening broad research.`
      : 'Search Bes3 products, reviews, comparisons, and buyer guides to turn a concrete need into a cleaner shortlist.',
    path: '/search',
    robots: {
      index: !hasSearchState,
      follow: true
    }
  })
}

const SEARCH_STARTER_ROUTES = [
  {
    title: 'Build a shortlist',
    description: 'Start with products when you need Bes3 to narrow a category into a few serious options.',
    href: '/search?q=standing%20desk&scope=products',
    label: 'Search product candidates'
  },
  {
    title: 'Read a verdict',
    description: 'Open reviews when one product already has your attention and you want the buyer fit fast.',
    href: '/search?q=noise%20cancelling&scope=review',
    label: 'Search review pages'
  },
  {
    title: 'Compare finalists',
    description: 'Use comparison pages when you are choosing between two or three credible options.',
    href: '/search?q=ergonomic%20chair&scope=comparison',
    label: 'Search comparisons'
  },
  {
    title: 'Browse the market',
    description: 'Open the directory when you need to discover categories before you commit to a specific query.',
    href: '/directory',
    label: 'Browse the directory'
  }
] as const

function buildSearchHref(query: string, scope: SearchScope, category: string) {
  const params = new URLSearchParams()
  if (query) params.set('q', query)
  if (scope !== 'all') params.set('scope', scope)
  if (category) params.set('category', category)
  return `/search${params.size ? `?${params.toString()}` : ''}`
}

export default async function SearchPage({
  searchParams
}: {
  searchParams: Promise<{ q?: string; scope?: string; category?: string }>
}) {
  const resolvedParams = await searchParams
  const query = resolvedParams.q?.trim() || ''
  const [categories, articleMatches, productMatches] = query
    ? await Promise.all([listCategories(), searchArticles(query), searchProducts(query)])
    : await Promise.all([listCategories(), Promise.resolve([]), Promise.resolve([])])

  const selectedCategory = categories.includes(resolvedParams.category || '') ? String(resolvedParams.category) : ''
  const selectedScope = normalizeSearchScope(resolvedParams.scope)

  const filteredProducts =
    selectedScope === 'all' || selectedScope === 'products'
      ? productMatches.filter((product) => !selectedCategory || product.category === selectedCategory)
      : []

  const filteredArticles = articleMatches.filter((article) => {
    if (selectedCategory && article.product?.category !== selectedCategory) return false
    if (selectedScope === 'all') return true
    if (selectedScope === 'products') return false
    return article.type === selectedScope
  })

  const totalResults = filteredProducts.length + filteredArticles.length
  const suggestedCategory = selectedCategory || filteredProducts[0]?.category || filteredArticles[0]?.product?.category || ''
  const firstReview = filteredArticles.find((article) => article.type === 'review') || null
  const firstComparison = filteredArticles.find((article) => article.type === 'comparison') || null
  const firstGuide = filteredArticles.find((article) => article.type === 'guide') || null
  const resultRoutes = query
    ? [
        filteredProducts[0]
          ? {
              eyebrow: 'Start',
              title: 'Open the strongest candidate',
              description: 'Use the top product match when your query is already specific enough and you want to move straight into specs, pricing, and buyer-fit.',
              href: filteredProducts[0].slug ? `/products/${filteredProducts[0].slug}` : buildSearchHref(query, 'products', selectedCategory),
              label: filteredProducts[0].slug ? 'Open product deep-dive' : 'See product matches'
            }
          : null,
        firstComparison
          ? {
              eyebrow: 'Compare',
              title: 'Pressure-test finalists',
              description: 'If the search already surfaced a comparison, use it to keep the decision inside one lane instead of opening unrelated alternatives.',
              href: getArticlePath(firstComparison.type, firstComparison.slug),
              label: 'Open comparison'
            }
          : firstReview
            ? {
                eyebrow: 'Validate',
                title: 'Read the clearest verdict',
                description: 'Move into a review when you want Bes3 to confirm buyer fit before you save, compare, or click out.',
                href: getArticlePath(firstReview.type, firstReview.slug),
                label: 'Open review verdict'
              }
            : firstGuide
              ? {
                  eyebrow: 'Learn',
                  title: 'Use a guide to narrow intent',
                  description: 'The guide route is best when the search need is still broad and you want buying heuristics before choosing candidates.',
                  href: getArticlePath(firstGuide.type, firstGuide.slug),
                  label: 'Open guide'
                }
              : null,
        suggestedCategory
          ? {
              eyebrow: 'Watch',
              title: `Track ${getCategoryLabel(suggestedCategory)}`,
              description: 'If timing is the blocker, turn this search into a category watch so you do not lose the buying context and start over later.',
              href: `/newsletter?intent=price-alert&category=${encodeURIComponent(suggestedCategory)}&cadence=priority`,
              label: 'Start price watch'
            }
          : {
              eyebrow: 'Explore',
              title: 'Broaden the lane cleanly',
              description: 'When the query is still fuzzy, move into the directory or product search instead of widening the same search aimlessly.',
              href: '/directory',
              label: 'Browse category hubs'
            }
      ].filter(Boolean) as Array<{
        eyebrow: string
        title: string
        description: string
        href: string
        label: string
      }>
    : []

  return (
    <PublicShell>
      <div className="mx-auto max-w-7xl space-y-12 px-4 py-14 sm:px-6 lg:px-8">
        <section className="mx-auto max-w-4xl text-center">
          <h1 className="font-[var(--font-display)] text-4xl font-black tracking-tight text-foreground sm:text-5xl">Search the shortlist, not the noise.</h1>
          <p className="mt-4 text-lg leading-8 text-muted-foreground">
            Search product names, review verdicts, comparison pages, and category-level buyer guidance across the Bes3 archive.
          </p>
        </section>

        <form className="mx-auto max-w-5xl rounded-[2rem] bg-white p-8 shadow-panel">
          <p className="editorial-kicker">Search</p>
          <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_220px_220px_auto]">
            <input
              name="q"
              defaultValue={query}
              className="min-h-[64px] w-full rounded-[1.5rem] border-none bg-muted px-6 text-base"
              placeholder="Search products, reviews, or buyer intent"
            />
            <label className="flex min-h-[64px] items-center rounded-[1.5rem] bg-muted px-4">
              <span className="sr-only">Result type</span>
              <select name="scope" defaultValue={selectedScope} className="w-full border-none bg-transparent text-sm text-foreground outline-none">
                {SEARCH_SCOPES.map((scope) => (
                  <option key={scope.id} value={scope.id}>
                    {scope.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex min-h-[64px] items-center rounded-[1.5rem] bg-muted px-4">
              <span className="sr-only">Category</span>
              <select name="category" defaultValue={selectedCategory} className="w-full border-none bg-transparent text-sm text-foreground outline-none">
                <option value="">Any category</option>
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category.replace(/-/g, ' ')}
                  </option>
                ))}
              </select>
            </label>
            <button type="submit" className="min-h-[64px] rounded-full bg-primary px-6 text-sm font-semibold text-primary-foreground">
              Search
            </button>
          </div>
        </form>

        {query ? (
          <div className="flex flex-wrap items-center gap-3">
            {SEARCH_SCOPES.map((scope) => (
              <Link
                key={scope.id}
                href={buildSearchHref(query, scope.id, selectedCategory)}
                className={`rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] transition-colors ${
                  selectedScope === scope.id ? 'bg-primary text-primary-foreground' : 'bg-white text-muted-foreground shadow-panel'
                }`}
              >
                {scope.label}
              </Link>
            ))}
          </div>
        ) : null}

        {query ? (
          <div className="rounded-[1.5rem] bg-[linear-gradient(135deg,#f8fbff,#eefaf5)] px-6 py-5 shadow-panel">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">Current route</p>
            <p className="mt-3 text-sm leading-7 text-muted-foreground">{SEARCH_SCOPE_META[selectedScope]}</p>
          </div>
        ) : null}

        {query && resultRoutes.length ? (
          <section className="rounded-[2rem] bg-white p-8 shadow-panel">
            <div className="flex flex-col gap-3 border-b border-border/40 pb-6 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="editorial-kicker">Best Next Move</p>
                <h2 className="mt-3 font-[var(--font-display)] text-3xl font-black tracking-tight text-foreground">Keep this search inside one decision lane.</h2>
              </div>
              <p className="max-w-2xl text-sm leading-7 text-muted-foreground">
                Search should narrow the path, not create more branching. Use the next route that matches what is still unresolved: candidate quality, verdict confidence, or price timing.
              </p>
            </div>
            <div className="mt-6 grid gap-4 lg:grid-cols-3">
              {resultRoutes.map((route) => (
                <Link
                  key={route.title}
                  href={route.href}
                  className="rounded-[1.5rem] bg-[linear-gradient(135deg,#fff8ef_0%,#f8fbff_48%,#eefaf5_100%)] p-6 transition-transform hover:-translate-y-1"
                >
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">{route.eyebrow}</p>
                  <h3 className="mt-3 font-[var(--font-display)] text-2xl font-black tracking-tight text-foreground">{route.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-muted-foreground">{route.description}</p>
                  <p className="mt-5 text-sm font-semibold text-primary">{route.label} →</p>
                </Link>
              ))}
            </div>
          </section>
        ) : null}

        {query ? (
          totalResults ? (
            <section className="space-y-8">
              <div className="flex items-baseline justify-between border-b border-border/30 pb-4">
                <h2 className="font-[var(--font-display)] text-3xl font-black tracking-tight">Search Results</h2>
                <span className="text-sm text-muted-foreground">
                  {totalResults} result{totalResults === 1 ? '' : 's'} for "{query}"
                </span>
              </div>

              {filteredProducts.length ? (
                <div className="space-y-5">
                  <div>
                    <p className="editorial-kicker">Product matches</p>
                    <h3 className="mt-3 font-[var(--font-display)] text-3xl font-black tracking-tight text-foreground">Fastest path to a buying decision</h3>
                  </div>
                  <div className="grid gap-6 xl:grid-cols-2">
                    {filteredProducts.slice(0, 6).map((product) => (
                      <ProductSpotlightCard key={product.id} product={product} source="search-product-results" />
                    ))}
                  </div>
                </div>
              ) : null}

              {filteredArticles.length ? (
                <div className="space-y-5">
                  <div>
                    <p className="editorial-kicker">Editorial matches</p>
                    <h3 className="mt-3 font-[var(--font-display)] text-3xl font-black tracking-tight text-foreground">Supporting context and verdict pages</h3>
                  </div>
                  <div className="grid gap-6">
                    {filteredArticles.map((article) => (
                      <Link key={article.id} href={getArticlePath(article.type, article.slug)} className="grid gap-6 rounded-[2rem] bg-white p-6 shadow-panel transition-transform hover:-translate-y-1 md:grid-cols-[220px_1fr]">
                        <div className="rounded-[1.5rem] bg-[linear-gradient(135deg,#e5eeff,#dfe9fa)] p-5">
                          <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-primary">{article.type}</p>
                          <h3 className="mt-3 font-[var(--font-display)] text-2xl font-black tracking-tight text-foreground">
                            {article.product?.productName || article.title}
                          </h3>
                          <p className="mt-3 text-sm text-muted-foreground">{article.product?.category?.replace(/-/g, ' ') || 'Editorial archive'}</p>
                        </div>
                        <div className="space-y-4">
                          <h3 className="font-[var(--font-display)] text-3xl font-black tracking-tight text-foreground">{article.title}</h3>
                          <p className="text-sm leading-7 text-muted-foreground">{article.summary || 'Clear tradeoffs, practical verdicts, and buyer-focused notes.'}</p>
                          <p className="text-sm font-semibold text-primary">Read the verdict →</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              ) : null}
            </section>
          ) : (
            <div className="rounded-[2rem] bg-white p-12 text-center shadow-panel">
              <h2 className="font-[var(--font-display)] text-4xl font-black tracking-tight">No results found.</h2>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">
                Try a product name, a brand, or a higher-level keyword like keyboard or desk setup. If your intent is still fuzzy, use one of the routes below instead of forcing the wrong query.
              </p>
              <div className="mt-8 flex flex-wrap justify-center gap-3">
                {selectedScope !== 'all' ? (
                  <Link href={buildSearchHref(query, 'all', selectedCategory)} className="rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground">
                    Search all routes
                  </Link>
                ) : null}
                <Link href="/directory" className="rounded-full border border-border px-5 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-muted">
                  Browse categories
                </Link>
                <Link href="/deals" className="rounded-full border border-border px-5 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-muted">
                  Check deals instead
                </Link>
              </div>
            </div>
          )
        ) : (
          <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded-[2rem] bg-white p-8 shadow-panel">
              <h2 className="font-[var(--font-display)] text-3xl font-black tracking-tight">Start with buyer intent.</h2>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">
                Good search should respect buying stage first: discover candidates, validate one product, compare finalists, or switch into a watch flow when the timing is not right yet.
              </p>
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                {SEARCH_STARTER_ROUTES.map((route) => (
                  <Link key={route.title} href={route.href} className="rounded-[1.5rem] bg-muted px-5 py-5 transition-colors hover:bg-emerald-50">
                    <p className="text-sm font-semibold text-foreground">{route.title}</p>
                    <p className="mt-2 text-sm leading-7 text-muted-foreground">{route.description}</p>
                    <p className="mt-4 text-sm font-semibold text-primary">{route.label} →</p>
                  </Link>
                ))}
              </div>
            </div>

            <div className="rounded-[2rem] bg-[linear-gradient(180deg,#f8fbff,#eef4ff)] p-8 shadow-panel">
              <p className="editorial-kicker">How Bes3 Search Works</p>
              <div className="mt-4 space-y-4 text-sm leading-7 text-muted-foreground">
                <p>Search a product name if you are already mid-funnel and want to validate one pick fast.</p>
                <p>Search a category or use case if you still need Bes3 to generate the right shortlist lane.</p>
                <p>Use the scope filter to move from candidate discovery to verdict reading to finalist comparison.</p>
                <p>When search still feels too broad, open a category hub or the shortlist workspace instead of widening the query.</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </PublicShell>
  )
}
