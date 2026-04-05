import { NextResponse } from 'next/server'
import { COMMERCE_PROTOCOL_VERSION, serializeBrandKnowledge, serializeCommerceArticle, serializeCommerceProduct } from '@/lib/open-commerce'
import {
  getBrandSlug,
  getBrandBySlug,
  getBrandKnowledgeByProduct,
  getBrandPolicyBySlug,
  listBrandCompatibilityFacts,
  listOpenCommerceProducts,
  listProductAttributeFacts,
  listProductPriceHistory,
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
  const productResults = await Promise.all(
    brandProducts.map(async (product) => {
      const [attributeFacts, priceHistory, brandKnowledge] = await Promise.all([
        listProductAttributeFacts(product.id, 12),
        listProductPriceHistory(product.id, 12),
        getBrandKnowledgeByProduct({
          brandName: product.brand,
          category: product.category,
          compatibilityLimit: 6
        })
      ])

      return serializeCommerceProduct(product, {
        attributeFacts,
        priceHistory,
        brandPolicy: brandKnowledge.brandPolicy,
        compatibilityFacts: brandKnowledge.compatibilityFacts,
        source: 'open-commerce-brand'
      })
    })
  )

  return NextResponse.json({
    protocolVersion: COMMERCE_PROTOCOL_VERSION,
    generatedAt: new Date().toISOString(),
    brand,
    brandKnowledge: serializeBrandKnowledge(brand.name, policy, compatibilityFacts),
    products: productResults,
    articles: brandArticles.map(serializeCommerceArticle)
  })
}
