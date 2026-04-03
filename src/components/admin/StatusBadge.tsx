import { cn } from '@/lib/utils'

const STYLES: Record<string, string> = {
  queued: 'bg-slate-100 text-slate-700',
  running: 'bg-amber-100 text-amber-800',
  completed: 'bg-emerald-100 text-emerald-800',
  published: 'bg-emerald-100 text-emerald-800',
  partialFailed: 'bg-orange-100 text-orange-800',
  failed: 'bg-rose-100 text-rose-800',
  draft: 'bg-slate-100 text-slate-700'
}

export function StatusBadge({ value }: { value: string }) {
  return (
    <span className={cn('inline-flex rounded-full px-3 py-1 text-xs font-semibold', STYLES[value] || 'bg-slate-100 text-slate-700')}>
      {value}
    </span>
  )
}
