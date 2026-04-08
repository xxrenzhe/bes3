'use client'

import { useEffect, useMemo, useState } from 'react'

type ComparisonSummaryRow = {
  label: string
  left: string
  right: string
}

type ComparisonScenario = {
  label: string
  winner: string
  reason: string
  note: string
}

export function ComparisonSummaryMatrix({
  leftTitle,
  rightTitle,
  winner,
  rows,
  scenarios = []
}: {
  leftTitle: string
  rightTitle: string
  winner: string
  rows: ComparisonSummaryRow[]
  scenarios?: ComparisonScenario[]
}) {
  const normalizedScenarios = useMemo(
    () =>
      scenarios.map((scenario, index) => ({
        ...scenario,
        id: `${scenario.label.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'scenario'}-${index}`
      })),
    [scenarios]
  )
  const [activeScenarioId, setActiveScenarioId] = useState(normalizedScenarios[0]?.id || '')
  const activeScenario =
    normalizedScenarios.find((scenario) => scenario.id === activeScenarioId) || normalizedScenarios[0] || null

  useEffect(() => {
    if (!normalizedScenarios.length) {
      setActiveScenarioId('')
      return
    }

    if (!normalizedScenarios.some((scenario) => scenario.id === activeScenarioId)) {
      setActiveScenarioId(normalizedScenarios[0].id)
    }
  }, [activeScenarioId, normalizedScenarios])

  return (
    <section className="rounded-[2.5rem] bg-white p-8 shadow-panel sm:p-10">
      <div className="mb-6 flex flex-col gap-3 border-b border-border/40 pb-6 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="editorial-kicker">Comparison Table</p>
          <h2 className="mt-3 font-[var(--font-display)] text-4xl font-black tracking-tight text-foreground">Keep both finalists visible while you scroll.</h2>
        </div>
        <p className="max-w-2xl text-sm leading-7 text-muted-foreground">
          This matrix keeps the two finalists pinned at the top so you can compare the big tradeoffs without losing context.
        </p>
      </div>
      <div className="overflow-x-auto rounded-[1.75rem] border border-border/60">
        <div className="min-w-[720px]">
          <div className="sticky top-0 z-10 grid grid-cols-[220px_1fr_1fr] border-b border-border/60 bg-white/95 backdrop-blur">
            <div className="px-5 py-4 text-[10px] font-bold uppercase tracking-[0.24em] text-muted-foreground">Comparison</div>
            {[leftTitle, rightTitle].map((title) => {
              const isWinner = title === winner
              return (
                <div key={title} className={`px-5 py-4 ${isWinner ? 'bg-emerald-50' : ''}`}>
                  <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-primary">{isWinner ? 'Winner' : 'Alternative'}</p>
                  <p className="mt-2 font-[var(--font-display)] text-2xl font-black tracking-tight text-foreground">{title}</p>
                </div>
              )
            })}
          </div>
          {rows.map((row, index) => (
            <div
              key={row.label}
              className={`grid grid-cols-[220px_1fr_1fr] border-b border-border/40 ${
                index % 2 === 0 ? 'bg-slate-50/70' : 'bg-white'
              }`}
            >
              <div className="px-5 py-4 text-sm font-semibold text-foreground">{row.label}</div>
              <div className="px-5 py-4 text-sm leading-7 text-muted-foreground">{row.left}</div>
              <div className="px-5 py-4 text-sm leading-7 text-muted-foreground">{row.right}</div>
            </div>
          ))}
        </div>
      </div>

      {normalizedScenarios.length ? (
        <div className="mt-8 rounded-[2rem] bg-[linear-gradient(135deg,#f8fbff_0%,#ffffff_45%,#eefaf5_100%)] p-6">
          <div className="max-w-3xl">
            <p className="editorial-kicker">Scenario Lens</p>
            <h3 className="mt-3 font-[var(--font-display)] text-3xl font-black tracking-tight text-foreground">
              Who wins if you care about one thing most?
            </h3>
            <p className="mt-3 text-sm leading-7 text-muted-foreground">
              Use these scenario calls when the headline winner is close, but your real decision depends on the one priority you refuse to compromise on.
            </p>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            {normalizedScenarios.map((scenario) => {
              const isActive = scenario.id === activeScenario?.id

              return (
                <button
                  key={scenario.id}
                  type="button"
                  onClick={() => setActiveScenarioId(scenario.id)}
                  className={`rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${
                    isActive
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border bg-white text-foreground hover:border-primary/30 hover:text-primary'
                  }`}
                  aria-pressed={isActive}
                >
                  {scenario.label}
                </button>
              )
            })}
          </div>

          {activeScenario ? (
            <div className="mt-6 grid gap-4 xl:grid-cols-[0.72fr_0.28fr]">
              <article className="rounded-[1.75rem] border border-border/60 bg-white p-6 shadow-[0_24px_60px_-40px_rgba(15,23,42,0.24)]">
                <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-primary">{activeScenario.label}</p>
                <h4 className="mt-3 font-[var(--font-display)] text-3xl font-black tracking-tight text-foreground">
                  {activeScenario.winner}
                </h4>
                <p className="mt-4 text-sm leading-7 text-muted-foreground">{activeScenario.reason}</p>
                <div className="mt-5 rounded-[1.25rem] bg-slate-950 px-4 py-4 text-sm font-semibold leading-6 text-white">
                  {activeScenario.note}
                </div>
              </article>

              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
                <div className="rounded-[1.5rem] border border-border/60 bg-slate-50/80 p-5">
                  <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground">Default winner</p>
                  <p className="mt-3 font-[var(--font-display)] text-2xl font-black tracking-tight text-foreground">{winner}</p>
                  <p className="mt-3 text-sm leading-7 text-muted-foreground">
                    This is the main page recommendation before switching into a more specific buyer lens.
                  </p>
                </div>
                <div className="rounded-[1.5rem] border border-border/60 bg-slate-50/80 p-5">
                  <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground">Why this switch matters</p>
                  <p className="mt-3 text-sm leading-7 text-muted-foreground">
                    The better pick can change when your one non-negotiable priority is cost, raw capability, ownership calm, or price timing.
                  </p>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  )
}
