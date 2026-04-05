import type { MetadataRoute } from 'next'
import { getArticlePath } from '@/lib/article-path'
import { SUPPORTED_LOCALES, addLocaleToPath } from '@/lib/i18n'
import { getSiteUrl } from '@/lib/site-url'
import { listBrandCategoryHubs, listBrands, listCategories, listPublishedArticles, listPublishedProducts } from '@/lib/site-data'

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
  const [articles, brands, brandCategoryHubs, categories, products] = await Promise.all([
    listPublishedArticles(),
    listBrands(),
    listBrandCategoryHubs(),
    listCategories(),
    listPublishedProducts()
  ])
  const siteFreshness = maxDate([
    ...articles.flatMap((article) => [article.updatedAt, article.publishedAt, article.createdAt]),
    ...products.flatMap((product) => [product.updatedAt, product.publishedAt]),
    ...brands.map((brand) => brand.latestUpdate)
  ])
  const routes: MetadataRoute.Sitemap = []
  const pushLocalizedRoute = (route: string, lastModified?: Date) => {
    for (const locale of SUPPORTED_LOCALES) {
      routes.push({
        url: `${siteUrl}${addLocaleToPath(route, locale)}`,
        lastModified,
        changeFrequency: route === '' || route === '/' ? 'daily' : 'weekly',
        priority: route === '' || route === '/' ? 1 : 0.8
      })
    }
  }

  for (const route of ['', '/about', '/brands', '/contact', '/deals', '/directory', '/newsletter', '/shortlist', '/site-map', '/start', '/tools', '/privacy', '/terms']) {
    pushLocalizedRoute(route, siteFreshness)
  }

  for (const article of articles) {
    pushLocalizedRoute(getArticlePath(article.type, article.slug), maxDate([article.updatedAt, article.publishedAt, article.createdAt]))
  }

  for (const product of products) {
    if (!product.slug) continue
    pushLocalizedRoute(`/products/${product.slug}`, maxDate([product.updatedAt, product.publishedAt]))
  }

  for (const category of categories) {
    const categoryFreshness = maxDate([
      ...articles.filter((article) => article.product?.category === category).flatMap((article) => [article.updatedAt, article.publishedAt, article.createdAt]),
      ...products.filter((product) => product.category === category).flatMap((product) => [product.updatedAt, product.publishedAt])
    ])

    pushLocalizedRoute(`/categories/${category}`, categoryFreshness || siteFreshness)
  }

  for (const brand of brands) {
    pushLocalizedRoute(`/brands/${brand.slug}`, maxDate([brand.latestUpdate]))
  }

  for (const hub of brandCategoryHubs) {
    pushLocalizedRoute(`/brands/${hub.brandSlug}/categories/${hub.category}`, maxDate([hub.latestUpdate]))
  }

  return routes
}
