import type { Metadata } from 'next'
import Link from 'next/link'
import { PublicShell } from '@/components/layout/PublicShell'
import { StructuredData } from '@/components/site/StructuredData'
import { HARDCORE_CATEGORIES, listHardcoreProducts, listHardcoreTags } from '@/lib/hardcore'
import { buildPageMetadata } from '@/lib/metadata'
import { getRequestLocale } from '@/lib/request-locale'
import { buildDataCatalogSchema, buildDatasetSchema, buildFaqSchema } from '@/lib/structured-data'

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadata({
    title: 'Open Evidence Data',
    description: 'Bes3 exposes public category, product, scenario, and pricing data through human-readable pages and open endpoints.',
    path: '/data',
    locale: getRequestLocale(),
    keywords: ['open evidence data', 'use-case tags', 'hands-on evidence', 'scenario pages']
  })
}

export default async function OpenDataPage() {
  const [products, tags] = await Promise.all([listHardcoreProducts(), listHardcoreTags()])
  const entries = [
    { name: 'Categories', path: '/categories', description: 'The product areas Bes3 currently covers.' },
    { name: 'Evidence matrix', path: '/products', description: 'Product reports ranked by consensus score and evidence count.' },
    { name: 'Best value lab', path: '/deals', description: 'Price-value windows combining consensus score with live and historical price data.' },
    { name: 'Evidence API', path: '/api/open/evidence', description: 'Public JSON inventory of categories, tags, product evidence reports, and route coverage.' },
    { name: 'Search intake API', path: '/api/open/evidence/search-intake', description: 'POST endpoint for capturing new user problem language into the taxonomy system.' },
    { name: 'Price alerts API', path: '/api/open/evidence/price-alerts', description: 'POST endpoint for tracking price-value thresholds for a scored product.' },
    { name: 'Evidence feedback API', path: '/api/open/evidence/feedback', description: 'POST endpoint for lowering or raising confidence on a creator evidence item.' },
    { name: 'XML sitemap', path: '/sitemap.xml', description: 'Machine-discoverable route map for the public site.' },
    { name: 'Scenario sitemap', path: '/taxonomy/sitemap.xml', description: 'Use-case landing pages for search and AI crawlers.' }
  ]
  const faqEntries = [
    {
      question: 'What public data does Bes3 expose?',
      answer: 'The public model includes categories, use-case tags, product reports, review evidence, consensus scores, and price-value status. Admin-only ingestion details stay private.'
    },
    {
      question: 'Why are old commerce API links not the center anymore?',
      answer: 'The product pivot moved the public story from generic commerce search to teardown evidence and scenario matrices. Old API routes remain for compatibility but no longer define the product.'
    }
  ]

  return (
    <PublicShell>
      <StructuredData
        data={[
          buildDatasetSchema({
            path: '/data',
            name: 'Bes3 evidence dataset',
            description: 'Public route and schema surface for teardown-backed product evidence.',
            keywords: ['product categories', 'use-case tags', 'analysis reports', 'price value snapshots'],
            variableMeasured: ['categories', 'taxonomy tags', 'products', 'evidence reports', 'value windows']
          }),
          buildDataCatalogSchema({
            path: '/data',
            name: 'Bes3 data catalog',
            description: 'Machine-readable entry points for the evidence engine.',
            entries
          }),
          buildFaqSchema('/data', faqEntries)
        ]}
      />
      <section className="px-4 py-14 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <p className="text-xs font-bold uppercase tracking-[0.28em] text-primary">Open Evidence Data</p>
          <h1 className="mt-4 max-w-5xl font-[var(--font-display)] text-5xl font-black tracking-tight sm:text-7xl">
            Public data stays readable to both people and machines.
          </h1>
          <p className="mt-6 max-w-3xl text-lg leading-8 text-muted-foreground">
            Bes3 currently covers {HARDCORE_CATEGORIES.length} product categories, {tags.length} buyer-use-case tags, and {products.length} public product reports.
          </p>
        </div>
      </section>
      <section className="px-4 pb-16 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-5 md:grid-cols-2 xl:grid-cols-3">
          {entries.map((entry) => (
            <Link key={entry.path} href={entry.path} className="rounded-md border border-border bg-white p-6 hover:border-primary">
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-primary">{entry.path}</p>
              <h2 className="mt-3 font-[var(--font-display)] text-3xl font-black">{entry.name}</h2>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">{entry.description}</p>
            </Link>
          ))}
        </div>
      </section>
    </PublicShell>
  )
}
