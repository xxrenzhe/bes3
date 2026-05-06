import type { MetadataRoute } from 'next'
import { listHardcoreProducts } from '@/lib/hardcore'
import { buildLocalizedSitemapRoute } from '@/lib/sitemap-utils'
import { listOpenCommerceProducts } from '@/lib/site-data'

export const dynamic = 'force-dynamic'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [hardcoreProducts, commerceProducts] = await Promise.all([
    listHardcoreProducts(),
    listOpenCommerceProducts()
  ])

  const routes = new Map<string, MetadataRoute.Sitemap[number]>()

  for (const product of commerceProducts) {
    if (!product.slug) continue
    for (const route of buildLocalizedSitemapRoute(`/products/${product.slug}`, {
      changeFrequency: 'weekly',
      priority: product.evidenceCount > 0 ? 0.84 : 0.72
    })) {
      routes.set(route.url, route)
    }
  }

  for (const product of hardcoreProducts) {
    for (const route of buildLocalizedSitemapRoute(`/products/${product.slug}`, {
      changeFrequency: 'weekly',
      priority: product.consensus.evidenceCount > 0 ? 0.86 : 0.55
    })) {
      routes.set(route.url, route)
    }
  }

  return Array.from(routes.values())
}
