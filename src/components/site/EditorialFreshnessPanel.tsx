import { formatEditorialDate } from '@/lib/editorial'

function getAgeInDays(checkedAt: string | null | undefined) {
  if (!checkedAt) return null
  const timestamp = Date.parse(checkedAt)
  if (!Number.isFinite(timestamp)) return null
  return Math.max(0, Math.floor((Date.now() - timestamp) / (1000 * 60 * 60 * 24)))
}

function buildMeaningText(kind: 'review' | 'comparison', ageInDays: number | null) {
  const subject = kind === 'review' ? 'recommendation' : 'tradeoff'

  if (ageInDays == null) {
    return `Bes3 has a readable ${subject} here, but the snapshot age is unclear enough that live price, stock, and small spec changes still deserve a quick recheck before you act.`
  }

  if (ageInDays <= 7) {
    return `This ${kind} was checked recently, so Bes3 can still treat the current ${subject} as a strong decision starting point instead of stale background reading.`
  }

  if (ageInDays <= 30) {
    return `This ${kind} is still recent enough to guide the decision, but you should confirm the live store context before treating the current ${subject} as final.`
  }

  return `This ${kind} is older, so use it mainly to validate fit and logic. Recheck live pricing and the latest product-state changes before you commit.`
}

function buildUseText(kind: 'review' | 'comparison', nextStepNote?: string) {
  if (nextStepNote) return nextStepNote

  if (kind === 'review') {
    return 'Use the review to decide whether this product deserves to stay on the shortlist, then move to product details, compare, or a price watch instead of opening more adjacent reviews.'
  }

  return 'Use the comparison to settle the shortlist while it is still narrow, then move to the winning product or a price watch instead of restarting broad discovery.'
}

export function EditorialFreshnessPanel({
  kind,
  checkedAt,
  freshnessLabel,
  nextStepNote
}: {
  kind: 'review' | 'comparison'
  checkedAt: string | null | undefined
  freshnessLabel?: string
  nextStepNote?: string
}) {
  const ageInDays = getAgeInDays(checkedAt)
  const title = kind === 'review' ? 'Why this review still deserves attention now.' : 'Why this comparison is still decision-relevant now.'

  return (
    <section className="rounded-[2rem] bg-white p-8 shadow-panel">
      <div className="flex flex-col gap-4 border-b border-border/40 pb-6 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="editorial-kicker">Freshness Meaning</p>
          <h2 className="mt-3 font-[var(--font-display)] text-3xl font-black tracking-tight text-foreground">{title}</h2>
        </div>
        <p className="max-w-2xl text-sm leading-7 text-muted-foreground">
          A timestamp alone is not enough. Bes3 should explain whether the page is fresh enough to guide the next move and where live verification still matters.
        </p>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <div className="rounded-[1.5rem] bg-muted/70 p-5">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">Last verified snapshot</p>
          <p className="mt-3 text-lg font-black text-foreground">{checkedAt ? formatEditorialDate(checkedAt) : 'Tracking soon'}</p>
          <p className="mt-2 text-sm leading-7 text-muted-foreground">{freshnessLabel || 'Use the live product page to confirm anything time-sensitive.'}</p>
        </div>
        <div className="rounded-[1.5rem] bg-[linear-gradient(135deg,#fff8ef_0%,#f8fbff_48%,#eefaf5_100%)] p-5">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">What that means</p>
          <p className="mt-3 text-sm leading-7 text-muted-foreground">{buildMeaningText(kind, ageInDays)}</p>
        </div>
        <div className="rounded-[1.5rem] bg-slate-950 p-5 text-white">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-200">How to use it</p>
          <p className="mt-3 text-sm leading-7 text-slate-200">{buildUseText(kind, nextStepNote)}</p>
        </div>
      </div>
    </section>
  )
}
