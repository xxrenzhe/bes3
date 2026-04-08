import Link from 'next/link'
import { SectionHeader } from '@/components/site/SectionHeader'

export type PersonaPathway = {
  eyebrow: string
  title: string
  summary: string
  internalQuestion: string
  firstMove: string
  whyThisMove: string
  href: string
  label: string
  accentClassName?: string
}

export function PersonaPathwaySection({
  eyebrow,
  title,
  description,
  personas
}: {
  eyebrow: string
  title: string
  description: string
  personas: PersonaPathway[]
}) {
  return (
    <section className="rounded-[2.5rem] bg-white p-8 shadow-panel sm:p-10">
      <div className="flex flex-col gap-5 border-b border-border/40 pb-6 lg:flex-row lg:items-end lg:justify-between">
        <SectionHeader eyebrow={eyebrow} title={title} description={description} />
        <p className="max-w-xl text-sm leading-7 text-muted-foreground">
          Pick the persona that feels closest. The goal is not to label you forever. It is to remove the next piece of uncertainty faster.
        </p>
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-3">
        {personas.map((persona) => (
          <Link
            key={persona.title}
            href={persona.href}
            className="group flex h-full min-h-[320px] flex-col rounded-[1.9rem] border border-border/50 bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] p-6 transition-transform hover:-translate-y-1"
          >
            <div
              className={`inline-flex w-fit items-center rounded-full px-3 py-2 text-[10px] font-bold uppercase tracking-[0.22em] ${persona.accentClassName || 'bg-secondary text-secondary-foreground'}`}
            >
              {persona.eyebrow}
            </div>
            <h3 className="mt-4 font-[var(--font-display)] text-3xl font-black tracking-tight text-foreground">{persona.title}</h3>
            <p className="mt-3 text-sm leading-7 text-muted-foreground">{persona.summary}</p>

            <div className="mt-5 rounded-[1.5rem] bg-muted/70 p-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">Likely thought</p>
              <p className="mt-2 text-sm leading-7 text-muted-foreground">{persona.internalQuestion}</p>
            </div>

            <div className="mt-4 rounded-[1.5rem] bg-[linear-gradient(135deg,#fff8ef_0%,#f8fbff_48%,#eefaf5_100%)] p-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">Best first move</p>
              <p className="mt-2 text-base font-semibold text-foreground">{persona.firstMove}</p>
              <p className="mt-2 text-sm leading-7 text-muted-foreground">{persona.whyThisMove}</p>
            </div>

            <div className="mt-auto pt-6">
              <span className="inline-flex min-h-[48px] items-center text-sm font-semibold text-primary">
                {persona.label}
                <span aria-hidden="true" className="ml-2 transition-transform group-hover:translate-x-1">
                  →
                </span>
              </span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}
