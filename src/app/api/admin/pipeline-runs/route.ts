import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { listPipelineRuns } from '@/lib/pipeline'

export async function GET() {
  await requireAdmin()
  return NextResponse.json(await listPipelineRuns())
}
