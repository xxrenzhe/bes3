import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { getPipelineRun } from '@/lib/pipeline'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  await requireAdmin()
  const run = await getPipelineRun(Number((await params).id))
  if (!run) {
    return NextResponse.json({ error: 'Pipeline run not found' }, { status: 404 })
  }
  return NextResponse.json(run)
}
