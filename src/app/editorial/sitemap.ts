import type { MetadataRoute } from 'next'
import { getArticlePath } from '@/lib/article-path'
import { buildLocalizedSitemapRoute, maxDate } from '@/lib/sitemap-utils'
import { listPublishedArticles } from '@/lib/site-data'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const articles = await listPublishedArticles()

  return articles.flatMap((article) =>
    buildLocalizedSitemapRoute(getArticlePath(article.type, article.slug), {
      lastModified: maxDate([article.updatedAt, article.publishedAt, article.createdAt]),
      changeFrequency: article.type === 'guide' ? 'monthly' : 'weekly',
      priority: article.type === 'comparison' ? 0.84 : article.type === 'review' ? 0.82 : 0.76
    })
  )
}
