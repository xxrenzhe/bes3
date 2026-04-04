import { PublicShell } from '@/components/layout/PublicShell'

export default function AboutPage() {
  return (
    <PublicShell>
      <div className="space-y-20 pb-20">
        <section className="mx-auto max-w-4xl px-4 py-14 text-center sm:px-6 lg:px-8">
          <p className="editorial-kicker">About Bes3</p>
          <h1 className="mt-4 font-[var(--font-display)] text-5xl font-black tracking-tight text-foreground sm:text-7xl">About Bes3 &amp; how we test.</h1>
          <p className="mt-6 text-xl leading-8 text-muted-foreground">
            Information overload is the new dark age. Bes3 exists to eliminate choice paralysis by filtering the noise into three grounded, decision-ready picks.
          </p>
        </section>
        <section className="tonal-surface px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="mb-14 text-center">
              <h2 className="font-[var(--font-display)] text-4xl font-black tracking-tight text-foreground">Our 3-step testing process</h2>
              <div className="mx-auto mt-4 h-1.5 w-20 rounded-full bg-primary" />
            </div>
            <div className="grid gap-6 md:grid-cols-3">
              {[
                ['Scrape', 'We aggregate verified user signals, merchant facts, and source materials to narrow a noisy field into a shortlist worth investigating.'],
                ['Analyze', 'We synthesize the tradeoffs that matter in real use: build quality, fit, price logic, and whether a product deserves to be shortlisted at all.'],
                ['Verdict', 'We publish exactly the guidance required to make a decision: what to buy, what to skip, and who should look elsewhere.']
              ].map(([title, description]) => (
                <div key={title} className="rounded-[2rem] bg-white p-8 shadow-panel">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-xl font-black text-primary">{title[0]}</div>
                  <h3 className="mt-6 font-[var(--font-display)] text-2xl font-black tracking-tight text-foreground">{title}</h3>
                  <p className="mt-4 text-sm leading-7 text-muted-foreground">{description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
        <section className="mx-auto grid max-w-7xl gap-16 px-4 sm:px-6 lg:grid-cols-[0.95fr_1.05fr] lg:px-8">
          <div className="rounded-[2rem] bg-[linear-gradient(135deg,#dfe9fa,#eef4ff)] p-8">
            <div className="editorial-prose">
              <h2>Why only 3 picks?</h2>
              <p>
                Bes3 is built around decision compression. We believe a good buying guide should reduce anxiety, not create more of it with endless “top 20” grids.
              </p>
              <p>
                By the time a product reaches our final three, it has already passed a harsher filter than most review sites apply. The goal is not volume. The goal is clarity.
              </p>
            </div>
          </div>
          <div className="space-y-6">
            {[
              'No sponsored placements inside the shortlist',
              'Clear affiliate disclosure next to buying actions',
              'Independent verdict language with reasons to skip',
              'Practical buying notes designed for real shoppers'
            ].map((item) => (
              <div key={item} className="flex items-center gap-4 rounded-[1.5rem] bg-white px-6 py-5 shadow-panel">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">✓</span>
                <p className="text-sm font-semibold text-foreground">{item}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </PublicShell>
  )
}
