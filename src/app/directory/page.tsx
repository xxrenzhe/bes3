import type { Metadata } from 'next'
import Link from 'next/link'
import { PublicShell } from '@/components/layout/PublicShell'
import { SeoFaqSection } from '@/components/site/SeoFaqSection'
import { StructuredData } from '@/components/site/StructuredData'
import { ShortlistActionBar } from '@/components/site/ShortlistActionBar'
import { getArticlePath } from '@/lib/article-path'
import { buildCategoryPath, categoryMatches } from '@/lib/category'
import { formatEditorialDate, getCategoryLabel } from '@/lib/editorial'
import { buildPageMetadata } from '@/lib/metadata'
import { buildNewsletterPath } from '@/lib/newsletter-path'
import { getRequestLocale } from '@/lib/request-locale'
import { buildBreadcrumbSchema, buildCollectionPageSchema, buildFaqSchema, buildHowToSchema } from '@/lib/structured-data'
import { toShortlistItem } from '@/lib/shortlist'
import { listBrands, listCategories, listPublishedArticles, listPublishedProducts } from '@/lib/site-data'
import { formatPriceSnapshot } from '@/lib/utils'

function getArticleTypeLabel(type: string) {
  if (type === 'comparison') return 'comparison'
  if (type === 'review') return 'review'
  return 'guide'
}

export async function generateMetadata(): Promise<Metadata> {
  const [articles, products] = await Promise.all([listPublishedArticles(), listPublishedProducts()])
  const freshnessDate =
    articles[0]?.updatedAt ||
    articles[0]?.publishedAt ||
    articles[0]?.createdAt ||
    products[0]?.updatedAt ||
    products[0]?.publishedAt ||
    null

  return buildPageMetadata({
    title: 'Category Directory',
    description:
      'Browse Bes3 by category to find good products, read reviews, compare options, and start category updates without starting over.',
    path: '/directory',
    locale: getRequestLocale(),
    image: articles[0]?.heroImageUrl || products[0]?.heroImageUrl,
    freshnessDate,
    freshnessInTitle: true,
    keywords: ['category directory', 'product categories', 'reviews', 'comparisons']
  })
}

export default async function DirectoryPage() {
  const [brands, categories, articles, products] = await Promise.all([
    listBrands(),
    listCategories(),
    listPublishedArticles(),
    listPublishedProducts()
  ])
  const leadCategory = categories[0] || ''
  const leadBrand = brands[0] || null
  const latestRefresh =
    articles[0]?.updatedAt ||
    articles[0]?.publishedAt ||
    articles[0]?.createdAt ||
    products[0]?.updatedAt ||
    products[0]?.publishedAt ||
    null
  const breadcrumbItems = [
    { name: 'Home', path: '/' },
    { name: 'Directory', path: '/directory' }
  ]
  const directoryAlertHref = buildNewsletterPath({
    intent: leadCategory ? 'category-brief' : 'offers',
    category: leadCategory || '',
    cadence: 'weekly',
    returnTo: '/directory',
    returnLabel: 'Resume directory',
    returnDescription: 'Return to the directory with the same browse-first shopping context still intact.'
  })
  const howToSteps = [
    {
      name: 'Choose the right category',
      text: 'Open the category that matches what you actually want to buy, so Bes3 can show the most useful products, reviews, and comparisons.'
    },
    {
      name: 'Shortlist the best options',
      text: 'Use the strongest products and live pages in that category to narrow the field before you compare or click out.'
    },
    {
      name: 'Track the category if you wait',
      text: 'If you are not buying today, turn the same category into a price watch or category update instead of reopening broad research later.'
    }
  ]
  const structuredData = buildCollectionPageSchema({
    path: '/directory',
    title: 'Category Directory',
    description: 'Browse Bes3 by category to find good products, read reviews, compare options, and start category updates without starting over.',
    breadcrumbItems,
    dateModified: latestRefresh,
    items: categories.map((category) => ({
      name: category.replace(/-/g, ' '),
      path: buildCategoryPath(category)
    }))
  })
  const directoryRoutes = [
    {
      eyebrow: 'Start',
      title: 'Search a concrete need',
      description: 'Use search when you already know the product type or use case and want Bes3 to narrow it fast.',
      href: '/search?scope=products',
      label: 'Search products'
    },
    {
      eyebrow: 'Browse',
      title: leadCategory ? `Open ${getCategoryLabel(leadCategory)}` : 'Open a category page',
      description: 'Category pages work best once you know what kind of product you need and want the strongest picks in one place.',
      href: buildCategoryPath(leadCategory),
      label: leadCategory ? 'Open category page' : 'Browse categories'
    },
    {
      eyebrow: 'Brands',
      title: leadBrand ? `Open ${leadBrand.name}` : 'Browse by brand',
      description: 'Brand pages are useful when you already trust one brand and want everything from that brand grouped in one place.',
      href: leadBrand ? `/brands/${leadBrand.slug}` : '/brands',
      label: leadBrand ? `Open ${leadBrand.name}` : 'Browse brands'
    },
    {
      eyebrow: 'Watch',
      title: 'Start category updates',
      description: 'If you are still deciding but buying later, save the category as a price watch or category update so you can pick back up later without starting over.',
      href: directoryAlertHref,
      label: 'Start category updates'
    },
    {
      eyebrow: 'Offers',
      title: 'Check live price opportunities',
      description: 'Open offers only after the category already looks right, so promotions do not pull you toward the wrong product.',
      href: '/offers',
      label: 'Browse offers'
    }
  ]
  const faqEntries = [
    {
      question: 'When should I use the directory instead of search?',
      answer: 'Use the directory when you already know the kind of product you need and want to browse by category or brand. Use search when your query is still more specific than the category.'
    },
    {
      question: 'What is the difference between category pages and brand pages?',
      answer: 'Category pages help you compare across brands. Brand pages focus on one brand. They solve different shopping needs and should not replace each other.'
    },
    {
      question: 'Why does each card point to a next move instead of just listing pages?',
      answer: 'Because the directory should help you move forward, not just show a pile of links. Each card points to the next page most likely to help.'
    }
  ]

  return (
    <PublicShell>
      <StructuredData
        data={[
          buildBreadcrumbSchema('/directory', breadcrumbItems),
          structuredData,
          buildHowToSchema('/directory', 'How to use the Bes3 directory', 'Use the directory to choose the right category, shortlist good products, and start category updates if you are not ready to buy yet.', howToSteps),
          buildFaqSchema('/directory', faqEntries)
        ]}
      />
      <div className="mx-auto max-w-7xl space-y-14 px-4 py-14 sm:px-6 lg:px-8">
        <section className="rounded-[2.5rem] bg-[linear-gradient(135deg,#fff8ef_0%,#f8fbff_48%,#eefaf5_100%)] p-8 shadow-panel sm:p-10">
          <div className="grid gap-8 xl:grid-cols-[1fr_0.95fr] xl:items-start">
            <div>
              <p className="editorial-kicker">Categories</p>
              <h1 className="mt-4 font-[var(--font-display)] text-5xl font-black tracking-tight text-foreground sm:text-6xl">Browse Bes3 by category.</h1>
              <p className="mt-4 max-w-3xl text-lg leading-8 text-muted-foreground">
                Use the directory once you know the general category. Each card points you toward the most useful next step instead of acting like a plain list of links.
              </p>
              <div className="mt-6 rounded-[1.75rem] bg-slate-950 p-5 text-white">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-200">Best next step</p>
                <p className="mt-3 text-sm leading-7 text-slate-200">
                  Start in a category page when you already know the market. Switch to search when the need is still specific, and use category updates when price timing matters more than immediate action.
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
            const categoryArticles = articles.filter((article) => categoryMatches(article.product?.category, category))
            const categoryProducts = products.filter((product) => categoryMatches(product.category, category))
            const featuredArticle = categoryArticles[0] || null
            const featuredProduct = categoryProducts[0] || null
            const featuredReview = categoryArticles.find((article) => article.type === 'review') || null
            const featuredComparison = categoryArticles.find((article) => article.type === 'comparison') || null
            const featuredDecisionArticle = featuredComparison || featuredReview || featuredArticle
            const bestRouteLabel =
              categoryProducts.length >= 2
                ? 'Shortlist this category'
                : featuredComparison
                  ? 'Compare the top options'
                  : featuredReview
                    ? 'Read the lead review'
                  : featuredArticle
                    ? `Open the lead ${getArticleTypeLabel(featuredArticle.type)}`
                  : 'Use category updates while more pages arrive'
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
                      {categoryProducts.length} products · {categoryArticles.length} pages to explore · Updated {formatEditorialDate(latestRefresh, 'soon')}
                    </p>
                    <p className="mt-3 text-sm font-semibold text-foreground">{bestRouteLabel}</p>
                  </div>
                  <Link href={buildCategoryPath(category)} className="text-sm font-semibold text-primary transition-colors hover:text-emerald-700">
                    Open page →
                  </Link>
                </div>

                {featuredProduct ? (
                  <div className="mt-6 rounded-[1.5rem] bg-muted/50 p-5">
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">Start here</p>
                    <h3 className="mt-3 font-[var(--font-display)] text-2xl font-black tracking-tight text-foreground">{featuredProduct.productName}</h3>
                    <p className="mt-3 text-sm leading-7 text-muted-foreground">
                      {featuredProduct.description || 'Current price context and a direct path to the product page.'}
                    </p>
                    <ShortlistActionBar item={toShortlistItem(featuredProduct)} compact className="mt-4" source="directory-category-start" />
                    <div className="mt-4 flex items-center justify-between gap-4">
                      <span className="text-sm font-semibold text-foreground">
                        {formatPriceSnapshot(featuredProduct.priceAmount, featuredProduct.priceCurrency || 'USD')}
                      </span>
                      {featuredProduct.slug ? (
                        <Link href={`/products/${featuredProduct.slug}`} className="text-sm font-semibold text-primary transition-colors hover:text-emerald-700">
                          Open product page →
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
                  {!featuredArticle && !featuredProduct ? <p>More pages for this category are on the way.</p> : null}
                </div>

                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  <Link href={buildCategoryPath(category, 'category-shortlist')} className="rounded-[1.25rem] bg-muted px-4 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-emerald-50">
                    Open shortlist →
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
                          ? `Open ${getArticleTypeLabel(featuredDecisionArticle.type)} →`
                          : 'Track this category →'}
                  </Link>
                </div>
              </div>
            )
          })}
        </div>

        <SeoFaqSection
          title="Directory questions, answered clearly."
          entries={faqEntries}
          description="This page explains when to use category browsing, brand browsing, or search so the next move feels obvious."
        />
      </div>
    </PublicShell>
  )
}
