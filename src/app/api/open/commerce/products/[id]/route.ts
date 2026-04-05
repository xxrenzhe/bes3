import { NextResponse } from 'next/server'
import { COMMERCE_PROTOCOL_VERSION, serializeCommerceProduct } from '@/lib/open-commerce'
import { getOpenCommerceProductById, listProductAttributeFacts } from '@/lib/site-data'

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

  const attributeFacts = await listProductAttributeFacts(productId)

  return NextResponse.json({
    protocolVersion: COMMERCE_PROTOCOL_VERSION,
    generatedAt: new Date().toISOString(),
    product,
    attributeFacts,
    result: serializeCommerceProduct(product, {
      attributeFacts,
      source: 'open-commerce-product'
    })
  })
}
