export function SectionHeader({
  eyebrow,
  title,
  description
}: {
  eyebrow: string
  title: string
  description?: string
}) {
  return (
    <div className="space-y-3">
      <p className="font-mono text-xs uppercase tracking-[0.3em] text-primary">{eyebrow}</p>
      <h2 className="font-[var(--font-display)] text-4xl font-semibold tracking-tight text-foreground">{title}</h2>
      {description ? <p className="max-w-3xl text-base leading-8 text-muted-foreground">{description}</p> : null}
    </div>
  )
}
