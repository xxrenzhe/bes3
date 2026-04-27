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
  if (!article || article.type !== 'review') {
    return buildPageMetadata({
      title: 'Review Researching',
      description: 'This Bes3 review is not available yet.',
      path: '/reviews',
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
      pageType: 'review'
    }),
    path,
    locale: getRequestLocale(),
    type: 'article',
    image: article.heroImageUrl || article.product?.heroImageUrl,
    section: 'Reviews',
    category: article.product?.category || article.product?.categorySlug || undefined,
    publishedTime: article.publishedAt || article.createdAt,
    modifiedTime: article.updatedAt || article.publishedAt || article.createdAt,
    keywords: [article.title, article.keyword || '', article.product?.productName || '', 'product review'].filter(Boolean)
  })
}

export default async function ReviewPage({ params }: { params: Promise<{ slug: string }> }) {
  const article = await getArticleBySlug((await params).slug)
  if (!article || article.type !== 'review') notFound()

  return (
    <PublicShell>
      <EditorialArticlePage article={article} />
    </PublicShell>
  )
}
