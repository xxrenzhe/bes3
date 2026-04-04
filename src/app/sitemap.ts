import type { MetadataRoute } from 'next'
import { listCategories, listProducts, listPublishedArticles } from '@/lib/site-data'
import { getArticlePath } from '@/lib/article-path'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const [articles, categories, products] = await Promise.all([listPublishedArticles(), listCategories(), listProducts()])
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
      url: `${siteUrl}${getArticlePath(article.type, article.slug)}`,
      lastModified: article.publishedAt ? new Date(article.publishedAt) : new Date()
    })
  }

  for (const product of products) {
    if (!product.slug) continue
    routes.push({
      url: `${siteUrl}/products/${product.slug}`,
      lastModified: new Date()
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
