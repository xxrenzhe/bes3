import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { getPipelineRun, retryPipelineRun } from '@/lib/pipeline'

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  await requireAdmin()
  const runId = Number((await params).id)
  const nextRunId = await retryPipelineRun(runId)
  const run = await getPipelineRun(nextRunId)
  return NextResponse.json({ success: true, runId: nextRunId, status: run?.status || 'queued' })
}
