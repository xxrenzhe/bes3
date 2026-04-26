import { NextResponse } from 'next/server'
import { requireAdminPermission } from '@/lib/auth'
import { logAdminAudit } from '@/lib/admin-governance'
import { cancelPipelineRun, getPipelineRun } from '@/lib/pipeline'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const actor = await requireAdminPermission('pipeline:write')
  const runId = Number((await params).id)
  const before = await getPipelineRun(runId)
  await cancelPipelineRun(runId)
  const run = await getPipelineRun(runId)
  await logAdminAudit({
    actor,
    request,
    action: 'pipeline_run_cancelled',
    entityType: 'content_pipeline_runs',
    entityId: runId,
    before,
    after: run
  })
  return NextResponse.json({ success: true, runId, status: run?.status || 'cancelled' })
}
