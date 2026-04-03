import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { getPipelineRun, runPipelineForAffiliateProduct } from '@/lib/pipeline'

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  await requireAdmin()
  const { id } = await params
  const runId = await runPipelineForAffiliateProduct(Number(id))
  const payload = await getPipelineRun(runId)
  return NextResponse.json({ success: true, runId, productId: payload.run?.product_id || null })
}
