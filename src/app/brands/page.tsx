import type { Metadata } from 'next'
import Link from 'next/link'
import { PublicShell } from '@/components/layout/PublicShell'
import { StructuredData } from '@/components/site/StructuredData'
import { SeoFaqSection } from '@/components/site/SeoFaqSection'
import { formatEditorialDate, getCategoryLabel } from '@/lib/editorial'
import { buildPageMetadata } from '@/lib/metadata'
import { buildBreadcrumbSchema, buildCollectionPageSchema, buildFaqSchema, buildHowToSchema } from '@/lib/structured-data'
import { listBrands } from '@/lib/site-data'

export async function generateMetadata(): Promise<Metadata> {
  const brands = await listBrands()
  const freshnessDate = brands[0]?.latestUpdate || null

  return buildPageMetadata({
    title: 'Brand Directory',
    description:
      'Browse Bes3 by brand to see which products, reviews, comparisons, and categories already exist for each manufacturer.',
    path: '/brands',
    image: brands[0]?.heroImageUrl,
    freshnessDate,
    freshnessInTitle: true,
    keywords: ['brand directory', 'brand reviews', 'brand comparisons', 'tech brands']
  })
}

export default async function BrandsPage() {
  const brands = await listBrands()
  const leadBrand = brands[0] || null
  const breadcrumbItems = [
    { name: 'Home', path: '/' },
    { name: 'Brands', path: '/brands' }
  ]
  const faqEntries = [
    {
      question: 'When should I use a brand page instead of a category page?',
      answer: 'Use a brand page when you already trust or prefer a specific brand and want Bes3 to show every relevant product, review, and comparison for that brand in one place.'
    },
    {
      question: 'Does a brand page replace category browsing?',
      answer: 'No. Brand pages focus on one manufacturer, while category pages are better when you still need to compare across brands.'
    },
    {
      question: 'What makes a brand page useful for buyers?',
      answer: 'It removes scattered navigation. You can see the current product lineup, the strongest related pages, and the categories where that brand already has live coverage.'
    }
  ]
  const structuredData = [
    buildBreadcrumbSchema('/brands', breadcrumbItems),
    buildCollectionPageSchema({
      path: '/brands',
      title: 'Brand Directory',
      description: 'Browse Bes3 by brand to see which products, reviews, comparisons, and categories already exist for each manufacturer.',
      breadcrumbItems,
      dateModified: leadBrand?.latestUpdate || null,
      items: brands.map((brand) => ({
        name: brand.name,
        path: `/brands/${brand.slug}`
      }))
    }),
    buildHowToSchema(
      '/brands',
      'How to use the Bes3 brand directory',
      'Use the brand directory when you already have a preferred manufacturer and want to stay focused on that brand.',
      [
        {
          name: 'Open the brand page',
          text: 'Choose a brand once you already trust the manufacturer or want to see all Bes3 coverage tied to that brand.'
        },
        {
          name: 'Check the strongest products and pages',
          text: 'Use the page to jump into the most credible products, reviews, and comparisons without searching the full site again.'
        },
        {
          name: 'Return to categories if the scope broadens',
          text: 'If the brand no longer feels right, move back into a category page to compare across brands instead of staying too narrow.'
        }
      ]
    ),
    buildFaqSchema('/brands', faqEntries)
  ]

  return (
    <PublicShell>
      <StructuredData data={structuredData} />
      <div className="mx-auto max-w-7xl space-y-14 px-4 py-14 sm:px-6 lg:px-8">
        <section className="rounded-[2.5rem] bg-[linear-gradient(135deg,#0f172a_0%,#1d4ed8_55%,#0f766e_100%)] p-8 text-white shadow-[0_35px_80px_-45px_rgba(15,23,42,0.8)] sm:p-10">
          <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="space-y-5">
              <Link href="/directory" className="inline-flex text-sm font-medium text-white/70 transition-colors hover:text-white">
                Directory / Brands
              </Link>
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-emerald-200">Brand Directory</p>
              <h1 className="font-[var(--font-display)] text-5xl font-black tracking-tight sm:text-6xl">Browse Bes3 by brand.</h1>
              <p className="max-w-3xl text-lg leading-8 text-slate-200">
                This page mirrors the brand-first searches shoppers actually make. Open a brand page when you already trust the manufacturer and want the quickest path into its products, reviews, and comparisons.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
              <div className="rounded-[1.75rem] border border-white/12 bg-white/10 p-5 backdrop-blur-sm">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-200/85">Brands indexed</p>
                <p className="mt-3 text-3xl font-black">{brands.length}</p>
              </div>
              <div className="rounded-[1.75rem] border border-white/12 bg-white/10 p-5 backdrop-blur-sm">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-200/85">Best use</p>
                <p className="mt-3 text-sm leading-7 text-slate-200">
                  Use brand pages once the manufacturer is already credible. Use category pages first if you still need cross-brand discovery.
                </p>
              </div>
              <div className="rounded-[1.75rem] border border-white/12 bg-white/10 p-5 backdrop-blur-sm">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-200/85">Best current entry</p>
                <p className="mt-3 text-sm leading-7 text-slate-200">
                  {leadBrand ? `${leadBrand.name} has the strongest current group of products and related coverage.` : 'Brand pages appear here as product coverage expands.'}
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {brands.map((brand) => (
            <Link
              key={brand.slug}
              href={`/brands/${brand.slug}`}
              className="rounded-[2rem] bg-white p-7 shadow-panel transition-transform hover:-translate-y-1"
            >
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">Brand Page</p>
              <h2 className="mt-3 font-[var(--font-display)] text-3xl font-black tracking-tight text-foreground">{brand.name}</h2>
              <p className="mt-4 text-sm leading-7 text-muted-foreground">
                {brand.description || `Browse the current ${brand.name} coverage on Bes3 without reopening a full site search.`}
              </p>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <div className="rounded-[1.25rem] bg-muted px-4 py-3">
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Products</p>
                  <p className="mt-2 text-xl font-black text-foreground">{brand.productCount}</p>
                </div>
                <div className="rounded-[1.25rem] bg-muted px-4 py-3">
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Editorial</p>
                  <p className="mt-2 text-xl font-black text-foreground">{brand.articleCount}</p>
                </div>
              </div>
              <div className="mt-5 flex flex-wrap gap-2">
                {brand.categories.slice(0, 3).map((category) => (
                  <span key={category} className="rounded-full bg-secondary px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-secondary-foreground">
                    {getCategoryLabel(category)}
                  </span>
                ))}
              </div>
              <p className="mt-5 text-sm font-semibold text-primary">
                Refreshed {formatEditorialDate(brand.latestUpdate, 'soon')} →
              </p>
            </Link>
          ))}
        </section>

        <SeoFaqSection
          title="Brand directory questions buyers actually have."
          entries={faqEntries}
          description="These pages explain when brand browsing helps and when you should go back to broader category browsing instead."
        />
      </div>
    </PublicShell>
  )
}
