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
    title: 'How Bes3 Checks Deals',
    description: 'How Alex checks current prices, visible downsides, review proof, and store links before Bes3 recommends tech products.',
    path: '/data',
    locale: await getRequestLocale(),
    keywords: ['how Bes3 checks deals', 'current price checks', 'visible product cons', 'independent review proof']
  })
}

export default async function OpenDataPage() {
  const [products, tags] = await Promise.all([listHardcoreProducts(), listHardcoreTags()])
  const entries = [
    { name: 'Categories', path: '/categories', description: 'The product areas Bes3 currently covers.' },
    { name: 'Reviewed products', path: '/products', description: 'Product reports ranked by review proof, visible downsides, and price context.' },
    { name: 'Best value lab', path: '/deals', description: 'Current deal pages combining review proof with live and historical price data.' },
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
      answer: 'The public model includes categories, product reports, review signals, visible scores, and price status. Internal collection details stay private.'
    },
    {
      question: 'Why are old commerce API links not the center anymore?',
      answer: 'The public story is now simple: current price, visible downside, independent review proof, and a cleaner store link. Older machine routes remain for compatibility but no longer define the shopper experience.'
    }
  ]

  return (
    <PublicShell>
      <StructuredData
        data={[
          buildDatasetSchema({
            path: '/data',
            name: 'Bes3 deal-check dataset',
            description: 'Public route and schema surface for tech deal and review checks.',
            keywords: ['product categories', 'use-case tags', 'analysis reports', 'price value snapshots'],
            variableMeasured: ['categories', 'taxonomy tags', 'products', 'evidence reports', 'value windows']
          }),
          buildDataCatalogSchema({
            path: '/data',
            name: 'Bes3 data catalog',
            description: 'Machine-readable entry points behind Bes3 deal checks.',
            entries
          }),
          buildFaqSchema('/data', faqEntries)
        ]}
      />
      <section className="px-4 py-14 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <p className="text-xs font-bold uppercase tracking-[0.28em] text-primary">How Bes3 Checks Deals</p>
          <h1 className="mt-4 max-w-5xl font-[var(--font-display)] text-5xl font-black tracking-tight sm:text-7xl">
            What Alex checks before calling something a deal.
          </h1>
          <p className="mt-6 max-w-3xl text-lg leading-8 text-muted-foreground">
            Bes3 currently covers {HARDCORE_CATEGORIES.length} product categories, {tags.length} buyer-use-case tags, and {products.length} public product reports.
          </p>
        </div>
      </section>
      <section className="px-4 pb-16 sm:px-6 lg:px-8">
        <div className="mx-auto mb-8 grid max-w-7xl gap-5 lg:grid-cols-2">
          <div className="rounded-md border border-border bg-slate-950 p-6 text-white">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-emerald-300">Deal check</p>
            <h2 className="mt-3 font-[var(--font-display)] text-3xl font-black tracking-tight">Current price and the catch stay together.</h2>
            <p className="mt-4 text-sm leading-7 text-slate-300">
              Shopping need {'->'} reviewed product {'->'} current price {'->'} visible downside {'->'} independent review proof {'->'} labeled store link.
            </p>
          </div>
          <div className="rounded-md border border-border bg-white p-6">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-primary">Page quality</p>
            <h2 className="mt-3 font-[var(--font-display)] text-3xl font-black tracking-tight">Thin pages stay honest.</h2>
            <p className="mt-4 text-sm leading-7 text-muted-foreground">
              A page needs enough reviewed products, independent sources, price context, and a working store path before Bes3 treats it as a strong guide.
            </p>
          </div>
        </div>
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
