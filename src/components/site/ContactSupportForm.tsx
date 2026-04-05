'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

const INQUIRY_OPTIONS = [
  {
    id: 'buyer-support',
    label: 'Buyer Support',
    description: 'Use this for edge-case purchase questions that do not fit a normal shortlist or comparison page.'
  },
  {
    id: 'editorial-feedback',
    label: 'Editorial Feedback',
    description: 'Use this for coverage ideas, article feedback, or suggestions on how a page could be clearer.'
  },
  {
    id: 'correction',
    label: 'Correction',
    description: 'Use this when a factual detail, price snapshot, or page cue on the public site looks wrong.'
  },
  {
    id: 'partnership',
    label: 'Partnership',
    description: 'Use this for business, platform, sponsorship, or distribution conversations.'
  },
  {
    id: 'general',
    label: 'General',
    description: 'Use this for anything that does not fit the options above.'
  }
] as const

type InquiryIntent = (typeof INQUIRY_OPTIONS)[number]['id']

export function ContactSupportForm() {
  const router = useRouter()
  const [intent, setIntent] = useState<InquiryIntent>('buyer-support')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [isPending, startTransition] = useTransition()

  const selectedIntent = INQUIRY_OPTIONS.find((option) => option.id === intent) || INQUIRY_OPTIONS[0]
  const isValid = email.includes('@') && subject.trim().length >= 6 && message.trim().length >= 20

  return (
    <form
      id="contact-form"
      className="rounded-[2rem] bg-white p-8 shadow-panel sm:p-10"
      onSubmit={(event) => {
        event.preventDefault()
        if (!isValid) return

        startTransition(() => {
          const params = new URLSearchParams({
            intent
          })

          if (name.trim()) params.set('name', name.trim().slice(0, 40))
          if (subject.trim()) params.set('subject', subject.trim().slice(0, 80))

          router.push(`/thank-you?${params.toString()}`)
        })
      }}
    >
      <div className="space-y-3">
        <p className="editorial-kicker">Contact Bes3</p>
        <h2 className="font-[var(--font-display)] text-4xl font-black tracking-tight text-foreground">Use the form when you still need help.</h2>
        <p className="text-sm leading-7 text-muted-foreground">
          Bes3 is designed to answer most buying questions through search, reviews, shortlist, and alerts. Use this form for corrections, unusual cases, or anything that needs a real person to look at it.
        </p>
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-2">
        <label className="space-y-2">
          <span className="text-[10px] font-bold uppercase tracking-[0.24em] text-muted-foreground">Name</span>
          <Input value={name} onChange={(event) => setName(event.target.value)} className="min-h-[56px] rounded-2xl border-none bg-muted px-5" placeholder="John Doe" />
        </label>
        <label className="space-y-2">
          <span className="text-[10px] font-bold uppercase tracking-[0.24em] text-muted-foreground">Email</span>
          <Input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="min-h-[56px] rounded-2xl border-none bg-muted px-5"
            placeholder="john@company.com"
          />
        </label>
      </div>

      <label className="mt-6 block space-y-2">
        <span className="text-[10px] font-bold uppercase tracking-[0.24em] text-muted-foreground">Inquiry type</span>
        <select
          value={intent}
          onChange={(event) => setIntent(event.target.value as InquiryIntent)}
          className="min-h-[56px] w-full rounded-2xl border-none bg-muted px-5 text-sm text-foreground outline-none"
        >
          {INQUIRY_OPTIONS.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      <p className="mt-3 text-sm leading-7 text-muted-foreground">{selectedIntent.description}</p>

      <label className="mt-6 block space-y-2">
        <span className="text-[10px] font-bold uppercase tracking-[0.24em] text-muted-foreground">Subject</span>
        <Input
          value={subject}
          onChange={(event) => setSubject(event.target.value)}
          className="min-h-[56px] rounded-2xl border-none bg-muted px-5"
          placeholder="What do you need help with?"
        />
      </label>

      <label className="mt-6 block space-y-2">
        <span className="text-[10px] font-bold uppercase tracking-[0.24em] text-muted-foreground">Message</span>
        <textarea
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          className="min-h-[200px] w-full rounded-2xl border-none bg-muted px-5 py-4 text-sm text-foreground outline-none placeholder:text-muted-foreground"
          placeholder="Include the product, category, or page involved, plus what still feels unclear."
        />
      </label>

      <div className="mt-6 rounded-[1.5rem] bg-[linear-gradient(135deg,#f8fbff,#eefaf5)] p-5">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">Submission note</p>
        <p className="mt-3 text-sm leading-7 text-muted-foreground">
          Personal contact details and full message content stay on this page. The confirmation step only carries the inquiry type and subject so the thank-you page can return you to the right Bes3 page cleanly.
        </p>
      </div>

      <Button type="submit" disabled={!isValid || isPending} className="mt-8 min-h-[56px] rounded-full px-8 text-base font-semibold">
        {isPending ? 'Sending your note...' : 'Send Message'}
      </Button>
      <p className="mt-4 text-xs leading-6 text-muted-foreground">
        Use at least 6 characters in the subject and 20 characters in the message so Bes3 can sort the note accurately.
      </p>
    </form>
  )
}
