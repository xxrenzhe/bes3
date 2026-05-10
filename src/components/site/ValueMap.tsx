import Link from 'next/link'
import type { HardcoreProduct } from '@/lib/hardcore'

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

export function ValueMap({ products }: { products: HardcoreProduct[] }) {
  const plotted = products.filter(
    (product) => product.price.currentPrice != null && product.consensus.score10 != null
  )

  if (!plotted.length) {
    return (
      <section className="px-4 py-14 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-5 rounded-[2rem] border border-dashed border-amber-300 bg-amber-50 p-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.28em] text-amber-900">Value Map Pending</p>
            <h2 className="mt-3 font-[var(--font-display)] text-3xl font-black tracking-tight text-amber-950">
              No buy window yet, so Bes3 will not pretend there is a deal.
            </h2>
            <p className="mt-3 text-sm leading-7 text-amber-950/80">
              A product needs both a current price and a review score before it can appear on the value map. Until then, use a safer path instead of chasing an unverified discount.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              ['Compare picks', '/categories', 'Use reviewed categories when price data is still thin.'],
              ['Start with need', '/start', 'Describe the product and deal-breakers so Alex can narrow the search.'],
              ['Check trust rules', '/trust', 'See why thin price data blocks strong buy claims.']
            ].map(([title, href, note]) => (
              <Link key={href} href={href} className="rounded-2xl border border-amber-200 bg-white p-4 text-amber-950 hover:border-amber-500">
                <p className="text-sm font-black">{title}</p>
                <p className="mt-2 text-xs leading-6 text-amber-950/75">{note}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>
    )
  }

  const prices = plotted.map((product) => product.price.currentPrice || 0)
  const maxPrice = Math.max(...prices, 1)
  const minPrice = Math.min(...prices, maxPrice)
  const range = Math.max(maxPrice - minPrice, 1)

  return (
    <section className="px-4 py-14 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 max-w-3xl">
          <p className="text-xs font-bold uppercase tracking-[0.28em] text-primary">Value Map</p>
          <h2 className="mt-3 font-[var(--font-display)] text-3xl font-black tracking-tight">
            High score, low price lives in the upper-left.
          </h2>
        </div>
        <div className="relative h-[420px] rounded-md border border-border bg-white p-6">
          <div className="absolute inset-6 border-l border-b border-slate-300" />
          <span className="absolute left-6 top-4 text-xs font-semibold text-muted-foreground">Review score</span>
          <span className="absolute bottom-2 right-6 text-xs font-semibold text-muted-foreground">Current price</span>
          {plotted.slice(0, 40).map((product) => {
            const x = clamp(((product.price.currentPrice || 0) - minPrice) / range, 0, 1)
            const y = clamp((product.consensus.score10 || 0) / 10, 0, 1)
            const isHighValue = product.price.entryStatus === 'best-deal' || product.price.entryStatus === 'great-value'

            return (
              <Link
                key={product.id}
                href={`/products/${product.slug}`}
                className={`absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 ${
                  isHighValue ? 'border-emerald-900 bg-emerald-400' : 'border-slate-700 bg-slate-300'
                }`}
                style={{
                  left: `${24 + x * 70}%`,
                  top: `${88 - y * 72}%`
                }}
                title={`${product.name}: ${product.consensus.score10?.toFixed(1)}/10`}
              >
                <span className="sr-only">{product.name}</span>
              </Link>
            )
          })}
        </div>
      </div>
    </section>
  )
}
