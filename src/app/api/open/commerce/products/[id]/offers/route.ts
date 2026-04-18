import { NextResponse } from 'next/server'
import {
  COMMERCE_PROTOCOL_VERSION,
  buildCommerceDisclaimers,
  buildCommerceActions,
  serializePublicOffer,
  serializePublicOffers,
  serializePublicProductSnapshot,
  serializeCommerceProduct,
  summarizePriceHistory
} from '@/lib/open-commerce'
import { getBrandKnowledgeByProduct, getOpenCommerceProductById, listProductAttributeFacts, listProductOffers, listProductPriceHistory } from '@/lib/site-data'

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

  const [offers, priceHistory, attributeFacts, brandKnowledge] = await Promise.all([
    listProductOffers(productId),
    listProductPriceHistory(productId),
    listProductAttributeFacts(productId, 12),
    getBrandKnowledgeByProduct({
      brandName: product.brand,
      category: product.category,
      compatibilityLimit: 6
    })
  ])
  const bestOffer = product.bestOffer || offers[0] || null
  const alternativeOffers = offers.filter((offer) => !bestOffer || offer.id !== bestOffer.id).slice(0, 3)
  const result = serializeCommerceProduct(product, {
    offers,
    attributeFacts,
    priceHistory,
    brandPolicy: brandKnowledge.brandPolicy,
    compatibilityFacts: brandKnowledge.compatibilityFacts,
    source: 'open-commerce-offers'
  })

  return NextResponse.json({
    protocolVersion: COMMERCE_PROTOCOL_VERSION,
    generatedAt: new Date().toISOString(),
    productId,
    product: serializePublicProductSnapshot(product),
    bestOffer: serializePublicOffer(bestOffer),
    alternativeOffers: serializePublicOffers(alternativeOffers),
    total: offers.length,
    offers: serializePublicOffers(offers),
    priceHistory,
    priceHistorySummary: summarizePriceHistory(priceHistory, bestOffer?.priceCurrency || product.priceCurrency),
    brandKnowledge: result.brandKnowledge,
    result,
    actions: buildCommerceActions(product, {
      source: 'open-commerce-offers'
    }),
    disclaimers: buildCommerceDisclaimers(product)
  })
}
