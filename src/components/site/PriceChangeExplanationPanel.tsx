import { formatEditorialDate } from '@/lib/editorial'
import type { DealDecisionSignal, PriceHistoryWindowSummary } from '@/lib/price-insights'
import { formatPriceSnapshot } from '@/lib/utils'

function getRelativePercent(current: number | null, anchor: number | null) {
  if (typeof current !== 'number' || !Number.isFinite(current)) return null
  if (typeof anchor !== 'number' || !Number.isFinite(anchor) || anchor <= 0) return null
  return ((current - anchor) / anchor) * 100
}

function formatRelativePercent(value: number | null) {
  if (value == null || !Number.isFinite(value)) return null
  if (Math.abs(value) < 0.2) return 'about flat'
  const abs = Math.abs(value)
  const rendered = `${abs.toFixed(abs < 10 ? 1 : 0)}%`
  return value > 0 ? `${rendered} above` : `${rendered} below`
}

function buildWindowContext(summary: PriceHistoryWindowSummary, currency: string) {
  if (summary.totalPoints <= 0) {
    return 'Bes3 does not have enough verified price history yet to explain whether this is truly a strong entry point.'
  }

  const currentLabel = formatPriceSnapshot(summary.currentPrice, currency)
  const lowLabel = formatPriceSnapshot(summary.lowestPrice, currency)
  const highLabel = formatPriceSnapshot(summary.highestPrice, currency)
  const lowDelta = formatRelativePercent(getRelativePercent(summary.currentPrice, summary.lowestPrice))
  const highDelta = formatRelativePercent(getRelativePercent(summary.currentPrice, summary.highestPrice))

  if (lowDelta && highDelta) {
    return `${currentLabel} is ${lowDelta} the tracked low (${lowLabel}) and ${highDelta} the tracked high (${highLabel}) inside the current window.`
  }

  return `${currentLabel} is being judged against a tracked range from ${lowLabel} to ${highLabel}.`
}

function buildMovementContext(summary: PriceHistoryWindowSummary, currency: string) {
  if (summary.deltaFromPrevious == null || !Number.isFinite(summary.deltaFromPrevious)) {
    return summary.latestCapturedAt
      ? `The latest verified check was ${formatEditorialDate(summary.latestCapturedAt)}, but Bes3 still needs one more nearby point before it can explain a real move.`
      : 'Bes3 still needs more recent checks before it can explain whether the market is moving or simply noisy.'
  }

  const deltaLabel = formatPriceSnapshot(Math.abs(summary.deltaFromPrevious), currency)
  const latestLabel = formatEditorialDate(summary.latestCapturedAt)

  if (summary.deltaFromPrevious < 0) {
    return `The latest verified check on ${latestLabel} moved down by ${deltaLabel} versus the previous point, which makes the current signal more favorable.`
  }

  if (summary.deltaFromPrevious > 0) {
    return `The latest verified check on ${latestLabel} moved up by ${deltaLabel} versus the previous point, so the current price may be losing some timing advantage.`
  }

  return `The latest verified check on ${latestLabel} did not move meaningfully versus the previous point, so the decision depends more on the broader range than on a fresh swing.`
}

function buildActionContext(signal: DealDecisionSignal, summary: PriceHistoryWindowSummary) {
  if (signal.id === 'buy-now') {
    return 'If product fit is already clear, treat this as a timing window worth acting on instead of waiting for a perfect but possibly unrealistic lower price.'
  }

  if (signal.id === 'watch') {
    return 'The cleaner move is to save the task and wait. Reopening broad research will usually add noise before timing actually improves.'
  }

  if (signal.id === 'good-value') {
    return summary.totalPoints >= 3
      ? 'This is acceptable, but not obviously the best tracked window. Buy only if fit certainty matters more than squeezing out a slightly better entry.'
      : 'This may be workable, but the range is still thin enough that one more tracked move could change the call.'
  }

  return 'Use shortlist, compare, or alerts for now. The timing signal is still weaker than the product-fit signal.'
}

export function PriceChangeExplanationPanel({
  summary,
  signal,
  fallbackCurrency,
  className = ''
}: {
  summary: PriceHistoryWindowSummary
  signal: DealDecisionSignal
  fallbackCurrency?: string | null
  className?: string
}) {
  const currency = summary.currency || fallbackCurrency || 'USD'

  return (
    <section className={`rounded-[1.75rem] border border-border/60 bg-white p-5 ${className}`.trim()}>
      <div className="flex flex-col gap-3 border-b border-border/40 pb-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-primary">Why this price signal exists</p>
          <h3 className="mt-2 font-[var(--font-display)] text-2xl font-black tracking-tight text-foreground">
            Explain what changed before you act.
          </h3>
        </div>
        <p className="max-w-2xl text-sm leading-7 text-muted-foreground">
          A useful timing call should explain the current range, the latest movement, and why Bes3 is pushing buy, watch, or wait.
        </p>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-3">
        <div className="rounded-[1.25rem] bg-muted/70 p-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">Current window</p>
          <p className="mt-3 text-sm leading-7 text-muted-foreground">{buildWindowContext(summary, currency)}</p>
        </div>
        <div className="rounded-[1.25rem] bg-muted/70 p-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">Latest change</p>
          <p className="mt-3 text-sm leading-7 text-muted-foreground">{buildMovementContext(summary, currency)}</p>
        </div>
        <div className="rounded-[1.25rem] bg-muted/70 p-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">Best move now</p>
          <p className="mt-3 text-sm leading-7 text-muted-foreground">{buildActionContext(signal, summary)}</p>
        </div>
      </div>
    </section>
  )
}
