import { NextResponse } from 'next/server'
import { COMMERCE_PROTOCOL_VERSION, serializeCommerceArticle, serializeCommerceProduct } from '@/lib/open-commerce'
import { listOpenCommerceProducts, listPublishedArticles } from '@/lib/site-data'

export async function GET() {
  const [products, articles] = await Promise.all([listOpenCommerceProducts(), listPublishedArticles()])

  return NextResponse.json({
    protocolVersion: COMMERCE_PROTOCOL_VERSION,
    generatedAt: new Date().toISOString(),
    feedType: 'commerce-feed',
    products: products.slice(0, 24).map((product) =>
      serializeCommerceProduct(product, {
        source: 'open-buying-feed'
      })
    ),
    articles: articles.slice(0, 24).map(serializeCommerceArticle)
  })
}
