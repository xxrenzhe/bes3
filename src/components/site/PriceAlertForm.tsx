'use client'

import { Bell } from 'lucide-react'
import type { FormEvent } from 'react'
import { useState, useTransition } from 'react'

export function PriceAlertForm({
  productId,
  targetPrice,
  targetValueScore
}: {
  productId: number
  targetPrice: number | null
  targetValueScore: number | null
}) {
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [isPending, startTransition] = useTransition()

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setMessage('')
    startTransition(async () => {
      const response = await fetch('/api/open/evidence/price-alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId,
          email,
          targetPrice,
          targetValueScore
        })
      })
      const payload = await response.json().catch(() => ({}))
      setMessage(response.ok ? 'Tracking is active.' : payload.error || 'Unable to create alert.')
      if (response.ok) setEmail('')
    })
  }

  return (
    <form onSubmit={submit} className="mt-5 rounded-md border border-border bg-white p-4">
      <label htmlFor={`price-alert-${productId}`} className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">
        Track price
      </label>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <input
          id={`price-alert-${productId}`}
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="email@example.com"
          className="min-h-11 flex-1 rounded-md border border-border px-3 text-sm"
          required
        />
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-slate-950 px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Bell className="h-4 w-4" aria-hidden="true" />
          {isPending ? 'Saving' : 'Alert me'}
        </button>
      </div>
      {message ? <p className="mt-2 text-xs font-semibold text-muted-foreground">{message}</p> : null}
    </form>
  )
}
