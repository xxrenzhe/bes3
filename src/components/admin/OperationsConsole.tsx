'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import { RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { StatusBadge } from '@/components/admin/StatusBadge'
import { Button } from '@/components/ui/button'

type OperationAction = {
  label: string
  body: Record<string, unknown>
  success: string
  variant?: 'default' | 'outline' | 'secondary'
}

type OperationSection = {
  title: string
  key: string
  columns: Array<{
    label: string
    key: string
    badge?: boolean
    date?: boolean
  }>
}

type OperationsConsoleProps = {
  title: string
  eyebrow: string
  description: string
  endpoint: string
  metricKeys: Array<{ label: string; key: string }>
  actions?: OperationAction[]
  sections: OperationSection[]
}

function readPath(source: Record<string, any>, path: string): unknown {
  return path.split('.').reduce<unknown>((value, part) => {
    if (value == null || typeof value !== 'object') return undefined
    return (value as Record<string, unknown>)[part]
  }, source)
}

function formatDate(value: unknown) {
  if (!value) return 'N/A'
  const date = new Date(String(value))
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString()
}

function formatValue(value: unknown) {
  if (value == null || value === '') return 'N/A'
  if (typeof value === 'number') return Number.isInteger(value) ? String(value) : value.toFixed(3)
  return String(value)
}

function asRows(value: unknown): Array<Record<string, any>> {
  return Array.isArray(value) ? value.filter((item) => item && typeof item === 'object') as Array<Record<string, any>> : []
}

export function OperationsConsole({
  title,
  eyebrow,
  description,
  endpoint,
  metricKeys,
  actions = [],
  sections
}: OperationsConsoleProps) {
  const [snapshot, setSnapshot] = useState<Record<string, any> | null>(null)
  const [isPending, startTransition] = useTransition()

  const load = async () => {
    const response = await fetch(endpoint)
    const body = await response.json().catch(() => ({}))
    if (!response.ok) {
      toast.error(body.error || 'Failed to load operation snapshot')
      return
    }
    setSnapshot(body as Record<string, any>)
  }

  useEffect(() => {
    void load()
  }, [])

  const metrics = useMemo(() => {
    const summary = snapshot?.summary || {}
    return metricKeys.map((metric) => ({
      ...metric,
      value: readPath(summary, metric.key) ?? 0
    }))
  }, [metricKeys, snapshot])

  const triggerAction = (action: OperationAction) => {
    startTransition(async () => {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(action.body)
      })
      const body = await response.json().catch(() => ({}))
      if (!response.ok) {
        toast.error(body.error || 'Action failed')
        return
      }
      await load()
      toast.success(action.success)
    })
  }

  return (
    <div className="space-y-6 p-6 lg:p-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.28em] text-primary">{eyebrow}</p>
          <h1 className="mt-2 font-[var(--font-display)] text-4xl font-semibold tracking-tight">{title}</h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-muted-foreground">{description}</p>
        </div>
        <Button
          variant="outline"
          disabled={isPending}
          onClick={() => {
            startTransition(async () => {
              await load()
            })
          }}
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <div key={metric.key} className="rounded-2xl border border-border bg-white p-5 shadow-panel">
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{metric.label}</p>
            <p className="mt-3 text-3xl font-semibold">{formatValue(metric.value)}</p>
          </div>
        ))}
      </div>

      {actions.length ? (
        <div className="flex flex-wrap gap-3 rounded-[24px] border border-border bg-white p-5 shadow-panel">
          {actions.map((action) => (
            <Button key={action.label} variant={action.variant || 'default'} disabled={isPending} onClick={() => triggerAction(action)}>
              {action.label}
            </Button>
          ))}
        </div>
      ) : null}

      <div className="grid gap-6">
        {sections.map((section) => {
          const rows = asRows(snapshot ? readPath(snapshot, section.key) : [])
          return (
            <section key={section.key} className="rounded-[24px] border border-border bg-white p-6 shadow-panel">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="font-semibold">{section.title}</p>
                <span className="text-sm text-muted-foreground">{rows.length} rows</span>
              </div>
              <div className="mt-4 overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="border-b border-border text-xs uppercase tracking-[0.16em] text-muted-foreground">
                    <tr>
                      {section.columns.map((column) => (
                        <th key={column.key} className="pb-3 pr-4">{column.label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.slice(0, 24).map((row, index) => (
                      <tr key={`${section.key}-${row.id || index}`} className="border-b border-border/70">
                        {section.columns.map((column) => {
                          const value = readPath(row, column.key)
                          return (
                            <td key={column.key} className="max-w-[360px] py-3 pr-4 align-top">
                              {column.badge ? (
                                <StatusBadge value={formatValue(value)} />
                              ) : (
                                <span className="line-clamp-2 text-muted-foreground">
                                  {column.date ? formatDate(value) : formatValue(value)}
                                </span>
                              )}
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )
        })}
      </div>
    </div>
  )
}
