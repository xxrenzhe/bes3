'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, Copy, ExternalLink, RefreshCcw, Scale, Share2, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { useShortlist } from '@/components/site/ShortlistProvider'
import { formatEditorialDate } from '@/lib/editorial'
import { buildMerchantExitPath } from '@/lib/merchant-links'
import { buildShortlistSharePath, getShortlistProductPath, type ShortlistItem } from '@/lib/shortlist'
import { formatPriceSnapshot } from '@/lib/utils'

function buildComparisonSearchHref(productNames: string[]) {
  const params = new URLSearchParams({
    q: productNames.join(' '),
    scope: 'comparison'
  })
  return `/search?${params.toString()}`
}

export function ShortlistWorkspace({
  sharedItems = []
}: {
  sharedItems?: ShortlistItem[]
}) {
  const [isCopying, setIsCopying] = useState(false)
  const { addManyToShortlist, clearShortlist, compare, compareCount, hasHydrated, removeShortlist, replaceShortlist, setCompareFromItems, shortlist, toggleCompare } = useShortlist()
  const hasSharedItems = sharedItems.length > 0
  const missingSharedItems = sharedItems.filter((item) => !shortlist.some((candidate) => candidate.id === item.id))

  if (!hasHydrated) {
    return (
      <div className="rounded-[2rem] bg-white p-10 shadow-panel">
        <p className="text-sm text-muted-foreground">Loading your shortlist...</p>
      </div>
    )
  }

  if (!shortlist.length && !hasSharedItems) {
    return (
      <div className="rounded-[2.5rem] bg-white p-10 text-center shadow-panel sm:p-14">
        <p className="editorial-kicker">Buyer Workspace</p>
        <h2 className="mt-4 font-[var(--font-display)] text-4xl font-black tracking-tight text-foreground">No saved candidates yet.</h2>
        <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-muted-foreground">
          Save products from search, category hubs, deals, or product deep-dives to keep your shortlist stable across visits.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-4">
          <Link href="/search" className="rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground">
            Search products
          </Link>
          <Link href="/directory" className="rounded-full border border-border px-6 py-3 text-sm font-semibold text-foreground">
            Browse the directory
          </Link>
        </div>
      </div>
    )
  }

  const comparisonSearchHref = compareCount >= 2 ? buildComparisonSearchHref(compare.map((item) => item.productName)) : null
  const sharePath = buildShortlistSharePath(shortlist)
  const compareRows = [
    {
      label: 'Price',
      values: compare.map((item) => formatPriceSnapshot(item.priceAmount, item.priceCurrency || 'USD'))
    },
    {
      label: 'Buyer signal',
      values: compare.map((item) => (item.rating ? `${item.rating.toFixed(1)} / 5` : 'Signal building'))
    },
    {
      label: 'Review count',
      values: compare.map((item) => (item.reviewCount ? item.reviewCount.toLocaleString() : 'Pending'))
    },
    {
      label: 'Best clue',
      values: compare.map((item) => item.reviewHighlights[0] || 'Open the deep-dive for the fuller verdict')
    }
  ]

  async function copyShareLink() {
    if (!shortlist.length) return
    if (typeof window === 'undefined' || !navigator.clipboard) {
      toast.error('Clipboard access is unavailable in this browser')
      return
    }

    setIsCopying(true)
    try {
      await navigator.clipboard.writeText(`${window.location.origin}${sharePath}`)
      toast.success('Shortlist share link copied')
    } catch {
      toast.error('Unable to copy the shortlist link')
    } finally {
      setIsCopying(false)
    }
  }

  return (
    <div className="space-y-8">
      <section className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="rounded-[2.5rem] bg-white p-8 shadow-panel sm:p-10">
          <p className="editorial-kicker">Persistent Shortlist</p>
          <h2 className="mt-4 font-[var(--font-display)] text-4xl font-black tracking-tight text-foreground sm:text-5xl">Keep your buying decision alive across visits.</h2>
          <p className="mt-4 max-w-3xl text-sm leading-8 text-muted-foreground">
            Bes3 now remembers your saved candidates locally, so you can collect strong options, return later, and continue comparing without starting over.
          </p>
        </div>
        <div className="rounded-[2.5rem] bg-[linear-gradient(135deg,#0f172a_0%,#1d4ed8_55%,#0f766e_100%)] p-8 text-white shadow-[0_35px_80px_-45px_rgba(15,23,42,0.8)]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-emerald-200">Decision Status</p>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="rounded-[1.75rem] border border-white/12 bg-white/10 p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-200/85">Saved</p>
              <p className="mt-3 text-4xl font-black">{shortlist.length}</p>
            </div>
            <div className="rounded-[1.75rem] border border-white/12 bg-white/10 p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-200/85">Ready to compare</p>
              <p className="mt-3 text-4xl font-black">{compareCount}</p>
            </div>
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={clearShortlist}
              className="inline-flex min-h-[44px] items-center justify-center rounded-full border border-white/20 px-4 text-sm font-semibold text-white transition-colors hover:bg-white/10"
            >
              Clear shortlist
            </button>
            {shortlist.length ? (
              <button
                type="button"
                onClick={copyShareLink}
                className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full border border-white/20 px-4 text-sm font-semibold text-white transition-colors hover:bg-white/10"
              >
                <Share2 className="h-4 w-4" />
                {isCopying ? 'Copying...' : 'Copy share link'}
              </button>
            ) : null}
            <Link href="/search" className="inline-flex min-h-[44px] items-center justify-center rounded-full bg-white px-4 text-sm font-semibold text-slate-950">
              Add more products
            </Link>
          </div>
        </div>
      </section>

      {hasSharedItems ? (
        <section className="rounded-[2.5rem] bg-[linear-gradient(180deg,#f8fbff,#eef4ff)] p-8 shadow-panel sm:p-10">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl space-y-4">
              <p className="editorial-kicker">Shared Shortlist</p>
              <h3 className="font-[var(--font-display)] text-3xl font-black tracking-tight text-foreground">Someone sent you {sharedItems.length} buyer-ready {sharedItems.length === 1 ? 'pick' : 'picks'}.</h3>
              <p className="text-sm leading-8 text-muted-foreground">
                Review the incoming candidates below, then merge them into your own workspace or replace your current shortlist if this shared set is stronger.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              {missingSharedItems.length ? (
                <button
                  type="button"
                  onClick={() => addManyToShortlist(sharedItems)}
                  className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground"
                >
                  <Copy className="h-4 w-4" />
                  Add shared picks
                </button>
              ) : (
                <div className="inline-flex min-h-[44px] items-center justify-center rounded-full bg-emerald-50 px-4 text-sm font-semibold text-emerald-800">
                  Shared picks already saved
                </div>
              )}
              <button
                type="button"
                onClick={() => replaceShortlist(sharedItems)}
                className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full border border-border bg-white px-4 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
              >
                <RefreshCcw className="h-4 w-4" />
                Replace mine
              </button>
              {sharedItems.length >= 2 ? (
                <button
                  type="button"
                  onClick={() => setCompareFromItems(sharedItems)}
                  className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full border border-border bg-white px-4 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
                >
                  <Scale className="h-4 w-4" />
                  Use as compare
                </button>
              ) : null}
            </div>
          </div>

          <div className="mt-8 grid gap-4 xl:grid-cols-3">
            {sharedItems.map((item) => (
              <div key={`shared-${item.id}`} className="rounded-[1.75rem] bg-white p-5">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">{item.category ? item.category.replace(/-/g, ' ') : 'Buyer shortlist'}</p>
                <h4 className="mt-3 font-[var(--font-display)] text-2xl font-black tracking-tight text-foreground">{item.productName}</h4>
                <p className="mt-3 text-sm leading-7 text-muted-foreground">
                  {item.reviewHighlights[0] || item.description || 'Shared as part of a Bes3 buying decision.'}
                </p>
                <div className="mt-4 flex items-center justify-between gap-4 text-sm">
                  <span className="font-semibold text-foreground">{formatPriceSnapshot(item.priceAmount, item.priceCurrency || 'USD')}</span>
                  <Link href={getShortlistProductPath(item)} className="font-semibold text-primary transition-colors hover:text-emerald-700">
                    Open →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section className="space-y-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="editorial-kicker">Saved Candidates</p>
            <h3 className="mt-3 font-[var(--font-display)] text-3xl font-black tracking-tight text-foreground">Your shortlist workspace</h3>
          </div>
        </div>

        {shortlist.length ? (
          <div className="grid gap-6 xl:grid-cols-2">
            {shortlist.map((item) => (
              <article key={item.id} className="overflow-hidden rounded-[2rem] bg-white shadow-panel">
                <div className="grid gap-6 md:grid-cols-[180px_1fr]">
                  <div className="relative min-h-[180px] bg-[linear-gradient(135deg,#e5eeff,#dfe9fa)]">
                    {item.heroImageUrl ? (
                      <Image src={item.heroImageUrl} alt={item.productName} fill sizes="180px" className="object-cover" />
                    ) : (
                      <div className="bg-grid absolute inset-0" />
                    )}
                  </div>
                  <div className="space-y-5 p-6">
                    <div className="space-y-2">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">
                        {item.category ? item.category.replace(/-/g, ' ') : 'Buyer shortlist'}
                      </p>
                      <h4 className="font-[var(--font-display)] text-3xl font-black tracking-tight text-foreground">{item.productName}</h4>
                      <p className="text-sm leading-7 text-muted-foreground">
                        {item.description || 'Saved for later review. Open the deep-dive or merchant page when you are ready to continue.'}
                      </p>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-3">
                      <div className="rounded-[1.25rem] bg-muted p-4">
                        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Price</p>
                        <p className="mt-2 text-lg font-black text-foreground">{formatPriceSnapshot(item.priceAmount, item.priceCurrency || 'USD')}</p>
                      </div>
                      <div className="rounded-[1.25rem] bg-muted p-4">
                        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Signal</p>
                        <p className="mt-2 text-lg font-black text-foreground">{item.rating ? `${item.rating.toFixed(1)} / 5` : 'Building'}</p>
                      </div>
                      <div className="rounded-[1.25rem] bg-muted p-4">
                        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Last checked</p>
                        <p className="mt-2 text-lg font-black text-foreground">{formatEditorialDate(item.updatedAt || item.publishedAt, 'Tracking soon')}</p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-3">
                      <Link
                        href={getShortlistProductPath(item)}
                        className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground"
                      >
                        Open deep-dive
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                      <button
                        type="button"
                        onClick={() => toggleCompare(item)}
                        className={`inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full border px-4 text-sm font-semibold transition-colors ${
                          compare.some((candidate) => candidate.id === item.id) ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-white text-foreground hover:bg-muted'
                        }`}
                      >
                        <Scale className="h-4 w-4" />
                        {compare.some((candidate) => candidate.id === item.id) ? 'In compare' : 'Add to compare'}
                      </button>
                      {item.resolvedUrl ? (
                        <Link
                          href={buildMerchantExitPath(item.id, 'shortlist-workspace')}
                          target="_blank"
                          prefetch={false}
                          className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full border border-border px-4 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
                        >
                          Check price
                          <ExternalLink className="h-4 w-4" />
                        </Link>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => removeShortlist(item.id)}
                        className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full border border-border px-4 text-sm font-semibold text-muted-foreground transition-colors hover:bg-muted"
                      >
                        <Trash2 className="h-4 w-4" />
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="rounded-[2rem] border border-dashed border-border bg-white p-10 text-center shadow-panel">
            <h4 className="font-[var(--font-display)] text-3xl font-black tracking-tight text-foreground">Your shortlist is still empty.</h4>
            <p className="mt-3 text-sm leading-7 text-muted-foreground">
              Import the shared picks above to start your own workspace, or add products from search, deals, and category hubs.
            </p>
          </div>
        )}
      </section>

      <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-[2.5rem] bg-white p-8 shadow-panel sm:p-10">
          <p className="editorial-kicker">Compare Queue</p>
          <h3 className="mt-3 font-[var(--font-display)] text-3xl font-black tracking-tight text-foreground">Side-by-side decision board</h3>
          <p className="mt-4 text-sm leading-7 text-muted-foreground">
            Use compare for the finalists only. If you have more than three, narrow the shortlist first so the tradeoffs stay obvious.
          </p>

          <div className="mt-6 space-y-3">
            {compare.length ? (
              compare.map((item) => (
                <div key={item.id} className="flex items-center justify-between gap-4 rounded-[1.5rem] bg-muted/50 px-4 py-4">
                  <div>
                    <p className="font-semibold text-foreground">{item.productName}</p>
                    <p className="text-sm text-muted-foreground">{item.category ? item.category.replace(/-/g, ' ') : 'Buyer shortlist'}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleCompare(item)}
                    className="rounded-full border border-border px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground transition-colors hover:bg-white"
                  >
                    Remove
                  </button>
                </div>
              ))
            ) : (
              <div className="rounded-[1.5rem] border border-dashed border-border bg-muted/30 px-5 py-8 text-sm text-muted-foreground">
                No products in compare yet. Add two or three candidates from the shortlist above.
              </div>
            )}
          </div>

          {comparisonSearchHref ? (
            <Link href={comparisonSearchHref} className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-primary transition-colors hover:text-emerald-700">
              Search for a published comparison
              <ArrowRight className="h-4 w-4" />
            </Link>
          ) : null}
        </div>

        <div className="rounded-[2.5rem] bg-white p-8 shadow-panel sm:p-10">
          <p className="editorial-kicker">Decision Matrix</p>
          <h3 className="mt-3 font-[var(--font-display)] text-3xl font-black tracking-tight text-foreground">What changes between the finalists</h3>

          {compare.length ? (
            <div className="mt-6 overflow-x-auto">
              <table className="min-w-full border-separate border-spacing-y-3">
                <thead>
                  <tr>
                    <th className="px-4 text-left text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">Signal</th>
                    {compare.map((item) => (
                      <th key={item.id} className="rounded-[1.25rem] bg-muted/50 px-4 py-3 text-left text-sm font-semibold text-foreground">
                        {item.productName}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {compareRows.map((row) => (
                    <tr key={row.label}>
                      <td className="px-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{row.label}</td>
                      {row.values.map((value, index) => (
                        <td key={`${row.label}-${compare[index]?.id || index}`} className="rounded-[1.25rem] bg-muted/40 px-4 py-4 text-sm leading-7 text-foreground">
                          {value}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="mt-6 rounded-[1.5rem] border border-dashed border-border bg-muted/30 px-5 py-10 text-sm text-muted-foreground">
              Once at least one product enters compare, Bes3 will keep the matrix here. Two or three products gives the clearest side-by-side view.
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
