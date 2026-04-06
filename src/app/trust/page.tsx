import type { Metadata } from 'next'
import Link from 'next/link'
import { PublicShell } from '@/components/layout/PublicShell'
import { SeoTrustSignalsPanel } from '@/components/site/SeoTrustSignalsPanel'
import { StructuredData } from '@/components/site/StructuredData'
import { buildPageMetadata } from '@/lib/metadata'
import { getRequestLocale } from '@/lib/request-locale'
import { buildBreadcrumbSchema, buildCollectionPageSchema, buildFaqSchema, buildTrustSignalsSchema, buildWebPageSchema } from '@/lib/structured-data'

const TRUST_ROUTES = [
  {
    eyebrow: 'Methodology',
    title: 'About Bes3',
    href: '/about',
    label: 'Open About',
    description: 'Read how Bes3 narrows categories, builds shortlists, and keeps the buying flow buyer-first.'
  },
  {
    eyebrow: 'Support',
    title: 'Contact Bes3',
    href: '/contact',
    label: 'Open Contact',
    description: 'Use the contact path for edge cases, corrections, partnerships, and public-site questions that still need a human answer.'
  },
  {
    eyebrow: 'Legal',
    title: 'Privacy Policy',
    href: '/privacy',
    label: 'Open Privacy',
    description: 'See how Bes3 handles subscriber and admin data without turning the site into a generic tracking surface.'
  },
  {
    eyebrow: 'Legal',
    title: 'Terms of Service',
    href: '/terms',
    label: 'Open Terms',
    description: 'Understand where Bes3 guidance ends and merchant checkout authority begins.'
  },
  {
    eyebrow: 'Machine Layer',
    title: 'Open Data',
    href: '/data',
    label: 'Open Data Docs',
    description: 'Browse the public feed, coverage manifest, and commerce protocol routes without reverse-engineering the site.'
  },
  {
    eyebrow: 'Machine Layer',
    title: 'LLMs Manifest',
    href: '/llms.txt',
    label: 'Open llms.txt',
    description: 'Inspect the text-first machine manifest that points agents and crawlers to the main HTML routes and public data endpoints.'
  },
  {
    eyebrow: 'Machine Layer',
    title: 'Coverage Manifest API',
    href: '/api/open/coverage',
    label: 'Open Coverage JSON',
    description: 'Read the public coverage manifest for locale footprint, crawl surfaces, taxonomy counts, and endpoint discovery.'
  },
  {
    eyebrow: 'Machine Layer',
    title: 'Buying Feed API',
    href: '/api/open/buying-feed',
    label: 'Open Feed JSON',
    description: 'Read the sanitized buying feed that exposes products, editorial assets, and decision-support fields in one machine-readable payload.'
  },
  {
    eyebrow: 'Syndication',
    title: 'RSS Feed',
    href: '/feed.xml',
    label: 'Open RSS',
    description: 'Subscribe to the latest Bes3 reviews, guides, and comparisons through a lightweight XML feed.'
  },
  {
    eyebrow: 'Syndication',
    title: 'JSON Feed',
    href: '/feed.json',
    label: 'Open JSON Feed',
    description: 'Consume the latest Bes3 editorial updates through a machine-friendly JSON Feed endpoint.'
  },
  {
    eyebrow: 'Discovery',
    title: 'HTML Sitemap',
    href: '/site-map',
    label: 'Open Site Map',
    description: 'Traverse the public crawl graph through one lightweight directory of categories, brands, products, and editorial pages.'
  }
] as const

const faqEntries = [
  {
    question: 'What is the Bes3 trust center for?',
    answer: 'It groups the methodology, contact, legal, open-data, sitemap, and machine-manifest routes into one crawlable trust surface so readers and machines can verify how Bes3 works.'
  },
  {
    question: 'Why not hide these pages in the footer only?',
    answer: 'Because trust pages should be easy to revisit, cite, and audit. A dedicated hub makes the trust surface clearer for both users and crawlers.'
  },
  {
    question: 'What should I open first from here?',
    answer: 'Open About for methodology, Contact for unresolved edge cases, Privacy or Terms for legal clarity, and Open Data, llms.txt, or the HTML sitemap when you need a machine-readable site entry point.'
  }
]

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadata({
    title: 'Trust Center',
    description: 'Browse the Bes3 trust surface: methodology, contact, privacy, terms, open data, llms.txt, feed endpoints, and sitemap routes from one clear entry point.',
    path: '/trust',
    locale: getRequestLocale(),
    keywords: ['trust center', 'about bes3', 'privacy policy', 'terms of service', 'open data', 'llms.txt', 'rss feed', 'json feed', 'html sitemap']
  })
}

export default function TrustPage() {
  const breadcrumbItems = [
    { name: 'Home', path: '/' },
    { name: 'Trust Center', path: '/trust' }
  ]

  return (
    <PublicShell>
      <StructuredData
        data={[
          buildBreadcrumbSchema('/trust', breadcrumbItems),
          buildWebPageSchema({
            path: '/trust',
            title: 'Trust Center',
            description: 'Browse the Bes3 trust surface: methodology, contact, privacy, terms, open data, llms.txt, feed endpoints, and sitemap routes from one clear entry point.',
            type: 'CollectionPage',
            breadcrumbItems
          }),
          buildCollectionPageSchema({
            path: '/trust',
            title: 'Trust Center',
            description: 'Browse the Bes3 trust surface: methodology, contact, privacy, terms, open data, llms.txt, feed endpoints, and sitemap routes from one clear entry point.',
            breadcrumbItems,
            items: TRUST_ROUTES.map((route) => ({
              name: route.title,
              path: route.href
            }))
          }),
          buildTrustSignalsSchema('/trust'),
          buildFaqSchema('/trust', faqEntries)
        ]}
      />
      <div className="mx-auto max-w-7xl space-y-14 px-4 py-14 sm:px-6 lg:px-8">
        <section className="rounded-[2.5rem] bg-[linear-gradient(135deg,#fff8ef_0%,#f8fbff_48%,#eefaf5_100%)] p-8 shadow-panel sm:p-10">
          <p className="editorial-kicker">Trust Center</p>
          <h1 className="mt-3 font-[var(--font-display)] text-5xl font-black tracking-tight text-foreground sm:text-6xl">
            The Bes3 trust and machine-entry surface in one place.
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-8 text-muted-foreground">
            This page gathers the methodology, contact path, legal policies, open-data docs, llms manifest, machine APIs, editorial feeds, and sitemap routes that explain how Bes3 works and how the public site should be interpreted.
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {TRUST_ROUTES.map((route) => (
              <Link
                key={route.href}
                href={route.href}
                className="rounded-[1.75rem] bg-white p-6 shadow-[0_24px_60px_-40px_rgba(15,23,42,0.35)] transition-transform hover:-translate-y-1"
              >
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">{route.eyebrow}</p>
                <h2 className="mt-3 font-[var(--font-display)] text-2xl font-black tracking-tight text-foreground">{route.title}</h2>
                <p className="mt-3 text-sm leading-7 text-muted-foreground">{route.description}</p>
                <p className="mt-5 text-sm font-semibold text-primary">{route.label} →</p>
              </Link>
            ))}
          </div>
        </section>

        <SeoTrustSignalsPanel
          title="Why Bes3 treats trust as a crawlable product surface"
          description="Trust is not just footer boilerplate. Bes3 exposes methodology, legal clarity, support paths, open data, and site maps as deliberate machine-readable entry points."
          stats={[
            { label: 'Trust routes', value: String(TRUST_ROUTES.length), note: 'Methodology, legal, support, machine-entry, and syndication routes exposed directly.' },
            { label: 'Policy pages', value: '2', note: 'Privacy and terms pages with explicit structured trust signals.' },
            { label: 'Machine-entry pages', value: '6', note: 'Open data, llms.txt, raw API manifests, and feed endpoints exposed as first-class machine routes.' },
            { label: 'Support paths', value: '2', note: 'About and Contact clarify the product method and human fallback path.' }
          ]}
          points={[
            'The trust center gives search engines one stable hub for methodology, legal, support, and machine-readable routes.',
            'It reduces the chance that trust pages become isolated footer links with weak crawl depth.',
            'The same routes are now suitable for policy review, citation, and recurring admin SEO audits.',
            'Open data, llms.txt, machine manifests, and feed endpoints sit next to legal and methodology pages because they also affect crawl trust and machine interpretation.'
          ]}
        />

        <section className="grid gap-4 lg:grid-cols-3">
          {faqEntries.map((entry) => (
            <div key={entry.question} className="rounded-[1.75rem] bg-white p-6 shadow-panel">
              <h2 className="font-[var(--font-display)] text-2xl font-black tracking-tight text-foreground">{entry.question}</h2>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">{entry.answer}</p>
            </div>
          ))}
        </section>
      </div>
    </PublicShell>
  )
}
