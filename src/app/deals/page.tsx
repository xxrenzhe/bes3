import type { Metadata } from 'next'
import Link from 'next/link'
import { PublicShell } from '@/components/layout/PublicShell'
import { PrimaryCta } from '@/components/site/PrimaryCta'
import { ShortlistActionBar } from '@/components/site/ShortlistActionBar'
import { formatEditorialDate, getCategoryLabel, getFreshnessLabel } from '@/lib/editorial'
import { buildPageMetadata } from '@/lib/metadata'
import { buildMerchantExitPath } from '@/lib/merchant-links'
import { toShortlistItem } from '@/lib/shortlist'
import { listPublishedProducts } from '@/lib/site-data'
import { formatPriceSnapshot } from '@/lib/utils'

export const metadata: Metadata = buildPageMetadata({
  title: 'Live Deals',
  description:
    'Browse Bes3 live deals with buyer-fit context, shortlist saves, and price-watch routes so markdowns support better decisions instead of worse ones.',
  path: '/deals'
})

export default async function DealsPage() {
  const products = (await listPublishedProducts()).filter((product) => product.resolvedUrl).slice(0, 6)
  const leadProduct = products[0] || null
  const dealsRoutes = [
    {
      eyebrow: 'Validate',
      title: leadProduct?.slug ? 'Open the lead deep-dive' : 'Recheck product fit',
      description: 'Deals should be the last accelerator, not the first filter. Validate buyer fit before a markdown pushes you into the wrong product lane.',
      href: leadProduct?.slug ? `/products/${leadProduct.slug}` : '/directory',
      label: leadProduct?.slug ? 'Open product page' : 'Browse categories'
    },
    {
      eyebrow: 'Save',
      title: 'Keep finalists in shortlist',
      description: 'Use shortlist to hold the good options together so a price move does not destroy your comparison context.',
      href: '/shortlist',
      label: 'Open shortlist'
    },
    {
      eyebrow: 'Watch',
      title: leadProduct?.category ? `Track ${getCategoryLabel(leadProduct.category)}` : 'Start price alerts',
      description: 'If the current deal is close but not quite right, turn the category into a watch flow rather than buying under pressure.',
      href: leadProduct?.category
        ? `/newsletter?intent=price-alert&category=${encodeURIComponent(leadProduct.category)}&cadence=priority`
        : '/newsletter?intent=deals&cadence=priority',
      label: 'Start price watch'
    },
    {
      eyebrow: 'Explore',
      title: 'Return to category lanes',
      description: 'When the markdown looks better than the fit, go back to category hubs and keep the decision grounded.',
      href: '/directory',
      label: 'Browse category hubs'
    }
  ]

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
        <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-[2.5rem] bg-[linear-gradient(135deg,#fff8ef_0%,#f8fbff_48%,#eefaf5_100%)] p-8 shadow-panel sm:p-10">
            <div className="grid gap-8 xl:grid-cols-[1fr_0.95fr] xl:items-start">
              <div>
                <p className="editorial-kicker">How To Use Deals</p>
                <h2 className="mt-3 font-[var(--font-display)] text-4xl font-black tracking-tight text-foreground">Let price accelerate a good decision, not create a bad one.</h2>
                <p className="mt-4 max-w-3xl text-sm leading-8 text-muted-foreground">
                  Bes3 deals only matter after product fit is credible. Validate first, save finalists in shortlist, and move to alerts when the right price has not arrived yet.
                </p>
                <div className="mt-6 rounded-[1.75rem] bg-slate-950 p-5 text-white">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-200">Best current route</p>
                  <p className="mt-3 text-sm leading-7 text-slate-200">
                    Check a deal immediately only if you already trust the product fit. Otherwise the right move is a deep-dive, shortlist save, or price-watch setup before you click out.
                  </p>
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                {dealsRoutes.map((route) => (
                  <Link
                    key={route.title}
                    href={route.href}
                    className="rounded-[1.75rem] bg-white p-6 shadow-[0_24px_60px_-40px_rgba(15,23,42,0.35)] transition-transform hover:-translate-y-1"
                  >
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">{route.eyebrow}</p>
                    <h2 className="mt-3 font-[var(--font-display)] text-2xl font-black tracking-tight text-foreground">{route.title}</h2>
                    <p className="mt-3 text-sm leading-7 text-muted-foreground">{route.description}</p>
                    <p className="mt-5 text-sm font-semibold text-primary">{route.label} →</p>
                  </Link>
                ))}
              </div>
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
                  <div className="flex flex-wrap gap-3">
                    {product.slug ? (
                      <Link href={`/products/${product.slug}`} className="rounded-full border border-border px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-muted">
                        Open deep-dive
                      </Link>
                    ) : null}
                    <Link
                      href={
                        product.category
                          ? `/newsletter?intent=price-alert&category=${encodeURIComponent(product.category)}&cadence=priority`
                          : '/newsletter?intent=deals&cadence=priority'
                      }
                      className="rounded-full border border-border px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
                    >
                      {product.category ? `Track ${getCategoryLabel(product.category)}` : 'Track deals'}
                    </Link>
                  </div>
                  <ShortlistActionBar item={toShortlistItem(product)} compact source="deals-grid" />
                  <PrimaryCta
                    href={buildMerchantExitPath(product.id, 'deals-grid')}
                    productId={product.id}
                    trackingSource="deals-grid"
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
