'use client'

import Link from 'next/link'
import { useEffect, useState, useTransition } from 'react'
import { Activity, ExternalLink, RefreshCw, RotateCcw, ServerCog, TerminalSquare, XCircle } from 'lucide-react'
import { toast } from 'sonner'
import { StatusBadge } from '@/components/admin/StatusBadge'
import { buttonVariants, Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type PipelineRun = {
  id: number
  product_id: number | null
  affiliate_product_id: number | null
  run_type: 'fullPipeline' | 'workspaceAction'
  requested_action: string | null
  status: string
  current_stage: string | null
  error_message: string | null
  source_link: string
  worker_id: string | null
  started_at: string | null
  finished_at: string | null
  attempt_count: number
  priority: number
  scheduled_at: string | null
  locked_by: string | null
  lock_expires_at: string | null
  last_heartbeat_at: string | null
  cancel_requested_at: string | null
  created_at: string
  updated_at: string
  product_name: string | null
  slug: string | null
}

type PipelineRunJob = {
  id: number
  stage: string
  status: string
  message: string | null
  payload_json: string | null
  started_at: string | null
  finished_at: string | null
}

type PipelineRunDetail = PipelineRun & {
  jobs: PipelineRunJob[]
}

type PipelineOperations = {
  runtime: {
    enabled: boolean
    pollMs: number
    concurrency: number
  }
  workers: Array<{
    worker_id: string
    worker_type: string
    hostname: string | null
    pid: number | null
    status: string
    current_run_id: number | null
    last_seen_at: string
    started_at: string
    metadata_json: string | null
  }>
  queues: Array<{
    task_type: string
    enabled: number
    priority: number
    max_concurrency: number
    timeout_seconds: number
    max_attempts: number
    queued: number
    running: number
    failed: number
  }>
  staleRunningCount: number
  expiredLockCount: number
}

function formatDate(value: string | null) {
  if (!value) return 'N/A'
  return new Date(value).toLocaleString()
}

export function PipelineRunsConsole() {
  const [runs, setRuns] = useState<PipelineRun[]>([])
  const [operations, setOperations] = useState<PipelineOperations | null>(null)
  const [selectedRunId, setSelectedRunId] = useState<number | null>(null)
  const [selectedRun, setSelectedRun] = useState<PipelineRunDetail | null>(null)
  const [isPending, startTransition] = useTransition()

  const loadRunDetail = async (runId: number) => {
    const response = await fetch(`/api/admin/pipeline-runs/${runId}`)
    if (!response.ok) {
      setSelectedRun(null)
      return
    }
    setSelectedRun((await response.json()) as PipelineRunDetail)
  }

  const loadRuns = async (preferredRunId?: number | null) => {
    const [runsResponse, opsResponse] = await Promise.all([
      fetch('/api/admin/pipeline-runs'),
      fetch('/api/admin/pipeline-ops')
    ])
    const body = (await runsResponse.json()) as PipelineRun[]
    setRuns(body)
    if (opsResponse.ok) {
      setOperations((await opsResponse.json()) as PipelineOperations)
    }
    const nextRunId =
      preferredRunId && body.some((item) => item.id === preferredRunId)
        ? preferredRunId
        : body[0]?.id || null
    setSelectedRunId(nextRunId)
    if (nextRunId) {
      await loadRunDetail(nextRunId)
      return
    }
    setSelectedRun(null)
  }

  useEffect(() => {
    void (async () => {
      await loadRuns()
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!selectedRunId || selectedRun) return
    void (async () => {
      const body = runs
      if (body[0]?.id) {
        setSelectedRunId(body[0].id)
        const detailResponse = await fetch(`/api/admin/pipeline-runs/${body[0].id}`)
        if (detailResponse.ok) {
          setSelectedRun((await detailResponse.json()) as PipelineRunDetail)
        }
      }
    })()
  }, [runs, selectedRun, selectedRunId])

  const hasActiveRuns = runs.some((run) => run.status === 'queued' || run.status === 'running')
  const canCancel = selectedRun ? ['queued', 'running'].includes(selectedRun.status) : false
  const canRetry = selectedRun
    ? selectedRun.status === 'failed' || (selectedRun.status === 'cancelled' && Boolean(selectedRun.finished_at))
    : false

  useEffect(() => {
    if (!hasActiveRuns) return
    const intervalId = window.setInterval(() => {
      startTransition(async () => {
        await loadRuns(selectedRunId)
      })
    }, 4000)
    return () => window.clearInterval(intervalId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasActiveRuns, selectedRunId])

  const triggerRunAction = (path: string, successMessage: string) => {
    startTransition(async () => {
      const response = await fetch(path, { method: 'POST' })
      const body = await response.json().catch(() => ({}))
      if (!response.ok) {
        toast.error(body.error || 'Run action failed')
        return
      }
      await loadRuns(body.runId || selectedRunId)
      toast.success(successMessage)
    })
  }

  return (
    <div className="space-y-6 p-6 lg:p-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.28em] text-primary">Pipeline Runs</p>
          <h1 className="mt-2 font-[var(--font-display)] text-4xl font-semibold tracking-tight">Execution history with job-level trace</h1>
        </div>
        <Button
          variant="outline"
          disabled={isPending}
          onClick={() => {
            startTransition(async () => {
              await loadRuns(selectedRunId)
            })
          }}
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh Runs
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-4">
        <div className="min-w-0 rounded-2xl border border-border bg-white p-5 shadow-panel">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Worker</p>
            <ServerCog className="h-4 w-4 text-primary" />
          </div>
          <p className="mt-3 text-2xl font-semibold">{operations?.runtime.enabled ? 'Enabled' : 'Disabled'}</p>
          <p className="mt-1 text-sm text-muted-foreground">{operations?.workers.length || 0} heartbeat rows</p>
        </div>
        <div className="min-w-0 rounded-2xl border border-border bg-white p-5 shadow-panel">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Concurrency</p>
            <Activity className="h-4 w-4 text-primary" />
          </div>
          <p className="mt-3 text-2xl font-semibold">{operations?.runtime.concurrency ?? '-'}</p>
          <p className="mt-1 text-sm text-muted-foreground">poll {operations?.runtime.pollMs ?? '-'}ms</p>
        </div>
        <div className="min-w-0 rounded-2xl border border-border bg-white p-5 shadow-panel">
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Stale Runs</p>
          <p className="mt-3 text-2xl font-semibold">{operations?.staleRunningCount ?? 0}</p>
          <p className="mt-1 text-sm text-muted-foreground">heartbeat timeout</p>
        </div>
        <div className="min-w-0 rounded-2xl border border-border bg-white p-5 shadow-panel">
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Expired Locks</p>
          <p className="mt-3 text-2xl font-semibold">{operations?.expiredLockCount ?? 0}</p>
          <p className="mt-1 text-sm text-muted-foreground">recoverable on next tick</p>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="min-w-0 rounded-[24px] border border-border bg-white p-6 shadow-panel">
          <p className="font-semibold">Queue policy</p>
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-border text-xs uppercase tracking-[0.16em] text-muted-foreground">
                <tr>
                  <th className="pb-3 pr-3">Type</th>
                  <th className="pb-3 pr-3">State</th>
                  <th className="pb-3 pr-3">Queued</th>
                  <th className="pb-3 pr-3">Running</th>
                  <th className="pb-3 pr-3">Attempts</th>
                </tr>
              </thead>
              <tbody>
                {(operations?.queues || []).map((queue) => (
                  <tr key={queue.task_type} className="border-b border-border/70">
                    <td className="py-3 pr-3 font-medium">{queue.task_type}</td>
                    <td className="py-3 pr-3"><StatusBadge value={queue.enabled ? 'enabled' : 'disabled'} /></td>
                    <td className="py-3 pr-3 text-muted-foreground">{queue.queued}</td>
                    <td className="py-3 pr-3 text-muted-foreground">{queue.running}</td>
                    <td className="py-3 pr-3 text-muted-foreground">{queue.max_attempts}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="min-w-0 rounded-[24px] border border-border bg-white p-6 shadow-panel">
          <p className="font-semibold">Worker heartbeats</p>
          <div className="mt-4 space-y-3">
            {(operations?.workers || []).slice(0, 5).map((worker) => (
              <div key={worker.worker_id} className="rounded-2xl border border-border p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{worker.worker_id}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{worker.hostname || 'unknown host'} · pid {worker.pid || 'N/A'}</p>
                  </div>
                  <StatusBadge value={worker.status} />
                </div>
                <p className="mt-2 text-xs text-muted-foreground">Last seen {formatDate(worker.last_seen_at)}</p>
              </div>
            ))}
            {operations && operations.workers.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border p-5 text-sm text-muted-foreground">
                No worker heartbeat has been recorded yet.
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
        <div className="min-w-0 rounded-[32px] border border-border bg-white p-8 shadow-panel">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-border text-xs uppercase tracking-[0.18em] text-muted-foreground">
                <tr>
                  <th className="pb-3 pr-3">Run</th>
                  <th className="pb-3 pr-3">Stage</th>
                  <th className="pb-3 pr-3">Status</th>
                  <th className="pb-3 pr-3">Updated</th>
                </tr>
              </thead>
              <tbody>
                {runs.map((run) => (
                  <tr
                    key={run.id}
                    className={cn(
                      'cursor-pointer border-b border-border/70 transition-colors hover:bg-[#f7f1e4]',
                      selectedRunId === run.id ? 'bg-[#f7f1e4]' : ''
                    )}
                    onClick={() => {
                      setSelectedRunId(run.id)
                      void loadRunDetail(run.id)
                    }}
                  >
                    <td className="py-4 pr-3">
                      <div className="font-medium">{run.product_name || run.source_link}</div>
                      <div className="text-muted-foreground">Run #{run.id} · {run.run_type === 'workspaceAction' ? (run.requested_action || 'workspace action') : 'full pipeline'}</div>
                    </td>
                    <td className="py-4 pr-3 text-muted-foreground">{run.current_stage || '-'}</td>
                    <td className="py-4 pr-3">
                      <StatusBadge value={run.status} />
                    </td>
                    <td className="py-4 pr-3 text-muted-foreground">{formatDate(run.updated_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="min-w-0 rounded-[32px] border border-border bg-white p-8 shadow-panel">
          {selectedRun ? (
            <div className="space-y-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="font-mono text-xs uppercase tracking-[0.24em] text-primary">Selected Run</p>
                  <h2 className="mt-2 font-[var(--font-display)] text-3xl font-semibold tracking-tight">
                    {selectedRun.product_name || `Run #${selectedRun.id}`}
                  </h2>
                  <p className="mt-2 text-sm text-muted-foreground">Created {formatDate(selectedRun.created_at)}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {selectedRun.run_type === 'workspaceAction'
                      ? `Queued workspace action: ${selectedRun.requested_action || 'unknown'}`
                      : 'Queued full pipeline run'}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <StatusBadge value={selectedRun.status} />
                  {selectedRun.current_stage ? <StatusBadge value={selectedRun.current_stage} /> : null}
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                {selectedRun.product_id ? (
                  <Link
                    href={`/admin/products/${selectedRun.product_id}`}
                    className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'rounded-full')}
                  >
                    Open Workspace
                  </Link>
                ) : null}
                <Link
                  href={selectedRun.source_link}
                  target="_blank"
                  className={cn(buttonVariants({ variant: 'secondary', size: 'sm' }), 'rounded-full')}
                >
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Open Source Link
                </Link>
                {canCancel ? (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={isPending}
                    onClick={() => triggerRunAction(`/api/admin/pipeline-runs/${selectedRun.id}/cancel`, 'Pipeline cancellation requested')}
                  >
                    <XCircle className="mr-2 h-4 w-4" />
                    Cancel Run
                  </Button>
                ) : null}
                {canRetry ? (
                  <Button
                    size="sm"
                    disabled={isPending}
                    onClick={() => triggerRunAction(`/api/admin/pipeline-runs/${selectedRun.id}/retry`, 'Pipeline retry queued')}
                  >
                    <RotateCcw className="mr-2 h-4 w-4" />
                    Retry Run
                  </Button>
                ) : null}
              </div>

              {selectedRun.error_message ? (
                <div className="rounded-[24px] border border-rose-200 bg-rose-50 p-5 text-sm text-rose-800">
                  {selectedRun.error_message}
                </div>
              ) : null}

              <div className="rounded-[24px] border border-border p-5">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Run Meta</p>
                <div className="mt-4 space-y-3 text-sm">
                  <div className="flex items-start justify-between gap-4">
                    <span className="text-muted-foreground">Updated</span>
                    <span className="text-right font-medium">{formatDate(selectedRun.updated_at)}</span>
                  </div>
                  <div className="flex items-start justify-between gap-4">
                    <span className="text-muted-foreground">Started</span>
                    <span className="text-right font-medium">{formatDate(selectedRun.started_at)}</span>
                  </div>
                  <div className="flex items-start justify-between gap-4">
                    <span className="text-muted-foreground">Finished</span>
                    <span className="text-right font-medium">{formatDate(selectedRun.finished_at)}</span>
                  </div>
                  <div className="flex items-start justify-between gap-4">
                    <span className="text-muted-foreground">Attempts</span>
                    <span className="text-right font-medium">{selectedRun.attempt_count}</span>
                  </div>
                  <div className="flex items-start justify-between gap-4">
                    <span className="text-muted-foreground">Worker</span>
                    <span className="text-right font-medium">{selectedRun.locked_by || selectedRun.worker_id || 'N/A'}</span>
                  </div>
                  <div className="flex items-start justify-between gap-4">
                    <span className="text-muted-foreground">Lock Expires</span>
                    <span className="text-right font-medium">{formatDate(selectedRun.lock_expires_at)}</span>
                  </div>
                  <div className="flex items-start justify-between gap-4">
                    <span className="text-muted-foreground">Heartbeat</span>
                    <span className="text-right font-medium">{formatDate(selectedRun.last_heartbeat_at)}</span>
                  </div>
                  <div className="flex items-start justify-between gap-4">
                    <span className="text-muted-foreground">Affiliate Product</span>
                    <span className="text-right font-medium">{selectedRun.affiliate_product_id || 'N/A'}</span>
                  </div>
                  <div className="flex items-start justify-between gap-4">
                    <span className="text-muted-foreground">Product Slug</span>
                    <span className="text-right font-medium">{selectedRun.slug || 'N/A'}</span>
                  </div>
                </div>
              </div>

              <div>
                <div className="mb-4 flex items-center gap-3">
                  <TerminalSquare className="h-5 w-5 text-primary" />
                  <p className="font-semibold">Job timeline</p>
                </div>
                <div className="space-y-4">
                  {selectedRun.jobs.map((job) => (
                    <div key={job.id} className="rounded-[24px] border border-border p-5">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="font-medium">{job.stage}</p>
                          <p className="mt-1 text-sm text-muted-foreground">{job.message || 'No job note captured'}</p>
                        </div>
                        <StatusBadge value={job.status} />
                      </div>
                      <p className="mt-3 text-xs text-muted-foreground">
                        {formatDate(job.started_at)} to {formatDate(job.finished_at)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex min-h-[320px] items-center justify-center rounded-[24px] border border-dashed border-border text-sm text-muted-foreground">
              No pipeline run selected.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
