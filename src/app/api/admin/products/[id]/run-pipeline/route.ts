import { NextResponse } from 'next/server'
import { requireAdminPermission } from '@/lib/auth'
import { logAdminAudit } from '@/lib/admin-governance'
import { getPipelineRun, runPipelineForAffiliateProduct } from '@/lib/pipeline'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const actor = await requireAdminPermission('pipeline:write')
  const { id } = await params
  const runId = await runPipelineForAffiliateProduct(Number(id))
  const payload = await getPipelineRun(runId)
  await logAdminAudit({
    actor,
    request,
    action: 'product_pipeline_queued',
    entityType: 'content_pipeline_runs',
    entityId: runId,
    after: { productId: payload?.product_id || Number(id), runId, status: payload?.status || 'queued' }
  })
  return NextResponse.json({
    success: true,
    queued: true,
    runId,
    productId: payload?.product_id || null,
    status: payload?.status || 'queued'
  })
}
