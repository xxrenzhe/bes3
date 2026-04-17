import type { Metadata } from 'next'
import Link from 'next/link'
import { PublicShell } from '@/components/layout/PublicShell'
import { StructuredData } from '@/components/site/StructuredData'
import { SectionHeader } from '@/components/site/SectionHeader'
import { buildPageMetadata } from '@/lib/metadata'
import { getRequestLocale } from '@/lib/request-locale'
import { buildBreadcrumbSchema, buildFaqSchema, buildTrustSignalsSchema, buildWebPageSchema } from '@/lib/structured-data'
import { toAbsoluteUrl } from '@/lib/site-url'

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadata({
    title: 'Privacy Policy',
    description:
      'Read how Bes3 handles subscriber and internal admin data while keeping the buyer-first product promise aligned with privacy expectations.',
    path: '/privacy',
    locale: getRequestLocale()
  })
}

export default function PrivacyPage() {
  const summaryCards = [
    {
      label: 'What Bes3 stores',
      title: 'Only site and subscriber data',
      description: 'Bes3 stores the minimum information needed to run the public site, secure the internal admin area, and deliver newsletter updates people explicitly asked for.'
    },
    {
      label: 'What Bes3 does not do',
      title: 'No generic data harvesting',
      description: 'The site is not designed to collect unnecessary personal data just to inflate ad targeting or grow unrelated marketing lists.'
    },
    {
      label: 'Why it matters',
      title: 'Privacy supports buyer trust',
      description: 'A buyer-first guide loses credibility fast if the data collection is more aggressive than the promise made to readers. This page exists to keep those two things aligned.'
    }
  ]

  const buyerPromises = [
    'Newsletter signups are used to deliver the price watch, category updates, or offer updates that the subscriber actually selected.',
    'Admin accounts and sign-in records exist to protect the CMS, not to profile public readers.',
    'Product, article, and site settings records are used to render Bes3 pages and keep the site running.'
  ]

  const routeCards = [
    {
      title: 'Read how Bes3 works',
      description: 'Use the trust page if you want the product and writing context behind the legal summary.',
      href: '/about',
      label: 'Open About'
    },
    {
      title: 'Manage expectations with price watches',
      description: 'Use newsletter updates only when you want Bes3 to keep tracking the category, offer flow, or shortlist over time.',
      href: '/newsletter',
      label: 'Open Newsletter'
    },
    {
      title: 'Contact the team',
      description: 'Use contact if you need a human answer about privacy, corrections, or a public-site concern.',
      href: '/contact',
      label: 'Open Contact'
    }
  ]
  const faqEntries = [
    {
      question: 'What data does Bes3 keep?',
      answer: 'Bes3 keeps the minimum site, subscriber, and admin data required to run the public site, secure the admin area, and deliver the updates a subscriber explicitly requested.'
    },
    {
      question: 'Does Bes3 use privacy terms to justify generic tracking?',
      answer: 'No. This policy exists to explain the site operations clearly, not to hide broad marketing-data collection behind vague legal language.'
    },
    {
      question: 'Where should a reader go after checking privacy details?',
      answer: 'Usually back to the page that fits the question: About for methodology, Newsletter for selected updates, or Contact for a human answer.'
    }
  ]
  const structuredData = [
    buildBreadcrumbSchema('/privacy', [
      { name: 'Home', path: '/' },
      { name: 'Privacy', path: '/privacy' }
    ]),
    buildWebPageSchema({
      path: '/privacy',
      title: 'Privacy Policy',
      description: 'Read how Bes3 handles subscriber and internal admin data while keeping the buyer-first product promise aligned with privacy expectations.',
      about: {
        '@id': `${toAbsoluteUrl('/')}#organization`
      },
      breadcrumbItems: [
        { name: 'Home', path: '/' },
        { name: 'Privacy', path: '/privacy' }
      ]
    }),
    buildTrustSignalsSchema('/privacy'),
    buildFaqSchema('/privacy', faqEntries)
  ]

  return (
    <PublicShell>
      <StructuredData data={structuredData} />
      <div className="mx-auto max-w-7xl space-y-14 px-4 py-16 sm:px-6 lg:px-8">
        <section className="rounded-[2.5rem] bg-[linear-gradient(135deg,#fff8ef_0%,#f8fbff_48%,#eefaf5_100%)] p-8 shadow-panel sm:p-10">
          <div className="grid gap-8 xl:grid-cols-[1fr_0.95fr] xl:items-start">
            <div>
              <p className="editorial-kicker">Legal Framework</p>
              <h1 className="mt-4 font-[var(--font-display)] text-5xl font-black tracking-tight text-foreground sm:text-6xl">Privacy Policy</h1>
              <p className="mt-4 max-w-3xl text-lg leading-8 text-muted-foreground">
                Last updated April 4, 2026. This page explains what Bes3 stores, why it is stored, and how that data supports the public buying-guide experience without turning the site into a generic email-and-tracking operation.
              </p>
              <div className="mt-6 rounded-[1.75rem] bg-slate-950 p-5 text-white">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-200">Plain-language summary</p>
                <p className="mt-3 text-sm leading-7 text-slate-200">
                  Bes3 stores only the site and subscriber information required to run the site, protect the internal system, and deliver the updates people intentionally requested.
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
              eyebrow="Buyer Meaning"
              title="What privacy means inside Bes3."
              description="Privacy is part of the product promise. If Bes3 asks readers to trust shortlist, price watches, and affiliate-linked pages, the data model has to stay proportionate to that purpose."
            />
            <div className="mt-8 space-y-4">
              {buyerPromises.map((item) => (
                <div key={item} className="flex items-start gap-3 text-sm leading-7 text-muted-foreground">
                  <span className="mt-2 h-2.5 w-2.5 rounded-full bg-primary" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[2.5rem] bg-white p-8 shadow-panel sm:p-10">
            <p className="editorial-kicker">Next Steps</p>
            <h2 className="mt-3 font-[var(--font-display)] text-4xl font-black tracking-tight text-foreground">Use the page that fits the question.</h2>
            <p className="mt-4 text-sm leading-8 text-muted-foreground">
              Legal pages should answer trust questions clearly, then send people back to the right product page instead of trapping them in policy copy.
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
            <h2>Privacy Policy</h2>
            <p>
              Bes3 stores only the site and subscriber information required to run the site, deliver newsletter updates, and maintain platform security.
            </p>
            <h3>Data we store</h3>
            <ul>
              <li>Administrator accounts and sign-in records used to secure the internal CMS.</li>
              <li>Affiliate product records, article metadata, and site settings required to publish Bes3 pages.</li>
              <li>Newsletter signups submitted through the site, including the preference information needed to deliver the selected updates.</li>
            </ul>
            <h3>How we use it</h3>
            <p>
              We use the information above to run Bes3, keep publishing working, and deliver the content and email updates you requested.
            </p>
            <h3>What we do not claim</h3>
            <p>
              Bes3 is not a social network, ad network, or data broker. The public site is a buying guide, and its data handling is meant to stay inside that purpose.
            </p>
            <h3>Questions</h3>
            <p>
              If you need clarification about this policy or want to raise a correction request, use the <Link href="/contact">contact page</Link>.
            </p>
          </div>
        </article>
      </div>
    </PublicShell>
  )
}
