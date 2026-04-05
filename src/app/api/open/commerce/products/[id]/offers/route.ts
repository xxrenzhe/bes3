import { NextResponse } from 'next/server'
import { COMMERCE_PROTOCOL_VERSION, buildCommerceDisclaimers, buildCommerceActions } from '@/lib/open-commerce'
import { getOpenCommerceProductById, listProductOffers } from '@/lib/site-data'

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const productId = Number.parseInt((await context.params).id, 10)
  if (!Number.isInteger(productId) || productId <= 0) {
    return NextResponse.json({ error: 'Invalid product id' }, { status: 400 })
  }

  const product = await getOpenCommerceProductById(productId)
  if (!product) {
    return NextResponse.json({ error: 'Product not found' }, { status: 404 })
  }

  const offers = await listProductOffers(productId)
  const bestOffer = product.bestOffer || offers[0] || null
  const alternativeOffers = offers.filter((offer) => !bestOffer || offer.id !== bestOffer.id).slice(0, 3)

  return NextResponse.json({
    protocolVersion: COMMERCE_PROTOCOL_VERSION,
    generatedAt: new Date().toISOString(),
    productId,
    bestOffer,
    alternativeOffers,
    total: offers.length,
    offers,
    actions: buildCommerceActions(product, {
      source: 'open-commerce-offers'
    }),
    disclaimers: buildCommerceDisclaimers(product)
  })
}
