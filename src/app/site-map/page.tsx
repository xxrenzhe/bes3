import type { Metadata } from 'next'
import Link from 'next/link'
import { PublicShell } from '@/components/layout/PublicShell'
import { StructuredData } from '@/components/site/StructuredData'
import { getArticlePath } from '@/lib/article-path'
import { buildPageMetadata } from '@/lib/metadata'
import { getRequestLocale } from '@/lib/request-locale'
import { buildCollectionPageSchema, buildWebPageSchema } from '@/lib/structured-data'
import { listBrands, listCategories, listPublishedArticles, listPublishedProducts } from '@/lib/site-data'

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
  const [categories, brands, articles, products] = await Promise.all([
    listCategories(),
    listBrands(),
    listPublishedArticles(),
    listPublishedProducts()
  ])

  const articleByCategory = new Map(
    categories.map((category) => [
      category,
      articles.filter((article) => article.product?.category === category).slice(0, 6)
    ])
  )
  const productByCategory = new Map(
    categories.map((category) => [
      category,
      products.filter((product) => product.category === category).slice(0, 6)
    ])
  )

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
        ...categories.map((category) => ({ name: category.replace(/-/g, ' '), path: `/categories/${category}` })),
        ...brands.slice(0, 12).map((brand) => ({ name: brand.name, path: `/brands/${brand.slug}` }))
      ]
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
              { href: '/tools', label: 'Tools' }
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
              <Link href={`/categories/${category}`} className="text-[11px] font-bold uppercase tracking-[0.22em] text-primary">
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

        <section className="grid gap-6 lg:grid-cols-2">
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
                { href: '/contact', label: 'Contact' },
                { href: '/newsletter', label: 'Newsletter' },
                { href: '/privacy', label: 'Privacy' },
                { href: '/terms', label: 'Terms' },
                { href: '/shortlist', label: 'Shortlist' }
              ].map((page) => (
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
