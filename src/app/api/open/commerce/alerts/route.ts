import { NextResponse } from 'next/server'
import { COMMERCE_PROTOCOL_VERSION, buildCommerceDisclaimers, buildCommerceActions } from '@/lib/open-commerce'
import { upsertNewsletterSubscriber } from '@/lib/newsletter'
import { getOpenCommerceProductById } from '@/lib/site-data'

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}))
  const email = String(body.email || '').trim().toLowerCase()

  if (!email || !email.includes('@')) {
    return NextResponse.json({ error: 'Valid email is required' }, { status: 400 })
  }

  const productId = Number.parseInt(String(body.productId || ''), 10)
  const product = Number.isInteger(productId) && productId > 0
    ? await getOpenCommerceProductById(productId)
    : null
  const categorySlug = String(body.categorySlug || body.category || product?.category || '').trim() || null

  const subscription = await upsertNewsletterSubscriber({
    email,
    source: body.source || 'open-commerce-alerts',
    intent: body.intent || 'price-alert',
    cadence: body.cadence || 'priority',
    categorySlug,
    notes: body.notes
  })

  return NextResponse.json({
    protocolVersion: COMMERCE_PROTOCOL_VERSION,
    generatedAt: new Date().toISOString(),
    success: true,
    subscription,
    productId: product?.id || null,
    productSlug: product?.slug || null,
    actions: product
      ? buildCommerceActions(product, {
          source: 'open-commerce-alerts',
          visitorId: typeof body.visitorId === 'string' ? body.visitorId : null
        })
      : [],
    disclaimers: buildCommerceDisclaimers(product)
  })
}
