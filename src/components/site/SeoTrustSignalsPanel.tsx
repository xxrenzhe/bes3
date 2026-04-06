export function SeoTrustSignalsPanel({
  title = 'How Bes3 checks what it publishes',
  description = 'These details explain how Bes3 keeps pages current, useful, and grounded in real shopping decisions.',
  stats,
  points
}: {
  title?: string
  description?: string
  stats: Array<{
    label: string
    value: string
    note: string
  }>
  points: string[]
}) {
  if (!stats.length && !points.length) return null

  return (
    <section className="rounded-[2rem] bg-white p-6 shadow-panel sm:p-8">
      <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-primary">Trust Checks</p>
      <h2 className="mt-3 font-[var(--font-display)] text-3xl font-black tracking-tight text-foreground">{title}</h2>
      <p className="mt-3 max-w-3xl text-sm leading-7 text-muted-foreground">{description}</p>

      {stats.length ? (
        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {stats.map((stat) => (
            <div key={stat.label} className="rounded-[1.5rem] border border-border/60 bg-[linear-gradient(135deg,#fff8ef_0%,#f8fbff_48%,#eefaf5_100%)] p-5">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">{stat.label}</p>
              <p className="mt-3 text-3xl font-black text-foreground">{stat.value}</p>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">{stat.note}</p>
            </div>
          ))}
        </div>
      ) : null}

      {points.length ? (
        <div className="mt-6 grid gap-3 lg:grid-cols-2">
          {points.map((point) => (
            <div key={point} className="flex items-start gap-3 rounded-[1rem] bg-muted px-4 py-4 text-sm leading-7 text-muted-foreground">
              <span className="mt-2 h-2.5 w-2.5 shrink-0 rounded-full bg-primary" />
              <span>{point}</span>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  )
}
