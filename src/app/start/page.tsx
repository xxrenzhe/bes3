import type { Metadata } from 'next'
import Link from 'next/link'
import { buildCategoryPath } from '@/lib/category'
import { PublicShell } from '@/components/layout/PublicShell'
import { IntentSearchPanel } from '@/components/site/IntentSearchPanel'
import { NewsletterSignup } from '@/components/site/NewsletterSignup'
import { PersonaPathwaySection } from '@/components/site/PersonaPathwaySection'
import { ResumeShoppingTaskPanel } from '@/components/site/ResumeShoppingTaskPanel'
import { ShoppingStateRouter } from '@/components/site/ShoppingStateRouter'
import { SectionHeader } from '@/components/site/SectionHeader'
import { SeoFaqSection } from '@/components/site/SeoFaqSection'
import { StructuredData } from '@/components/site/StructuredData'
import { getArticlePath } from '@/lib/article-path'
import { getCategoryLabel } from '@/lib/editorial'
import { buildPageMetadata } from '@/lib/metadata'
import { buildNewsletterPath } from '@/lib/newsletter-path'
import { getRequestLocale } from '@/lib/request-locale'
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
      'Use Bes3 to search by need, validate one product, compare finalists, or start a price watch without losing your place.',
    path: '/start',
    locale: getRequestLocale(),
    image: articles[0]?.heroImageUrl || products[0]?.heroImageUrl,
    freshnessDate,
    freshnessInTitle: true,
    keywords: ['product shortlist', 'product comparisons', 'price watch', 'tech buying guide']
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
  const leadReviewHref = leadReview ? getArticlePath(leadReview.type, leadReview.slug) : '/search?scope=review'
  const leadComparisonHref = leadComparison ? getArticlePath(leadComparison.type, leadComparison.slug) : '/shortlist'
  const leadGuideHref = leadGuide ? getArticlePath(leadGuide.type, leadGuide.slug) : '/directory'
  const leadAlertHref = buildNewsletterPath({
    intent: leadCategory ? 'category-brief' : 'offers',
    category: leadCategory || '',
    cadence: 'weekly',
    returnTo: '/start',
    returnLabel: 'Resume start page',
    returnDescription: 'Come back to the same state-router page instead of restarting from broad browsing.'
  })
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
      bestIf: 'You can describe the use case, budget, or deal-breakers, but not the final product name yet.',
      notIf: 'You already have finalists and only need the last compare.',
      href: '/assistant',
      label: 'Open assistant'
    },
    {
      eyebrow: 'Step 02',
      title: 'One product already looks good',
      description: 'Use a review when one option already has your attention and you want the real pros, cons, and reasons to skip it.',
      bestIf: 'You want to confirm one promising product before spending time on side-by-side compare.',
      notIf: 'You are still too early and need Bes3 to narrow the category first.',
      href: leadReviewHref,
      label: leadReview ? 'Open the full review' : 'Browse reviews'
    },
    {
      eyebrow: 'Step 03',
      title: 'I already have a few options',
      description: 'Move into shortlist and comparisons once you have a small set of products worth checking side by side.',
      bestIf: 'You already have two or three serious candidates and want the clearest tradeoffs.',
      notIf: 'You still need broad discovery instead of decision pressure.',
      href: leadComparisonHref,
      label: leadComparison ? 'Open a comparison' : 'Open shortlist'
    },
    {
      eyebrow: 'Step 04',
      title: 'I want to wait for a better price',
      description: 'Start a price watch when timing is the only thing holding you back, so you can come back later without restarting the task.',
      bestIf: 'Product fit is mostly settled and timing is the last blocker left.',
      notIf: 'You still need help deciding what belongs on the shortlist.',
      href: leadAlertHref,
      label: leadCategory ? `Track ${leadCategoryLabel}` : 'Start price watch'
    }
  ]
  const selfCheckQuestions = [
    {
      question: 'Do you already know an exact product or model name?',
      yesLabel: 'Use keyword search',
      yesHref: '/search?scope=products',
      yesDescription: 'Best when the job is landing on the right product, review, or comparison page fast.',
      noLabel: 'Use assistant',
      noHref: '/assistant',
      noDescription: 'Best when you know the situation, budget, or blocker but not the final model.'
    },
    {
      question: 'Do you already have two or three real options?',
      yesLabel: 'Open shortlist or compare',
      yesHref: leadComparisonHref,
      yesDescription: 'Best when discovery is mostly done and the next job is choosing between finalists.',
      noLabel: 'Read a review first',
      noHref: leadReviewHref,
      noDescription: 'Best when one product looks promising but still needs a fit check before compare.'
    },
    {
      question: 'Is price the only thing still blocking the purchase?',
      yesLabel: 'Start price watch',
      yesHref: leadAlertHref,
      yesDescription: 'Best when fit is mostly settled and you just need a better timing signal.',
      noLabel: 'Open a guide',
      noHref: leadGuideHref,
      noDescription: 'Best when you still need category basics before narrowing harder.'
    }
  ]
  const quickTriageOutcomes = [
    {
      title: 'Need direction',
      description: 'You know the problem, but not the product. Start with the assistant and let Bes3 narrow the field.',
      href: '/assistant',
      label: 'Open assistant'
    },
    {
      title: 'Need proof on one option',
      description: 'One product already looks close. Use a review before you widen the list again.',
      href: leadReviewHref,
      label: leadReview ? 'Open lead review' : 'Browse reviews'
    },
    {
      title: 'Need a final choice',
      description: 'You already have contenders. Move into shortlist or compare instead of searching wider.',
      href: leadComparisonHref,
      label: leadComparison ? 'Open comparison' : 'Open shortlist'
    },
    {
      title: 'Need better timing',
      description: 'Price is the only blocker left. Save the task and let a price watch bring you back with context.',
      href: leadAlertHref,
      label: leadCategory ? `Track ${leadCategoryLabel}` : 'Start price watch'
    }
  ]
  const personaPathways = [
    {
      eyebrow: 'Persona A',
      title: 'Need the market narrowed first',
      summary: 'You can describe the use case, budget, or deal-breakers, but you still do not trust yourself to choose the right model names alone.',
      internalQuestion: 'What deserves to be on the shortlist before I spend time reading deeper?',
      firstMove: 'Use the assistant to convert the situation into a few realistic candidates.',
      whyThisMove: 'When the bottleneck is direction, compare pages are too early. The assistant should remove the first layer of ambiguity.',
      href: '/assistant',
      label: 'Start with assistant',
      accentClassName: 'bg-amber-100 text-amber-900'
    },
    {
      eyebrow: 'Persona B',
      title: 'Need the final tradeoff made clear',
      summary: 'You already have finalists. The real job now is confirming which one fits you better, not adding more tabs.',
      internalQuestion: 'Which of these two or three options wins for the way I will actually use it?',
      firstMove: 'Move into shortlist or comparison while the candidate set is still small.',
      whyThisMove: 'Once discovery is mostly done, the highest-value action is clarifying tradeoffs and reasons to skip.',
      href: leadComparisonHref,
      label: leadComparison ? 'Open the comparison path' : 'Open shortlist',
      accentClassName: 'bg-sky-100 text-sky-900'
    },
    {
      eyebrow: 'Persona C',
      title: 'Need a better buying moment',
      summary: 'You mostly know what to buy already. Price or timing is the last blocker, and you do not want to rebuild the task later.',
      internalQuestion: 'If the price changes next week, will I come back with enough context to act quickly?',
      firstMove: 'Start a price watch tied to the same category or offer path you are already considering.',
      whyThisMove: 'Bes3 should treat waiting as part of the journey, not as leaving the journey.',
      href: leadAlertHref,
      label: leadCategory ? `Track ${leadCategoryLabel}` : 'Start price watch',
      accentClassName: 'bg-emerald-100 text-emerald-900'
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
      description: 'Read a review or compare top picks once the list is small enough for a real choice.'
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
      label: 'Brand pages',
      value: String(brands.length),
      description: 'Brands with dedicated pages already live.'
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
    'Letting live offers override category fit too early in the journey.',
    'Forcing buyers to restart from search every time timing changes.'
  ]
  const faqEntries = [
    {
      question: 'What is Bes3 actually trying to be?',
      answer: 'Bes3 is a shopping decision guide. It helps you go from "I need something" to a shortlist, a review, a comparison, or a price watch without losing your place.'
    },
    {
      question: 'Why does Bes3 prefer a few strong picks instead of giant lists?',
      answer: 'Because giant lists create more reading, not better choices. Bes3 tries to narrow the field to a few options that are actually worth your time.'
    },
    {
      question: 'When should I go to shortlist instead of staying in search?',
      answer: 'Go to shortlist after you have at least two good candidates or one strong candidate you know you want to preserve across visits.'
    },
    {
      question: 'Why does Bes3 include a wait flow as part of the product?',
      answer: 'Because timing often blocks a purchase even when the product fit is already clear. Price watches and category updates help you wait for a better moment without starting over.'
    }
  ]
  const structuredData = [
    buildBreadcrumbSchema('/start', breadcrumbItems),
    buildCollectionPageSchema({
      path: '/start',
      title: 'Start Here: Find the right product faster',
      description: 'Use Bes3 to search by need, validate one product, compare finalists, or start a price watch without losing your place.',
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
          text: 'Choose search, review, comparison, or a price watch based on what is still unclear instead of jumping into random pages.'
        },
        {
          name: 'Keep the list short',
          text: 'Compare only products that really belong together, and use shortlist to save serious candidates instead of every product you notice.'
        },
        {
          name: 'Use the wait flow when timing changes',
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
                Choose the next step that matches your current shopping state.
              </h1>
              <p className="mt-4 max-w-3xl text-lg leading-8 text-slate-200">
                This page exists to remove one early decision: where to begin. Pick the state that matches what is still unresolved, then let Bes3 push the next useful move.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link href="#state-router" className="inline-flex min-h-[48px] items-center justify-center rounded-full bg-white px-6 text-sm font-semibold text-slate-950">
                  Choose my state
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

        <IntentSearchPanel
          categoryOptions={categories}
          className="border border-emerald-100 bg-[linear-gradient(135deg,#fff8ef_0%,#f8fbff_48%,#eefaf5_100%)]"
          compact
        />

        <ResumeShoppingTaskPanel />

        <PersonaPathwaySection
          eyebrow="Persona Router"
          title="Choose the buying persona that feels closest to your situation."
          description="This page is no longer just a list of routes. It now spells out the three buyer states Bes3 is designed around so the next click carries a clearer reason."
          personas={personaPathways}
        />

        <div id="state-router">
          <ShoppingStateRouter
            eyebrow="Buying States"
            title="Choose the page that matches what is still unresolved."
            description="Search if the need is still broad. Read a review if one product looks close. Compare if you already have top picks. Use a price watch if timing is the only thing holding you back."
            routes={stateRoutes}
          />
        </div>

        <section className="rounded-[2.5rem] bg-white p-8 shadow-panel sm:p-10">
          <div className="grid gap-8 xl:grid-cols-[1fr_0.92fr] xl:items-start">
            <div>
              <p className="editorial-kicker">30-Second Check</p>
              <h2 className="mt-3 font-[var(--font-display)] text-4xl font-black tracking-tight text-foreground">
                Answer three quick questions before you pick a route.
              </h2>
              <p className="mt-4 max-w-3xl text-sm leading-8 text-muted-foreground">
                The goal here is not to teach the site map. It is to help you avoid one wrong first click when the real blocker is still direction, proof, compare, or timing.
              </p>

              <div className="mt-6 space-y-4">
                {selfCheckQuestions.map((item) => (
                  <div key={item.question} className="rounded-[1.75rem] bg-[linear-gradient(135deg,#fff8ef_0%,#f8fbff_48%,#eefaf5_100%)] p-5">
                    <p className="text-base font-semibold text-foreground">{item.question}</p>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <Link href={item.yesHref} className="rounded-[1.25rem] bg-white p-4 shadow-[0_20px_45px_-35px_rgba(15,23,42,0.35)] transition-transform hover:-translate-y-0.5">
                        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">Yes</p>
                        <p className="mt-2 text-base font-semibold text-foreground">{item.yesLabel}</p>
                        <p className="mt-2 text-sm leading-7 text-muted-foreground">{item.yesDescription}</p>
                      </Link>
                      <Link href={item.noHref} className="rounded-[1.25rem] bg-white p-4 shadow-[0_20px_45px_-35px_rgba(15,23,42,0.35)] transition-transform hover:-translate-y-0.5">
                        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">No</p>
                        <p className="mt-2 text-base font-semibold text-foreground">{item.noLabel}</p>
                        <p className="mt-2 text-sm leading-7 text-muted-foreground">{item.noDescription}</p>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[2rem] bg-[linear-gradient(135deg,#0f172a_0%,#1d4ed8_55%,#0f766e_100%)] p-6 text-white shadow-[0_35px_80px_-45px_rgba(15,23,42,0.8)]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-emerald-200">Quick Outcomes</p>
              <h3 className="mt-3 font-[var(--font-display)] text-3xl font-black tracking-tight">
                Most buyers only need one of these four moves.
              </h3>
              <div className="mt-6 grid gap-3">
                {quickTriageOutcomes.map((outcome) => (
                  <Link
                    key={outcome.title}
                    href={outcome.href}
                    className="rounded-[1.5rem] border border-white/12 bg-white/10 p-5 backdrop-blur-sm transition-transform hover:-translate-y-0.5"
                  >
                    <p className="text-lg font-semibold text-white">{outcome.title}</p>
                    <p className="mt-2 text-sm leading-7 text-slate-200">{outcome.description}</p>
                    <p className="mt-4 text-sm font-semibold text-emerald-200">{outcome.label} →</p>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-8 lg:grid-cols-[1fr_0.95fr]">
          <div className="rounded-[2rem] bg-white p-8 shadow-panel">
            <SectionHeader
              eyebrow="Positioning"
              title="Why Bes3 behaves differently from a typical review site."
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
              description="This is the simple path behind search, reviews, shortlist, and the wait flow."
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
            initialIntent={leadCategory ? 'category-brief' : 'offers'}
            initialCategorySlug={leadCategory}
            initialCadence="weekly"
            afterSignupRoutes={[
              {
                eyebrow: 'Browse',
                title: leadCategory ? `Open ${leadCategoryLabel}` : 'Open the directory',
                description: 'Return to the category page after saving the wait flow, so the next useful step is still in front of you.',
                href: buildCategoryPath(leadCategory),
                label: leadCategory ? 'Open category page' : 'Browse the directory'
              },
              {
                eyebrow: 'Brand',
                title: leadBrand ? `See ${leadBrand.name}` : 'Browse brands',
                description: 'If one brand already looks promising, jump back into that brand instead of reopening the whole market.',
                href: leadBrand ? `/brands/${leadBrand.slug}` : '/brands',
                label: leadBrand ? `Open ${leadBrand.name}` : 'Browse brands'
              },
              {
                eyebrow: 'Resume',
                title: 'Return to this triage page',
                description: 'Keep the same start-page context alive if you are still deciding which route fits best.',
                href: '/start',
                label: 'Resume start page'
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
