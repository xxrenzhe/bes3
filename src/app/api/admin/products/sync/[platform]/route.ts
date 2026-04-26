import { NextResponse } from 'next/server'
import { requireAdminPermission } from '@/lib/auth'
import { logAdminAudit } from '@/lib/admin-governance'
import { syncPartnerboostAmazonProducts, syncPartnerboostDtcProducts } from '@/lib/partnerboost'
import { batchRunPipelines } from '@/lib/pipeline'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ platform: string }> }
) {
  const actor = await requireAdminPermission('products:write')
  const { platform } = await params
  const body = (await request.json().catch(() => ({}))) as {
    queuePipeline?: unknown
    queueScope?: unknown
  }
  const queuePipeline = body.queuePipeline === true
  const queueScope = body.queueScope === 'createdOrUpdated' ? 'createdOrUpdated' : 'created'

  const withQueue = async (result: Awaited<ReturnType<typeof syncPartnerboostAmazonProducts>>) => {
    const queueIds =
      queueScope === 'createdOrUpdated'
        ? [...result.createdIds, ...result.updatedIds]
        : result.createdIds
    const uniqueQueueIds = [...new Set(queueIds)]
    const runIds = queuePipeline && uniqueQueueIds.length > 0 ? await batchRunPipelines(uniqueQueueIds) : []
    await logAdminAudit({
      actor,
      request,
      action: `partnerboost_${platform}_sync`,
      entityType: 'affiliate_products',
      after: {
        ...result,
        queuePipeline,
        queueScope,
        queuedAffiliateProductIds: uniqueQueueIds,
        queuedRunIds: runIds
      }
    })

    return NextResponse.json({
      ...result,
      queuePipeline,
      queueScope,
      queuedAffiliateProductIds: uniqueQueueIds,
      queuedRunIds: runIds,
      queued: runIds.length
    })
  }

  if (platform === 'amazon') {
    return withQueue(await syncPartnerboostAmazonProducts())
  }
  if (platform === 'dtc') {
    return withQueue(await syncPartnerboostDtcProducts())
  }

  return NextResponse.json({ error: 'Unsupported platform' }, { status: 400 })
}
