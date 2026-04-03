import { PublicShell } from '@/components/layout/PublicShell'
import { NewsletterSignup } from '@/components/site/NewsletterSignup'

export default function NewsletterPage() {
  return (
    <PublicShell>
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[1fr_420px] lg:px-8">
        <div className="space-y-5">
          <p className="font-mono text-xs uppercase tracking-[0.28em] text-primary">Email List</p>
          <h1 className="font-[var(--font-display)] text-5xl font-semibold tracking-tight">Join 5,000+ readers getting Alex’s monthly tech deals.</h1>
          <p className="max-w-2xl text-lg leading-8 text-muted-foreground">Bes3 newsletters are short, buyer-focused, and built around price movement, category changes, and newly published comparison pages.</p>
        </div>
        <NewsletterSignup />
      </div>
    </PublicShell>
  )
}
