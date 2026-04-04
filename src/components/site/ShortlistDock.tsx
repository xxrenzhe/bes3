'use client'

import Link from 'next/link'
import { ArrowRight, Scale, X } from 'lucide-react'
import { useShortlist } from '@/components/site/ShortlistProvider'

export function ShortlistDock() {
  const { clearCompare, compare, compareCount, hasHydrated, shortlistCount } = useShortlist()

  if (!hasHydrated || (!shortlistCount && !compareCount)) return null

  const compareNames = compare.slice(0, 3).map((item) => item.productName).join(' · ')

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-50 px-4">
      <div className="pointer-events-auto mx-auto max-w-5xl rounded-[1.75rem] border border-white/15 bg-slate-950/96 p-4 text-white shadow-[0_32px_80px_-35px_rgba(15,23,42,0.75)] backdrop-blur">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-emerald-200">Buyer Workspace</p>
            <h3 className="font-[var(--font-display)] text-2xl font-black tracking-tight">
              {shortlistCount} saved {shortlistCount === 1 ? 'product' : 'products'}{compareCount ? ` · ${compareCount} in compare` : ''}
            </h3>
            <p className="text-sm leading-7 text-slate-300">
              {compareNames || 'Keep saving strong candidates, then return to compare tradeoffs side by side.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {compareCount ? (
              <button
                type="button"
                onClick={clearCompare}
                className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full border border-white/15 px-4 text-sm font-semibold text-slate-200 transition-colors hover:bg-white/10"
              >
                <X className="h-4 w-4" />
                Clear compare
              </button>
            ) : null}
            <Link
              href="/shortlist"
              className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full bg-[linear-gradient(135deg,hsl(var(--primary)),#00855d)] px-5 text-sm font-semibold text-primary-foreground"
            >
              <Scale className="h-4 w-4" />
              Open shortlist
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
