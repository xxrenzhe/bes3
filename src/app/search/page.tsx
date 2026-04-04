import Link from 'next/link'
import { PublicShell } from '@/components/layout/PublicShell'
import { ProductSpotlightCard } from '@/components/site/ProductSpotlightCard'
import { getArticlePath } from '@/lib/article-path'
import { listCategories, searchArticles, searchProducts } from '@/lib/site-data'

const SEARCH_SCOPES = [
  { id: 'all', label: 'All' },
  { id: 'products', label: 'Products' },
  { id: 'review', label: 'Reviews' },
  { id: 'comparison', label: 'Comparisons' },
  { id: 'guide', label: 'Guides' }
] as const

type SearchScope = (typeof SEARCH_SCOPES)[number]['id']

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
  const selectedScope = SEARCH_SCOPES.some((scope) => scope.id === resolvedParams.scope) ? (resolvedParams.scope as SearchScope) : 'all'

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
              <p className="mt-3 text-sm leading-7 text-muted-foreground">Try a product name, a brand, or a higher-level keyword like keyboard or desk setup.</p>
            </div>
          )
        ) : (
          <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded-[2rem] bg-white p-8 shadow-panel">
              <h2 className="font-[var(--font-display)] text-3xl font-black tracking-tight">Start with buyer intent.</h2>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">These shortcuts mirror how people actually shop: compare products, find a price watch, or jump into a category.</p>
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <Link href="/search?q=standing%20desk&scope=products" className="rounded-[1.5rem] bg-muted px-5 py-4 text-sm font-semibold text-foreground transition-colors hover:bg-emerald-50">
                  Find a product shortlist
                </Link>
                <Link href="/search?q=noise%20cancelling&scope=review" className="rounded-[1.5rem] bg-muted px-5 py-4 text-sm font-semibold text-foreground transition-colors hover:bg-emerald-50">
                  Read review verdicts
                </Link>
                <Link href="/search?q=ergonomic%20chair&scope=comparison" className="rounded-[1.5rem] bg-muted px-5 py-4 text-sm font-semibold text-foreground transition-colors hover:bg-emerald-50">
                  Jump to comparisons
                </Link>
                <Link href="/directory" className="rounded-[1.5rem] bg-primary px-5 py-4 text-sm font-semibold text-primary-foreground">
                  Browse the directory
                </Link>
              </div>
            </div>

            <div className="rounded-[2rem] bg-[linear-gradient(180deg,#f8fbff,#eef4ff)] p-8 shadow-panel">
              <p className="editorial-kicker">Search Tips</p>
              <div className="mt-4 space-y-4 text-sm leading-7 text-muted-foreground">
                <p>Search a product name if you are already mid-funnel and want to validate one pick fast.</p>
                <p>Search a category or use case if you still need Bes3 to narrow the field for you.</p>
                <p>Use the scope filter to switch between direct product candidates and editorial context.</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </PublicShell>
  )
}
