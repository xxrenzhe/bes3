import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { getPipelineRun } from '@/lib/pipeline'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  await requireAdmin()
  return NextResponse.json(await getPipelineRun(Number((await params).id)))
}
