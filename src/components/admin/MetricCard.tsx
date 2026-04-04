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
    <div className="relative overflow-hidden rounded-[2rem] border border-slate-200/70 bg-white/90 p-6 shadow-[0_28px_60px_-36px_rgba(15,23,42,0.28)]">
      <div className="absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,#059669,#7dd3fc)]" />
      <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">{label}</p>
      <div className="mt-4 text-4xl font-black tracking-tight text-slate-950">{value.toLocaleString()}</div>
      <p className="mt-3 text-sm leading-7 text-slate-600">{description}</p>
    </div>
  )
}
