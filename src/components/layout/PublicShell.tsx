import Link from 'next/link'
import { DEFAULT_SITE_NAME, DEFAULT_SITE_TAGLINE } from '@/lib/constants'

const NAV_ITEMS = [
  { href: '/', label: 'Home' },
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
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border/80 bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary text-sm font-bold text-primary-foreground shadow-panel">
              B3
            </div>
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.28em] text-muted-foreground">Independent Tech Picks</p>
              <h1 className="font-[var(--font-display)] text-xl font-semibold text-foreground">{DEFAULT_SITE_NAME}</h1>
            </div>
          </Link>
          <nav className="hidden items-center gap-6 md:flex">
            {NAV_ITEMS.map((item) => (
              <Link key={item.href} href={item.href} className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
                {item.label}
              </Link>
            ))}
            <Link
              href="/admin"
              className="rounded-full border border-border bg-white px-4 py-2 text-sm font-semibold text-foreground shadow-sm transition-transform hover:-translate-y-0.5"
            >
              Admin
            </Link>
          </nav>
        </div>
      </header>
      <main>{children}</main>
      <footer className="border-t border-border bg-[#f7f1e4]">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[1.3fr_1fr_1fr] lg:px-8">
          <div className="space-y-4">
            <p className="font-mono text-xs uppercase tracking-[0.28em] text-muted-foreground">Tech Buying Intelligence</p>
            <h2 className="font-[var(--font-display)] text-2xl font-semibold text-foreground">{DEFAULT_SITE_NAME}</h2>
            <p className="max-w-xl text-sm leading-7 text-muted-foreground">{DEFAULT_SITE_TAGLINE} Bes3 turns affiliate products into high-signal review and comparison pages with a transparent, buyer-first tone.</p>
          </div>
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-[0.22em] text-foreground">Explore</h3>
            <div className="mt-4 flex flex-col gap-3 text-sm text-muted-foreground">
              <Link href="/">Home</Link>
              <Link href="/search">Search</Link>
              <Link href="/deals">Deals</Link>
              <Link href="/directory">Directory</Link>
            </div>
          </div>
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-[0.22em] text-foreground">Company</h3>
            <div className="mt-4 flex flex-col gap-3 text-sm text-muted-foreground">
              <Link href="/about">About</Link>
              <Link href="/contact">Contact</Link>
              <Link href="/privacy">Privacy</Link>
              <Link href="/terms">Terms</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
