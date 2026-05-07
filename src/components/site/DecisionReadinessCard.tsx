import type { DecisionReadinessSignal } from '@/lib/decision-readiness'

export function DecisionReadinessCard({ readiness }: { readiness: DecisionReadinessSignal }) {
  return (
    <div className="rounded-md border border-border bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs font-bold uppercase tracking-[0.22em] text-primary">Decision readiness</p>
        <span className="rounded-full bg-slate-950 px-3 py-1 text-xs font-semibold text-white">
          {readiness.score}/100
        </span>
      </div>
      <p className="mt-3 text-lg font-black tracking-tight">{readiness.label}</p>
      <p className="mt-2 text-sm leading-7 text-muted-foreground">{readiness.summary}</p>
      <ul className="mt-3 space-y-2 text-xs leading-6 text-muted-foreground">
        {readiness.reasons.slice(0, 2).map((reason) => <li key={reason}>Ready: {reason}</li>)}
        {readiness.blockers.slice(0, 2).map((blocker) => <li key={blocker}>Needs work: {blocker}</li>)}
      </ul>
    </div>
  )
}
