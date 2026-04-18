import type { Metadata } from 'next'
import Link from 'next/link'
import { PublicShell } from '@/components/layout/PublicShell'
import { SeoTrustSignalsPanel } from '@/components/site/SeoTrustSignalsPanel'
import { StructuredData } from '@/components/site/StructuredData'
import { COMMERCE_PROTOCOL_VERSION } from '@/lib/open-commerce'
import { buildPageMetadata } from '@/lib/metadata'
import { getRequestLocale } from '@/lib/request-locale'
import { buildBreadcrumbSchema, buildCollectionPageSchema, buildDataCatalogSchema, buildDataFeedSchema, buildDatasetSchema, buildFaqSchema, buildHowToSchema, buildTrustSignalsSchema, buildWebApiSchema } from '@/lib/structured-data'
import { listBrandCategoryHubs, listBrands, listCategories, listOpenCommerceProducts, listPublishedArticles } from '@/lib/site-data'

export async function generateMetadata(): Promise<Metadata> {
  const [brands, categories, articles, products] = await Promise.all([
    listBrands(),
    listCategories(),
    listPublishedArticles(),
    listOpenCommerceProducts()
  ])
  const freshnessDate =
    articles[0]?.updatedAt ||
    articles[0]?.publishedAt ||
    articles[0]?.createdAt ||
    products[0]?.updatedAt ||
    products[0]?.publishedAt ||
    brands[0]?.latestUpdate ||
    null

  return buildPageMetadata({
    title: 'Open Commerce Protocol',
    description: 'Browse the Bes3 public decision-support API, buying feed, coverage manifest, and commerce-protocol routes without reverse-engineering the site.',
    path: '/data',
    locale: getRequestLocale(),
    freshnessDate,
    freshnessInTitle: true,
    keywords: ['open buying data', 'public commerce api', 'shopping data feed', 'coverage manifest', 'commerce protocol']
  })
}

export default async function OpenDataPage() {
  const [brandCategoryHubs, brands, categories, articles, products] = await Promise.all([
    listBrandCategoryHubs(),
    listBrands(),
    listCategories(),
    listPublishedArticles(),
    listOpenCommerceProducts()
  ])

  const latestRefresh =
    articles[0]?.updatedAt ||
    articles[0]?.publishedAt ||
    articles[0]?.createdAt ||
    products[0]?.updatedAt ||
    products[0]?.publishedAt ||
    brands[0]?.latestUpdate ||
    null

  const reviewCount = articles.filter((article) => article.type === 'review').length
  const comparisonCount = articles.filter((article) => article.type === 'comparison').length
  const guideCount = articles.filter((article) => article.type === 'guide').length
  const compareSampleIds = products.slice(0, 2).map((product) => product.id).filter(Number.isInteger)

  const breadcrumbItems = [
    { name: 'Home', path: '/' },
    { name: 'Open Data', path: '/data' }
  ]

  const endpoints = [
    {
      eyebrow: 'Feed',
      title: 'Public buying feed',
      href: '/api/open/buying-feed',
      label: '/api/open/buying-feed',
      description: 'Sanitized JSON feed with products, editorial assets, attribute facts, price history summaries, and buyer-decision actions.'
    },
    {
      eyebrow: 'Manifest',
      title: 'Coverage manifest',
      href: '/api/open/coverage',
      label: '/api/open/coverage',
      description: 'Machine-readable counts and endpoint inventory for categories, brands, products, and editorial coverage.'
    },
    {
      eyebrow: 'Feed',
      title: 'Editorial RSS feed',
      href: '/feed.xml',
      label: '/feed.xml',
      description: 'RSS feed for the latest Bes3 reviews, comparisons, and guides.'
    },
    {
      eyebrow: 'Feed',
      title: 'Editorial JSON feed',
      href: '/feed.json',
      label: '/feed.json',
      description: 'JSON Feed for the latest Bes3 reviews, comparisons, and guides.'
    },
    {
      eyebrow: 'Search',
      title: 'OpenSearch description',
      href: '/opensearch.xml',
      label: '/opensearch.xml',
      description: 'Standard XML description for discovering the Bes3 site-search entry point and search template.'
    },
    {
      eyebrow: 'Trust',
      title: 'security.txt',
      href: '/.well-known/security.txt',
      label: '/.well-known/security.txt',
      description: 'Standard security disclosure file describing the public Bes3 contact and trust path for security issues.'
    },
    {
      eyebrow: 'Discovery',
      title: 'Image sitemap',
      href: '/media-sitemap.xml',
      label: '/media-sitemap.xml',
      description: 'XML image sitemap exposing the main product, editorial, brand, and hub visuals for crawl discovery.'
    },
    {
      eyebrow: 'Search',
      title: 'Commerce search',
      href: '/api/open/commerce/search?q=standing%20desk',
      label: '/api/open/commerce/search?q=standing%20desk',
      description: 'Search the public commerce graph by keyword and optional category filters.'
    },
    {
      eyebrow: 'Intent',
      title: 'Intent resolution',
      href: '/api/open/commerce/intent?intent=small%20desk%20setup',
      label: '/api/open/commerce/intent?intent=small%20desk%20setup',
      description: 'Turn a buying intent into likely products, next moves, and fallback paths.'
    },
    {
      eyebrow: 'Compare',
      title: 'Comparison payload',
      href: compareSampleIds.length >= 2 ? `/api/open/commerce/compare?productIds=${compareSampleIds.join(',')}` : '/api/open/commerce/compare?productIds=1,2',
      label: compareSampleIds.length >= 2 ? `/api/open/commerce/compare?productIds=${compareSampleIds.join(',')}` : '/api/open/commerce/compare?productIds=1,2',
      description: 'Return a machine-readable comparison object for multiple shortlisted products.'
    },
    {
      eyebrow: 'Brands',
      title: 'Brand coverage endpoint',
      href: `/api/open/commerce/brands/${brands[0]?.slug || 'midea'}`,
      label: `/api/open/commerce/brands/${brands[0]?.slug || 'midea'}`,
      description: 'Fetch brand-level product and editorial coverage through the public commerce protocol.'
    }
  ]

  const catalogEntries = [
    {
      name: 'Bes3 public buying feed',
      path: '/api/open/buying-feed',
      description: 'Sanitized product and editorial feed with price-history summaries, attribute facts, and decision actions.'
    },
    {
      name: 'Bes3 coverage manifest',
      path: '/api/open/coverage',
      description: 'Machine-readable manifest for categories, brands, brand-category hubs, products, articles, locales, and endpoint discovery.'
    },
    {
      name: 'Bes3 editorial RSS feed',
      path: '/feed.xml',
      description: 'Chronological XML feed of Bes3 editorial updates for feed readers and syndication tools.'
    },
    {
      name: 'Bes3 editorial JSON feed',
      path: '/feed.json',
      description: 'Chronological JSON Feed of Bes3 editorial updates for machine consumers and integrations.'
    },
    {
      name: 'Bes3 OpenSearch description',
      path: '/opensearch.xml',
      description: 'OpenSearch XML document for discovering and invoking the Bes3 site-search entry point.'
    },
    {
      name: 'Bes3 security.txt',
      path: '/.well-known/security.txt',
      description: 'Well-known security disclosure file for the Bes3 trust and reporting surface.'
    },
    {
      name: 'Bes3 image sitemap',
      path: '/media-sitemap.xml',
      description: 'XML image sitemap for product, editorial, brand, and long-tail hub visuals.'
    }
  ]

  const faqEntries = [
    {
      question: 'What is the purpose of the Bes3 open data page?',
      answer: 'It turns the public feed, protocol routes, and coverage manifest into a readable index so developers, researchers, and crawlers can understand what Bes3 exposes without reverse-engineering the site.'
    },
    {
      question: 'Does Bes3 publish the full private commerce database here?',
      answer: 'No. The public layer is intentionally sanitized. It exposes useful product, editorial, and coverage signals, but not every internal workflow or admin-only field.'
    },
    {
      question: 'How should someone use this data responsibly?',
      answer: 'Use it as a public decision-support layer: browse the feed, resolve intent, inspect product or brand routes, and verify live merchant details before acting on price or stock-sensitive data.'
    }
  ]

  return (
    <PublicShell>
      <StructuredData
        data={[
          buildBreadcrumbSchema('/data', breadcrumbItems),
          buildCollectionPageSchema({
            path: '/data',
            title: 'Open Commerce Protocol',
            description: 'Browse the Bes3 public decision-support API, buying feed, coverage manifest, and commerce-protocol routes without reverse-engineering the site.',
            breadcrumbItems,
            dateModified: latestRefresh,
            items: endpoints.map((endpoint) => ({
              name: endpoint.title,
              path: endpoint.href
            }))
          }),
          buildDatasetSchema({
            path: '/data',
            name: 'Bes3 open buying data',
            description: 'Public dataset and API surface for Bes3 categories, brands, products, editorial pages, and machine-readable buyer-decision routes.',
            dateModified: latestRefresh,
            keywords: ['open buying data', 'public commerce feed', 'brand coverage manifest', 'product decision api'],
            variableMeasured: ['categories', 'brands', 'products', 'reviews', 'comparisons', 'guides', 'public endpoints']
          }),
          buildDataCatalogSchema({
            path: '/data',
            name: 'Bes3 public data catalog',
            description: 'Catalog of the public Bes3 machine-readable surfaces, including the buying feed and the coverage manifest.',
            entries: catalogEntries,
            dateModified: latestRefresh
          }),
          buildDatasetSchema({
            path: '/api/open/coverage',
            name: 'Bes3 coverage manifest',
            description: 'Machine-readable coverage inventory for Bes3 locales, categories, brands, brand-category hubs, products, and editorial routes.',
            dateModified: latestRefresh,
            keywords: ['coverage manifest', 'brand-category hubs', 'public route inventory', 'locale footprint'],
            variableMeasured: ['supported locales', 'categories', 'brands', 'brand-category hubs', 'products', 'reviews', 'comparisons', 'guides']
          }),
          buildDataFeedSchema({
            path: '/api/open/buying-feed',
            name: 'Bes3 public buying feed',
            description: 'Public feed containing sanitized product entities, editorial entities, price-history summaries, and buyer-decision actions.',
            dateModified: latestRefresh,
            docsPath: '/data'
          }),
          buildDataFeedSchema({
            path: '/feed.xml',
            name: 'Bes3 editorial RSS feed',
            description: 'XML feed exposing the latest Bes3 reviews, guides, and comparisons in chronological order.',
            dateModified: latestRefresh,
            docsPath: '/data'
          }),
          buildDataFeedSchema({
            path: '/feed.json',
            name: 'Bes3 editorial JSON feed',
            description: 'JSON Feed exposing the latest Bes3 reviews, guides, and comparisons in chronological order.',
            dateModified: latestRefresh,
            docsPath: '/data'
          }),
          buildDataFeedSchema({
            path: '/media-sitemap.xml',
            name: 'Bes3 image sitemap',
            description: 'XML image sitemap exposing the key product, editorial, brand, and brand-category hub visuals.',
            dateModified: latestRefresh,
            docsPath: '/data'
          }),
          buildWebApiSchema({
            path: '/opensearch.xml',
            name: 'Bes3 OpenSearch description',
            description: 'OpenSearch XML document that describes the Bes3 search endpoint, search template, and discovery metadata.',
            documentationPath: '/search'
          }),
          ...[
            {
              path: '/api/open/buying-feed',
              name: 'Bes3 buying feed API',
              description: 'Read the public Bes3 buying feed for products, editorial assets, and machine-readable decision context.'
            },
            {
              path: '/api/open/coverage',
              name: 'Bes3 coverage manifest API',
              description: 'Read the Bes3 coverage manifest for site graph counts, crawl surfaces, locale footprint, and endpoint discovery.'
            },
            {
              path: '/api/open/commerce/search?q=standing%20desk',
              name: 'Bes3 commerce search API',
              description: 'Query the Bes3 commerce graph by keyword and optional category constraints.'
            },
            {
              path: '/api/open/commerce/intent?intent=small%20desk%20setup',
              name: 'Bes3 intent resolution API',
              description: 'Resolve a buyer intent into products, route suggestions, and next actions.'
            },
            {
              path: compareSampleIds.length >= 2 ? `/api/open/commerce/compare?productIds=${compareSampleIds.join(',')}` : '/api/open/commerce/compare?productIds=1,2',
              name: 'Bes3 comparison API',
              description: 'Fetch a machine-readable comparison object for multiple shortlisted products.'
            },
            {
              path: `/api/open/commerce/brands/${brands[0]?.slug || 'midea'}`,
              name: 'Bes3 brand coverage API',
              description: 'Fetch brand-level product and editorial coverage from the Bes3 public commerce protocol.'
            }
          ].map((endpoint) =>
            buildWebApiSchema({
              path: endpoint.path,
              name: endpoint.name,
              description: endpoint.description,
              documentationPath: '/data'
            })
          ),
          buildTrustSignalsSchema('/data'),
          buildHowToSchema(
            '/data',
            'How to use the Bes3 open data layer',
            'Use the public feed for broad catalog context, the manifest for coverage checks, and the commerce endpoints for intent, product, brand, and comparison lookups.',
            [
              {
                name: 'Start with the feed or manifest',
                text: 'Use the public feed for a broad snapshot, or the coverage manifest if you need counts and endpoint discovery first.'
              },
              {
                name: 'Move into the right protocol route',
                text: 'Use search, intent, product, brand, or comparison endpoints when the broad feed is no longer specific enough.'
              },
              {
                name: 'Hand off into human pages when needed',
                text: 'Switch back into the matching Bes3 product, review, comparison, or category page when a machine payload is no longer enough for the final decision.'
              }
            ]
          ),
          buildFaqSchema('/data', faqEntries)
        ]}
      />
      <div className="mx-auto max-w-7xl space-y-14 px-4 py-14 sm:px-6 lg:px-8">
        <section className="rounded-[2.5rem] bg-[linear-gradient(135deg,#0f172a_0%,#1d4ed8_55%,#0f766e_100%)] p-8 text-white shadow-[0_35px_80px_-45px_rgba(15,23,42,0.8)] sm:p-10">
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-emerald-200">Open Data Layer</p>
          <h1 className="mt-3 font-[var(--font-display)] text-5xl font-black tracking-tight sm:text-6xl">Bes3 exposes a public buying-data surface.</h1>
          <p className="mt-4 max-w-3xl text-sm leading-8 text-slate-200">
            This page turns the public feed, coverage manifest, and commerce protocol routes into one crawlable entry point. It exists for developers, researchers, automation, and buyers who want a machine-readable layer instead of only HTML pages.
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-[1.5rem] border border-white/12 bg-white/10 p-5 backdrop-blur-sm">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-200/85">Protocol</p>
              <p className="mt-3 text-2xl font-black">{COMMERCE_PROTOCOL_VERSION}</p>
            </div>
            <div className="rounded-[1.5rem] border border-white/12 bg-white/10 p-5 backdrop-blur-sm">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-200/85">Products</p>
              <p className="mt-3 text-2xl font-black">{products.length}</p>
            </div>
            <div className="rounded-[1.5rem] border border-white/12 bg-white/10 p-5 backdrop-blur-sm">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-200/85">Editorial pages</p>
              <p className="mt-3 text-2xl font-black">{articles.length}</p>
            </div>
            <div className="rounded-[1.5rem] border border-white/12 bg-white/10 p-5 backdrop-blur-sm">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-200/85">Brands / categories</p>
              <p className="mt-3 text-2xl font-black">{brands.length} / {categories.length}</p>
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
          {endpoints.map((endpoint) => (
            <Link key={endpoint.href} href={endpoint.href} className="rounded-[2rem] bg-white p-7 shadow-panel transition-transform hover:-translate-y-1">
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-primary">{endpoint.eyebrow}</p>
              <h2 className="mt-3 font-[var(--font-display)] text-3xl font-black tracking-tight text-foreground">{endpoint.title}</h2>
              <p className="mt-3 break-all text-sm font-semibold text-foreground">{endpoint.label}</p>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">{endpoint.description}</p>
              <p className="mt-5 text-sm font-semibold text-primary">Open endpoint →</p>
            </Link>
          ))}
        </section>

        <SeoTrustSignalsPanel
          title="Why this data layer matters for trust and discoverability"
          description="The Bes3 public data layer is not just an API afterthought. It turns categories, brands, products, and decision pages into a machine-readable graph that can be reused, audited, and cited."
          stats={[
            { label: 'Categories', value: String(categories.length), note: 'Top-level intent clusters already exposed through public pages and manifests.' },
            { label: 'Brands', value: String(brands.length), note: 'Brand hubs with public product and editorial coverage.' },
            { label: 'Brand-category hubs', value: String(brandCategoryHubs.length), note: 'Programmatic long-tail spokes now reflected in the public manifest layer.' },
            { label: 'Reviews', value: String(reviewCount), note: 'Verdict-style editorial pages inside the public graph.' },
            { label: 'Comparisons + guides', value: String(comparisonCount + guideCount), note: 'Decision and education assets that can be discovered through HTML and JSON routes.' }
          ]}
          points={[
            'The feed and manifest create explicit machine-readable entry points instead of hiding the public graph behind only page-level HTML.',
            'DataCatalog, DataFeed, and WebAPI schema now describe the public API surface in JSON-LD instead of leaving the endpoint graph implicit.',
            'The protocol routes keep product, brand, intent, and comparison lookups aligned with the same buyer-decision model used on the site.',
            'This page gives crawlers and humans a stable place to discover the public data surface without reverse-engineering internal endpoints.',
            'Sanitized outputs keep the public layer useful without leaking admin-only or workflow-specific internals.'
          ]}
        />

        <section className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-[2rem] bg-white p-7 shadow-panel">
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-primary">Use Cases</p>
            <div className="mt-5 space-y-4 text-sm leading-7 text-muted-foreground">
              <p>Use the feed when you need a broad public snapshot of products and editorial assets.</p>
              <p>Use the coverage manifest when you want counts, freshness, and endpoint discovery before querying deeper routes.</p>
              <p>Use the commerce endpoints when the query is already specific enough to need search, intent resolution, product details, brand coverage, or comparison payloads.</p>
            </div>
          </div>
          <div className="rounded-[2rem] bg-white p-7 shadow-panel">
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-primary">Human And Machine Routes</p>
            <div className="mt-5 space-y-3 text-sm text-muted-foreground">
              <Link href="/about" className="block transition-colors hover:text-primary">Open methodology and trust page</Link>
              <Link href="/tools" className="block transition-colors hover:text-primary">Open utility tools</Link>
              <Link href="/site-map" className="block transition-colors hover:text-primary">Open HTML sitemap</Link>
              <Link href="/directory" className="block transition-colors hover:text-primary">Open category directory</Link>
              <Link href="/llms.txt" className="block transition-colors hover:text-primary">Open llms.txt</Link>
              <Link href="/media-sitemap.xml" className="block transition-colors hover:text-primary">Open image sitemap</Link>
            </div>
          </div>
        </section>
      </div>
    </PublicShell>
  )
}
