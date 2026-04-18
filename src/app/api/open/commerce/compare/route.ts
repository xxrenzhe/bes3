import { NextResponse } from 'next/server'
import { categoryMatches } from '@/lib/category'
import {
  COMMERCE_PROTOCOL_VERSION,
  buildComparisonReason,
  buildCommerceDisclaimers,
  compareCommerceProducts,
  serializeCommerceProduct
} from '@/lib/open-commerce'
import {
  getBrandKnowledgeByProduct,
  getOpenCommerceProductById,
  listProductAttributeFacts,
  listProductOffers,
  listProductPriceHistory
} from '@/lib/site-data'

function normalizeProductIds(value: unknown) {
  if (!Array.isArray(value)) return []

  return Array.from(
    new Set(
      value
        .map((item) => Number.parseInt(String(item), 10))
        .filter((item) => Number.isInteger(item) && item > 0)
    )
  ).slice(0, 3)
}

async function buildComparisonResponse(productIds: number[], visitorId?: string | null) {
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

        const [priceHistory, brandKnowledge] = await Promise.all([
          listProductPriceHistory(productId, 12),
          getBrandKnowledgeByProduct({
            brandName: product.brand,
            category: product.category,
            compatibilityLimit: 6
          })
        ])

        return {
          product,
          offers,
          attributeFacts,
          priceHistory,
          brandPolicy: brandKnowledge.brandPolicy,
          compatibilityFacts: brandKnowledge.compatibilityFacts,
          result: serializeCommerceProduct(product, {
            offers,
            attributeFacts,
            priceHistory,
            brandPolicy: brandKnowledge.brandPolicy,
            compatibilityFacts: brandKnowledge.compatibilityFacts,
            source: 'open-commerce-compare',
            visitorId: typeof visitorId === 'string' ? visitorId : null
          })
        }
      })
    )
  ).filter(Boolean) as Array<{
    product: NonNullable<Awaited<ReturnType<typeof getOpenCommerceProductById>>>
    offers: Awaited<ReturnType<typeof listProductOffers>>
    attributeFacts: Awaited<ReturnType<typeof listProductAttributeFacts>>
    priceHistory: Awaited<ReturnType<typeof listProductPriceHistory>>
    brandPolicy: Awaited<ReturnType<typeof getBrandKnowledgeByProduct>>['brandPolicy']
    compatibilityFacts: Awaited<ReturnType<typeof getBrandKnowledgeByProduct>>['compatibilityFacts']
    result: ReturnType<typeof serializeCommerceProduct>
  }>

  if (compared.length < 2) {
    return NextResponse.json({ error: 'Not enough products were found to compare' }, { status: 404 })
  }

  const leadCategory = compared[0]?.product.category || null
  const mixedCategories = compared.some((entry) => !categoryMatches(entry.product.category, leadCategory))

  if (mixedCategories) {
    return NextResponse.json({
      error: 'Compared products must stay in the same category',
      category: leadCategory
    }, { status: 400 })
  }

  const ranked = [...compared].sort((left, right) => compareCommerceProducts(left.product, right.product))
  const winner = ranked[0]
  const runnerUp = ranked[1] || null

  return NextResponse.json({
    protocolVersion: COMMERCE_PROTOCOL_VERSION,
    generatedAt: new Date().toISOString(),
    requestedProductIds: productIds,
    comparedProductIds: ranked.map((entry) => entry.product.id),
    category: leadCategory,
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
      bestOffer: entry.result.bestOffer,
      priceHistorySummary: entry.result.evidence.priceHistorySummary,
      brandKnowledge: entry.result.brandKnowledge
    })),
    actions: winner.result.actions,
    disclaimers: buildCommerceDisclaimers(winner.product)
  })
}

function parseProductIdsFromSearchParams(request: Request) {
  const { searchParams } = new URL(request.url)
  const rawProductIds = searchParams.get('productIds') || searchParams.get('ids') || ''
  const productIds = rawProductIds
    .split(',')
    .map((item) => Number.parseInt(item.trim(), 10))
    .filter((item) => Number.isInteger(item) && item > 0)

  return normalizeProductIds(productIds)
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  return buildComparisonResponse(
    parseProductIdsFromSearchParams(request),
    searchParams.get('visitorId')
  )
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}))
  return buildComparisonResponse(
    normalizeProductIds(body.productIds),
    typeof body.visitorId === 'string' ? body.visitorId : null
  )
}
