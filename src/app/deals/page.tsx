import { PublicShell } from '@/components/layout/PublicShell'
import { PrimaryCta } from '@/components/site/PrimaryCta'
import { formatEditorialDate, getFreshnessLabel } from '@/lib/editorial'
import { buildMerchantExitPath } from '@/lib/merchant-links'
import { listPublishedProducts } from '@/lib/site-data'
import { formatPriceSnapshot } from '@/lib/utils'

export default async function DealsPage() {
  const products = (await listPublishedProducts()).filter((product) => product.resolvedUrl).slice(0, 6)

  return (
    <PublicShell>
      <div className="space-y-16">
        <section className="overflow-hidden bg-[linear-gradient(135deg,hsl(var(--primary)),#00855d)] px-4 py-16 text-white sm:px-6 lg:px-8 lg:py-24">
          <div className="mx-auto flex max-w-7xl flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl space-y-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-emerald-200">Timed Editorial Drop</p>
              <h1 className="font-[var(--font-display)] text-5xl font-black tracking-tight sm:text-7xl">Today&apos;s best live deals.</h1>
              <p className="max-w-2xl text-lg leading-8 text-emerald-50/80">
                Bes3 surfaces the strongest value opportunities we can verify right now. No fake markdowns, just the current price context and the products worth checking.
              </p>
            </div>
            <div className="glass-panel rounded-[2rem] px-8 py-6 text-center text-foreground">
              <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-primary">Current snapshot</p>
              <p className="mt-3 text-4xl font-black">{products.length}</p>
              <p className="mt-2 text-sm text-muted-foreground">Deals currently surfaced on Bes3</p>
            </div>
          </div>
        </section>
        <section className="mx-auto max-w-7xl px-4 pb-20 sm:px-6 lg:px-8">
          <div className="mb-10">
            <p className="editorial-kicker">Today&apos;s Selection</p>
            <h2 className="mt-3 font-[var(--font-display)] text-4xl font-black tracking-tight">Curated Live Deals</h2>
          </div>
          <div className="grid gap-8 md:grid-cols-2 xl:grid-cols-3">
            {products.map((product) => (
              <div key={product.id} className="editorial-shadow group overflow-hidden rounded-[2rem] bg-white">
                <div className="flex items-center justify-between px-6 pt-6">
                  <span className="rounded-full bg-rose-100 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-rose-700">Live Deal</span>
                  <span className="text-sm font-semibold text-muted-foreground">{getFreshnessLabel(product.updatedAt || product.publishedAt)}</span>
                </div>
                <div className="space-y-4 p-6">
                  <h2 className="font-[var(--font-display)] text-3xl font-black tracking-tight">{product.productName}</h2>
                  <p className="text-sm leading-7 text-muted-foreground">{product.description || 'Live pricing snapshot with a direct path to the current merchant page.'}</p>
                  <div className="rounded-[1.5rem] bg-muted p-5">
                    <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground">Current price snapshot</p>
                    <p className="mt-3 text-3xl font-black text-foreground">{formatPriceSnapshot(product.priceAmount, product.priceCurrency || 'USD')}</p>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {product.reviewCount ? `${product.reviewCount.toLocaleString()} reviews tracked` : 'Review count unavailable'} · Checked {formatEditorialDate(product.updatedAt || product.publishedAt)}
                    </p>
                  </div>
                  <PrimaryCta
                    href={buildMerchantExitPath(product.id, 'deals-grid')}
                    label="Check Current Price"
                    note={`Decision note: move fast only if this still fits your actual use case and budget.`}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </PublicShell>
  )
}
