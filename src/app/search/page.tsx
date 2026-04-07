import type { Metadata } from 'next'
import Link from 'next/link'
import { buildCategoryPath, categoryMatches, getCategorySlug } from '@/lib/category'
import { PublicShell } from '@/components/layout/PublicShell'
import { DecisionReasonPanel } from '@/components/site/DecisionReasonPanel'
import { SeoFaqSection } from '@/components/site/SeoFaqSection'
import { IntentRecommendationPanel } from '@/components/site/IntentRecommendationPanel'
import { IntentSearchPanel } from '@/components/site/IntentSearchPanel'
import { ProductSpotlightCard } from '@/components/site/ProductSpotlightCard'
import { StructuredData } from '@/components/site/StructuredData'
import { getArticlePath } from '@/lib/article-path'
import { parseIntentInputFromSearchParams, resolveIntentSearch } from '@/lib/commerce-intent'
import { getCategoryLabel } from '@/lib/editorial'
import { buildPageMetadata } from '@/lib/metadata'
import { getRequestLocale } from '@/lib/request-locale'
import { buildCollectionPageSchema, buildFaqSchema, buildSearchResultsPageSchema, buildWebPageSchema } from '@/lib/structured-data'
import { listCategories, listPublishedArticles, searchArticles, searchProducts } from '@/lib/site-data'

const SEARCH_SCOPES = [
  { id: 'all', label: 'All' },
  { id: 'products', label: 'Products' },
  { id: 'review', label: 'Reviews' },
  { id: 'comparison', label: 'Comparisons' },
  { id: 'guide', label: 'Guides' }
] as const

type SearchScope = (typeof SEARCH_SCOPES)[number]['id']

const SEARCH_SCOPE_META: Record<SearchScope, string> = {
  all: 'Shows products, reviews, comparisons, and guides together.',
  products: 'Best when you want a short list of products to start from.',
  review: 'Best when you want a deeper review of one product.',
  comparison: 'Best when you already have two or three top picks and want them side by side.',
  guide: 'Best when you still need help understanding what matters before choosing.'
}

function normalizeSearchScope(value: string | undefined): SearchScope {
  return SEARCH_SCOPES.some((scope) => scope.id === value) ? (value as SearchScope) : 'all'
}

function normalizeSearchMode(value: string | undefined) {
  return value === 'intent' ? 'intent' : 'keyword'
}

function buildCurrentSearchPath(input: {
  mode: 'keyword' | 'intent'
  q?: string
  scope?: SearchScope
  category?: string
  intent?: string
  budget?: string
  must?: string
  avoid?: string
  urgency?: string
}) {
  const params = new URLSearchParams()
  if (input.mode === 'intent') {
    params.set('mode', 'intent')
    if (input.intent) params.set('intent', input.intent)
    if (input.category) params.set('category', getCategorySlug(input.category))
    if (input.budget) params.set('budget', input.budget)
    if (input.must) params.set('must', input.must)
    if (input.avoid) params.set('avoid', input.avoid)
    if (input.urgency) params.set('urgency', input.urgency)
  } else {
    if (input.q) params.set('q', input.q)
    if (input.scope && input.scope !== 'all') params.set('scope', input.scope)
    if (input.category) params.set('category', getCategorySlug(input.category))
  }
  return `/search${params.size ? `?${params.toString()}` : ''}`
}

function hasActiveSearchState(input: {
  mode: 'keyword' | 'intent'
  query?: string
  scope: SearchScope
  category?: string
  intentQuery?: string
  budget?: string
  must?: string
  avoid?: string
  urgency?: string
}) {
  if (input.mode === 'intent') {
    return Boolean(input.intentQuery || input.category || input.budget || input.must || input.avoid || input.urgency)
  }

  return Boolean(input.query || input.category || input.scope !== 'all')
}

export async function generateMetadata({
  searchParams
}: {
  searchParams: Promise<{ q?: string; scope?: string; category?: string; mode?: string; intent?: string; budget?: string; must?: string; avoid?: string; urgency?: string }>
}): Promise<Metadata> {
  const resolvedParams = await searchParams
  const mode = normalizeSearchMode(resolvedParams.mode)
  const intentInput = parseIntentInputFromSearchParams(resolvedParams)
  const query = mode === 'intent' ? intentInput.query : resolvedParams.q?.trim() || ''
  const categories = await listCategories()
  const selectedCategory = categories.find((category) => categoryMatches(category, resolvedParams.category || '')) || ''
  const selectedScope = normalizeSearchScope(resolvedParams.scope)
  const hasActiveSearch = hasActiveSearchState({
    mode,
    query,
    scope: selectedScope,
    category: selectedCategory,
    intentQuery: intentInput.query,
    budget: resolvedParams.budget,
    must: resolvedParams.must,
    avoid: resolvedParams.avoid,
    urgency: resolvedParams.urgency
  })
  const scopeLabel =
    selectedScope === 'all'
      ? 'products, reviews, comparisons, and guides'
      : selectedScope === 'products'
        ? 'products'
        : selectedScope === 'review'
          ? 'reviews'
          : selectedScope === 'comparison'
            ? 'product comparisons'
            : 'buying guides'
  const categorySuffix = selectedCategory ? ` in ${getCategoryLabel(selectedCategory)}` : ''

  return buildPageMetadata({
    title: query ? `Search "${query}"` : 'Search',
    description: query
      ? mode === 'intent'
        ? `Tell Bes3 what you need and get a tighter shortlist${categorySuffix} with clearer next steps.`
        : `Search Bes3 ${scopeLabel}${categorySuffix} to find the most useful next page faster.`
      : 'Search Bes3 products, reviews, comparisons, and guides to find the right option faster.',
    path: '/search',
    locale: getRequestLocale(),
    robots: {
      index: !hasActiveSearch,
      follow: true
    },
    keywords: ['site search', 'product search', 'reviews', 'comparisons']
  })
}

const SEARCH_STARTER_ROUTES = [
  {
    title: 'Find good options',
    description: 'Start with products when you want Bes3 to narrow a category into a few strong options.',
    href: '/search?q=standing%20desk&scope=products',
    label: 'Search products'
  },
  {
    title: 'Read a full review',
    description: 'Open reviews when one product already has your attention and you want the honest pros and cons fast.',
    href: '/search?q=noise%20cancelling&scope=review',
    label: 'Search review pages'
  },
  {
    title: 'Compare top picks',
    description: 'Use comparison pages when you are choosing between two or three strong options.',
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

const SEARCH_FAQ_ENTRIES = [
  {
    question: 'Should I use search or start with a category page?',
    answer: 'Use search when you already know the product name, feature, or problem to solve. Use a category page when the market is still too broad and you need Bes3 to narrow the field first.'
  },
  {
    question: 'Why does Bes3 try to send me to another page after search?',
    answer: 'Because search is meant to help you find the right next step fast. The best answer is usually a stronger product page, review, comparison, or category page.'
  },
  {
    question: 'What is the fastest way to get useful search results?',
    answer: 'Search the product name if you already have a likely candidate. Search a category or use case if you still need Bes3 to narrow the shortlist and point you to the right next page.'
  }
] as const

function buildSearchHref(query: string, scope: SearchScope, category: string) {
  const params = new URLSearchParams()
  if (query) params.set('q', query)
  if (scope !== 'all') params.set('scope', scope)
  if (category) params.set('category', getCategorySlug(category))
  return `/search${params.size ? `?${params.toString()}` : ''}`
}

export default async function SearchPage({
  searchParams
}: {
  searchParams: Promise<{ q?: string; scope?: string; category?: string; mode?: string; intent?: string; budget?: string; must?: string; avoid?: string; urgency?: string }>
}) {
  const resolvedParams = await searchParams
  const mode = normalizeSearchMode(resolvedParams.mode)
  const query = resolvedParams.q?.trim() || ''
  const intentInput = parseIntentInputFromSearchParams(resolvedParams)
  const [categories, allArticles, articleMatches, productMatches, intentResult] = await Promise.all([
    listCategories(),
    listPublishedArticles(),
    mode === 'keyword' && query ? searchArticles(query) : Promise.resolve([]),
    mode === 'keyword' && query ? searchProducts(query) : Promise.resolve([]),
    mode === 'intent' && intentInput.query ? resolveIntentSearch(intentInput) : Promise.resolve(null)
  ])

  const selectedCategory = categories.find((category) => categoryMatches(category, resolvedParams.category || '')) || ''
  const selectedScope = normalizeSearchScope(resolvedParams.scope)
  const intentQuery = intentInput.query
  const hasActiveSearch = hasActiveSearchState({
    mode,
    query,
    scope: selectedScope,
    category: selectedCategory,
    intentQuery,
    budget: resolvedParams.budget,
    must: resolvedParams.must,
    avoid: resolvedParams.avoid,
    urgency: resolvedParams.urgency
  })
  const effectiveCategory = mode === 'intent' ? intentResult?.inferredCategory || selectedCategory : selectedCategory

  const filteredProducts =
    mode === 'keyword' && (selectedScope === 'all' || selectedScope === 'products')
      ? productMatches.filter((product) => !selectedCategory || categoryMatches(product.category, selectedCategory))
      : []

  const filteredArticles = (mode === 'keyword' ? articleMatches : []).filter((article) => {
    if (selectedCategory && !categoryMatches(article.product?.category, selectedCategory)) return false
    if (selectedScope === 'all') return true
    if (selectedScope === 'products') return false
    return article.type === selectedScope
  })

  const totalResults = filteredProducts.length + filteredArticles.length
  const suggestedCategory = effectiveCategory || filteredProducts[0]?.category || filteredArticles[0]?.product?.category || ''
  const firstReview = filteredArticles.find((article) => article.type === 'review') || null
  const firstComparison = filteredArticles.find((article) => article.type === 'comparison') || null
  const firstGuide = filteredArticles.find((article) => article.type === 'guide') || null
  const leadReview = allArticles.find((article) => article.type === 'review') || null
  const leadGuide = allArticles.find((article) => article.type === 'guide') || null
  const queryLower = query.toLowerCase()
  const matchedCategorySlugs = categories.filter((category) => {
    if (!queryLower) return true
    const label = getCategoryLabel(category).toLowerCase()
    return label.includes(queryLower) || queryLower.includes(label)
  })
  const fallbackCategories = (matchedCategorySlugs.length ? matchedCategorySlugs : categories).slice(0, 3)
  const resultRoutes = mode === 'keyword' && query
    ? [
        filteredProducts[0]
          ? {
              eyebrow: 'Start',
              title: 'Open the strongest product match',
              description: 'Go straight to the best product match when you want specs, pricing, and the quick take in one place.',
              href: filteredProducts[0].slug ? `/products/${filteredProducts[0].slug}` : buildSearchHref(query, 'products', selectedCategory),
              label: filteredProducts[0].slug ? 'Open product page' : 'See product matches'
            }
          : null,
        firstComparison
          ? {
              eyebrow: 'Compare',
              title: 'Compare the top options',
              description: 'If search already found a comparison, use it to check the strongest options side by side.',
              href: getArticlePath(firstComparison.type, firstComparison.slug),
              label: 'Open comparison'
            }
          : firstReview
            ? {
                eyebrow: 'Review',
                title: 'Read the clearest review',
                description: 'Open a review when you want the full picture before you save, compare, or click out.',
                href: getArticlePath(firstReview.type, firstReview.slug),
                label: 'Open review'
              }
            : firstGuide
              ? {
                eyebrow: 'Learn',
                title: 'Read a guide first',
                description: 'Open a guide when the search is still broad and you want help understanding what matters before choosing.',
                href: getArticlePath(firstGuide.type, firstGuide.slug),
                label: 'Open guide'
              }
              : null,
        suggestedCategory
          ? {
              eyebrow: 'Watch',
              title: `Track ${getCategoryLabel(suggestedCategory)}`,
              description: 'If price is the only thing holding you back, turn this search into a price alert so you do not have to start over later.',
              href: `/newsletter?intent=price-alert&category=${encodeURIComponent(suggestedCategory)}&cadence=priority`,
              label: 'Start price alert'
            }
          : {
              eyebrow: 'Explore',
              title: 'Broaden the search',
              description: 'When the query is still fuzzy, move into the directory instead of widening the same search aimlessly.',
              href: '/directory',
              label: 'Browse categories'
            }
      ].filter(Boolean) as Array<{
        eyebrow: string
        title: string
        description: string
        href: string
        label: string
      }>
    : []
  const structuredData = mode === 'intent' && intentResult?.normalizedQuery
    ? buildSearchResultsPageSchema({
        path: buildCurrentSearchPath({
          mode,
          intent: intentResult.normalizedQuery,
          category: effectiveCategory,
          budget: resolvedParams.budget,
          must: resolvedParams.must,
          avoid: resolvedParams.avoid,
          urgency: resolvedParams.urgency
        }),
        title: `Search "${intentResult.normalizedQuery}"`,
        description: 'Bes3 search results with the strongest matches, next steps, and product recommendations.',
        query: intentResult.normalizedQuery,
        items: intentResult.recommendations.map((item) => ({
          name: item.product.productName,
          path: item.product.slug ? `/products/${item.product.slug}` : '/search'
        }))
      })
    : query
    ? buildSearchResultsPageSchema({
        path: buildSearchHref(query, selectedScope, selectedCategory),
        title: `Search "${query}"`,
        description: `Search Bes3 ${selectedScope === 'products' ? 'products' : selectedScope === 'review' ? 'reviews' : selectedScope === 'comparison' ? 'product comparisons' : selectedScope === 'guide' ? 'buying guides' : 'products, reviews, comparisons, and guides'} to find the right next page faster.`,
        query,
        items: [
          ...filteredProducts.slice(0, 5).map((product) => ({
            name: product.productName,
            path: product.slug ? `/products/${product.slug}` : '/search'
          })),
          ...filteredArticles.slice(0, 5).map((article) => ({
            name: article.title,
            path: getArticlePath(article.type, article.slug)
          }))
        ]
      })
    : [
        buildCollectionPageSchema({
          path: '/search',
          title: 'Search',
          description: 'Search Bes3 products, reviews, comparisons, and guides to find the right option faster.',
          items: [
            ...SEARCH_STARTER_ROUTES.map((route) => ({
              name: route.title,
              path: route.href
            })),
            { name: 'Assistant', path: '/assistant' },
            { name: 'Directory', path: '/directory' },
            { name: 'Deals', path: '/deals' }
          ]
        }),
        buildWebPageSchema({
          path: '/search',
          title: 'Search',
          description: 'Search Bes3 products, reviews, comparisons, and guides to find the right option faster.',
          type: 'CollectionPage'
        }),
        buildFaqSchema('/search', [...SEARCH_FAQ_ENTRIES])
      ]

  return (
    <PublicShell>
      <StructuredData data={structuredData} />
      <div className="mx-auto max-w-7xl space-y-12 px-4 py-14 sm:px-6 lg:px-8">
        <section className="mx-auto max-w-4xl text-center">
          <h1 className="font-[var(--font-display)] text-4xl font-black tracking-tight text-foreground sm:text-5xl">Search the shortlist, not the noise.</h1>
          <p className="mt-4 text-lg leading-8 text-muted-foreground">
            Search product names, reviews, comparisons, and category guides across the Bes3 site.
          </p>
        </section>

        <DecisionReasonPanel
          eyebrow="Choose the right entry"
          title="Use the path that matches what you already know."
          description="Search works best when you know the model or keyword. The assistant works best when you know the situation but not the product name yet."
          cards={[
            {
              eyebrow: 'Use assistant',
              title: 'The problem is clear, but the model is not',
              description: 'Use the assistant when you can describe the use case, budget, or deal-breakers but still need Bes3 to narrow the field.'
            },
            {
              eyebrow: 'Use keyword search',
              title: 'You already know the product or keyword',
              description: 'If you have a model name, feature phrase, or exact category query, keyword search is the shortest path to the right page.',
              tone: 'muted'
            },
            {
              eyebrow: 'Use the directory',
              title: 'You are still too early for either',
              description: 'If you cannot yet name the use case or the category, browse the directory first so the market gets smaller before you search again.',
              tone: 'strong'
            }
          ]}
        />

        <IntentSearchPanel
          categoryOptions={categories}
          defaultIntent={intentQuery}
          defaultCategory={effectiveCategory}
          defaultBudget={resolvedParams.budget || ''}
          defaultMust={resolvedParams.must || ''}
          defaultAvoid={resolvedParams.avoid || ''}
          defaultUrgency={intentInput.urgency}
        />

        <form className="mx-auto max-w-5xl rounded-[2rem] bg-white p-8 shadow-panel">
          <p className="editorial-kicker">Search</p>
          <h2 className="mt-3 font-[var(--font-display)] text-3xl font-black tracking-tight text-foreground">Or search by keyword.</h2>
          <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_220px_220px_auto]">
            <input
              name="q"
              defaultValue={query}
              className="min-h-[64px] w-full rounded-[1.5rem] border-none bg-muted px-6 text-base"
              placeholder="Search products, reviews, or categories"
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
              <select name="category" defaultValue={getCategorySlug(selectedCategory)} className="w-full border-none bg-transparent text-sm text-foreground outline-none">
                <option value="">Any category</option>
                {categories.map((category) => (
                  <option key={category} value={getCategorySlug(category)}>
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

        {mode === 'keyword' && query ? (
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

        {mode === 'keyword' && query ? (
          <div className="rounded-[1.5rem] bg-[linear-gradient(135deg,#f8fbff,#eefaf5)] px-6 py-5 shadow-panel">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">Search mode</p>
            <p className="mt-3 text-sm leading-7 text-muted-foreground">{SEARCH_SCOPE_META[selectedScope]}</p>
          </div>
        ) : null}

        {mode === 'intent' && intentResult ? (
          intentResult.recommendations.length ? (
            <IntentRecommendationPanel result={intentResult} />
          ) : (
            <section className="space-y-8">
              <div className="rounded-[2rem] bg-white p-12 text-center shadow-panel">
                <h2 className="font-[var(--font-display)] text-4xl font-black tracking-tight">No strong shortlist yet.</h2>
                <p className="mt-3 text-sm leading-7 text-muted-foreground">
                  Bes3 could not find enough strong matches for "{intentResult.normalizedQuery}" yet. Broaden the category or remove one blocker first.
                </p>
                <div className="mt-8 flex flex-wrap justify-center gap-3">
                  <Link href="/directory" className="rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground">
                    Browse categories
                  </Link>
                  <Link href="/deals" className="rounded-full border border-border px-5 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-muted">
                    Check deals
                  </Link>
                </div>
              </div>
            </section>
          )
        ) : null}

        {mode === 'keyword' && query && resultRoutes.length ? (
          <section className="rounded-[2rem] bg-white p-8 shadow-panel">
            <div className="flex flex-col gap-3 border-b border-border/40 pb-6 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="editorial-kicker">Best Next Move</p>
                <h2 className="mt-3 font-[var(--font-display)] text-3xl font-black tracking-tight text-foreground">Choose the most useful next step.</h2>
              </div>
              <p className="max-w-2xl text-sm leading-7 text-muted-foreground">
                Search should narrow your options, not create more confusion. Use the next page that answers what is still unclear.
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

        {mode === 'keyword' && query ? (
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
                    <h3 className="mt-3 font-[var(--font-display)] text-3xl font-black tracking-tight text-foreground">The fastest way to narrow your options</h3>
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
                    <p className="editorial-kicker">Reviews and Guides</p>
                    <h3 className="mt-3 font-[var(--font-display)] text-3xl font-black tracking-tight text-foreground">Reviews and guides that help you decide</h3>
                  </div>
                  <div className="grid gap-6">
                    {filteredArticles.map((article) => (
                      <Link key={article.id} href={getArticlePath(article.type, article.slug)} className="grid gap-6 rounded-[2rem] bg-white p-6 shadow-panel transition-transform hover:-translate-y-1 md:grid-cols-[220px_1fr]">
                        <div className="rounded-[1.5rem] bg-[linear-gradient(135deg,#e5eeff,#dfe9fa)] p-5">
                          <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-primary">{article.type}</p>
                          <h3 className="mt-3 font-[var(--font-display)] text-2xl font-black tracking-tight text-foreground">
                            {article.product?.productName || article.title}
                          </h3>
                          <p className="mt-3 text-sm text-muted-foreground">{article.product?.category?.replace(/-/g, ' ') || 'Buying guide'}</p>
                        </div>
                        <div className="space-y-4">
                          <h3 className="font-[var(--font-display)] text-3xl font-black tracking-tight text-foreground">{article.title}</h3>
                          <p className="text-sm leading-7 text-muted-foreground">{article.summary || 'Clear tradeoffs, practical advice, and honest buyer notes.'}</p>
                          <p className="text-sm font-semibold text-primary">Read more →</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              ) : null}
            </section>
          ) : (
            <section className="space-y-8">
              <div className="rounded-[2rem] bg-white p-12 text-center shadow-panel">
                <h2 className="font-[var(--font-display)] text-4xl font-black tracking-tight">No exact match yet.</h2>
                <p className="mt-3 text-sm leading-7 text-muted-foreground">
                  We have not reviewed "{query}" yet. But do not worry, here are the closest solid alternatives.
                </p>
                <div className="mt-8 flex flex-wrap justify-center gap-3">
                  {selectedScope !== 'all' ? (
                    <Link href={buildSearchHref(query, 'all', selectedCategory)} className="rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground">
                      Search everything
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

              <div className="grid gap-6 lg:grid-cols-3">
                {fallbackCategories.map((category) => (
                  <Link key={category} href={buildCategoryPath(category)} className="rounded-[2rem] bg-white p-6 shadow-panel transition-transform hover:-translate-y-1">
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">Closest Match</p>
                    <h3 className="mt-3 font-[var(--font-display)] text-2xl font-black tracking-tight text-foreground">{getCategoryLabel(category)}</h3>
                    <p className="mt-3 text-sm leading-7 text-muted-foreground">Open the category page if the exact model is missing but the product type is still right.</p>
                    <p className="mt-5 text-sm font-semibold text-primary">Open category page →</p>
                  </Link>
                ))}
                {leadReview ? (
                  <Link href={getArticlePath(leadReview.type, leadReview.slug)} className="rounded-[2rem] bg-white p-6 shadow-panel transition-transform hover:-translate-y-1">
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">Featured Review</p>
                    <h3 className="mt-3 font-[var(--font-display)] text-2xl font-black tracking-tight text-foreground">{leadReview.title}</h3>
                    <p className="mt-3 text-sm leading-7 text-muted-foreground">
                      {leadReview.summary || 'Open a review if you want a concrete example of how Bes3 helps narrow a shortlist.'}
                    </p>
                    <p className="mt-5 text-sm font-semibold text-primary">Open review →</p>
                  </Link>
                ) : null}
                {leadGuide ? (
                  <Link href={getArticlePath(leadGuide.type, leadGuide.slug)} className="rounded-[2rem] bg-white p-6 shadow-panel transition-transform hover:-translate-y-1">
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">Helpful Guide</p>
                    <h3 className="mt-3 font-[var(--font-display)] text-2xl font-black tracking-tight text-foreground">{leadGuide.title}</h3>
                    <p className="mt-3 text-sm leading-7 text-muted-foreground">
                      {leadGuide.summary || 'Use a guide when the query is too narrow and you need a broader explanation before choosing.'}
                    </p>
                    <p className="mt-5 text-sm font-semibold text-primary">Open guide →</p>
                  </Link>
                ) : null}
              </div>
            </section>
          )
        ) : mode === 'intent' ? null : (
          <div className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
              <div className="rounded-[2rem] bg-white p-8 shadow-panel">
                <h2 className="font-[var(--font-display)] text-3xl font-black tracking-tight">Start with what you need.</h2>
                <p className="mt-3 text-sm leading-7 text-muted-foreground">
                  Good search should match where you are: discover products, check one option, compare top picks, or start a price alert when you are waiting for a better deal.
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
                <p className="editorial-kicker">Search Tips</p>
                <h2 className="mt-3 font-[var(--font-display)] text-3xl font-black tracking-tight">How to get better results</h2>
                <div className="mt-4 space-y-4 text-sm leading-7 text-muted-foreground">
                  <p>Search a product name if you already have one option in mind and want to validate it fast.</p>
                  <p>Search a category or use case if you still need Bes3 to narrow the list for you.</p>
                  <p>Use the scope filter to jump between products, reviews, comparisons, and guides.</p>
                  <p>When search still feels too broad, open a category page or shortlist instead of widening the query forever.</p>
                </div>
              </div>
            </div>

            {!hasActiveSearch ? (
              <SeoFaqSection
                eyebrow="Search FAQ"
                title="How to use Bes3 search without getting stuck"
                description="Search should move you into stronger product, review, comparison, and category pages instead of trapping you in weak result pages."
                entries={[...SEARCH_FAQ_ENTRIES]}
              />
            ) : null}
          </div>
        )}
      </div>
    </PublicShell>
  )
}
