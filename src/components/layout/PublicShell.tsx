import Link from 'next/link'
import { DEFAULT_SITE_NAME, DEFAULT_SITE_TAGLINE } from '@/lib/constants'
import { ShortlistDock } from '@/components/site/ShortlistDock'
import { ShortlistNav } from '@/components/site/ShortlistNav'

const NAV_ITEMS = [
  { href: '/', label: 'Home' },
  { href: '/search', label: 'Search' },
  { href: '/deals', label: 'Deals' },
  { href: '/directory', label: 'Directory' },
  { href: '/about', label: 'How We Test' },
  { href: '/newsletter', label: 'Newsletter' }
]

export function PublicShell({
  children
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <a
        href="#main-content"
        className="absolute left-4 top-4 z-[70] -translate-y-20 rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition-transform focus:translate-y-0 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
      >
        Skip to main content
      </a>
      <header className="sticky top-0 z-40 px-3 py-3 sm:px-6">
        <div className="glass-nav editorial-shadow mx-auto flex max-w-7xl items-center justify-between rounded-full border border-white/60 px-5 py-4 sm:px-7">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[linear-gradient(135deg,hsl(var(--primary)),#00855d)] text-sm font-black text-primary-foreground">
              B3
            </div>
            <div className="hidden sm:block">
              <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-muted-foreground">Digital Curator</p>
              <p className="font-[var(--font-display)] text-xl font-extrabold tracking-tight text-foreground">{DEFAULT_SITE_NAME}</p>
            </div>
          </Link>
          <nav aria-label="Primary navigation" className="hidden items-center gap-6 md:flex">
            {NAV_ITEMS.map((item) => (
              <Link key={item.href} href={item.href} className="text-sm font-semibold tracking-tight text-muted-foreground transition-colors hover:text-primary">
                {item.label}
              </Link>
            ))}
            <ShortlistNav />
            <Link
              href="/login"
              className="rounded-full bg-[linear-gradient(135deg,hsl(var(--primary)),#00855d)] px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-lg shadow-emerald-950/10 transition-transform hover:-translate-y-0.5"
            >
              Sign In
            </Link>
          </nav>
          <details className="relative md:hidden">
            <summary
              aria-label="Open site menu"
              className="list-none rounded-full border border-border/70 bg-white/70 px-4 py-2 text-sm font-semibold text-foreground"
            >
              Menu
            </summary>
            <div className="absolute right-0 mt-3 w-56 rounded-[1.5rem] border border-border bg-white p-4 shadow-panel">
              <nav aria-label="Mobile navigation" className="flex flex-col gap-3">
                {NAV_ITEMS.map((item) => (
                  <Link key={item.href} href={item.href} className="rounded-xl px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-primary">
                    {item.label}
                  </Link>
                ))}
                <ShortlistNav mobile />
                <Link href="/login" className="rounded-xl bg-[linear-gradient(135deg,hsl(var(--primary)),#00855d)] px-3 py-2 text-sm font-semibold text-primary-foreground">
                  Sign In
                </Link>
              </nav>
            </div>
          </details>
        </div>
      </header>
      <main id="main-content" className="pb-24">
        {children}
      </main>
      <ShortlistDock />
      <footer className="mt-10 border-t border-border/40 bg-[linear-gradient(180deg,rgba(239,244,255,0.55),rgba(248,249,255,0.96))]">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[1.3fr_1fr_1fr] lg:px-8">
          <div className="space-y-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-muted-foreground">Tech Buying Intelligence</p>
            <h2 className="font-[var(--font-display)] text-2xl font-black tracking-tight text-foreground">{DEFAULT_SITE_NAME}</h2>
            <p className="max-w-xl text-sm leading-7 text-muted-foreground">
              {DEFAULT_SITE_TAGLINE} Bes3 is a buyer-first consumer guide that turns noisy research into shortlists, comparisons, deep dives, and price-aware next steps.
            </p>
          </div>
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-[0.22em] text-foreground">Explore</h3>
            <nav aria-label="Explore Bes3" className="mt-4 flex flex-col gap-3 text-sm text-muted-foreground">
              <Link href="/">Home</Link>
              <Link href="/search">Search</Link>
              <Link href="/categories/home-office">Categories</Link>
              <Link href="/deals">Deals</Link>
              <Link href="/directory">Directory</Link>
              <Link href="/shortlist">Shortlist</Link>
            </nav>
          </div>
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-[0.22em] text-foreground">Company</h3>
            <nav aria-label="Company links" className="mt-4 flex flex-col gap-3 text-sm text-muted-foreground">
              <Link href="/about">About</Link>
              <Link href="/contact">Contact</Link>
              <Link href="/privacy">Privacy</Link>
              <Link href="/terms">Terms</Link>
            </nav>
          </div>
        </div>
      </footer>
    </div>
  )
}
