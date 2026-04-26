import { slugify } from '@/lib/slug'

export interface ProductIdentityCandidate {
  id: number
  brand: string | null
  productName: string
  asin: string | null
}

export interface EntityMatchResult {
  productId: number | null
  confidence: number
  strategy: 'asin' | 'brand-model' | 'none'
  reason: string
}

export interface LinkHealthResult {
  status: 'active' | 'out_of_stock' | 'broken' | 'unknown'
  httpStatus: number | null
  reason: string
}

const ASIN_RE = /\b(?:dp|gp\/product)\/([A-Z0-9]{10})\b|(?:^|[^A-Z0-9])([A-Z0-9]{10})(?:[^A-Z0-9]|$)/gi
const AMAZON_SHORTLINK_RE = /\bhttps?:\/\/(?:www\.)?amzn\.to\/[^\s)]+/gi
const AMAZON_PRODUCT_RE = /\bhttps?:\/\/(?:www\.)?amazon\.[a-z.]+\/[^\s)]+/gi

function tokenize(value: string) {
  return new Set(
    slugify(value)
      .split('-')
      .map((token) => token.trim())
      .filter((token) => token.length >= 2)
  )
}

function jaccard(left: Set<string>, right: Set<string>) {
  if (!left.size || !right.size) return 0
  let intersection = 0
  for (const item of left) {
    if (right.has(item)) intersection += 1
  }
  const union = new Set([...left, ...right]).size
  return union ? intersection / union : 0
}

export function extractAmazonUrls(text: string): string[] {
  return Array.from(
    new Set([
      ...(text.match(AMAZON_SHORTLINK_RE) || []),
      ...(text.match(AMAZON_PRODUCT_RE) || [])
    ])
  )
}

export function extractAsins(text: string): string[] {
  const asins = new Set<string>()
  for (const match of text.matchAll(ASIN_RE)) {
    const asin = (match[1] || match[2] || '').toUpperCase()
    if (asin) asins.add(asin)
  }
  return Array.from(asins)
}

export function matchVideoEntity({
  title,
  transcriptIntro,
  description,
  products
}: {
  title: string
  transcriptIntro?: string | null
  description?: string | null
  products: ProductIdentityCandidate[]
}): EntityMatchResult {
  const evidenceText = [title, transcriptIntro || '', description || ''].join('\n')
  const asins = new Set(extractAsins(evidenceText))

  if (asins.size) {
    const matched = products.find((product) => product.asin && asins.has(product.asin.toUpperCase()))
    if (matched) {
      return {
        productId: matched.id,
        confidence: 1,
        strategy: 'asin',
        reason: 'Matched exact ASIN extracted from video title, intro, or description.'
      }
    }
  }

  const sourceTokens = tokenize([title, transcriptIntro || ''].join(' '))
  const scored = products
    .map((product) => {
      const identity = [product.brand || '', product.productName].join(' ')
      const score = jaccard(sourceTokens, tokenize(identity))
      const brandBoost = product.brand && sourceTokens.has(slugify(product.brand)) ? 0.15 : 0
      return {
        product,
        confidence: Math.min(0.99, score + brandBoost)
      }
    })
    .sort((left, right) => right.confidence - left.confidence)

  const best = scored[0]
  if (!best || best.confidence < 0.9) {
    return {
      productId: null,
      confidence: best?.confidence || 0,
      strategy: 'none',
      reason: 'No ASIN match and brand/model confidence is below the 90% acceptance threshold.'
    }
  }

  return {
    productId: best.product.id,
    confidence: best.confidence,
    strategy: 'brand-model',
    reason: 'Accepted high-confidence brand/model match after ASIN fallback was unavailable.'
  }
}

export function classifyLinkHealth({
  httpStatus,
  responseSnippet
}: {
  httpStatus: number | null
  responseSnippet?: string | null
}): LinkHealthResult {
  const snippet = (responseSnippet || '').toLowerCase()

  if (httpStatus && httpStatus >= 400) {
    return { status: 'broken', httpStatus, reason: `HTTP ${httpStatus} from merchant or redirect target.` }
  }

  if (
    snippet.includes('currently unavailable') ||
    snippet.includes('out of stock') ||
    snippet.includes('temporarily unavailable')
  ) {
    return { status: 'out_of_stock', httpStatus, reason: 'Merchant page indicates unavailable or out of stock.' }
  }

  if (httpStatus && httpStatus >= 200 && httpStatus < 400) {
    return { status: 'active', httpStatus, reason: 'Merchant target responded without stock-failure markers.' }
  }

  return { status: 'unknown', httpStatus, reason: 'No reliable HTTP or stock signal was available.' }
}

export async function resolveAmazonRedirectUrl(url: string, timeoutMs = 8000): Promise<string | null> {
  try {
    const response = await fetch(url, {
      method: 'HEAD',
      redirect: 'follow',
      signal: AbortSignal.timeout(timeoutMs)
    })
    return response.url || url
  } catch {
    try {
      const response = await fetch(url, {
        method: 'GET',
        redirect: 'follow',
        signal: AbortSignal.timeout(timeoutMs)
      })
      return response.url || url
    } catch {
      return null
    }
  }
}

export async function resolveAmazonAsinsFromDescription(description: string): Promise<string[]> {
  const direct = extractAsins(description)
  const urls = extractAmazonUrls(description)
  const resolved = await Promise.all(urls.map((url) => resolveAmazonRedirectUrl(url)))
  return Array.from(new Set([...direct, ...resolved.flatMap((url) => (url ? extractAsins(url) : []))]))
}
