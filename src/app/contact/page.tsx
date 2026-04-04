import type { Metadata } from 'next'
import Link from 'next/link'
import { PublicShell } from '@/components/layout/PublicShell'
import { ContactSupportForm } from '@/components/site/ContactSupportForm'
import { getArticlePath } from '@/lib/article-path'
import { getCategoryLabel } from '@/lib/editorial'
import { buildPageMetadata } from '@/lib/metadata'
import { listCategories, listPublishedArticles } from '@/lib/site-data'

export const metadata: Metadata = buildPageMetadata({
  title: 'Contact Bes3',
  description:
    'Reach Bes3 for buyer support edge cases, correction requests, and partnership conversations when the public decision flow is not enough.',
  path: '/contact'
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
      description: 'Most buyer questions are faster through product search than through email because Bes3 already knows how to route known use cases.',
      href: '/search?scope=products',
      label: 'Search product lanes'
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
      title: 'Read the clearest live verdict',
      description: 'When one product is already plausible, a review answers buyer-fit questions faster than a custom reply.',
      href: leadReview ? getArticlePath(leadReview.type, leadReview.slug) : '/search?scope=review',
      label: leadReview ? 'Open live review' : 'Browse review archive'
    },
    {
      eyebrow: 'Wait',
      title: `Track ${leadCategoryLabel}`,
      description: 'If timing is the real blocker, a watch flow preserves the decision lane without forcing you to buy or email prematurely.',
      href: leadCategory ? `/newsletter?intent=price-alert&category=${encodeURIComponent(leadCategory)}&cadence=priority` : '/newsletter',
      label: leadCategory ? `Track ${leadCategoryLabel}` : 'Start alerts'
    }
  ]

  const bestUseCases = [
    'A real buyer edge case still feels unresolved after search, shortlist, and review routes.',
    'You spotted a factual issue, stale price cue, or routing bug on a public Bes3 page.',
    'You want to discuss editorial partnerships, content distribution, or platform collaboration.'
  ]

  const contactChannels = [
    {
      label: 'General inbox',
      value: 'hello@bes3.local',
      note: 'Best for buyer support edge cases and general Bes3 questions.'
    },
    {
      label: 'Corrections',
      value: 'corrections@bes3.local',
      note: 'Best for content accuracy, stale details, and page-level fixes.'
    },
    {
      label: 'Partnerships',
      value: 'partners@bes3.local',
      note: 'Best for collaboration, media, and commercial conversations.'
    }
  ]

  return (
    <PublicShell>
      <div className="mx-auto max-w-7xl space-y-14 px-4 py-16 sm:px-6 lg:px-8">
        <section className="rounded-[2.5rem] bg-[linear-gradient(135deg,#fff8ef_0%,#f8fbff_48%,#eefaf5_100%)] p-8 shadow-panel sm:p-10">
          <div className="grid gap-8 xl:grid-cols-[1fr_0.95fr] xl:items-start">
            <div>
              <p className="editorial-kicker">Contact Bes3</p>
              <h1 className="mt-4 font-[var(--font-display)] text-5xl font-black tracking-tight text-foreground sm:text-6xl">
                Get help without leaving the buying lane.
              </h1>
              <p className="mt-4 max-w-3xl text-lg leading-8 text-muted-foreground">
                Contact should be the backup path, not the first one. Bes3 already answers most buying questions through search, verdict pages, shortlist, comparisons, and wait flows. Use this page when the decision still feels blocked after those routes.
              </p>
              <div className="mt-6 rounded-[1.75rem] bg-slate-950 p-5 text-white">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-200">Best current route</p>
                <p className="mt-3 text-sm leading-7 text-slate-200">
                  If your question is about which product to buy, start with search or the live review flow first. Contact is most valuable for edge cases, factual corrections, and conversations that do not fit a standard buying path.
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
              <h2 className="mt-3 font-[var(--font-display)] text-3xl font-black tracking-tight text-foreground">Use a human pass only when the standard route is not enough.</h2>
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
          </div>

          <ContactSupportForm />
        </section>
      </div>
    </PublicShell>
  )
}
