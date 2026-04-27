import type { Metadata } from 'next'
import Link from 'next/link'
import { PublicShell } from '@/components/layout/PublicShell'
import { StructuredData } from '@/components/site/StructuredData'
import { HARDCORE_CATEGORIES, listHardcoreProducts, listHardcoreTags } from '@/lib/hardcore'
import { buildPageMetadata } from '@/lib/metadata'
import { getRequestLocale } from '@/lib/request-locale'
import { buildCollectionPageSchema, buildWebPageSchema } from '@/lib/structured-data'

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadata({
    title: 'Site Map',
    description: 'Browse Bes3 categories, comparison pages, best-value pages, and buyer-focused landing pages.',
    path: '/site-map',
    locale: await getRequestLocale(),
    keywords: ['site map', 'product ratings', 'scenario pages', 'product categories']
  })
}

export default async function HtmlSitemapPage() {
  const [products, tags] = await Promise.all([listHardcoreProducts(), listHardcoreTags()])
  const mainPages = [
    { href: '/', label: 'Home' },
    { href: '/categories', label: 'Categories' },
    { href: '/products', label: 'Evidence Matrix' },
    { href: '/deals', label: 'Best Value Lab' },
    { href: '/data', label: 'Open Data' },
    { href: '/trust', label: 'Trust Center' },
    { href: '/about', label: 'About' }
  ]
  const scenarioPages = HARDCORE_CATEGORIES.flatMap((category) =>
    tags
      .filter((tag) => tag.categorySlug === category.slug)
      .slice(0, 4)
      .map((tag) => ({
        href: `/${category.slug}/best-${category.slug}-for-${tag.slug}`,
        label: `Best ${category.name} for ${tag.name}`
      }))
  )
  const valuePages = HARDCORE_CATEGORIES.map((category) => ({
    href: `/deals/best-value-${category.slug}-under-500`,
    label: `Best ${category.name} under $500`
  }))
  const multiConstraintPages = HARDCORE_CATEGORIES.flatMap((category) => {
    const categoryTags = tags.filter((tag) => tag.categorySlug === category.slug && tag.isCorePainpoint).slice(0, 3)
    return categoryTags.flatMap((first, firstIndex) =>
      categoryTags.slice(firstIndex + 1).map((second) => ({
        href: `/${category.slug}/best-${first.slug}-${second.slug}-${category.slug}`,
        label: `Best ${category.name} for ${first.name} and ${second.name}`
      }))
    )
  })

  return (
    <PublicShell>
      <StructuredData
        data={[
          buildWebPageSchema({
            path: '/site-map',
            title: 'Site Map',
            description: 'Browse the Bes3 evidence engine.',
            type: 'CollectionPage'
          }),
          buildCollectionPageSchema({
            path: '/site-map',
            title: 'Site Map',
            description: 'Category, product, value, and scenario route directory.',
            items: [
              ...mainPages.map((page) => ({ name: page.label, path: page.href })),
              ...HARDCORE_CATEGORIES.map((category) => ({ name: category.name, path: `/categories/${category.slug}` })),
              ...valuePages.map((page) => ({ name: page.label, path: page.href })),
              ...products.map((product) => ({ name: product.name, path: `/products/${product.slug}` })),
              ...scenarioPages.map((page) => ({ name: page.label, path: page.href })),
              ...multiConstraintPages.map((page) => ({ name: page.label, path: page.href }))
            ]
          })
        ]}
      />
      <section className="px-4 py-14 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <p className="text-xs font-bold uppercase tracking-[0.28em] text-primary">HTML Sitemap</p>
          <h1 className="mt-4 max-w-5xl font-[var(--font-display)] text-5xl font-black tracking-tight sm:text-7xl">
            Bes3 site map.
          </h1>
          <p className="mt-6 max-w-3xl text-lg leading-8 text-muted-foreground">
            The public site centers on categories, product evidence reports, best-value windows, and buyer-focused landing pages.
          </p>
        </div>
      </section>
      <section className="px-4 pb-16 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-3">
          <div className="rounded-md border border-border bg-white p-6">
            <h2 className="font-[var(--font-display)] text-3xl font-black">Core Pages</h2>
            <div className="mt-5 space-y-3 text-sm">
              {mainPages.map((page) => (
                <Link key={page.href} href={page.href} className="block text-muted-foreground hover:text-primary">
                  {page.label}
                </Link>
              ))}
            </div>
          </div>
          <div className="rounded-md border border-border bg-white p-6">
            <h2 className="font-[var(--font-display)] text-3xl font-black">Categories</h2>
            <div className="mt-5 space-y-3 text-sm">
              {HARDCORE_CATEGORIES.map((category) => (
                <Link key={category.slug} href={`/categories/${category.slug}`} className="block text-muted-foreground hover:text-primary">
                  {category.name}
                </Link>
              ))}
            </div>
          </div>
          <div className="rounded-md border border-border bg-white p-6">
            <h2 className="font-[var(--font-display)] text-3xl font-black">Scenario Pages</h2>
            <div className="mt-5 space-y-3 text-sm">
              {scenarioPages.slice(0, 36).map((page) => (
                <Link key={page.href} href={page.href} className="block text-muted-foreground hover:text-primary">
                  {page.label}
                </Link>
              ))}
            </div>
          </div>
          <div className="rounded-md border border-border bg-white p-6">
            <h2 className="font-[var(--font-display)] text-3xl font-black">Value Pages</h2>
            <div className="mt-5 space-y-3 text-sm">
              {valuePages.map((page) => (
                <Link key={page.href} href={page.href} className="block text-muted-foreground hover:text-primary">
                  {page.label}
                </Link>
              ))}
            </div>
          </div>
          <div className="rounded-md border border-border bg-white p-6">
            <h2 className="font-[var(--font-display)] text-3xl font-black">Multi-Constraint Pages</h2>
            <div className="mt-5 space-y-3 text-sm">
              {multiConstraintPages.slice(0, 24).map((page) => (
                <Link key={page.href} href={page.href} className="block text-muted-foreground hover:text-primary">
                  {page.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>
    </PublicShell>
  )
}
