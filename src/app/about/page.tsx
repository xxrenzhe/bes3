import type { Metadata } from 'next'
import { PublicShell } from '@/components/layout/PublicShell'
import { StructuredData } from '@/components/site/StructuredData'
import { HARDCORE_CATEGORIES } from '@/lib/hardcore'
import { buildPageMetadata } from '@/lib/metadata'
import { getRequestLocale } from '@/lib/request-locale'
import { buildAboutPageSchema, buildFaqSchema } from '@/lib/structured-data'

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadata({
    title: 'About Bes3',
    description: 'Bes3 is a consumer tech deal and independent review guide built around current prices, visible downsides, and cleaner store links.',
    path: '/about',
    locale: await getRequestLocale(),
    keywords: ['about Bes3', 'tech deals', 'independent tech reviews', 'current price checks']
  })
}

export default async function AboutPage() {
  const faqEntries = [
    {
      question: 'What is Bes3 now?',
      answer: 'Bes3 is a consumer tech deal and independent review guide. Alex checks current prices, visible downsides, review signals, and store links before sending readers to a merchant.'
    },
    {
      question: 'What does Bes3 refuse to do?',
      answer: 'Bes3 refuses to fabricate winners, rank by commission, or hide the catch just because a store link is available.'
    }
  ]

  return (
    <PublicShell>
      <StructuredData
        data={[
          buildAboutPageSchema('/about', 'About Bes3', 'Consumer tech deal and independent review guide.'),
          buildFaqSchema('/about', faqEntries)
        ]}
      />
      <section className="px-4 py-14 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <p className="text-xs font-bold uppercase tracking-[0.28em] text-primary">About</p>
          <h1 className="mt-4 max-w-5xl font-[var(--font-display)] text-5xl font-black tracking-tight sm:text-7xl">
            A tech deal site that shows the price and the catch.
          </h1>
          <p className="mt-6 max-w-3xl text-lg leading-8 text-muted-foreground">
            Bes3 focuses on 3C digital products where marketing specs are not enough: monitors, tablets, creator gear, security devices, power stations, robot vacuums, maker tools, and other tech that can be expensive to return.
          </p>
        </div>
      </section>
      <section className="px-4 pb-8 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-5 lg:grid-cols-3">
          <div className="rounded-md border border-border bg-white p-6">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-primary">Who Bes3 is for</p>
            <h2 className="mt-3 font-[var(--font-display)] text-3xl font-black tracking-tight">Tech shoppers close to checkout.</h2>
            <div className="mt-5 space-y-4 text-sm leading-7 text-muted-foreground">
              <p><span className="font-semibold text-foreground">Close-to-buy shopper:</span> needs the current price, the obvious downside, and a cleaner store link.</p>
              <p><span className="font-semibold text-foreground">Comparison shopper:</span> needs the strongest pick and the reason the runner-up might still fit.</p>
              <p><span className="font-semibold text-foreground">Deal-timing shopper:</span> needs to know if today's price is a real discount or normal pricing.</p>
            </div>
          </div>
          <div className="rounded-md border border-border bg-slate-50 p-6">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-primary">Who Bes3 is not for</p>
            <h2 className="mt-3 font-[var(--font-display)] text-3xl font-black tracking-tight">Not a generic ad list.</h2>
            <p className="mt-5 text-sm leading-7 text-muted-foreground">
              Bes3 is not for random coupons, paid placements, vendor brochures, or fake certainty. If review proof, price context, or the store path is weak, the page should say so.
            </p>
          </div>
          <div className="rounded-md border border-border bg-slate-950 p-6 text-white">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-emerald-300">Product promise</p>
            <h2 className="mt-3 font-[var(--font-display)] text-3xl font-black tracking-tight">No evidence, no strong recommendation.</h2>
            <p className="mt-5 text-sm leading-7 text-slate-300">
              No commission-ranked winners. No low-pressure price-check button without a working store path. No page that pretends weak review proof is enough.
            </p>
          </div>
        </div>
      </section>
      <section className="px-4 pb-16 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-5 md:grid-cols-2 xl:grid-cols-3">
          {[
            ['Real review signals', 'Every strong pick needs real review proof, not just a manufacturer spec sheet.'],
            ['Use-case driven', 'We organize reviews around the buyer questions people actually have, not generic spec lists.'],
            ['No commission ranking', 'Products need a working store link, but commission does not decide the ranking.'],
            ['Current price context', 'Alex checks current price, tracked lows, and recent averages before calling something a deal.'],
            ['No fake certainty', 'Limited-coverage pages are acceptable. A thin page is better than a fabricated recommendation.'],
            ['Source-linked', 'When possible, the page links back to the original review source so you can verify the claim yourself.']
          ].map(([title, description]) => (
            <div key={title} className="rounded-md border border-border bg-white p-6">
              <h2 className="font-[var(--font-display)] text-2xl font-black">{title}</h2>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">{description}</p>
            </div>
          ))}
        </div>
        <div className="mx-auto mt-8 max-w-7xl rounded-md border border-border bg-slate-50 p-6">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-muted-foreground">Current categories</p>
          <p className="mt-3 text-sm leading-7 text-muted-foreground">
            {HARDCORE_CATEGORIES.map((category) => category.name).join(', ')}.
          </p>
        </div>
      </section>
    </PublicShell>
  )
}
