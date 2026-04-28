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
    <div className="relative overflow-hidden rounded-2xl border border-slate-200/70 bg-white/90 p-4 shadow-sm">
      <div className="absolute inset-x-0 top-0 h-0.5 bg-[linear-gradient(90deg,#059669,#7dd3fc)]" />
      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">{label}</p>
      <div className="mt-2 text-2xl font-black tracking-tight text-slate-950">{value.toLocaleString()}</div>
      <p className="mt-1.5 line-clamp-2 text-xs leading-5 text-slate-600">{description}</p>
    </div>
  )
}
