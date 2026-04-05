import type { MetadataRoute } from 'next'
import { buildLocalizedSitemapRoute, maxDate } from '@/lib/sitemap-utils'
import { listBrandCategoryHubs, listBrands, listCategories, listPublishedArticles, listPublishedProducts } from '@/lib/site-data'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [articles, brands, brandCategoryHubs, categories, products] = await Promise.all([
    listPublishedArticles(),
    listBrands(),
    listBrandCategoryHubs(),
    listCategories(),
    listPublishedProducts()
  ])

  return [
    ...categories.flatMap((category) => {
      const categoryFreshness = maxDate([
        ...articles.filter((article) => article.product?.category === category).flatMap((article) => [article.updatedAt, article.publishedAt, article.createdAt]),
        ...products.filter((product) => product.category === category).flatMap((product) => [product.updatedAt, product.publishedAt])
      ])

      return buildLocalizedSitemapRoute(`/categories/${category}`, {
        lastModified: categoryFreshness,
        changeFrequency: 'weekly',
        priority: 0.82
      })
    }),
    ...brands.flatMap((brand) =>
      buildLocalizedSitemapRoute(`/brands/${brand.slug}`, {
        lastModified: maxDate([brand.latestUpdate]),
        changeFrequency: 'weekly',
        priority: 0.8
      })
    ),
    ...brandCategoryHubs.flatMap((hub) =>
      buildLocalizedSitemapRoute(`/brands/${hub.brandSlug}/categories/${hub.category}`, {
        lastModified: maxDate([hub.latestUpdate]),
        changeFrequency: 'weekly',
        priority: 0.78
      })
    )
  ]
}
