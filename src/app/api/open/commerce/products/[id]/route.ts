import { NextResponse } from 'next/server'
import { COMMERCE_PROTOCOL_VERSION, serializeCommerceProduct } from '@/lib/open-commerce'
import {
  getBrandSlug,
  getBrandPolicyBySlug,
  getOpenCommerceProductById,
  listBrandCompatibilityFacts,
  listProductAttributeFacts
} from '@/lib/site-data'

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

  const brandSlug = getBrandSlug(product.brand)
  const [attributeFacts, brandPolicy, compatibilityFacts] = await Promise.all([
    listProductAttributeFacts(productId),
    brandSlug ? getBrandPolicyBySlug(brandSlug) : Promise.resolve(null),
    brandSlug ? listBrandCompatibilityFacts(brandSlug, { category: product.category || undefined, limit: 6 }) : Promise.resolve([])
  ])

  return NextResponse.json({
    protocolVersion: COMMERCE_PROTOCOL_VERSION,
    generatedAt: new Date().toISOString(),
    product,
    attributeFacts,
    brandPolicy,
    compatibilityFacts,
    result: serializeCommerceProduct(product, {
      attributeFacts,
      brandPolicy,
      compatibilityFacts,
      source: 'open-commerce-product'
    })
  })
}
