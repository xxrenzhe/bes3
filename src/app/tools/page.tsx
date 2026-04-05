import type { Metadata } from 'next'
import Link from 'next/link'
import { PublicShell } from '@/components/layout/PublicShell'
import { ShoppingTools } from '@/components/site/ShoppingTools'
import { buildPageMetadata } from '@/lib/metadata'
import { getRequestLocale } from '@/lib/request-locale'

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadata({
    title: 'Shopping Tools',
    description: 'Use Bes3 shopping tools to check price-drop math, shortlist readiness, and a public buying-data feed without leaving the buyer workflow.',
    path: '/tools',
    locale: getRequestLocale(),
    keywords: ['shopping tools', 'price drop calculator', 'shortlist tool', 'buying data feed']
  })
}

export default function ToolsPage() {
  return (
    <PublicShell>
      <div className="mx-auto max-w-7xl space-y-12 px-4 py-16 sm:px-6 lg:px-8">
        <section className="rounded-[2.5rem] bg-[linear-gradient(135deg,#fff8ef_0%,#f8fbff_48%,#eefaf5_100%)] p-8 shadow-panel sm:p-10">
          <p className="editorial-kicker">Tools</p>
          <h1 className="mt-4 font-[var(--font-display)] text-5xl font-black tracking-tight text-foreground sm:text-6xl">
            Utility tools that keep the buying decision moving.
          </h1>
          <p className="mt-4 max-w-3xl text-lg leading-8 text-muted-foreground">
            These small tools turn price timing, shortlist quality, and open buying data into something you can act on immediately instead of guessing.
          </p>
          <div className="mt-8 rounded-[1.75rem] border border-emerald-100 bg-white p-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">Open data</p>
            <p className="mt-3 text-sm leading-7 text-muted-foreground">
              Bes3 also exposes a lightweight public feed for verified products and live editorial coverage so external tools and automation can reuse a sanitized subset of the catalog.
            </p>
            <Link href="/api/open/buying-feed" className="mt-4 inline-flex text-sm font-semibold text-primary">
              Open public JSON feed →
            </Link>
          </div>
        </section>

        <ShoppingTools />
      </div>
    </PublicShell>
  )
}
