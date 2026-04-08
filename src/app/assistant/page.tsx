import type { Metadata } from 'next'
import Link from 'next/link'
import { PublicShell } from '@/components/layout/PublicShell'
import { AssistantSessionTracker } from '@/components/site/AssistantSessionTracker'
import { DecisionSummaryPanel } from '@/components/site/DecisionSummaryPanel'
import { EntryModeCoach } from '@/components/site/EntryModeCoach'
import { IntentRefinementPanel } from '@/components/site/IntentRefinementPanel'
import { IntentRecommendationPanel } from '@/components/site/IntentRecommendationPanel'
import { IntentSearchPanel } from '@/components/site/IntentSearchPanel'
import { ShoppingTaskMemoryBeacon } from '@/components/site/ShoppingTaskMemoryBeacon'
import { SeoFaqSection } from '@/components/site/SeoFaqSection'
import { StructuredData } from '@/components/site/StructuredData'
import { queryLooksExactSearchLed } from '@/lib/entry-routing'
import { buildPageMetadata } from '@/lib/metadata'
import { getRequestLocale } from '@/lib/request-locale'
import { buildFaqSchema, buildWebPageSchema } from '@/lib/structured-data'
import { buildIntentRefinementPrompts, parseIntentInputFromSearchParams, resolveIntentSearch } from '@/lib/commerce-intent'
import { listCategories } from '@/lib/site-data'

export async function generateMetadata({
  searchParams
}: {
  searchParams: Promise<{ q?: string; intent?: string; category?: string; budget?: string; must?: string; avoid?: string; urgency?: string }>
}): Promise<Metadata> {
  const params = await searchParams
  const intentInput = parseIntentInputFromSearchParams(params)

  return buildPageMetadata({
    title: intentInput.query ? `Assistant: ${intentInput.query}` : 'Assistant',
    description: intentInput.query
      ? 'Use the Bes3 assistant to turn a shopping need into a shortlist, next move, and fallback path.'
      : 'Tell Bes3 what you need and get a tighter shortlist, clearer proof, and a better next move.',
    path: '/assistant',
    locale: getRequestLocale(),
    robots: {
      index: false,
      follow: true
    }
  })
}

const FAQ_ENTRIES = [
  {
    question: 'What does the Bes3 assistant actually do?',
    answer: 'It turns a shopping need into a shortlist, explains why each product made the cut, and tells you the next useful move instead of forcing more generic browsing.'
  },
  {
    question: 'When should I use the assistant instead of normal search?',
    answer: 'Use the assistant when the problem is still fuzzy: you know the use case, budget, or must-haves, but not the exact product name yet.'
  },
  {
    question: 'Does the assistant replace reviews and comparisons?',
    answer: 'No. It routes you into the right next page. Reviews, comparisons, shortlist, and alerts still carry the detailed evidence and follow-through actions.'
  },
  {
    question: 'What if timing matters more than buying today?',
    answer: 'The assistant can switch from buy-now logic into compare or price-watch logic, so you can save the shortlist or move into alerts without starting over.'
  }
]

export default async function AssistantPage({
  searchParams
}: {
  searchParams: Promise<{ q?: string; intent?: string; category?: string; budget?: string; must?: string; avoid?: string; urgency?: string }>
}) {
  const params = await searchParams
  const input = parseIntentInputFromSearchParams(params)
  const categories = await listCategories()
  const result = input.query ? await resolveIntentSearch(input) : null
  const refinementPrompts = buildIntentRefinementPrompts({
    query: input.query,
    inferredCategory: result?.inferredCategory || input.category,
    budget: result?.normalizedBudget ?? input.budget,
    mustHaves: input.mustHaves,
    avoid: input.avoid,
    urgency: input.query ? result?.urgency || input.urgency : null
  })
  const shouldRouteAssistantToSearch = queryLooksExactSearchLed(input.query)
  const searchSwitchHref = `/search?q=${encodeURIComponent(input.query)}&scope=products${input.category ? `&category=${encodeURIComponent(input.category)}` : ''}`
  const assistantTaskParams = new URLSearchParams()
  if (input.query) assistantTaskParams.set('intent', input.query)
  if (input.category) assistantTaskParams.set('category', input.category)
  if (input.budget != null) assistantTaskParams.set('budget', String(input.budget))
  if (input.mustHaves.length) assistantTaskParams.set('must', input.mustHaves.join(', '))
  if (input.avoid.length) assistantTaskParams.set('avoid', input.avoid.join(', '))
  if (input.urgency) assistantTaskParams.set('urgency', input.urgency)
  const assistantTaskHref = `/assistant${assistantTaskParams.size ? `?${assistantTaskParams.toString()}` : ''}`

  const processSteps = [
    {
      title: 'Translate the need',
      description: 'Bes3 reads the use case, budget, urgency, and hard constraints first instead of relying on a loose keyword search.'
    },
    {
      title: 'Build a tight shortlist',
      description: 'Products get scored on category fit, evidence quality, price timing, and how well they match the current must-haves.'
    },
    {
      title: 'Push the next action',
      description: 'The assistant tells you whether to open a product, compare finalists, or switch into a wait-for-price flow.'
    }
  ]

  const proofRules = [
    'The assistant optimizes for fit first, then timing, then the shortest honest next move.',
    'A shortlist only stays useful when proof gaps are visible instead of hidden behind generic copy.',
    'If price is the blocker, the right answer is often an alert or saved shortlist, not another random product page.'
  ]

  const structuredData = [
    buildWebPageSchema({
      path: '/assistant',
      title: 'Bes3 Assistant',
      description: 'Need-based shopping assistant for building a shortlist, comparing finalists, and moving into price alerts with less noise.',
      type: 'CollectionPage'
    }),
    buildFaqSchema('/assistant', FAQ_ENTRIES)
  ]

  return (
    <PublicShell>
      <StructuredData data={structuredData} />
      <ShoppingTaskMemoryBeacon
        href={assistantTaskHref}
        label={input.query ? `Resume assistant: ${input.query}` : 'Resume assistant'}
        description={
          input.query
            ? 'Return to the same assistant request with your current need, constraints, and shortlist direction intact.'
            : 'Return to the assistant instead of restarting from broad browsing.'
        }
        source="assistant"
      />
      {result ? (
        <AssistantSessionTracker
          query={result.normalizedQuery}
          category={result.inferredCategory}
          budget={result.normalizedBudget}
          mustCount={result.mustHaves.length}
          avoidCount={result.avoid.length}
          urgency={result.urgency}
          recommendationIds={result.recommendations.map((item) => item.product.id)}
        />
      ) : null}
      <div className="mx-auto max-w-7xl space-y-12 px-4 py-14 sm:px-6 lg:px-8">
        <section className="rounded-[2.5rem] bg-[linear-gradient(135deg,#0f172a_0%,#111827_35%,#14532d_100%)] p-8 text-white shadow-[0_35px_80px_-45px_rgba(15,23,42,0.8)] sm:p-10">
          <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-start">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-emerald-200">Buyer Copilot</p>
              <h1 className="mt-4 font-[var(--font-display)] text-5xl font-black tracking-tight sm:text-6xl">
                Describe the situation, and Bes3 will narrow the shortlist.
              </h1>
              <p className="mt-4 max-w-3xl text-lg leading-8 text-slate-200">
                Use this when the use case is clear but the exact model is not. Share the budget, must-haves, and deal-breakers, then let Bes3 cut the field down to a few options worth real attention.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link href="#assistant-form" className="inline-flex min-h-[48px] items-center justify-center rounded-full bg-white px-6 text-sm font-semibold text-slate-950">
                  Start the assistant
                </Link>
                <Link href="/search" className="inline-flex min-h-[48px] items-center justify-center rounded-full border border-white/20 px-6 text-sm font-semibold text-white transition-colors hover:bg-white/10">
                  Use classic search
                </Link>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              {processSteps.map((step) => (
                <div key={step.title} className="rounded-[1.75rem] border border-white/12 bg-white/10 p-5 backdrop-blur-sm">
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-200">{step.title}</p>
                  <p className="mt-3 text-sm leading-7 text-slate-200">{step.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <div id="assistant-form">
          <IntentSearchPanel
            action="/assistant"
            categoryOptions={categories}
            defaultIntent={input.query}
            defaultCategory={input.category || ''}
            defaultBudget={input.budget != null ? String(input.budget) : ''}
            defaultMust={input.mustHaves.join(', ')}
            defaultAvoid={input.avoid.join(', ')}
            defaultUrgency={input.urgency}
            className="border border-emerald-100 bg-[linear-gradient(135deg,#fff8ef_0%,#f8fbff_48%,#eefaf5_100%)]"
          />
        </div>

        {shouldRouteAssistantToSearch ? (
          <EntryModeCoach
            eyebrow="Faster Path"
            title="This request looks like an exact product lookup."
            description="You already typed something that looks like a product or model phrase. Keyword search is usually faster when the main job is landing on the product, review, or comparison page."
            coachCall="Bes3 reads this request as search-led. The next gain comes from landing on the right page faster, not from asking the assistant to rediscover a model you already know."
            primaryHref={searchSwitchHref}
            primaryLabel="Search this instead"
            primaryDescription="Switch when you already have the product phrase and want the shortest path to the product page, a review, or a comparison."
            secondaryHref={input.query ? `/assistant?intent=${encodeURIComponent(input.query)}${input.category ? `&category=${encodeURIComponent(input.category)}` : ''}` : '/assistant'}
            secondaryLabel="Keep using assistant"
            secondaryDescription="Stay only if the model name is just shorthand and you still need Bes3 to interpret constraints, compare alternatives, or turn the request into a shortlist."
            signals={[
              'Exact product phrases usually belong in search first.',
              'Assistant is stronger when the real problem is fit, tradeoffs, or missing shortlist candidates.',
              'If you already know the likely product name, rediscovery adds friction more often than clarity.'
            ]}
          />
        ) : null}

        {input.query ? (
          <IntentRefinementPanel
            eyebrow="Progressive Follow-Up"
            title={result?.recommendations.length ? 'One more answer can make this shortlist sharper.' : 'Bes3 still needs a few tighter signals.'}
            description={
              result?.recommendations.length
                ? 'You should not have to fill every field up front. Add the next most useful details only if you want a tighter shortlist or cleaner next step.'
                : 'The first pass is enough to start. These are simply the next questions most likely to improve the shortlist instead of making you start over.'
            }
            prompts={refinementPrompts}
            href="#assistant-form"
          />
        ) : null}

        <DecisionSummaryPanel
          eyebrow="Decision Summary"
          title="The assistant is for messy decisions, not exact model lookups."
          description="A strong assistant entry should answer four things fast: who belongs here, who should switch routes, why this page matters now, and what the first useful outcome should be."
          items={[
            {
              eyebrow: 'Who should use this',
              title: 'Buyers who know the situation, not the model',
              description: 'Use assistant when you can explain the use case, budget, and deal-breakers, but do not yet have the exact SKU you trust.'
            },
            {
              eyebrow: 'Who should leave',
              title: 'Shoppers who already know the exact product phrase',
              description: 'When you already have a specific model or exact keyword, search is faster than asking the assistant to rediscover it.',
              tone: 'muted'
            },
            {
              eyebrow: 'Why now',
              title: 'This page is the ambiguity-reduction checkpoint',
              description: 'Use it when the real job is turning a shopping problem into a shortlist before you validate, compare, or wait.'
            },
            {
              eyebrow: 'Next step',
              title: 'Get to 2 to 3 serious options',
              description: 'The assistant should weigh fit, proof, timing, and constraints first, then route you into the clearest next page instead of widening the search.',
              tone: 'strong'
            }
          ]}
        />

        {result && result.recommendations.length > 0 ? (
          <IntentRecommendationPanel result={result} source="assistant-page" />
        ) : result ? (
          <div className="space-y-8">
            <DecisionSummaryPanel
              eyebrow="Decision Summary"
              title="This request needs one cleaner signal before Bes3 can trust the shortlist."
              description="A weak assistant result should still tell you what happened, who should stay in assistant, who should switch routes, and what the smartest recovery move is."
              items={[
                {
                  eyebrow: 'What happened',
                  title: 'No strong shortlist yet',
                  description: `Bes3 could not find enough confident matches for "${result.normalizedQuery}" with the current category, blockers, or must-haves.`
                },
                {
                  eyebrow: 'Stay here if',
                  title: 'The shopping problem is still right',
                  description: 'Stay in assistant when the use case is still correct and the main issue is that one or two constraints are too tight, too vague, or pointing at the wrong category.',
                  tone: 'muted'
                },
                {
                  eyebrow: 'Switch if',
                  title: 'You already know the product phrase or category better now',
                  description: 'Move to search or category pages if the failed attempt already taught you the right product family, exact keyword, or broader category to use.',
                },
                {
                  eyebrow: 'Next step',
                  title: 'Tighten, then route on purpose',
                  description: 'Add one clearer category, one must-have, or relax one blocker first. If that still feels wrong, switch to search or browse categories instead of repeating the same vague request.',
                  tone: 'strong'
                }
              ]}
            />

            <section className="rounded-[2rem] bg-white p-8 shadow-panel">
              <p className="editorial-kicker">Recovery Routes</p>
              <h2 className="mt-3 font-[var(--font-display)] text-3xl font-black tracking-tight text-foreground">
                Recover the task instead of abandoning it.
              </h2>
              <p className="mt-4 max-w-3xl text-sm leading-7 text-muted-foreground">
                When assistant cannot build a strong shortlist yet, the next move should still be concrete: tighten the request, switch to a keyword path, or reopen the market at the category level.
              </p>
              <div className="mt-6 grid gap-4 md:grid-cols-3">
                <Link href="#assistant-form" className="rounded-[1.5rem] bg-[linear-gradient(135deg,#fff8ef_0%,#f8fbff_48%,#eefaf5_100%)] p-5 transition-transform hover:-translate-y-0.5">
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">Tighten</p>
                  <p className="mt-3 text-xl font-black tracking-tight text-foreground">Refine this request</p>
                  <p className="mt-3 text-sm leading-7 text-muted-foreground">Add one sharper category, must-have, or blocker so Bes3 can rank real candidates with more confidence.</p>
                  <p className="mt-4 text-sm font-semibold text-primary">Go back to the form →</p>
                </Link>
                <Link href="/search?scope=products" className="rounded-[1.5rem] bg-white p-5 shadow-[0_24px_60px_-40px_rgba(15,23,42,0.35)] transition-transform hover:-translate-y-0.5">
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">Switch</p>
                  <p className="mt-3 text-xl font-black tracking-tight text-foreground">Use keyword search</p>
                  <p className="mt-3 text-sm leading-7 text-muted-foreground">Switch if you already know the product family or exact phrase better than when you started.</p>
                  <p className="mt-4 text-sm font-semibold text-primary">Open search →</p>
                </Link>
                <Link href="/directory" className="rounded-[1.5rem] bg-white p-5 shadow-[0_24px_60px_-40px_rgba(15,23,42,0.35)] transition-transform hover:-translate-y-0.5">
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">Reopen market</p>
                  <p className="mt-3 text-xl font-black tracking-tight text-foreground">Browse categories</p>
                  <p className="mt-3 text-sm leading-7 text-muted-foreground">Use category pages when the failed request means the market itself still needs to be narrowed first.</p>
                  <p className="mt-4 text-sm font-semibold text-primary">Open directory →</p>
                </Link>
              </div>
            </section>
          </div>
        ) : (
          <section className="rounded-[2rem] bg-white p-8 shadow-panel">
            <p className="editorial-kicker">How to use it</p>
            <h2 className="mt-3 font-[var(--font-display)] text-3xl font-black tracking-tight text-foreground">
              Start with the shopping situation, not the final SKU.
            </h2>
            <div className="mt-6 grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
              <div className="rounded-[1.5rem] bg-[linear-gradient(135deg,#fff8ef_0%,#f8fbff_48%,#eefaf5_100%)] p-6">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">Prompt pattern</p>
                <div className="mt-4 space-y-3 text-sm leading-7 text-muted-foreground">
                  <p>"I need a quiet 4K monitor under $500 for long work sessions, and I want to avoid weak ports."</p>
                  <p>"I want a rugged Android tablet for field work, and I can wait if the current price is not good enough."</p>
                  <p>"I need two finalists for a clean compare, not a giant list."</p>
                </div>
              </div>
              <div className="rounded-[1.5rem] border border-border/40 p-6">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">Decision rules</p>
                <div className="mt-4 space-y-3">
                  {proofRules.map((rule) => (
                    <p key={rule} className="text-sm leading-7 text-muted-foreground">
                      {rule}
                    </p>
                  ))}
                </div>
              </div>
            </div>
          </section>
        )}

        <SeoFaqSection
          eyebrow="Assistant FAQ"
          title="What the assistant is for"
          description="This entry point is meant to reduce ambiguity before you open the product, shortlist, comparison, or price-watch flow."
          entries={FAQ_ENTRIES}
        />
      </div>
    </PublicShell>
  )
}
