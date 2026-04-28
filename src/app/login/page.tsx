import type { Metadata } from 'next'
import Link from 'next/link'
import { LoginForm } from '@/components/admin/LoginForm'
import { DEFAULT_SITE_NAME, DEFAULT_SITE_TAGLINE } from '@/lib/constants'
import { buildPageMetadata } from '@/lib/metadata'
import { getRequestLocale } from '@/lib/request-locale'

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadata({
    title: 'Bes3 后台登录',
    description: 'Bes3 团队工作台安全登录入口。',
    path: '/login',
    locale: await getRequestLocale(),
    robots: {
      index: false,
      follow: false
    }
  })
}

export default async function LoginPage() {
  const publicRoutes = [
    {
      eyebrow: '搜索',
      title: '返回买家导购',
      description: '如果你是来做购买决策，请使用公开商品搜索，而不是进入团队工作台。',
      href: '/search?scope=products',
      label: '打开搜索'
    },
    {
      eyebrow: '方法',
      title: '了解 Bes3 如何工作',
      description: '如果你想了解本站的买家优先逻辑，请阅读公开的方法页。',
      href: '/about',
      label: '打开关于页'
    },
    {
      eyebrow: '支持',
      title: '联系团队',
      description: '如果你需要页面修正、合作或公开内容支持，请使用联系入口。',
      href: '/contact',
      label: '打开联系页'
    }
  ]

  return (
    <div className="min-h-screen bg-[linear-gradient(135deg,#020617_0%,#0f172a_36%,#eff4ff_36%,#f8fbff_100%)] px-4 py-10 lg:px-8">
      <div className="mx-auto grid min-h-[calc(100vh-5rem)] max-w-7xl overflow-hidden rounded-[2.5rem] border border-white/40 bg-white/80 shadow-[0_40px_100px_-60px_rgba(15,23,42,0.7)] backdrop-blur-xl lg:grid-cols-[1.05fr_420px]">
        <div className="bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.24),transparent_24%),linear-gradient(180deg,#0f172a_0%,#111827_100%)] px-8 py-10 text-white lg:px-12 lg:py-14">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <Link href="/" className="space-y-1">
              <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-emerald-200/80">买家导购</p>
              <h2 className="font-[var(--font-display)] text-2xl font-black tracking-tight text-white">{DEFAULT_SITE_NAME}</h2>
              <p className="text-sm text-slate-300">{DEFAULT_SITE_TAGLINE}</p>
            </Link>
            <Link href="/" className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/10">
              返回 Bes3
            </Link>
          </div>

          <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-emerald-200/80">Bes3 团队工作台</p>
          <h1 className="mt-6 max-w-3xl font-[var(--font-display)] text-5xl font-black tracking-tight text-white sm:text-6xl">
            登录并管理 Bes3 后台工作台。
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">
            团队成员在这里管理商品、内容页面和运营系统，避免把内部流程暴露到公开站点。
          </p>
          <div className="mt-8 rounded-[1.75rem] border border-emerald-200/15 bg-white/5 p-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-200">访问说明</p>
            <p className="mt-3 text-sm leading-7 text-slate-200">
              如果你是来研究购买决策，公开 Bes3 体验位于搜索、收藏清单、评测、对比和价格提醒。此登录入口仅用于 Bes3 团队工作台。
            </p>
          </div>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            <div className="rounded-[1.5rem] border border-white/10 bg-white/5 p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-300">商品</p>
              <p className="mt-3 text-sm leading-7 text-slate-200">联盟导入和手动商品会先进入这里。</p>
            </div>
            <div className="rounded-[1.5rem] border border-white/10 bg-white/5 p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-300">内容</p>
              <p className="mt-3 text-sm leading-7 text-slate-200">评测、对比和导购内容保持统一的 Bes3 设计体系。</p>
            </div>
            <div className="rounded-[1.5rem] border border-white/10 bg-white/5 p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-300">运行时</p>
              <p className="mt-3 text-sm leading-7 text-slate-200">AI、代理、媒体和 SEO 配置集中管理并可审计。</p>
            </div>
          </div>

          <div className="mt-10">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-200">不是要进入后台？</p>
            <div className="mt-4 grid gap-4 md:grid-cols-3">
              {publicRoutes.map((route) => (
                <Link
                  key={route.title}
                  href={route.href}
                  className="rounded-[1.5rem] border border-white/10 bg-white/5 p-5 transition-colors hover:bg-white/10"
                >
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-200">{route.eyebrow}</p>
                  <h3 className="mt-3 font-[var(--font-display)] text-2xl font-black tracking-tight text-white">{route.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-slate-200">{route.description}</p>
                  <p className="mt-4 text-sm font-semibold text-emerald-200">{route.label} →</p>
                </Link>
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-col justify-between gap-6 bg-[linear-gradient(180deg,rgba(255,255,255,0.72),rgba(239,244,255,0.94))] p-6 lg:p-10">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-[1.5rem] bg-white/80 px-4 py-3 shadow-[0_20px_40px_-32px_rgba(15,23,42,0.35)]">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-primary">内部使用</p>
              <p className="mt-1 text-sm text-slate-600">使用 Bes3 团队凭据进入工作台。</p>
            </div>
            <Link href="/" className="text-sm font-semibold text-primary transition-colors hover:text-emerald-700">
              返回 Bes3 →
            </Link>
          </div>
          <LoginForm />
          <div className="rounded-[1.5rem] bg-white/85 p-5 shadow-[0_20px_40px_-32px_rgba(15,23,42,0.35)]">
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-primary">快速返回公开站点</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link href="/search?scope=products" className="rounded-full border border-border bg-white px-3 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-muted">
                搜索
              </Link>
              <Link href="/about" className="rounded-full border border-border bg-white px-3 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-muted">
                测试方法
              </Link>
              <Link href="/contact" className="rounded-full border border-border bg-white px-3 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-muted">
                联系
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
