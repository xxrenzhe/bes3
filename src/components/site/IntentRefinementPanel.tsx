import Link from 'next/link'
import type { IntentRefinementPrompt } from '@/lib/commerce-intent'

export function IntentRefinementPanel({
  eyebrow = 'Sharpen The Request',
  title,
  description,
  prompts,
  href
}: {
  eyebrow?: string
  title: string
  description: string
  prompts: IntentRefinementPrompt[]
  href: string
}) {
  if (!prompts.length) return null

  return (
    <section className="rounded-[2rem] bg-white p-8 shadow-panel">
      <div className="flex flex-col gap-3 border-b border-border/40 pb-6 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="editorial-kicker">{eyebrow}</p>
          <h2 className="mt-3 font-[var(--font-display)] text-3xl font-black tracking-tight text-foreground">{title}</h2>
        </div>
        <p className="max-w-2xl text-sm leading-7 text-muted-foreground">{description}</p>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        {prompts.map((prompt) => (
          <div key={prompt.id} className="rounded-[1.5rem] bg-[linear-gradient(135deg,#fff8ef_0%,#f8fbff_48%,#eefaf5_100%)] p-6">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">{prompt.label}</p>
            <h3 className="mt-3 font-[var(--font-display)] text-2xl font-black tracking-tight text-foreground">{prompt.title}</h3>
            <p className="mt-3 text-sm leading-7 text-muted-foreground">{prompt.description}</p>
            <p className="mt-4 rounded-[1.25rem] bg-white/80 px-4 py-3 text-sm leading-7 text-foreground">{prompt.example}</p>
          </div>
        ))}
      </div>

      <div className="mt-6">
        <Link href={href} className="inline-flex min-h-[44px] items-center justify-center rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground">
          Update the request
        </Link>
      </div>
    </section>
  )
}
