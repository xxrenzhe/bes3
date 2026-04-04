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
    <div className="space-y-4">
      <p className="editorial-kicker">{eyebrow}</p>
      <h2 className="font-[var(--font-display)] text-4xl font-black tracking-tight text-foreground sm:text-5xl">{title}</h2>
      {description ? <p className="max-w-3xl text-base leading-8 text-muted-foreground sm:text-lg">{description}</p> : null}
    </div>
  )
}
