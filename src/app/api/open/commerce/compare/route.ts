import { NextResponse } from 'next/server'
import {
  COMMERCE_PROTOCOL_VERSION,
  buildComparisonReason,
  buildCommerceDisclaimers,
  compareCommerceProducts,
  serializeCommerceProduct
} from '@/lib/open-commerce'
import {
  getOpenCommerceProductById,
  listProductAttributeFacts,
  listProductOffers
} from '@/lib/site-data'

function normalizeProductIds(value: unknown) {
  if (!Array.isArray(value)) return []

  return Array.from(
    new Set(
      value
        .map((item) => Number.parseInt(String(item), 10))
        .filter((item) => Number.isInteger(item) && item > 0)
    )
  ).slice(0, 4)
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}))
  const productIds = normalizeProductIds(body.productIds)

  if (productIds.length < 2) {
    return NextResponse.json({ error: 'At least two valid product ids are required' }, { status: 400 })
  }

  const compared = (
    await Promise.all(
      productIds.map(async (productId) => {
        const [product, offers, attributeFacts] = await Promise.all([
          getOpenCommerceProductById(productId),
          listProductOffers(productId),
          listProductAttributeFacts(productId, 12)
        ])

        if (!product) return null

        return {
          product,
          offers,
          attributeFacts,
          result: serializeCommerceProduct(product, {
            offers,
            attributeFacts,
            source: 'open-commerce-compare',
            visitorId: typeof body.visitorId === 'string' ? body.visitorId : null
          })
        }
      })
    )
  ).filter(Boolean) as Array<{
    product: NonNullable<Awaited<ReturnType<typeof getOpenCommerceProductById>>>
    offers: Awaited<ReturnType<typeof listProductOffers>>
    attributeFacts: Awaited<ReturnType<typeof listProductAttributeFacts>>
    result: ReturnType<typeof serializeCommerceProduct>
  }>

  if (compared.length < 2) {
    return NextResponse.json({ error: 'Not enough products were found to compare' }, { status: 404 })
  }

  const ranked = [...compared].sort((left, right) => compareCommerceProducts(left.product, right.product))
  const winner = ranked[0]
  const runnerUp = ranked[1] || null

  return NextResponse.json({
    protocolVersion: COMMERCE_PROTOCOL_VERSION,
    generatedAt: new Date().toISOString(),
    requestedProductIds: productIds,
    comparedProductIds: ranked.map((entry) => entry.product.id),
    recommendedProductId: winner.product.id,
    comparisonReason: buildComparisonReason(winner.product, runnerUp?.product || null),
    winner: winner.result,
    contenders: ranked.map((entry) => entry.result),
    matrix: ranked.map((entry) => ({
      productId: entry.product.id,
      productName: entry.product.productName,
      brand: entry.product.brand,
      priceAmount: entry.product.bestOffer?.priceAmount ?? entry.product.priceAmount,
      priceCurrency: entry.product.bestOffer?.priceCurrency ?? entry.product.priceCurrency,
      freshness: entry.product.freshness,
      confidence: entry.product.dataConfidenceScore,
      fitSummary: entry.result.fitSummary,
      notForSummary: entry.result.notForSummary,
      bestOffer: entry.result.bestOffer
    })),
    actions: winner.result.actions,
    disclaimers: buildCommerceDisclaimers(winner.product)
  })
}
