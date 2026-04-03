'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DEFAULT_ADMIN_USERNAME } from '@/lib/constants'

export function LoginForm() {
  const router = useRouter()
  const [username, setUsername] = useState(DEFAULT_ADMIN_USERNAME)
  const [password, setPassword] = useState(process.env.NODE_ENV === 'development' ? 'replace-with-a-random-admin-password-before-first-run' : '')
  const [isPending, startTransition] = useTransition()

  return (
    <form
      className="space-y-5 rounded-[32px] border border-border bg-white p-8 shadow-panel"
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
          router.push('/admin')
          router.refresh()
        })
      }}
    >
      <div className="space-y-2">
        <p className="font-mono text-xs uppercase tracking-[0.28em] text-primary">Admin Login</p>
        <h1 className="font-[var(--font-display)] text-4xl font-semibold tracking-tight">Sign in to Autobes3.</h1>
        <p className="text-sm leading-7 text-muted-foreground">Default admin username is <span className="font-semibold">autobes3</span>.</p>
      </div>
      <Input value={username} onChange={(event) => setUsername(event.target.value)} placeholder="Username" className="min-h-[52px] rounded-2xl" />
      <Input value={password} onChange={(event) => setPassword(event.target.value)} type="password" placeholder="Password" className="min-h-[52px] rounded-2xl" />
      <Button type="submit" disabled={isPending} className="min-h-[52px] rounded-full px-6">
        {isPending ? 'Signing in...' : 'Sign in'}
      </Button>
    </form>
  )
}
