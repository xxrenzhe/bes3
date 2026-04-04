'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { slugify } from '@/lib/slug'
import { cn } from '@/lib/utils'

const INTENT_OPTIONS = [
  {
    id: 'deals',
    label: 'Deal Alerts',
    description: 'Worthwhile price drops and timely promotions.'
  },
  {
    id: 'price-alert',
    label: 'Price Watch',
    description: 'Track a category and stay ready to buy.'
  },
  {
    id: 'category-brief',
    label: 'Category Brief',
    description: 'Weekly buyer notes on what changed and why.'
  }
] as const

const CADENCE_OPTIONS = [
  { id: 'weekly', label: 'Weekly' },
  { id: 'priority', label: 'Priority' }
] as const

type IntentId = (typeof INTENT_OPTIONS)[number]['id']
type CadenceId = (typeof CADENCE_OPTIONS)[number]['id']

export function NewsletterSignup({
  categoryOptions = [],
  source = 'site',
  initialIntent = 'deals',
  initialCategorySlug = '',
  initialCadence = 'weekly'
}: {
  categoryOptions?: string[]
  source?: string
  initialIntent?: IntentId
  initialCategorySlug?: string
  initialCadence?: CadenceId
}) {
  const normalizedInitialCategorySlug = slugify(initialCategorySlug)
  const resolvedCategoryOptions = normalizedInitialCategorySlug && !categoryOptions.includes(normalizedInitialCategorySlug)
    ? [normalizedInitialCategorySlug, ...categoryOptions]
    : categoryOptions
  const [email, setEmail] = useState('')
  const [intent, setIntent] = useState<IntentId>(initialIntent)
  const [categorySlug, setCategorySlug] = useState(normalizedInitialCategorySlug)
  const [cadence, setCadence] = useState<CadenceId>(initialCadence)
  const [done, setDone] = useState(false)
  const [isPending, startTransition] = useTransition()
  const selectedIntent = INTENT_OPTIONS.find((option) => option.id === intent) || INTENT_OPTIONS[0]

  return (
    <div className="editorial-shadow relative overflow-hidden rounded-[2rem] bg-white p-8 sm:p-10">
      <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-emerald-100/60 blur-3xl" />
      {done ? (
        <div className="relative space-y-3">
          <p className="editorial-kicker">Alert added</p>
          <h3 className="font-[var(--font-display)] text-3xl font-black tracking-tight">You are on the watchlist.</h3>
          <p className="text-sm leading-7 text-muted-foreground">
            Bes3 will use this preference to keep future {selectedIntent.label.toLowerCase()} more relevant{categorySlug ? ` for ${categorySlug.replace(/-/g, ' ')}` : ''}.
          </p>
        </div>
      ) : (
        <form
          className="relative space-y-6"
          onSubmit={(event) => {
            event.preventDefault()
            startTransition(async () => {
              const response = await fetch('/api/newsletter', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, intent, cadence, categorySlug, source })
              })
              if (response.ok) {
                setDone(true)
              }
            })
          }}
        >
          <div className="space-y-2">
            <p className="editorial-kicker">Buyer Alerts</p>
            <h3 className="font-[var(--font-display)] text-3xl font-black tracking-tight">Tell Bes3 what to watch for.</h3>
            <p className="text-sm leading-7 text-muted-foreground">{selectedIntent.description}</p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {INTENT_OPTIONS.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => setIntent(option.id)}
                className={cn(
                  'rounded-[1.25rem] border px-4 py-4 text-left transition-colors',
                  intent === option.id
                    ? 'border-primary bg-emerald-50 text-foreground'
                    : 'border-border bg-muted/40 text-muted-foreground hover:bg-muted'
                )}
              >
                <p className="text-sm font-semibold text-foreground">{option.label}</p>
                <p className="mt-2 text-xs leading-6">{option.description}</p>
              </button>
            ))}
          </div>

          <div className="grid gap-4 sm:grid-cols-[1fr_220px]">
            <Input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="name@company.com"
              className="min-h-[56px] rounded-2xl border-none bg-muted px-5"
            />

            <label className="flex min-h-[56px] items-center rounded-2xl bg-muted px-4">
              <span className="sr-only">Category to watch</span>
              <select
                value={categorySlug}
                onChange={(event) => setCategorySlug(event.target.value)}
                className="w-full border-none bg-transparent text-sm text-foreground outline-none"
              >
                <option value="">Any category</option>
                {resolvedCategoryOptions.map((category) => (
                  <option key={category} value={category}>
                    {category.replace(/-/g, ' ')}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="flex flex-wrap gap-3">
            {CADENCE_OPTIONS.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => setCadence(option.id)}
                className={cn(
                  'rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] transition-colors',
                  cadence === option.id ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                )}
              >
                {option.label}
              </button>
            ))}
          </div>

          <Button type="submit" disabled={!email.includes('@') || isPending} className="min-h-[56px] rounded-full px-6">
            {isPending ? 'Saving...' : 'Start my alert'}
          </Button>
          <p className="text-xs leading-6 text-muted-foreground">One email address, preference-aware updates, and no generic newsletter blast.</p>
        </form>
      )}
    </div>
  )
}
