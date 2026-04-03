import { load } from 'cheerio'

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
}

function normalizePrice(raw: string | null | undefined): number | null {
  if (!raw) return null
  const match = raw.replace(/,/g, '').match(/(\d+(?:\.\d+)?)/)
  return match ? Number(match[1]) : null
}

function unique<T>(values: T[]): T[] {
  return Array.from(new Set(values))
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
    reviewHighlights
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
      productSchema.description ||
      $('meta[name="description"]').attr('content') ||
      $('p').first().text().trim() ||
      null,
    priceAmount: normalizePrice(String(offers.price || $('[itemprop="price"]').attr('content') || '')),
    priceCurrency: String(offers.priceCurrency || $('[itemprop="priceCurrency"]').attr('content') || 'USD'),
    rating: Number(aggregate.ratingValue || $('[itemprop="ratingValue"]').attr('content') || 0) || null,
    reviewCount: Number(aggregate.reviewCount || $('[itemprop="reviewCount"]').attr('content') || 0) || null,
    imageUrls,
    reviewImageUrls,
    specs,
    reviewHighlights
  }
}

export function scrapeProductPage(finalUrl: string, html: string): ScrapedProduct {
  const hostname = new URL(finalUrl).hostname
  if (hostname.includes('amazon.')) {
    return scrapeAmazonProduct(finalUrl, html)
  }
  return scrapeGenericProduct(finalUrl, html)
}
