import type { MetadataRoute } from 'next'
import { getArticlePath } from '@/lib/article-path'
import { getSiteUrl } from '@/lib/site-url'
import { listBrands, listCategories, listPublishedArticles, listPublishedProducts } from '@/lib/site-data'

function toDate(value: string | null | undefined) {
  if (!value) return null

  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function maxDate(values: Array<string | null | undefined>) {
  return values
    .map(toDate)
    .filter(Boolean)
    .sort((left, right) => right!.getTime() - left!.getTime())[0] || undefined
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = getSiteUrl()
  const [articles, brands, categories, products] = await Promise.all([
    listPublishedArticles(),
    listBrands(),
    listCategories(),
    listPublishedProducts()
  ])
  const siteFreshness = maxDate([
    ...articles.flatMap((article) => [article.updatedAt, article.publishedAt, article.createdAt]),
    ...products.flatMap((product) => [product.updatedAt, product.publishedAt]),
    ...brands.map((brand) => brand.latestUpdate)
  ])
  const routes: MetadataRoute.Sitemap = [
    '',
    '/about',
    '/brands',
    '/contact',
    '/deals',
    '/directory',
    '/newsletter',
    '/privacy',
    '/terms'
  ].map((route) => ({
    url: `${siteUrl}${route}`,
    lastModified: siteFreshness
  }))

  for (const article of articles) {
    routes.push({
      url: `${siteUrl}${getArticlePath(article.type, article.slug)}`,
      lastModified: maxDate([article.updatedAt, article.publishedAt, article.createdAt])
    })
  }

  for (const product of products) {
    if (!product.slug) continue
    routes.push({
      url: `${siteUrl}/products/${product.slug}`,
      lastModified: maxDate([product.updatedAt, product.publishedAt])
    })
  }

  for (const category of categories) {
    const categoryFreshness = maxDate([
      ...articles.filter((article) => article.product?.category === category).flatMap((article) => [article.updatedAt, article.publishedAt, article.createdAt]),
      ...products.filter((product) => product.category === category).flatMap((product) => [product.updatedAt, product.publishedAt])
    ])

    routes.push({
      url: `${siteUrl}/categories/${category}`,
      lastModified: categoryFreshness || siteFreshness
    })
  }

  for (const brand of brands) {
    routes.push({
      url: `${siteUrl}/brands/${brand.slug}`,
      lastModified: maxDate([brand.latestUpdate])
    })
  }

  return routes
}
