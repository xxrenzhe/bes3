import Link from 'next/link'
import { DEFAULT_SITE_NAME, DEFAULT_SITE_TAGLINE } from '@/lib/constants'
import { ExitIntentCapture } from '@/components/site/ExitIntentCapture'
import { LocaleSwitcher } from '@/components/site/LocaleSwitcher'
import { ShortlistDock } from '@/components/site/ShortlistDock'
import { ShortlistNav } from '@/components/site/ShortlistNav'
import { addLocaleToPath, getShellDictionary } from '@/lib/i18n'
import { getRequestDisplayPath, getRequestLocale } from '@/lib/request-locale'

export async function PublicShell({
  children
}: {
  children: React.ReactNode
}) {
  const locale = getRequestLocale()
  const displayPath = getRequestDisplayPath()
  const copy = getShellDictionary(locale)
  const navItems = [
    { href: '/start', label: copy.navStartHere },
    { href: '/search', label: copy.navSearch },
    { href: '/directory', label: copy.navDirectory },
    { href: '/brands', label: copy.navBrands },
    { href: '/deals', label: copy.navDeals },
    { href: '/about', label: copy.navAbout },
    { href: '/newsletter', label: copy.navAlerts }
  ]

  return (
    <div className="min-h-screen bg-background text-foreground">
      <a
        href="#main-content"
        className="absolute left-4 top-4 z-[70] -translate-y-20 rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition-transform focus:translate-y-0 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
      >
        {copy.skipToMainContent}
      </a>
      <header className="sticky top-0 z-40 px-3 py-3 sm:px-6">
        <div className="glass-nav editorial-shadow mx-auto flex max-w-7xl items-center justify-between rounded-full border border-white/60 px-5 py-4 sm:px-7">
          <Link href={addLocaleToPath('/', locale)} className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[linear-gradient(135deg,hsl(var(--primary)),#00855d)] text-sm font-black text-primary-foreground">
              B3
            </div>
            <div className="hidden sm:block">
              <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-muted-foreground">{copy.brandKicker}</p>
              <p className="font-[var(--font-display)] text-xl font-extrabold tracking-tight text-foreground">{DEFAULT_SITE_NAME}</p>
            </div>
          </Link>
          <nav aria-label="Primary navigation" className="hidden items-center gap-6 md:flex">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={addLocaleToPath(item.href, locale)}
                className="text-sm font-semibold tracking-tight text-muted-foreground transition-colors hover:text-primary"
              >
                {item.label}
              </Link>
            ))}
            <ShortlistNav />
            <LocaleSwitcher currentLocale={locale} currentPath={displayPath} />
            <Link
              href={addLocaleToPath('/login', locale)}
              className="rounded-full bg-[linear-gradient(135deg,hsl(var(--primary)),#00855d)] px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-lg shadow-emerald-950/10 transition-transform hover:-translate-y-0.5"
            >
              {copy.navSignIn}
            </Link>
          </nav>
          <details className="relative md:hidden">
            <summary
              aria-label="Open site menu"
              className="list-none rounded-full border border-border/70 bg-white/70 px-4 py-2 text-sm font-semibold text-foreground"
            >
              {copy.navMenu}
            </summary>
            <div className="absolute right-0 mt-3 w-56 rounded-[1.5rem] border border-border bg-white p-4 shadow-panel">
              <nav aria-label="Mobile navigation" className="flex flex-col gap-3">
                {navItems.map((item) => (
                  <Link
                    key={item.href}
                    href={addLocaleToPath(item.href, locale)}
                    className="rounded-xl px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-primary"
                  >
                    {item.label}
                  </Link>
                ))}
                <ShortlistNav mobile />
                <div className="px-3 py-2">
                  <LocaleSwitcher currentLocale={locale} currentPath={displayPath} />
                </div>
                <Link
                  href={addLocaleToPath('/login', locale)}
                  className="rounded-xl bg-[linear-gradient(135deg,hsl(var(--primary)),#00855d)] px-3 py-2 text-sm font-semibold text-primary-foreground"
                >
                  {copy.navSignIn}
                </Link>
              </nav>
            </div>
          </details>
        </div>
      </header>
      <main id="main-content" className="pb-24">
        {children}
      </main>
      <ExitIntentCapture locale={locale} pathname={displayPath} />
      <ShortlistDock />
      <footer className="mt-10 border-t border-border/40 bg-[linear-gradient(180deg,rgba(239,244,255,0.55),rgba(248,249,255,0.96))]">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[1.3fr_1fr_1fr] lg:px-8">
          <div className="space-y-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-muted-foreground">{copy.brandKicker}</p>
            <h2 className="font-[var(--font-display)] text-2xl font-black tracking-tight text-foreground">{DEFAULT_SITE_NAME}</h2>
            <p className="max-w-xl text-sm leading-7 text-muted-foreground">
              {DEFAULT_SITE_TAGLINE} {copy.footerDescription}
            </p>
          </div>
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-[0.22em] text-foreground">{copy.footerExplore}</h3>
            <nav aria-label="Explore Bes3" className="mt-4 flex flex-col gap-3 text-sm text-muted-foreground">
              <Link href={addLocaleToPath('/', locale)}>{copy.footerHome}</Link>
              <Link href={addLocaleToPath('/start', locale)}>{copy.navStartHere}</Link>
              <Link href={addLocaleToPath('/search', locale)}>{copy.navSearch}</Link>
              <Link href={addLocaleToPath('/categories/home-office', locale)}>{copy.footerCategories}</Link>
              <Link href={addLocaleToPath('/brands', locale)}>{copy.navBrands}</Link>
              <Link href={addLocaleToPath('/deals', locale)}>{copy.navDeals}</Link>
              <Link href={addLocaleToPath('/directory', locale)}>{copy.navDirectory}</Link>
              <Link href={addLocaleToPath('/tools', locale)}>Tools</Link>
              <Link href={addLocaleToPath('/shortlist', locale)}>{copy.footerShortlist}</Link>
            </nav>
          </div>
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-[0.22em] text-foreground">{copy.footerCompany}</h3>
            <nav aria-label="Company links" className="mt-4 flex flex-col gap-3 text-sm text-muted-foreground">
              <Link href={addLocaleToPath('/about', locale)}>{copy.navAbout}</Link>
              <Link href={addLocaleToPath('/contact', locale)}>Contact</Link>
              <Link href={addLocaleToPath('/privacy', locale)}>Privacy</Link>
              <Link href={addLocaleToPath('/terms', locale)}>Terms</Link>
            </nav>
          </div>
        </div>
      </footer>
    </div>
  )
}
