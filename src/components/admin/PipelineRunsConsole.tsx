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
    <div className="space-y-4 p-4 sm:p-5 lg:p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-primary">流水线</p>
          <h1 className="mt-1 font-[var(--font-display)] text-2xl font-semibold tracking-tight">任务执行历史与 Job 级追踪</h1>
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
          刷新任务
        </Button>
      </div>

      <div className="grid gap-3 lg:grid-cols-4">
        <div className="min-w-0 rounded-2xl border border-border bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Worker</p>
            <ServerCog className="h-4 w-4 text-primary" />
          </div>
          <p className="mt-1.5 text-2xl font-semibold">{operations?.runtime.enabled ? '已启用' : '已停用'}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{operations?.workers.length || 0} 条心跳记录</p>
        </div>
        <div className="min-w-0 rounded-2xl border border-border bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">并发数</p>
            <Activity className="h-4 w-4 text-primary" />
          </div>
          <p className="mt-1.5 text-2xl font-semibold">{operations?.runtime.concurrency ?? '-'}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">轮询 {operations?.runtime.pollMs ?? '-'}ms</p>
        </div>
        <div className="min-w-0 rounded-2xl border border-border bg-white p-4 shadow-sm">
          <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">过期任务</p>
          <p className="mt-1.5 text-2xl font-semibold">{operations?.staleRunningCount ?? 0}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">心跳超时</p>
        </div>
        <div className="min-w-0 rounded-2xl border border-border bg-white p-4 shadow-sm">
          <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">过期锁</p>
          <p className="mt-1.5 text-2xl font-semibold">{operations?.expiredLockCount ?? 0}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">下次轮询可恢复</p>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <div className="min-w-0 rounded-2xl border border-border bg-white p-4 shadow-sm">
          <p className="font-semibold">队列策略</p>
          <div className="mt-3 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-border text-xs uppercase tracking-[0.14em] text-muted-foreground">
                <tr>
                  <th className="pb-2 pr-3">类型</th>
                  <th className="pb-2 pr-3">状态</th>
                  <th className="pb-2 pr-3">排队</th>
                  <th className="pb-2 pr-3">运行中</th>
                  <th className="pb-2 pr-3">尝试次数</th>
                </tr>
              </thead>
              <tbody>
                {(operations?.queues || []).map((queue) => (
                  <tr key={queue.task_type} className="border-b border-border/70">
                    <td className="py-2 pr-3 font-medium">{queue.task_type}</td>
                    <td className="py-2 pr-3"><StatusBadge value={queue.enabled ? 'enabled' : 'disabled'} /></td>
                    <td className="py-2 pr-3 text-muted-foreground">{queue.queued}</td>
                    <td className="py-2 pr-3 text-muted-foreground">{queue.running}</td>
                    <td className="py-2 pr-3 text-muted-foreground">{queue.max_attempts}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="min-w-0 rounded-2xl border border-border bg-white p-4 shadow-sm">
          <p className="font-semibold">Worker 心跳</p>
          <div className="mt-3 space-y-2">
            {(operations?.workers || []).slice(0, 5).map((worker) => (
              <div key={worker.worker_id} className="rounded-xl border border-border p-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{worker.worker_id}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{worker.hostname || '未知主机'} · pid {worker.pid || '暂无'}</p>
                  </div>
                  <StatusBadge value={worker.status} />
                </div>
                <p className="mt-1.5 text-xs text-muted-foreground">最后出现 {formatDate(worker.last_seen_at)}</p>
              </div>
            ))}
            {operations && operations.workers.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
                暂无 Worker 心跳记录。
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.08fr_0.92fr]">
        <div className="min-w-0 rounded-2xl border border-border bg-white p-4 shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-border text-xs uppercase tracking-[0.14em] text-muted-foreground">
                <tr>
                  <th className="pb-2 pr-3">任务</th>
                  <th className="pb-2 pr-3">阶段</th>
                  <th className="pb-2 pr-3">状态</th>
                  <th className="pb-2 pr-3">更新时间</th>
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
                    <td className="py-2.5 pr-3">
                      <div className="font-medium">{run.product_name || run.source_link}</div>
                      <div className="text-xs text-muted-foreground">任务 #{run.id} · {run.run_type === 'workspaceAction' ? (run.requested_action || '工作台动作') : '完整流水线'}</div>
                    </td>
                    <td className="py-2.5 pr-3 text-muted-foreground">{run.current_stage || '-'}</td>
                    <td className="py-2.5 pr-3">
                      <StatusBadge value={run.status} />
                    </td>
                    <td className="py-2.5 pr-3 text-muted-foreground">{formatDate(run.updated_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="min-w-0 rounded-2xl border border-border bg-white p-4 shadow-sm">
          {selectedRun ? (
            <div className="space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-primary">当前任务</p>
                  <h2 className="mt-1 font-[var(--font-display)] text-2xl font-semibold tracking-tight">
                    {selectedRun.product_name || `任务 #${selectedRun.id}`}
                  </h2>
                  <p className="mt-1.5 text-xs text-muted-foreground">创建时间 {formatDate(selectedRun.created_at)}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {selectedRun.run_type === 'workspaceAction'
                      ? `已排队工作台动作：${selectedRun.requested_action || '未知'}`
                      : '已排队完整流水线'}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <StatusBadge value={selectedRun.status} />
                  {selectedRun.current_stage ? <StatusBadge value={selectedRun.current_stage} /> : null}
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {selectedRun.product_id ? (
                  <Link
                    href={`/admin/products/${selectedRun.product_id}`}
                    className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'rounded-full')}
                  >
                    打开工作台
                  </Link>
                ) : null}
                <Link
                  href={selectedRun.source_link}
                  target="_blank"
                  className={cn(buttonVariants({ variant: 'secondary', size: 'sm' }), 'rounded-full')}
                >
                  <ExternalLink className="mr-2 h-4 w-4" />
                  打开来源链接
                </Link>
                {canCancel ? (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={isPending}
                    onClick={() => triggerRunAction(`/api/admin/pipeline-runs/${selectedRun.id}/cancel`, '已请求取消流水线')}
                  >
                    <XCircle className="mr-2 h-4 w-4" />
                    取消任务
                  </Button>
                ) : null}
                {canRetry ? (
                  <Button
                    size="sm"
                    disabled={isPending}
                    onClick={() => triggerRunAction(`/api/admin/pipeline-runs/${selectedRun.id}/retry`, '流水线重试已排队')}
                  >
                    <RotateCcw className="mr-2 h-4 w-4" />
                    重试任务
                  </Button>
                ) : null}
              </div>

              {selectedRun.error_message ? (
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
                  {selectedRun.error_message}
                </div>
              ) : null}

              <div className="rounded-xl border border-border p-4">
                <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">任务元数据</p>
                <div className="mt-3 space-y-2 text-sm">
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-muted-foreground">更新时间</span>
                    <span className="text-right font-medium">{formatDate(selectedRun.updated_at)}</span>
                  </div>
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-muted-foreground">开始时间</span>
                    <span className="text-right font-medium">{formatDate(selectedRun.started_at)}</span>
                  </div>
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-muted-foreground">结束时间</span>
                    <span className="text-right font-medium">{formatDate(selectedRun.finished_at)}</span>
                  </div>
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-muted-foreground">尝试次数</span>
                    <span className="text-right font-medium">{selectedRun.attempt_count}</span>
                  </div>
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-muted-foreground">Worker</span>
                    <span className="text-right font-medium">{selectedRun.locked_by || selectedRun.worker_id || 'N/A'}</span>
                  </div>
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-muted-foreground">锁过期</span>
                    <span className="text-right font-medium">{formatDate(selectedRun.lock_expires_at)}</span>
                  </div>
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-muted-foreground">心跳</span>
                    <span className="text-right font-medium">{formatDate(selectedRun.last_heartbeat_at)}</span>
                  </div>
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-muted-foreground">联盟商品</span>
                    <span className="text-right font-medium">{selectedRun.affiliate_product_id || 'N/A'}</span>
                  </div>
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-muted-foreground">商品 Slug</span>
                    <span className="text-right font-medium">{selectedRun.slug || 'N/A'}</span>
                  </div>
                </div>
              </div>

              <div>
                <div className="mb-3 flex items-center gap-2">
                  <TerminalSquare className="h-4 w-4 text-primary" />
                  <p className="font-semibold">Job 时间线</p>
                </div>
                <div className="space-y-2">
                  {selectedRun.jobs.map((job) => (
                    <div key={job.id} className="rounded-xl border border-border p-3">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="font-medium">{job.stage}</p>
                          <p className="mt-0.5 text-xs text-muted-foreground">{job.message || '暂无 Job 备注'}</p>
                        </div>
                        <StatusBadge value={job.status} />
                      </div>
                      <p className="mt-2 text-xs text-muted-foreground">
                        {formatDate(job.started_at)} 至 {formatDate(job.finished_at)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex min-h-[220px] items-center justify-center rounded-xl border border-dashed border-border text-sm text-muted-foreground">
              未选择流水线任务。
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
