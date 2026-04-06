import { NextResponse } from 'next/server'
import { COMMERCE_PROTOCOL_VERSION } from '@/lib/open-commerce'
import { listBrands, listCategories, listPublishedArticles, listPublishedProducts } from '@/lib/site-data'

export async function GET() {
  const [brands, categories, articles, products] = await Promise.all([
    listBrands(),
    listCategories(),
    listPublishedArticles(),
    listPublishedProducts()
  ])

  const latestRefresh = [
    ...articles.map((article) => article.updatedAt || article.publishedAt || article.createdAt),
    ...products.map((product) => product.updatedAt || product.publishedAt),
    ...brands.map((brand) => brand.latestUpdate)
  ].find(Boolean) || null

  return NextResponse.json({
    protocolVersion: COMMERCE_PROTOCOL_VERSION,
    generatedAt: new Date().toISOString(),
    feedType: 'coverage-manifest-v1',
    latestRefresh,
    counts: {
      categories: categories.length,
      brands: brands.length,
      products: products.length,
      articles: articles.length,
      reviews: articles.filter((article) => article.type === 'review').length,
      comparisons: articles.filter((article) => article.type === 'comparison').length,
      guides: articles.filter((article) => article.type === 'guide').length
    },
    topCategories: categories.slice(0, 24),
    topBrands: brands.slice(0, 24).map((brand) => ({
      name: brand.name,
      slug: brand.slug,
      productCount: brand.productCount,
      articleCount: brand.articleCount,
      latestUpdate: brand.latestUpdate
    })),
    endpoints: [
      {
        path: '/api/open/buying-feed',
        type: 'feed',
        description: 'Sanitized public buying feed with products and editorial coverage.'
      },
      {
        path: '/api/open/coverage',
        type: 'manifest',
        description: 'Machine-readable coverage summary for brands, categories, products, and editorial counts.'
      },
      {
        path: '/api/open/commerce/search?q=standing%20desk',
        type: 'search',
        description: 'Search products and related decision pages.'
      },
      {
        path: '/api/open/commerce/intent?intent=small%20desk%20setup',
        type: 'intent',
        description: 'Turn a buyer intent into products and next actions.'
      }
    ]
  })
}
