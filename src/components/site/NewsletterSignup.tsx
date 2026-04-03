'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export function NewsletterSignup() {
  const [email, setEmail] = useState('')
  const [done, setDone] = useState(false)
  const [isPending, startTransition] = useTransition()

  return (
    <div className="rounded-[32px] border border-border bg-white p-8 shadow-panel">
      {done ? (
        <div className="space-y-3">
          <p className="font-mono text-xs uppercase tracking-[0.28em] text-primary">Subscribed</p>
          <h3 className="font-[var(--font-display)] text-3xl font-semibold">Thanks for joining.</h3>
          <p className="text-sm leading-7 text-muted-foreground">You are on the Bes3 shortlist for monthly tech deals and new reviews.</p>
        </div>
      ) : (
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault()
            startTransition(async () => {
              const response = await fetch('/api/newsletter', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
              })
              if (response.ok) {
                setDone(true)
              }
            })
          }}
        >
          <div className="space-y-2">
            <p className="font-mono text-xs uppercase tracking-[0.28em] text-primary">Monthly Deals</p>
            <h3 className="font-[var(--font-display)] text-3xl font-semibold">Not ready to buy yet?</h3>
            <p className="text-sm leading-7 text-muted-foreground">Join readers getting curated price drops, shortlists, and buyer notes from Bes3.</p>
          </div>
          <Input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="alex@bes3.com"
            className="min-h-[52px] rounded-2xl"
          />
          <Button type="submit" disabled={!email.includes('@') || isPending} className="min-h-[52px] rounded-full px-6">
            {isPending ? 'Subscribing...' : 'Subscribe'}
          </Button>
        </form>
      )}
    </div>
  )
}
