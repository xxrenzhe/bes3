import { formatHardcorePrice, type PriceValueSummary } from '@/lib/hardcore'

const STATUS_CLASS: Record<PriceValueSummary['entryStatus'], string> = {
  'best-deal': 'border-emerald-300 bg-emerald-50 text-emerald-900',
  'great-value': 'border-lime-300 bg-lime-50 text-lime-900',
  normal: 'border-slate-300 bg-slate-50 text-slate-800',
  overpriced: 'border-zinc-300 bg-zinc-100 text-zinc-700',
  unknown: 'border-amber-300 bg-amber-50 text-amber-900'
}

export function PriceValueBadge({ price }: { price: PriceValueSummary }) {
  return (
    <div className={`inline-flex max-w-full flex-col gap-1 rounded-md border px-3 py-2 text-xs font-semibold ${STATUS_CLASS[price.entryStatus]}`}>
      <span>{price.label}</span>
      <span className="font-mono text-[11px] font-medium">
        {formatHardcorePrice(price.currentPrice, price.currency)}
        {price.valueScore != null ? ` | V ${price.valueScore.toFixed(2)}` : ''}
      </span>
    </div>
  )
}
