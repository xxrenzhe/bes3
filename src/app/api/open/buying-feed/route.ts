import { NextResponse } from 'next/server'
import { COMMERCE_PROTOCOL_VERSION, serializeCommerceArticle, serializeCommerceProduct } from '@/lib/open-commerce'
import { getBrandKnowledgeByProduct, listOpenCommerceProducts, listProductAttributeFacts, listProductPriceHistory, listPublishedArticles } from '@/lib/site-data'

export async function GET() {
  const [products, articles] = await Promise.all([listOpenCommerceProducts(), listPublishedArticles()])
  const enrichedProducts = await Promise.all(
    products.slice(0, 24).map(async (product) => {
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
        source: 'open-buying-feed'
      })
    })
  )

  return NextResponse.json({
    protocolVersion: COMMERCE_PROTOCOL_VERSION,
    generatedAt: new Date().toISOString(),
    feedType: 'commerce-feed-v2',
    totalProducts: enrichedProducts.length,
    totalArticles: Math.min(24, articles.length),
    products: enrichedProducts,
    articles: articles.slice(0, 24).map(serializeCommerceArticle)
  })
}
