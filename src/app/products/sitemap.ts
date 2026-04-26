import type { MetadataRoute } from 'next'
import { listHardcoreProducts } from '@/lib/hardcore'
import { buildLocalizedSitemapRoute } from '@/lib/sitemap-utils'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const products = await listHardcoreProducts()

  return products.flatMap((product) =>
    buildLocalizedSitemapRoute(`/products/${product.slug}`, {
      changeFrequency: 'weekly',
      priority: product.consensus.evidenceCount > 0 ? 0.86 : 0.55
    })
  )
}
