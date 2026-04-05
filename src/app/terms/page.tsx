import type { Metadata } from 'next'
import Link from 'next/link'
import { PublicShell } from '@/components/layout/PublicShell'
import { SectionHeader } from '@/components/site/SectionHeader'
import { buildPageMetadata } from '@/lib/metadata'

export const metadata: Metadata = buildPageMetadata({
  title: 'Terms of Service',
  description:
    'Understand how Bes3 works as a shopping guide, where affiliate links fit, and when store terms take over.',
  path: '/terms'
})

export default function TermsPage() {
  const summaryCards = [
    {
      label: 'What Bes3 is',
      title: 'A shopping guide',
      description: 'Bes3 publishes shopping guidance, shortlist pages, reviews, comparisons, and affiliate-linked store links to help readers make clearer purchase choices.'
    },
    {
      label: 'What Bes3 is not',
      title: 'Not the final store authority',
      description: 'Pricing, stock status, shipping, and store policies can change without notice, so the final checkout source remains the store itself.'
    },
    {
      label: 'Affiliate model',
      title: 'Commission can exist without changing the recommendation',
      description: 'Bes3 may earn commissions from qualifying purchases, but the product promise stays the same: clear guidance, honest reasons to skip, and category fit before any click-out.'
    }
  ]

  const buyerRules = [
    'Treat Bes3 as shopping guidance, not as a replacement for final store terms or checkout confirmation.',
    'Use price as a last-stage buying signal, since the public site is designed to narrow fit before it accelerates a purchase.',
    'Assume the store remains authoritative for current price, availability, shipping, warranties, and returns.'
  ]

  const routeCards = [
    {
      title: 'See how Bes3 works',
      description: 'Use the methodology page if you want the editorial logic that sits behind these terms.',
      href: '/about',
      label: 'Open About'
    },
    {
      title: 'Browse live deal coverage',
      description: 'Use deals only after product fit is credible enough that a price signal should matter.',
      href: '/deals',
      label: 'Open Deals'
    },
    {
      title: 'Contact Bes3',
      description: 'Use contact if you have a terms question, correction request, or concern about a public page.',
      href: '/contact',
      label: 'Open Contact'
    }
  ]

  return (
    <PublicShell>
      <div className="mx-auto max-w-7xl space-y-14 px-4 py-16 sm:px-6 lg:px-8">
        <section className="rounded-[2.5rem] bg-[linear-gradient(135deg,#fff8ef_0%,#f8fbff_48%,#eefaf5_100%)] p-8 shadow-panel sm:p-10">
          <div className="grid gap-8 xl:grid-cols-[1fr_0.95fr] xl:items-start">
            <div>
              <p className="editorial-kicker">Legal Framework</p>
              <h1 className="mt-4 font-[var(--font-display)] text-5xl font-black tracking-tight text-foreground sm:text-6xl">Terms of Service</h1>
              <p className="mt-4 max-w-3xl text-lg leading-8 text-muted-foreground">
                Last updated April 4, 2026. These terms explain how to use Bes3, what the site promises, and where store responsibility begins once a reader leaves Bes3 and enters checkout on a store site.
              </p>
              <div className="mt-6 rounded-[1.75rem] bg-slate-950 p-5 text-white">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-200">Plain-language summary</p>
                <p className="mt-3 text-sm leading-7 text-slate-200">
                  Bes3 is an informational shopping guide with affiliate links. We aim to make the choice clearer, but the final store remains authoritative for live pricing, stock, and transaction terms.
                </p>
              </div>
            </div>

            <div className="grid gap-4">
              {summaryCards.map((card) => (
                <div key={card.label} className="rounded-[1.75rem] bg-white p-6 shadow-[0_24px_60px_-40px_rgba(15,23,42,0.35)]">
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">{card.label}</p>
                  <h2 className="mt-3 font-[var(--font-display)] text-2xl font-black tracking-tight text-foreground">{card.title}</h2>
                  <p className="mt-3 text-sm leading-7 text-muted-foreground">{card.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="grid gap-8 lg:grid-cols-[1.02fr_0.98fr]">
          <div className="rounded-[2.5rem] bg-white p-8 shadow-panel sm:p-10">
            <SectionHeader
              eyebrow="Buyer Rules"
              title="How to use Bes3 responsibly."
              description="These are the practical limits of the product. The site should reduce research noise and clarify tradeoffs, but it should not be mistaken for the store, the warranty issuer, or the checkout system."
            />
            <div className="mt-8 space-y-4">
              {buyerRules.map((item) => (
                <div key={item} className="flex items-start gap-3 text-sm leading-7 text-muted-foreground">
                  <span className="mt-2 h-2.5 w-2.5 rounded-full bg-primary" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[2.5rem] bg-white p-8 shadow-panel sm:p-10">
            <p className="editorial-kicker">Next Steps</p>
            <h2 className="mt-3 font-[var(--font-display)] text-4xl font-black tracking-tight text-foreground">Legal clarity should lead back to product action.</h2>
            <p className="mt-4 text-sm leading-8 text-muted-foreground">
              Readers usually open terms to validate trust, affiliate incentives, or store responsibility. Once that question is answered, the next move should return them to the right Bes3 page.
            </p>
            <div className="mt-6 grid gap-4">
              {routeCards.map((route) => (
                <Link
                  key={route.title}
                  href={route.href}
                  className="rounded-[1.5rem] bg-[linear-gradient(135deg,#f8fbff,#eefaf5)] p-5 transition-transform hover:-translate-y-0.5"
                >
                  <h2 className="font-[var(--font-display)] text-2xl font-black tracking-tight text-foreground">{route.title}</h2>
                  <p className="mt-3 text-sm leading-7 text-muted-foreground">{route.description}</p>
                  <p className="mt-4 text-sm font-semibold text-primary">{route.label} →</p>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <article className="rounded-[2.5rem] bg-white p-8 shadow-panel sm:p-10">
          <div className="editorial-prose">
            <p>Last Updated: April 4, 2026</p>
            <h2>Terms of Service</h2>
            <p>
              Bes3 provides shopping guidance and affiliate links. Product pricing, stock, and store terms can change without notice.
            </p>
            <h3>Content use</h3>
            <ul>
              <li>Bes3 pages are provided for informational use only.</li>
              <li>Bes3 may earn commissions from qualifying purchases.</li>
              <li>We aim for accuracy, but source stores remain authoritative for final pricing and availability.</li>
            </ul>
            <h3>Affiliate disclosure</h3>
            <p>
              Some links on Bes3 are affiliate links. That relationship does not change the editorial goal of publishing clear, buyer-first guidance and honest reasons to skip a product when appropriate.
            </p>
            <h3>Store responsibility</h3>
            <p>
              Once a user clicks through to a store, that store controls the final transaction terms, including pricing, availability, shipping, returns, and service commitments.
            </p>
            <h3>Questions</h3>
            <p>
              If you need clarification about these terms or want to flag a problem with a public page, use the <Link href="/contact">contact page</Link>.
            </p>
          </div>
        </article>
      </div>
    </PublicShell>
  )
}
