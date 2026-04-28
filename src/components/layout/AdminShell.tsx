'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import {
  ChevronDown,
  Database,
  ExternalLink,
  FileText,
  GitBranch,
  Globe2,
  LayoutDashboard,
  LogOut,
  Menu,
  Search,
  Settings,
  ShieldAlert,
  ShieldCheck,
  ShoppingCart,
  Tags,
  TrendingUp,
  User,
  Users,
  Video,
  Wand2,
  X
} from 'lucide-react'
import { DEFAULT_ADMIN_USERNAME } from '@/lib/constants'
import { cn } from '@/lib/utils'

const NAV_GROUPS = [
  {
    label: '运营工作台',
    items: [
      { href: '/admin', label: '总览', icon: LayoutDashboard },
      { href: '/admin/products', label: '商品', icon: ShoppingCart },
      { href: '/admin/articles', label: '文章', icon: FileText },
      { href: '/admin/pipeline-runs', label: '流水线', icon: GitBranch }
    ]
  },
  {
    label: '内容与增长',
    items: [
      { href: '/admin/evidence', label: '证据库', icon: Video },
      { href: '/admin/taxonomy', label: '分类实验室', icon: Tags },
      { href: '/admin/price-value', label: '价格价值', icon: TrendingUp },
      { href: '/admin/seo-ops', label: 'SEO 运营', icon: Globe2 },
      { href: '/admin/prompts', label: '提示词', icon: Wand2 }
    ]
  },
  {
    label: '系统治理',
    items: [
      { href: '/admin/risk', label: '风险中心', icon: ShieldAlert },
      { href: '/admin/governance', label: '安全治理', icon: ShieldCheck },
      { href: '/admin/data', label: '数据管理', icon: Database },
      { href: '/admin/users', label: '用户权限', icon: Users },
      { href: '/admin/settings', label: '系统设置', icon: Settings }
    ]
  }
]

const NAV_ITEMS = NAV_GROUPS.flatMap((group) => group.items)

function isActive(pathname: string, href: string) {
  if (href === '/admin') return pathname === href
  return pathname.startsWith(href)
}

function AdminNavLink({
  href,
  label,
  icon: Icon,
  active,
  collapsed
}: {
  href: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  active: boolean
  collapsed?: boolean
}) {
  return (
    <Link
      href={href}
      title={collapsed ? label : undefined}
      className={cn(
        'group flex min-h-11 items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2',
        active
          ? 'bg-blue-50 text-blue-700 shadow-sm shadow-blue-100/80'
          : 'text-slate-500 hover:bg-slate-50 hover:text-slate-950',
        collapsed && 'justify-center'
      )}
    >
      <Icon className={cn('h-5 w-5 shrink-0', active ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-600')} aria-hidden="true" />
      {!collapsed ? (
        <>
          <span className="font-medium">{label}</span>
          {active ? <span className="ml-auto h-1.5 w-1.5 rounded-full bg-blue-600" /> : null}
        </>
      ) : null}
    </Link>
  )
}

export function AdminShell({
  children
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const currentSection = NAV_ITEMS.find((item) => isActive(pathname, item.href))?.label || '工作台'

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <header className="sticky top-0 z-50 flex h-16 items-center justify-between border-b border-slate-200/70 bg-white/85 px-4 backdrop-blur-xl lg:px-5">
        <div className="flex items-center gap-3">
          <Link href="/admin" className="text-xl font-black tracking-tight text-slate-950">
            Bes3 管理后台
          </Link>
          <span className="hidden rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 sm:inline-flex">内部门户</span>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/"
            target="_blank"
            className="hidden min-h-10 items-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-sm font-medium text-slate-600 transition-colors hover:border-blue-200 hover:text-blue-700 sm:inline-flex"
          >
            打开前台
            <ExternalLink className="h-4 w-4" aria-hidden="true" />
          </Link>
          <button
            type="button"
            onClick={() => setSidebarOpen((value) => !value)}
            className="hidden h-10 w-10 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 lg:inline-flex"
            aria-label={sidebarOpen ? '收起侧边栏' : '展开侧边栏'}
          >
            {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
          <details className="relative lg:hidden">
            <summary className="flex min-h-10 cursor-pointer list-none items-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700">
              菜单
              <ChevronDown className="h-4 w-4" aria-hidden="true" />
            </summary>
            <div className="absolute right-0 mt-3 max-h-[75vh] w-[min(88vw,22rem)] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-3 shadow-2xl shadow-slate-900/12">
              <div className="mb-3 rounded-xl bg-slate-50 p-3">
                <p className="text-xs font-semibold text-slate-500">当前模块</p>
                <p className="mt-1 text-base font-bold text-slate-950">{currentSection}</p>
              </div>
              <nav aria-label="移动端后台导航" className="space-y-4">
                {NAV_GROUPS.map((group) => (
                  <div key={group.label}>
                    <p className="px-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">{group.label}</p>
                    <div className="mt-1 grid gap-1">
                      {group.items.map((item) => (
                        <AdminNavLink key={item.href} {...item} active={isActive(pathname, item.href)} />
                      ))}
                    </div>
                  </div>
                ))}
              </nav>
              <form action="/api/auth/logout" method="post" className="mt-3 border-t border-slate-100 pt-3">
                <button className="flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-rose-50 px-4 text-sm font-semibold text-rose-700 transition-colors hover:bg-rose-100">
                  <LogOut className="h-4 w-4" aria-hidden="true" />
                  退出登录
                </button>
              </form>
            </div>
          </details>
        </div>
      </header>

      <aside
        className={cn(
          'fixed left-0 top-16 z-40 hidden h-[calc(100vh-4rem)] flex-col border-r border-slate-200/70 bg-white/85 backdrop-blur-xl transition-all duration-300 lg:flex',
          sidebarOpen ? 'w-60' : 'w-20'
        )}
      >
        <div className="px-3 py-4">
          <div className={cn('flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-3', !sidebarOpen && 'justify-center')}>
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 text-white shadow-lg shadow-blue-200">
              <User className="h-5 w-5" aria-hidden="true" />
            </div>
            {sidebarOpen ? (
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-950">{DEFAULT_ADMIN_USERNAME}</p>
                <p className="mt-0.5 flex items-center gap-1.5 text-xs font-medium text-slate-500">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  运营管理员
                </p>
              </div>
            ) : null}
          </div>
        </div>

        <nav aria-label="后台导航" className="flex-1 space-y-5 overflow-y-auto px-3 pb-4">
          {NAV_GROUPS.map((group) => (
            <div key={group.label}>
              {sidebarOpen ? (
                <p className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">{group.label}</p>
              ) : (
                <div className="my-2 border-t border-slate-100" />
              )}
              <div className="grid gap-1">
                {group.items.map((item) => (
                  <AdminNavLink key={item.href} {...item} active={isActive(pathname, item.href)} collapsed={!sidebarOpen} />
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div className="border-t border-slate-100 bg-slate-50/70 p-3">
          <form action="/api/auth/logout" method="post">
            <button
              className={cn(
                'flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-sm font-medium text-slate-500 transition-colors hover:bg-rose-50 hover:text-rose-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-offset-2',
                !sidebarOpen && 'justify-center'
              )}
              title={!sidebarOpen ? '退出登录' : undefined}
            >
              <LogOut className="h-5 w-5" aria-hidden="true" />
              {sidebarOpen ? <span>退出登录</span> : null}
            </button>
          </form>
        </div>
      </aside>

      <main className={cn('min-h-[calc(100vh-4rem)] transition-all duration-300 lg:pt-0', sidebarOpen ? 'lg:ml-60' : 'lg:ml-20')}>
        <div className="border-b border-slate-200/70 bg-white/70 px-4 py-4 backdrop-blur-xl sm:px-6 lg:px-10">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold text-slate-500">当前模块</p>
              <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-950">{currentSection}</h1>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="hidden min-h-10 items-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-sm text-slate-500 xl:flex">
                <Search className="h-4 w-4" aria-hidden="true" />
                <span>全局搜索规划中</span>
              </div>
              <span className="inline-flex min-h-10 items-center rounded-full bg-emerald-50 px-4 text-xs font-bold text-emerald-700">系统正常</span>
              <Link
                href="/admin/settings"
                aria-label="打开系统设置"
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition-colors hover:border-blue-200 hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              >
                <Settings className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
          </div>
        </div>
        {children}
      </main>
    </div>
  )
}
