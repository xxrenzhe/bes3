import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { ensurePipelineWorker, listPipelineRuns } from '@/lib/pipeline'

export async function GET() {
  await requireAdmin()
  void ensurePipelineWorker()
  return NextResponse.json(await listPipelineRuns())
}
