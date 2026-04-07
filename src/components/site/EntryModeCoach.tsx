import Link from 'next/link'

export function EntryModeCoach({
  eyebrow = 'Route Suggestion',
  title,
  description,
  primaryHref,
  primaryLabel,
  secondaryHref,
  secondaryLabel
}: {
  eyebrow?: string
  title: string
  description: string
  primaryHref: string
  primaryLabel: string
  secondaryHref: string
  secondaryLabel: string
}) {
  return (
    <section className="rounded-[2rem] bg-[linear-gradient(135deg,#fff8ef_0%,#f8fbff_48%,#eefaf5_100%)] p-6 shadow-panel sm:p-8">
      <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-primary">{eyebrow}</p>
      <h2 className="mt-3 font-[var(--font-display)] text-3xl font-black tracking-tight text-foreground">{title}</h2>
      <p className="mt-3 max-w-3xl text-sm leading-7 text-muted-foreground">{description}</p>
      <div className="mt-6 flex flex-wrap gap-3">
        <Link href={primaryHref} className="inline-flex min-h-[44px] items-center justify-center rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground">
          {primaryLabel}
        </Link>
        <Link href={secondaryHref} className="inline-flex min-h-[44px] items-center justify-center rounded-full border border-border bg-white px-5 text-sm font-semibold text-foreground transition-colors hover:bg-muted">
          {secondaryLabel}
        </Link>
      </div>
    </section>
  )
}
