import { NextResponse } from 'next/server'
import { COMMERCE_PROTOCOL_VERSION, serializeBrandKnowledge, serializeCommerceArticle, serializeCommerceProduct } from '@/lib/open-commerce'
import {
  getBrandSlug,
  getBrandBySlug,
  getBrandPolicyBySlug,
  listBrandCompatibilityFacts,
  listOpenCommerceProducts,
  listPublishedArticles
} from '@/lib/site-data'

export async function GET(
  _request: Request,
  context: { params: Promise<{ slug: string }> }
) {
  const slug = (await context.params).slug
  if (!slug.trim()) {
    return NextResponse.json({ error: 'Invalid brand slug' }, { status: 400 })
  }

  const [brand, policy, compatibilityFacts, products, articles] = await Promise.all([
    getBrandBySlug(slug),
    getBrandPolicyBySlug(slug),
    listBrandCompatibilityFacts(slug, { limit: 8 }),
    listOpenCommerceProducts(),
    listPublishedArticles()
  ])

  if (!brand) {
    return NextResponse.json({ error: 'Brand not found' }, { status: 404 })
  }

  const brandProducts = products
    .filter((product) => getBrandSlug(product.brand) === slug)
    .slice(0, 8)
  const brandArticles = articles
    .filter((article) => getBrandSlug(article.product?.brand) === slug)
    .slice(0, 8)

  return NextResponse.json({
    protocolVersion: COMMERCE_PROTOCOL_VERSION,
    generatedAt: new Date().toISOString(),
    brand,
    brandKnowledge: serializeBrandKnowledge(brand.name, policy, compatibilityFacts),
    products: brandProducts.map((product) =>
      serializeCommerceProduct(product, {
        source: 'open-commerce-brand'
      })
    ),
    articles: brandArticles.map(serializeCommerceArticle)
  })
}
