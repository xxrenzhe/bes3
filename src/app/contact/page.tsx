import { PublicShell } from '@/components/layout/PublicShell'

export default function ContactPage() {
  return (
    <PublicShell>
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-8">
        <div className="space-y-4">
          <p className="font-mono text-xs uppercase tracking-[0.28em] text-primary">Contact</p>
          <h1 className="font-[var(--font-display)] text-5xl font-semibold tracking-tight">Get in touch.</h1>
          <p className="text-lg leading-8 text-muted-foreground">Use this page for partnership inquiries, corrections, or general site feedback.</p>
          <p className="text-sm text-muted-foreground">hello@bes3.local</p>
        </div>
        <form action="/thank-you" className="space-y-4 rounded-[32px] border border-border bg-white p-8 shadow-panel">
          <input className="min-h-[52px] w-full rounded-2xl border border-border px-4" placeholder="Name" />
          <input className="min-h-[52px] w-full rounded-2xl border border-border px-4" placeholder="Email" type="email" />
          <textarea className="min-h-[180px] w-full rounded-2xl border border-border px-4 py-4" placeholder="Message" />
          <button className="rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground">Send Message</button>
        </form>
      </div>
    </PublicShell>
  )
}
