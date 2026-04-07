type DecisionReasonCard = {
  eyebrow: string
  title: string
  description: string
  tone?: 'default' | 'muted' | 'strong'
}

function getCardTone(tone: DecisionReasonCard['tone']) {
  if (tone === 'strong') {
    return 'bg-slate-950 text-white'
  }

  if (tone === 'muted') {
    return 'bg-muted/70 text-foreground'
  }

  return 'bg-white text-foreground shadow-[0_24px_60px_-40px_rgba(15,23,42,0.35)]'
}

export function DecisionReasonPanel({
  eyebrow,
  title,
  description,
  cards
}: {
  eyebrow: string
  title: string
  description: string
  cards: DecisionReasonCard[]
}) {
  return (
    <section className="rounded-[2.5rem] bg-[linear-gradient(135deg,#fff8ef_0%,#f8fbff_48%,#eefaf5_100%)] p-8 shadow-panel sm:p-10">
      <div className="flex flex-col gap-4 border-b border-border/40 pb-6 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="editorial-kicker">{eyebrow}</p>
          <h2 className="mt-3 font-[var(--font-display)] text-4xl font-black tracking-tight text-foreground">{title}</h2>
        </div>
        <p className="max-w-2xl text-sm leading-7 text-muted-foreground">{description}</p>
      </div>

      <div className={`mt-6 grid gap-4 ${cards.length >= 4 ? 'xl:grid-cols-4' : cards.length === 3 ? 'xl:grid-cols-3' : 'md:grid-cols-2'}`}>
        {cards.map((card) => (
          <div key={`${card.eyebrow}-${card.title}`} className={`rounded-[1.75rem] p-6 ${getCardTone(card.tone)}`}>
            <p className={`text-[10px] font-bold uppercase tracking-[0.2em] ${card.tone === 'strong' ? 'text-emerald-200' : 'text-primary'}`}>{card.eyebrow}</p>
            <h3 className="mt-3 font-[var(--font-display)] text-2xl font-black tracking-tight">{card.title}</h3>
            <p className={`mt-3 text-sm leading-7 ${card.tone === 'strong' ? 'text-slate-200' : 'text-muted-foreground'}`}>{card.description}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
