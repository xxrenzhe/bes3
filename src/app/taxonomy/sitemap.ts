import type { MetadataRoute } from 'next'
import { buildBrandCategoryPath, buildCategoryPath, categoryMatches } from '@/lib/category'
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
        ...articles.filter((article) => categoryMatches(article.product?.category, category)).flatMap((article) => [article.updatedAt, article.publishedAt, article.createdAt]),
        ...products.filter((product) => categoryMatches(product.category, category)).flatMap((product) => [product.updatedAt, product.publishedAt])
      ])

      return buildLocalizedSitemapRoute(buildCategoryPath(category), {
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
      buildLocalizedSitemapRoute(buildBrandCategoryPath(hub.brandSlug, hub.category), {
        lastModified: maxDate([hub.latestUpdate]),
        changeFrequency: 'weekly',
        priority: 0.78
      })
    )
  ]
}
