import { cn } from '@/lib/utils'

export function OfferTransparencyPanel({
  title = 'How Bes3 treats promotions',
  description = 'Offers only stay trustworthy when the ranking logic and discount math are explicit.',
  className
}: {
  title?: string
  description?: string
  className?: string
}) {
  const cards = [
    {
      eyebrow: 'How we rank',
      title: 'User value first',
      description:
        'Bes3 ranks live opportunities by verified savings, tracked low distance, freshness, and evidence strength. Commission is only an eligibility gate, not a public ranking factor.'
    },
    {
      eyebrow: 'What counts as a promotion',
      title: 'A real reference is required',
      description:
        'A product only gets a percentage-off label when the current price can be compared against a reliable original, compare-at, or MSRP reference that we can explain.'
    },
    {
      eyebrow: 'Why labels differ',
      title: 'Not every product can show percent off',
      description:
        'If the reference price is missing or stale, Bes3 falls back to timing language like live offer, recent drop, or near tracked low instead of inventing a discount.'
    }
  ]

  return (
    <section className={cn('rounded-[2.5rem] bg-white p-8 shadow-panel sm:p-10', className)}>
      <div className="flex flex-col gap-3 border-b border-border/40 pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="editorial-kicker">Transparency</p>
          <h2 className="mt-3 font-[var(--font-display)] text-4xl font-black tracking-tight text-foreground">{title}</h2>
        </div>
        <p className="max-w-2xl text-sm leading-7 text-muted-foreground">{description}</p>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        {cards.map((card) => (
          <article key={card.title} className="rounded-[1.75rem] bg-[linear-gradient(135deg,#fff8ef_0%,#f8fbff_48%,#eefaf5_100%)] p-6">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">{card.eyebrow}</p>
            <h3 className="mt-3 font-[var(--font-display)] text-2xl font-black tracking-tight text-foreground">{card.title}</h3>
            <p className="mt-3 text-sm leading-7 text-muted-foreground">{card.description}</p>
          </article>
        ))}
      </div>
    </section>
  )
}
