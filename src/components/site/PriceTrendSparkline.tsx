import { summarizePriceHistoryWindow } from '@/lib/price-insights'
import type { ProductPriceHistoryRecord } from '@/lib/site-data'
import { cn, formatPriceSnapshot } from '@/lib/utils'

function buildTrendPoints(points: Array<{ x: number; y: number }>) {
  return points.map((point) => `${point.x},${point.y}`).join(' ')
}

export function PriceTrendSparkline({
  priceHistory,
  fallbackPrice,
  fallbackCurrency,
  className,
  tone = 'default',
  showSummary = true
}: {
  priceHistory: ProductPriceHistoryRecord[]
  fallbackPrice?: number | null
  fallbackCurrency?: string | null
  className?: string
  tone?: 'default' | 'positive' | 'warning'
  showSummary?: boolean
}) {
  const summary = summarizePriceHistoryWindow(priceHistory, fallbackPrice, fallbackCurrency)
  const points = [...priceHistory]
    .filter((point) => typeof point.priceAmount === 'number')
    .sort((left, right) => Date.parse(left.capturedAt || '') - Date.parse(right.capturedAt || ''))

  const currency = summary.currency || fallbackCurrency || 'USD'
  const minPrice = summary.lowestPrice ?? fallbackPrice ?? null
  const maxPrice = summary.highestPrice ?? fallbackPrice ?? null
  const hasEnoughData = points.length >= 2 && minPrice != null && maxPrice != null

  const strokeClass =
    tone === 'positive'
      ? 'stroke-emerald-600'
      : tone === 'warning'
        ? 'stroke-amber-700'
        : 'stroke-sky-700'

  const fillClass =
    tone === 'positive'
      ? 'fill-emerald-100/80'
      : tone === 'warning'
        ? 'fill-amber-100/80'
        : 'fill-sky-100/80'

  const normalizedPoints = hasEnoughData
    ? points.map((point, index) => {
        const width = 100
        const height = 42
        const x = points.length === 1 ? width / 2 : (index / (points.length - 1)) * width
        const range = Math.max(1, Number(maxPrice) - Number(minPrice))
        const y = height - ((Number(point.priceAmount) - Number(minPrice)) / range) * height
        return {
          x,
          y
        }
      })
    : []

  const polylinePoints = buildTrendPoints(normalizedPoints)
  const areaPoints = normalizedPoints.length
    ? `0,42 ${polylinePoints} 100,42`
    : ''
  const lastPoint = normalizedPoints[normalizedPoints.length - 1] || null

  return (
    <div className={cn('rounded-[1.25rem] border border-border/60 bg-white/80 p-4', className)}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Trend</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {hasEnoughData ? `${summary.totalPoints} tracked price points` : 'Need more tracking to show a real trend'}
          </p>
        </div>
        {showSummary ? (
          <p className="text-sm font-semibold text-foreground">
            {formatPriceSnapshot(summary.currentPrice, currency)}
          </p>
        ) : null}
      </div>

      {hasEnoughData ? (
        <div className="mt-3">
          <svg viewBox="0 0 100 42" className="h-16 w-full overflow-visible" preserveAspectRatio="none" aria-hidden="true">
            <polygon points={areaPoints} className={fillClass} />
            <polyline
              points={polylinePoints}
              fill="none"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={strokeClass}
            />
            {lastPoint ? <circle cx={lastPoint.x} cy={lastPoint.y} r="2.8" className={strokeClass.replace('stroke', 'fill')} /> : null}
          </svg>
          <div className="mt-2 flex items-center justify-between text-[11px] font-semibold text-muted-foreground">
            <span>{formatPriceSnapshot(summary.lowestPrice, currency)}</span>
            <span>{formatPriceSnapshot(summary.highestPrice, currency)}</span>
          </div>
        </div>
      ) : (
        <div className="mt-3 rounded-[1rem] bg-muted px-4 py-5 text-center text-xs text-muted-foreground">
          Bes3 will draw the trend line once enough historical checks are available.
        </div>
      )}
    </div>
  )
}
