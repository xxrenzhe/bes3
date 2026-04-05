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
    title: 'Start Here: Bes3 Decision System',
    description:
      'Use Bes3 as a structured buyer decision system: search a real need, validate one pick, compare finalists, or wait without losing the lane.',
    path: '/start',
    image: articles[0]?.heroImageUrl || products[0]?.heroImageUrl,
    freshnessDate,
    freshnessInTitle: true,
    keywords: ['buyer decision system', 'product shortlist', 'comparison workflow', 'tech buying method']
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
      eyebrow: 'State 01',
      title: 'I know the need, not the product',
      description: 'Start with structured search when the use case is clear but the shortlist does not exist yet.',
      href: '/search?scope=products',
      label: 'Search product lanes'
    },
    {
      eyebrow: 'State 02',
      title: 'One product already looks plausible',
      description: 'Use a review or deep-dive when one candidate already has your attention and you need fit, risks, and reasons to skip.',
      href: leadReview ? getArticlePath(leadReview.type, leadReview.slug) : '/search?scope=review',
      label: leadReview ? 'Open the lead verdict' : 'Browse review coverage'
    },
    {
      eyebrow: 'State 03',
      title: 'I already have finalists',
      description: 'Move into shortlist and comparisons only after the lane is narrow enough that the tradeoffs stay honest.',
      href: leadComparison ? getArticlePath(leadComparison.type, leadComparison.slug) : '/shortlist',
      label: leadComparison ? 'Open a live comparison' : 'Open shortlist'
    },
    {
      eyebrow: 'State 04',
      title: 'I am not buying today',
      description: 'Switch the same lane into alerts when timing is the blocker, so you do not restart the entire research process later.',
      href: leadCategory ? `/newsletter?intent=category-brief&category=${encodeURIComponent(leadCategory)}&cadence=weekly` : '/newsletter',
      label: leadCategory ? `Track ${leadCategoryLabel}` : 'Start alerts'
    }
  ]
  const positioningPillars = [
    {
      title: 'System over archive',
      description: 'Bes3 is designed to route decisions forward, not trap buyers inside endless “best of” grids and page depth theater.'
    },
    {
      title: 'Top 3 over Top 30',
      description: 'The goal is to narrow a market into a few serious candidates worth real attention, not inflate coverage with filler picks.'
    },
    {
      title: 'Signals over noise',
      description: 'Price, freshness, buyer proof, and tradeoff clarity matter more than generic listicles or raw review count in isolation.'
    },
    {
      title: 'Wait without reset',
      description: 'If now is not the moment to buy, Bes3 turns the same lane into a watch flow instead of sending you back to zero.'
    }
  ]
  const methodSteps = [
    {
      step: '01',
      title: 'Name the lane',
      description: 'Start with a category, brand, or use case that matches the real job to be done.'
    },
    {
      step: '02',
      title: 'Compress the field',
      description: 'Use Bes3 to reduce the market into a shortlist of credible options instead of browsing everything equally.'
    },
    {
      step: '03',
      title: 'Force the tradeoffs',
      description: 'Validate one product or compare finalists only after the lane is narrow enough for an honest decision.'
    },
    {
      step: '04',
      title: 'Preserve the context',
      description: 'If price timing matters more than immediate action, save or track the same lane so the decision survives time.'
    }
  ]
  const systemStats = [
    {
      label: 'Live categories',
      value: String(categories.length),
      description: 'Decision lanes buyers can enter right now.'
    },
    {
      label: 'Brand hubs',
      value: String(brands.length),
      description: 'Manufacturer-first routes for high-intent queries.'
    },
    {
      label: 'Published pages',
      value: String(articles.length),
      description: 'Reviews, comparisons, and guides already wired into the flow.'
    },
    {
      label: 'Product signals',
      value: String(products.length),
      description: 'Concrete product deep-dives with price and shortlist actions.'
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
      answer: 'Bes3 is trying to be a structured buyer decision system. It helps people move from need, to shortlist, to verdict, to comparison, to wait flow without losing context.'
    },
    {
      question: 'Why does Bes3 prefer a few strong picks instead of giant lists?',
      answer: 'Because giant lists create reading volume, not decision clarity. Bes3 is optimized to narrow the field into a few options that deserve real evaluation.'
    },
    {
      question: 'When should I go to shortlist instead of staying in search?',
      answer: 'Go to shortlist after you have at least two credible candidates or one strong candidate you know you want to preserve across visits.'
    },
    {
      question: 'Why does Bes3 include alerts as part of the product?',
      answer: 'Because many real buying decisions are blocked by timing, not by fit. Alerts keep the same category or price lane alive so the research does not collapse when you wait.'
    }
  ]
  const structuredData = [
    buildBreadcrumbSchema('/start', breadcrumbItems),
    buildCollectionPageSchema({
      path: '/start',
      title: 'Start Here: Bes3 Decision System',
      description: 'Use Bes3 as a structured buyer decision system: search a real need, validate one pick, compare finalists, or wait without losing the lane.',
      breadcrumbItems,
      dateModified: latestRefresh,
      items: stateRoutes.map((route) => ({
        name: route.title,
        path: route.href
      }))
    }),
    buildHowToSchema(
      '/start',
      'How to use Bes3 as a decision system',
      'Use Bes3 by matching your current buying state to the right route, then keep the same lane alive until the purchase is clear.',
      [
        {
          name: 'Start from your real buying state',
          text: 'Choose search, review, comparison, or alerts based on what is still unresolved instead of jumping into random archives.'
        },
        {
          name: 'Keep the lane narrow',
          text: 'Compare only same-lane finalists and treat shortlist as a place to hold serious candidates, not every product you notice.'
        },
        {
          name: 'Use alerts when timing changes',
          text: 'If you are not buying now, preserve the same category or price context so the decision can resume later without restarting.'
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
                Use Bes3 like a buyer decision system.
              </h1>
              <p className="mt-4 max-w-3xl text-lg leading-8 text-slate-200">
                Bes3 is not a generic review archive. It is built to route a real purchase forward: find the lane, compress the shortlist, explain the tradeoffs, and preserve the context if timing changes.
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
              description="Bes3 works when the route fits the moment. The product is not one page. It is a structured set of next moves."
            />
            <p className="max-w-2xl text-sm leading-7 text-muted-foreground">
              Search if the need is still abstract. Review if one product is close. Compare if finalists already exist. Alert if timing is the only blocker left.
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
              description="The product is built around structured buyer progress, not around maximizing page depth."
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
              title="The decision method in four moves."
              description="This is the operating model underneath the public pages, shortlist, and alerts."
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
                description: 'Return to the live lane after saving the alert, so the next decision step is still visible.',
                href: leadCategory ? `/categories/${leadCategory}` : '/directory',
                label: leadCategory ? 'Open category hub' : 'Browse the directory'
              },
              {
                eyebrow: 'Brand',
                title: leadBrand ? `See ${leadBrand.name}` : 'Browse brands',
                description: 'If one manufacturer already feels credible, reopen the brand-first route instead of the whole market.',
                href: leadBrand ? `/brands/${leadBrand.slug}` : '/brands',
                label: leadBrand ? `Open ${leadBrand.name}` : 'Browse brands'
              }
            ]}
          />
        </section>

        <SeoFaqSection
          title="Start-here questions buyers actually ask."
          entries={faqEntries}
          description="This page makes the product model explicit: Bes3 is a structured decision system with different routes for different buying states."
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
                  If the category still feels fuzzy, start with a guide. Bes3 guides exist to clarify the decision lens before you force a shortlist too early.
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
