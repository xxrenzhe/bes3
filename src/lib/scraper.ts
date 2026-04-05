import { load } from 'cheerio'

export interface ScrapedOffer {
  merchantName: string
  websiteUrl: string | null
  offerUrl: string
  availabilityStatus: string | null
  priceAmount: number | null
  priceCurrency: string | null
  shippingCost: number | null
  couponText: string | null
  couponType: string | null
  conditionLabel: string | null
  sourceType: 'schema' | 'dom'
  sourceUrl: string
  confidenceScore: number
  rawPayload: Record<string, unknown> | null
}

export interface ScrapedAttributeFact {
  key: string
  label: string
  value: string
  sourceUrl: string
  sourceType: 'spec_table' | 'schema' | 'dom'
  confidenceScore: number
  isVerified: boolean
}

export interface ScrapedProduct {
  finalUrl: string
  productName: string
  brand: string | null
  category: string | null
  description: string | null
  priceAmount: number | null
  priceCurrency: string | null
  rating: number | null
  reviewCount: number | null
  imageUrls: string[]
  reviewImageUrls: string[]
  specs: Record<string, string>
  reviewHighlights: string[]
  offers: ScrapedOffer[]
  attributeFacts: ScrapedAttributeFact[]
  priceLastCheckedAt: string
  offerLastCheckedAt: string
  attributeCompletenessScore: number
  dataConfidenceScore: number
  sourceCount: number
}

function normalizePrice(raw: string | null | undefined): number | null {
  if (!raw) return null
  const match = raw.replace(/,/g, '').match(/(\d+(?:\.\d+)?)/)
  return match ? Number(match[1]) : null
}

function unique<T>(values: T[]): T[] {
  return Array.from(new Set(values))
}

function normalizeAvailabilityStatus(raw: string | null | undefined): string | null {
  const value = String(raw || '').trim().toLowerCase()
  if (!value) return null
  if (value.includes('instock') || value.includes('in stock') || value.includes('available')) return 'in_stock'
  if (value.includes('preorder') || value.includes('pre-order')) return 'preorder'
  if (value.includes('limited')) return 'limited'
  if (value.includes('backorder') || value.includes('back-order')) return 'backorder'
  if (value.includes('outofstock') || value.includes('out of stock') || value.includes('unavailable')) return 'out_of_stock'
  return value.replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') || null
}

function buildMerchantNameFromUrl(url: string): string {
  const hostname = new URL(url).hostname.replace(/^www\./, '')
  const hostRoot = hostname.split('.').slice(0, -1).join('.') || hostname
  return hostRoot
    .split(/[\W_]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function buildAttributeFacts(
  finalUrl: string,
  specs: Record<string, string>,
  sourceType: ScrapedAttributeFact['sourceType'],
  confidenceScore: number
): ScrapedAttributeFact[] {
  return Object.entries(specs)
    .filter(([, value]) => Boolean(value))
    .map(([label, value]) => ({
      key: label
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_|_$/g, ''),
      label: label.trim(),
      value: value.trim(),
      sourceUrl: finalUrl,
      sourceType,
      confidenceScore,
      isVerified: confidenceScore >= 0.9
    }))
    .filter((fact) => Boolean(fact.key))
}

function calculateAttributeCompletenessScore(input: {
  specs: Record<string, string>
  description: string | null
  priceAmount: number | null
  rating: number | null
  reviewCount: number | null
  imageCount: number
}) {
  const signals = [
    Object.keys(input.specs).length >= 5 ? 1 : Object.keys(input.specs).length >= 3 ? 0.75 : Object.keys(input.specs).length >= 1 ? 0.45 : 0,
    input.description ? 1 : 0,
    input.priceAmount != null ? 1 : 0,
    input.rating != null ? 1 : 0,
    input.reviewCount != null ? 1 : 0,
    input.imageCount >= 3 ? 1 : input.imageCount >= 1 ? 0.6 : 0
  ]

  return Number((signals.reduce((total, value) => total + value, 0) / signals.length).toFixed(2))
}

function calculateDataConfidenceScore(input: {
  hasSchemaOffer: boolean
  hasDomOffer: boolean
  specsCount: number
  reviewHighlightCount: number
}) {
  const score =
    0.35 +
    (input.hasSchemaOffer ? 0.25 : 0) +
    (input.hasDomOffer ? 0.15 : 0) +
    Math.min(input.specsCount, 6) * 0.04 +
    Math.min(input.reviewHighlightCount, 5) * 0.02

  return Number(Math.min(0.98, score).toFixed(2))
}

function extractLdJson(html: string): any[] {
  const $ = load(html)
  const payloads: any[] = []
  $('script[type="application/ld+json"]').each((_, node) => {
    const raw = $(node).html()?.trim()
    if (!raw) return
    try {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) {
        payloads.push(...parsed)
      } else {
        payloads.push(parsed)
      }
    } catch {
      // Ignore malformed blocks.
    }
  })
  return payloads
}

function extractAmazonImages(html: string): string[] {
  const urls = new Set<string>()
  const patterns = [
    /https:\/\/m\.media-amazon\.com\/images\/I\/[^"'\\\s]+/g,
    /https:\/\/images-na\.ssl-images-amazon\.com\/images\/I\/[^"'\\\s]+/g
  ]

  for (const pattern of patterns) {
    for (const match of html.match(pattern) || []) {
      urls.add(match.replace(/\\u0026/g, '&'))
    }
  }

  return Array.from(urls).slice(0, 12)
}

function extractAmazonReviewImages(html: string): string[] {
  const matches = html.match(/https:\/\/m\.media-amazon\.com\/images\/I\/[^"'\\\s]+/g) || []
  return unique(matches.filter((url) => url.includes('images/I/')).slice(0, 8))
}

function scrapeAmazonProduct(finalUrl: string, html: string): ScrapedProduct {
  const $ = load(html)
  const ldJson = extractLdJson(html)
  const productSchema = ldJson.find((item) => item['@type'] === 'Product') || {}
  const offers = Array.isArray(productSchema.offers) ? productSchema.offers[0] : productSchema.offers || {}
  const aggregate = productSchema.aggregateRating || {}
  const specs: Record<string, string> = {}

  $('#productDetails_techSpec_section_1 tr, #productDetails_detailBullets_sections1 tr').each((_, row) => {
    const label = $(row).find('th').text().trim()
    const value = $(row).find('td').text().trim()
    if (label && value) specs[label] = value
  })

  const reviewHighlights = unique(
    $('#feature-bullets li span')
      .map((_, node) => $(node).text().trim())
      .get()
      .filter(Boolean)
      .slice(0, 6)
  )

  const priceText =
    $('#corePrice_feature_div .a-offscreen').first().text().trim() ||
    $('#priceblock_ourprice, #priceblock_dealprice').first().text().trim() ||
    `${offers.price ?? ''}`

  const availabilityStatus = normalizeAvailabilityStatus(
    $('#availability span').first().text().trim() || offers.availability || productSchema.availability
  )
  const schemaOffer: ScrapedOffer | null =
    offers.price || offers.priceCurrency || offers.url
      ? {
          merchantName: 'Amazon',
          websiteUrl: 'https://www.amazon.com',
          offerUrl: String(offers.url || finalUrl),
          availabilityStatus,
          priceAmount: normalizePrice(String(offers.price || priceText || '')),
          priceCurrency: String(offers.priceCurrency || 'USD'),
          shippingCost: null,
          couponText: null,
          couponType: null,
          conditionLabel: String(offers.itemCondition || '').trim() || null,
          sourceType: 'schema',
          sourceUrl: finalUrl,
          confidenceScore: 0.94,
          rawPayload: offers && typeof offers === 'object' ? offers as Record<string, unknown> : null
        }
      : null
  const domOffer: ScrapedOffer | null =
    priceText || availabilityStatus
      ? {
          merchantName: 'Amazon',
          websiteUrl: 'https://www.amazon.com',
          offerUrl: finalUrl,
          availabilityStatus,
          priceAmount: normalizePrice(priceText),
          priceCurrency: String(offers.priceCurrency || 'USD'),
          shippingCost: null,
          couponText: null,
          couponType: null,
          conditionLabel: null,
          sourceType: 'dom',
          sourceUrl: finalUrl,
          confidenceScore: schemaOffer ? 0.86 : 0.9,
          rawPayload: null
        }
      : null
  const offerCandidates = [schemaOffer, domOffer].filter(Boolean) as ScrapedOffer[]
  const dedupedOffers = unique(offerCandidates.map((offer) => JSON.stringify(offer))).map((offer) => JSON.parse(offer) as ScrapedOffer)
  const attributeFacts = buildAttributeFacts(finalUrl, specs, 'spec_table', 0.92)
  const priceLastCheckedAt = new Date().toISOString()
  const attributeCompletenessScore = calculateAttributeCompletenessScore({
    specs,
    description:
      $('#productDescription p').first().text().trim() ||
      $('#feature-bullets').text().trim().slice(0, 500) ||
      productSchema.description ||
      null,
    priceAmount: normalizePrice(priceText),
    rating: Number(aggregate.ratingValue || $('#acrPopover').attr('title')?.match(/(\d+(\.\d+)?)/)?.[1] || 0) || null,
    reviewCount: Number(aggregate.reviewCount || $('#acrCustomerReviewText').text().replace(/[^\d]/g, '') || 0) || null,
    imageCount: extractAmazonImages(html).length
  })
  const dataConfidenceScore = calculateDataConfidenceScore({
    hasSchemaOffer: Boolean(schemaOffer),
    hasDomOffer: Boolean(domOffer),
    specsCount: attributeFacts.length,
    reviewHighlightCount: reviewHighlights.length
  })

  return {
    finalUrl,
    productName:
      $('#productTitle').text().trim() ||
      productSchema.name ||
      $('title').text().replace(/\s*\|\s*Amazon.*$/, '').trim() ||
      'Unknown Amazon Product',
    brand:
      $('#bylineInfo').text().trim().replace(/^Brand:\s*/i, '') ||
      productSchema.brand?.name ||
      null,
    category:
      $('#wayfinding-breadcrumbs_feature_div li').eq(0).text().trim() ||
      productSchema.category ||
      'tech',
    description:
      $('#productDescription p').first().text().trim() ||
      $('#feature-bullets').text().trim().slice(0, 500) ||
      productSchema.description ||
      null,
    priceAmount: normalizePrice(priceText),
    priceCurrency: String(offers.priceCurrency || 'USD'),
    rating: Number(aggregate.ratingValue || $('#acrPopover').attr('title')?.match(/(\d+(\.\d+)?)/)?.[1] || 0) || null,
    reviewCount:
      Number(aggregate.reviewCount || $('#acrCustomerReviewText').text().replace(/[^\d]/g, '') || 0) || null,
    imageUrls: extractAmazonImages(html),
    reviewImageUrls: extractAmazonReviewImages(html),
    specs,
    reviewHighlights,
    offers: dedupedOffers,
    attributeFacts,
    priceLastCheckedAt,
    offerLastCheckedAt: priceLastCheckedAt,
    attributeCompletenessScore,
    dataConfidenceScore,
    sourceCount: dedupedOffers.some((offer) => offer.sourceType === 'schema') && dedupedOffers.some((offer) => offer.sourceType === 'dom') ? 2 : 1
  }
}

function scrapeGenericProduct(finalUrl: string, html: string): ScrapedProduct {
  const $ = load(html)
  const ldJson = extractLdJson(html)
  const productSchema = ldJson.find((item) => item['@type'] === 'Product') || {}
  const offers = Array.isArray(productSchema.offers) ? productSchema.offers[0] : productSchema.offers || {}
  const aggregate = productSchema.aggregateRating || {}
  const specs: Record<string, string> = {}

  $('table tr').each((_, row) => {
    const label = $(row).find('th, td').eq(0).text().trim()
    const value = $(row).find('th, td').eq(1).text().trim()
    if (label && value && label !== value) specs[label] = value
  })

  const rawImages = [
    ...$('img')
      .map((_, img) => $(img).attr('src') || $(img).attr('data-src') || '')
      .get(),
    ...(Array.isArray(productSchema.image) ? productSchema.image : [productSchema.image]).filter(Boolean)
  ]

  const imageUrls = unique(
    rawImages
      .map((url) => {
        try {
          return new URL(url, finalUrl).toString()
        } catch {
          return ''
        }
      })
      .filter(Boolean)
      .slice(0, 12)
  )

  const reviewHighlights = unique(
    $('blockquote, .review, [data-review], .product-review')
      .map((_, node) => $(node).text().trim())
      .get()
      .filter((text) => text.length > 32)
      .slice(0, 5)
  )

  const reviewImageUrls = unique(
    $('[class*="review"] img, [data-review] img')
      .map((_, img) => $(img).attr('src') || $(img).attr('data-src') || '')
      .get()
      .map((url) => {
        try {
          return new URL(url, finalUrl).toString()
        } catch {
          return ''
        }
      })
      .filter(Boolean)
      .slice(0, 8)
  )
  const domPriceAmount = normalizePrice(String($('[itemprop="price"]').attr('content') || ''))
  const availabilityStatus = normalizeAvailabilityStatus(
    String(productSchema.offers?.availability || $('[itemprop="availability"]').attr('href') || $('[itemprop="availability"]').attr('content') || '')
  )
  const merchantName = buildMerchantNameFromUrl(finalUrl)
  const schemaOffer: ScrapedOffer | null =
    offers.price || offers.priceCurrency || offers.url
      ? {
          merchantName,
          websiteUrl: `${new URL(finalUrl).protocol}//${new URL(finalUrl).host}`,
          offerUrl: String(offers.url || finalUrl),
          availabilityStatus,
          priceAmount: normalizePrice(String(offers.price || '')),
          priceCurrency: String(offers.priceCurrency || $('[itemprop="priceCurrency"]').attr('content') || 'USD'),
          shippingCost: null,
          couponText: null,
          couponType: null,
          conditionLabel: String(offers.itemCondition || '').trim() || null,
          sourceType: 'schema',
          sourceUrl: finalUrl,
          confidenceScore: 0.9,
          rawPayload: offers && typeof offers === 'object' ? offers as Record<string, unknown> : null
        }
      : null
  const domOffer: ScrapedOffer | null =
    domPriceAmount != null || availabilityStatus
      ? {
          merchantName,
          websiteUrl: `${new URL(finalUrl).protocol}//${new URL(finalUrl).host}`,
          offerUrl: finalUrl,
          availabilityStatus,
          priceAmount: domPriceAmount,
          priceCurrency: String(offers.priceCurrency || $('[itemprop="priceCurrency"]').attr('content') || 'USD'),
          shippingCost: null,
          couponText: null,
          couponType: null,
          conditionLabel: null,
          sourceType: 'dom',
          sourceUrl: finalUrl,
          confidenceScore: schemaOffer ? 0.82 : 0.86,
          rawPayload: null
        }
      : null
  const offerCandidates = [schemaOffer, domOffer].filter(Boolean) as ScrapedOffer[]
  const dedupedOffers = unique(offerCandidates.map((offer) => JSON.stringify(offer))).map((offer) => JSON.parse(offer) as ScrapedOffer)
  const attributeFacts = buildAttributeFacts(finalUrl, specs, 'spec_table', 0.85)
  const priceLastCheckedAt = new Date().toISOString()
  const productDescription =
    productSchema.description ||
    $('meta[name="description"]').attr('content') ||
    $('p').first().text().trim() ||
    null
  const productRating = Number(aggregate.ratingValue || $('[itemprop="ratingValue"]').attr('content') || 0) || null
  const productReviewCount = Number(aggregate.reviewCount || $('[itemprop="reviewCount"]').attr('content') || 0) || null
  const attributeCompletenessScore = calculateAttributeCompletenessScore({
    specs,
    description: productDescription,
    priceAmount: normalizePrice(String(offers.price || $('[itemprop="price"]').attr('content') || '')),
    rating: productRating,
    reviewCount: productReviewCount,
    imageCount: imageUrls.length
  })
  const dataConfidenceScore = calculateDataConfidenceScore({
    hasSchemaOffer: Boolean(schemaOffer),
    hasDomOffer: Boolean(domOffer),
    specsCount: attributeFacts.length,
    reviewHighlightCount: reviewHighlights.length
  })

  return {
    finalUrl,
    productName:
      productSchema.name ||
      $('meta[property="og:title"]').attr('content') ||
      $('h1').first().text().trim() ||
      $('title').text().trim() ||
      'Unknown Product',
    brand:
      productSchema.brand?.name ||
      $('[itemprop="brand"]').first().text().trim() ||
      $('meta[name="brand"]').attr('content') ||
      null,
    category:
      productSchema.category ||
      $('meta[property="product:category"]').attr('content') ||
      null,
    description:
      productDescription,
    priceAmount: normalizePrice(String(offers.price || $('[itemprop="price"]').attr('content') || '')),
    priceCurrency: String(offers.priceCurrency || $('[itemprop="priceCurrency"]').attr('content') || 'USD'),
    rating: productRating,
    reviewCount: productReviewCount,
    imageUrls,
    reviewImageUrls,
    specs,
    reviewHighlights,
    offers: dedupedOffers,
    attributeFacts,
    priceLastCheckedAt,
    offerLastCheckedAt: priceLastCheckedAt,
    attributeCompletenessScore,
    dataConfidenceScore,
    sourceCount: dedupedOffers.some((offer) => offer.sourceType === 'schema') && dedupedOffers.some((offer) => offer.sourceType === 'dom') ? 2 : 1
  }
}

export function scrapeProductPage(finalUrl: string, html: string): ScrapedProduct {
  const hostname = new URL(finalUrl).hostname
  if (hostname.includes('amazon.')) {
    return scrapeAmazonProduct(finalUrl, html)
  }
  return scrapeGenericProduct(finalUrl, html)
}
