import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { PublicShell } from '@/components/layout/PublicShell'
import { EditorialArticlePage } from '@/components/site/EditorialArticlePage'
import { getArticlePath } from '@/lib/article-path'
import { buildPageMetadata, buildIntentMetadataDescription } from '@/lib/metadata'
import { getRequestLocale } from '@/lib/request-locale'
import { getArticleBySlug } from '@/lib/site-data'

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const article = await getArticleBySlug((await params).slug)
  if (!article || article.type !== 'comparison') {
    return buildPageMetadata({
      title: 'Comparison Researching',
      description: 'This Bes3 comparison is not available yet.',
      path: '/compare',
      locale: getRequestLocale(),
      robots: { index: false, follow: true }
    })
  }

  const path = getArticlePath(article.type, article.slug)
  return buildPageMetadata({
    title: article.seoTitle || article.title,
    description: buildIntentMetadataDescription({
      title: article.seoTitle || article.title,
      description: article.seoDescription || article.summary || article.product?.description || '',
      pageType: 'comparison'
    }),
    path,
    locale: getRequestLocale(),
    type: 'article',
    image: article.heroImageUrl || article.product?.heroImageUrl,
    section: 'Comparisons',
    category: article.product?.category || article.product?.categorySlug || undefined,
    publishedTime: article.publishedAt || article.createdAt,
    modifiedTime: article.updatedAt || article.publishedAt || article.createdAt,
    keywords: [article.title, article.keyword || '', article.product?.productName || '', 'product comparison'].filter(Boolean)
  })
}

export default async function ComparisonPage({ params }: { params: Promise<{ slug: string }> }) {
  const article = await getArticleBySlug((await params).slug)
  if (!article || article.type !== 'comparison') notFound()

  return (
    <PublicShell>
      <EditorialArticlePage article={article} />
    </PublicShell>
  )
}
