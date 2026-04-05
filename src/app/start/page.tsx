import type { Metadata } from 'next'
import Link from 'next/link'
import { PublicShell } from '@/components/layout/PublicShell'
import { NewsletterSignup } from '@/components/site/NewsletterSignup'
import { SectionHeader } from '@/components/site/SectionHeader'
import { SeoFaqSection } from '@/components/site/SeoFaqSection'
import { StructuredData } from '@/components/site/StructuredData'
import { getArticlePath } from '@/lib/article-path'
import { getCategoryLabel } from '@/lib/editorial'
import { buildPageMetadata } from '@/lib/metadata'
import { buildBreadcrumbSchema, buildCollectionPageSchema, buildFaqSchema, buildHowToSchema } from '@/lib/structured-data'
import { listBrands, listCategories, listPublishedArticles, listPublishedProducts } from '@/lib/site-data'

export async function generateMetadata(): Promise<Metadata> {
  const [articles, products] = await Promise.all([listPublishedArticles(), listPublishedProducts()])
  const freshnessDate =
    articles[0]?.updatedAt ||
    articles[0]?.publishedAt ||
    articles[0]?.createdAt ||
    products[0]?.updatedAt ||
    products[0]?.publishedAt ||
    null

  return buildPageMetadata({
    title: 'Start Here: Find the right product faster',
    description:
      'Use Bes3 to search by need, read a full review, compare finalists, or set a price alert without starting over.',
    path: '/start',
    image: articles[0]?.heroImageUrl || products[0]?.heroImageUrl,
    freshnessDate,
    freshnessInTitle: true,
    keywords: ['product shortlist', 'product comparisons', 'price alerts', 'tech buying guide']
  })
}

export default async function StartPage() {
  const [brands, categories, articles, products] = await Promise.all([
    listBrands(),
    listCategories(),
    listPublishedArticles(),
    listPublishedProducts()
  ])
  const leadReview = articles.find((article) => article.type === 'review') || articles[0] || null
  const leadComparison = articles.find((article) => article.type === 'comparison') || articles[1] || null
  const leadGuide = articles.find((article) => article.type === 'guide') || articles[2] || null
  const leadCategory = leadReview?.product?.category || leadComparison?.product?.category || categories[0] || ''
  const leadBrand = brands[0] || null
  const leadCategoryLabel = getCategoryLabel(leadCategory)
  const latestRefresh =
    articles[0]?.updatedAt ||
    articles[0]?.publishedAt ||
    articles[0]?.createdAt ||
    products[0]?.updatedAt ||
    products[0]?.publishedAt ||
    null
  const breadcrumbItems = [
    { name: 'Home', path: '/' },
    { name: 'Start Here', path: '/start' }
  ]
  const stateRoutes = [
    {
      eyebrow: 'Step 01',
      title: 'I know what I need, but not which model',
      description: 'Start with search when your use case is clear but you still need help narrowing the options.',
      href: '/search?scope=products',
      label: 'Search products'
    },
    {
      eyebrow: 'Step 02',
      title: 'One product already looks good',
      description: 'Use a review when one option already has your attention and you want the real pros, cons, and reasons to skip it.',
      href: leadReview ? getArticlePath(leadReview.type, leadReview.slug) : '/search?scope=review',
      label: leadReview ? 'Open the full review' : 'Browse reviews'
    },
    {
      eyebrow: 'Step 03',
      title: 'I already have a few options',
      description: 'Move into shortlist and comparisons once you have a small set of products worth checking side by side.',
      href: leadComparison ? getArticlePath(leadComparison.type, leadComparison.slug) : '/shortlist',
      label: leadComparison ? 'Open a comparison' : 'Open shortlist'
    },
    {
      eyebrow: 'Step 04',
      title: 'I want to wait for a better price',
      description: 'Set an alert when timing is the blocker, so you can come back later without restarting all your research.',
      href: leadCategory ? `/newsletter?intent=category-brief&category=${encodeURIComponent(leadCategory)}&cadence=weekly` : '/newsletter',
      label: leadCategory ? `Track ${leadCategoryLabel}` : 'Start alerts'
    }
  ]
  const positioningPillars = [
    {
      title: 'Useful, not overwhelming',
      description: 'Bes3 is built to move you forward, not trap you inside endless "best of" lists.'
    },
    {
      title: 'A short list, not a giant list',
      description: 'The goal is to cut a market down to a few serious options, not pad the page with filler picks.'
    },
    {
      title: 'Real proof, not hype',
      description: 'Price history, recent updates, real reviews, and clear tradeoffs matter more than generic listicles.'
    },
    {
      title: 'Save your progress for later',
      description: 'If now is not the moment to buy, Bes3 helps you track the product or category so you do not start over.'
    }
  ]
  const methodSteps = [
    {
      step: '01',
      title: 'Start with the need',
      description: 'Begin with the category, brand, or use case that matches what you actually want to buy.'
    },
    {
      step: '02',
      title: 'Cut the list down',
      description: 'Use Bes3 to narrow the market to a few strong options instead of browsing everything equally.'
    },
    {
      step: '03',
      title: 'Compare the real tradeoffs',
      description: 'Read a review or compare finalists once the list is small enough for a real decision.'
    },
    {
      step: '04',
      title: 'Keep your place if you wait',
      description: 'If price matters more than speed, save or track the same category so the work is still there later.'
    }
  ]
  const systemStats = [
    {
      label: 'Live categories',
      value: String(categories.length),
      description: 'Categories you can browse right now.'
    },
    {
      label: 'Brand hubs',
      value: String(brands.length),
      description: 'Brands with dedicated pages and coverage.'
    },
    {
      label: 'Published pages',
      value: String(articles.length),
      description: 'Reviews, comparisons, and guides already live.'
    },
    {
      label: 'Tracked products',
      value: String(products.length),
      description: 'Products with pricing and shortlist actions.'
    }
  ]
  const antiPatterns = [
    'Publishing giant filler lists to simulate authority.',
    'Comparing unrelated categories just to increase page count.',
    'Letting deals override category fit too early in the journey.',
    'Forcing buyers to restart from search every time timing changes.'
  ]
  const faqEntries = [
    {
      question: 'What is Bes3 actually trying to be?',
      answer: 'Bes3 is a shopping guide. It helps you go from "I need something" to a shortlist, a review, a comparison, or a price alert without losing your place.'
    },
    {
      question: 'Why does Bes3 prefer a few strong picks instead of giant lists?',
      answer: 'Because giant lists create more reading, not better decisions. Bes3 tries to narrow the field to a few options that are actually worth your time.'
    },
    {
      question: 'When should I go to shortlist instead of staying in search?',
      answer: 'Go to shortlist after you have at least two credible candidates or one strong candidate you know you want to preserve across visits.'
    },
    {
      question: 'Why does Bes3 include alerts as part of the product?',
      answer: 'Because many real buying decisions are blocked by timing, not by product fit. Alerts help you wait for a better moment without restarting your research.'
    }
  ]
  const structuredData = [
    buildBreadcrumbSchema('/start', breadcrumbItems),
    buildCollectionPageSchema({
      path: '/start',
      title: 'Start Here: Find the right product faster',
      description: 'Use Bes3 to search by need, read a full review, compare finalists, or set a price alert without starting over.',
      breadcrumbItems,
      dateModified: latestRefresh,
      items: stateRoutes.map((route) => ({
        name: route.title,
        path: route.href
      }))
    }),
    buildHowToSchema(
      '/start',
      'How to use Bes3 to shop faster',
      'Use Bes3 by matching your current shopping situation to the right page, then keep your progress saved until you are ready to buy.',
      [
        {
          name: 'Start from what you already know',
          text: 'Choose search, review, comparison, or alerts based on what is still unclear instead of jumping into random pages.'
        },
        {
          name: 'Keep the list short',
          text: 'Compare only products that really belong together, and use shortlist to save serious candidates instead of every product you notice.'
        },
        {
          name: 'Use alerts when timing changes',
          text: 'If you are not buying now, save the category or price watch so you can resume later without starting from zero.'
        }
      ]
    ),
    buildFaqSchema('/start', faqEntries)
  ]

  return (
    <PublicShell>
      <StructuredData data={structuredData} />
      <div className="mx-auto max-w-7xl space-y-16 px-4 py-14 sm:px-6 lg:px-8">
        <section className="rounded-[2.5rem] bg-[linear-gradient(135deg,#0f172a_0%,#1d4ed8_55%,#0f766e_100%)] p-8 text-white shadow-[0_35px_80px_-45px_rgba(15,23,42,0.8)] sm:p-10">
          <div className="grid gap-8 xl:grid-cols-[1fr_0.92fr] xl:items-start">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-emerald-200">Start Here</p>
              <h1 className="mt-4 font-[var(--font-display)] text-5xl font-black tracking-tight sm:text-6xl">
                Use Bes3 to shop with less guesswork.
              </h1>
              <p className="mt-4 max-w-3xl text-lg leading-8 text-slate-200">
                Bes3 is not a generic review archive. It helps you narrow the options, understand the tradeoffs, and keep your progress saved if you decide to wait.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link href="/search?scope=products" className="inline-flex min-h-[48px] items-center justify-center rounded-full bg-white px-6 text-sm font-semibold text-slate-950">
                  Start with search
                </Link>
                <Link href="/shortlist" className="inline-flex min-h-[48px] items-center justify-center rounded-full border border-white/20 px-6 text-sm font-semibold text-white transition-colors hover:bg-white/10">
                  Open shortlist
                </Link>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {systemStats.map((stat) => (
                <div key={stat.label} className="rounded-[1.75rem] border border-white/12 bg-white/10 p-5 backdrop-blur-sm">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-200/85">{stat.label}</p>
                  <p className="mt-3 text-3xl font-black">{stat.value}</p>
                  <p className="mt-3 text-sm leading-7 text-slate-200/80">{stat.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="rounded-[2.5rem] bg-[linear-gradient(135deg,#fff8ef_0%,#f8fbff_48%,#eefaf5_100%)] p-8 shadow-panel sm:p-10">
          <div className="flex flex-col gap-4 border-b border-border/40 pb-6 md:flex-row md:items-end md:justify-between">
            <SectionHeader
              eyebrow="Buying States"
              title="Choose the route that matches what is still unresolved."
              description="Bes3 works best when you start with the page that matches what is still unclear."
            />
            <p className="max-w-2xl text-sm leading-7 text-muted-foreground">
              Search if the need is still broad. Read a review if one product looks close. Compare if you already have finalists. Use alerts if timing is the only blocker left.
            </p>
          </div>
          <div className="mt-6 grid gap-4 xl:grid-cols-4">
            {stateRoutes.map((route) => (
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
        </section>

        <section className="grid gap-8 lg:grid-cols-[1fr_0.95fr]">
          <div className="rounded-[2rem] bg-white p-8 shadow-panel">
            <SectionHeader
              eyebrow="Positioning"
              title="Why Bes3 behaves differently from a review archive."
              description="Bes3 is built around helping you decide faster, not around making you open more pages."
            />
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {positioningPillars.map((pillar) => (
                <div key={pillar.title} className="rounded-[1.5rem] bg-muted p-5">
                  <h2 className="font-[var(--font-display)] text-2xl font-black tracking-tight text-foreground">{pillar.title}</h2>
                  <p className="mt-3 text-sm leading-7 text-muted-foreground">{pillar.description}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[2rem] bg-white p-8 shadow-panel">
            <SectionHeader
              eyebrow="Method"
              title="How it works in four simple steps."
              description="This is the simple flow behind search, reviews, shortlist, and alerts."
            />
            <div className="mt-6 space-y-4">
              {methodSteps.map((step) => (
                <div key={step.step} className="rounded-[1.5rem] bg-muted p-5">
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">{step.step}</p>
                  <h2 className="mt-3 font-[var(--font-display)] text-2xl font-black tracking-tight text-foreground">{step.title}</h2>
                  <p className="mt-3 text-sm leading-7 text-muted-foreground">{step.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="grid gap-8 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="rounded-[2rem] bg-white p-8 shadow-panel">
            <p className="editorial-kicker">Guardrails</p>
            <h2 className="mt-4 font-[var(--font-display)] text-3xl font-black tracking-tight text-foreground">
              What the product refuses to become.
            </h2>
            <div className="mt-6 space-y-3">
              {antiPatterns.map((item) => (
                <div key={item} className="rounded-[1.5rem] bg-muted px-5 py-4 text-sm leading-7 text-muted-foreground">
                  {item}
                </div>
              ))}
            </div>
          </div>

          <NewsletterSignup
            categoryOptions={categories.slice(0, 6)}
            source="start-page-system-signup"
            initialIntent={leadCategory ? 'category-brief' : 'deals'}
            initialCategorySlug={leadCategory}
            initialCadence="weekly"
            afterSignupRoutes={[
              {
                eyebrow: 'Browse',
                title: leadCategory ? `Open ${leadCategoryLabel}` : 'Open the directory',
                description: 'Return to the category page after saving the alert, so the next useful step is still in front of you.',
                href: leadCategory ? `/categories/${leadCategory}` : '/directory',
                label: leadCategory ? 'Open category hub' : 'Browse the directory'
              },
              {
                eyebrow: 'Brand',
                title: leadBrand ? `See ${leadBrand.name}` : 'Browse brands',
                description: 'If one manufacturer already looks promising, jump back into that brand instead of reopening the whole market.',
                href: leadBrand ? `/brands/${leadBrand.slug}` : '/brands',
                label: leadBrand ? `Open ${leadBrand.name}` : 'Browse brands'
              }
            ]}
          />
        </section>

        <SeoFaqSection
          title="Start-here questions buyers actually ask."
          entries={faqEntries}
          description="This page explains the simple way to use Bes3 based on where you are in the shopping process."
        />

        {leadGuide ? (
          <section className="rounded-[2rem] bg-white p-8 shadow-panel">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="editorial-kicker">Need More Context?</p>
                <h2 className="mt-3 font-[var(--font-display)] text-3xl font-black tracking-tight text-foreground">
                  Open a guide before you narrow harder.
                </h2>
                <p className="mt-3 max-w-3xl text-sm leading-7 text-muted-foreground">
                  If the category still feels fuzzy, start with a guide. It will explain what matters before you narrow the list too early.
                </p>
              </div>
              <Link
                href={getArticlePath(leadGuide.type, leadGuide.slug)}
                className="inline-flex min-h-[44px] items-center justify-center rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground"
              >
                Open the lead guide
              </Link>
            </div>
          </section>
        ) : null}
      </div>
    </PublicShell>
  )
}
