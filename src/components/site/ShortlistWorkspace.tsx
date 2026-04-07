'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, BellRing, Copy, ExternalLink, RefreshCcw, Scale, Share2, Trash2 } from 'lucide-react'
import { DecisionReasonPanel } from '@/components/site/DecisionReasonPanel'
import { toast } from 'sonner'
import { useShortlist } from '@/components/site/ShortlistProvider'
import { buildTrackedMerchantExitPath, trackDecisionEvent } from '@/lib/decision-tracking'
import { formatEditorialDate } from '@/lib/editorial'
import {
  buildShortlistBuyingBrief,
  buildShortlistComparisonSummary,
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

function getCategoryLabel(item: ShortlistItem | undefined) {
  return item?.category ? item.category.replace(/-/g, ' ') : 'Saved shortlist'
}

function buildCategoryAlertHref(
  item: ShortlistItem | undefined,
  intent: 'price-alert' | 'category-brief' | 'deals' = 'price-alert',
  cadence: 'priority' | 'weekly' = 'priority'
) {
  if (!item?.category) {
    return `/newsletter?intent=${intent === 'category-brief' ? 'deals' : intent}&cadence=${cadence}`
  }

  const params = new URLSearchParams({
    intent,
    category: item.category,
    cadence
  })

  return `/newsletter?${params.toString()}`
}

const DECISION_STAGE_PRIORITY: Record<ReturnType<typeof getShortlistDecisionState>['stage'], number> = {
  finalist: 4,
  'compare-ready': 3,
  'needs-check': 2,
  'signal-building': 1
}

type ShortlistDecisionPath = {
  key: string
  label: string
  items: ShortlistItem[]
  recommendedItems: ShortlistItem[]
  activeCompareItems: ShortlistItem[]
  summary: ReturnType<typeof summarizeShortlist>
  readiness: ReturnType<typeof summarizeShortlistDecisionReadiness>
}

function buildDecisionPaths(items: ShortlistItem[], compareIds: number[]): ShortlistDecisionPath[] {
  const groups = items.reduce((result, item) => {
    const key = item.category || '__buyer-shortlist__'
    const current = result.get(key) || []
    current.push(item)
    result.set(key, current)
    return result
  }, new Map<string, ShortlistItem[]>())

  return Array.from(groups.entries())
    .map(([key, groupItems]) => {
      const groupIds = new Set(groupItems.map((item) => item.id))
      const pathCompareIds = compareIds.filter((id) => groupIds.has(id))
      const stateMap = new Map(
        groupItems.map((item) => [
          item.id,
          getShortlistDecisionState(item, {
            shortlistSize: groupItems.length,
            compareIds: pathCompareIds
          })
        ])
      )
      const recommendedItems = groupItems
        .slice()
        .sort((left, right) => {
          const leftState = stateMap.get(left.id)
          const rightState = stateMap.get(right.id)
          const stageDelta = (DECISION_STAGE_PRIORITY[rightState?.stage || 'signal-building'] || 0) - (DECISION_STAGE_PRIORITY[leftState?.stage || 'signal-building'] || 0)
          if (stageDelta !== 0) return stageDelta

          const scoreDelta = (rightState?.score || 0) - (leftState?.score || 0)
          if (scoreDelta !== 0) return scoreDelta

          return (right.reviewCount || 0) - (left.reviewCount || 0)
        })
        .slice(0, Math.min(groupItems.length, 3))

      return {
        key,
        label: getCategoryLabel(groupItems[0]),
        items: groupItems,
        recommendedItems,
        activeCompareItems: groupItems.filter((item) => compareIds.includes(item.id)),
        summary: summarizeShortlist(groupItems),
        readiness: summarizeShortlistDecisionReadiness(groupItems, pathCompareIds)
      }
    })
    .sort((left, right) => {
      if (right.items.length !== left.items.length) return right.items.length - left.items.length
      return right.readiness.averageScore - left.readiness.averageScore
    })
}

function getDecisionBadgeClass(stage: ReturnType<typeof getShortlistDecisionState>['stage']) {
  if (stage === 'finalist') return 'border-emerald-300 bg-emerald-50 text-emerald-900'
  if (stage === 'compare-ready') return 'border-primary/25 bg-primary/10 text-primary'
  if (stage === 'needs-check') return 'border-amber-300 bg-amber-50 text-amber-900'
  return 'border-slate-200 bg-slate-100 text-slate-700'
}

type RankedShortlistEntry = {
  item: ShortlistItem
  state: ReturnType<typeof getShortlistDecisionState>
  inCompare: boolean
}

function compareRankedShortlistEntries(left: RankedShortlistEntry, right: RankedShortlistEntry) {
  const stageDelta = (DECISION_STAGE_PRIORITY[right.state.stage] || 0) - (DECISION_STAGE_PRIORITY[left.state.stage] || 0)
  if (stageDelta !== 0) return stageDelta

  const scoreDelta = right.state.score - left.state.score
  if (scoreDelta !== 0) return scoreDelta

  return (right.item.reviewCount || 0) - (left.item.reviewCount || 0)
}

function pickBestValueEntry(entries: RankedShortlistEntry[]) {
  const pricedEntries = entries.filter(
    (entry) =>
      entry.item.priceAmount !== null &&
      entry.item.priceAmount !== undefined &&
      Number.isFinite(entry.item.priceAmount) &&
      entry.item.priceAmount > 0
  )

  if (!pricedEntries.length) return entries[0] || null

  const prices = pricedEntries.map((entry) => entry.item.priceAmount as number)
  const minPrice = Math.min(...prices)
  const maxPrice = Math.max(...prices)
  const spread = Math.max(1, maxPrice - minPrice)

  return pricedEntries
    .slice()
    .sort((left, right) => {
      const leftValueScore = left.state.score + ((maxPrice - (left.item.priceAmount as number)) / spread) * 18
      const rightValueScore = right.state.score + ((maxPrice - (right.item.priceAmount as number)) / spread) * 18

      if (rightValueScore !== leftValueScore) return rightValueScore - leftValueScore
      return compareRankedShortlistEntries(left, right)
    })[0]
}

function pickBestWaitEntry(entries: RankedShortlistEntry[], excludedIds: number[] = []) {
  const filteredEntries = entries.filter((entry) => !excludedIds.includes(entry.item.id))
  const source = filteredEntries.length ? filteredEntries : entries

  return source
    .slice()
    .sort((left, right) => {
      const leftWaitScore =
        left.state.score +
        (left.inCompare ? 0 : 8) +
        (left.item.priceAmount ? 8 : 0) +
        (left.state.gaps.some((gap) => gap.toLowerCase().includes('price')) ? 14 : 0) +
        (left.state.gaps.some((gap) => gap.toLowerCase().includes('fresher') || gap.toLowerCase().includes('newer check')) ? 6 : 0)
      const rightWaitScore =
        right.state.score +
        (right.inCompare ? 0 : 8) +
        (right.item.priceAmount ? 8 : 0) +
        (right.state.gaps.some((gap) => gap.toLowerCase().includes('price')) ? 14 : 0) +
        (right.state.gaps.some((gap) => gap.toLowerCase().includes('fresher') || gap.toLowerCase().includes('newer check')) ? 6 : 0)

      if (rightWaitScore !== leftWaitScore) return rightWaitScore - leftWaitScore
      return compareRankedShortlistEntries(left, right)
    })[0] || null
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
        <h1 className="font-[var(--font-display)] text-4xl font-black tracking-tight text-foreground sm:text-5xl">
          Keep your shortlist across visits.
        </h1>
        <p className="text-sm text-muted-foreground">Loading your shortlist...</p>
      </div>
    )
  }

  if (!shortlist.length && !hasSharedItems) {
    return (
      <div className="rounded-[2.5rem] bg-white p-10 text-center shadow-panel sm:p-14">
        <p className="editorial-kicker">Shortlist</p>
        <h1 className="mt-4 font-[var(--font-display)] text-4xl font-black tracking-tight text-foreground">No saved picks yet.</h1>
        <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-muted-foreground">
          Save products from search, category pages, deals, or product pages to keep your shortlist stable across visits.
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
  const shortlistDecisionEntries = shortlist
    .map((item) => ({
      item,
      state: shortlistDecisionStates.get(item.id),
      inCompare: compareIds.includes(item.id)
    }))
    .filter((entry): entry is RankedShortlistEntry => Boolean(entry.state))
    .sort(compareRankedShortlistEntries)
  const sharedDecisionStates = new Map(
    sharedItems.map((item) => [
      item.id,
      getShortlistDecisionState(item, {
        shortlistSize: sharedItems.length
      })
    ])
  )
  const decisionPaths = buildDecisionPaths(shortlist, compareIds)
  const dominantDecisionPath = decisionPaths[0]
  const compareCategoryCount = new Set(compare.map((item) => item.category || '__buyer-shortlist__')).size
  const compareMixesCategories = compare.length >= 2 && compareCategoryCount > 1
  const compareCandidates = shortlist.slice(0, Math.min(shortlist.length, 3))
  const compareCandidateNames = buildProductRollup(compareCandidates)
  const bestCurrentEntry = shortlistDecisionEntries[0] || null
  const rawBestValueEntry = pickBestValueEntry(shortlistDecisionEntries)
  const bestValueEntry = rawBestValueEntry && rawBestValueEntry.item.id !== bestCurrentEntry?.item.id
    ? rawBestValueEntry
    : shortlistDecisionEntries.find((entry) => entry.item.id !== bestCurrentEntry?.item.id) || rawBestValueEntry || bestCurrentEntry
  const bestWaitEntry = pickBestWaitEntry(
    shortlistDecisionEntries,
    [bestCurrentEntry?.item.id, bestValueEntry?.item.id].filter((value): value is number => Boolean(value))
  ) || shortlistDecisionEntries.find((entry) => entry.item.id !== bestCurrentEntry?.item.id) || bestCurrentEntry
  const decisionDeskCompareItems = compareCount >= 2
    ? compare.slice(0, 2)
    : dominantDecisionPath?.recommendedItems.slice(0, 2) || shortlist.slice(0, 2)
  const searchForAlternativesHref = buildCategoryHubHref(shortlist[0])
  const leadDecisionItem = compare[0] || dominantDecisionPath?.recommendedItems[0] || shortlist[0]
  const alertAnchorItem = dominantDecisionPath?.items[0] || compare[0] || shortlist[0]
  const outcomeCards = shortlist.length
    ? [
        {
          eyebrow: 'Validate',
          title: leadDecisionItem ? `Open ${leadDecisionItem.productName}` : 'Open the strongest saved pick',
          description: 'Use the lead product page when you want one last buyer-fit check before compare or checkout.',
          href: getShortlistProductPath(leadDecisionItem),
          label: 'Open details'
        },
        compareCount >= 2
          ? {
              eyebrow: 'Compare',
              title: 'Finish comparing your top picks',
              description: 'You already have enough picks in compare. Stay in the table until one winner feels obvious.',
              href: '/shortlist#decision-matrix',
              label: 'Jump to matrix'
            }
          : compareCandidates.length >= 2
            ? {
                eyebrow: 'Compare',
                title: 'Move saved picks into compare',
                description: 'You already have enough saved picks to stop collecting and start comparing.',
                action: () => setCompareFromItems(compareCandidates, 'shortlist-outcome-cards'),
                label: `Load ${compareCandidates.length} into compare`
              }
            : {
                eyebrow: 'Compare',
                title: 'Add one more option',
                description: 'You still need a tighter shortlist before compare becomes useful. Pull one more option from the same category first.',
                href: searchForAlternativesHref,
                label: 'Browse this category'
              },
        {
          eyebrow: 'Wait',
          title: alertAnchorItem?.category ? `Track ${getCategoryLabel(alertAnchorItem)}` : 'Start price alerts',
          description: 'If timing is the issue, switch from active shopping into a price alert instead of losing your place.',
          href: buildCategoryAlertHref(alertAnchorItem, 'price-alert', 'priority'),
          label: 'Start price watch'
        },
        comparisonSearchHref && compareCount >= 2
          ? {
              eyebrow: 'Publish',
              title: 'Find a written comparison',
              description: 'If the shortlist is close but you want one more written take, search for a Bes3 comparison page next.',
              href: comparisonSearchHref,
              label: 'Search comparisons'
            }
          : {
              eyebrow: 'Browse',
              title: alertAnchorItem?.category ? `Reopen ${getCategoryLabel(alertAnchorItem)}` : 'Reopen the directory',
              description: 'Return to the category page when the shortlist still needs stronger context before you keep choosing.',
              href: buildCategoryHubHref(alertAnchorItem),
              label: 'Open category page'
            }
      ]
    : []
  const sharedBriefPreview = sharedSummary
    ? [
        `${sharedSummary.overview} ${sharedSummary.decisionNote}`,
        sharedDecisionSummary ? `What matters most: ${sharedDecisionSummary.decisionLens}` : '',
        `Strongest reason: ${sharedSummary.strongestSignal}`,
        `Included picks: ${buildProductRollup(sharedItems)}.`
      ].filter(Boolean).join('\n')
    : ''
  const comparisonSummary = buildShortlistComparisonSummary(compare)
  const coachSource = 'shortlist-decision-coach'
  const coach = shortlist.length === 1
    ? {
        variant: 'expand-options',
        eyebrow: 'Shortlist Coach',
        title: 'Add one more option before you decide.',
        description: 'One saved product is still a preference, not a real choice. Add at least one similar option so the tradeoffs are easier to see.',
        primaryLabel: shortlist[0]?.category ? 'Browse this category' : 'Browse the directory',
        primaryHref: searchForAlternativesHref,
        primaryActionKey: 'browse-category',
        secondaryLabel: 'Open saved pick',
        secondaryHref: getShortlistProductPath(shortlist[0]),
        secondaryActionKey: 'open-saved-pick',
        highlights: [
          'Best next move: find one similar option in the same category.',
          `Current saved pick: ${shortlist[0]?.productName || 'Your saved product'}.`
        ],
        emphasis: 'Keep collecting for now, but stop once you have a second real option.'
      }
    : shortlist.length >= 2 && compareCount < 2
      ? {
          variant: 'start-compare',
          eyebrow: 'Shortlist Coach',
          title: 'Turn your shortlist into a side-by-side compare.',
          description: 'You already have enough picks to stop collecting and start choosing. Load the strongest saved picks into compare and keep the rest as backups.',
          primaryLabel: `Load ${compareCandidates.length} ${compareCandidates.length === 1 ? 'pick' : 'picks'} into compare`,
          primaryAction: () => setCompareFromItems(compareCandidates, 'shortlist-decision-coach'),
          primaryActionKey: 'load-compare',
          secondaryLabel: 'Review saved picks',
          secondaryHref: '/shortlist#saved-candidates',
          secondaryActionKey: 'review-saved-candidates',
          highlights: [
            `Recommended picks: ${compareCandidateNames}.`,
            'Bes3 uses your most recently saved picks first, capped at three.'
          ],
          emphasis: 'You already have enough here to compare. Adding more now will probably create noise, not clarity.'
        }
      : compareCount >= 2
        ? {
            variant: 'close-decision',
            eyebrow: 'Shortlist Coach',
            title: 'Your top picks are ready for a choice.',
            description: 'Keep compare tight, review the table, then move to a comparison page or store prices once the tradeoffs feel clear.',
            primaryLabel: 'Jump to compare table',
            primaryHref: '/shortlist#decision-matrix',
            primaryActionKey: 'jump-decision-matrix',
            secondaryLabel: comparisonSearchHref ? 'Search for a comparison page' : 'Open compare list',
            secondaryHref: comparisonSearchHref || '/shortlist#compare-queue',
            secondaryActionKey: comparisonSearchHref ? 'search-published-comparison' : 'open-compare-queue',
            highlights: [
              `Active picks in compare: ${buildProductRollup(compare)}.`,
              compareCount < shortlist.length ? `${shortlist.length - compareCount} saved ${shortlist.length - compareCount === 1 ? 'backup remains' : 'backups remain'} outside compare.` : 'Your shortlist and compare set are currently aligned.'
            ],
            emphasis: 'You already have enough proof to choose. The next gain comes from a cleaner compare, not more candidates.'
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
    const copied = await copyText(sharedBuyingBrief, setIsCopyingBrief, 'Summary copied', 'Unable to copy the summary')
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
          <p className="editorial-kicker">Saved Shortlist</p>
          <h1 className="mt-4 font-[var(--font-display)] text-4xl font-black tracking-tight text-foreground sm:text-5xl">Keep your shortlist across visits.</h1>
          <p className="mt-4 max-w-3xl text-sm leading-8 text-muted-foreground">
            Bes3 now remembers your saved products locally, so you can collect strong options, return later, and continue comparing without starting over.
          </p>
        </div>
        <div className="rounded-[2.5rem] bg-[linear-gradient(135deg,#0f172a_0%,#1d4ed8_55%,#0f766e_100%)] p-8 text-white shadow-[0_35px_80px_-45px_rgba(15,23,42,0.8)]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-emerald-200">Shortlist Status</p>
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
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-200/85">Ready to compare</p>
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

      {shortlist.length ? (
        <section className="rounded-[2.5rem] bg-[linear-gradient(135deg,#fff8ef_0%,#f8fbff_48%,#eefaf5_100%)] p-8 shadow-panel sm:p-10">
          <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr] xl:items-start">
            <div>
              <p className="editorial-kicker">Decision Desk</p>
              <h2 className="mt-4 font-[var(--font-display)] text-3xl font-black tracking-tight text-foreground sm:text-4xl">
                Current best calls for {dominantDecisionPath?.label || 'your shortlist'}.
              </h2>
              <p className="mt-4 max-w-3xl text-sm leading-8 text-muted-foreground">
                {dominantDecisionPath?.readiness.note || shortlistDecisionSummary.note} Use this summary to decide whether your next move is opening one product, loading compare, or switching into a price watch.
              </p>
              <div className="mt-6 rounded-[1.75rem] bg-slate-950 p-5 text-white">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-200">Recommended track</p>
                <p className="mt-3 text-sm leading-7 text-slate-200">
                  {dominantDecisionPath?.recommendedItems.length
                    ? `${dominantDecisionPath.recommendedItems.map((item) => item.productName).join(' → ')}.`
                    : 'Keep your shortlist narrow enough that the next move stays obvious.'}
                </p>
                <p className="mt-4 text-sm leading-7 text-slate-200">{shortlistDecisionSummary.nextAction}</p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3 xl:grid-cols-1">
              <div className="rounded-[1.75rem] bg-white p-5">
                <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-primary">Most reliable now</p>
                <h3 className="mt-3 font-[var(--font-display)] text-2xl font-black tracking-tight text-foreground">
                  {bestCurrentEntry?.item.productName || 'Open your strongest saved pick'}
                </h3>
                <p className="mt-3 text-sm leading-7 text-muted-foreground">
                  {bestCurrentEntry?.state.note || 'Use the strongest saved pick as your first decision checkpoint.'}
                </p>
                {bestCurrentEntry?.state.whySaved.length ? (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {bestCurrentEntry.state.whySaved.slice(0, 3).map((reason) => (
                      <span key={`current-${reason}`} className="rounded-full bg-muted px-3 py-1 text-[11px] font-medium text-foreground">
                        {reason}
                      </span>
                    ))}
                  </div>
                ) : null}
                <Link href={getShortlistProductPath(bestCurrentEntry?.item || shortlist[0])} className="mt-5 inline-flex text-sm font-semibold text-primary">
                  Open details →
                </Link>
              </div>

              <div className="rounded-[1.75rem] bg-white p-5">
                <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-primary">Best value signal</p>
                <h3 className="mt-3 font-[var(--font-display)] text-2xl font-black tracking-tight text-foreground">
                  {bestValueEntry?.item.productName || 'Pick the strongest low-regret option'}
                </h3>
                <p className="mt-3 text-sm leading-7 text-muted-foreground">
                  {bestValueEntry
                    ? `${formatPriceSnapshot(bestValueEntry.item.priceAmount, bestValueEntry.item.priceCurrency || 'USD')} with a ${bestValueEntry.state.score}/100 decision score.`
                    : 'Use price as a tie-breaker only after the shortlist is strong enough to compare honestly.'}
                </p>
                <p className="mt-3 text-sm leading-7 text-muted-foreground">
                  {decisionDeskCompareItems.length >= 2
                    ? `Best next compare pair: ${decisionDeskCompareItems.map((item) => item.productName).join(' vs ')}.`
                    : bestValueEntry?.state.note || 'Keep the shortlist narrow, then use compare to pressure-test the value call.'}
                </p>
                {decisionDeskCompareItems.length >= 2 ? (
                  compareCount >= 2 ? (
                    <Link href="/shortlist#decision-matrix" className="mt-5 inline-flex text-sm font-semibold text-primary">
                      Jump to compare →
                    </Link>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setCompareFromItems(decisionDeskCompareItems, 'shortlist-decision-desk')}
                      className="mt-5 inline-flex text-sm font-semibold text-primary"
                    >
                      Load compare →
                    </button>
                  )
                ) : (
                  <Link href={buildCategoryHubHref(bestValueEntry?.item)} className="mt-5 inline-flex text-sm font-semibold text-primary">
                    Browse one more option →
                  </Link>
                )}
              </div>

              <div className="rounded-[1.75rem] bg-white p-5">
                <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-primary">Best one to wait on</p>
                <h3 className="mt-3 font-[var(--font-display)] text-2xl font-black tracking-tight text-foreground">
                  {bestWaitEntry?.item.productName || 'Switch into a price watch'}
                </h3>
                <p className="mt-3 text-sm leading-7 text-muted-foreground">
                  {bestWaitEntry?.state.gaps[0]
                    ? `${bestWaitEntry.state.gaps[0]}. If timing is the only blocker, keep this candidate warm instead of restarting later.`
                    : `${shortlistDecisionSummary.topGap} If price timing is the issue, preserve this shortlist with an alert instead of reopening discovery.`}
                </p>
                <p className="mt-3 text-sm leading-7 text-muted-foreground">
                  Best alert anchor: {bestWaitEntry?.item.category ? getCategoryLabel(bestWaitEntry.item) : 'your current shortlist'}.
                </p>
                <Link
                  href={buildCategoryAlertHref(bestWaitEntry?.item || alertAnchorItem, 'price-alert', 'priority')}
                  className="mt-5 inline-flex text-sm font-semibold text-primary"
                >
                  Start price watch →
                </Link>
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {shortlist.length ? (
        <DecisionReasonPanel
          eyebrow="Resume your task"
          title="Use the shortlist to decide, not just to store picks."
          description="This page should tell you what to do next based on where the shortlist stands right now: choose, compare, or wait for price."
          cards={[
            {
              eyebrow: 'Choose now',
              title: leadDecisionItem ? `Start with ${leadDecisionItem.productName}` : 'Open the strongest saved pick',
              description: leadDecisionItem
                ? 'This is the strongest current candidate if you want one more fit check before clicking through or comparing.'
                : 'Use the lead saved pick as the first checkpoint instead of reopening broad browsing.'
            },
            {
              eyebrow: 'Compare next',
              title: compareCount >= 2 ? 'Your finalists are already loaded' : compareCandidates.length >= 2 ? `Load ${compareCandidates.length} picks into compare` : 'Add one more serious option',
              description: compareCount >= 2
                ? 'The shortlist is narrow enough that the next gain comes from a cleaner compare, not more collecting.'
                : compareCandidates.length >= 2
                  ? 'You already have enough saved picks to stop collecting and start comparing side by side.'
                  : 'One saved pick is still a preference. Add one nearby option before trying to decide.'
            },
            {
              eyebrow: 'Wait instead',
              title: alertAnchorItem?.category ? `Track ${getCategoryLabel(alertAnchorItem)}` : 'Switch to a price watch',
              description: alertAnchorItem?.category
                ? `If timing is the only blocker, keep this ${getCategoryLabel(alertAnchorItem)} task alive with a price watch instead of losing the thread.`
                : 'If price is the blocker, save the work and switch into alerts instead of starting over later.',
              tone: 'strong'
            }
          ]}
        />
      ) : null}

      {hasSharedItems ? (
        <section className="rounded-[2.5rem] bg-[linear-gradient(180deg,#f8fbff,#eef4ff)] p-8 shadow-panel sm:p-10">
          <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
            <div className="rounded-[2rem] bg-white p-7 sm:p-8">
              <p className="editorial-kicker">Shared Shortlist</p>
              <h3 className="mt-4 font-[var(--font-display)] text-3xl font-black tracking-tight text-foreground sm:text-4xl">
                Someone sent you {sharedItems.length} saved {sharedItems.length === 1 ? 'pick' : 'picks'}.
              </h3>
              <p className="mt-4 max-w-3xl text-sm leading-8 text-muted-foreground">
                {sharedSummary?.overview} {sharedSummary?.decisionNote} Review the incoming candidates below, then add them to your own shortlist or replace your current shortlist if this shared set is stronger.
              </p>
              <div className="mt-6 rounded-[1.75rem] bg-slate-950 p-5 text-white">
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-emerald-200">Strongest reason</p>
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
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">Review proof</p>
                <p className="mt-3 text-3xl font-black text-foreground">{sharedSummary?.buyerProofLabel}</p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {sharedSummary?.averageRating
                    ? `Average rating ${sharedSummary.averageRatingLabel}.`
                    : sharedSummary?.buyerProofNote}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-6 rounded-[2rem] bg-[linear-gradient(135deg,#0f172a_0%,#1e293b_48%,#14532d_100%)] p-6 text-white shadow-[0_30px_70px_-45px_rgba(15,23,42,0.92)] sm:p-7">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="max-w-3xl">
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-emerald-200">Shopping Summary</p>
                <h4 className="mt-3 font-[var(--font-display)] text-2xl font-black tracking-tight text-white">Ready to paste into notes, chat, or email.</h4>
                <p className="mt-3 whitespace-pre-line text-sm leading-7 text-slate-200">{sharedBriefPreview}</p>
              </div>
              <button
                type="button"
                onClick={copyBuyingBrief}
                className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full border border-white/20 px-4 text-sm font-semibold text-white transition-colors hover:bg-white/10"
              >
                <Copy className="h-4 w-4" />
                {isCopyingBrief ? 'Copying...' : 'Copy summary'}
              </button>
            </div>
          </div>

          <div className="mt-8 flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl">
              <p className="text-sm leading-8 text-muted-foreground">
                Use these actions to add the shared set to your own shortlist, replace your current shortlist, or move the incoming picks straight into compare.
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
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">{item.category ? item.category.replace(/-/g, ' ') : 'Saved shortlist'}</p>
                    {decisionState ? (
                      <span className={`rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] ${getDecisionBadgeClass(decisionState.stage)}`}>
                        {decisionState.label} · {decisionState.score}
                      </span>
                    ) : null}
                  </div>
                  <h4 className="mt-3 font-[var(--font-display)] text-2xl font-black tracking-tight text-foreground">{item.productName}</h4>
                  <p className="mt-3 text-sm leading-7 text-muted-foreground">
                    {item.reviewHighlights[0] || item.description || 'Shared as part of a Bes3 shortlist.'}
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
              <p className="editorial-kicker">Shortlist Status</p>
              <h3 className="mt-4 font-[var(--font-display)] text-3xl font-black tracking-tight text-foreground sm:text-4xl">
                {shortlistDecisionSummary.label}
              </h3>
              <p className="mt-4 max-w-3xl text-sm leading-8 text-muted-foreground">{shortlistDecisionSummary.note}</p>
              <div className="mt-6 rounded-[1.75rem] bg-slate-950 p-5 text-white">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-200">What matters most</p>
                <p className="mt-3 text-sm leading-7 text-slate-200">{shortlistDecisionSummary.decisionLens}</p>
                <p className="mt-5 text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-200">Next move</p>
                <p className="mt-3 text-sm leading-7 text-slate-200">{shortlistDecisionSummary.nextAction}</p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-[1.75rem] bg-white p-5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">Average score</p>
                <p className="mt-3 text-3xl font-black text-foreground">{shortlistDecisionSummary.averageScore}/100</p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">A blend of price, recent checks, and how complete this shortlist is.</p>
              </div>
              <div className="rounded-[1.75rem] bg-white p-5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">Compared now</p>
                <p className="mt-3 text-3xl font-black text-foreground">{shortlistDecisionSummary.finalistCount}</p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">Products already moved into compare.</p>
              </div>
              <div className="rounded-[1.75rem] bg-white p-5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">Needs a check</p>
                <p className="mt-3 text-3xl font-black text-foreground">{shortlistDecisionSummary.needsCheckCount + shortlistDecisionSummary.buildingCount}</p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">Saved picks that still need a closer look before they move into compare.</p>
              </div>
              <div className="rounded-[1.75rem] bg-white p-5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">Biggest gap</p>
                <p className="mt-3 text-sm font-semibold leading-7 text-foreground">{shortlistDecisionSummary.topGap}</p>
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {outcomeCards.length ? (
        <section className="rounded-[2.5rem] bg-[linear-gradient(135deg,#fff8ef_0%,#f8fbff_48%,#eefaf5_100%)] p-8 shadow-panel sm:p-10">
          <div className="grid gap-6 xl:grid-cols-[1fr_0.95fr] xl:items-start">
            <div>
              <p className="editorial-kicker">Next Steps</p>
              <h3 className="mt-4 font-[var(--font-display)] text-3xl font-black tracking-tight text-foreground sm:text-4xl">
                Choose whether to compare now, look closer, or wait.
              </h3>
              <p className="mt-4 max-w-3xl text-sm leading-8 text-muted-foreground">
                A saved list only matters if it helps you move forward. Use these next steps to compare your top picks, look closer at the lead pick, or wait for a better price without losing your place.
              </p>
              <div className="mt-6 rounded-[1.75rem] bg-slate-950 p-5 text-white">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-200">Best next step</p>
                <p className="mt-3 text-sm leading-7 text-slate-200">
                  {compareCount >= 2
                    ? 'Your shortlist already has picks in compare. Compare now if the choice is close, or switch to a price alert if price is the only thing left.'
                    : shortlist.length >= 2
                      ? 'This shortlist already has enough picks to compare. If you are still hesitating, validate the lead pick or set alerts instead of adding more noise.'
                      : 'One saved product is not a real choice yet. Either validate it with the product page or go back to the category and add one more option.'}
                </p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {outcomeCards.map((card) =>
                'action' in card ? (
                  <button
                    key={card.title}
                    type="button"
                    onClick={card.action}
                    className="rounded-[1.75rem] bg-white p-6 text-left shadow-[0_24px_60px_-40px_rgba(15,23,42,0.35)] transition-transform hover:-translate-y-1"
                  >
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">{card.eyebrow}</p>
                    <h4 className="mt-3 font-[var(--font-display)] text-2xl font-black tracking-tight text-foreground">{card.title}</h4>
                    <p className="mt-3 text-sm leading-7 text-muted-foreground">{card.description}</p>
                    <p className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-primary">
                      <Scale className="h-4 w-4" />
                      {card.label}
                    </p>
                  </button>
                ) : (
                  <Link
                    key={card.title}
                    href={card.href}
                    className="rounded-[1.75rem] bg-white p-6 shadow-[0_24px_60px_-40px_rgba(15,23,42,0.35)] transition-transform hover:-translate-y-1"
                  >
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">{card.eyebrow}</p>
                    <h4 className="mt-3 font-[var(--font-display)] text-2xl font-black tracking-tight text-foreground">{card.title}</h4>
                    <p className="mt-3 text-sm leading-7 text-muted-foreground">{card.description}</p>
                    <p className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-primary">
                      {card.eyebrow === 'Wait' ? <BellRing className="h-4 w-4" /> : <ArrowRight className="h-4 w-4" />}
                      {card.label}
                    </p>
                  </Link>
                )
              )}
            </div>
          </div>
        </section>
      ) : null}

      {decisionPaths.length > 1 ? (
        <section id="decision-paths" className="rounded-[2.5rem] bg-[linear-gradient(135deg,#fff8ef_0%,#f8fbff_50%,#eefaf5_100%)] p-8 shadow-panel sm:p-10">
          <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr] xl:items-start">
            <div>
              <p className="editorial-kicker">Category Groups</p>
              <h3 className="mt-4 font-[var(--font-display)] text-3xl font-black tracking-tight text-foreground sm:text-4xl">
                Split unlike products into clean groups.
              </h3>
              <p className="mt-4 max-w-3xl text-sm leading-8 text-muted-foreground">
                {compareMixesCategories
                  ? 'Your active compare list mixes categories. Keep picks in the same category so the table stays fair and easy to read.'
                  : `Your shortlist spans ${decisionPaths.length} category groups. Treat each category as its own shopping choice instead of forcing unrelated products into one compare view.`}
              </p>
              <div className="mt-6 rounded-[1.75rem] bg-slate-950 p-5 text-white">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-200">Best group to focus on</p>
                <p className="mt-3 text-2xl font-black">{dominantDecisionPath?.label || 'Saved shortlist'}</p>
                <p className="mt-3 text-sm leading-7 text-slate-200">
                  {dominantDecisionPath?.readiness.note || 'Choose one same-category group first, then narrow the top picks inside it.'}
                </p>
              </div>
              <div className="mt-6 flex flex-wrap gap-3">
                {dominantDecisionPath && dominantDecisionPath.recommendedItems.length >= 2 ? (
                  <button
                    type="button"
                    onClick={() => setCompareFromItems(dominantDecisionPath.recommendedItems, 'shortlist-decision-paths')}
                    className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground"
                  >
                    <Scale className="h-4 w-4" />
                    Compare only {dominantDecisionPath.label}
                  </button>
                ) : null}
                <Link
                  href={buildCategoryHubHref(dominantDecisionPath?.items[0])}
                  className="inline-flex min-h-[44px] items-center justify-center rounded-full border border-border bg-white px-5 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
                >
                  Browse {dominantDecisionPath?.label || 'this category'}
                </Link>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-[1.75rem] bg-white p-5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">Groups</p>
                <p className="mt-3 text-3xl font-black text-foreground">{decisionPaths.length}</p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">Separate these by category before you let compare drive the final choice.</p>
              </div>
              <div className="rounded-[1.75rem] bg-white p-5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">Main group</p>
                <p className="mt-3 text-sm font-semibold leading-7 text-foreground">{dominantDecisionPath?.label || 'Saved shortlist'}</p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{dominantDecisionPath?.items.length || 0} saved picks currently support this group.</p>
              </div>
              <div className="rounded-[1.75rem] bg-white p-5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">Compare status</p>
                <p className="mt-3 text-3xl font-black text-foreground">{compareMixesCategories ? 'Mixed' : 'Clean'}</p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {compareMixesCategories ? 'Current picks in compare span multiple categories.' : 'Current compare set stays inside one category.'}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-8 grid gap-4 xl:grid-cols-3">
            {decisionPaths.map((path) => (
              <div key={path.key} className="rounded-[1.75rem] bg-white p-6 shadow-[0_24px_60px_-40px_rgba(15,23,42,0.35)]">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">{path.label}</p>
                    <h4 className="mt-3 font-[var(--font-display)] text-2xl font-black tracking-tight text-foreground">{path.readiness.label}</h4>
                  </div>
                  <span className={`rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] ${path.activeCompareItems.length ? 'border-emerald-300 bg-emerald-50 text-emerald-900' : 'border-slate-200 bg-slate-100 text-slate-700'}`}>
                    {path.activeCompareItems.length ? `${path.activeCompareItems.length} in compare` : `${path.items.length} saved`}
                  </span>
                </div>

                <p className="mt-4 text-sm leading-7 text-muted-foreground">{path.readiness.note}</p>

                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-[1.25rem] bg-muted p-4">
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Status</p>
                    <p className="mt-2 text-lg font-black text-foreground">{path.readiness.averageScore}/100</p>
                  </div>
                  <div className="rounded-[1.25rem] bg-muted p-4">
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Price band</p>
                    <p className="mt-2 text-sm font-black leading-6 text-foreground">{path.summary.priceRangeLabel}</p>
                  </div>
                  <div className="rounded-[1.25rem] bg-muted p-4">
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Top picks</p>
                    <p className="mt-2 text-lg font-black text-foreground">{path.recommendedItems.length}</p>
                  </div>
                </div>

                <div className="mt-5 rounded-[1.25rem] border border-slate-200 bg-slate-50 p-4">
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Strongest reason</p>
                  <p className="mt-2 text-sm leading-7 text-foreground">{path.summary.strongestSignal}</p>
                </div>

                <p className="mt-4 text-sm leading-7 text-muted-foreground">Included picks: {buildProductRollup(path.items)}.</p>

                <div className="mt-5 flex flex-wrap gap-3">
                  {path.recommendedItems.length >= 2 ? (
                    <button
                      type="button"
                      onClick={() => setCompareFromItems(path.recommendedItems, 'shortlist-decision-paths')}
                      className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground"
                    >
                      <Scale className="h-4 w-4" />
                      Load {path.recommendedItems.length} into compare
                    </button>
                  ) : null}
                  <Link
                    href={buildCategoryHubHref(path.items[0])}
                    className="inline-flex min-h-[44px] items-center justify-center rounded-full border border-border px-4 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
                  >
                    Browse this category
                  </Link>
                </div>
              </div>
            ))}
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
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-700">What Bes3 sees</p>
                <p className="mt-3 text-sm leading-7 text-emerald-950">{coach.emphasis}</p>
              </div>
            </div>
          </div>
        </section>
      ) : null}

      <section className="space-y-5">
        <div id="saved-candidates" className="flex items-center justify-between gap-4">
          <div>
            <p className="editorial-kicker">Saved Picks</p>
            <h3 className="mt-3 font-[var(--font-display)] text-3xl font-black tracking-tight text-foreground">Your shortlist</h3>
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
                            {item.category ? item.category.replace(/-/g, ' ') : 'Saved shortlist'}
                          </p>
                          {decisionState ? (
                            <span className={`rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] ${getDecisionBadgeClass(decisionState.stage)}`}>
                              {decisionState.label} · {decisionState.score}
                            </span>
                          ) : null}
                        </div>
                        <h4 className="font-[var(--font-display)] text-3xl font-black tracking-tight text-foreground">{item.productName}</h4>
                        <p className="text-sm leading-7 text-muted-foreground">
                          {item.description || 'Saved for later review. Open the product page or store link when you are ready to continue.'}
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
                          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">User rating</p>
                          <p className="mt-2 text-lg font-black text-foreground">{item.rating ? `${item.rating.toFixed(1)} / 5` : 'Pending'}</p>
                        </div>
                        <div className="rounded-[1.25rem] bg-muted p-4">
                          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Last checked</p>
                          <p className="mt-2 text-lg font-black text-foreground">{formatEditorialDate(item.updatedAt || item.publishedAt, 'Tracking soon')}</p>
                        </div>
                      </div>

                      {decisionState ? (
                        <div className={`rounded-[1.25rem] border p-4 ${getDecisionBadgeClass(decisionState.stage)}`}>
                          <p className="text-[10px] font-bold uppercase tracking-[0.2em]">Quick read</p>
                          <p className="mt-2 text-sm font-semibold leading-7">{decisionState.note}</p>
                          {decisionState.gaps[0] ? (
                            <p className="mt-2 text-xs leading-6 opacity-80">Watch out: {decisionState.gaps[0]}</p>
                          ) : null}
                        </div>
                      ) : null}

                      <div className="flex flex-wrap gap-3">
                        <Link
                          href={getShortlistProductPath(item)}
                          className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground"
                        >
                          Open details
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
                        <Link
                          href={buildCategoryAlertHref(item, 'price-alert', 'priority')}
                          className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full border border-border px-4 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
                        >
                          <BellRing className="h-4 w-4" />
                          Track price
                        </Link>
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
              Import the shared picks above to start your own shortlist, or add products from search, deals, and category pages.
            </p>
          </div>
        )}
      </section>

      <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <div id="decision-matrix" className="rounded-[2.5rem] bg-white p-8 shadow-panel sm:p-10">
          <p className="editorial-kicker">Compare List</p>
          <h3 className="mt-3 font-[var(--font-display)] text-3xl font-black tracking-tight text-foreground">Side-by-side compare</h3>
          <p className="mt-4 text-sm leading-7 text-muted-foreground">
            Use compare for your top picks only. If you have more than three, narrow the shortlist first so the tradeoffs stay obvious.
          </p>

          {compareMixesCategories && dominantDecisionPath?.recommendedItems.length >= 2 ? (
            <div className="mt-6 rounded-[1.5rem] border border-amber-200 bg-amber-50 px-5 py-4">
              <p className="text-sm leading-7 text-amber-950">
                Compare is currently mixing categories. Replace it with the strongest {dominantDecisionPath.label.toLowerCase()} group so the compare table stays fair.
              </p>
              <button
                type="button"
                onClick={() => setCompareFromItems(dominantDecisionPath.recommendedItems, 'shortlist-decision-paths')}
                className="mt-4 inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full bg-amber-950 px-4 text-sm font-semibold text-white"
              >
                <Scale className="h-4 w-4" />
                Compare only {dominantDecisionPath.label}
              </button>
            </div>
          ) : null}

          <div className="mt-6 space-y-3">
            {compare.length ? (
              compare.map((item) => (
                <div key={item.id} className="flex items-center justify-between gap-4 rounded-[1.5rem] bg-muted/50 px-4 py-4">
                  <div>
                    <p className="font-semibold text-foreground">{item.productName}</p>
                    <p className="text-sm text-muted-foreground">{getCategoryLabel(item)}</p>
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
              Search for a comparison page
              <ArrowRight className="h-4 w-4" />
            </Link>
          ) : null}
        </div>

        <div className="rounded-[2.5rem] bg-white p-8 shadow-panel sm:p-10">
          <p className="editorial-kicker">Compare Table</p>
          <h3 className="mt-3 font-[var(--font-display)] text-3xl font-black tracking-tight text-foreground">What changes between the top picks</h3>
          <p className="mt-4 text-sm leading-7 text-muted-foreground">{comparisonSummary.lensNote}</p>

          <div className="mt-6 rounded-[1.75rem] bg-[linear-gradient(135deg,#f8fafc_0%,#eef4ff_52%,#ecfdf5_100%)] p-5">
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-[1.25rem] bg-white/80 p-4 shadow-[0_20px_45px_-35px_rgba(15,23,42,0.5)] backdrop-blur">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">{comparisonSummary.lensLabel}</p>
                <p className="mt-2 text-sm leading-7 text-foreground">{comparisonSummary.lensNote}</p>
              </div>
              <div className="rounded-[1.25rem] bg-white/80 p-4 shadow-[0_20px_45px_-35px_rgba(15,23,42,0.5)] backdrop-blur">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-700">Matrix focus</p>
                <p className="mt-2 text-sm leading-7 text-foreground">{comparisonSummary.focusNote}</p>
              </div>
            </div>
          </div>

          {compare.length ? (
            <div className="mt-6 overflow-x-auto">
              <table className="min-w-full border-separate border-spacing-y-3">
                <thead>
                  <tr>
                    <th className="px-4 text-left text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">Criteria</th>
                    {compare.map((item) => (
                      <th key={item.id} className="rounded-[1.25rem] bg-muted/50 px-4 py-3 text-left text-sm font-semibold text-foreground">
                        {item.productName}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {comparisonSummary.rows.map((row) => (
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
