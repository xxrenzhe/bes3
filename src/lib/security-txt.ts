import { getLatestTimestamp } from '@/lib/http-cache'
import { listBrands, listOpenCommerceProducts, listPublishedArticles } from '@/lib/site-data'
import { getSiteUrl } from '@/lib/site-url'

function addDays(date: Date, days: number) {
  const next = new Date(date)
  next.setUTCDate(next.getUTCDate() + days)
  return next
}

export async function buildSecurityTxt() {
  const siteUrl = getSiteUrl()
  const [articles, brands, products] = await Promise.all([
    listPublishedArticles(),
    listBrands(),
    listOpenCommerceProducts()
  ])

  const lastModified = getLatestTimestamp([
    ...articles.map((article) => article.updatedAt || article.publishedAt || article.createdAt),
    ...products.map((product) => product.updatedAt || product.publishedAt),
    ...brands.map((brand) => brand.latestUpdate)
  ])
  const expires = addDays(new Date(lastModified), 180).toISOString()

  const body = [
    `Contact: ${siteUrl}/contact`,
    `Canonical: ${siteUrl}/.well-known/security.txt`,
    `Policy: ${siteUrl}/trust`,
    `Hiring: ${siteUrl}/about`,
    'Preferred-Languages: en, es, de, fr, ja',
    `Expires: ${expires}`
  ].join('\n')

  return {
    body,
    lastModified
  }
}
