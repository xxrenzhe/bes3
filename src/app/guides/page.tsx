import type { Metadata } from 'next'
import Link from 'next/link'
import { PublicShell } from '@/components/layout/PublicShell'
import { StructuredData } from '@/components/site/StructuredData'
import { getArticlePath } from '@/lib/article-path'
import { buildCategoryPath, categoryMatches } from '@/lib/category'
import { formatEditorialDate, getCategoryLabel } from '@/lib/editorial'
import { buildPageMetadata } from '@/lib/metadata'
import { getRequestLocale } from '@/lib/request-locale'
import { buildBreadcrumbSchema, buildCollectionPageSchema, buildFaqSchema, buildHowToSchema } from '@/lib/structured-data'
import { listArticlesByType } from '@/lib/site-data'

export async function generateMetadata(): Promise<Metadata> {
  const guides = await listArticlesByType('guide')
  const freshnessDate = guides[0]?.updatedAt || guides[0]?.publishedAt || guides[0]?.createdAt || null

  return buildPageMetadata({
    title: 'Buying Guides',
    description: 'Browse Bes3 buying guides when you want to understand a category before narrowing your options.',
    path: '/guides',
    locale: getRequestLocale(),
    image: guides[0]?.heroImageUrl || guides[0]?.product?.heroImageUrl,
    freshnessDate,
    freshnessInTitle: true,
    keywords: ['buying guides', 'guides', 'category help', 'buying advice']
  })
}

export default async function GuidesIndexPage() {
  const guides = await listArticlesByType('guide')
  const latestRefresh = guides[0]?.updatedAt || guides[0]?.publishedAt || guides[0]?.createdAt || null
  const categories = Array.from(
    new Set(guides.map((article) => article.product?.category).filter(Boolean) as string[])
  ).sort((left, right) => left.localeCompare(right))

  const breadcrumbItems = [
    { name: 'Home', path: '/' },
    { name: 'Guides', path: '/guides' }
  ]

  const faqEntries = [
    {
      question: 'When should I start with guides instead of reviews?',
      answer: 'Start with guides when the product type or decision framework is still unclear. Move to reviews after the category and shortlist are more concrete.'
    },
    {
      question: 'What should a buying guide solve?',
      answer: 'A guide should make it clearer what matters, what to ignore, and which page to open next.'
    }
  ]

  return (
    <PublicShell>
      <StructuredData
        data={[
          buildBreadcrumbSchema('/guides', breadcrumbItems),
          buildCollectionPageSchema({
            path: '/guides',
            title: 'Buying Guides',
            description: 'Browse Bes3 buying guides when you want to understand a category before narrowing your options.',
            breadcrumbItems,
            dateModified: latestRefresh,
            items: guides.map((article) => ({
              name: article.title,
              path: getArticlePath(article.type, article.slug)
            }))
          }),
          buildHowToSchema(
            '/guides',
            'How to use Bes3 buying guides',
            'Use guides when the category is still fuzzy, then move into reviews or comparisons once the market is narrower.',
            [
              {
                name: 'Clarify the buying framework',
                text: 'Start with the guide that best matches your category or use case so the rest of the journey gets cleaner.'
              },
              {
                name: 'Move into product pages or reviews',
                text: 'After the guide reduces uncertainty, switch into reviews, comparisons, or product pages for proof and action.'
              }
            ]
          ),
          buildFaqSchema('/guides', faqEntries)
        ]}
      />
      <div className="mx-auto max-w-7xl space-y-14 px-4 py-14 sm:px-6 lg:px-8">
        <section className="rounded-[2.5rem] bg-[linear-gradient(135deg,#fff8ef_0%,#f8fbff_48%,#eefaf5_100%)] p-8 shadow-panel sm:p-10">
          <p className="editorial-kicker">Buying Guides</p>
          <h1 className="mt-3 font-[var(--font-display)] text-5xl font-black tracking-tight text-foreground sm:text-6xl">Browse every Bes3 buying guide.</h1>
          <p className="mt-4 max-w-3xl text-sm leading-8 text-muted-foreground">
            These guides are for buyers who still need the basics before moving on to product pages, reviews, or comparisons.
          </p>
        </section>

        <section className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
          {guides.map((article) => (
            <Link key={article.id} href={getArticlePath(article.type, article.slug)} className="rounded-[2rem] bg-white p-7 shadow-panel transition-transform hover:-translate-y-1">
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-primary">Guide</p>
              <h2 className="mt-3 font-[var(--font-display)] text-3xl font-black tracking-tight text-foreground">{article.title}</h2>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">
                {article.summary || 'Use this guide to understand the category, the key tradeoffs, and the best next page to open.'}
              </p>
              <div className="mt-5 flex items-center justify-between gap-4 text-sm">
                <span className="font-semibold text-foreground">{article.product?.productName || 'Buying guide'}</span>
                <span className="text-muted-foreground">{formatEditorialDate(article.updatedAt || article.publishedAt || article.createdAt, 'recently')}</span>
              </div>
              <p className="mt-4 text-sm font-semibold text-primary">
                {article.product?.category ? `${getCategoryLabel(article.product.category)} guides` : 'Open guide page'} →
              </p>
            </Link>
          ))}
        </section>

        <section className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
          {categories.map((category) => {
            const categoryGuides = guides.filter((article) => categoryMatches(article.product?.category, category)).slice(0, 3)

            return (
              <div key={category} className="rounded-[2rem] bg-white p-7 shadow-panel">
                <Link href={buildCategoryPath(category)} className="text-[10px] font-bold uppercase tracking-[0.22em] text-primary">
                  Category Page
                </Link>
                <h2 className="mt-3 font-[var(--font-display)] text-3xl font-black tracking-tight text-foreground">{getCategoryLabel(category)}</h2>
                <p className="mt-3 text-sm leading-7 text-muted-foreground">
                  These guides help explain the category before you narrow into product pages or direct comparisons.
                </p>
                <div className="mt-5 space-y-3 text-sm text-muted-foreground">
                  {categoryGuides.map((article) => (
                    <Link key={article.id} href={getArticlePath(article.type, article.slug)} className="block rounded-[1.25rem] bg-muted px-4 py-4 transition-colors hover:bg-emerald-50">
                      {article.title}
                    </Link>
                  ))}
                </div>
              </div>
            )
          })}
        </section>
      </div>
    </PublicShell>
  )
}
