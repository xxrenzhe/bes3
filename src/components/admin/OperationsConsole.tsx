'use client'

import { useCallback, useEffect, useMemo, useState, useTransition } from 'react'
import { RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { StatusBadge } from '@/components/admin/StatusBadge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

type OperationAction = {
  label: string
  body: Record<string, unknown>
  success: string
  variant?: 'default' | 'outline' | 'secondary'
  confirmMessage?: string
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

function getRowKey(sectionKey: string, row: Record<string, any>, index: number) {
  return `${sectionKey}-${row.id || row.slug || row.key || index}`
}

function compareValues(left: unknown, right: unknown) {
  const leftNumber = typeof left === 'number' ? left : Number.NaN
  const rightNumber = typeof right === 'number' ? right : Number.NaN
  if (Number.isFinite(leftNumber) && Number.isFinite(rightNumber)) return leftNumber - rightNumber
  return formatValue(left).localeCompare(formatValue(right), undefined, { numeric: true, sensitivity: 'base' })
}

function OperationTable({ section, rows }: { section: OperationSection; rows: Array<Record<string, any>> }) {
  const [query, setQuery] = useState('')
  const [sortKey, setSortKey] = useState(section.columns[0]?.key || '')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [page, setPage] = useState(1)
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set())
  const pageSize = 12
  const normalizedQuery = query.trim().toLowerCase()
  const filteredRows = useMemo(() => {
    const nextRows = normalizedQuery
      ? rows.filter((row) =>
          section.columns.some((column) => formatValue(readPath(row, column.key)).toLowerCase().includes(normalizedQuery))
        )
      : rows
    return [...nextRows].sort((left, right) => {
      const result = compareValues(readPath(left, sortKey), readPath(right, sortKey))
      return sortDirection === 'asc' ? result : -result
    })
  }, [normalizedQuery, rows, section.columns, sortDirection, sortKey])
  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize))
  const safePage = Math.min(page, totalPages)
  const pageRows = filteredRows.slice((safePage - 1) * pageSize, safePage * pageSize)

  useEffect(() => {
    setPage(1)
    setSelectedKeys(new Set())
  }, [normalizedQuery, rows])

  const toggleSort = (key: string) => {
    if (sortKey === key) {
      setSortDirection((current) => (current === 'asc' ? 'desc' : 'asc'))
      return
    }
    setSortKey(key)
    setSortDirection('asc')
  }

  const toggleRow = (key: string, checked: boolean) => {
    setSelectedKeys((current) => {
      const next = new Set(current)
      if (checked) next.add(key)
      else next.delete(key)
      return next
    })
  }

  return (
    <section className="rounded-[24px] border border-border bg-white p-6 shadow-panel">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-semibold">{section.title}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {filteredRows.length} visible · {rows.length} total · {selectedKeys.size} selected
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Input
            aria-label={`Filter ${section.title}`}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Filter rows"
            className="min-h-11 w-56"
          />
          {selectedKeys.size > 0 ? (
            <Button type="button" variant="outline" onClick={() => setSelectedKeys(new Set())}>
              Clear selection
            </Button>
          ) : null}
        </div>
      </div>
      <div className="mt-4 overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-border text-xs uppercase tracking-[0.16em] text-muted-foreground">
            <tr>
              <th className="pb-3 pr-4">
                <span className="sr-only">Select row</span>
              </th>
              {section.columns.map((column) => (
                <th key={column.key} className="pb-3 pr-4">
                  <button
                    type="button"
                    onClick={() => toggleSort(column.key)}
                    className="inline-flex min-h-11 items-center rounded-md px-1 text-left font-semibold uppercase tracking-[0.16em] hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                  >
                    {column.label}
                    {sortKey === column.key ? <span className="ml-2">{sortDirection === 'asc' ? 'Asc' : 'Desc'}</span> : null}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageRows.length > 0 ? (
              pageRows.map((row, index) => {
                const rowKey = getRowKey(section.key, row, (safePage - 1) * pageSize + index)
                return (
                  <tr key={rowKey} className="border-b border-border/70">
                    <td className="py-3 pr-4 align-top">
                      <input
                        type="checkbox"
                        aria-label={`Select ${section.title} row ${index + 1}`}
                        checked={selectedKeys.has(rowKey)}
                        onChange={(event) => toggleRow(rowKey, event.target.checked)}
                        className="h-5 w-5 rounded border-border"
                      />
                    </td>
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
                )
              })
            ) : (
              <tr>
                <td colSpan={section.columns.length + 1} className="py-8 text-center text-sm text-muted-foreground">
                  No rows match the current filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Page {safePage} of {totalPages}
        </p>
        <div className="flex gap-2">
          <Button type="button" variant="outline" disabled={safePage <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>
            Previous
          </Button>
          <Button type="button" variant="outline" disabled={safePage >= totalPages} onClick={() => setPage((current) => Math.min(totalPages, current + 1))}>
            Next
          </Button>
        </div>
      </div>
    </section>
  )
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

  const load = useCallback(async () => {
    const response = await fetch(endpoint)
    const body = await response.json().catch(() => ({}))
    if (!response.ok) {
      toast.error(body.error || 'Failed to load operation snapshot')
      return
    }
    setSnapshot(body as Record<string, any>)
  }, [endpoint])

  useEffect(() => {
    void load()
  }, [load])

  const metrics = useMemo(() => {
    const summary = snapshot?.summary || {}
    return metricKeys.map((metric) => ({
      ...metric,
      value: readPath(summary, metric.key) ?? 0
    }))
  }, [metricKeys, snapshot])

  const triggerAction = (action: OperationAction) => {
    if (action.confirmMessage && !window.confirm(action.confirmMessage)) return
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
          return <OperationTable key={section.key} section={section} rows={rows} />
        })}
      </div>
    </div>
  )
}
