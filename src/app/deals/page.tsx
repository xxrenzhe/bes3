import { PublicShell } from '@/components/layout/PublicShell'
import { PrimaryCta } from '@/components/site/PrimaryCta'
import { listProducts } from '@/lib/site-data'

export default async function DealsPage() {
  const products = (await listProducts()).slice(0, 6)

  return (
    <PublicShell>
      <div className="mx-auto max-w-7xl space-y-10 px-4 py-14 sm:px-6 lg:px-8">
        <div className="rounded-[32px] border border-border bg-[linear-gradient(135deg,#fff2e5_0%,#fff 48%,#eef8f3_100%)] p-8 shadow-panel">
          <p className="font-mono text-xs uppercase tracking-[0.28em] text-primary">Deals Hub</p>
          <h1 className="mt-4 font-[var(--font-display)] text-5xl font-semibold tracking-tight">Live deal board for high-intent shoppers.</h1>
          <p className="mt-4 max-w-2xl text-lg leading-8 text-muted-foreground">Prime Day, Black Friday, or daily price drops: Bes3 surfaces pages with clean pricing context and fast buyer CTAs.</p>
        </div>
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {products.map((product) => (
            <div key={product.id} className="rounded-[28px] border border-border bg-white p-6 shadow-panel">
              <div className="inline-flex rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-rose-700">Live Deal</div>
              <h2 className="mt-5 font-[var(--font-display)] text-2xl font-semibold">{product.productName}</h2>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">{product.description}</p>
              <div className="mt-5 flex items-end gap-3">
                <p className="text-3xl font-semibold">{product.priceCurrency} {product.priceAmount?.toFixed(2)}</p>
                <p className="pb-1 text-sm text-muted-foreground line-through">{product.priceCurrency} {((product.priceAmount || 0) * 1.18).toFixed(2)}</p>
              </div>
              <div className="mt-6">
                <PrimaryCta href={product.resolvedUrl || '#'} label="Check Current Price on Amazon" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </PublicShell>
  )
}
