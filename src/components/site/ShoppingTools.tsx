'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Calculator, ListChecks, Wand2 } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { buildNewsletterPath } from '@/lib/newsletter-path'
import { cn } from '@/lib/utils'

function clampNumber(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return min
  return Math.min(max, Math.max(min, value))
}

export function ShoppingTools() {
  const [currentPrice, setCurrentPrice] = useState('399')
  const [targetPrice, setTargetPrice] = useState('329')
  const [budget, setBudget] = useState('350')
  const [shortlistCount, setShortlistCount] = useState('3')
  const [mustHavesCovered, setMustHavesCovered] = useState('yes')
  const [priceTiming, setPriceTiming] = useState('wait')

  const currentValue = clampNumber(Number(currentPrice), 0, 100000)
  const targetValue = clampNumber(Number(targetPrice), 0, 100000)
  const budgetValue = clampNumber(Number(budget), 0, 100000)
  const dropValue = currentValue > 0 ? Math.max(0, currentValue - targetValue) : 0
  const dropPercent = currentValue > 0 ? Math.round((dropValue / currentValue) * 100) : 0
  const insideBudget = targetValue > 0 && targetValue <= budgetValue
  const shortlistSize = clampNumber(Number(shortlistCount), 1, 12)
  const readyToBuyNow = shortlistSize <= 3 && mustHavesCovered === 'yes' && priceTiming === 'buy'
  const alertHref = buildNewsletterPath({
    intent: 'price-alert',
    cadence: 'priority',
    returnTo: '/tools',
    returnLabel: 'Resume shopping tools',
    returnDescription: 'Return to the shopping tools page with the same calculator context and decision helpers still available.'
  })

  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <section className="rounded-[2rem] bg-[linear-gradient(135deg,#0f172a_0%,#1d4ed8_54%,#0f766e_100%)] p-8 text-white shadow-[0_32px_80px_-42px_rgba(15,23,42,0.8)]">
        <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 text-emerald-200">
          <Calculator className="h-6 w-6" />
        </div>
        <p className="mt-6 text-[11px] font-semibold uppercase tracking-[0.28em] text-emerald-200/80">Tool 01</p>
        <h2 className="mt-4 font-[var(--font-display)] text-3xl font-black tracking-tight">Price drop calculator</h2>
        <p className="mt-4 text-sm leading-7 text-slate-200">
          Estimate whether a lower price target is meaningful enough to justify waiting instead of restarting your research later.
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          <label className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-100/80">Current price</span>
            <Input value={currentPrice} onChange={(event) => setCurrentPrice(event.target.value)} className="border-white/10 bg-white/10 text-white placeholder:text-slate-300" />
          </label>
          <label className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-100/80">Target price</span>
            <Input value={targetPrice} onChange={(event) => setTargetPrice(event.target.value)} className="border-white/10 bg-white/10 text-white placeholder:text-slate-300" />
          </label>
          <label className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-100/80">Your budget</span>
            <Input value={budget} onChange={(event) => setBudget(event.target.value)} className="border-white/10 bg-white/10 text-white placeholder:text-slate-300" />
          </label>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          <div className="rounded-[1.5rem] border border-white/12 bg-white/8 p-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-200/80">Target drop</p>
            <p className="mt-3 text-3xl font-black">${dropValue.toFixed(0)}</p>
            <p className="mt-2 text-sm text-slate-200">{dropPercent}% below the current price.</p>
          </div>
          <div className="rounded-[1.5rem] border border-white/12 bg-white/8 p-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-200/80">Budget fit</p>
            <p className="mt-3 text-3xl font-black">{insideBudget ? 'Yes' : 'No'}</p>
            <p className="mt-2 text-sm text-slate-200">{insideBudget ? 'The target price fits your budget.' : 'The target price still stays above budget.'}</p>
          </div>
          <div className="rounded-[1.5rem] border border-white/12 bg-white/8 p-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-200/80">Bes3 take</p>
            <p className="mt-3 text-2xl font-black">{dropPercent >= 12 && insideBudget ? 'Worth waiting' : 'Do not wait just for noise'}</p>
            <p className="mt-2 text-sm text-slate-200">
              {dropPercent >= 12 && insideBudget
                ? 'This is a meaningful enough price gap to justify an alert.'
                : 'If the fit is right, a tiny drop usually should not decide the purchase by itself.'}
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-[2rem] border border-slate-200/70 bg-white/90 p-8 shadow-[0_32px_70px_-40px_rgba(15,23,42,0.32)]">
        <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-primary">
          <ListChecks className="h-6 w-6" />
        </div>
        <p className="mt-6 text-[11px] font-semibold uppercase tracking-[0.28em] text-primary">Tool 02</p>
        <h2 className="mt-4 font-[var(--font-display)] text-3xl font-black tracking-tight text-slate-950">Shortlist readiness checker</h2>
        <p className="mt-4 text-sm leading-7 text-slate-600">
          Use a few decision inputs to judge whether you are ready to buy now, compare a final pair, or switch into a wait-for-price workflow.
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          <label className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Shortlist size</span>
            <Input value={shortlistCount} onChange={(event) => setShortlistCount(event.target.value)} className="bg-slate-50" />
          </label>
          <label className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Must-haves covered</span>
            <select value={mustHavesCovered} onChange={(event) => setMustHavesCovered(event.target.value)} className="min-h-[40px] rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-950 outline-none">
              <option value="yes">Yes</option>
              <option value="mostly">Mostly</option>
              <option value="no">No</option>
            </select>
          </label>
          <label className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Price timing</span>
            <select value={priceTiming} onChange={(event) => setPriceTiming(event.target.value)} className="min-h-[40px] rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-950 outline-none">
              <option value="buy">I am okay buying now</option>
              <option value="compare">I still need one last compare</option>
              <option value="wait">I only want a better price</option>
            </select>
          </label>
        </div>

        <div className="mt-8 rounded-[1.75rem] bg-[linear-gradient(135deg,#fff8ef_0%,#f8fbff_48%,#eefaf5_100%)] p-6">
          <div className="flex items-center gap-3">
            <Wand2 className="h-5 w-5 text-primary" />
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">Recommendation</p>
          </div>
          <h3 className="mt-4 text-2xl font-black tracking-tight text-slate-950">
            {readyToBuyNow ? 'You are close enough to buy.' : shortlistSize > 3 ? 'Cut the shortlist before buying.' : 'Use alerts or one last compare pass.'}
          </h3>
          <p className="mt-4 text-sm leading-7 text-slate-600">
            {readyToBuyNow
              ? 'Your shortlist is tight, the must-haves are covered, and price timing is not the blocker. This is where Bes3 would treat “Check current price” as the right next step.'
              : shortlistSize > 3
                ? 'You still have too many options for a clean decision. Bes3 would push you back into compare or shortlist cleanup before any checkout click.'
                : 'The product fit may already be close, but price timing or one missing tradeoff still matters. Use alerts or one last comparison instead of forcing a rushed purchase.'}
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/shortlist" className={cn(buttonVariants(), 'rounded-full px-6')}>
              Open shortlist
            </Link>
            <Link
              href={alertHref}
              className={cn(buttonVariants({ variant: 'outline' }), 'rounded-full px-6')}
            >
              Open price alerts
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
