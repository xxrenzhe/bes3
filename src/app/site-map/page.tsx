import type { Metadata } from 'next'
import Link from 'next/link'
import { PublicShell } from '@/components/layout/PublicShell'
import { SeoTrustSignalsPanel } from '@/components/site/SeoTrustSignalsPanel'
import { StructuredData } from '@/components/site/StructuredData'
import { getArticlePath } from '@/lib/article-path'
import { buildBrandCategoryPath, buildCategoryPath, categoryMatches } from '@/lib/category'
import { buildPageMetadata } from '@/lib/metadata'
import { getRequestLocale } from '@/lib/request-locale'
import { buildCollectionPageSchema, buildDatasetSchema, buildWebPageSchema } from '@/lib/structured-data'
import { listBrandCategoryHubs, listBrands, listCategories, listPublishedArticles, listPublishedProducts } from '@/lib/site-data'

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadata({
    title: 'Site Map',
    description: 'Browse Bes3 categories, brands, reviews, guides, comparisons, tools, and deal pages from one lightweight directory.',
    path: '/site-map',
    locale: getRequestLocale(),
    keywords: ['site map', 'directory', 'reviews', 'comparisons', 'buying guides']
  })
}

export default async function HtmlSitemapPage() {
  const [brandCategoryHubs, categories, brands, articles, products] = await Promise.all([
    listBrandCategoryHubs(),
    listCategories(),
    listBrands(),
    listPublishedArticles(),
    listPublishedProducts()
  ])
  const latestRefresh = [
    ...articles.map((article) => article.updatedAt || article.publishedAt || article.createdAt),
    ...products.map((product) => product.updatedAt || product.publishedAt),
    ...brands.map((brand) => brand.latestUpdate),
    ...brandCategoryHubs.map((hub) => hub.latestUpdate)
  ].find(Boolean) || null

  const articleByCategory = new Map(
    categories.map((category) => [
      category,
      articles.filter((article) => categoryMatches(article.product?.category, category)).slice(0, 6)
    ])
  )
  const productByCategory = new Map(
    categories.map((category) => [
      category,
      products.filter((product) => categoryMatches(product.category, category)).slice(0, 6)
    ])
  )
  const brandCategoryHubsByCategory = new Map(
    categories.map((category) => [
      category,
      brandCategoryHubs.filter((hub) => categoryMatches(hub.category, category))
    ])
  )
  const hubPages = [
    { href: '/categories', label: 'Categories' },
    { href: '/products', label: 'Products' },
    { href: '/reviews', label: 'Reviews' },
    { href: '/compare', label: 'Compare' },
    { href: '/guides', label: 'Guides' },
    { href: '/data', label: 'Open Data' },
    { href: '/trust', label: 'Trust Center' }
  ]
  const machinePages = [
    { href: '/llms.txt', label: 'llms.txt' },
    { href: '/api/open/coverage', label: 'Coverage Manifest API' },
    { href: '/api/open/buying-feed', label: 'Buying Feed API' }
  ]

  const structuredData = [
    buildWebPageSchema({
      path: '/site-map',
      title: 'Site Map',
      description: 'Browse Bes3 categories, brands, reviews, guides, comparisons, tools, and deal pages from one lightweight directory.',
      type: 'CollectionPage'
    }),
    buildCollectionPageSchema({
      path: '/site-map',
      title: 'Site Map',
      description: 'Browse Bes3 categories, brands, reviews, guides, comparisons, tools, and deal pages from one lightweight directory.',
      items: [
        { name: 'Assistant', path: '/assistant' },
        { name: 'Start Here', path: '/start' },
        { name: 'Search', path: '/search' },
        { name: 'Deals', path: '/deals' },
        { name: 'Directory', path: '/directory' },
        { name: 'Brands', path: '/brands' },
        { name: 'Tools', path: '/tools' },
        ...hubPages.map((page) => ({ name: page.label, path: page.href })),
        ...machinePages.map((page) => ({ name: page.label, path: page.href })),
        ...categories.map((category) => ({ name: category.replace(/-/g, ' '), path: buildCategoryPath(category) })),
        ...brands.slice(0, 12).map((brand) => ({ name: brand.name, path: `/brands/${brand.slug}` })),
        ...brandCategoryHubs.slice(0, 48).map((hub) => ({
          name: `${hub.brandName} ${hub.category}`,
          path: buildBrandCategoryPath(hub.brandSlug, hub.category)
        }))
      ]
    }),
    buildDatasetSchema({
      path: '/site-map',
      name: 'Bes3 public URL graph',
      description: 'Machine-readable directory of Bes3 categories, brands, brand-category hubs, product pages, and editorial pages.',
      dateModified: latestRefresh,
      keywords: ['html sitemap', 'xml sitemap', 'brand-category hubs', 'public URL graph'],
      variableMeasured: ['categories', 'brands', 'brand-category hubs', 'products', 'reviews', 'comparisons', 'guides']
    })
  ]

  return (
    <PublicShell>
      <StructuredData data={structuredData} />
      <div className="mx-auto max-w-7xl space-y-12 px-4 py-14 sm:px-6 lg:px-8">
        <section className="rounded-[2.5rem] bg-[linear-gradient(135deg,#fff8ef_0%,#f8fbff_48%,#eefaf5_100%)] p-8 shadow-panel sm:p-10">
          <p className="editorial-kicker">HTML Sitemap</p>
          <h1 className="mt-3 font-[var(--font-display)] text-5xl font-black tracking-tight text-foreground sm:text-6xl">Browse the full Bes3 directory.</h1>
          <p className="mt-4 max-w-3xl text-sm leading-8 text-muted-foreground">
            This page is a lightweight directory for shoppers and crawlers who want a fast text-first view of the main categories, brands, products, reviews, comparisons, guides, and utility pages.
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { href: '/assistant', label: 'Assistant' },
              { href: '/start', label: 'Start here' },
              { href: '/search', label: 'Search' },
              { href: '/deals', label: 'Deals' },
              { href: '/directory', label: 'Directory' },
              { href: '/brands', label: 'Brands' },
              { href: '/tools', label: 'Tools' },
              ...hubPages
            ].map((item) => (
              <Link key={item.href} href={item.href} className="rounded-[1.25rem] bg-white px-5 py-4 text-sm font-semibold text-foreground shadow-[0_20px_45px_-35px_rgba(15,23,42,0.45)] transition-transform hover:-translate-y-0.5">
                {item.label}
              </Link>
            ))}
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-3">
          {categories.map((category) => (
            <div key={category} className="rounded-[2rem] bg-white p-6 shadow-panel">
              <Link href={buildCategoryPath(category)} className="text-[11px] font-bold uppercase tracking-[0.22em] text-primary">
                {category.replace(/-/g, ' ')}
              </Link>
              <div className="mt-4 space-y-2 text-sm text-muted-foreground">
                {productByCategory.get(category)?.map((product) => (
                  <Link key={`product-${product.id}`} href={`/products/${product.slug}`} className="block transition-colors hover:text-primary">
                    {product.productName}
                  </Link>
                ))}
                {articleByCategory.get(category)?.map((article) => (
                  <Link key={`article-${article.id}`} href={getArticlePath(article.type, article.slug)} className="block transition-colors hover:text-primary">
                    {article.title}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </section>

        <SeoTrustSignalsPanel
          title="Why this sitemap exists as more than a crawler afterthought"
          description="Bes3 uses the HTML sitemap as a public text-first crawl surface that reinforces the structured URL graph created by category hubs, brand hubs, and decision pages."
          stats={[
            { label: 'Categories', value: String(categories.length), note: 'Top-level hubs for broad buyer intent.' },
            { label: 'Brands', value: String(brands.length), note: 'Exact-match brand entry points with product and editorial coverage.' },
            { label: 'Brand-category hubs', value: String(brandCategoryHubs.length), note: 'Programmatic spokes for narrow long-tail intent.' },
            { label: 'Public pages', value: String(products.length + articles.length), note: 'Product and editorial URLs already feeding the public crawl graph.' }
          ]}
          points={[
            'The XML sitemaps are now segmented by core pages, products, editorial pages, and taxonomy hubs.',
            'This HTML sitemap mirrors the same graph in plain text links, including long-tail brand-category spokes that would otherwise sit deeper in the crawl tree.',
            'Machine-entry routes like llms.txt and the public manifests are linked here too, so the trust and API graph stays visible instead of hidden behind docs copy.',
            'Brand-category hubs capture long-tail intent without flattening everything into one directory layer.',
            'The page is intentionally lightweight so both users and crawlers can traverse the site structure quickly.'
          ]}
        />

        <section className="rounded-[2rem] bg-white p-6 shadow-panel">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-primary">Brand-Category Spokes</p>
              <h2 className="mt-3 font-[var(--font-display)] text-3xl font-black tracking-tight text-foreground">Long-tail hub pages exposed directly for crawl depth.</h2>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-muted-foreground">
                These exact-match brand and category combinations are part of the programmatic hub-and-spoke layer. Listing them here keeps the long-tail graph visible to both shoppers and crawlers instead of hiding them behind only brand or category entry points.
              </p>
            </div>
            <div className="rounded-[1.25rem] bg-muted px-5 py-4 text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">{brandCategoryHubs.length}</span> brand-category pages
            </div>
          </div>
          <div className="mt-8 grid gap-6 lg:grid-cols-3">
            {categories.map((category) => {
              const hubs = brandCategoryHubsByCategory.get(category) || []
              if (!hubs.length) return null

              return (
                <div key={`hub-${category}`} className="rounded-[1.5rem] bg-muted/40 p-5">
                  <Link href={buildCategoryPath(category)} className="text-[11px] font-bold uppercase tracking-[0.22em] text-primary">
                    {category.replace(/-/g, ' ')}
                  </Link>
                  <div className="mt-4 space-y-3 text-sm text-muted-foreground">
                    {hubs.map((hub) => (
                      <Link
                        key={`${hub.brandSlug}-${hub.category}`}
                        href={buildBrandCategoryPath(hub.brandSlug, hub.category)}
                        className="block rounded-2xl bg-white px-4 py-3 transition-colors hover:text-primary"
                      >
                        <p className="font-semibold text-foreground">{hub.brandName}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {hub.productCount} products · {hub.articleCount} editorial pages
                        </p>
                      </Link>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-3">
          <div className="rounded-[2rem] bg-white p-6 shadow-panel">
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-primary">Editorial hubs</p>
            <div className="mt-4 grid gap-2 sm:grid-cols-2 text-sm text-muted-foreground">
              {hubPages.map((page) => (
                <Link key={page.href} href={page.href} className="block transition-colors hover:text-primary">
                  {page.label}
                </Link>
              ))}
            </div>
          </div>
          <div className="rounded-[2rem] bg-white p-6 shadow-panel">
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-primary">Brands</p>
            <div className="mt-4 grid gap-2 sm:grid-cols-2 text-sm text-muted-foreground">
              {brands.map((brand) => (
                <Link key={brand.slug} href={`/brands/${brand.slug}`} className="block transition-colors hover:text-primary">
                  {brand.name}
                </Link>
              ))}
            </div>
          </div>
          <div className="rounded-[2rem] bg-white p-6 shadow-panel">
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-primary">Core pages</p>
            <div className="mt-4 grid gap-2 sm:grid-cols-2 text-sm text-muted-foreground">
              {[
                { href: '/about', label: 'About' },
                { href: '/trust', label: 'Trust Center' },
                { href: '/contact', label: 'Contact' },
                { href: '/newsletter', label: 'Newsletter' },
                { href: '/privacy', label: 'Privacy' },
                { href: '/terms', label: 'Terms' },
                { href: '/shortlist', label: 'Shortlist' },
                { href: '/data', label: 'Open Data' }
              ].map((page) => (
                <Link key={page.href} href={page.href} className="block transition-colors hover:text-primary">
                  {page.label}
                </Link>
              ))}
            </div>
          </div>
          <div className="rounded-[2rem] bg-white p-6 shadow-panel">
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-primary">Machine entry routes</p>
            <div className="mt-4 grid gap-2 text-sm text-muted-foreground">
              {machinePages.map((page) => (
                <Link key={page.href} href={page.href} className="block transition-colors hover:text-primary">
                  {page.label}
                </Link>
              ))}
            </div>
          </div>
        </section>
      </div>
    </PublicShell>
  )
}
