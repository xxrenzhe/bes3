import Link from 'next/link'
import { PriceTrendSparkline } from '@/components/site/PriceTrendSparkline'
import type { ProductPriceHistoryRecord } from '@/lib/site-data'

type TimingDecisionMetric = {
  label: string
  value: string
  note: string
}

type TimingDecisionAction = {
  href: string
  label: string
  variant?: 'primary' | 'secondary'
}

export function TimingDecisionPanel({
  eyebrow = 'Buy Or Wait',
  title,
  description,
  signalBadge,
  signalTitle,
  signalDescription,
  decisionLabel = 'Bes3 call',
  decisionText,
  metrics,
  actions,
  priceHistory,
  fallbackPrice,
  fallbackCurrency,
  tone = 'default'
}: {
  eyebrow?: string
  title: string
  description: string
  signalBadge: string
  signalTitle: string
  signalDescription: string
  decisionLabel?: string
  decisionText: string
  metrics: TimingDecisionMetric[]
  actions: TimingDecisionAction[]
  priceHistory?: ProductPriceHistoryRecord[]
  fallbackPrice?: number | null
  fallbackCurrency?: string | null
  tone?: 'default' | 'positive' | 'warning'
}) {
  return (
    <section className="rounded-[2.5rem] bg-[linear-gradient(135deg,#fff8ef_0%,#f8fbff_48%,#eefaf5_100%)] p-8 shadow-panel sm:p-10">
      <div className="grid gap-8 xl:grid-cols-[1.05fr_0.95fr] xl:items-start">
        <div>
          <p className="editorial-kicker">{eyebrow}</p>
          <h2 className="mt-3 font-[var(--font-display)] text-4xl font-black tracking-tight text-foreground">{title}</h2>
          <p className="mt-4 max-w-3xl text-sm leading-8 text-muted-foreground">{description}</p>

          <div className="mt-6 rounded-[1.75rem] bg-slate-950 p-5 text-white">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-200">{decisionLabel}</p>
            <p className="mt-3 text-sm leading-7 text-slate-200">{decisionText}</p>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            {actions.map((action) => (
              <Link
                key={`${action.href}-${action.label}`}
                href={action.href}
                className={
                  action.variant === 'secondary'
                    ? 'inline-flex min-h-[44px] items-center justify-center rounded-full border border-border bg-white px-5 text-sm font-semibold text-foreground transition-colors hover:bg-muted'
                    : 'inline-flex min-h-[44px] items-center justify-center rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground'
                }
              >
                {action.label}
              </Link>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-[1.75rem] bg-white p-6 shadow-[0_24px_60px_-40px_rgba(15,23,42,0.35)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-primary">{signalBadge}</p>
                <h3 className="mt-3 font-[var(--font-display)] text-2xl font-black tracking-tight text-foreground">{signalTitle}</h3>
              </div>
            </div>
            <p className="mt-3 text-sm leading-7 text-muted-foreground">{signalDescription}</p>
            {priceHistory ? (
              <PriceTrendSparkline
                priceHistory={priceHistory}
                fallbackPrice={fallbackPrice}
                fallbackCurrency={fallbackCurrency}
                className="mt-5"
                tone={tone}
              />
            ) : null}
          </div>

          <div className="grid gap-4 sm:grid-cols-3 xl:grid-cols-1">
            {metrics.map((metric) => (
              <div key={metric.label} className="rounded-[1.5rem] bg-white p-5 shadow-[0_20px_45px_-35px_rgba(15,23,42,0.35)]">
                <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground">{metric.label}</p>
                <p className="mt-3 text-2xl font-black text-foreground">{metric.value}</p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{metric.note}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
