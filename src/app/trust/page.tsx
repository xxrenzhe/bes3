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
    description: 'Browse the public data pages and feeds Bes3 exposes for anyone who wants a deeper look.'
  },
  {
    eyebrow: 'Machine Layer',
    title: 'LLMs Manifest',
    href: '/llms.txt',
    label: 'Open llms.txt',
    description: 'Open the plain-text file that points AI tools and other systems to the main Bes3 pages and public data endpoints.'
  },
  {
    eyebrow: 'Trust',
    title: 'security.txt',
    href: '/.well-known/security.txt',
    label: 'Open security.txt',
    description: 'Review the public security disclosure and contact file exposed through the standard well-known path.'
  },
  {
    eyebrow: 'Machine Layer',
    title: 'Coverage Manifest API',
    href: '/api/open/coverage',
    label: 'Open Coverage JSON',
    description: 'Read the public site summary JSON for available locales, sections, and data endpoints.'
  },
  {
    eyebrow: 'Machine Layer',
    title: 'Buying Feed API',
    href: '/api/open/buying-feed',
    label: 'Open Feed JSON',
    description: 'Read the public buying feed with products, reviews, and comparison data in one JSON response.'
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
    description: 'Read the latest Bes3 reviews, guides, and comparisons through a JSON feed.'
  },
  {
    eyebrow: 'Machine Layer',
    title: 'OpenSearch XML',
    href: '/opensearch.xml',
    label: 'Open OpenSearch XML',
    description: 'Expose the Bes3 site-search entry point through a standard OpenSearch description document.'
  },
  {
    eyebrow: 'Discovery',
    title: 'Image Sitemap',
    href: '/media-sitemap.xml',
    label: 'Open Image Sitemap',
    description: 'Open the XML file that lists product, review, brand, and category images used across Bes3.'
  },
  {
    eyebrow: 'Discovery',
    title: 'HTML Sitemap',
    href: '/site-map',
    label: 'Open Site Map',
    description: 'Browse one lightweight directory of categories, brands, products, reviews, and guides.'
  }
] as const

const faqEntries = [
  {
    question: 'What is the Bes3 trust center for?',
    answer: 'It keeps the methodology, contact, legal, open-data, and site-map pages in one place so people can quickly verify how Bes3 works.'
  },
  {
    question: 'Why not hide these pages in the footer only?',
    answer: 'Because trust pages should be easy to revisit and verify. Keeping them together makes them easier to find than burying them in the footer.'
  },
  {
    question: 'What should I open first from here?',
    answer: 'Open About if you want the method, Contact if you still need a human answer, Privacy or Terms for legal questions, and Open Data or the site map if you want the technical or structural side.'
  }
]

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadata({
    title: 'Trust Center',
    description: 'Browse the Bes3 trust surface: methodology, contact, privacy, terms, open data, llms.txt, feed endpoints, and sitemap routes from one clear entry point.',
    path: '/trust',
    locale: getRequestLocale(),
    keywords: ['trust center', 'about bes3', 'privacy policy', 'terms of service', 'open data', 'llms.txt', 'security.txt', 'rss feed', 'json feed', 'opensearch xml', 'image sitemap', 'html sitemap']
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
            The Bes3 trust pages in one place.
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-8 text-muted-foreground">
            This page gathers the methodology, contact path, legal policies, open-data docs, feeds, and site maps that explain how Bes3 works and what the public site publishes.
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
          title="Why Bes3 keeps trust pages easy to verify"
          description="Trust is not just footer boilerplate. Bes3 keeps its method, legal pages, support paths, open data, and site maps easy to find."
          stats={[
            { label: 'Trust routes', value: String(TRUST_ROUTES.length), note: 'Method, legal, support, feed, and discovery pages linked directly.' },
            { label: 'Policy pages', value: '2', note: 'Privacy and terms pages that explain how Bes3 handles trust and responsibility.' },
            { label: 'Data routes', value: '9', note: 'Open data, llms.txt, security.txt, feeds, search description files, and sitemap files are all visible here.' },
            { label: 'Support paths', value: '2', note: 'About and Contact explain the product method and where to get a human answer.' }
          ]}
          points={[
            'The trust center keeps the most important trust pages easy to find from one place.',
            'It prevents privacy, terms, support, and site-structure pages from becoming buried footer links.',
            'The same routes can be reused for reviews, citations, or technical checks when needed.',
            'Open data, llms.txt, security.txt, feeds, the search description file, and the image sitemap sit next to legal and methodology pages so the full picture stays easy to verify.'
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
