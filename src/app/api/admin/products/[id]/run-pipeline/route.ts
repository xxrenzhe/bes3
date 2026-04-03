import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { runPipelineForAffiliateProduct } from '@/lib/pipeline'

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  await requireAdmin()
  const { id } = await params
  const runId = await runPipelineForAffiliateProduct(Number(id))
  return NextResponse.json({ success: true, runId })
}
