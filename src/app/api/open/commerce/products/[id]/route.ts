import { NextResponse } from 'next/server'
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
    generatedAt: new Date().toISOString(),
    product,
    attributeFacts
  })
}
