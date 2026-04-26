import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { logAdminAudit } from '@/lib/admin-governance'
import { getPipelineRun, retryPipelineRun } from '@/lib/pipeline'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const actor = await requireAdmin()
  const runId = Number((await params).id)
  const before = await getPipelineRun(runId)
  const nextRunId = await retryPipelineRun(runId)
  const run = await getPipelineRun(nextRunId)
  await logAdminAudit({
    actor,
    request,
    action: 'pipeline_run_retried',
    entityType: 'content_pipeline_runs',
    entityId: runId,
    before,
    after: { nextRunId, status: run?.status || 'queued' }
  })
  return NextResponse.json({ success: true, runId: nextRunId, status: run?.status || 'queued' })
}
