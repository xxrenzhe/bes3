export function MetricCard({
  label,
  value,
  description
}: {
  label: string
  value: number
  description: string
}) {
  return (
    <div className="rounded-[28px] border border-border bg-white p-6 shadow-panel">
      <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">{label}</p>
      <div className="mt-3 text-4xl font-semibold tracking-tight">{value}</div>
      <p className="mt-2 text-sm text-muted-foreground">{description}</p>
    </div>
  )
}
