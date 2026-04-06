import { createCacheableTextResponse, getLatestTimestamp } from '@/lib/http-cache'
import { listBrands, listCategories, listPublishedArticles, listPublishedProducts } from '@/lib/site-data'
import { getSiteUrl } from '@/lib/site-url'

export async function GET(request: Request) {
  const siteUrl = getSiteUrl()
  const [brands, categories, articles, products] = await Promise.all([
    listBrands(),
    listCategories(),
    listPublishedArticles(),
    listPublishedProducts()
  ])

  const reviewCount = articles.filter((article) => article.type === 'review').length
  const comparisonCount = articles.filter((article) => article.type === 'comparison').length
  const guideCount = articles.filter((article) => article.type === 'guide').length
  const lastModified = getLatestTimestamp([
    ...articles.map((article) => article.updatedAt || article.publishedAt || article.createdAt),
    ...products.map((product) => product.updatedAt || product.publishedAt),
    ...brands.map((brand) => brand.latestUpdate)
  ])

  const body = [
    '# Bes3',
    '',
    '> Structured buying-guide site with public product, category, brand, review, comparison, and guide coverage.',
    '',
    '## Summary',
    '',
    `- Site: ${siteUrl}`,
    `- Public categories: ${categories.length}`,
    `- Public brands: ${brands.length}`,
    `- Public products: ${products.length}`,
    `- Public editorial pages: ${articles.length}`,
    `- Reviews: ${reviewCount}`,
    `- Comparisons: ${comparisonCount}`,
    `- Guides: ${guideCount}`,
    '',
    '## Key HTML Routes',
    '',
    `- Home: ${siteUrl}/`,
    `- Directory: ${siteUrl}/directory`,
    `- Categories index: ${siteUrl}/categories`,
    `- Brands index: ${siteUrl}/brands`,
    `- Products index: ${siteUrl}/products`,
    `- Reviews index: ${siteUrl}/reviews`,
    `- Compare index: ${siteUrl}/compare`,
    `- Guides index: ${siteUrl}/guides`,
    `- Open data docs: ${siteUrl}/data`,
    `- HTML sitemap: ${siteUrl}/site-map`,
    `- Trust center: ${siteUrl}/trust`,
    `- Methodology / trust: ${siteUrl}/about`,
    `- Contact: ${siteUrl}/contact`,
    `- Privacy policy: ${siteUrl}/privacy`,
    `- Terms of service: ${siteUrl}/terms`,
    '',
    '## Public Data Endpoints',
    '',
    `- Buying feed: ${siteUrl}/api/open/buying-feed`,
    `- Coverage manifest: ${siteUrl}/api/open/coverage`,
    `- RSS feed: ${siteUrl}/feed.xml`,
    `- JSON feed: ${siteUrl}/feed.json`,
    `- Image sitemap: ${siteUrl}/media-sitemap.xml`,
    `- Commerce search: ${siteUrl}/api/open/commerce/search?q=standing%20desk`,
    `- Commerce intent: ${siteUrl}/api/open/commerce/intent?intent=small%20desk%20setup`,
    `- Brand coverage example: ${siteUrl}/api/open/commerce/brands/${brands[0]?.slug || 'midea'}`,
    '',
    '## Machine Entry Notes',
    '',
    `- Trust hub for machine routes: ${siteUrl}/trust`,
    `- llms.txt self reference: ${siteUrl}/llms.txt`,
    '- Prefer the human-facing /data page when you need endpoint descriptions before querying raw JSON.',
    '- Prefer the feeds when you need chronological editorial updates rather than full catalog APIs.',
    '',
    '## Usage Notes',
    '',
    '- Public JSON is sanitized and intended for discovery, automation, and lightweight integration.',
    '- Human-facing decision pages remain the best route for final fit checks and next-step navigation.',
    '- Merchant pages remain the final source of truth for live price, stock, coupon, shipping, and return details.'
  ].join('\n')

  return createCacheableTextResponse({
    request,
    body,
    contentType: 'text/plain; charset=utf-8',
    lastModified
  })
}
