import type { Metadata } from 'next'
import Link from 'next/link'
import { PublicShell } from '@/components/layout/PublicShell'
import { StructuredData } from '@/components/site/StructuredData'
import { buildPageMetadata } from '@/lib/metadata'
import { getRequestLocale } from '@/lib/request-locale'
import { buildCollectionPageSchema, buildFaqSchema } from '@/lib/structured-data'

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadata({
    title: 'Trust Center',
    description: 'Bes3 trust policy for affiliate disclosure, creator evidence, fair use, AI extraction, and price-value scoring.',
    path: '/trust',
    locale: getRequestLocale(),
    keywords: ['Bes3 trust', 'affiliate disclosure', 'creator evidence', 'fair use', 'AI extraction']
  })
}

export default function TrustPage() {
  const faqEntries = [
    {
      question: 'How does Bes3 handle affiliate links?',
      answer: 'Products need an executable affiliate path for public commercial handoff, but commission rate is not used as a ranking factor.'
    },
    {
      question: 'How does Bes3 avoid copying creators?',
      answer: 'Bes3 extracts facts, ratings, and short evidence quotes, then links back to the original YouTube video and timestamp whenever available.'
    }
  ]

  return (
    <PublicShell>
      <StructuredData
        data={[
          buildCollectionPageSchema({
            path: '/trust',
            title: 'Trust Center',
            description: 'Policy and machine-discovery entry points for Bes3.',
            items: [
              { name: 'Privacy', path: '/privacy' },
              { name: 'Terms', path: '/terms' },
              { name: 'Open Data', path: '/data' },
              { name: 'llms.txt', path: '/llms.txt' },
              { name: 'security.txt', path: '/.well-known/security.txt' }
            ]
          }),
          buildFaqSchema('/trust', faqEntries)
        ]}
      />
      <section className="px-4 py-14 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <p className="text-xs font-bold uppercase tracking-[0.28em] text-primary">Trust Center</p>
          <h1 className="mt-4 max-w-5xl font-[var(--font-display)] text-5xl font-black tracking-tight sm:text-7xl">
            Trust is enforced by evidence constraints.
          </h1>
          <p className="mt-6 max-w-3xl text-lg leading-8 text-muted-foreground">
            Bes3 ranks products using review quality, source consistency, use-case fit, and price history. It does not hide commercial disclosure behind neutral-looking buttons.
          </p>
        </div>
      </section>
      <section className="px-4 pb-16 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-5 md:grid-cols-2 xl:grid-cols-3">
          {[
            ['FTC disclosure', 'Affiliate disclosure appears globally and near outbound purchase actions.'],
            ['Creator attribution', 'Evidence quotes link back to the creator source when a YouTube ID is available.'],
            ['Advertorial penalty', 'Videos flagged as soft ads are heavily downweighted in consensus scoring.'],
            ['No fake discounts', 'Price labels require current price plus historical low or 90-day average context.'],
            ['Crawler openness', 'robots.txt explicitly allows major AI crawlers to read the public evidence surface.'],
            ['Data minimization', 'Public data focuses on products and evidence, not sensitive user identity.']
          ].map(([title, description]) => (
            <div key={title} className="rounded-md border border-border bg-white p-6">
              <h2 className="font-[var(--font-display)] text-2xl font-black">{title}</h2>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">{description}</p>
            </div>
          ))}
        </div>
        <div className="mx-auto mt-8 flex max-w-7xl flex-wrap gap-3">
          {[
            ['/privacy', 'Privacy'],
            ['/terms', 'Terms'],
            ['/data', 'Open data'],
            ['/llms.txt', 'llms.txt'],
            ['/.well-known/security.txt', 'security.txt']
          ].map(([href, label]) => (
            <Link key={href} href={href} className="rounded-md border border-border bg-white px-4 py-2 text-sm font-semibold hover:border-primary hover:text-primary">
              {label}
            </Link>
          ))}
        </div>
      </section>
    </PublicShell>
  )
}
