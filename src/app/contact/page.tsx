import type { Metadata } from 'next'
import Link from 'next/link'
import { PublicShell } from '@/components/layout/PublicShell'
import { StructuredData } from '@/components/site/StructuredData'
import { ContactSupportForm } from '@/components/site/ContactSupportForm'
import { getArticlePath } from '@/lib/article-path'
import { getCategoryLabel } from '@/lib/editorial'
import { buildPageMetadata } from '@/lib/metadata'
import { buildFaqSchema, buildWebPageSchema } from '@/lib/structured-data'
import { listCategories, listPublishedArticles } from '@/lib/site-data'

export const metadata: Metadata = buildPageMetadata({
  title: 'Contact Bes3',
  description:
    'Contact Bes3 for support edge cases, correction requests, and partnership conversations when the public pages are not enough.',
  path: '/contact',
  keywords: ['contact bes3', 'buyer support', 'editorial corrections', 'partnership inquiries']
})

export default async function ContactPage() {
  const [categories, articles] = await Promise.all([listCategories(), listPublishedArticles()])
  const leadReview = articles.find((article) => article.type === 'review') || null
  const leadComparison = articles.find((article) => article.type === 'comparison') || null
  const leadCategory = leadReview?.product?.category || leadComparison?.product?.category || categories[0] || ''
  const leadCategoryLabel = getCategoryLabel(leadCategory)

  const selfServeRoutes = [
    {
      eyebrow: 'Search',
      title: 'Start with a concrete need',
      description: 'Most shopping questions are answered faster through product search than through email.',
      href: '/search?scope=products',
      label: 'Search products'
    },
    {
      eyebrow: 'Shortlist',
      title: 'Keep your finalists together',
      description: 'If the issue is “I am close but not ready,” shortlist usually solves it better than a support thread.',
      href: '/shortlist',
      label: 'Open shortlist'
    },
    {
      eyebrow: 'Review',
      title: 'Read the clearest review',
      description: 'When one product is already promising, a review usually answers your fit questions faster than a custom reply.',
      href: leadReview ? getArticlePath(leadReview.type, leadReview.slug) : '/search?scope=review',
      label: leadReview ? 'Open live review' : 'Browse review archive'
    },
    {
      eyebrow: 'Wait',
      title: `Track ${leadCategoryLabel}`,
      description: 'If timing is the real blocker, alerts help you wait without forcing you to buy or email too early.',
      href: leadCategory ? `/newsletter?intent=price-alert&category=${encodeURIComponent(leadCategory)}&cadence=priority` : '/newsletter',
      label: leadCategory ? `Track ${leadCategoryLabel}` : 'Start alerts'
    }
  ]

  const bestUseCases = [
    'A real buyer edge case still feels unresolved after search, shortlist, and review pages.',
    'You spotted a factual issue, stale price cue, or routing bug on a public Bes3 page.',
    'You want to discuss editorial partnerships, content distribution, or platform collaboration.'
  ]

  const contactChannels = [
    {
      label: 'Buyer support path',
      value: 'Use the form below',
      note: 'Best for buyer support edge cases and public-site questions that still feel blocked after using search, shortlist, or review pages.'
    },
    {
      label: 'Corrections path',
      value: 'Choose “Correction” in the form',
      note: 'Best for content accuracy issues, stale details, and page-level fixes that could affect buyer trust.'
    },
    {
      label: 'Partnerships path',
      value: 'Choose “Partnership” in the form',
      note: 'Best for collaboration, media, and commercial conversations that do not fit the public site experience.'
    }
  ]
  const faqEntries = [
    {
      question: 'When should I contact Bes3 instead of using the public pages?',
      answer: 'Use contact when a real edge case still feels unresolved after search, shortlist, reviews, and comparisons, or when you need to report a factual problem on a public page.'
    },
    {
      question: 'Is email the main support option?',
      answer: 'No. The contact form is the main support option because it keeps the request organized and helps Bes3 respond in the right context.'
    },
    {
      question: 'What gets the fastest answer?',
      answer: 'Questions tied to a specific product, category, or page usually get the fastest answer because they are easier to review than vague requests.'
    }
  ]
  const structuredData = [
    buildWebPageSchema({
      path: '/contact',
      title: 'Contact Bes3',
      description: 'Contact Bes3 for support edge cases, correction requests, and partnership conversations when the public pages are not enough.',
      type: 'ContactPage'
    }),
    buildFaqSchema('/contact', faqEntries)
  ]

  return (
    <PublicShell>
      <StructuredData data={structuredData} />
      <div className="mx-auto max-w-7xl space-y-14 px-4 py-16 sm:px-6 lg:px-8">
        <section className="rounded-[2.5rem] bg-[linear-gradient(135deg,#fff8ef_0%,#f8fbff_48%,#eefaf5_100%)] p-8 shadow-panel sm:p-10">
          <div className="grid gap-8 xl:grid-cols-[1fr_0.95fr] xl:items-start">
            <div>
              <p className="editorial-kicker">Contact Bes3</p>
              <h1 className="mt-4 font-[var(--font-display)] text-5xl font-black tracking-tight text-foreground sm:text-6xl">
                Get help when the site is not enough.
              </h1>
              <p className="mt-4 max-w-3xl text-lg leading-8 text-muted-foreground">
                Contact should be the backup path, not the first one. Bes3 already answers most shopping questions through search, reviews, shortlist, comparisons, and alerts. Use this page when you still feel blocked after those pages.
              </p>
              <div className="mt-6 rounded-[1.75rem] bg-slate-950 p-5 text-white">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-200">Best next step</p>
                <p className="mt-3 text-sm leading-7 text-slate-200">
                  If your question is about which product to buy, start with search or a review first. Contact is most useful for edge cases, factual corrections, and conversations that do not fit a standard shopping path.
                </p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {selfServeRoutes.map((route) => (
                <Link
                  key={route.title}
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
          </div>
        </section>

        <section className="grid gap-8 lg:grid-cols-[0.94fr_1.06fr]">
          <div className="space-y-6">
            <div className="rounded-[2rem] bg-white p-8 shadow-panel">
              <p className="editorial-kicker">Best Reasons To Contact</p>
              <h2 className="mt-3 font-[var(--font-display)] text-3xl font-black tracking-tight text-foreground">Use a human review only when the standard route is not enough.</h2>
              <div className="mt-6 space-y-4">
                {bestUseCases.map((item) => (
                  <div key={item} className="flex items-start gap-3 text-sm leading-7 text-muted-foreground">
                    <span className="mt-2 h-2.5 w-2.5 rounded-full bg-primary" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-4">
              {contactChannels.map((channel) => (
                <div key={channel.label} className="rounded-[1.75rem] bg-white p-6 shadow-panel">
                  <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-muted-foreground">{channel.label}</p>
                  <p className="mt-3 text-xl font-semibold text-foreground">{channel.value}</p>
                  <p className="mt-3 text-sm leading-7 text-muted-foreground">{channel.note}</p>
                </div>
              ))}
            </div>

            <div className="rounded-[2rem] bg-[linear-gradient(135deg,#fff8ef_0%,#f8fbff_48%,#eefaf5_100%)] p-8 shadow-panel">
              <p className="editorial-kicker">Contact FAQ</p>
              <div className="mt-6 space-y-4">
                {faqEntries.map((entry) => (
                  <div key={entry.question} className="rounded-[1.5rem] bg-white p-5">
                    <h2 className="font-[var(--font-display)] text-2xl font-black tracking-tight text-foreground">{entry.question}</h2>
                    <p className="mt-3 text-sm leading-7 text-muted-foreground">{entry.answer}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <ContactSupportForm />
        </section>
      </div>
    </PublicShell>
  )
}
