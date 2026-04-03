import { PublicShell } from '@/components/layout/PublicShell'

export default function AboutPage() {
  return (
    <PublicShell>
      <div className="mx-auto max-w-5xl space-y-10 px-4 py-14 sm:px-6 lg:px-8">
        <div className="space-y-4">
          <p className="font-mono text-xs uppercase tracking-[0.28em] text-primary">About Bes3</p>
          <h1 className="font-[var(--font-display)] text-5xl font-semibold tracking-tight">How Bes3 turns raw affiliate inventory into readable buying intelligence.</h1>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {[
            ['Scrape', 'Resolve redirects and capture product facts, images, and review assets.'],
            ['Analyze', 'Mine long-tail keywords and generate buyer-oriented summaries and comparisons.'],
            ['Verdict', 'Publish SEO pages with structured data, trust language, and low-friction CTAs.']
          ].map(([title, description]) => (
            <div key={title} className="rounded-[28px] border border-border bg-white p-6 shadow-panel">
              <p className="font-mono text-xs uppercase tracking-[0.24em] text-primary">{title}</p>
              <p className="mt-4 text-sm leading-7 text-muted-foreground">{description}</p>
            </div>
          ))}
        </div>
      </div>
    </PublicShell>
  )
}
