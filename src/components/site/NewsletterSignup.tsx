'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export function NewsletterSignup() {
  const [email, setEmail] = useState('')
  const [done, setDone] = useState(false)
  const [isPending, startTransition] = useTransition()

  return (
    <div className="editorial-shadow relative overflow-hidden rounded-[2rem] bg-white p-8 sm:p-10">
      <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-emerald-100/60 blur-3xl" />
      {done ? (
        <div className="relative space-y-3">
          <p className="editorial-kicker">Subscribed</p>
          <h3 className="font-[var(--font-display)] text-3xl font-black tracking-tight">Thanks for joining.</h3>
          <p className="text-sm leading-7 text-muted-foreground">You are on the Bes3 shortlist for monthly buyer notes, category changes, and worthwhile price drops.</p>
        </div>
      ) : (
        <form
          className="relative space-y-5"
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
            <p className="editorial-kicker">Weekly Briefing</p>
            <h3 className="font-[var(--font-display)] text-3xl font-black tracking-tight">Stay decoded.</h3>
            <p className="text-sm leading-7 text-muted-foreground">Get concise updates on trending categories, fresh comparisons, and meaningful deals instead of inbox spam.</p>
          </div>
          <Input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="name@company.com"
            className="min-h-[56px] rounded-2xl border-none bg-muted px-5"
          />
          <Button type="submit" disabled={!email.includes('@') || isPending} className="min-h-[56px] rounded-full px-6">
            {isPending ? 'Subscribing...' : 'Subscribe'}
          </Button>
          <p className="text-xs leading-6 text-muted-foreground">One email a week. Unsubscribe any time.</p>
        </form>
      )}
    </div>
  )
}
