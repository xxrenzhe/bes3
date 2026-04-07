import Link from 'next/link'
import type { IntentUrgency } from '@/lib/commerce-intent'

const INTENT_URGENCY_OPTIONS: Array<{ value: IntentUrgency; label: string }> = [
  { value: 'buy-now', label: 'I could buy now' },
  { value: 'compare-soon', label: 'I need one last compare' },
  { value: 'wait-for-price', label: 'I only want a better price' }
]

const INTENT_PRESET_LINKS = [
  {
    label: 'Quiet 4K monitor',
    intent: 'I need a quiet 4K monitor for long work sessions under $500.',
    budget: '500',
    must: '4K, good ports',
    avoid: 'dim panel, noisy fan',
    urgency: 'compare-soon' as IntentUrgency
  },
  {
    label: 'Rugged work tablet',
    intent: 'I need a rugged Android tablet for field work and I can wait for a better price.',
    budget: '',
    must: 'durable build, long battery',
    avoid: 'fragile shell, weak battery',
    urgency: 'wait-for-price' as IntentUrgency
  },
  {
    label: 'Only show 2 to 3 strong picks',
    intent: 'I want a short list of the strongest options, not a giant list.',
    budget: '',
    must: '',
    avoid: 'too many choices',
    urgency: 'buy-now' as IntentUrgency
  }
] as const

function buildPresetHref(action: string, preset: (typeof INTENT_PRESET_LINKS)[number]) {
  const params = new URLSearchParams({
    mode: 'intent',
    intent: preset.intent,
    urgency: preset.urgency
  })

  if (preset.budget) params.set('budget', preset.budget)
  if (preset.must) params.set('must', preset.must)
  if (preset.avoid) params.set('avoid', preset.avoid)

  return `${action}${action.includes('?') ? '&' : '?'}${params.toString()}`
}

export function IntentSearchPanel({
  action = '/search',
  categoryOptions,
  defaultIntent = '',
  defaultCategory = '',
  defaultBudget = '',
  defaultMust = '',
  defaultAvoid = '',
  defaultUrgency = 'buy-now',
  className = '',
  compact = false
}: {
  action?: string
  categoryOptions: string[]
  defaultIntent?: string
  defaultCategory?: string
  defaultBudget?: string
  defaultMust?: string
  defaultAvoid?: string
  defaultUrgency?: IntentUrgency
  className?: string
  compact?: boolean
}) {
  return (
    <form action={action} className={`rounded-[2rem] bg-white p-8 shadow-panel ${className}`.trim()}>
      <input type="hidden" name="mode" value="intent" />
      <p className="editorial-kicker">Describe What You Need</p>
      <h2 className="mt-3 font-[var(--font-display)] text-3xl font-black tracking-tight text-foreground">
        Tell Bes3 what you actually need.
      </h2>
      <p className="mt-3 max-w-3xl text-sm leading-7 text-muted-foreground">
        Use this when you know the situation, budget, or deal-breakers but not the exact model yet. Bes3 will turn that into a tighter set of options instead of a loose keyword search.
      </p>

      <div className="mt-5 flex flex-wrap gap-3">
        {INTENT_PRESET_LINKS.map((preset) => (
          <Link
            key={preset.label}
            href={buildPresetHref(action, preset)}
            className="rounded-full bg-muted px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground transition-colors hover:bg-slate-200"
          >
            {preset.label}
          </Link>
        ))}
      </div>

      <div className={`mt-6 grid gap-4 ${compact ? 'lg:grid-cols-[1.4fr_220px_220px]' : 'lg:grid-cols-[1.6fr_220px_220px]'}`}>
        <label className="space-y-2">
          <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Shopping need</span>
          <textarea
            name="intent"
            defaultValue={defaultIntent}
            rows={compact ? 3 : 4}
            className="min-h-[124px] w-full rounded-[1.5rem] border border-slate-200 bg-slate-50 px-5 py-4 text-sm text-foreground outline-none"
            placeholder="Example: I need a quiet 4K monitor for long work sessions under $500, and I want to avoid dim panels or bad ports."
          />
        </label>

        <div className="grid gap-4">
          <label className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Category</span>
            <select
              name="category"
              defaultValue={defaultCategory}
              className="min-h-[52px] w-full rounded-[1.25rem] border border-slate-200 bg-slate-50 px-4 text-sm text-foreground outline-none"
            >
              <option value="">Auto-detect</option>
              {categoryOptions.map((category) => (
                <option key={category} value={category}>
                  {category.replace(/-/g, ' ')}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Budget</span>
            <input
              type="number"
              min="0"
              step="1"
              name="budget"
              defaultValue={defaultBudget}
              className="min-h-[52px] w-full rounded-[1.25rem] border border-slate-200 bg-slate-50 px-4 text-sm text-foreground outline-none"
              placeholder="500"
            />
          </label>

          <label className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Timing</span>
            <select
              name="urgency"
              defaultValue={defaultUrgency}
              className="min-h-[52px] w-full rounded-[1.25rem] border border-slate-200 bg-slate-50 px-4 text-sm text-foreground outline-none"
            >
              {INTENT_URGENCY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="grid gap-4">
          <label className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Must-haves</span>
            <textarea
              name="must"
              defaultValue={defaultMust}
              rows={compact ? 3 : 4}
              className="min-h-[84px] w-full rounded-[1.25rem] border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-foreground outline-none"
              placeholder="USB-C, quiet fan, good battery"
            />
          </label>

          <label className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Avoid</span>
            <textarea
              name="avoid"
              defaultValue={defaultAvoid}
              rows={compact ? 3 : 4}
              className="min-h-[84px] w-full rounded-[1.25rem] border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-foreground outline-none"
              placeholder="glossy screen, weak battery, noisy cooling"
            />
          </label>

          <button
            type="submit"
            className="inline-flex min-h-[52px] items-center justify-center rounded-full bg-primary px-6 text-sm font-semibold text-primary-foreground"
          >
            Build my shortlist
          </button>
        </div>
      </div>
    </form>
  )
}
