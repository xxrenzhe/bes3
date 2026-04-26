'use client'

import Link from 'next/link'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DEFAULT_ADMIN_USERNAME } from '@/lib/constants'

export function LoginForm() {
  const router = useRouter()
  const [username, setUsername] = useState(DEFAULT_ADMIN_USERNAME)
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
            toast.error(body.error || 'Login failed')
            return
          }
          const body = await response.json().catch(() => ({}))
          router.push(body.mustChangePassword ? '/change-password' : '/admin')
          router.refresh()
        })
      }}
    >
      <div className="space-y-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-primary">Admin Login</p>
        <h1 className="font-[var(--font-display)] text-4xl font-black tracking-tight text-slate-950">Sign in to Bes3.</h1>
        <p className="text-sm leading-7 text-slate-600">
          Internal access only. Default admin username is <span className="font-semibold text-slate-950">{DEFAULT_ADMIN_USERNAME}</span>.
        </p>
        <p className="text-sm leading-7 text-slate-600">Password bootstrap is managed outside the repository through local `.env` files in development and injected environment variables in production.</p>
        <p className="text-sm leading-7 text-slate-600">
          If you were looking for product guidance rather than CMS access, go back to the <Link href="/" className="font-semibold text-primary">public buyer site</Link>.
        </p>
      </div>

      <label className="block space-y-2">
        <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Username</span>
        <Input
          name="username"
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          autoComplete="username"
          spellCheck={false}
          placeholder="Username"
          className="min-h-[54px] rounded-[1.25rem] border-slate-200 bg-slate-50 px-4 shadow-none focus-visible:ring-2"
        />
      </label>

      <label className="block space-y-2">
        <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Password</span>
        <Input
          name="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          type="password"
          autoComplete="current-password"
          placeholder="Password"
          className="min-h-[54px] rounded-[1.25rem] border-slate-200 bg-slate-50 px-4 shadow-none focus-visible:ring-2"
        />
      </label>

      <div className="rounded-[1.5rem] bg-emerald-50 px-4 py-4 text-sm leading-7 text-emerald-900">
        Use this console for operational work only. Consumer-facing pages should stay editorial, calm, and product-comparison focused.
      </div>

      <div className="rounded-[1.5rem] border border-slate-200/80 bg-slate-50 px-4 py-4">
        <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-500">Access expectations</p>
        <div className="mt-3 space-y-2 text-sm leading-7 text-slate-600">
          <p>Only Bes3 operators should sign in here.</p>
          <p>Credentials are managed by the team and should not be shared across roles.</p>
          <p>
            Public readers should use <Link href="/search?scope=products" className="font-semibold text-primary">search</Link>, <Link href="/shortlist" className="font-semibold text-primary">shortlist</Link>, or <Link href="/contact" className="font-semibold text-primary">contact</Link> instead.
          </p>
        </div>
      </div>

      <Button type="submit" disabled={isPending} className="min-h-[54px] w-full rounded-full px-6 text-base font-semibold">
        {isPending ? 'Signing in…' : 'Sign in'}
      </Button>
    </form>
  )
}
