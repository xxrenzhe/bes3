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
  if (!value) return '暂无'
  const date = new Date(String(value))
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString()
}

function formatValue(value: unknown) {
  if (value == null || value === '') return '暂无'
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
    <section className="min-w-0 rounded-2xl border border-border bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="font-semibold">{section.title}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            显示 {filteredRows.length} 条 · 共 {rows.length} 条 · 已选 {selectedKeys.size} 条
          </p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center">
          <Input
            aria-label={`筛选${section.title}`}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="筛选当前表格"
            className="min-h-10 w-full sm:w-52"
          />
          {selectedKeys.size > 0 ? (
            <Button type="button" variant="outline" onClick={() => setSelectedKeys(new Set())}>
              清空选择
            </Button>
          ) : null}
        </div>
      </div>
      <div className="mt-3 overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-border text-xs uppercase tracking-[0.16em] text-muted-foreground">
            <tr>
              <th className="pb-2 pr-3">
                <span className="sr-only">选择行</span>
              </th>
              {section.columns.map((column) => (
                <th key={column.key} className="pb-2 pr-3">
                  <button
                    type="button"
                    onClick={() => toggleSort(column.key)}
                    className="inline-flex min-h-9 items-center rounded-md px-1 text-left font-semibold uppercase tracking-[0.14em] hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                  >
                    {column.label}
                    {sortKey === column.key ? <span className="ml-2">{sortDirection === 'asc' ? '升序' : '降序'}</span> : null}
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
                    <td className="py-2 pr-3 align-top">
                      <input
                        type="checkbox"
                        aria-label={`选择${section.title}第 ${index + 1} 行`}
                        checked={selectedKeys.has(rowKey)}
                        onChange={(event) => toggleRow(rowKey, event.target.checked)}
                        className="h-4 w-4 rounded border-border"
                      />
                    </td>
                    {section.columns.map((column) => {
                      const value = readPath(row, column.key)
                      return (
                        <td key={column.key} className="max-w-[320px] py-2 pr-3 align-top">
                          {column.badge ? (
                            <StatusBadge value={formatValue(value)} />
                          ) : (
                            <span className="line-clamp-2 break-words text-muted-foreground">
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
                  当前筛选条件下没有匹配数据。
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          第 {safePage} / {totalPages} 页
        </p>
        <div className="flex w-full gap-2 sm:w-auto">
          <Button type="button" variant="outline" disabled={safePage <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>
            上一页
          </Button>
          <Button type="button" variant="outline" disabled={safePage >= totalPages} onClick={() => setPage((current) => Math.min(totalPages, current + 1))}>
            下一页
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
      toast.error(body.error || '加载运营快照失败')
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
        toast.error(body.error || '操作失败')
        return
      }
      await load()
      toast.success(action.success)
    })
  }

  return (
    <div className="space-y-4 p-4 sm:p-5 lg:p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-primary">{eyebrow}</p>
          <h1 className="mt-1 font-[var(--font-display)] text-2xl font-semibold tracking-tight">{title}</h1>
          <p className="mt-1.5 max-w-3xl text-xs leading-5 text-muted-foreground">{description}</p>
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
          刷新
        </Button>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <div key={metric.key} className="rounded-2xl border border-border bg-white p-4 shadow-sm">
            <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">{metric.label}</p>
            <p className="mt-1.5 text-2xl font-semibold">{formatValue(metric.value)}</p>
          </div>
        ))}
      </div>

      {actions.length ? (
        <div className="flex flex-wrap gap-2 rounded-2xl border border-border bg-white p-4 shadow-sm">
          {actions.map((action) => (
            <Button key={action.label} variant={action.variant || 'default'} disabled={isPending} onClick={() => triggerAction(action)}>
              {action.label}
            </Button>
          ))}
        </div>
      ) : null}

      <div className="grid gap-4">
        {sections.map((section) => {
          const rows = asRows(snapshot ? readPath(snapshot, section.key) : [])
          return <OperationTable key={section.key} section={section} rows={rows} />
        })}
      </div>
    </div>
  )
}
