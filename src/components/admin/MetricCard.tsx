export function MetricCard({
  label,
  value,
  description,
  tone = 'blue'
}: {
  label: string
  value: number
  description: string
  tone?: 'blue' | 'green' | 'amber' | 'slate'
}) {
  const toneClassName = {
    blue: 'border-blue-200 bg-gradient-to-br from-blue-50 to-blue-100/50 text-blue-600',
    green: 'border-green-200 bg-gradient-to-br from-green-50 to-green-100/50 text-green-600',
    amber: 'border-amber-200 bg-gradient-to-br from-amber-50 to-amber-100/50 text-amber-700',
    slate: 'border-slate-200 bg-gradient-to-br from-slate-50 to-slate-100/50 text-slate-600'
  }[tone]

  return (
    <div className={`rounded-lg border p-3 shadow-sm transition-shadow hover:shadow-md ${toneClassName}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="mt-1 text-2xl font-bold tracking-tight text-slate-950">{value.toLocaleString()}</p>
        </div>
        <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-current" aria-hidden="true" />
      </div>
      <p className="mt-2 line-clamp-1 text-xs text-slate-500">{description}</p>
    </div>
  )
}
