import type { Metadata } from 'next'
import Link from 'next/link'
import { PublicShell } from '@/components/layout/PublicShell'
import { StructuredData } from '@/components/site/StructuredData'
import { buildBrandCategoryPath, buildCategoryPath, categoryMatches } from '@/lib/category'
import { getArticlePath } from '@/lib/article-path'
import { formatEditorialDate, getCategoryLabel } from '@/lib/editorial'
import { buildPageMetadata } from '@/lib/metadata'
import { getRequestLocale } from '@/lib/request-locale'
import { buildBreadcrumbSchema, buildCollectionPageSchema, buildFaqSchema, buildHowToSchema } from '@/lib/structured-data'
import { getBrandSlug, listPublishedArticles, listPublishedProducts } from '@/lib/site-data'

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
    title: 'Category Hubs',
    description: 'Browse Bes3 category hubs to see the strongest products, live reviews, comparisons, and brand-category paths for each buying intent cluster.',
    path: '/categories',
    locale: getRequestLocale(),
    image: articles[0]?.heroImageUrl || products[0]?.heroImageUrl,
    freshnessDate,
    freshnessInTitle: true,
    keywords: ['category hubs', 'category reviews', 'product comparisons', 'brand-category pages']
  })
}

export default async function CategoriesIndexPage() {
  const [articles, products] = await Promise.all([listPublishedArticles(), listPublishedProducts()])
  const categories = Array.from(new Set([
    ...products.map((product) => product.category).filter(Boolean),
    ...articles.map((article) => article.product?.category).filter(Boolean)
  ] as string[])).sort((left, right) => left.localeCompare(right))

  const latestRefresh =
    articles[0]?.updatedAt ||
    articles[0]?.publishedAt ||
    articles[0]?.createdAt ||
    products[0]?.updatedAt ||
    products[0]?.publishedAt ||
    null

  const breadcrumbItems = [
    { name: 'Home', path: '/' },
    { name: 'Categories', path: '/categories' }
  ]

  const faqEntries = [
    {
      question: 'Why use the category hub instead of a generic archive?',
      answer: 'Because a category hub should collect the strongest products, reviews, comparisons, and exact brand-category pages around one buying intent, rather than forcing a new search.'
    },
    {
      question: 'When should I leave a category hub?',
      answer: 'Leave it when the brand already looks right or one product is already strong enough to validate. Stay in the category when cross-brand comparison still matters.'
    },
    {
      question: 'What makes these pages useful for SEO and buyers at the same time?',
      answer: 'They act as clean crawl surfaces for related URLs and also give buyers the next page that matches their actual stage: shortlist, validate, compare, or track.'
    }
  ]

  const structuredData = [
    buildBreadcrumbSchema('/categories', breadcrumbItems),
    buildCollectionPageSchema({
      path: '/categories',
      title: 'Category Hubs',
      description: 'Browse Bes3 category hubs to see the strongest products, live reviews, comparisons, and brand-category paths for each buying intent cluster.',
      breadcrumbItems,
      dateModified: latestRefresh,
      items: categories.map((category) => ({
        name: getCategoryLabel(category),
        path: buildCategoryPath(category)
      }))
    }),
    buildHowToSchema(
      '/categories',
      'How to use Bes3 category hubs',
      'Use category hubs to stay inside one buying intent, open the strongest review or comparison, and only narrow to a brand when the shortlist is ready.',
      [
        {
          name: 'Open the right category',
          text: 'Start with the category that matches the product type you actually want to buy so Bes3 can keep adjacent products and editorial pages aligned.'
        },
        {
          name: 'Use the strongest validation page',
          text: 'Open the lead review or comparison after the category narrowed the field enough that a product-level decision starts to make sense.'
        },
        {
          name: 'Switch to a brand-category lane only when needed',
          text: 'Use exact brand-category pages after both the brand and the category matter at the same time.'
        }
      ]
    ),
    buildFaqSchema('/categories', faqEntries)
  ]

  return (
    <PublicShell>
      <StructuredData data={structuredData} />
      <div className="mx-auto max-w-7xl space-y-14 px-4 py-14 sm:px-6 lg:px-8">
        <section className="rounded-[2.5rem] bg-[linear-gradient(135deg,#fff8ef_0%,#f8fbff_48%,#eefaf5_100%)] p-8 shadow-panel sm:p-10">
          <p className="editorial-kicker">Category Hub Index</p>
          <h1 className="mt-3 font-[var(--font-display)] text-5xl font-black tracking-tight text-foreground sm:text-6xl">Browse every Bes3 category hub.</h1>
          <p className="mt-4 max-w-3xl text-sm leading-8 text-muted-foreground">
            This page exists as a crawlable category matrix. Each hub bundles the strongest products, supporting reviews, comparison pages, and brand-category spokes around one buyer intent.
          </p>
        </section>

        <section className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
          {categories.map((category) => {
            const categoryProducts = products.filter((product) => categoryMatches(product.category, category))
            const categoryArticles = articles.filter((article) => categoryMatches(article.product?.category, category))
            const leadReview = categoryArticles.find((article) => article.type === 'review') || categoryArticles[0] || null
            const leadComparison = categoryArticles.find((article) => article.type === 'comparison') || null
            const topBrands = Array.from(
              new Set(categoryProducts.map((product) => product.brand).filter(Boolean) as string[])
            )
              .slice(0, 2)
              .map((brand) => ({
                name: brand,
                slug: getBrandSlug(brand)
              }))
              .filter((brand) => brand.slug)

            return (
              <div key={category} className="rounded-[2rem] bg-white p-7 shadow-panel">
                <Link href={buildCategoryPath(category)} className="text-[10px] font-bold uppercase tracking-[0.22em] text-primary">
                  Category Hub
                </Link>
                <h2 className="mt-3 font-[var(--font-display)] text-3xl font-black tracking-tight text-foreground">{getCategoryLabel(category)}</h2>
                <p className="mt-3 text-sm leading-7 text-muted-foreground">
                  {categoryProducts.length} products and {categoryArticles.length} editorial pages currently support this hub.
                </p>
                <div className="mt-5 space-y-3">
                  {leadReview ? (
                    <Link href={getArticlePath(leadReview.type, leadReview.slug)} className="block rounded-[1.25rem] bg-muted px-4 py-4 transition-colors hover:bg-emerald-50">
                      <p className="text-xs font-semibold text-foreground">Lead review</p>
                      <p className="mt-1 text-sm text-muted-foreground">{leadReview.title}</p>
                    </Link>
                  ) : null}
                  {leadComparison ? (
                    <Link href={getArticlePath(leadComparison.type, leadComparison.slug)} className="block rounded-[1.25rem] bg-muted px-4 py-4 transition-colors hover:bg-emerald-50">
                      <p className="text-xs font-semibold text-foreground">Lead comparison</p>
                      <p className="mt-1 text-sm text-muted-foreground">{leadComparison.title}</p>
                    </Link>
                  ) : null}
                  {topBrands.map((brand) => (
                    <Link key={brand.slug} href={buildBrandCategoryPath(brand.slug, category)} className="block rounded-[1.25rem] bg-muted px-4 py-4 transition-colors hover:bg-emerald-50">
                      <p className="text-xs font-semibold text-foreground">Brand-category lane</p>
                      <p className="mt-1 text-sm text-muted-foreground">{brand.name} in {getCategoryLabel(category)}</p>
                    </Link>
                  ))}
                </div>
                <p className="mt-5 text-sm font-semibold text-primary">Updated {formatEditorialDate(categoryArticles[0]?.updatedAt || categoryProducts[0]?.updatedAt, 'recently')} →</p>
              </div>
            )
          })}
        </section>
      </div>
    </PublicShell>
  )
}
