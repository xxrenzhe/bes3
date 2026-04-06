import { getArticlePath } from '@/lib/article-path'
import { pickMetadataDescription } from '@/lib/metadata'
import { toAbsoluteUrl } from '@/lib/site-url'
import type { ArticleRecord } from '@/lib/site-data'

export type FeedEntry = {
  id: string
  url: string
  path: string
  title: string
  summary: string
  publishedAt: string
  updatedAt: string
  image: string | null
  articleType: string
}

function normalizeDate(value: string | null | undefined) {
  if (!value) return null
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function toIsoString(value: string | null | undefined) {
  return normalizeDate(value)?.toISOString() || new Date(0).toISOString()
}

export function getFeedEntries(articles: ArticleRecord[], limit: number = 30): FeedEntry[] {
  return [...articles]
    .sort((left, right) => {
      const leftTime = normalizeDate(left.updatedAt || left.publishedAt || left.createdAt)?.getTime() || 0
      const rightTime = normalizeDate(right.updatedAt || right.publishedAt || right.createdAt)?.getTime() || 0
      return rightTime - leftTime
    })
    .slice(0, limit)
    .map((article) => {
      const path = getArticlePath(article.type, article.slug)
      const publishedAt = toIsoString(article.publishedAt || article.createdAt || article.updatedAt)
      const updatedAt = toIsoString(article.updatedAt || article.publishedAt || article.createdAt)

      return {
        id: toAbsoluteUrl(path),
        url: toAbsoluteUrl(path),
        path,
        title: article.seoTitle || article.title,
        summary:
          pickMetadataDescription(article.seoDescription, article.summary, article.product?.description) ||
          `${article.title} on Bes3 helps buyers move from research into a narrower shortlist.`,
        publishedAt,
        updatedAt,
        image: article.heroImageUrl || article.product?.heroImageUrl || null,
        articleType: article.type
      }
    })
}

export function escapeXml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}
