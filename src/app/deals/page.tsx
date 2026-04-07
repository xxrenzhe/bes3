import type { Metadata } from 'next'
import Link from 'next/link'
import { PublicShell } from '@/components/layout/PublicShell'
import { DecisionReasonPanel } from '@/components/site/DecisionReasonPanel'
import { DealsCountdown } from '@/components/site/DealsCountdown'
import { PriceTrendSparkline } from '@/components/site/PriceTrendSparkline'
import { PrimaryCta } from '@/components/site/PrimaryCta'
import { StructuredData } from '@/components/site/StructuredData'
import { ShortlistActionBar } from '@/components/site/ShortlistActionBar'
import { TimingDecisionPanel } from '@/components/site/TimingDecisionPanel'
import { formatEditorialDate, getCategoryLabel, getFreshnessLabel } from '@/lib/editorial'
import { buildPageMetadata } from '@/lib/metadata'
import { buildMerchantExitPath } from '@/lib/merchant-links'
import { buildNewsletterPath } from '@/lib/newsletter-path'
import {
  buildDealDecisionSignal,
  getDealDecisionSignalRank,
  summarizePriceHistoryWindow,
  type DealDecisionSignalId,
  type PriceHistoryWindowSummary
} from '@/lib/price-insights'
import { getRequestLocale } from '@/lib/request-locale'
import { buildBreadcrumbSchema, buildCollectionPageSchema, buildHowToSchema } from '@/lib/structured-data'
import { toShortlistItem } from '@/lib/shortlist'
import { listOpenCommerceProducts, listProductPriceHistory } from '@/lib/site-data'
import { formatPriceSnapshot } from '@/lib/utils'

type DealsSearchParams = {
  category?: string
  maxPrice?: string
  signal?: string
  distance?: string
}

type PriceWindowDistanceFilter = '' | 'within-5' | 'within-10' | 'above-10' | 'needs-data'

function parseMaxPrice(value: string | undefined) {
  if (!value) return null
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

function normalizeSignal(value: string | undefined): DealDecisionSignalId | '' {
  return value === 'buy-now' || value === 'good-value' || value === 'watch' || value === 'needs-data' ? value : ''
}

function normalizeDistanceFilter(value: string | undefined): PriceWindowDistanceFilter {
  return value === 'within-5' || value === 'within-10' || value === 'above-10' || value === 'needs-data' ? value : ''
}

function buildDealsPath(input: {
  category?: string
  maxPrice?: number | null
  signal?: DealDecisionSignalId | ''
  distance?: PriceWindowDistanceFilter
}) {
  const params = new URLSearchParams()
  if (input.category) params.set('category', input.category)
  if (input.maxPrice != null) params.set('maxPrice', String(input.maxPrice))
  if (input.signal) params.set('signal', input.signal)
  if (input.distance) params.set('distance', input.distance)
  return `/deals${params.size ? `?${params.toString()}` : ''}`
}

function getSignalClasses(signal: DealDecisionSignalId) {
  switch (signal) {
    case 'buy-now':
      return 'bg-emerald-100 text-emerald-800'
    case 'good-value':
      return 'bg-sky-100 text-sky-800'
    case 'watch':
      return 'bg-amber-100 text-amber-900'
    default:
      return 'bg-slate-100 text-slate-700'
  }
}

function formatDelta(value: number | null | undefined, currency: string) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value === 0) return 'No recent move'
  const prefix = value > 0 ? '+' : '-'
  return `${prefix}${formatPriceSnapshot(Math.abs(value), currency)}`
}

function getDistanceFromTrackedLowPercent(currentPrice: number | null | undefined, lowestPrice: number | null | undefined) {
  if (typeof currentPrice !== 'number' || !Number.isFinite(currentPrice)) return null
  if (typeof lowestPrice !== 'number' || !Number.isFinite(lowestPrice) || lowestPrice <= 0) return null
  return ((currentPrice - lowestPrice) / lowestPrice) * 100
}

function classifyDistanceFilter(summary: PriceHistoryWindowSummary): Exclude<PriceWindowDistanceFilter, ''> {
  if (summary.totalPoints <= 0) return 'needs-data'
  const distance = getDistanceFromTrackedLowPercent(summary.currentPrice, summary.lowestPrice)
  if (distance == null) return 'needs-data'
  if (distance <= 5) return 'within-5'
  if (distance <= 10) return 'within-10'
  return 'above-10'
}

function formatDistanceFromTrackedLow(summary: PriceHistoryWindowSummary, value: number | null | undefined) {
  if (summary.totalPoints <= 0) return 'Tracked low unknown'
  if (typeof value !== 'number' || !Number.isFinite(value)) return 'Tracked low unknown'
  if (value <= 0.25) return 'At tracked low'
  return `${value.toFixed(value < 10 ? 1 : 0)}% above low`
}

function matchesDistanceFilter(summary: PriceHistoryWindowSummary, filter: PriceWindowDistanceFilter) {
  if (!filter) return true
  return classifyDistanceFilter(summary) === filter
}

export async function generateMetadata(): Promise<Metadata> {
  const leadProduct = (await listOpenCommerceProducts()).filter((product) => product.resolvedUrl)[0] || null

  return buildPageMetadata({
    title: 'Live Deals',
    description:
      'Browse live deals with tracked price windows, clearer buy-or-wait signals, shortlist saves, and price alerts so discounts help instead of distracting you.',
    path: '/deals',
    locale: getRequestLocale(),
    image: leadProduct?.heroImageUrl,
    freshnessDate: leadProduct?.offerLastCheckedAt || leadProduct?.priceLastCheckedAt || leadProduct?.updatedAt || leadProduct?.publishedAt,
    freshnessInTitle: true,
    keywords: ['live deals', 'price tracking', 'price history', 'product deals', 'buying guide']
  })
}

export default async function DealsPage({
  searchParams
}: {
  searchParams: Promise<DealsSearchParams>
}) {
  const params = await searchParams
  const selectedCategory = params.category?.trim() || ''
  const selectedSignal = normalizeSignal(params.signal)
  const selectedDistance = normalizeDistanceFilter(params.distance)
  const maxPrice = parseMaxPrice(params.maxPrice)

  const allDeals = (await listOpenCommerceProducts()).filter((product) => product.resolvedUrl)
  const categoryOptions = Array.from(new Set(allDeals.map((product) => product.category).filter(Boolean) as string[])).sort()

  const categoryFilteredDeals = allDeals.filter((product) => {
    if (selectedCategory && product.category !== selectedCategory) return false
    const effectivePrice = product.bestOffer?.priceAmount ?? product.priceAmount
    if (maxPrice != null && (effectivePrice == null || effectivePrice > maxPrice)) return false
    return true
  })

  const dealsWithInsights = await Promise.all(
    categoryFilteredDeals.map(async (product) => {
      const priceHistory = await listProductPriceHistory(product.id, 12)
      const effectivePrice = product.bestOffer?.priceAmount ?? product.priceAmount
      const effectiveCurrency = product.bestOffer?.priceCurrency || product.priceCurrency || 'USD'
      const summary = summarizePriceHistoryWindow(priceHistory, effectivePrice, effectiveCurrency)
      const signal = buildDealDecisionSignal(summary)
      const distanceFromLowPercent = getDistanceFromTrackedLowPercent(summary.currentPrice, summary.lowestPrice)

      return {
        product,
        priceHistory,
        summary,
        signal,
        distanceFromLowPercent
      }
    })
  )

  const categoryAlternatives = dealsWithInsights.reduce<Map<string, typeof dealsWithInsights>>((result, item) => {
    if (!item.product.category) return result
    const existing = result.get(item.product.category) || []
    existing.push(item)
    result.set(item.product.category, existing)
    return result
  }, new Map())

  for (const [category, items] of categoryAlternatives.entries()) {
    categoryAlternatives.set(
      category,
      [...items].sort(
        (left, right) =>
          (left.product.bestOffer?.priceAmount ?? left.product.priceAmount ?? Infinity) -
          (right.product.bestOffer?.priceAmount ?? right.product.priceAmount ?? Infinity)
      )
    )
  }

  const filteredDeals = dealsWithInsights
    .filter((item) => {
      if (selectedSignal && item.signal.id !== selectedSignal) return false
      if (!matchesDistanceFilter(item.summary, selectedDistance)) return false
      return true
    })
    .sort((left, right) => {
      const signalDelta = getDealDecisionSignalRank(left.signal.id) - getDealDecisionSignalRank(right.signal.id)
      if (signalDelta !== 0) return signalDelta
      const freshnessDelta = Date.parse(right.product.offerLastCheckedAt || right.product.priceLastCheckedAt || right.product.updatedAt || '') -
        Date.parse(left.product.offerLastCheckedAt || left.product.priceLastCheckedAt || left.product.updatedAt || '')
      if (Number.isFinite(freshnessDelta) && freshnessDelta !== 0) return freshnessDelta
      return (left.product.bestOffer?.priceAmount ?? left.product.priceAmount ?? Infinity) - (right.product.bestOffer?.priceAmount ?? right.product.priceAmount ?? Infinity)
    })

  const products = filteredDeals.slice(0, 12)
  const leadDeal = products[0] || null
  const leadProduct = leadDeal?.product || null
  const latestRefresh = products
    .map((item) => item.product.offerLastCheckedAt || item.product.priceLastCheckedAt || item.product.updatedAt || item.product.publishedAt)
    .find(Boolean) || null
  const breadcrumbItems = [
    { name: 'Home', path: '/' },
    { name: 'Deals', path: '/deals' }
  ]
  const howToSteps = [
    {
      name: 'Validate the product fit first',
      text: 'Use deals only after the product already looks right for your use case. A discount should speed up a good decision, not create a bad one.'
    },
    {
      name: 'Use the price window, not just the sticker price',
      text: 'Check where the current offer sits against the tracked low and high before deciding whether to buy now or wait.'
    },
    {
      name: 'Switch to a price watch when needed',
      text: 'If the current deal is close but not quite right, track the category instead of buying under pressure.'
    }
  ]
  const structuredData = buildCollectionPageSchema({
    path: '/deals',
    title: 'Live Deals',
    description: 'Browse live deals with tracked price windows, clearer buy-or-wait signals, shortlist saves, and price alerts so discounts help instead of distracting you.',
    image: leadProduct?.heroImageUrl,
    breadcrumbItems,
    dateModified: latestRefresh,
    items: products.map((item) => ({
      name: item.product.productName,
      path: item.product.slug ? `/products/${item.product.slug}` : '/deals'
    }))
  })

  const signalCounts = dealsWithInsights.reduce<Record<DealDecisionSignalId, number>>(
    (result, item) => {
      result[item.signal.id] += 1
      return result
    },
    {
      'buy-now': 0,
      'good-value': 0,
      watch: 0,
      'needs-data': 0
    }
  )

  const distanceCounts = dealsWithInsights.reduce<Record<Exclude<PriceWindowDistanceFilter, ''>, number>>(
    (result, item) => {
      result[classifyDistanceFilter(item.summary)] += 1
      return result
    },
    {
      'within-5': 0,
      'within-10': 0,
      'above-10': 0,
      'needs-data': 0
    }
  )

  const leadSignalTone = leadDeal?.signal.id === 'buy-now' ? 'positive' : leadDeal?.signal.id === 'watch' ? 'warning' : 'default'
  const dealsResumeDescription = 'Return to the live deals view with the same timing filters and price-window context still visible.'
  const leadAlertHref = leadProduct?.category
    ? buildNewsletterPath({
        intent: 'price-alert',
        category: leadProduct.category,
        cadence: 'priority',
        returnTo: '/deals',
        returnLabel: 'Resume deals',
        returnDescription: dealsResumeDescription
      })
    : buildNewsletterPath({
        intent: 'deals',
        cadence: 'priority',
        returnTo: '/deals',
        returnLabel: 'Resume deals',
        returnDescription: dealsResumeDescription
      })
  const leadDecisionText = !leadDeal
    ? 'Use deals only after product fit is already clear. When timing is still fuzzy, shortlist and alerts beat impulse.'
    : leadDeal.signal.id === 'buy-now'
      ? 'The lead deal is sitting in one of the better tracked windows right now. If product fit is already clear, this is where checking the store price makes sense.'
      : leadDeal.signal.id === 'good-value'
        ? 'The lead deal is reasonable, but not a must-buy moment by itself. Save or compare if the product still needs one more decision pass.'
        : leadDeal.signal.id === 'watch'
          ? 'The discount exists, but the timing is still weak relative to the tracked range. This is a watch situation, not a rush situation.'
          : 'Bes3 still needs more price history before it can turn this deal into a strong timing recommendation.'

  return (
    <PublicShell>
      <StructuredData
        data={[
          buildBreadcrumbSchema('/deals', breadcrumbItems),
          structuredData,
          buildHowToSchema(
            '/deals',
            'How to use Bes3 live deals',
            'Use the deals page to validate product fit, read the price window, keep top picks together, and switch to a price watch when timing matters.',
            howToSteps
          )
        ]}
      />
      <div className="space-y-16">
        <section className="overflow-hidden bg-[linear-gradient(135deg,hsl(var(--primary)),#00855d)] px-4 py-16 text-white sm:px-6 lg:px-8 lg:py-24">
          <div className="mx-auto flex max-w-7xl flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl space-y-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-emerald-200">Verified Deals</p>
              <h1 className="font-[var(--font-display)] text-5xl font-black tracking-tight sm:text-7xl">Use deals to decide when to buy.</h1>
              <p className="max-w-2xl text-lg leading-8 text-emerald-50/80">
                Bes3 surfaces live deals with a tracked price window, a clearer read on whether to buy now or wait, and a direct path into shortlist, alerts, or store checking.
              </p>
            </div>
            <div className="glass-panel rounded-[2rem] px-8 py-6 text-center text-foreground">
              <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-primary">Current snapshot</p>
              <p className="mt-3 text-4xl font-black">{products.length}</p>
              <p className="mt-2 text-sm text-muted-foreground">Deals matching the current filters</p>
              <div className="mt-5">
                <DealsCountdown />
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <TimingDecisionPanel
            eyebrow="Buy Or Wait"
            title={leadProduct ? `Should you move on ${leadProduct.productName} now?` : 'Should you buy now or keep watching?'}
            description="The deals page should surface the strongest live timing signal, then route you toward product validation, shortlist, or watch mode without emotional overreaction."
            signalBadge={leadDeal?.signal.badge || 'Deals workflow'}
            signalTitle={leadDeal?.signal.title || 'Use the tracked window before acting on a discount.'}
            signalDescription={leadDeal?.signal.description || 'A live deal only matters after product fit is already clear. Otherwise it is just another distraction.'}
            decisionText={leadDecisionText}
            priceHistory={leadDeal?.priceHistory}
            fallbackPrice={leadProduct?.bestOffer?.priceAmount ?? leadProduct?.priceAmount}
            fallbackCurrency={leadProduct?.bestOffer?.priceCurrency || leadProduct?.priceCurrency || 'USD'}
            tone={leadSignalTone}
            metrics={[
              {
                label: 'Deals in view',
                value: String(products.length),
                note: 'Current results after filters.'
              },
              {
                label: 'Buy window',
                value: String(signalCounts['buy-now']),
                note: 'Deals currently sitting near the best tracked range.'
              },
              {
                label: 'Wait signals',
                value: String(signalCounts.watch),
                note: 'Deals that still look expensive relative to the tracked window.'
              }
            ]}
            actions={[
              {
                href: leadProduct?.slug ? `/products/${leadProduct.slug}` : '/directory',
                label: leadProduct?.slug ? 'Open lead product' : 'Browse categories'
              },
              {
                href: '/shortlist',
                label: 'Open shortlist',
                variant: 'secondary'
              },
              {
                href: leadAlertHref,
                label: 'Start price alert',
                variant: 'secondary'
              }
            ]}
          />
        </section>

        <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <DecisionReasonPanel
            eyebrow="Deals Decision Summary"
            title="A useful deal page should reduce bad urgency, not create it."
            description="Live deals only help when the product or category already belongs in your decision set. If fit is still fuzzy, the right move is to step back into shortlist, product detail, or category context."
            cards={[
              {
                eyebrow: 'Use this page if',
                title: 'Product fit is already mostly clear',
                description: 'Deals work best when you are validating timing on something that already deserves attention, not when you are still discovering what belongs on the shortlist.'
              },
              {
                eyebrow: 'Leave this page if',
                title: 'The discount is pulling you toward the wrong product',
                description: 'If the offer looks exciting but category fit still is not clear, reopen the shortlist, product page, or category view before treating any price as a signal to act.',
                tone: 'muted'
              },
              {
                eyebrow: 'Wait instead if',
                title: leadProduct?.category ? `Track ${getCategoryLabel(leadProduct.category)}` : 'Preserve the task with an alert',
                description: 'When price timing is the blocker, switch into a contextual alert so Bes3 can bring you back to the same decision later instead of forcing an impulse now.',
                tone: 'strong'
              }
            ]}
          />
        </section>

        <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-[2rem] border border-border/60 bg-white p-6 shadow-panel sm:p-8">
            <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
              <div>
                <p className="editorial-kicker">Filter The Window</p>
                <h2 className="mt-3 font-[var(--font-display)] text-3xl font-black tracking-tight">Narrow deals by category, price ceiling, and timing.</h2>
              </div>
              <form action="/deals" className="grid gap-3 sm:grid-cols-5">
                <select
                  name="category"
                  defaultValue={selectedCategory}
                  className="min-h-[44px] rounded-full border border-border bg-background px-4 text-sm text-foreground"
                >
                  <option value="">All categories</option>
                  {categoryOptions.map((category) => (
                    <option key={category} value={category}>
                      {getCategoryLabel(category)}
                    </option>
                  ))}
                </select>
                <input
                  name="maxPrice"
                  type="number"
                  min="1"
                  step="1"
                  defaultValue={maxPrice ?? ''}
                  placeholder="Max price"
                  className="min-h-[44px] rounded-full border border-border bg-background px-4 text-sm text-foreground"
                />
                <select
                  name="signal"
                  defaultValue={selectedSignal}
                  className="min-h-[44px] rounded-full border border-border bg-background px-4 text-sm text-foreground"
                >
                  <option value="">All timing labels</option>
                  <option value="buy-now">Buy window</option>
                  <option value="good-value">Fair value</option>
                  <option value="watch">Wait if you can</option>
                  <option value="needs-data">Needs more tracking</option>
                </select>
                <select
                  name="distance"
                  defaultValue={selectedDistance}
                  className="min-h-[44px] rounded-full border border-border bg-background px-4 text-sm text-foreground"
                >
                  <option value="">Any distance from low</option>
                  <option value="within-5">Within 5% of tracked low</option>
                  <option value="within-10">Within 10% of tracked low</option>
                  <option value="above-10">More than 10% above low</option>
                  <option value="needs-data">Needs more price history</option>
                </select>
                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="inline-flex min-h-[44px] flex-1 items-center justify-center rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground"
                  >
                    Apply
                  </button>
                  <Link
                    href="/deals"
                    className="inline-flex min-h-[44px] items-center justify-center rounded-full border border-border px-5 text-sm font-semibold text-foreground"
                  >
                    Reset
                  </Link>
                </div>
              </form>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              {([
                ['buy-now', signalCounts['buy-now'], 'Buy window'],
                ['good-value', signalCounts['good-value'], 'Fair value'],
                ['watch', signalCounts.watch, 'Wait if you can'],
                ['needs-data', signalCounts['needs-data'], 'Needs more tracking']
              ] as Array<[DealDecisionSignalId, number, string]>).map(([signal, count, label]) => (
                <Link
                  key={signal}
                  href={buildDealsPath({
                    category: selectedCategory || undefined,
                    maxPrice,
                    signal: selectedSignal === signal ? '' : signal,
                    distance: selectedDistance
                  })}
                  className={`rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] ${
                    selectedSignal === signal ? 'bg-slate-950 text-white' : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {label} · {count}
                </Link>
              ))}
            </div>

            <div className="mt-4 flex flex-wrap gap-3">
              {([
                ['within-5', distanceCounts['within-5'], 'Near tracked low'],
                ['within-10', distanceCounts['within-10'], 'Within 10% of low'],
                ['above-10', distanceCounts['above-10'], 'Far from low'],
                ['needs-data', distanceCounts['needs-data'], 'Needs price data']
              ] as Array<[Exclude<PriceWindowDistanceFilter, ''>, number, string]>).map(([distance, count, label]) => (
                <Link
                  key={distance}
                  href={buildDealsPath({
                    category: selectedCategory || undefined,
                    maxPrice,
                    signal: selectedSignal,
                    distance: selectedDistance === distance ? '' : distance
                  })}
                  className={`rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] ${
                    selectedDistance === distance ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {label} · {count}
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 pb-20 sm:px-6 lg:px-8">
          <div className="mb-10 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="editorial-kicker">Today&apos;s Selection</p>
              <h2 className="mt-3 font-[var(--font-display)] text-4xl font-black tracking-tight">Live deals with timing context</h2>
            </div>
            <p className="max-w-2xl text-sm leading-7 text-muted-foreground">
              {products.length
                ? 'Each card now shows the current price against the tracked low and high, so you can decide whether to buy now, save it, or wait.'
                : 'No deals match the current filters yet. Loosen the price ceiling or timing filter to reopen the current market.'}
            </p>
          </div>

          {products.length ? (
            <div className="grid gap-8 md:grid-cols-2 xl:grid-cols-3">
              {products.map(({ product, summary, signal, priceHistory }) => {
                const effectivePrice = product.bestOffer?.priceAmount ?? product.priceAmount
                const effectiveCurrency = product.bestOffer?.priceCurrency || product.priceCurrency || 'USD'
                const distanceFromLowPercent = getDistanceFromTrackedLowPercent(summary.currentPrice, summary.lowestPrice)
                const alertHref = product.category
                  ? buildNewsletterPath({
                      intent: 'price-alert',
                      category: product.category,
                      cadence: 'priority',
                      returnTo: '/deals',
                      returnLabel: 'Resume deals',
                      returnDescription: dealsResumeDescription
                    })
                  : buildNewsletterPath({
                      intent: 'deals',
                      cadence: 'priority',
                      returnTo: '/deals',
                      returnLabel: 'Resume deals',
                      returnDescription: dealsResumeDescription
                    })
                const alternatives = product.category
                  ? (categoryAlternatives.get(product.category) || []).filter((item) => item.product.id !== product.id).slice(0, 2)
                  : []

                return (
                  <div key={product.id} className="editorial-shadow group overflow-hidden rounded-[2rem] bg-white">
                    <div className="flex items-center justify-between px-6 pt-6">
                      <span className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] ${getSignalClasses(signal.id)}`}>
                        {signal.badge}
                      </span>
                      <span className="text-sm font-semibold text-muted-foreground">
                        {getFreshnessLabel(product.offerLastCheckedAt || product.priceLastCheckedAt || product.updatedAt || product.publishedAt)}
                      </span>
                    </div>

                    <div className="space-y-4 p-6">
                      <div>
                        <h2 className="font-[var(--font-display)] text-3xl font-black tracking-tight">{product.productName}</h2>
                        <p className="mt-2 text-sm leading-7 text-muted-foreground">
                          {product.description || 'Current pricing with a direct path to the latest store page.'}
                        </p>
                      </div>

                      <div className="rounded-[1.5rem] bg-muted p-5">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground">Current price</p>
                            <p className="mt-3 text-3xl font-black text-foreground">
                              {formatPriceSnapshot(effectivePrice, effectiveCurrency)}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground">Tracked points</p>
                            <p className="mt-3 text-2xl font-black text-foreground">{summary.totalPoints}</p>
                          </div>
                        </div>
                        <p className="mt-2 text-sm text-muted-foreground">
                          {product.offerCount} offers · checked {formatEditorialDate(product.offerLastCheckedAt || product.priceLastCheckedAt || product.updatedAt || product.publishedAt)}
                        </p>
                      </div>

                      <div className="rounded-[1.5rem] border border-border/60 p-5">
                        <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-primary">Price window</p>
                        <h3 className="mt-3 text-lg font-black text-foreground">{signal.title}</h3>
                        <p className="mt-2 text-sm leading-7 text-muted-foreground">{signal.description}</p>
                        <PriceTrendSparkline
                          priceHistory={priceHistory}
                          fallbackPrice={effectivePrice}
                          fallbackCurrency={effectiveCurrency}
                          className="mt-4"
                          tone={signal.id === 'buy-now' ? 'positive' : signal.id === 'watch' ? 'warning' : 'default'}
                          showSummary={false}
                        />
                        <div className="mt-4 grid gap-3 sm:grid-cols-3">
                          <div className="rounded-[1rem] bg-muted px-4 py-3">
                            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Lowest</p>
                            <p className="mt-2 text-base font-black text-foreground">{formatPriceSnapshot(summary.lowestPrice, summary.currency || effectiveCurrency)}</p>
                          </div>
                          <div className="rounded-[1rem] bg-muted px-4 py-3">
                            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Highest</p>
                            <p className="mt-2 text-base font-black text-foreground">{formatPriceSnapshot(summary.highestPrice, summary.currency || effectiveCurrency)}</p>
                          </div>
                          <div className="rounded-[1rem] bg-muted px-4 py-3">
                            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Last move</p>
                            <p className="mt-2 text-base font-black text-foreground">{formatDelta(summary.deltaFromPrevious, summary.currency || effectiveCurrency)}</p>
                          </div>
                        </div>
                        <p className="mt-4 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                          {formatDistanceFromTrackedLow(summary, distanceFromLowPercent)}
                        </p>
                      </div>

                      {alternatives.length ? (
                        <div className="rounded-[1.5rem] border border-border/60 p-5">
                          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-primary">Same-category alternatives</p>
                          <p className="mt-2 text-sm leading-7 text-muted-foreground">
                            Use nearby prices in the same category to judge whether this offer is truly competitive right now.
                          </p>
                          <div className="mt-4 space-y-3">
                            {alternatives.map((alternative) => {
                              const alternativePrice = alternative.product.bestOffer?.priceAmount ?? alternative.product.priceAmount
                              const alternativeCurrency = alternative.product.bestOffer?.priceCurrency || alternative.product.priceCurrency || effectiveCurrency

                              return (
                                <Link
                                  key={alternative.product.id}
                                  href={alternative.product.slug ? `/products/${alternative.product.slug}` : '/deals'}
                                  className="flex items-start justify-between gap-4 rounded-[1rem] bg-muted px-4 py-4 transition-colors hover:bg-emerald-50"
                                >
                                  <div>
                                    <p className="text-sm font-semibold text-foreground">{alternative.product.productName}</p>
                                    <p className="mt-1 text-xs uppercase tracking-[0.16em] text-muted-foreground">
                                      {alternative.signal.badge} · {formatDistanceFromTrackedLow(alternative.summary, alternative.distanceFromLowPercent)}
                                    </p>
                                  </div>
                                  <p className="text-sm font-black text-foreground">
                                    {formatPriceSnapshot(alternativePrice, alternativeCurrency)}
                                  </p>
                                </Link>
                              )
                            })}
                          </div>
                        </div>
                      ) : null}

                      <div className="flex flex-wrap gap-3">
                        {product.slug ? (
                          <Link href={`/products/${product.slug}`} className="rounded-full border border-border px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-muted">
                            Open product page
                          </Link>
                        ) : null}
                        <Link href={alertHref} className="rounded-full border border-border px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-muted">
                          {signal.id === 'buy-now' ? 'Track fallback price' : product.category ? `Track ${getCategoryLabel(product.category)}` : 'Track deals'}
                        </Link>
                      </div>

                      <ShortlistActionBar item={toShortlistItem(product)} compact source="deals-grid" />

                      <PrimaryCta
                        href={buildMerchantExitPath(product.id, 'deals-grid')}
                        productId={product.id}
                        trackingSource="deals-grid"
                        label={signal.id === 'watch' ? 'Check Price Anyway' : 'Check Current Price'}
                        note={
                          signal.id === 'buy-now'
                            ? 'The current offer sits near the best tracked window, so speed matters only if fit is already clear.'
                            : signal.id === 'watch'
                              ? 'This price sits high in the tracked range, so only move fast if timing matters more than waiting.'
                              : 'Use the product page first if you still need to verify fit, specs, or tradeoffs.'
                        }
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="rounded-[2rem] border border-dashed border-border/70 bg-white px-6 py-14 text-center">
              <p className="text-lg font-semibold text-foreground">No deals match the current filters.</p>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">
                Reset the timing filter or raise the price ceiling to reopen the current deals set.
              </p>
              <Link href="/deals" className="mt-6 inline-flex rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground">
                Reset filters
              </Link>
            </div>
          )}
        </section>
      </div>
    </PublicShell>
  )
}
