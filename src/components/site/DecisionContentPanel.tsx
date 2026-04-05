import type { DecisionContentModule } from '@/lib/decision-content'

export function DecisionContentPanel({
  modules,
  title = 'Decision modules',
  description = 'These structured blocks compress the main buying logic into a format Bes3 can reuse across pages and feeds.',
  compact = false
}: {
  modules: DecisionContentModule[]
  title?: string
  description?: string
  compact?: boolean
}) {
  if (!modules.length) return null

  return (
    <section className="rounded-[2rem] bg-white p-6 shadow-panel sm:p-8">
      <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-primary">Structured modules</p>
      <h2 className="mt-3 font-[var(--font-display)] text-3xl font-black tracking-tight text-foreground">{title}</h2>
      <p className="mt-3 max-w-3xl text-sm leading-7 text-muted-foreground">{description}</p>

      <div className={`mt-6 grid gap-4 ${compact ? 'md:grid-cols-2' : 'xl:grid-cols-2'}`}>
        {modules.map((module) => (
          <div key={module.id} className="rounded-[1.5rem] border border-border/60 bg-[linear-gradient(135deg,#fff8ef_0%,#f8fbff_48%,#eefaf5_100%)] p-5">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">{module.eyebrow}</p>
            <h3 className="mt-3 text-xl font-black tracking-tight text-foreground">{module.title}</h3>
            <div className="mt-4 space-y-3">
              {module.items.map((item) => (
                <div key={item} className="flex items-start gap-3 text-sm leading-7 text-muted-foreground">
                  <span className="mt-2 h-2.5 w-2.5 shrink-0 rounded-full bg-primary" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
