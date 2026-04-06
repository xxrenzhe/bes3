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
  const comparisons = await listArticlesByType('comparison')
  const freshnessDate = comparisons[0]?.updatedAt || comparisons[0]?.publishedAt || comparisons[0]?.createdAt || null

  return buildPageMetadata({
    title: 'Comparisons',
    description: 'Browse Bes3 comparisons when you are choosing between a few strong options and want the tradeoffs explained clearly.',
    path: '/compare',
    locale: getRequestLocale(),
    image: comparisons[0]?.heroImageUrl || comparisons[0]?.product?.heroImageUrl,
    freshnessDate,
    freshnessInTitle: true,
    keywords: ['comparisons', 'product comparisons', 'side by side', 'buying comparisons']
  })
}

export default async function CompareIndexPage() {
  const comparisons = await listArticlesByType('comparison')
  const latestRefresh = comparisons[0]?.updatedAt || comparisons[0]?.publishedAt || comparisons[0]?.createdAt || null
  const categories = Array.from(
    new Set(comparisons.map((article) => article.product?.category).filter(Boolean) as string[])
  ).sort((left, right) => left.localeCompare(right))

  const breadcrumbItems = [
    { name: 'Home', path: '/' },
    { name: 'Compare', path: '/compare' }
  ]

  const faqEntries = [
    {
      question: 'When should I use comparisons?',
      answer: 'Use comparisons after you already have a few serious options and want the differences explained clearly.'
    },
    {
      question: 'What should happen after a comparison page?',
      answer: 'A good comparison should narrow the field to one likely winner, then send you to the product page or price check.'
    }
  ]

  return (
    <PublicShell>
      <StructuredData
        data={[
          buildBreadcrumbSchema('/compare', breadcrumbItems),
          buildCollectionPageSchema({
            path: '/compare',
            title: 'Comparisons',
            description: 'Browse Bes3 comparisons when you are choosing between a few strong options and want the tradeoffs explained clearly.',
            breadcrumbItems,
            dateModified: latestRefresh,
            items: comparisons.map((article) => ({
              name: article.title,
              path: getArticlePath(article.type, article.slug)
            }))
          }),
          buildHowToSchema(
            '/compare',
            'How to use Bes3 comparisons',
            'Use comparisons once you have a few strong options and need help picking the better one.',
            [
              {
                name: 'Open the most relevant comparison',
                text: 'Start with the closest side-by-side choice so the page can resolve tradeoffs that still block the decision.'
              },
              {
                name: 'Move to the winning product',
                text: 'Once one option becomes clearly stronger, continue on the product page or deal path instead of reading more generic content.'
              }
            ]
          ),
          buildFaqSchema('/compare', faqEntries)
        ]}
      />
      <div className="mx-auto max-w-7xl space-y-14 px-4 py-14 sm:px-6 lg:px-8">
        <section className="rounded-[2.5rem] bg-[linear-gradient(135deg,#0f172a_0%,#1d4ed8_55%,#0f766e_100%)] p-8 text-white shadow-[0_35px_80px_-45px_rgba(15,23,42,0.8)] sm:p-10">
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-emerald-200">Comparisons</p>
          <h1 className="mt-3 font-[var(--font-display)] text-5xl font-black tracking-tight sm:text-6xl">Browse every Bes3 comparison page.</h1>
          <p className="mt-4 max-w-3xl text-sm leading-8 text-slate-200">
            This page gathers Bes3 comparisons for shoppers who already have a few strong options and want the differences explained fast.
          </p>
        </section>

        <section className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
          {comparisons.map((article) => (
            <Link key={article.id} href={getArticlePath(article.type, article.slug)} className="rounded-[2rem] bg-white p-7 shadow-panel transition-transform hover:-translate-y-1">
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-primary">Comparison</p>
              <h2 className="mt-3 font-[var(--font-display)] text-3xl font-black tracking-tight text-foreground">{article.title}</h2>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">
                {article.summary || 'Use this page when you want the important differences explained clearly, not more broad browsing.'}
                
              </p>
              <div className="mt-5 flex items-center justify-between gap-4 text-sm">
                <span className="font-semibold text-foreground">{article.product?.productName || 'Decision comparison'}</span>
                <span className="text-muted-foreground">{formatEditorialDate(article.updatedAt || article.publishedAt || article.createdAt, 'recently')}</span>
              </div>
              <p className="mt-4 text-sm font-semibold text-primary">
                {article.product?.category ? `${getCategoryLabel(article.product.category)} comparisons` : 'Open comparison page'} →
              </p>
            </Link>
          ))}
        </section>

        <section className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
          {categories.map((category) => {
            const categoryComparisons = comparisons.filter((article) => categoryMatches(article.product?.category, category)).slice(0, 3)

            return (
              <div key={category} className="rounded-[2rem] bg-white p-7 shadow-panel">
                <Link href={buildCategoryPath(category)} className="text-[10px] font-bold uppercase tracking-[0.22em] text-primary">
                  Category Page
                </Link>
                <h2 className="mt-3 font-[var(--font-display)] text-3xl font-black tracking-tight text-foreground">{getCategoryLabel(category)}</h2>
                <p className="mt-3 text-sm leading-7 text-muted-foreground">
                  Use the category page to narrow the field first, then open one of these comparisons when the differences become the real blocker.
                </p>
                <div className="mt-5 space-y-3 text-sm text-muted-foreground">
                  {categoryComparisons.map((article) => (
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
