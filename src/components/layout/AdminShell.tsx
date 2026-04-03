import Link from 'next/link'
import { LayoutDashboard, ShoppingCart, GitBranch, FileText, Settings, Wand2, LogOut } from 'lucide-react'

const NAV_ITEMS = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/products', label: 'Products', icon: ShoppingCart },
  { href: '/admin/pipeline-runs', label: 'Pipeline Runs', icon: GitBranch },
  { href: '/admin/articles', label: 'Articles', icon: FileText },
  { href: '/admin/prompts', label: 'Prompts', icon: Wand2 },
  { href: '/admin/settings', label: 'Settings', icon: Settings }
]

export function AdminShell({
  children
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-[#f6f5ef] text-foreground">
      <div className="grid min-h-screen lg:grid-cols-[280px_1fr]">
        <aside className="bg-[#111827] px-6 py-8 text-white">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-panel">
            <p className="font-mono text-xs uppercase tracking-[0.26em] text-emerald-200/80">Bes3 Console</p>
            <h1 className="mt-3 font-[var(--font-display)] text-2xl font-semibold">Autobes3</h1>
            <p className="mt-2 text-sm leading-7 text-slate-300">One-click affiliate ingestion, scraping, keyword mining, content generation, and SEO publishing.</p>
          </div>
          <nav className="mt-8 space-y-2">
            {NAV_ITEMS.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className="flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium text-slate-200 transition-colors hover:bg-white/10 hover:text-white"
              >
                <Icon className="h-4 w-4" />
                <span>{label}</span>
              </Link>
            ))}
          </nav>
          <form action="/api/auth/logout" method="post" className="mt-8">
            <button className="flex w-full items-center gap-3 rounded-2xl border border-white/10 px-4 py-3 text-sm font-medium text-slate-300 transition-colors hover:bg-white/10 hover:text-white">
              <LogOut className="h-4 w-4" />
              <span>Logout</span>
            </button>
          </form>
        </aside>
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  )
}
