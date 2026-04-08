'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { sanitizeInternalHref } from '@/lib/resume-context'
import { SHOPPING_TASK_MEMORY_KEY, type StoredShoppingTask } from '@/lib/task-memory'

function readStoredTask(): StoredShoppingTask | null {
  try {
    const raw = window.localStorage.getItem(SHOPPING_TASK_MEMORY_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<StoredShoppingTask>
    const href = sanitizeInternalHref(parsed.href)
    if (!href) return null

    return {
      href,
      label: String(parsed.label || 'Resume this task').trim() || 'Resume this task',
      description:
        String(parsed.description || 'Return to the same shopping task instead of reopening broad browsing.').trim() ||
        'Return to the same shopping task instead of reopening broad browsing.',
      source: parsed.source ? String(parsed.source) : undefined,
      updatedAt: String(parsed.updatedAt || '')
    }
  } catch {
    return null
  }
}

function formatSavedTime(value: string) {
  const time = Date.parse(value)
  if (!Number.isFinite(time)) return 'Saved recently'

  const diffMinutes = Math.max(0, Math.round((Date.now() - time) / 60000))
  if (diffMinutes < 1) return 'Saved just now'
  if (diffMinutes < 60) return `Saved ${diffMinutes} min ago`

  const diffHours = Math.round(diffMinutes / 60)
  if (diffHours < 24) return `Saved ${diffHours} hr ago`

  const diffDays = Math.round(diffHours / 24)
  return `Saved ${diffDays} day${diffDays === 1 ? '' : 's'} ago`
}

export function ResumeShoppingTaskPanel({
  className = ''
}: {
  className?: string
}) {
  const [task, setTask] = useState<StoredShoppingTask | null>(null)

  useEffect(() => {
    setTask(readStoredTask())
  }, [])

  const savedTimeLabel = useMemo(() => (task ? formatSavedTime(task.updatedAt) : ''), [task])

  function clearTask() {
    try {
      window.localStorage.removeItem(SHOPPING_TASK_MEMORY_KEY)
    } catch {}
    setTask(null)
  }

  if (!task) return null

  return (
    <section className={`rounded-[2rem] bg-[linear-gradient(135deg,#fff8ef_0%,#f8fbff_48%,#eefaf5_100%)] p-6 shadow-panel sm:p-8 ${className}`.trim()}>
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="max-w-3xl">
          <p className="editorial-kicker">Resume Your Task</p>
          <h2 className="mt-3 font-[var(--font-display)] text-3xl font-black tracking-tight text-foreground">
            Pick back up where you left off.
          </h2>
          <p className="mt-4 text-sm leading-7 text-muted-foreground">{task.description}</p>
        </div>
        <div className="rounded-[1.25rem] bg-white px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          {savedTimeLabel}
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <Link href={task.href} className="inline-flex min-h-[44px] items-center justify-center rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground">
          {task.label}
        </Link>
        <button
          type="button"
          onClick={clearTask}
          className="inline-flex min-h-[44px] items-center justify-center rounded-full border border-border bg-white px-5 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
        >
          Forget this task
        </button>
      </div>
    </section>
  )
}
