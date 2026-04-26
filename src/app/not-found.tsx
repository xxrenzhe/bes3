import Link from 'next/link'
import { PublicShell } from '@/components/layout/PublicShell'
import { HARDCORE_CATEGORIES } from '@/lib/hardcore'
import { getRequestBasePath } from '@/lib/request-locale'

export default function NotFound() {
  const requestPath = getRequestBasePath()

  return (
    <PublicShell>
      <section className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <p className="text-xs font-bold uppercase tracking-[0.28em] text-primary">404 Recovery</p>
          <h1 className="mt-4 max-w-5xl font-[var(--font-display)] text-5xl font-black tracking-tight sm:text-7xl">
            That route is outside the v2 evidence graph.
          </h1>
          <p className="mt-6 max-w-3xl text-lg leading-8 text-muted-foreground">
            Requested path: {requestPath}. Bes3 now routes recovery through the hardcore roster, product evidence matrix, and best-value lab.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/categories" className="rounded-md bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground">
              Open hardcore roster
            </Link>
            <Link href="/products" className="rounded-md border border-border bg-white px-5 py-3 text-sm font-semibold hover:border-primary hover:text-primary">
              Open evidence matrix
            </Link>
            <Link href="/deals" className="rounded-md border border-border bg-white px-5 py-3 text-sm font-semibold hover:border-primary hover:text-primary">
              Open best value lab
            </Link>
          </div>
        </div>
      </section>
      <section className="px-4 pb-16 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-5 md:grid-cols-2 xl:grid-cols-3">
          {HARDCORE_CATEGORIES.slice(0, 6).map((category) => (
            <Link key={category.slug} href={`/categories/${category.slug}`} className="rounded-md border border-border bg-white p-6 hover:border-primary">
              <h2 className="font-[var(--font-display)] text-2xl font-black">{category.name}</h2>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">{category.metrics.slice(0, 3).join(' | ')}</p>
            </Link>
          ))}
        </div>
      </section>
    </PublicShell>
  )
}
