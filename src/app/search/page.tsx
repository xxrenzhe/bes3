import type { Metadata } from 'next'
import Link from 'next/link'
import { PublicShell } from '@/components/layout/PublicShell'
import { IntentRecommendationPanel } from '@/components/site/IntentRecommendationPanel'
import { IntentSearchPanel } from '@/components/site/IntentSearchPanel'
import { StructuredData } from '@/components/site/StructuredData'
import {
  buildIntentRefinementPrompts,
  parseIntentInputFromSearchParams,
  resolveIntentSearch
} from '@/lib/commerce-intent'
import { buildPageMetadata } from '@/lib/metadata'
import { getRequestLocale } from '@/lib/request-locale'
import { listCategories } from '@/lib/site-data'
import { buildCollectionPageSchema } from '@/lib/structured-data'

export const dynamic = 'force-dynamic'
export const revalidate = 0

type SearchPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadata({
    title: 'Buying Decision Search',
    description: 'Bes3 turns a shopping need, budget, must-haves, and deal-breakers into a short buying decision.',
    path: '/search',
    locale: await getRequestLocale(),
    keywords: ['buying decision search', 'product shortlist', 'product recommendation']
  })
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const resolvedParams = await searchParams
  const categoryOptions = await listCategories()
  const input = parseIntentInputFromSearchParams({
    q: firstParam(resolvedParams?.q),
    intent: firstParam(resolvedParams?.intent),
    category: firstParam(resolvedParams?.category),
    budget: firstParam(resolvedParams?.budget),
    must: firstParam(resolvedParams?.must),
    avoid: firstParam(resolvedParams?.avoid),
    urgency: firstParam(resolvedParams?.urgency)
  })
  const hasIntent = Boolean(input.query)
  const result = hasIntent ? await resolveIntentSearch(input) : null
  const refinementPrompts = buildIntentRefinementPrompts({
    query: input.query,
    inferredCategory: result?.inferredCategory || input.category,
    budget: result?.normalizedBudget ?? input.budget,
    mustHaves: input.mustHaves,
    avoid: input.avoid,
    urgency: input.urgency
  })
  const fallbackCategory = result?.inferredCategory || input.category || ''
  const fallbackCategoryHref = fallbackCategory ? `/categories/${fallbackCategory}` : '/categories'
  const fallbackCategoryLabel = fallbackCategory ? fallbackCategory.replace(/-/g, ' ') : 'all categories'

  return (
    <PublicShell>
      <StructuredData
        data={buildCollectionPageSchema({
          path: '/search',
          title: 'Buying Decision Search',
          description: 'Intent-first Bes3 product recommendation surface.',
          items: result?.recommendations.map((item) => ({
            name: item.product.productName,
            path: item.product.slug ? `/products/${item.product.slug}` : '/products'
          })) || [
            { name: 'Start a decision', path: '/start' },
            { name: 'Best Picks', path: '/categories' }
          ]
        })}
      />
      <section className="border-b border-border bg-slate-950 px-4 py-12 text-white sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-end">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.28em] text-emerald-300">Buying Decision Search</p>
            <h1 className="mt-4 font-[var(--font-display)] text-5xl font-black tracking-tight sm:text-7xl">
              {hasIntent ? 'Here is the shortest useful next step.' : 'Start with the job, not the keyword.'}
            </h1>
          </div>
          <p className="text-sm leading-7 text-slate-300">
            {hasIntent
              ? 'Bes3 keeps the shortlist intentionally small, explains why the lead fits, and points you to the next action instead of dumping broad search results.'
              : 'Describe what cannot go wrong, what you must have, and whether you want to buy now, compare soon, or wait for a better price.'}
          </p>
        </div>
      </section>

      <section className="bg-slate-50 px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <IntentSearchPanel
            action="/search"
            categoryOptions={categoryOptions}
            defaultIntent={input.query}
            defaultCategory={input.category || result?.inferredCategory || ''}
            defaultBudget={String(input.budget || result?.normalizedBudget || '')}
            defaultMust={input.mustHaves.join(', ')}
            defaultAvoid={input.avoid.join(', ')}
            defaultUrgency={input.urgency}
            compact
          />
        </div>
      </section>

      {result ? (
        result.recommendations.length ? (
          <section className="px-4 py-12 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-7xl">
              <IntentRecommendationPanel result={result} source="search-page-intent" />
            </div>
          </section>
        ) : (
          <section className="px-4 py-12 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-7xl">
              <div className="rounded-[2rem] border border-dashed border-border bg-white p-8">
                <div className="grid gap-8 lg:grid-cols-[0.82fr_1.18fr] lg:items-start">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.22em] text-primary">No strong match yet</p>
                    <h2 className="mt-3 font-[var(--font-display)] text-4xl font-black tracking-tight">Do not trust a weak recommendation.</h2>
                    <p className="mt-4 text-sm leading-7 text-muted-foreground">
                      Bes3 could not find a useful shortlist from this exact request. That is a product feature, not a dead end: the next step is to add the missing constraint or move into the closest evidence-backed category.
                    </p>
                    <div className="mt-6 flex flex-wrap gap-3">
                      <Link href="/start" className="inline-flex min-h-[48px] items-center rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground">
                        Rewrite my request
                      </Link>
                      <Link href={fallbackCategoryHref} className="inline-flex min-h-[48px] items-center rounded-full border border-border px-5 text-sm font-semibold hover:border-primary hover:text-primary">
                        Browse {fallbackCategoryLabel}
                      </Link>
                    </div>
                  </div>
                  <div className="grid gap-4 md:grid-cols-3">
                    {refinementPrompts.map((prompt) => (
                      <div key={prompt.id} className="rounded-md border border-border bg-slate-50 p-5">
                        <p className="text-xs font-bold uppercase tracking-[0.22em] text-primary">{prompt.label}</p>
                        <h3 className="mt-3 font-[var(--font-display)] text-xl font-black tracking-tight">{prompt.title}</h3>
                        <p className="mt-3 text-sm leading-7 text-muted-foreground">{prompt.description}</p>
                        <p className="mt-4 rounded-md bg-white p-3 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">{prompt.example}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </section>
        )
      ) : (
        <section className="px-4 py-12 sm:px-6 lg:px-8">
          <div className="mx-auto grid max-w-7xl gap-5 md:grid-cols-3">
            {refinementPrompts.map((prompt) => (
              <div key={prompt.id} className="rounded-md border border-border bg-white p-6">
                <p className="text-xs font-bold uppercase tracking-[0.22em] text-primary">{prompt.label}</p>
                <h2 className="mt-3 font-[var(--font-display)] text-2xl font-black tracking-tight">{prompt.title}</h2>
                <p className="mt-3 text-sm leading-7 text-muted-foreground">{prompt.description}</p>
                <p className="mt-4 rounded-md bg-slate-50 p-3 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">{prompt.example}</p>
              </div>
            ))}
          </div>
        </section>
      )}
    </PublicShell>
  )
}
