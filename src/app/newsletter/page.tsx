import { PublicShell } from '@/components/layout/PublicShell'
import { NewsletterSignup } from '@/components/site/NewsletterSignup'
import { listCategories } from '@/lib/site-data'

const VALID_INTENTS = new Set(['deals', 'price-alert', 'category-brief'] as const)
const VALID_CADENCE = new Set(['weekly', 'priority'] as const)

export default async function NewsletterPage({
  searchParams
}: {
  searchParams: Promise<{ intent?: string; category?: string; cadence?: string }>
}) {
  const categories = await listCategories()
  const resolvedParams = await searchParams
  const selectedIntent = VALID_INTENTS.has((resolvedParams.intent || '') as 'deals')
    ? (resolvedParams.intent as 'deals' | 'price-alert' | 'category-brief')
    : 'deals'
  const selectedCadence = VALID_CADENCE.has((resolvedParams.cadence || '') as 'weekly')
    ? (resolvedParams.cadence as 'weekly' | 'priority')
    : 'weekly'
  const selectedCategory = categories.includes(resolvedParams.category || '') ? String(resolvedParams.category) : ''

  return (
    <PublicShell>
      <div className="mx-auto grid max-w-7xl gap-14 px-4 py-16 sm:px-6 lg:grid-cols-[0.95fr_1.05fr] lg:px-8">
        <div className="space-y-8">
          <p className="editorial-kicker">The Newsletter</p>
          <h1 className="font-[var(--font-display)] text-5xl font-black tracking-tight text-foreground sm:text-7xl">
            Get alerts shaped like a buying tool, not a generic newsletter.
          </h1>
          <p className="max-w-2xl text-lg leading-8 text-muted-foreground">
            Bes3 updates are preference-aware: deal alerts, category briefs, and watchlist signals that match what you are actually considering buying{selectedCategory ? ` in ${selectedCategory.replace(/-/g, ' ')}` : ''}.
          </p>
          <div className="rounded-[1.5rem] bg-white p-6 shadow-panel">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">Prefill-friendly flow</p>
            <p className="mt-3 text-sm leading-7 text-muted-foreground">
              Category and product pages can send buyers here with a preselected watch intent, so waiting on a better price or category shift becomes part of the decision flow instead of a dead end.
            </p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="rounded-[1.5rem] bg-white p-6 shadow-panel">
              <h2 className="font-[var(--font-display)] text-2xl font-black tracking-tight">Actionable Signals</h2>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">Practical notes on what changed in a category, when a price matters, and whether it is time to click through.</p>
            </div>
            <div className="rounded-[1.5rem] bg-white p-6 shadow-panel">
              <h2 className="font-[var(--font-display)] text-2xl font-black tracking-tight">Preference Capture</h2>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">Tell Bes3 whether you want deals, price watch, or category briefs so future CRM flows stay relevant.</p>
            </div>
          </div>
        </div>
        <NewsletterSignup
          categoryOptions={categories}
          source="newsletter-page"
          initialIntent={selectedIntent}
          initialCadence={selectedCadence}
          initialCategorySlug={selectedCategory}
        />
      </div>
    </PublicShell>
  )
}
