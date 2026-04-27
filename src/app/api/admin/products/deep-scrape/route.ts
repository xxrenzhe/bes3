import { NextResponse } from 'next/server'
import { requireAdminPermission } from '@/lib/auth'
import { logAdminAudit } from '@/lib/admin-governance'
import { getPipelineRun, runDeepProductScrapeFromLink } from '@/lib/pipeline'
import { normalizeProductAcquisitionHints } from '@/lib/product-acquisition'

export async function POST(request: Request) {
  const actor = await requireAdminPermission('pipeline:write')
  const body = await request.json().catch(() => ({}))
  const link = String(body.link || '').trim()
  if (!link) {
    return NextResponse.json({ error: 'Affiliate link is required' }, { status: 400 })
  }

  const hints = normalizeProductAcquisitionHints(body)
  const runId = await runDeepProductScrapeFromLink(link, hints)
  const payload = await getPipelineRun(runId)
  await logAdminAudit({
    actor,
    request,
    action: 'product_deep_scrape_queued',
    entityType: 'content_pipeline_runs',
    entityId: runId,
    after: { link, hints, productId: payload?.product_id || null, runId, status: payload?.status || 'queued' }
  })

  return NextResponse.json({
    success: true,
    queued: true,
    runId,
    productId: payload?.product_id || null,
    status: payload?.status || 'queued'
  })
}
