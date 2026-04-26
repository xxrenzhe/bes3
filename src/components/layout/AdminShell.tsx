'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Database, ExternalLink, FileText, GitBranch, Globe2, LayoutDashboard, LogOut, Search, Settings, ShieldAlert, ShieldCheck, ShoppingCart, Tags, TrendingUp, Users, Video, Wand2 } from 'lucide-react'
import { DEFAULT_ADMIN_USERNAME } from '@/lib/constants'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/products', label: 'Products', icon: ShoppingCart },
  { href: '/admin/evidence', label: 'Evidence', icon: Video },
  { href: '/admin/taxonomy', label: 'Taxonomy', icon: Tags },
  { href: '/admin/price-value', label: 'Price & Value', icon: TrendingUp },
  { href: '/admin/pipeline-runs', label: 'Pipeline Runs', icon: GitBranch },
  { href: '/admin/risk', label: 'Risk Center', icon: ShieldAlert },
  { href: '/admin/articles', label: 'Articles', icon: FileText },
  { href: '/admin/prompts', label: 'Prompts', icon: Wand2 },
  { href: '/admin/seo-ops', label: 'SEO Ops', icon: Globe2 },
  { href: '/admin/governance', label: 'Governance', icon: ShieldCheck },
  { href: '/admin/data', label: 'Data', icon: Database },
  { href: '/admin/users', label: 'Users', icon: Users },
  { href: '/admin/settings', label: 'Settings', icon: Settings }
]

function isActive(pathname: string, href: string) {
  if (href === '/admin') return pathname === href
  return pathname.startsWith(href)
}

export function AdminShell({
  children
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const currentSection = NAV_ITEMS.find((item) => isActive(pathname, item.href))?.label || 'Workspace'

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="grid min-h-screen lg:grid-cols-[288px_1fr]">
        <aside className="sticky top-0 z-40 border-b border-white/10 bg-[linear-gradient(180deg,#0f172a,#020617)] px-4 py-4 lg:static lg:border-b-0 lg:border-r lg:px-5 lg:py-6">
          <div className="rounded-[1.5rem] border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.96),rgba(15,23,42,0.72))] p-4 shadow-[0_28px_70px_-40px_rgba(0,0,0,0.8)] lg:rounded-[2rem] lg:p-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-emerald-300/80">Bes3 Internal Console</p>
            <p className="mt-3 font-[var(--font-display)] text-2xl font-black tracking-tight text-white">Local Generator</p>
            <p className="mt-3 hidden text-sm leading-7 text-slate-300 lg:block">
              Operate the consumer buying-guide engine without leaking internal workflow language into the public site.
            </p>
          </div>

          <details className="mt-4 lg:hidden">
            <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between rounded-[1rem] border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950">
              Admin Menu
              <span className="text-xs uppercase tracking-[0.2em] text-emerald-200">{currentSection}</span>
            </summary>
            <div className="mt-3 max-h-[68vh] overflow-y-auto rounded-[1.25rem] border border-white/10 bg-slate-950/95 p-2 shadow-[0_20px_50px_-30px_rgba(0,0,0,0.8)]">
              <nav aria-label="Admin navigation" className="grid gap-1">
                {NAV_ITEMS.map(({ href, label, icon: Icon }) => (
                  <Link
                    key={href}
                    href={href}
                    className={cn(
                      'flex min-h-11 items-center gap-3 rounded-[1rem] px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950',
                      isActive(pathname, href)
                        ? 'bg-emerald-500/14 text-emerald-200 shadow-[inset_0_0_0_1px_rgba(16,185,129,0.18)]'
                        : 'text-slate-300 hover:bg-white/5 hover:text-white'
                    )}
                  >
                    <Icon className="h-4 w-4" aria-hidden="true" />
                    <span>{label}</span>
                  </Link>
                ))}
              </nav>
              <div className="mt-3 grid gap-2 border-t border-white/10 pt-3">
                <Link
                  href="/"
                  target="_blank"
                  className="flex min-h-11 items-center justify-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-emerald-200 transition-colors hover:bg-emerald-400/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
                >
                  Open Public Site
                  <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                </Link>
                <form action="/api/auth/logout" method="post">
                  <button className="flex min-h-11 w-full items-center justify-center gap-3 rounded-full border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-slate-300 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950">
                    <LogOut className="h-4 w-4" aria-hidden="true" />
                    <span>Sign Out</span>
                  </button>
                </form>
              </div>
            </div>
          </details>

          <nav aria-label="Admin navigation" className="mt-8 hidden gap-2 lg:grid">
            {NAV_ITEMS.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className={cn(
                  'flex items-center gap-3 rounded-[1.25rem] px-4 py-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950',
                  isActive(pathname, href)
                    ? 'bg-emerald-500/14 text-emerald-200 shadow-[inset_0_0_0_1px_rgba(16,185,129,0.18)]'
                    : 'text-slate-300 hover:bg-white/5 hover:text-white'
                )}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                <span>{label}</span>
              </Link>
            ))}
          </nav>

          <div className="mt-8 hidden rounded-[1.75rem] border border-white/10 bg-white/5 p-5 lg:block">
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">Current Focus</p>
            <h2 className="mt-3 text-lg font-semibold text-white">{currentSection}</h2>
            <p className="mt-2 text-sm leading-7 text-slate-300">
              Product ingestion, editorial generation, and operational controls live here. The consumer site stays clean and buyer-facing.
            </p>
            <Link
              href="/"
              target="_blank"
              className="mt-4 inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-emerald-200 transition-colors hover:bg-emerald-400/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
            >
              Open Public Site
              <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          </div>

          <div className="mt-6 hidden rounded-[1.75rem] border border-white/10 bg-black/20 p-5 lg:block">
            <p className="text-sm font-semibold text-white">{DEFAULT_ADMIN_USERNAME}</p>
            <p className="mt-1 text-xs uppercase tracking-[0.22em] text-slate-400">Editorial Ops</p>
          </div>

          <form action="/api/auth/logout" method="post" className="mt-6 hidden lg:block">
            <button className="flex w-full items-center justify-center gap-3 rounded-full border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-slate-300 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950">
              <LogOut className="h-4 w-4" aria-hidden="true" />
              <span>Sign Out</span>
            </button>
          </form>
        </aside>

        <div className="min-w-0 bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,0.12),transparent_26%),linear-gradient(180deg,#f8fbff_0%,#eef4ff_100%)]">
          <header className="sticky top-0 z-30 border-b border-slate-200/70 bg-white/75 backdrop-blur-xl">
            <div className="flex flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-10">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-slate-500">Bes3 Local Admin</p>
                <h2 className="mt-1 font-[var(--font-display)] text-3xl font-black tracking-tight text-slate-950">{currentSection}</h2>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <div className="hidden items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-500 xl:flex">
                  <Search className="h-4 w-4" />
                  <span>Global search coming online</span>
                </div>
                <div className="inline-flex items-center rounded-full bg-emerald-500/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">
                  System Online
                </div>
                <Link
                  href="/admin/settings"
                  aria-label="Open admin settings"
                  className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 transition-colors hover:border-emerald-200 hover:text-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
                >
                  <Settings className="h-4 w-4" aria-hidden="true" />
                </Link>
              </div>
            </div>
          </header>

          <div className="min-h-[calc(100vh-97px)]">{children}</div>
        </div>
      </div>
    </div>
  )
}
