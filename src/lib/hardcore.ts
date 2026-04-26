import { getDatabase } from '@/lib/db'
import { HARDCORE_CATEGORIES, type HardcoreCategory } from '@/lib/hardcore-catalog'
import { slugify } from '@/lib/slug'

export type HardcoreRating = 'Excellent' | 'Good' | 'Average' | 'Struggles' | 'Fails'
export type EntryStatus = 'best-deal' | 'great-value' | 'normal' | 'overpriced' | 'unknown'
export type ConfidenceLevel = 'High' | 'Medium' | 'Low' | 'Researching'

export { HARDCORE_CATEGORIES, type HardcoreCategory } from '@/lib/hardcore-catalog'

export interface HardcoreTag {
  id: number | null
  categorySlug: string
  name: string
  slug: string
  keywords: string[]
  searchVolume: number
  isCorePainpoint: boolean
  status: string
}

export interface EvidenceReport {
  id: number
  productId: number
  tagId: number | null
  tagName: string
  tagSlug: string
  rating: HardcoreRating
  ratingScore: number
  evidenceQuote: string
  timestampSeconds: number | null
  contextSnippet: string | null
  evidenceConfidence: number
  evidenceType: string
  isAdvertorial: boolean
  channelName: string
  channelUrl: string | null
  youtubeId: string | null
  bloggerRank: number
  authorityTier: string
  videoTitle: string
  negativeFeedbackCount: number
  usefulFeedbackCount: number
  videoNegativeFeedbackCount: number
  feedbackPenalty: number
}

export interface ConsensusSummary {
  score5: number | null
  score10: number | null
  confidence: ConfidenceLevel
  evidenceCount: number
  sourceCount: number
  controversy: boolean
  frozenForReview: boolean
  badge: 'Hardcore Choice' | 'Do Not Buy' | 'Highly Controversial' | 'Frozen for Review' | 'Researching' | null
  bestQuote: EvidenceReport | null
  worstQuote: EvidenceReport | null
}

export interface PriceValueSummary {
  currentPrice: number | null
  histLowPrice: number | null
  avg90dPrice: number | null
  currency: string
  valueScore: number | null
  entryStatus: EntryStatus
  label: string
  explanation: string
}

export interface HardcoreProduct {
  id: number
  slug: string
  brand: string | null
  name: string
  categorySlug: string
  categoryName: string
  description: string | null
  imageUrl: string | null
  asin: string | null
  affiliateUrl: string | null
  affiliateStatus: string | null
  consensus: ConsensusSummary
  price: PriceValueSummary
  topTags: HardcoreTag[]
  evidence: EvidenceReport[]
}

interface ProductRow {
  id: number
  slug: string | null
  brand: string | null
  product_name: string
  category: string | null
  description: string | null
  asin: string | null
  hero_image_url: string | null
  source_affiliate_link: string | null
  resolved_url: string | null
  affiliate_status: string | null
  price_amount: number | null
  price_currency: string | null
  current_price: number | null
  hist_low_price: number | null
  avg_90d_price: number | null
}

interface TagRow {
  id: number
  category_slug: string
  canonical_name: string
  slug: string
  keywords_json: string | null
  search_volume: number | null
  is_core_painpoint: number | boolean | null
  status: string | null
}

interface EvidenceRow {
  id: number
  product_id: number
  tag_id: number | null
  tag_name: string | null
  tag_slug: string | null
  rating: string
  evidence_quote: string
  timestamp_seconds: number | null
  context_snippet: string | null
  evidence_confidence: number | null
  evidence_type: string | null
  is_advertorial: number | boolean | null
  channel_name: string | null
  channel_url: string | null
  youtube_id: string | null
  blogger_rank: number | null
  authority_tier: string | null
  video_title: string | null
  negative_feedback_count: number | null
  useful_feedback_count: number | null
  video_negative_feedback_count: number | null
}

const RATING_SCORE: Record<HardcoreRating, number> = {
  Excellent: 5,
  Good: 4,
  Average: 3,
  Struggles: 2,
  Fails: 1
}

const EVIDENCE_WEIGHT: Record<string, number> = {
  'lab-test': 1.2,
  'side-by-side': 1.1,
  'standard-review': 1,
  shorts: 0.7
}

function parseJsonArray(value: string | null): string[] {
  if (!value) return []
  try {
    const parsed = JSON.parse(value)
    if (Array.isArray(parsed)) return parsed.map((item) => String(item)).filter(Boolean)
    if (parsed && typeof parsed === 'object') {
      return Object.values(parsed).flatMap((item) => (Array.isArray(item) ? item.map(String) : [String(item)])).filter(Boolean)
    }
  } catch {
    return []
  }
  return []
}

function normalizeRating(value: string): HardcoreRating | null {
  const match = (['Excellent', 'Good', 'Average', 'Struggles', 'Fails'] as HardcoreRating[]).find(
    (rating) => rating.toLowerCase() === value.toLowerCase()
  )
  return match || null
}

function findCategory(value: string | null | undefined): HardcoreCategory | null {
  if (!value) return null
  const normalized = slugify(value)
  return HARDCORE_CATEGORIES.find((category) => category.slug === normalized || slugify(category.name) === normalized) || null
}

function fallbackTagsForCategory(category: HardcoreCategory): HardcoreTag[] {
  return category.painpoints.map((name, index) => ({
    id: null,
    categorySlug: category.slug,
    name,
    slug: slugify(name),
    keywords: category.redditSeeds.filter((seed) => seed.toLowerCase().includes(name.split(' ')[0].toLowerCase())),
    searchVolume: Math.max(1000 - index * 120, 100),
    isCorePainpoint: index < 4,
    status: 'researching'
  }))
}

function mapTagRow(row: TagRow): HardcoreTag {
  return {
    id: row.id,
    categorySlug: row.category_slug,
    name: row.canonical_name,
    slug: row.slug,
    keywords: parseJsonArray(row.keywords_json),
    searchVolume: Number(row.search_volume || 0),
    isCorePainpoint: Boolean(row.is_core_painpoint),
    status: row.status || 'active'
  }
}

function mapEvidenceRow(row: EvidenceRow): EvidenceReport | null {
  const rating = normalizeRating(row.rating)
  if (!rating) return null
  const negativeFeedbackCount = Number(row.negative_feedback_count || 0)
  const usefulFeedbackCount = Number(row.useful_feedback_count || 0)
  const videoNegativeFeedbackCount = Number(row.video_negative_feedback_count || 0)
  const feedbackPenalty = Math.min(0.8, negativeFeedbackCount * 0.15 + videoNegativeFeedbackCount * 0.08)
  const usefulBoost = Math.min(0.2, usefulFeedbackCount * 0.03)
  const evidenceConfidence = Math.max(0.1, Number(row.evidence_confidence || 1) + usefulBoost - feedbackPenalty)

  return {
    id: row.id,
    productId: row.product_id,
    tagId: row.tag_id,
    tagName: row.tag_name || 'Unmapped scenario',
    tagSlug: row.tag_slug || 'unmapped-scenario',
    rating,
    ratingScore: RATING_SCORE[rating],
    evidenceQuote: row.evidence_quote,
    timestampSeconds: row.timestamp_seconds,
    contextSnippet: row.context_snippet,
    evidenceConfidence,
    evidenceType: row.evidence_type || 'standard-review',
    isAdvertorial: Boolean(row.is_advertorial),
    channelName: row.channel_name || 'Unknown reviewer',
    channelUrl: row.channel_url,
    youtubeId: row.youtube_id,
    bloggerRank: Number(row.blogger_rank || 1),
    authorityTier: row.authority_tier || 'general',
    videoTitle: row.video_title || 'Review evidence',
    negativeFeedbackCount,
    usefulFeedbackCount,
    videoNegativeFeedbackCount,
    feedbackPenalty
  }
}

export function summarizeConsensus(evidence: EvidenceReport[]): ConsensusSummary {
  if (!evidence.length) {
    return {
      score5: null,
      score10: null,
      confidence: 'Researching',
      evidenceCount: 0,
      sourceCount: 0,
      controversy: false,
      frozenForReview: false,
      badge: 'Researching',
      bestQuote: null,
      worstQuote: null
    }
  }

  let numerator = 0
  let denominator = 0
  const scores: number[] = []
  const channels = new Set<string>()

  for (const report of evidence) {
    const evidenceWeight = EVIDENCE_WEIGHT[report.evidenceType] || 1
    const shillWeight = report.isAdvertorial ? 0.1 : 1
    const weight = Math.max(0.05, report.bloggerRank * report.evidenceConfidence * evidenceWeight * shillWeight)
    numerator += report.ratingScore * weight
    denominator += weight
    scores.push(report.ratingScore)
    channels.add(report.channelName)
  }

  const score5 = denominator > 0 ? numerator / denominator : null
  const mean = scores.reduce((total, score) => total + score, 0) / scores.length
  const variance = scores.reduce((total, score) => total + Math.pow(score - mean, 2), 0) / scores.length
  const standardDeviation = Math.sqrt(variance)
  const controversy = standardDeviation > 1.2 && evidence.length >= 3
  const expertSources = evidence.filter((report) => report.bloggerRank >= 1.5 && !report.isAdvertorial).length
  const tier4HighPraise = evidence.filter((report) => report.bloggerRank <= 0.75 && report.ratingScore >= 4 && !report.isAdvertorial).length
  const frozenForReview = evidence.length >= 4 && tier4HighPraise / evidence.length >= 0.6 && expertSources === 0
  const confidence: ConfidenceLevel =
    frozenForReview
      ? 'Low'
      : evidence.length >= 3 && expertSources >= 2 && !controversy
        ? 'High'
        : evidence.length >= 2
          ? 'Medium'
          : 'Low'
  const bestQuote = [...evidence].sort((left, right) => right.ratingScore - left.ratingScore || right.bloggerRank - left.bloggerRank)[0] || null
  const worstQuote = [...evidence].sort((left, right) => left.ratingScore - right.ratingScore || right.bloggerRank - left.bloggerRank)[0] || null
  const badge = controversy
    ? 'Highly Controversial'
    : frozenForReview
      ? 'Frozen for Review'
      : score5 != null && score5 > 4.5 && confidence === 'High'
      ? 'Hardcore Choice'
      : score5 != null && score5 < 2.5 && evidence.length >= 2
        ? 'Do Not Buy'
        : null

  return {
    score5,
    score10: score5 == null ? null : score5 * 2,
    confidence,
    evidenceCount: evidence.length,
    sourceCount: channels.size,
    controversy,
    frozenForReview,
    badge,
    bestQuote,
    worstQuote
  }
}

export function summarizePriceValue({
  currentPrice,
  histLowPrice,
  avg90dPrice,
  currency,
  consensusScore5
}: {
  currentPrice: number | null
  histLowPrice: number | null
  avg90dPrice: number | null
  currency: string | null
  consensusScore5: number | null
}): PriceValueSummary {
  const resolvedCurrency = currency || 'USD'
  const valueScore = currentPrice && consensusScore5 ? (consensusScore5 * 100) / currentPrice : null
  let entryStatus: EntryStatus = 'unknown'

  if (currentPrice != null && histLowPrice != null && currentPrice <= histLowPrice) {
    entryStatus = 'best-deal'
  } else if (currentPrice != null && avg90dPrice != null && currentPrice < avg90dPrice * 0.9) {
    entryStatus = 'great-value'
  } else if (currentPrice != null && avg90dPrice != null && currentPrice > avg90dPrice * 1.1) {
    entryStatus = 'overpriced'
  } else if (currentPrice != null && avg90dPrice != null) {
    entryStatus = 'normal'
  }

  const copy: Record<EntryStatus, { label: string; explanation: string }> = {
    'best-deal': {
      label: 'Absolute Lowest Price',
      explanation: 'Current price is at or below the tracked historical low.'
    },
    'great-value': {
      label: 'Below Average Price',
      explanation: 'Current price is more than 10% below the 90-day average.'
    },
    normal: {
      label: 'Normal Price Window',
      explanation: 'Current price is inside the normal 90-day range.'
    },
    overpriced: {
      label: 'Wait for Sale',
      explanation: 'Current price is more than 10% above the 90-day average.'
    },
    unknown: {
      label: 'Price Baseline Pending',
      explanation: 'Not enough current and historical price data to call the entry point.'
    }
  }

  return {
    currentPrice,
    histLowPrice,
    avg90dPrice,
    currency: resolvedCurrency,
    valueScore,
    entryStatus,
    ...copy[entryStatus]
  }
}

async function listTagRows(categorySlug?: string): Promise<HardcoreTag[]> {
  const db = await getDatabase()
  const rows = await db.query<TagRow>(
    `
      SELECT id, category_slug, canonical_name, slug, keywords_json, search_volume, is_core_painpoint, status
      FROM taxonomy_tags
      WHERE (status IS NULL OR status != 'paused')
      ${categorySlug ? 'AND category_slug = ?' : ''}
      ORDER BY is_core_painpoint DESC, search_volume DESC, canonical_name ASC
    `,
    categorySlug ? [categorySlug] : []
  )
  return rows.map(mapTagRow)
}

async function listProductRows(): Promise<ProductRow[]> {
  const db = await getDatabase()
  return db.query<ProductRow>(
    `
      SELECT
        p.id,
        p.slug,
        p.brand,
        p.product_name,
        p.category,
        p.description,
        COALESCE(p.asin, ap.asin) AS asin,
        (
          SELECT public_url
          FROM product_media_assets
          WHERE product_id = p.id AND is_public = 1
          ORDER BY CASE asset_role WHEN 'hero' THEN 0 WHEN 'thumbnail' THEN 1 ELSE 2 END, id ASC
          LIMIT 1
        ) AS hero_image_url,
        p.source_affiliate_link,
        p.resolved_url,
        (
          SELECT status
          FROM affiliate_links
          WHERE product_id = p.id
          ORDER BY CASE status WHEN 'active' THEN 0 WHEN 'unknown' THEN 1 ELSE 2 END, updated_at DESC
          LIMIT 1
        ) AS affiliate_status,
        p.price_amount,
        p.price_currency,
        p.current_price,
        p.hist_low_price,
        p.avg_90d_price
      FROM products p
      LEFT JOIN affiliate_products ap ON ap.id = p.affiliate_product_id
      WHERE p.slug IS NOT NULL
      ORDER BY p.updated_at DESC, p.id DESC
      LIMIT 250
    `
  )
}

async function listEvidenceForProducts(productIds: number[]): Promise<Map<number, EvidenceReport[]>> {
  const map = new Map<number, EvidenceReport[]>()
  if (!productIds.length) return map

  const placeholders = productIds.map(() => '?').join(', ')
  const db = await getDatabase()
  const rows = await db.query<EvidenceRow>(
    `
      SELECT
        ar.id,
        ar.product_id,
        ar.tag_id,
        tt.canonical_name AS tag_name,
        tt.slug AS tag_slug,
        ar.rating,
        ar.evidence_quote,
        ar.timestamp_seconds,
        ar.context_snippet,
        ar.evidence_confidence,
        ar.evidence_type,
        ar.is_advertorial,
        rv.channel_name,
        rv.channel_url,
        rv.youtube_id,
        rv.blogger_rank,
        rv.authority_tier,
        rv.title AS video_title,
        (
          SELECT COUNT(*)
          FROM creator_feedback_events cfe
          WHERE cfe.analysis_report_id = ar.id
            AND cfe.feedback_type IN ('inaccurate', 'wrong-product', 'bad-quote')
        ) AS negative_feedback_count,
        (
          SELECT COUNT(*)
          FROM creator_feedback_events cfe
          WHERE cfe.analysis_report_id = ar.id
            AND cfe.feedback_type = 'useful'
        ) AS useful_feedback_count,
        (
          SELECT COUNT(*)
          FROM creator_feedback_events cfe
          WHERE cfe.video_id = ar.video_id
            AND cfe.feedback_type IN ('inaccurate', 'wrong-product', 'bad-quote')
        ) AS video_negative_feedback_count
      FROM analysis_reports ar
      LEFT JOIN taxonomy_tags tt ON tt.id = ar.tag_id
      LEFT JOIN review_videos rv ON rv.id = ar.video_id
      WHERE ar.product_id IN (${placeholders})
      ORDER BY ar.created_at DESC, ar.id DESC
    `,
    productIds
  )

  for (const row of rows) {
    const report = mapEvidenceRow(row)
    if (!report) continue
    if (report.isAdvertorial && report.ratingScore >= 3) continue
    const items = map.get(report.productId) || []
    items.push(report)
    map.set(report.productId, items)
  }

  return map
}

function tagsForProduct(allTags: HardcoreTag[], evidence: EvidenceReport[], category: HardcoreCategory): HardcoreTag[] {
  const evidenceSlugs = new Set(evidence.map((report) => report.tagSlug))
  const matched = allTags.filter((tag) => tag.categorySlug === category.slug && evidenceSlugs.has(tag.slug))
  if (matched.length) return matched.slice(0, 6)
  return allTags.filter((tag) => tag.categorySlug === category.slug).slice(0, 6)
}

function mapProduct(row: ProductRow, tags: HardcoreTag[], evidence: EvidenceReport[]): HardcoreProduct | null {
  const category = findCategory(row.category)
  if (!category || !row.slug) return null
  const consensus = summarizeConsensus(evidence)
  const currentPrice = row.current_price ?? row.price_amount
  const price = summarizePriceValue({
    currentPrice,
    histLowPrice: row.hist_low_price,
    avg90dPrice: row.avg_90d_price,
    currency: row.price_currency,
    consensusScore5: consensus.score5
  })

  return {
    id: row.id,
    slug: row.slug,
    brand: row.brand,
    name: row.product_name,
    categorySlug: category.slug,
    categoryName: category.name,
    description: row.description,
    imageUrl: row.hero_image_url,
    asin: row.asin,
    affiliateUrl: row.resolved_url || row.source_affiliate_link,
    affiliateStatus: row.affiliate_status || null,
    consensus,
    price,
    topTags: tagsForProduct(tags, evidence, category),
    evidence
  }
}

export async function listHardcoreTags(categorySlug?: string): Promise<HardcoreTag[]> {
  const dbTags = await listTagRows(categorySlug)
  if (dbTags.length) return dbTags
  if (categorySlug) {
    const category = HARDCORE_CATEGORIES.find((item) => item.slug === categorySlug)
    return category ? fallbackTagsForCategory(category) : []
  }
  return HARDCORE_CATEGORIES.flatMap(fallbackTagsForCategory)
}

export async function listHardcoreProducts(categorySlug?: string): Promise<HardcoreProduct[]> {
  const [rows, tags] = await Promise.all([listProductRows(), listHardcoreTags()])
  const evidenceByProduct = await listEvidenceForProducts(rows.map((row) => row.id))
  return rows
    .map((row) => mapProduct(row, tags, evidenceByProduct.get(row.id) || []))
    .filter((product): product is HardcoreProduct => Boolean(product))
    .filter((product) => !categorySlug || product.categorySlug === categorySlug)
    .sort((left, right) => {
      const scoreDelta = (right.consensus.score10 || 0) - (left.consensus.score10 || 0)
      if (scoreDelta) return scoreDelta
      return (right.price.valueScore || 0) - (left.price.valueScore || 0)
    })
}

export async function getHardcoreProductBySlug(slug: string): Promise<HardcoreProduct | null> {
  const products = await listHardcoreProducts()
  return products.find((product) => product.slug === slug) || null
}

export async function getHardcoreCategory(slug: string) {
  const category = HARDCORE_CATEGORIES.find((item) => item.slug === slug) || null
  if (!category) return null
  const [products, tags] = await Promise.all([listHardcoreProducts(slug), listHardcoreTags(slug)])
  return { category, products, tags }
}

export async function getHardcoreHome() {
  const [products, tags] = await Promise.all([listHardcoreProducts(), listHardcoreTags()])
  const categorySummaries = HARDCORE_CATEGORIES.map((category) => {
    const categoryProducts = products.filter((product) => product.categorySlug === category.slug)
    const evidenceCount = categoryProducts.reduce((total, product) => total + product.consensus.evidenceCount, 0)
    return {
      category,
      productCount: categoryProducts.length,
      evidenceCount,
      coreTags: tags.filter((tag) => tag.categorySlug === category.slug).slice(0, 4),
      status: categoryProducts.length >= 3 && evidenceCount > 0 ? 'Live matrix' : 'Researching'
    }
  })
  const bestValueProducts = products
    .filter((product) => product.price.valueScore != null)
    .sort((left, right) => (right.price.valueScore || 0) - (left.price.valueScore || 0))
    .slice(0, 6)

  return {
    categories: categorySummaries,
    products,
    bestValueProducts,
    tags
  }
}

export async function getScenarioLandingPage(categorySlug: string, routeSlug: string) {
  const category = HARDCORE_CATEGORIES.find((item) => item.slug === categorySlug) || null
  if (!category) return null
  const tagSlug = routeSlug.startsWith(`${categorySlug}-for-`)
    ? routeSlug.slice(`${categorySlug}-for-`.length)
    : routeSlug.replace(/^.*-for-/, '')
  const [products, tags] = await Promise.all([listHardcoreProducts(categorySlug), listHardcoreTags(categorySlug)])
  const tag = tags.find((item) => item.slug === tagSlug) || fallbackTagsForCategory(category).find((item) => item.slug === tagSlug) || null
  if (!tag) return null
  const taggedProducts = products
    .map((product) => {
      const matchingEvidence = product.evidence.filter((report) => report.tagSlug === tag.slug)
      return {
        ...product,
        consensus: summarizeConsensus(matchingEvidence.length ? matchingEvidence : product.evidence),
        evidence: matchingEvidence.length ? matchingEvidence : product.evidence
      }
    })
    .sort((left, right) => (right.consensus.score10 || 0) - (left.consensus.score10 || 0))
  return {
    category,
    tag,
    products: taggedProducts,
    status: taggedProducts.filter((product) => product.consensus.evidenceCount > 0).length >= 3 ? 'live' : 'researching'
  }
}

export async function getMultiConstraintLandingPage(categorySlug: string, landingSlug: string) {
  const category = HARDCORE_CATEGORIES.find((item) => item.slug === categorySlug) || null
  const suffix = `-${categorySlug}`
  if (!category || !landingSlug.startsWith('best-') || !landingSlug.endsWith(suffix)) return null

  const middle = landingSlug.slice('best-'.length, -suffix.length)
  const [products, tags] = await Promise.all([listHardcoreProducts(categorySlug), listHardcoreTags(categorySlug)])
  const categoryTags = tags.filter((tag) => tag.categorySlug === categorySlug)
  let matchedTags: HardcoreTag[] = []

  for (const first of categoryTags) {
    for (const second of categoryTags) {
      if (first.slug === second.slug) continue
      if (`${first.slug}-${second.slug}` === middle) {
        matchedTags = [first, second]
        break
      }
    }
    if (matchedTags.length) break
  }

  if (matchedTags.length < 2) return null

  const required = new Set(matchedTags.map((tag) => tag.slug))
  const constrainedProducts = products
    .map((product) => {
      const matchingEvidence = product.evidence.filter((report) => required.has(report.tagSlug))
      const coveredTags = new Set(matchingEvidence.map((report) => report.tagSlug))
      const complete = matchedTags.every((tag) => coveredTags.has(tag.slug))
      return {
        ...product,
        consensus: summarizeConsensus(matchingEvidence.length ? matchingEvidence : product.evidence),
        evidence: matchingEvidence.length ? matchingEvidence : product.evidence,
        constraintCoverage: complete ? matchedTags.length : coveredTags.size
      }
    })
    .sort((left, right) => {
      const coverageDelta = right.constraintCoverage - left.constraintCoverage
      if (coverageDelta) return coverageDelta
      return (right.consensus.score10 || 0) - (left.consensus.score10 || 0)
    })

  return {
    category,
    tags: matchedTags,
    products: constrainedProducts,
    status: constrainedProducts.filter((product) => product.constraintCoverage >= matchedTags.length).length >= 3 ? 'live' : 'researching'
  }
}

export async function getValueLandingPage(routeSlug: string) {
  const match = routeSlug.match(/^(.+)-under-(\d+)$/)
  if (!match) return null
  const categorySlug = match[1]
  const priceLimit = Number(match[2])
  const category = HARDCORE_CATEGORIES.find((item) => item.slug === categorySlug) || null
  if (!category || !Number.isFinite(priceLimit)) return null
  const products = (await listHardcoreProducts(categorySlug))
    .filter(
      (product) =>
        product.price.currentPrice != null &&
        product.price.currentPrice <= priceLimit &&
        product.consensus.score5 != null &&
        product.consensus.score5 >= 4
    )
    .sort((left, right) => (right.price.valueScore || 0) - (left.price.valueScore || 0))
  return {
    category,
    priceLimit,
    products,
    status: products.length >= 3 ? 'live' : 'researching'
  }
}

export function formatHardcorePrice(value: number | null, currency: string = 'USD'): string {
  if (value == null || !Number.isFinite(value)) return 'Price pending'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: value >= 100 ? 0 : 2
  }).format(value)
}
