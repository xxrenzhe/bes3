import { PublicShell } from '@/components/layout/PublicShell'
import { NewsletterSignup } from '@/components/site/NewsletterSignup'

export default function NewsletterPage() {
  return (
    <PublicShell>
      <div className="mx-auto grid max-w-7xl gap-14 px-4 py-16 sm:px-6 lg:grid-cols-[0.95fr_1.05fr] lg:px-8">
        <div className="space-y-8">
          <p className="editorial-kicker">The Newsletter</p>
          <h1 className="font-[var(--font-display)] text-5xl font-black tracking-tight text-foreground sm:text-7xl">
            Get the buyer&apos;s briefing, not the inbox clutter.
          </h1>
          <p className="max-w-2xl text-lg leading-8 text-muted-foreground">
            Bes3 emails are short, buyer-focused, and built around category shifts, worthwhile deals, and newly published comparison pages you can actually use.
          </p>
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="rounded-[1.5rem] bg-white p-6 shadow-panel">
              <h2 className="font-[var(--font-display)] text-2xl font-black tracking-tight">Market Intel</h2>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">Practical notes on what changed in a category and whether that change matters to buyers.</p>
            </div>
            <div className="rounded-[1.5rem] bg-white p-6 shadow-panel">
              <h2 className="font-[var(--font-display)] text-2xl font-black tracking-tight">Exclusive Access</h2>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">First look at fresh Bes3 reviews, comparisons, and shortlists before they get buried in your tabs.</p>
            </div>
          </div>
        </div>
        <NewsletterSignup />
      </div>
    </PublicShell>
  )
}
