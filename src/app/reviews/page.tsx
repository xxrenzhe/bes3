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
  const reviews = await listArticlesByType('review')
  const freshnessDate = reviews[0]?.updatedAt || reviews[0]?.publishedAt || reviews[0]?.createdAt || null

  return buildPageMetadata({
    title: 'Reviews',
    description: 'Browse Bes3 reviews when you want to check whether a product is really worth buying.',
    path: '/reviews',
    locale: getRequestLocale(),
    image: reviews[0]?.heroImageUrl || reviews[0]?.product?.heroImageUrl,
    freshnessDate,
    freshnessInTitle: true,
    keywords: ['reviews', 'product reviews', 'buying reviews', 'honest reviews']
  })
}

export default async function ReviewsIndexPage() {
  const reviews = await listArticlesByType('review')
  const latestRefresh = reviews[0]?.updatedAt || reviews[0]?.publishedAt || reviews[0]?.createdAt || null
  const categories = Array.from(
    new Set(reviews.map((article) => article.product?.category).filter(Boolean) as string[])
  ).sort((left, right) => left.localeCompare(right))

  const breadcrumbItems = [
    { name: 'Home', path: '/' },
    { name: 'Reviews', path: '/reviews' }
  ]

  const faqEntries = [
    {
      question: 'When should I start with the review index?',
      answer: 'Use the reviews page when one product already looks promising and you want a clearer yes-or-no answer.'
    },
    {
      question: 'What should a review page help me confirm?',
      answer: 'A review page should confirm fit, major tradeoffs, current pricing context, and whether you should keep validating or move forward.'
    }
  ]

  return (
    <PublicShell>
      <StructuredData
        data={[
          buildBreadcrumbSchema('/reviews', breadcrumbItems),
          buildCollectionPageSchema({
            path: '/reviews',
            title: 'Reviews',
            description: 'Browse Bes3 reviews when you want to check whether a product is really worth buying.',
            breadcrumbItems,
            dateModified: latestRefresh,
            items: reviews.map((article) => ({
              name: article.title,
              path: getArticlePath(article.type, article.slug)
            }))
          }),
          buildHowToSchema(
            '/reviews',
            'How to use Bes3 reviews',
            'Use reviews when one product already looks promising and you want a clearer answer before buying.',
            [
              {
                name: 'Open the most relevant review',
                text: 'Start with the product that already seems closest to fit so the decision gets narrower instead of wider.'
              },
              {
                name: 'Validate the next move',
                text: 'Use the review to decide whether to open the product page, compare alternatives, or move on.'
              }
            ]
          ),
          buildFaqSchema('/reviews', faqEntries)
        ]}
      />
      <div className="mx-auto max-w-7xl space-y-14 px-4 py-14 sm:px-6 lg:px-8">
        <section className="rounded-[2.5rem] bg-[linear-gradient(135deg,#fff8ef_0%,#f8fbff_48%,#eefaf5_100%)] p-8 shadow-panel sm:p-10">
          <p className="editorial-kicker">Reviews</p>
          <h1 className="mt-3 font-[var(--font-display)] text-5xl font-black tracking-tight text-foreground sm:text-6xl">Browse every Bes3 review page.</h1>
          <p className="mt-4 max-w-3xl text-sm leading-8 text-muted-foreground">
            This page gathers Bes3 reviews for buyers who want straight answers, clear pros and cons, and a quick path to the next step.
          </p>
        </section>

        <section className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
          {reviews.map((article) => (
            <Link key={article.id} href={getArticlePath(article.type, article.slug)} className="rounded-[2rem] bg-white p-7 shadow-panel transition-transform hover:-translate-y-1">
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-primary">Review Page</p>
              <h2 className="mt-3 font-[var(--font-display)] text-3xl font-black tracking-tight text-foreground">{article.title}</h2>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">
                {article.summary || article.product?.description || 'Use this review to validate fit, tradeoffs, and the right next action.'}
              </p>
              <div className="mt-5 flex items-center justify-between gap-4 text-sm">
                <span className="font-semibold text-foreground">{article.product?.productName || 'Review'}</span>
                <span className="text-muted-foreground">{formatEditorialDate(article.updatedAt || article.publishedAt || article.createdAt, 'recently')}</span>
              </div>
              <p className="mt-4 text-sm font-semibold text-primary">
                {article.product?.category ? `${getCategoryLabel(article.product.category)} reviews` : 'Open review page'} →
              </p>
            </Link>
          ))}
        </section>

        <section className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
          {categories.map((category) => {
            const categoryReviews = reviews.filter((article) => categoryMatches(article.product?.category, category)).slice(0, 3)

            return (
              <div key={category} className="rounded-[2rem] bg-white p-7 shadow-panel">
                <Link href={buildCategoryPath(category)} className="text-[10px] font-bold uppercase tracking-[0.22em] text-primary">
                  Category Page
                </Link>
                <h2 className="mt-3 font-[var(--font-display)] text-3xl font-black tracking-tight text-foreground">{getCategoryLabel(category)}</h2>
                <p className="mt-3 text-sm leading-7 text-muted-foreground">
                  Reviews for this category stay together here so you can move from broad browsing to one product without starting a new search.
                </p>
                <div className="mt-5 space-y-3 text-sm text-muted-foreground">
                  {categoryReviews.map((article) => (
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
