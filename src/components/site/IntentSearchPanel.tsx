import Link from 'next/link'
import type { IntentUrgency } from '@/lib/commerce-intent'

const INTENT_URGENCY_OPTIONS: Array<{ value: IntentUrgency; label: string }> = [
  { value: 'buy-now', label: 'I might buy today' },
  { value: 'compare-soon', label: 'I need one last comparison' },
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
    label: 'Show 2 to 3 picks',
    intent: 'I want a short list of the strongest reviewed options, not a giant list.',
    budget: '',
    must: '',
    avoid: 'too many choices',
    urgency: 'buy-now' as IntentUrgency
  }
] as const

const INTENT_GUIDE_STEPS = [
  {
    title: '1. What are you buying for?',
    description: 'Start with the real job to be done, not the product spec.',
    example: 'Example: long work sessions, travel, gaming, field work'
  },
  {
    title: '2. What cannot go wrong?',
    description: 'List the two or three issues that would make this feel like a bad buy.',
    example: 'Example: weak battery, noisy fan, dim panel, fragile build'
  },
  {
    title: '3. What would make you skip it?',
    description: 'Use deal-breakers so Alex can remove bad-fit options faster.',
    example: 'Example: no USB-C, glossy screen, poor ports, bulky size'
  }
] as const

const INTENT_URGENCY_HELP: Record<IntentUrgency, string> = {
  'buy-now': 'Use this when you are close to buying and want Alex to confirm whether the safest answer is buy or skip.',
  'compare-soon': 'Use this when you already know the category and need Alex to decide which finalist deserves comparison.',
  'wait-for-price': 'Use this when fit is mostly clear but Alex should decide whether the smarter move is wait.'
}

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
  const urgencyHelp = INTENT_URGENCY_HELP[defaultUrgency]

  return (
    <form action={action} className={`rounded-[2rem] bg-white p-8 shadow-panel ${className}`.trim()}>
      <input type="hidden" name="mode" value="intent" />
      <p className="editorial-kicker">Start Decision</p>
      <h2 className="mt-3 font-[var(--font-display)] text-3xl font-black tracking-tight text-foreground">
        Tell Alex the tech choice you need to settle.
      </h2>
      <p className="mt-3 max-w-3xl text-sm leading-7 text-muted-foreground">
        Use this when you know the situation, budget, or deal-breakers but not the exact model yet. Bes3 will turn that into a smaller decision: buy, compare, wait, or skip with current price context and visible cons.
      </p>

      <div className="mt-6 grid gap-3 lg:grid-cols-3">
        {INTENT_GUIDE_STEPS.map((step) => (
          <div key={step.title} className="rounded-[1.5rem] border border-slate-200 bg-slate-50/80 p-5">
            <p className="text-sm font-semibold text-foreground">{step.title}</p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{step.description}</p>
            <p className="mt-3 text-xs font-medium uppercase tracking-[0.18em] text-slate-500">{step.example}</p>
          </div>
        ))}
      </div>

      <div className="mt-5">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Need a head start? Try one of these shopping prompts.</p>
        <div className="mt-3 flex flex-wrap gap-3">
          {INTENT_PRESET_LINKS.map((preset) => (
            <Link
              key={preset.label}
              href={buildPresetHref(action, preset)}
              className="inline-flex min-h-11 touch-manipulation items-center rounded-full bg-muted px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground transition-[background-color,color,transform] hover:-translate-y-0.5 hover:bg-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              {preset.label}
            </Link>
          ))}
        </div>
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
            aria-describedby="intent-helper"
          />
          <span id="intent-helper" className="block text-xs leading-6 text-muted-foreground">
            Start with this sentence shape: “I need a <span className="font-semibold text-foreground">product</span> for <span className="font-semibold text-foreground">situation</span>, around <span className="font-semibold text-foreground">budget</span>, and I want to avoid <span className="font-semibold text-foreground">deal-breakers</span>.”
          </span>
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
            <span className="block text-xs leading-6 text-muted-foreground">Leave blank if the tradeoff matters more than the number.</span>
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
            <span className="block text-xs leading-6 text-muted-foreground">{urgencyHelp}</span>
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
            <span className="block text-xs leading-6 text-muted-foreground">Use 2 to 4 concrete must-haves so the shortlist stays narrow.</span>
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
            <span className="block text-xs leading-6 text-muted-foreground">This is where you tell Alex what would make you reject an otherwise good option.</span>
          </label>

          <button
            type="submit"
            className="inline-flex min-h-[52px] touch-manipulation items-center justify-center rounded-full bg-primary px-6 text-sm font-semibold text-primary-foreground shadow-lg shadow-emerald-950/10 transition-[box-shadow,transform] hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            Get my next step
          </button>
        </div>
      </div>
    </form>
  )
}
