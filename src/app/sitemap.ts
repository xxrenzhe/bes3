import type { MetadataRoute } from 'next'
import { buildLocalizedSitemapRoute, maxDate } from '@/lib/sitemap-utils'
import { listBrands, listPublishedArticles, listPublishedProducts } from '@/lib/site-data'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [articles, brands, products] = await Promise.all([
    listPublishedArticles(),
    listBrands(),
    listPublishedProducts()
  ])
  const siteFreshness = maxDate([
    ...articles.flatMap((article) => [article.updatedAt, article.publishedAt, article.createdAt]),
    ...products.flatMap((product) => [product.updatedAt, product.publishedAt]),
    ...brands.map((brand) => brand.latestUpdate)
  ])

  return [
    ...buildLocalizedSitemapRoute('', { lastModified: siteFreshness, changeFrequency: 'daily', priority: 1 }),
    ...buildLocalizedSitemapRoute('/about', { lastModified: siteFreshness, changeFrequency: 'monthly', priority: 0.8 }),
    ...buildLocalizedSitemapRoute('/brands', { lastModified: siteFreshness, changeFrequency: 'weekly', priority: 0.9 }),
    ...buildLocalizedSitemapRoute('/categories', { lastModified: siteFreshness, changeFrequency: 'weekly', priority: 0.9 }),
    ...buildLocalizedSitemapRoute('/compare', { lastModified: siteFreshness, changeFrequency: 'weekly', priority: 0.84 }),
    ...buildLocalizedSitemapRoute('/contact', { lastModified: siteFreshness, changeFrequency: 'monthly', priority: 0.4 }),
    ...buildLocalizedSitemapRoute('/data', { lastModified: siteFreshness, changeFrequency: 'weekly', priority: 0.74 }),
    ...buildLocalizedSitemapRoute('/deals', { lastModified: siteFreshness, changeFrequency: 'daily', priority: 0.9 }),
    ...buildLocalizedSitemapRoute('/directory', { lastModified: siteFreshness, changeFrequency: 'weekly', priority: 0.9 }),
    ...buildLocalizedSitemapRoute('/guides', { lastModified: siteFreshness, changeFrequency: 'weekly', priority: 0.8 }),
    ...buildLocalizedSitemapRoute('/newsletter', { lastModified: siteFreshness, changeFrequency: 'weekly', priority: 0.6 }),
    ...buildLocalizedSitemapRoute('/products', { lastModified: siteFreshness, changeFrequency: 'weekly', priority: 0.88 }),
    ...buildLocalizedSitemapRoute('/reviews', { lastModified: siteFreshness, changeFrequency: 'weekly', priority: 0.83 }),
    ...buildLocalizedSitemapRoute('/site-map', { lastModified: siteFreshness, changeFrequency: 'weekly', priority: 0.7 }),
    ...buildLocalizedSitemapRoute('/start', { lastModified: siteFreshness, changeFrequency: 'weekly', priority: 0.9 }),
    ...buildLocalizedSitemapRoute('/tools', { lastModified: siteFreshness, changeFrequency: 'weekly', priority: 0.6 }),
    ...buildLocalizedSitemapRoute('/privacy', { lastModified: siteFreshness, changeFrequency: 'yearly', priority: 0.2 }),
    ...buildLocalizedSitemapRoute('/terms', { lastModified: siteFreshness, changeFrequency: 'yearly', priority: 0.2 })
  ]
}
