import type { MetadataRoute } from 'next'
import { buildLocalizedSitemapRoute, maxDate } from '@/lib/sitemap-utils'
import { listPublishedProducts } from '@/lib/site-data'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const products = await listPublishedProducts()

  return products.flatMap((product) => {
    if (!product.slug) return []

    return buildLocalizedSitemapRoute(`/products/${product.slug}`, {
      lastModified: maxDate([product.updatedAt, product.publishedAt]),
      changeFrequency: 'weekly',
      priority: 0.85
    })
  })
}
