import { NextResponse } from 'next/server'
import { getHardcoreProductBySlug } from '@/lib/hardcore'
import { upsertPriceAlert } from '@/lib/hardcore-ops'

export const dynamic = 'force-dynamic'

function parseNumber(value: unknown) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}))
  const productId = Number(body.productId)
  const productSlug = String(body.productSlug || '').trim()
  const email = String(body.email || '').trim().toLowerCase()

  if (!email || !email.includes('@')) {
    return NextResponse.json({ error: 'valid_email_required' }, { status: 400 })
  }

  let resolvedProductId = Number.isFinite(productId) && productId > 0 ? productId : null
  if (!resolvedProductId && productSlug) {
    const product = await getHardcoreProductBySlug(productSlug)
    resolvedProductId = product?.id || null
  }

  if (!resolvedProductId) {
    return NextResponse.json({ error: 'valid_product_required' }, { status: 400 })
  }

  const alert = await upsertPriceAlert({
    productId: resolvedProductId,
    email,
    targetPrice: parseNumber(body.targetPrice),
    targetValueScore: parseNumber(body.targetValueScore)
  })

  return NextResponse.json({
    success: true,
    status: alert.status,
    productId: resolvedProductId
  })
}
