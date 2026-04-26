import { NextResponse } from 'next/server'
import { requireAdminPermission } from '@/lib/auth'
import { logAdminAudit } from '@/lib/admin-governance'
import { batchRunPipelines } from '@/lib/pipeline'

export async function POST(request: Request) {
  const actor = await requireAdminPermission('pipeline:write')
  const body = (await request.json().catch(() => ({}))) as { ids?: unknown[] }
  const ids = Array.isArray(body.ids)
    ? body.ids
        .map((value: unknown) => Number(value))
        .filter((value: number): value is number => Number.isFinite(value))
    : []
  if (ids.length === 0) {
    return NextResponse.json({ error: 'At least one affiliate product id is required' }, { status: 400 })
  }

  const runIds = await batchRunPipelines(ids)
  await logAdminAudit({
    actor,
    request,
    action: 'product_pipeline_batch_queued',
    entityType: 'content_pipeline_runs',
    after: { affiliateProductIds: ids, runIds }
  })
  return NextResponse.json({ success: true, queued: true, runIds })
}
