'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export function ChangePasswordForm() {
  const router = useRouter()
  const [currentPassword, setCurrentPassword] = useState('')
  const [nextPassword, setNextPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isPending, startTransition] = useTransition()

  return (
    <form
      className="w-full max-w-xl space-y-6 rounded-2xl border border-slate-200 bg-white p-8 shadow-[0_28px_70px_-45px_rgba(15,23,42,0.4)]"
      onSubmit={(event) => {
        event.preventDefault()
        if (nextPassword !== confirmPassword) {
          toast.error('New passwords do not match.')
          return
        }
        startTransition(async () => {
          const response = await fetch('/api/auth/change-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ currentPassword, nextPassword })
          })
          const body = await response.json().catch(() => ({}))
          if (!response.ok) {
            toast.error(body.error || 'Password change failed')
            return
          }
          toast.success('Password updated')
          router.push('/admin')
          router.refresh()
        })
      }}
    >
      <div className="space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-primary">Security Required</p>
        <h1 className="font-[var(--font-display)] text-3xl font-black tracking-tight text-slate-950">Change your admin password</h1>
        <p className="text-sm leading-7 text-slate-600">Use at least 12 characters with uppercase, lowercase, number, and symbol characters.</p>
      </div>

      <label className="block space-y-2">
        <span className="text-sm font-semibold text-slate-700">Current password</span>
        <Input
          name="current-password"
          value={currentPassword}
          onChange={(event) => setCurrentPassword(event.target.value)}
          type="password"
          autoComplete="current-password"
          className="min-h-[48px]"
        />
      </label>

      <label className="block space-y-2">
        <span className="text-sm font-semibold text-slate-700">New password</span>
        <Input
          name="new-password"
          value={nextPassword}
          onChange={(event) => setNextPassword(event.target.value)}
          type="password"
          autoComplete="new-password"
          className="min-h-[48px]"
        />
      </label>

      <label className="block space-y-2">
        <span className="text-sm font-semibold text-slate-700">Confirm new password</span>
        <Input
          name="confirm-password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          type="password"
          autoComplete="new-password"
          className="min-h-[48px]"
        />
      </label>

      <Button type="submit" disabled={isPending} className="min-h-[48px] w-full rounded-full">
        {isPending ? 'Updating…' : 'Update password'}
      </Button>
    </form>
  )
}
