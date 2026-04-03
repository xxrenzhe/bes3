import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { cancelPipelineRun, getPipelineRun } from '@/lib/pipeline'

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  await requireAdmin()
  const runId = Number((await params).id)
  await cancelPipelineRun(runId)
  const run = await getPipelineRun(runId)
  return NextResponse.json({ success: true, runId, status: run?.status || 'cancelled' })
}
