'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, Copy, ExternalLink, RefreshCcw, Scale, Share2, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { useShortlist } from '@/components/site/ShortlistProvider'
import { buildTrackedMerchantExitPath, trackDecisionEvent } from '@/lib/decision-tracking'
import { formatEditorialDate } from '@/lib/editorial'
import {
  buildShortlistBuyingBrief,
  buildShortlistSharePath,
  getShortlistDecisionState,
  getShortlistProductPath,
  summarizeShortlist,
  summarizeShortlistDecisionReadiness,
  type ShortlistItem
} from '@/lib/shortlist'
import { formatPriceSnapshot } from '@/lib/utils'

function buildComparisonSearchHref(productNames: string[]) {
  const params = new URLSearchParams({
    q: productNames.join(' '),
    scope: 'comparison'
  })
  return `/search?${params.toString()}`
}

function buildProductRollup(items: ShortlistItem[]) {
  const names = items.map((item) => item.productName)
  if (names.length <= 3) return names.join(', ')
  return `${names.slice(0, 3).join(', ')}, plus ${names.length - 3} more`
}

function buildCategoryHubHref(item: ShortlistItem | undefined) {
  return item?.category ? `/categories/${item.category}` : '/directory'
}

function getDecisionBadgeClass(stage: ReturnType<typeof getShortlistDecisionState>['stage']) {
  if (stage === 'finalist') return 'border-emerald-300 bg-emerald-50 text-emerald-900'
  if (stage === 'compare-ready') return 'border-primary/25 bg-primary/10 text-primary'
  if (stage === 'needs-check') return 'border-amber-300 bg-amber-50 text-amber-900'
  return 'border-slate-200 bg-slate-100 text-slate-700'
}

export function ShortlistWorkspace({
  sharedItems = []
}: {
  sharedItems?: ShortlistItem[]
}) {
  const [isCopying, setIsCopying] = useState(false)
  const [isCopyingBrief, setIsCopyingBrief] = useState(false)
  const sharedViewTrackedRef = useRef(false)
  const { addManyToShortlist, clearShortlist, compare, compareCount, hasHydrated, removeShortlist, replaceShortlist, setCompareFromItems, shortlist, toggleCompare } = useShortlist()
  const hasSharedItems = sharedItems.length > 0
  const missingSharedItems = sharedItems.filter((item) => !shortlist.some((candidate) => candidate.id === item.id))

  useEffect(() => {
    if (!hasSharedItems || sharedViewTrackedRef.current) return
    sharedViewTrackedRef.current = true
    trackDecisionEvent({
      eventType: 'shared_shortlist_view',
      source: 'shared-shortlist-page',
      metadata: {
        itemCount: sharedItems.length
      }
    })
  }, [hasSharedItems, sharedItems.length])

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

  const compareIds = compare.map((item) => item.id)
  const comparisonSearchHref = compareCount >= 2 ? buildComparisonSearchHref(compare.map((item) => item.productName)) : null
  const sharePath = buildShortlistSharePath(shortlist)
  const sharedSummary = hasSharedItems ? summarizeShortlist(sharedItems) : null
  const sharedDecisionSummary = hasSharedItems ? summarizeShortlistDecisionReadiness(sharedItems) : null
  const sharedBuyingBrief = hasSharedItems ? buildShortlistBuyingBrief(sharedItems) : ''
  const shortlistDecisionSummary = summarizeShortlistDecisionReadiness(shortlist, compareIds)
  const shortlistDecisionStates = new Map(
    shortlist.map((item) => [
      item.id,
      getShortlistDecisionState(item, {
        shortlistSize: shortlist.length,
        compareIds
      })
    ])
  )
  const sharedDecisionStates = new Map(
    sharedItems.map((item) => [
      item.id,
      getShortlistDecisionState(item, {
        shortlistSize: sharedItems.length
      })
    ])
  )
  const compareCandidates = shortlist.slice(0, Math.min(shortlist.length, 3))
  const compareCandidateNames = buildProductRollup(compareCandidates)
  const searchForAlternativesHref = buildCategoryHubHref(shortlist[0])
  const sharedBriefPreview = sharedSummary
    ? [
        `${sharedSummary.overview} ${sharedSummary.decisionNote}`,
        sharedDecisionSummary ? `Decision lens: ${sharedDecisionSummary.decisionLens}` : '',
        `Strongest signal: ${sharedSummary.strongestSignal}`,
        `Included picks: ${buildProductRollup(sharedItems)}.`
      ].filter(Boolean).join('\n')
    : ''
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
  const coachSource = 'shortlist-decision-coach'
  const coach = shortlist.length === 1
    ? {
        variant: 'expand-options',
        eyebrow: 'Decision Coach',
        title: 'Add one more contender before you decide.',
        description: 'A single saved product is still a preference, not a decision. Pull in at least one serious alternative so the tradeoffs become obvious.',
        primaryLabel: shortlist[0]?.category ? 'Browse this category' : 'Browse the directory',
        primaryHref: searchForAlternativesHref,
        primaryActionKey: 'browse-category',
        secondaryLabel: 'Open saved pick',
        secondaryHref: getShortlistProductPath(shortlist[0]),
        secondaryActionKey: 'open-saved-pick',
        highlights: [
          'Best next move: find one comparable option in the same category.',
          `Current saved pick: ${shortlist[0]?.productName || 'Your saved product'}.`
        ],
        emphasis: 'Collecting is still the right move, but only until you have a second real option.'
      }
    : shortlist.length >= 2 && compareCount < 2
      ? {
          variant: 'start-compare',
          eyebrow: 'Decision Coach',
          title: 'Turn your shortlist into a real comparison.',
          description: 'You already have enough candidates to stop collecting and start deciding. Load the strongest saved picks into compare and keep the shortlist for backups.',
          primaryLabel: `Load ${compareCandidates.length} ${compareCandidates.length === 1 ? 'pick' : 'picks'} into compare`,
          primaryAction: () => setCompareFromItems(compareCandidates, 'shortlist-decision-coach'),
          primaryActionKey: 'load-compare',
          secondaryLabel: 'Review saved candidates',
          secondaryHref: '/shortlist#saved-candidates',
          secondaryActionKey: 'review-saved-candidates',
          highlights: [
            `Recommended finalists: ${compareCandidateNames}.`,
            'Bes3 uses your most recently saved picks first, capped at three.'
          ],
          emphasis: 'The decision is mature enough to compare now. More saving will likely add noise, not clarity.'
        }
      : compareCount >= 2
        ? {
            variant: 'close-decision',
            eyebrow: 'Decision Coach',
            title: 'Your finalists are ready for a decision.',
            description: 'Keep compare tight, review the decision matrix, then move to a published comparison or merchant price checks once the tradeoffs feel clear.',
            primaryLabel: 'Jump to decision matrix',
            primaryHref: '/shortlist#decision-matrix',
            primaryActionKey: 'jump-decision-matrix',
            secondaryLabel: comparisonSearchHref ? 'Search for a published comparison' : 'Open compare queue',
            secondaryHref: comparisonSearchHref || '/shortlist#compare-queue',
            secondaryActionKey: comparisonSearchHref ? 'search-published-comparison' : 'open-compare-queue',
            highlights: [
              `Active finalists: ${buildProductRollup(compare)}.`,
              compareCount < shortlist.length ? `${shortlist.length - compareCount} saved ${shortlist.length - compareCount === 1 ? 'backup remains' : 'backups remain'} outside compare.` : 'Your shortlist and compare set are currently aligned.'
            ],
            emphasis: 'You already have enough signal to decide. The next gains come from sharper comparison, not more candidates.'
          }
        : null

  async function copyText(value: string, pendingLabel: (pending: boolean) => void, successMessage: string, errorMessage: string) {
    if (!value) return false
    if (typeof window === 'undefined' || !navigator.clipboard) {
      toast.error('Clipboard access is unavailable in this browser')
      return false
    }

    pendingLabel(true)
    try {
      await navigator.clipboard.writeText(value)
      toast.success(successMessage)
      return true
    } catch {
      toast.error(errorMessage)
      return false
    } finally {
      pendingLabel(false)
    }
  }

  function trackCoachAction(position: 'primary' | 'secondary', action: string) {
    if (!coach) return

    trackDecisionEvent({
      eventType: position === 'primary' ? 'decision_coach_primary_click' : 'decision_coach_secondary_click',
      source: coachSource,
      metadata: {
        action,
        variant: coach.variant,
        shortlistCount: shortlist.length,
        compareCount
      }
    })
  }

  async function copyShareLink() {
    if (!shortlist.length) return
    const copied = await copyText(`${window.location.origin}${sharePath}`, setIsCopying, 'Shortlist share link copied', 'Unable to copy the shortlist link')
    if (copied) {
      trackDecisionEvent({
        eventType: 'shortlist_share_link_copy',
        source: 'shortlist-workspace',
        metadata: {
          itemCount: shortlist.length
        }
      })
    }
  }

  async function copyBuyingBrief() {
    const copied = await copyText(sharedBuyingBrief, setIsCopyingBrief, 'Buying brief copied', 'Unable to copy the buying brief')
    if (copied) {
      trackDecisionEvent({
        eventType: 'shared_shortlist_brief_copy',
        source: 'shared-shortlist-page',
        metadata: {
          itemCount: sharedItems.length
        }
      })
    }
  }

  return (
    <div className="space-y-8">
      <section className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <div id="compare-queue" className="rounded-[2.5rem] bg-white p-8 shadow-panel sm:p-10">
          <p className="editorial-kicker">Persistent Shortlist</p>
          <h2 className="mt-4 font-[var(--font-display)] text-4xl font-black tracking-tight text-foreground sm:text-5xl">Keep your buying decision alive across visits.</h2>
          <p className="mt-4 max-w-3xl text-sm leading-8 text-muted-foreground">
            Bes3 now remembers your saved candidates locally, so you can collect strong options, return later, and continue comparing without starting over.
          </p>
        </div>
        <div className="rounded-[2.5rem] bg-[linear-gradient(135deg,#0f172a_0%,#1d4ed8_55%,#0f766e_100%)] p-8 text-white shadow-[0_35px_80px_-45px_rgba(15,23,42,0.8)]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-emerald-200">Decision Status</p>
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <div className="rounded-[1.75rem] border border-white/12 bg-white/10 p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-200/85">Saved</p>
              <p className="mt-3 text-4xl font-black">{shortlist.length}</p>
            </div>
            <div className="rounded-[1.75rem] border border-white/12 bg-white/10 p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-200/85">In compare</p>
              <p className="mt-3 text-4xl font-black">{compareCount}</p>
            </div>
            <div className="rounded-[1.75rem] border border-white/12 bg-white/10 p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-200/85">Compare-ready</p>
              <p className="mt-3 text-4xl font-black">{shortlistDecisionSummary.compareReadyCount}</p>
            </div>
          </div>
          <p className="mt-6 max-w-xl text-sm leading-7 text-slate-200/80">{shortlistDecisionSummary.note}</p>
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
          <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
            <div className="rounded-[2rem] bg-white p-7 sm:p-8">
              <p className="editorial-kicker">Shared Shortlist</p>
              <h3 className="mt-4 font-[var(--font-display)] text-3xl font-black tracking-tight text-foreground sm:text-4xl">
                Someone sent you {sharedItems.length} buyer-ready {sharedItems.length === 1 ? 'pick' : 'picks'}.
              </h3>
              <p className="mt-4 max-w-3xl text-sm leading-8 text-muted-foreground">
                {sharedSummary?.overview} {sharedSummary?.decisionNote} Review the incoming candidates below, then merge them into your own workspace or replace your current shortlist if this shared set is stronger.
              </p>
              <div className="mt-6 rounded-[1.75rem] bg-slate-950 p-5 text-white">
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-emerald-200">Strongest signal</p>
                <p className="mt-3 text-sm leading-7 text-slate-200">{sharedSummary?.strongestSignal}</p>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-[1.75rem] bg-white p-5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">Shared picks</p>
                <p className="mt-3 text-3xl font-black text-foreground">{sharedItems.length}</p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">Enough to review, discuss, and load into your own shortlist.</p>
              </div>
              <div className="rounded-[1.75rem] bg-white p-5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">Category spread</p>
                <p className="mt-3 text-3xl font-black text-foreground">{sharedSummary?.categoryLabel}</p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{sharedSummary?.categoryNote}</p>
              </div>
              <div className="rounded-[1.75rem] bg-white p-5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">Price band</p>
                <p className="mt-3 text-3xl font-black text-foreground">{sharedSummary?.priceRangeLabel}</p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{sharedSummary?.priceRangeNote}</p>
              </div>
              <div className="rounded-[1.75rem] bg-white p-5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">Buyer proof</p>
                <p className="mt-3 text-3xl font-black text-foreground">{sharedSummary?.buyerProofLabel}</p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {sharedSummary?.averageRating
                    ? `Average signal ${sharedSummary.averageRatingLabel}.`
                    : sharedSummary?.buyerProofNote}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-6 rounded-[2rem] bg-[linear-gradient(135deg,#0f172a_0%,#1e293b_48%,#14532d_100%)] p-6 text-white shadow-[0_30px_70px_-45px_rgba(15,23,42,0.92)] sm:p-7">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="max-w-3xl">
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-emerald-200">Buying Brief</p>
                <h4 className="mt-3 font-[var(--font-display)] text-2xl font-black tracking-tight text-white">Ready to paste into notes, chat, or email.</h4>
                <p className="mt-3 whitespace-pre-line text-sm leading-7 text-slate-200">{sharedBriefPreview}</p>
              </div>
              <button
                type="button"
                onClick={copyBuyingBrief}
                className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full border border-white/20 px-4 text-sm font-semibold text-white transition-colors hover:bg-white/10"
              >
                <Copy className="h-4 w-4" />
                {isCopyingBrief ? 'Copying...' : 'Copy buying brief'}
              </button>
            </div>
          </div>

          <div className="mt-8 flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl">
              <p className="text-sm leading-8 text-muted-foreground">
                Use these actions to import the shared set into your own workspace, replace your current shortlist, or move the incoming picks straight into compare.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              {missingSharedItems.length ? (
                <button
                  type="button"
                  onClick={() => addManyToShortlist(sharedItems, 'shared-shortlist-page')}
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
                onClick={() => replaceShortlist(sharedItems, 'shared-shortlist-page')}
                className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full border border-border bg-white px-4 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
              >
                <RefreshCcw className="h-4 w-4" />
                Replace mine
              </button>
              {sharedItems.length >= 2 ? (
                <button
                  type="button"
                  onClick={() => setCompareFromItems(sharedItems, 'shared-shortlist-page')}
                  className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full border border-border bg-white px-4 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
                >
                  <Scale className="h-4 w-4" />
                  Use as compare
                </button>
              ) : null}
            </div>
          </div>

          <div className="mt-8 grid gap-4 xl:grid-cols-3">
            {sharedItems.map((item) => {
              const decisionState = sharedDecisionStates.get(item.id)

              return (
                <div key={`shared-${item.id}`} className="rounded-[1.75rem] bg-white p-5">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">{item.category ? item.category.replace(/-/g, ' ') : 'Buyer shortlist'}</p>
                    {decisionState ? (
                      <span className={`rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] ${getDecisionBadgeClass(decisionState.stage)}`}>
                        {decisionState.label} · {decisionState.score}
                      </span>
                    ) : null}
                  </div>
                  <h4 className="mt-3 font-[var(--font-display)] text-2xl font-black tracking-tight text-foreground">{item.productName}</h4>
                  <p className="mt-3 text-sm leading-7 text-muted-foreground">
                    {item.reviewHighlights[0] || item.description || 'Shared as part of a Bes3 buying decision.'}
                  </p>
                  {decisionState?.whySaved.length ? (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {decisionState.whySaved.slice(0, 2).map((tag) => (
                        <span key={`${item.id}-${tag}`} className="rounded-full bg-muted px-3 py-1 text-[11px] font-medium text-foreground">
                          {tag}
                        </span>
                      ))}
                    </div>
                  ) : null}
                  <div className="mt-4 flex items-center justify-between gap-4 text-sm">
                    <span className="font-semibold text-foreground">{formatPriceSnapshot(item.priceAmount, item.priceCurrency || 'USD')}</span>
                    <Link href={getShortlistProductPath(item)} className="font-semibold text-primary transition-colors hover:text-emerald-700">
                      Open →
                    </Link>
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      ) : null}

      {shortlist.length ? (
        <section className="rounded-[2.5rem] bg-[linear-gradient(180deg,#f8fbff,#ffffff)] p-8 shadow-panel sm:p-10">
          <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr] xl:items-start">
            <div>
              <p className="editorial-kicker">Decision Readiness</p>
              <h3 className="mt-4 font-[var(--font-display)] text-3xl font-black tracking-tight text-foreground sm:text-4xl">
                {shortlistDecisionSummary.label}
              </h3>
              <p className="mt-4 max-w-3xl text-sm leading-8 text-muted-foreground">{shortlistDecisionSummary.note}</p>
              <div className="mt-6 rounded-[1.75rem] bg-slate-950 p-5 text-white">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-200">Decision lens</p>
                <p className="mt-3 text-sm leading-7 text-slate-200">{shortlistDecisionSummary.decisionLens}</p>
                <p className="mt-5 text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-200">Next move</p>
                <p className="mt-3 text-sm leading-7 text-slate-200">{shortlistDecisionSummary.nextAction}</p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-[1.75rem] bg-white p-5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">Average readiness</p>
                <p className="mt-3 text-3xl font-black text-foreground">{shortlistDecisionSummary.averageScore}/100</p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">A blend of price proof, merchant readiness, freshness, and shortlist maturity.</p>
              </div>
              <div className="rounded-[1.75rem] bg-white p-5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">Finalists</p>
                <p className="mt-3 text-3xl font-black text-foreground">{shortlistDecisionSummary.finalistCount}</p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">Products already promoted into compare and treated as real decision candidates.</p>
              </div>
              <div className="rounded-[1.75rem] bg-white p-5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">Needs a check</p>
                <p className="mt-3 text-3xl font-black text-foreground">{shortlistDecisionSummary.needsCheckCount + shortlistDecisionSummary.buildingCount}</p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">Saved picks that still need sharper evidence before they deserve finalist attention.</p>
              </div>
              <div className="rounded-[1.75rem] bg-white p-5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">Biggest gap</p>
                <p className="mt-3 text-sm font-semibold leading-7 text-foreground">{shortlistDecisionSummary.topGap}</p>
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {coach ? (
        <section className="rounded-[2.5rem] bg-[linear-gradient(135deg,#fff8ef_0%,#fffdf8_45%,#eefaf5_100%)] p-8 shadow-panel sm:p-10">
          <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr] xl:items-start">
            <div>
              <p className="editorial-kicker">{coach.eyebrow}</p>
              <h3 className="mt-4 font-[var(--font-display)] text-3xl font-black tracking-tight text-foreground sm:text-4xl">{coach.title}</h3>
              <p className="mt-4 max-w-3xl text-sm leading-8 text-muted-foreground">{coach.description}</p>
              <div className="mt-6 flex flex-wrap gap-3">
                {'primaryAction' in coach ? (
                  <button
                    type="button"
                    onClick={() => {
                      trackCoachAction('primary', coach.primaryActionKey)
                      if (typeof coach.primaryAction === 'function') {
                        coach.primaryAction()
                      }
                    }}
                    className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground"
                  >
                    <Scale className="h-4 w-4" />
                    {coach.primaryLabel}
                  </button>
                ) : (
                  <Link
                    href={coach.primaryHref}
                    onClick={() => trackCoachAction('primary', coach.primaryActionKey)}
                    className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground"
                  >
                    {coach.primaryLabel}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                )}
                <Link
                  href={coach.secondaryHref}
                  onClick={() => trackCoachAction('secondary', coach.secondaryActionKey)}
                  className="inline-flex min-h-[44px] items-center justify-center rounded-full border border-border bg-white px-5 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
                >
                  {coach.secondaryLabel}
                </Link>
              </div>
            </div>

            <div className="grid gap-4">
              {coach.highlights.map((highlight) => (
                <div key={highlight} className="rounded-[1.75rem] bg-white p-5">
                  <p className="text-sm leading-7 text-foreground">{highlight}</p>
                </div>
              ))}
              <div className="rounded-[1.75rem] border border-emerald-200 bg-emerald-50/80 p-5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-700">Coach Read</p>
                <p className="mt-3 text-sm leading-7 text-emerald-950">{coach.emphasis}</p>
              </div>
            </div>
          </div>
        </section>
      ) : null}

      <section className="space-y-5">
        <div id="saved-candidates" className="flex items-center justify-between gap-4">
          <div>
            <p className="editorial-kicker">Saved Candidates</p>
            <h3 className="mt-3 font-[var(--font-display)] text-3xl font-black tracking-tight text-foreground">Your shortlist workspace</h3>
          </div>
        </div>

        {shortlist.length ? (
          <div className="grid gap-6 xl:grid-cols-2">
            {shortlist.map((item) => {
              const decisionState = shortlistDecisionStates.get(item.id)

              return (
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
                        <div className="flex items-start justify-between gap-3">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">
                            {item.category ? item.category.replace(/-/g, ' ') : 'Buyer shortlist'}
                          </p>
                          {decisionState ? (
                            <span className={`rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] ${getDecisionBadgeClass(decisionState.stage)}`}>
                              {decisionState.label} · {decisionState.score}
                            </span>
                          ) : null}
                        </div>
                        <h4 className="font-[var(--font-display)] text-3xl font-black tracking-tight text-foreground">{item.productName}</h4>
                        <p className="text-sm leading-7 text-muted-foreground">
                          {item.description || 'Saved for later review. Open the deep-dive or merchant page when you are ready to continue.'}
                        </p>
                      </div>

                      {decisionState?.whySaved.length ? (
                        <div className="flex flex-wrap gap-2">
                          {decisionState.whySaved.slice(0, 3).map((tag) => (
                            <span key={`${item.id}-${tag}`} className="rounded-full bg-muted px-3 py-1 text-[11px] font-medium text-foreground">
                              {tag}
                            </span>
                          ))}
                        </div>
                      ) : null}

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

                      {decisionState ? (
                        <div className={`rounded-[1.25rem] border p-4 ${getDecisionBadgeClass(decisionState.stage)}`}>
                          <p className="text-[10px] font-bold uppercase tracking-[0.2em]">Decision read</p>
                          <p className="mt-2 text-sm font-semibold leading-7">{decisionState.note}</p>
                          {decisionState.gaps[0] ? (
                            <p className="mt-2 text-xs leading-6 opacity-80">Watchout: {decisionState.gaps[0]}</p>
                          ) : null}
                        </div>
                      ) : null}

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
                          onClick={() => toggleCompare(item, 'shortlist-workspace-card')}
                          className={`inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full border px-4 text-sm font-semibold transition-colors ${
                            compare.some((candidate) => candidate.id === item.id) ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-white text-foreground hover:bg-muted'
                          }`}
                        >
                          <Scale className="h-4 w-4" />
                          {compare.some((candidate) => candidate.id === item.id) ? 'In compare' : 'Add to compare'}
                        </button>
                        {item.resolvedUrl ? (
                          <Link
                            href={buildTrackedMerchantExitPath(item.id, 'shortlist-workspace')}
                            target="_blank"
                            prefetch={false}
                            onClick={() =>
                              trackDecisionEvent({
                                eventType: 'merchant_cta_click',
                                source: 'shortlist-workspace',
                                productId: item.id
                              })
                            }
                            className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full border border-border px-4 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
                          >
                            Check price
                            <ExternalLink className="h-4 w-4" />
                          </Link>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => removeShortlist(item.id, 'shortlist-workspace-card')}
                          className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full border border-border px-4 text-sm font-semibold text-muted-foreground transition-colors hover:bg-muted"
                        >
                          <Trash2 className="h-4 w-4" />
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                </article>
              )
            })}
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
        <div id="decision-matrix" className="rounded-[2.5rem] bg-white p-8 shadow-panel sm:p-10">
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
                    onClick={() => toggleCompare(item, 'shortlist-workspace-queue')}
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
