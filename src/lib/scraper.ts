import { load } from 'cheerio'
import { buildProductIdentityEnrichment } from '@/lib/product-acquisition'

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
  referencePriceAmount: number | null
  referencePriceCurrency: string | null
  referencePriceType: 'compare_at' | 'original' | 'msrp' | 'unknown' | null
  referencePriceSource: string | null
  referencePriceLastCheckedAt: string | null
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
  productModel: string | null
  modelNumber: string | null
  productType: string | null
  category: string | null
  categorySlug: string | null
  youtubeMatchTerms: string[]
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

function normalizeReviewCount(raw: unknown): number | null {
  if (raw == null) return null
  if (typeof raw === 'number') return Number.isFinite(raw) ? Math.max(0, Math.trunc(raw)) : null

  const text = String(raw).trim()
  if (!text) return null
  const compact = text.toLowerCase().replace(/[\s,，]/g, '')
  const shortMatch = compact.match(/^(\d+(?:\.\d+)?)([kmb])$/i)
  if (shortMatch) {
    const base = Number(shortMatch[1])
    const multiplier = shortMatch[2].toLowerCase() === 'k' ? 1000 : shortMatch[2].toLowerCase() === 'm' ? 1000000 : 1000000000
    return Number.isFinite(base) ? Math.trunc(base * multiplier) : null
  }

  const digits = compact.match(/\d+/g)
  if (!digits?.length) return null
  const longest = digits.sort((left, right) => right.length - left.length)[0]
  const parsed = Number(longest)
  return Number.isFinite(parsed) ? Math.max(0, Math.trunc(parsed)) : null
}

function unique<T>(values: T[]): T[] {
  return Array.from(new Set(values))
}

function normalizeImageUrl(raw: string | null | undefined, finalUrl?: string): string | null {
  const text = String(raw || '').trim()
  if (!text || text.startsWith('data:')) return null

  try {
    const normalized = text.startsWith('//') ? `https:${text}` : new URL(text, finalUrl).toString()
    const pathname = new URL(normalized).pathname.toLowerCase()

    if (pathname.endsWith('.css') || pathname.endsWith('.js')) return null
    if (normalized.includes('AUIClients/')) return null
    if (/\.(?:jpe?g|png|webp|gif|avif|bmp)(?:$|\?)/i.test(pathname) || /\/files\//i.test(pathname) || /\/images\//i.test(pathname)) {
      return normalized
    }
  } catch {
    return null
  }

  return null
}

function normalizeTextSnippet(raw: string | null | undefined): string {
  return String(raw || '')
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
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
      const normalized = normalizeImageUrl(match.replace(/\\u0026/g, '&'))
      if (normalized) urls.add(normalized)
    }
  }

  return Array.from(urls).slice(0, 12)
}

function normalizeAmazonBrand(raw: string | null | undefined): string | null {
  const text = String(raw || '').trim()
  if (!text) return null

  return text
    .replace(/^Visit\s+the\s+/i, '')
    .replace(/\s+Store$/i, '')
    .replace(/^Brand:\s*/i, '')
    .replace(/^Marca:\s*/i, '')
    .replace(/^Marque:\s*/i, '')
    .replace(/^Marke:\s*/i, '')
    .replace(/\s+出品者のストアにアクセス$/i, '')
    .trim() || null
}

function extractAmazonReviewImages(html: string): string[] {
  const matches = html.match(/https:\/\/m\.media-amazon\.com\/images\/I\/[^"'\\\s]+/g) || []
  return unique(matches.map((url) => normalizeImageUrl(url)).filter((url): url is string => Boolean(url)).slice(0, 8))
}

function extractInlineJsonObject<T>(html: string, marker: string): T | null {
  const start = html.indexOf(marker)
  if (start < 0) return null

  const objectStart = html.indexOf('{', start)
  if (objectStart < 0) return null

  let depth = 0
  let inString = false
  let quoteChar = ''
  let escaped = false

  for (let index = objectStart; index < html.length; index += 1) {
    const char = html[index]

    if (inString) {
      if (escaped) {
        escaped = false
        continue
      }
      if (char === '\\') {
        escaped = true
        continue
      }
      if (char === quoteChar) {
        inString = false
        quoteChar = ''
      }
      continue
    }

    if (char === '"' || char === "'") {
      inString = true
      quoteChar = char
      continue
    }

    if (char === '{') depth += 1
    if (char === '}') {
      depth -= 1
      if (depth === 0) {
        const objectLiteral = html.slice(objectStart, index + 1)
        try {
          return JSON.parse(objectLiteral) as T
        } catch {
          return null
        }
      }
    }
  }

  return null
}

function extractAreviewsAggregate(html: string): { rating: number | null; reviewCount: number | null } {
  const marker = 'AreviewsproductLdJsonSchema'
  const start = html.indexOf(marker)
  if (start < 0) return { rating: null, reviewCount: null }

  const snippet = html.slice(start, start + 1200)
  const rating = snippet.match(/"ratingValue"\s*:\s*"([^"]+)"/)?.[1]
  const reviewCount = snippet.match(/"reviewCount"\s*:\s*"([^"]+)"/)?.[1]

  return {
    rating: rating ? Number(rating) || null : null,
    reviewCount: normalizeReviewCount(reviewCount)
  }
}

function extractFaqPairs(text: string): string[] {
  const normalized = text.replace(/<br\s*\/?>/gi, '\n').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
  const matches = Array.from(
    normalized.matchAll(/Q\d+[:：]\s*([\s\S]+?)\s*A\d+[:：]\s*([\s\S]+?)(?=(?:Q\d+[:：])|$)/gi)
  )

  return matches
    .map((match) => `${normalizeTextSnippet(match[1])} ${normalizeTextSnippet(match[2])}`.trim())
    .filter((item) => item.length >= 24)
    .slice(0, 5)
}

function extractShopifySpecs($: ReturnType<typeof load>): Record<string, string> {
  const specs: Record<string, string> = {}

  $('table[class*="spec"], table[class*="technical"], [class*="spec"] table').each((_, table) => {
    $(table)
      .find('tr')
      .each((__, row) => {
        const cells = $(row).find('td, th')
        if (cells.length < 2) return
        const label = normalizeTextSnippet($(cells[0]).text())
        const value = normalizeTextSnippet($(cells[1]).text())
        if (label && value && label !== value && !specs[label]) {
          specs[label] = value
        }
      })
  })

  $('dl[class*="spec"], [class*="spec"] dl').each((_, dl) => {
    $(dl)
      .find('dt')
      .each((__, dt) => {
        const label = normalizeTextSnippet($(dt).text())
        const value = normalizeTextSnippet($(dt).next('dd').text())
        if (label && value && label !== value && !specs[label]) {
          specs[label] = value
        }
      })
  })

  $('.specs-item').each((_, node) => {
    const label = normalizeTextSnippet($(node).find('.col-12.col-sm-6').first().text())
    const valueParts = $(node)
      .find('.specs-content')
      .first()
      .find('strong, p, li')
      .map((__, element) => normalizeTextSnippet($(element).text()))
      .get()
      .filter(Boolean)
    const value = unique(valueParts).join(' | ')
    if (label && value && !specs[label]) {
      specs[label] = value
    }
  })

  return specs
}

function scrapeShopifyProduct(finalUrl: string, html: string): ScrapedProduct {
  const $ = load(html)
  const ldJson = extractLdJson(html)
  const productSchema = ldJson.find((item) => item['@type'] === 'Product') || {}
  const offers = Array.isArray(productSchema.offers) ? productSchema.offers[0] : productSchema.offers || {}
  const aggregate = productSchema.aggregateRating || {}
  const tfxProduct = extractInlineJsonObject<{
    title?: string
    vendor?: string
    type?: string
    description?: string
    available?: boolean
    tags?: string[]
    price?: number
    compare_at_price?: number
    featured_image?: string
    images?: string[]
    variants?: Array<{ sku?: string; available?: boolean; option1?: string | null; option2?: string | null; option3?: string | null }>
    media?: Array<{ src?: string; preview_image?: { src?: string } }>
  }>(html, 'window.tfxProduct') || {}
  const areviews = extractAreviewsAggregate(html)
  const specs = extractShopifySpecs($)

  const firstVariant = tfxProduct.variants?.[0]
  if (firstVariant?.sku && !specs.SKU) specs.SKU = firstVariant.sku
  if (tfxProduct.type && !specs['Product Type']) specs['Product Type'] = tfxProduct.type
  if (Array.isArray(tfxProduct.tags) && tfxProduct.tags.length && !specs.Tags) specs.Tags = tfxProduct.tags.join(', ')
  if (!specs.Availability) specs.Availability = tfxProduct.available === false ? 'Out of stock' : tfxProduct.available === true ? 'In stock' : ''

  const imageUrls = unique(
    [
      tfxProduct.featured_image || '',
      ...(tfxProduct.images || []),
      ...((tfxProduct.media || []).flatMap((item) => [item.src || '', item.preview_image?.src || '']))
    ]
      .map((url) => normalizeImageUrl(url, finalUrl))
      .filter((url): url is string => Boolean(url))
      .slice(0, 12)
  )

  const reviewHighlights = unique([
    ...extractFaqPairs($('.metafield-multi_line_text_field').html() || '')
  ]).slice(0, 6)

  const description =
    normalizeTextSnippet(productSchema.description) ||
    normalizeTextSnippet($('meta[name="description"]').attr('content')) ||
    normalizeTextSnippet(tfxProduct.description) ||
    normalizeTextSnippet($('.product-meta__description, .product-description').first().text()) ||
    null

  const domPriceAmount =
    normalizePrice(String(offers.price || '')) ??
    (typeof tfxProduct.price === 'number' ? Number((tfxProduct.price / 100).toFixed(2)) : null) ??
    normalizePrice($('[class*="price"]').first().text())
  const referencePriceAmount =
    typeof tfxProduct.compare_at_price === 'number'
      ? Number((tfxProduct.compare_at_price / 100).toFixed(2))
      : null
  const priceCurrency = String(offers.priceCurrency || $('[itemprop="priceCurrency"]').attr('content') || 'USD')
  const availabilityStatus = normalizeAvailabilityStatus(
    String(offers.availability || (tfxProduct.available === false ? 'out of stock' : tfxProduct.available === true ? 'in stock' : ''))
  )
  const merchantName = normalizeTextSnippet(tfxProduct.vendor) || buildMerchantNameFromUrl(finalUrl)

  const schemaOffer: ScrapedOffer | null =
    offers.price || offers.priceCurrency || offers.url
      ? {
          merchantName,
          websiteUrl: `${new URL(finalUrl).protocol}//${new URL(finalUrl).host}`,
          offerUrl: String(offers.url || finalUrl),
          availabilityStatus,
          priceAmount: normalizePrice(String(offers.price || '')),
          priceCurrency,
          shippingCost: null,
          couponText: null,
          couponType: null,
          referencePriceAmount,
          referencePriceCurrency: referencePriceAmount != null ? priceCurrency : null,
          referencePriceType: referencePriceAmount != null ? 'compare_at' : null,
          referencePriceSource: referencePriceAmount != null ? 'shopify_compare_at_price' : null,
          referencePriceLastCheckedAt: referencePriceAmount != null ? new Date().toISOString() : null,
          conditionLabel: String(offers.itemCondition || '').trim() || null,
          sourceType: 'schema',
          sourceUrl: finalUrl,
          confidenceScore: 0.92,
          rawPayload: offers && typeof offers === 'object' ? (offers as Record<string, unknown>) : null
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
          priceCurrency,
          shippingCost: null,
          couponText: null,
          couponType: null,
          referencePriceAmount,
          referencePriceCurrency: referencePriceAmount != null ? priceCurrency : null,
          referencePriceType: referencePriceAmount != null ? 'compare_at' : null,
          referencePriceSource: referencePriceAmount != null ? 'shopify_compare_at_price' : null,
          referencePriceLastCheckedAt: referencePriceAmount != null ? new Date().toISOString() : null,
          conditionLabel: null,
          sourceType: 'dom',
          sourceUrl: finalUrl,
          confidenceScore: schemaOffer ? 0.86 : 0.9,
          rawPayload: null
        }
      : null
  const offerCandidates = [schemaOffer, domOffer].filter(Boolean) as ScrapedOffer[]
  const dedupedOffers = unique(offerCandidates.map((offer) => JSON.stringify(offer))).map((offer) => JSON.parse(offer) as ScrapedOffer)
  const attributeFacts = buildAttributeFacts(finalUrl, specs, 'spec_table', 0.9)
  const priceLastCheckedAt = new Date().toISOString()
  const rating = Number(aggregate.ratingValue || areviews.rating || 0) || null
  const reviewCount = normalizeReviewCount(aggregate.reviewCount || areviews.reviewCount)
  const attributeCompletenessScore = calculateAttributeCompletenessScore({
    specs,
    description,
    priceAmount: domPriceAmount,
    rating,
    reviewCount,
    imageCount: imageUrls.length
  })
  const dataConfidenceScore = calculateDataConfidenceScore({
    hasSchemaOffer: Boolean(schemaOffer),
    hasDomOffer: Boolean(domOffer),
    specsCount: attributeFacts.length,
    reviewHighlightCount: reviewHighlights.length
  })
  const productName =
    normalizeTextSnippet(productSchema.name) ||
    normalizeTextSnippet(tfxProduct.title) ||
    normalizeTextSnippet($('meta[property="og:title"]').attr('content')) ||
    normalizeTextSnippet($('h1').first().text()) ||
    'Unknown Shopify Product'
  const brand =
    normalizeTextSnippet(productSchema.brand?.name) ||
    normalizeTextSnippet(tfxProduct.vendor) ||
    normalizeTextSnippet($('meta[property="og:site_name"]').attr('content')) ||
    null
  const category =
    normalizeTextSnippet(productSchema.category) ||
    normalizeTextSnippet(tfxProduct.type) ||
    null
  const identity = buildProductIdentityEnrichment({
    productName,
    brand,
    category,
    specs,
    rawPayload: tfxProduct
  })

  return {
    finalUrl,
    productName,
    brand,
    productModel: identity.productModel,
    modelNumber: identity.modelNumber,
    productType: identity.productType,
    category: identity.category || category,
    categorySlug: identity.categorySlug,
    youtubeMatchTerms: identity.youtubeMatchTerms,
    description,
    priceAmount: domPriceAmount,
    priceCurrency,
    rating,
    reviewCount,
    imageUrls,
    reviewImageUrls: [],
    specs,
    reviewHighlights,
    offers: dedupedOffers,
    attributeFacts,
    priceLastCheckedAt,
    offerLastCheckedAt: priceLastCheckedAt,
    attributeCompletenessScore,
    dataConfidenceScore,
    sourceCount: 2
  }
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
    $('.priceToPay .a-offscreen').first().text().trim() ||
    $('#twister-plus-price-data-price').attr('value') ||
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
          referencePriceAmount: null,
          referencePriceCurrency: null,
          referencePriceType: null,
          referencePriceSource: null,
          referencePriceLastCheckedAt: null,
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
          referencePriceAmount: null,
          referencePriceCurrency: null,
          referencePriceType: null,
          referencePriceSource: null,
          referencePriceLastCheckedAt: null,
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
    reviewCount: normalizeReviewCount(aggregate.reviewCount || $('#acrCustomerReviewText').first().text()) || null,
    imageCount: extractAmazonImages(html).length
  })
  const dataConfidenceScore = calculateDataConfidenceScore({
    hasSchemaOffer: Boolean(schemaOffer),
    hasDomOffer: Boolean(domOffer),
    specsCount: attributeFacts.length,
    reviewHighlightCount: reviewHighlights.length
  })
  const productName =
    $('#productTitle').text().trim() ||
    productSchema.name ||
    $('title').text().replace(/\s*\|\s*Amazon.*$/, '').trim() ||
    'Unknown Amazon Product'
  const brand =
    normalizeAmazonBrand($('#bylineInfo').first().text()) ||
    productSchema.brand?.name ||
    null
  const category =
    $('#wayfinding-breadcrumbs_feature_div li').eq(0).text().trim() ||
    productSchema.category ||
    'tech'
  const identity = buildProductIdentityEnrichment({
    productName,
    brand,
    category,
    specs,
    rawPayload: productSchema
  })

  return {
    finalUrl,
    productName,
    brand,
    productModel: identity.productModel,
    modelNumber: identity.modelNumber,
    productType: identity.productType,
    category: identity.category || category,
    categorySlug: identity.categorySlug,
    youtubeMatchTerms: identity.youtubeMatchTerms,
    description:
      $('#productDescription p').first().text().trim() ||
      $('#feature-bullets').text().trim().slice(0, 500) ||
      productSchema.description ||
      null,
    priceAmount: normalizePrice(priceText),
    priceCurrency: String(offers.priceCurrency || 'USD'),
    rating: Number(aggregate.ratingValue || $('#acrPopover').attr('title')?.match(/(\d+(\.\d+)?)/)?.[1] || 0) || null,
    reviewCount: normalizeReviewCount(aggregate.reviewCount || $('#acrCustomerReviewText').first().text()) || null,
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

  $('dl dt').each((_, node) => {
    const label = $(node).text().trim()
    const value = $(node).next('dd').text().trim()
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
      .map((url) => normalizeImageUrl(String(url || ''), finalUrl))
      .filter((url): url is string => Boolean(url))
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
      .map((url) => normalizeImageUrl(String(url || ''), finalUrl))
      .filter((url): url is string => Boolean(url))
      .slice(0, 8)
  )
  const domPriceAmount = normalizePrice(String($('[itemprop="price"]').attr('content') || ''))
  const fallbackDomPriceAmount = domPriceAmount ??
    normalizePrice(
      String(
        $('meta[property="product:price:amount"]').attr('content') ||
        $('meta[property="og:price:amount"]').attr('content') ||
        $('[class*="price"]').first().text() ||
        ''
      )
    )
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
          referencePriceAmount: null,
          referencePriceCurrency: null,
          referencePriceType: null,
          referencePriceSource: null,
          referencePriceLastCheckedAt: null,
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
          referencePriceAmount: null,
          referencePriceCurrency: null,
          referencePriceType: null,
          referencePriceSource: null,
          referencePriceLastCheckedAt: null,
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
    priceAmount: normalizePrice(String(offers.price || $('[itemprop="price"]').attr('content') || '')) ?? fallbackDomPriceAmount,
    rating: productRating,
    reviewCount: normalizeReviewCount(productReviewCount),
    imageCount: imageUrls.length
  })
  const dataConfidenceScore = calculateDataConfidenceScore({
    hasSchemaOffer: Boolean(schemaOffer),
    hasDomOffer: Boolean(domOffer),
    specsCount: attributeFacts.length,
    reviewHighlightCount: reviewHighlights.length
  })
  const productName =
    productSchema.name ||
    $('meta[property="og:title"]').attr('content') ||
    $('h1').first().text().trim() ||
    $('title').text().trim() ||
    'Unknown Product'
  const brand =
    productSchema.brand?.name ||
    $('[itemprop="brand"]').first().text().trim() ||
    $('meta[name="brand"]').attr('content') ||
    null
  const category =
    productSchema.category ||
    $('meta[property="product:category"]').attr('content') ||
    null
  const identity = buildProductIdentityEnrichment({
    productName,
    brand,
    category,
    specs,
    rawPayload: productSchema
  })

  return {
    finalUrl,
    productName,
    brand,
    productModel: identity.productModel,
    modelNumber: identity.modelNumber,
    productType: identity.productType,
    category: identity.category || category,
    categorySlug: identity.categorySlug,
    youtubeMatchTerms: identity.youtubeMatchTerms,
    description:
      productDescription,
    priceAmount: normalizePrice(String(offers.price || $('[itemprop="price"]').attr('content') || '')) ?? fallbackDomPriceAmount,
    priceCurrency: String(offers.priceCurrency || $('[itemprop="priceCurrency"]').attr('content') || 'USD'),
    rating: productRating,
    reviewCount: normalizeReviewCount(productReviewCount),
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
  if (/shopify|cdn\.shopify\.com|shopify-features|ShopifyAnalytics|window\.tfxProduct/i.test(html)) {
    return scrapeShopifyProduct(finalUrl, html)
  }
  return scrapeGenericProduct(finalUrl, html)
}
