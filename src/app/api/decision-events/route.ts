import { NextResponse } from 'next/server'
import { isDecisionEventType } from '@/lib/decision-event-types'
import { recordDecisionEvent } from '@/lib/decision-events'
import { normalizeMerchantSource } from '@/lib/merchant-links'

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}))
  const eventType = String(body.eventType || '').trim()
  const visitorId = String(body.visitorId || '').trim()
  const source = normalizeMerchantSource(String(body.source || 'site'))
  const productId = Number(body.productId)
  const metadata =
    body.metadata && typeof body.metadata === 'object' && !Array.isArray(body.metadata)
      ? (body.metadata as Record<string, unknown>)
      : null

  if (!isDecisionEventType(eventType)) {
    return NextResponse.json({ error: 'Valid eventType is required' }, { status: 400 })
  }

  if (!visitorId) {
    return NextResponse.json({ error: 'visitorId is required' }, { status: 400 })
  }

  await recordDecisionEvent({
    visitorId,
    eventType,
    source,
    productId: Number.isInteger(productId) && productId > 0 ? productId : null,
    metadata,
    referer: request.headers.get('referer'),
    userAgent: request.headers.get('user-agent')
  })

  return NextResponse.json({ success: true })
}
