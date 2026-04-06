import type { MetadataRoute } from 'next'
import { getSiteUrl } from '@/lib/site-url'
import { buildLocalizedSitemapRoute, maxDate } from '@/lib/sitemap-utils'
import { listBrands, listPublishedArticles, listPublishedProducts } from '@/lib/site-data'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = getSiteUrl()
  const [articles, brands, products] = await Promise.all([
    listPublishedArticles(),
    listBrands(),
    listPublishedProducts()
  ])

  const lastModified = maxDate([
    ...articles.flatMap((article) => [article.updatedAt, article.publishedAt, article.createdAt]),
    ...products.flatMap((product) => [product.updatedAt, product.publishedAt]),
    ...brands.map((brand) => brand.latestUpdate)
  ])

  return [
    ...buildLocalizedSitemapRoute('/trust', { lastModified, changeFrequency: 'monthly', priority: 0.72 }),
    ...buildLocalizedSitemapRoute('/about', { lastModified, changeFrequency: 'monthly', priority: 0.8 }),
    ...buildLocalizedSitemapRoute('/contact', { lastModified, changeFrequency: 'monthly', priority: 0.5 }),
    ...buildLocalizedSitemapRoute('/privacy', { lastModified, changeFrequency: 'yearly', priority: 0.3 }),
    ...buildLocalizedSitemapRoute('/terms', { lastModified, changeFrequency: 'yearly', priority: 0.3 }),
    ...buildLocalizedSitemapRoute('/data', { lastModified, changeFrequency: 'weekly', priority: 0.74 }),
    ...buildLocalizedSitemapRoute('/site-map', { lastModified, changeFrequency: 'weekly', priority: 0.7 }),
    {
      url: new URL('/llms.txt', siteUrl).toString(),
      lastModified,
      changeFrequency: 'weekly',
      priority: 0.5
    },
    {
      url: new URL('/.well-known/security.txt', siteUrl).toString(),
      lastModified,
      changeFrequency: 'monthly',
      priority: 0.44
    },
    {
      url: new URL('/feed.xml', siteUrl).toString(),
      lastModified,
      changeFrequency: 'daily',
      priority: 0.55
    },
    {
      url: new URL('/feed.json', siteUrl).toString(),
      lastModified,
      changeFrequency: 'daily',
      priority: 0.5
    },
    {
      url: new URL('/opensearch.xml', siteUrl).toString(),
      lastModified,
      changeFrequency: 'monthly',
      priority: 0.46
    },
    {
      url: new URL('/media-sitemap.xml', siteUrl).toString(),
      lastModified,
      changeFrequency: 'daily',
      priority: 0.52
    }
  ]
}
