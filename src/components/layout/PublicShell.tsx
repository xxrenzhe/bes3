import Link from 'next/link'
import { DEFAULT_SITE_NAME, DEFAULT_SITE_TAGLINE } from '@/lib/constants'
import { CookieConsentBanner } from '@/components/site/CookieConsentBanner'
import { ExitIntentCapture } from '@/components/site/ExitIntentCapture'
import { LocaleSwitcher } from '@/components/site/LocaleSwitcher'
import { addLocaleToPath } from '@/lib/i18n'
import { getRequestDisplayPath, getRequestLocale } from '@/lib/request-locale'

export async function PublicShell({ children }: { children: React.ReactNode }) {
  const locale = getRequestLocale()
  const displayPath = getRequestDisplayPath()
  const navItems = [
    { href: '/categories', label: 'Hardcore Roster' },
    { href: '/products', label: 'Evidence Matrix' },
    { href: '/deals', label: 'Best Value' },
    { href: '/data', label: 'Open Data' },
    { href: '/trust', label: 'Trust' },
    { href: '/about', label: 'About' }
  ]

  return (
    <div className="min-h-screen bg-background text-foreground">
      <a
        href="#main-content"
        className="absolute left-4 top-4 z-[70] -translate-y-20 rounded-md bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition-transform focus:translate-y-0 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
      >
        Skip to main content
      </a>
      <div className="border-b border-amber-300 bg-amber-50 px-4 py-2 text-center text-xs font-semibold text-amber-950">
        We extract real data to help you choose. If you buy through our links, we may earn a commission at no extra cost to you.
      </div>
      <header className="sticky top-0 z-40 border-b border-border bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-4 py-4 sm:px-6 lg:px-8">
          <Link href={addLocaleToPath('/', locale)} className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-slate-950 font-black text-white">B3</div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-primary">Hardcore Rotten Tomatoes</p>
              <p className="font-[var(--font-display)] text-xl font-black tracking-tight">{DEFAULT_SITE_NAME}</p>
            </div>
          </Link>
          <nav aria-label="Primary navigation" className="hidden items-center gap-5 md:flex">
            {navItems.map((item) => (
              <Link key={item.href} href={addLocaleToPath(item.href, locale)} className="text-sm font-semibold text-muted-foreground hover:text-primary">
                {item.label}
              </Link>
            ))}
            <LocaleSwitcher currentLocale={locale} currentPath={displayPath} />
          </nav>
          <details className="relative md:hidden">
            <summary className="flex min-h-11 cursor-pointer list-none items-center rounded-md border border-border bg-white px-4 py-2 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">
              Menu
            </summary>
            <div className="absolute right-0 mt-3 w-64 rounded-md border border-border bg-white p-3 shadow-panel">
              <nav aria-label="Mobile navigation" className="flex flex-col gap-1">
                {navItems.map((item) => (
                  <Link
                    key={item.href}
                    href={addLocaleToPath(item.href, locale)}
                    className="flex min-h-11 items-center rounded-md px-3 py-2 text-sm font-semibold text-muted-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>
            </div>
          </details>
        </div>
      </header>
      <main id="main-content">{children}</main>
      <ExitIntentCapture locale={locale} pathname={displayPath} />
      <CookieConsentBanner />
      <footer className="border-t border-border bg-slate-950 text-white">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[1.4fr_1fr_1fr] lg:px-8">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.28em] text-emerald-300">Cut the crap</p>
            <h2 className="mt-3 font-[var(--font-display)] text-3xl font-black">{DEFAULT_SITE_NAME}</h2>
            <p className="mt-3 max-w-xl text-sm leading-7 text-slate-300">{DEFAULT_SITE_TAGLINE}</p>
          </div>
          <nav aria-label="Explore" className="flex flex-col gap-3 text-sm text-slate-300">
            <Link href={addLocaleToPath('/categories', locale)}>Hardcore Roster</Link>
            <Link href={addLocaleToPath('/products', locale)}>Evidence Matrix</Link>
            <Link href={addLocaleToPath('/deals', locale)}>Best Value Lab</Link>
            <Link href={addLocaleToPath('/site-map', locale)}>Sitemap</Link>
            <Link href="/llms.txt">LLMs Manifest</Link>
          </nav>
          <nav aria-label="Company" className="flex flex-col gap-3 text-sm text-slate-300">
            <Link href={addLocaleToPath('/about', locale)}>About</Link>
            <Link href={addLocaleToPath('/trust', locale)}>Trust</Link>
            <Link href={addLocaleToPath('/privacy', locale)}>Privacy</Link>
            <Link href={addLocaleToPath('/terms', locale)}>Terms</Link>
          </nav>
        </div>
      </footer>
    </div>
  )
}
