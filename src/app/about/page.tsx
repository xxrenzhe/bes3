import type { Metadata } from 'next'
import Link from 'next/link'
import { PublicShell } from '@/components/layout/PublicShell'
import { StructuredData } from '@/components/site/StructuredData'
import { SectionHeader } from '@/components/site/SectionHeader'
import { getArticlePath } from '@/lib/article-path'
import { getCategoryLabel } from '@/lib/editorial'
import { buildPageMetadata } from '@/lib/metadata'
import { buildFaqSchema, buildWebPageSchema } from '@/lib/structured-data'
import { listCategories, listPublishedArticles, listPublishedProducts } from '@/lib/site-data'

export const metadata: Metadata = buildPageMetadata({
  title: 'Bes3 Method',
  description:
    'Learn how Bes3 uses real buyer reviews, price history, and spec checks to help you choose the right product.',
  path: '/about',
  keywords: ['bes3 method', 'product review process', 'comparison methodology', 'buying guides']
})

export default async function AboutPage() {
  const [categories, articles, products] = await Promise.all([listCategories(), listPublishedArticles(), listPublishedProducts()])
  const leadReview = articles.find((article) => article.type === 'review') || null
  const leadComparison = articles.find((article) => article.type === 'comparison') || null
  const leadGuide = articles.find((article) => article.type === 'guide') || null
  const leadCategory = leadReview?.product?.category || leadComparison?.product?.category || categories[0] || ''
  const leadCategoryLabel = getCategoryLabel(leadCategory)

  const trustStats = [
    {
      label: 'Live categories',
      value: String(categories.length),
      description: 'Categories shoppers can browse right now.'
    },
    {
      label: 'Published pages',
      value: String(articles.length),
      description: 'Reviews, comparisons, and guides already live.'
    },
    {
      label: 'Product deep-dives',
      value: String(products.length),
      description: 'Product pages with pricing, specs, and save actions.'
    },
    {
      label: 'Helpful formats',
      value: '4',
      description: 'Search, reviews, comparisons, and alerts for different shopping moments.'
    }
  ]

  const methodologySteps = [
    {
      step: '01',
      title: 'Start with the right category',
      description: 'Bes3 starts by figuring out the right product type and use case, so you do not compare things that do not belong together.'
    },
    {
      step: '02',
      title: 'Cut the list to a few good picks',
      description: 'We narrow noisy product grids down to a few credible options instead of rewarding volume for its own sake.'
    },
    {
      step: '03',
      title: 'Show what you gain and lose',
      description: 'Reviews and comparisons focus on fit, tradeoffs, and real downsides so you can buy with fewer surprises.'
    },
    {
      step: '04',
      title: 'Keep watching if the timing is off',
      description: 'When now is not the right moment to buy, Bes3 helps you save the product or category instead of pushing you into a rushed click.'
    }
  ]

  const formatRoutes = [
    {
      eyebrow: 'Search',
      title: 'Use search when the need is concrete',
      description: 'Search is the fastest route when you already know the product type, brand, or use case and want Bes3 to narrow the options.',
      href: '/search?scope=products',
      label: 'Search products'
    },
    {
      eyebrow: 'Review',
      title: 'Use a review when one product is close',
      description: 'Reviews answer whether a product really fits, what can go wrong, and whether it deserves a place on your shortlist.',
      href: leadReview ? getArticlePath(leadReview.type, leadReview.slug) : '/search?scope=review',
      label: leadReview ? 'Open a live review' : 'Browse review coverage'
    },
    {
      eyebrow: 'Compare',
      title: 'Use comparisons only for finalists',
      description: 'Comparisons work best after the list is already short enough that the tradeoffs stay clear and useful.',
      href: leadComparison ? getArticlePath(leadComparison.type, leadComparison.slug) : '/shortlist',
      label: leadComparison ? 'Open a live comparison' : 'Use shortlist compare'
    },
    {
      eyebrow: 'Wait',
      title: 'Use alerts when timing is the blocker',
      description: 'Alerts keep the same category in view when price or timing matters more than buying today.',
      href: leadCategory ? `/newsletter?intent=category-brief&category=${encodeURIComponent(leadCategory)}&cadence=weekly` : '/newsletter',
      label: leadCategory ? `Track ${leadCategoryLabel}` : 'Start alerts'
    }
  ]

  const guardrails = [
    'No sponsored placement inside the Bes3 shortlist.',
    'Affiliate links stay next to buying actions instead of deciding our rankings.',
    'Every page is meant to reduce buyer noise, not increase page count for its own sake.',
    'Price is treated as a final accelerant, not the first filter for product fit.'
  ]

  const antiPatterns = [
    'We do not pad the page with 20 nearly identical picks to simulate coverage.',
    'We do not treat raw review count as automatic proof without category and fit context.',
    'We do not push compare before the shortlist is narrow enough to support a real decision.',
    'We do not turn alerts into generic blasts that lose the original shopping context.'
  ]

  const nextActions = [
    {
      title: 'Start with search',
      description: 'Best when the product need is already clear and you want Bes3 to narrow candidates quickly.',
      href: '/search?scope=products',
      label: 'Search now'
    },
    {
      title: `Browse ${leadCategoryLabel}`,
      description: 'Best when the category is already obvious and you want the strongest pages grouped in one place.',
      href: leadCategory ? `/categories/${leadCategory}` : '/directory',
      label: leadCategory ? 'Open category hub' : 'Open directory'
    },
    {
      title: 'Keep a shortlist alive',
      description: 'Best when you already have good candidates and want to keep them saved instead of starting over later.',
      href: '/shortlist',
      label: 'Open shortlist'
    }
  ]
  const faqEntries = [
    {
      question: 'What does Bes3 actually publish?',
      answer: 'Bes3 publishes product shortlists, reviews, comparisons, category pages, and alerts for different stages of a real buying decision.'
    },
    {
      question: 'When should you use a review instead of a comparison?',
      answer: 'Use a review when one product already looks promising and you want to know if it really fits. Use a comparison once your shortlist is tight enough for a head-to-head decision.'
    },
    {
      question: 'How does Bes3 try to stay trustworthy?',
      answer: 'We analyze thousands of real buyer reviews, track price history, and double-check specs. We also keep sponsored links outside the ranking itself so ads do not decide the recommendation.'
    }
  ]
  const structuredData = [
    buildWebPageSchema({
      path: '/about',
      title: 'Bes3 Method',
      description: 'Learn how Bes3 uses real buyer reviews, price history, and spec checks to help you choose the right product.',
      type: 'AboutPage'
    }),
    buildFaqSchema('/about', faqEntries)
  ]

  return (
    <PublicShell>
      <StructuredData data={structuredData} />
      <div className="space-y-20 pb-20">
        <section className="px-4 pb-10 pt-12 sm:px-6 lg:px-8">
          <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-end">
            <div className="space-y-7">
              <p className="editorial-kicker">How Bes3 Works</p>
              <h1 className="font-[var(--font-display)] text-5xl font-black tracking-tight text-foreground sm:text-7xl">
                How Bes3 helps you buy with more confidence.
              </h1>
              <p className="max-w-3xl text-xl leading-9 text-muted-foreground">
                Bes3 is not a generic review archive. We narrow noisy categories into a few serious options, explain the tradeoffs that matter, and help you act when the timing is right.
              </p>
              <div className="flex flex-wrap gap-4">
                <Link
                  href="/search?scope=products"
                  className="rounded-full bg-[linear-gradient(135deg,hsl(var(--primary)),#00855d)] px-8 py-4 text-base font-semibold text-primary-foreground shadow-lg shadow-emerald-950/10 transition-transform hover:-translate-y-0.5"
                >
                  Start with search
                </Link>
                <Link
                  href="/shortlist"
                  className="rounded-full border border-border/80 bg-white px-8 py-4 text-base font-semibold text-foreground transition-colors hover:bg-muted"
                >
                  Open shortlist
                </Link>
              </div>
            </div>

            <div className="rounded-[2.5rem] bg-[linear-gradient(135deg,#fff8ef_0%,#f8fbff_48%,#eefaf5_100%)] p-8 shadow-panel sm:p-10">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">What this page should answer</p>
              <div className="mt-5 space-y-4">
                {[
                  'Why Bes3 only keeps a few picks instead of publishing giant “best of” grids.',
                  'How reviews, comparisons, category pages, and alerts fit together in one shopping flow.',
                  'What rules stop the public site from turning into a low-trust affiliate funnel.'
                ].map((item) => (
                  <div key={item} className="flex items-start gap-3 text-sm leading-7 text-muted-foreground">
                    <span className="mt-2 h-2.5 w-2.5 rounded-full bg-primary" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="px-4 sm:px-6 lg:px-8">
          <div className="mx-auto grid max-w-7xl gap-4 md:grid-cols-2 xl:grid-cols-4">
            {trustStats.map((stat) => (
              <div key={stat.label} className="rounded-[1.75rem] bg-white p-6 shadow-panel">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">{stat.label}</p>
                <p className="mt-3 font-[var(--font-display)] text-4xl font-black tracking-tight text-foreground">{stat.value}</p>
                <p className="mt-3 text-sm leading-7 text-muted-foreground">{stat.description}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="tonal-surface px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <SectionHeader
              eyebrow="Method"
              title="The Bes3 method is built for decisions, not page depth."
              description="Every public format exists to help you do one useful thing next: understand the category, save strong picks, validate one product, compare finalists, or wait without losing your place."
            />
            <div className="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
              {methodologySteps.map((step) => (
                <div key={step.step} className="rounded-[2rem] bg-white p-7 shadow-panel">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">{step.step}</p>
                  <h2 className="mt-4 font-[var(--font-display)] text-3xl font-black tracking-tight text-foreground">{step.title}</h2>
                  <p className="mt-4 text-sm leading-7 text-muted-foreground">{step.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl rounded-[2.5rem] bg-[linear-gradient(135deg,#fff8ef_0%,#f8fbff_48%,#eefaf5_100%)] p-8 shadow-panel sm:p-10">
            <div className="grid gap-8 xl:grid-cols-[1fr_0.95fr] xl:items-start">
              <div>
                <SectionHeader
                  eyebrow="Formats"
                  title="Use the format that matches the buying moment."
                  description="The public site works best when you choose the page that matches what is still unclear. That is why Bes3 separates discovery, reviews, comparisons, and alerts instead of blending everything into one archive."
                />
                <div className="mt-6 rounded-[1.75rem] bg-slate-950 p-5 text-white">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-200">Best next step</p>
                  <p className="mt-3 text-sm leading-7 text-slate-200">
                    If you only know the need, start with search. If one product already looks promising, open the review first. If the shortlist is tight, compare. If timing is the only blocker, switch into alerts.
                  </p>
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                {formatRoutes.map((route) => (
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
          </div>
        </section>

        <section className="px-4 sm:px-6 lg:px-8">
          <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-2">
            <div className="rounded-[2.5rem] bg-white p-8 shadow-panel sm:p-10">
              <p className="editorial-kicker">Editorial Guardrails</p>
              <h2 className="mt-3 font-[var(--font-display)] text-4xl font-black tracking-tight text-foreground">What Bes3 promises buyers.</h2>
              <div className="mt-6 space-y-4">
                {guardrails.map((item) => (
                  <div key={item} className="flex items-start gap-3 text-sm leading-7 text-muted-foreground">
                    <span className="mt-2 h-2.5 w-2.5 rounded-full bg-primary" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[2.5rem] bg-slate-950 p-8 text-white shadow-panel sm:p-10">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-200">What Bes3 avoids</p>
              <h2 className="mt-3 font-[var(--font-display)] text-4xl font-black tracking-tight">The anti-patterns that make buying guides noisy.</h2>
              <div className="mt-6 space-y-4">
                {antiPatterns.map((item) => (
                  <div key={item} className="flex items-start gap-3 text-sm leading-7 text-slate-200">
                    <span className="mt-2 h-2.5 w-2.5 rounded-full bg-emerald-300" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl rounded-[2.5rem] bg-[linear-gradient(135deg,#fff8ef_0%,#f8fbff_48%,#eefaf5_100%)] p-8 shadow-panel sm:p-10">
            <SectionHeader
              eyebrow="Trust FAQ"
              title="Questions people should be able to answer before trusting the site."
              description="These are the practical questions that matter if you want to know whether Bes3 is worth trusting."
            />
            <div className="mt-8 grid gap-4 md:grid-cols-3">
              {faqEntries.map((entry) => (
                <div key={entry.question} className="rounded-[1.75rem] bg-white p-6 shadow-[0_24px_60px_-40px_rgba(15,23,42,0.35)]">
                  <h2 className="font-[var(--font-display)] text-2xl font-black tracking-tight text-foreground">{entry.question}</h2>
                  <p className="mt-4 text-sm leading-7 text-muted-foreground">{entry.answer}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl rounded-[2.5rem] bg-white p-8 shadow-panel sm:p-10">
            <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-end">
              <div>
                <p className="editorial-kicker">Use Bes3 Live</p>
                <h2 className="mt-3 font-[var(--font-display)] text-4xl font-black tracking-tight text-foreground">Trust is only useful if it leads to a cleaner next action.</h2>
                <p className="mt-4 max-w-2xl text-sm leading-8 text-muted-foreground">
                  The public site is built to turn trust into action. Use one of these routes instead of reading this page and then reopening the same research problem from scratch.
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                {nextActions.map((action) => (
                  <Link
                    key={action.title}
                    href={action.href}
                    className="rounded-[1.5rem] bg-muted/60 p-5 transition-colors hover:bg-emerald-50"
                  >
                    <p className="text-base font-semibold text-foreground">{action.title}</p>
                    <p className="mt-3 text-sm leading-7 text-muted-foreground">{action.description}</p>
                    <p className="mt-4 text-sm font-semibold text-primary">{action.label} →</p>
                  </Link>
                ))}
              </div>
            </div>
            {leadGuide ? (
              <div className="mt-8 rounded-[1.75rem] border border-border/60 bg-[linear-gradient(135deg,#f8fbff,#eef4ff)] p-6">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">Current example</p>
                <p className="mt-3 text-sm leading-7 text-muted-foreground">
                  Want to see the method in action? Start with the live guide <Link href={getArticlePath(leadGuide.type, leadGuide.slug)} className="font-semibold text-primary">{leadGuide.title}</Link>, then move into the linked review or comparison from there.
                </p>
              </div>
            ) : null}
          </div>
        </section>
      </div>
    </PublicShell>
  )
}
