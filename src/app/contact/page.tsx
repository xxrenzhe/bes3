import { PublicShell } from '@/components/layout/PublicShell'

export default function ContactPage() {
  return (
    <PublicShell>
      <div className="mx-auto grid max-w-7xl gap-16 px-4 py-16 sm:px-6 lg:grid-cols-[0.92fr_1.08fr] lg:px-8">
        <div className="space-y-10">
          <div className="space-y-4">
            <p className="editorial-kicker">Connect With Us</p>
            <h1 className="font-[var(--font-display)] text-5xl font-black tracking-tight text-foreground sm:text-7xl">
              Let&apos;s build something <span className="text-primary italic">exceptional</span> together.
            </h1>
            <p className="max-w-xl text-lg leading-8 text-muted-foreground">Use this page for partnership inquiries, corrections, editorial feedback, or general questions about Bes3.</p>
          </div>
          <div className="space-y-5">
            {[
              ['Email us', 'hello@bes3.local'],
              ['Call us', '+1 (555) 000-BES3'],
              ['Visit us', '123 Precision Way, Emerald City']
            ].map(([label, value]) => (
              <div key={label} className="flex items-start gap-4 rounded-[1.5rem] bg-white p-6 shadow-panel">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">•</div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-muted-foreground">{label}</p>
                  <p className="mt-2 text-lg font-semibold text-foreground">{value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
        <form action="/thank-you" className="rounded-[2rem] bg-white p-8 shadow-panel sm:p-10">
          <div className="grid gap-6 md:grid-cols-2">
            <label className="space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-[0.24em] text-muted-foreground">Name</span>
              <input className="min-h-[56px] w-full rounded-2xl border-none bg-muted px-5" placeholder="John Doe" />
            </label>
            <label className="space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-[0.24em] text-muted-foreground">Email</span>
              <input className="min-h-[56px] w-full rounded-2xl border-none bg-muted px-5" placeholder="john@company.com" type="email" />
            </label>
          </div>
          <label className="mt-6 block space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-[0.24em] text-muted-foreground">Subject</span>
            <input className="min-h-[56px] w-full rounded-2xl border-none bg-muted px-5" placeholder="How can we help?" />
          </label>
          <label className="mt-6 block space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-[0.24em] text-muted-foreground">Message</span>
            <textarea className="min-h-[200px] w-full rounded-2xl border-none bg-muted px-5 py-4" placeholder="Tell us more about your question or project..." />
          </label>
          <button className="mt-8 inline-flex min-h-[56px] items-center justify-center rounded-full bg-[linear-gradient(135deg,hsl(var(--primary)),#00855d)] px-8 text-base font-semibold text-primary-foreground shadow-lg shadow-emerald-950/10">
            Send Message
          </button>
        </form>
      </div>
    </PublicShell>
  )
}
