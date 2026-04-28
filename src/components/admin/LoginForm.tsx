'use client'

import Link from 'next/link'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export function LoginForm() {
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [isPending, startTransition] = useTransition()

  return (
    <form
      className="w-full space-y-6 rounded-[2rem] border border-slate-200/80 bg-white/95 p-8 shadow-[0_28px_70px_-45px_rgba(15,23,42,0.4)]"
      onSubmit={(event) => {
        event.preventDefault()
        startTransition(async () => {
          const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
          })
          if (!response.ok) {
            const body = await response.json().catch(() => ({}))
            toast.error(body.error || '登录失败')
            return
          }
          const body = await response.json().catch(() => ({}))
          router.push(body.mustChangePassword ? '/change-password' : '/admin')
          router.refresh()
        })
      }}
    >
      <div className="space-y-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-primary">后台登录</p>
        <h1 className="font-[var(--font-display)] text-4xl font-black tracking-tight text-slate-950">登录 Bes3 后台</h1>
        <p className="text-sm leading-7 text-slate-600">
          仅限内部运营访问。请使用团队分配的账号和密码登录。
        </p>
        <p className="text-sm leading-7 text-slate-600">初始密码通过开发环境 `.env` 或生产环境注入变量管理，不在代码仓库中保存。</p>
        <p className="text-sm leading-7 text-slate-600">
          如果你需要浏览商品推荐，请返回 <Link href="/" className="font-semibold text-primary">公开站点</Link>。
        </p>
      </div>

      <label className="block space-y-2">
        <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">用户名</span>
        <Input
          name="username"
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          autoComplete="username"
          spellCheck={false}
          placeholder="请输入用户名"
          className="min-h-[54px] rounded-[1.25rem] border-slate-200 bg-slate-50 px-4 shadow-none focus-visible:ring-2"
        />
      </label>

      <label className="block space-y-2">
        <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">密码</span>
        <Input
          name="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          type="password"
          autoComplete="current-password"
          placeholder="请输入密码"
          className="min-h-[54px] rounded-[1.25rem] border-slate-200 bg-slate-50 px-4 shadow-none focus-visible:ring-2"
        />
      </label>

      <div className="rounded-[1.5rem] bg-emerald-50 px-4 py-4 text-sm leading-7 text-emerald-900">
        后台仅用于运营、内容、SEO、商品和系统配置管理。公开页面应保持独立的买家导购体验。
      </div>

      <div className="rounded-[1.5rem] border border-slate-200/80 bg-slate-50 px-4 py-4">
        <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-500">访问要求</p>
        <div className="mt-3 space-y-2 text-sm leading-7 text-slate-600">
          <p>只有 Bes3 运营人员可以登录后台。</p>
          <p>账号凭据由团队统一管理，不应跨角色共享。</p>
          <p>
            普通用户应使用 <Link href="/search?scope=products" className="font-semibold text-primary">搜索</Link>、<Link href="/shortlist" className="font-semibold text-primary">收藏清单</Link> 或 <Link href="/contact" className="font-semibold text-primary">联系页面</Link>。
          </p>
        </div>
      </div>

      <Button type="submit" disabled={isPending} className="min-h-[54px] w-full rounded-full px-6 text-base font-semibold">
        {isPending ? '登录中...' : '登录后台'}
      </Button>
    </form>
  )
}
