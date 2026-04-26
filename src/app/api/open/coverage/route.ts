import { buildBrandCategoryPath } from '@/lib/category'
import { createCacheableTextResponse, getLatestTimestamp } from '@/lib/http-cache'
import { COMMERCE_PROTOCOL_VERSION } from '@/lib/open-commerce'
import { SUPPORTED_LOCALES } from '@/lib/i18n'
import { listBrandCategoryHubs, listBrands, listCategories, listOpenCommerceProducts, listPublishedArticles } from '@/lib/site-data'

export async function GET(request: Request) {
  const [brandCategoryHubs, brands, categories, articles, products] = await Promise.all([
    listBrandCategoryHubs(),
    listBrands(),
    listCategories(),
    listPublishedArticles(),
    listOpenCommerceProducts()
  ])

  const latestRefresh = getLatestTimestamp([
    ...articles.map((article) => article.updatedAt || article.publishedAt || article.createdAt),
    ...products.map((product) => product.updatedAt || product.publishedAt),
    ...brands.map((brand) => brand.latestUpdate),
    ...brandCategoryHubs.map((hub) => hub.latestUpdate)
  ])

  const body = JSON.stringify({
    protocolVersion: COMMERCE_PROTOCOL_VERSION,
    generatedAt: latestRefresh,
    feedType: 'coverage-manifest-v1',
    latestRefresh,
    counts: {
      supportedLocales: SUPPORTED_LOCALES.length,
      categories: categories.length,
      brands: brands.length,
      brandCategoryHubs: brandCategoryHubs.length,
      products: products.length,
      articles: articles.length,
      reviews: articles.filter((article) => article.type === 'review').length,
      comparisons: articles.filter((article) => article.type === 'comparison').length,
      guides: articles.filter((article) => article.type === 'guide').length
    },
    localeFootprint: SUPPORTED_LOCALES,
    topCategories: categories.slice(0, 24),
    topBrands: brands.slice(0, 24).map((brand) => ({
      name: brand.name,
      slug: brand.slug,
      productCount: brand.productCount,
      articleCount: brand.articleCount,
      latestUpdate: brand.latestUpdate
    })),
    topBrandCategoryHubs: brandCategoryHubs.slice(0, 24).map((hub) => ({
      brandName: hub.brandName,
      brandSlug: hub.brandSlug,
      category: hub.category,
      productCount: hub.productCount,
      articleCount: hub.articleCount,
      latestUpdate: hub.latestUpdate,
      href: buildBrandCategoryPath(hub.brandSlug, hub.category)
    })),
    crawlSurfaces: {
      html: [
        '/',
        '/directory',
        '/offers',
        '/biggest-discounts',
        '/categories',
        '/brands',
        '/products',
        '/reviews',
        '/compare',
        '/guides',
        '/data',
        '/site-map',
        '/trust'
      ],
      sitemaps: [
        '/sitemap.xml',
        '/products/sitemap.xml',
        '/editorial/sitemap.xml',
        '/taxonomy/sitemap.xml',
        '/trust/sitemap.xml',
        '/media-sitemap.xml'
      ],
      machineEntry: [
        '/llms.txt',
        '/.well-known/security.txt',
        '/api/open/buying-feed',
        '/api/open/coverage',
        '/api/open/evidence',
        '/opensearch.xml',
        '/media-sitemap.xml'
      ]
    },
    planv2Readiness: {
      publicLoginEntryExposed: false,
      requiredScenarioBlocks: ['BLUF', 'comparison-table', 'evidence-stream', 'visible-faq', 'FAQPage JSON-LD'],
      complianceBlocks: ['affiliate-disclosure', 'affiliate-link-labels', 'creator-attribution', 'cookie-consent'],
      verificationCommand: 'npm run hardcore:check-planv2-seo'
    },
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
        path: '/media-sitemap.xml',
        type: 'sitemap',
        description: 'XML image sitemap for product, editorial, brand, and brand-category hub visuals.'
      },
      {
        path: '/opensearch.xml',
        type: 'search-discovery',
        description: 'OpenSearch description XML for discovering the Bes3 site-search entry point.'
      },
      {
        path: '/.well-known/security.txt',
        type: 'trust',
        description: 'Standard security disclosure and contact file for the Bes3 public trust surface.'
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
      },
      {
        path: '/api/open/commerce/compare?productIds=1,2',
        type: 'compare',
        description: 'Return a machine-readable comparison object for shortlisted products. Supports GET query params or POST JSON with productIds.'
      },
      {
        path: '/api/open/commerce/products/1',
        type: 'product',
        description: 'Fetch a public product payload by product id.'
      },
      {
        path: '/api/open/commerce/products/1/offers',
        type: 'offers',
        description: 'Fetch public offer coverage and merchant context for a product.'
      },
      {
        path: `/api/open/commerce/brands/${brands[0]?.slug || 'midea'}`,
        type: 'brand',
        description: 'Fetch public brand-level coverage including products and editorial assets.'
      },
      {
        path: '/api/open/commerce/alerts?intent=standing%20desk',
        type: 'alerts',
        description: 'Resolve alert and wait-flow recommendations for a monitored buying intent.'
      }
    ]
  })

  return createCacheableTextResponse({
    request,
    body,
    contentType: 'application/json; charset=utf-8',
    lastModified: latestRefresh
  })
}
