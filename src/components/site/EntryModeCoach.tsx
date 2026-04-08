import Link from 'next/link'

export function EntryModeCoach({
  eyebrow = 'Route Suggestion',
  title,
  description,
  coachCall,
  primaryHref,
  primaryLabel,
  primaryDescription,
  secondaryHref,
  secondaryLabel,
  secondaryDescription,
  signals = []
}: {
  eyebrow?: string
  title: string
  description: string
  coachCall?: string
  primaryHref: string
  primaryLabel: string
  primaryDescription?: string
  secondaryHref: string
  secondaryLabel: string
  secondaryDescription?: string
  signals?: string[]
}) {
  return (
    <section className="rounded-[2rem] bg-[linear-gradient(135deg,#fff8ef_0%,#f8fbff_48%,#eefaf5_100%)] p-6 shadow-panel sm:p-8">
      <div className="flex flex-col gap-5 border-b border-border/40 pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-primary">{eyebrow}</p>
          <h2 className="mt-3 font-[var(--font-display)] text-3xl font-black tracking-tight text-foreground">{title}</h2>
        </div>
        <p className="max-w-3xl text-sm leading-7 text-muted-foreground">{description}</p>
      </div>

      {coachCall ? (
        <div className="mt-6 rounded-[1.5rem] bg-slate-950 p-5 text-white">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-200">Bes3 call</p>
          <p className="mt-3 text-sm leading-7 text-slate-200">{coachCall}</p>
        </div>
      ) : null}

      {signals.length ? (
        <div className="mt-6 grid gap-3 md:grid-cols-3">
          {signals.map((signal) => (
            <div key={signal} className="rounded-[1.25rem] bg-white p-4 shadow-[0_20px_45px_-35px_rgba(15,23,42,0.35)]">
              <p className="text-sm leading-7 text-muted-foreground">{signal}</p>
            </div>
          ))}
        </div>
      ) : null}

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <Link href={primaryHref} className="rounded-[1.5rem] bg-white p-5 shadow-[0_24px_60px_-40px_rgba(15,23,42,0.35)] transition-transform hover:-translate-y-0.5">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">Recommended route</p>
          <p className="mt-3 text-xl font-black tracking-tight text-foreground">{primaryLabel}</p>
          {primaryDescription ? <p className="mt-3 text-sm leading-7 text-muted-foreground">{primaryDescription}</p> : null}
          <p className="mt-4 text-sm font-semibold text-primary">Take this path →</p>
        </Link>

        <Link href={secondaryHref} className="rounded-[1.5rem] border border-border/70 bg-white p-5 transition-transform hover:-translate-y-0.5">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">Keep current route</p>
          <p className="mt-3 text-xl font-black tracking-tight text-foreground">{secondaryLabel}</p>
          {secondaryDescription ? <p className="mt-3 text-sm leading-7 text-muted-foreground">{secondaryDescription}</p> : null}
          <p className="mt-4 text-sm font-semibold text-primary">Stay here →</p>
        </Link>
      </div>
    </section>
  )
}
