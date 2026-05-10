import type { Metadata } from 'next'
import Link from 'next/link'
import { PublicShell } from '@/components/layout/PublicShell'
import { StructuredData } from '@/components/site/StructuredData'
import { buildPageMetadata } from '@/lib/metadata'
import { getCommercialFocusCategories, PSEO_INDEX_QUALITY_GATE } from '@/lib/recommendation-quality'
import { getRequestLocale } from '@/lib/request-locale'
import { buildCollectionPageSchema, buildFaqSchema } from '@/lib/structured-data'

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadata({
    title: 'Trust Center',
    description: 'How Bes3 handles affiliate links, visible cons, review sources, and current price checks.',
    path: '/trust',
    locale: await getRequestLocale(),
    keywords: ['Bes3 trust', 'affiliate disclosure', 'independent tech reviews', 'current price checks']
  })
}

export default async function TrustPage() {
  const focusCategories = getCommercialFocusCategories()
  const faqEntries = [
    {
      question: 'How does Bes3 handle affiliate links?',
      answer: 'Bes3 may earn a commission from some store links, but payout is not used as a ranking factor and the disclosure stays visible.'
    },
    {
      question: 'How does Bes3 avoid copying creators?',
      answer: 'Bes3 summarizes facts, ratings, and short review signals, then links back to the original source whenever possible.'
    },
    {
      question: 'When does Bes3 avoid making a strong recommendation?',
      answer: `A page needs enough reviewed products, independent sources, and price context before Bes3 treats it as a strong shopping guide. Thin pages stay visibly limited instead of pretending to know more than they do.`
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
              { name: 'How Bes3 checks deals', path: '/data' },
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
            We show the catch before the store link.
          </h1>
          <p className="mt-6 max-w-3xl text-lg leading-8 text-muted-foreground">
            Bes3 ranks products using review quality, source consistency, use-case fit, and price history. It may earn affiliate commission at no extra cost when a reader uses a store link, but the page must keep disclosure, price context, and visible downsides close to the recommendation.
          </p>
        </div>
      </section>
      <section className="px-4 pb-16 sm:px-6 lg:px-8">
        <div className="mx-auto mb-8 grid max-w-7xl gap-5 lg:grid-cols-3">
          <div className="rounded-md border border-border bg-white p-6">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-primary">Affiliate links</p>
            <h2 className="mt-3 font-[var(--font-display)] text-3xl font-black tracking-tight">Commission cannot pick the winner.</h2>
            <p className="mt-4 text-sm leading-7 text-muted-foreground">
              Bes3 can earn affiliate commission after a valid store handoff, but a product still has to earn attention with review proof, current price context, and visible risk notes.
            </p>
          </div>
          <div className="rounded-md border border-border bg-white p-6">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-primary">Ranking rule</p>
            <h2 className="mt-3 font-[var(--font-display)] text-3xl font-black tracking-tight">Payout stays out of the ranking.</h2>
            <p className="mt-4 text-sm leading-7 text-muted-foreground">
              A product can be monetizable and still lose if the proof, fit, price, or downside story is weaker than another option.
            </p>
          </div>
          <div className="rounded-md border border-border bg-white p-6">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-primary">Thin coverage</p>
            <h2 className="mt-3 font-[var(--font-display)] text-3xl font-black tracking-tight">No fake certainty.</h2>
            <p className="mt-4 text-sm leading-7 text-muted-foreground">
              Pages need reviewed products, independent sources, price context, and a healthy store path. Otherwise they stay visibly limited.
            </p>
          </div>
        </div>
        <div className="mx-auto grid max-w-7xl gap-5 md:grid-cols-2 xl:grid-cols-3">
          {[
            ['FTC disclosure', 'Affiliate disclosure appears globally and near outbound purchase actions.'],
            ['Creator attribution', 'Review signals link back to the source when a URL is available.'],
            ['Advertorial penalty', 'Videos flagged as soft ads are heavily downweighted in consensus scoring.'],
            ['No fake discounts', 'Price labels require current price plus historical low or 90-day average context.'],
            ['Readable proof', 'Bes3 keeps public review and price context readable instead of hiding it behind vague claims.'],
            ['Data minimization', 'Public data focuses on products and evidence, not sensitive user identity.'],
            ['Strong-guide threshold', `${PSEO_INDEX_QUALITY_GATE.minEligibleProducts} eligible products, ${PSEO_INDEX_QUALITY_GATE.minTotalEvidenceReports} review reports, ${PSEO_INDEX_QUALITY_GATE.minUniqueSources} independent sources, affiliate paths, and price context are required before a scenario page can become a strong shopping guide.`],
            ['Commission-blind audit', 'Commercial candidates are checked with commission rate excluded, so high payout cannot silently become public ranking logic.'],
            ['Schema safety', 'Product structured data only emits ratings when visible evidence count exists, and only emits offers when a real price and outbound path exist.']
          ].map(([title, description]) => (
            <div key={title} className="rounded-md border border-border bg-white p-6">
              <h2 className="font-[var(--font-display)] text-2xl font-black">{title}</h2>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">{description}</p>
            </div>
          ))}
        </div>
        <div className="mx-auto mt-8 max-w-7xl rounded-md border border-border bg-slate-950 p-6 text-white">
          <p className="text-xs font-bold uppercase tracking-[0.28em] text-emerald-300">Current Focus</p>
          <h2 className="mt-3 font-[var(--font-display)] text-3xl font-black tracking-tight">
            Bes3 starts with tech categories where a bad buy hurts.
          </h2>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-300">
            The catalog can grow over time, but the public site starts where shoppers most need current price checks, visible cons, and real review proof.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            {focusCategories.map((category) => (
              <Link key={category.slug} href={`/categories/${category.slug}`} className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-sm font-semibold text-white hover:bg-white/20">
                {category.name}
              </Link>
            ))}
          </div>
        </div>
        <div className="mx-auto mt-8 flex max-w-7xl flex-wrap gap-3">
          {[
            ['/privacy', 'Privacy'],
            ['/terms', 'Terms'],
            ['/data', 'How Bes3 checks deals'],
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
