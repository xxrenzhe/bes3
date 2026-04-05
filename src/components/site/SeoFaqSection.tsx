import type { FaqEntry } from '@/lib/structured-data'
import { cn } from '@/lib/utils'

interface SeoFaqSectionProps {
  title: string
  entries: FaqEntry[]
  eyebrow?: string
  description?: string
  className?: string
}

export function SeoFaqSection({
  title,
  entries,
  eyebrow = 'FAQ',
  description,
  className
}: SeoFaqSectionProps) {
  if (!entries.length) return null

  return (
    <section className={cn('rounded-[2.5rem] bg-[linear-gradient(135deg,#fff8ef_0%,#f8fbff_48%,#eefaf5_100%)] p-8 shadow-panel sm:p-10', className)}>
      <div className="flex flex-col gap-3 border-b border-border/40 pb-6 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="editorial-kicker">{eyebrow}</p>
          <h2 className="mt-3 font-[var(--font-display)] text-4xl font-black tracking-tight text-foreground">{title}</h2>
        </div>
        {description ? <p className="max-w-2xl text-sm leading-7 text-muted-foreground">{description}</p> : null}
      </div>
      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        {entries.map((entry) => (
          <div key={entry.question} className="rounded-[1.75rem] bg-white p-6">
            <h3 className="font-[var(--font-display)] text-2xl font-black tracking-tight text-foreground">{entry.question}</h3>
            <p className="mt-3 text-sm leading-7 text-muted-foreground">{entry.answer}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
