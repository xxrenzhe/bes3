import type { MetadataRoute } from 'next'
import { listCategories, listPublishedArticles } from '@/lib/site-data'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const [articles, categories] = await Promise.all([listPublishedArticles(), listCategories()])
  const routes: MetadataRoute.Sitemap = [
    '',
    '/about',
    '/contact',
    '/deals',
    '/directory',
    '/newsletter',
    '/privacy',
    '/terms'
  ].map((route) => ({
    url: `${siteUrl}${route}`,
    lastModified: new Date()
  }))

  for (const article of articles) {
    routes.push({
      url: `${siteUrl}/${article.type === 'comparison' ? 'compare' : 'reviews'}/${article.slug}`,
      lastModified: article.publishedAt ? new Date(article.publishedAt) : new Date()
    })
  }

  for (const category of categories) {
    routes.push({
      url: `${siteUrl}/categories/${category}`,
      lastModified: new Date()
    })
  }

  return routes
}
