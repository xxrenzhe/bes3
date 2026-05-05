import Link from 'next/link'
import { Globe } from 'lucide-react'
import { DEFAULT_LOCALE, SUPPORTED_LOCALES, addLocaleToPath, getLocaleLabel, type SiteLocale } from '@/lib/i18n'

export function LocaleSwitcher({
  currentLocale,
  currentPath
}: {
  currentLocale: SiteLocale
  currentPath: string
}) {
  return (
    <details className="group relative">
      <summary
        role="button"
        aria-label={`Change language, current language ${currentLocale.toUpperCase()}`}
        className="flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-full border border-border/70 bg-white/80 px-3 py-2 text-sm font-semibold text-foreground transition-[border-color,color,box-shadow] hover:border-primary/30 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
      >
        <Globe className="h-4 w-4" aria-hidden="true" />
        <span>{currentLocale.toUpperCase()}</span>
        <span aria-hidden="true" className="text-xs transition-transform group-open:rotate-180">⌄</span>
      </summary>
      <div className="absolute right-0 z-50 mt-3 w-48 rounded-[1.25rem] border border-border bg-white p-3 shadow-panel">
        <div className="space-y-1">
          {SUPPORTED_LOCALES.map((locale) => {
            const href = addLocaleToPath(currentPath, locale)
            const active = locale === currentLocale

            return (
              <Link
                key={locale}
                href={href}
                className={`flex min-h-11 items-center justify-between rounded-xl px-3 py-2 text-sm transition-colors ${
                  active ? 'bg-emerald-50 font-semibold text-primary' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
                hrefLang={locale}
              >
                <span>{getLocaleLabel(locale)}</span>
                <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                  {locale === DEFAULT_LOCALE ? 'Default' : locale.toUpperCase()}
                </span>
              </Link>
            )
          })}
        </div>
      </div>
    </details>
  )
}
