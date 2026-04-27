import { getDatabase } from '@/lib/db'
import {
  buildProductIdentityEnrichment,
  normalizeProductAcquisitionHints,
  parseRawPayload,
  type ProductAcquisitionHints
} from '@/lib/product-acquisition'
import { getSettingValue } from '@/lib/settings'

export interface SyncResult {
  total: number
  created: number
  updated: number
  createdIds: number[]
  updatedIds: number[]
  pagesFetched: number
  hasMore: boolean
  nextPage: number | null
  remoteTotal?: number | null
}

export interface AffiliateProductRecord {
  id: number
  platform: string
  asin?: string | null
  product_name: string | null
  product_model?: string | null
  model_number?: string | null
  product_type?: string | null
  category?: string | null
  category_slug?: string | null
  youtube_match_terms_json?: string | null
  promo_link: string | null
  short_promo_link: string | null
  product_url: string | null
  brand?: string | null
  image_url?: string | null
  price_amount?: number | null
  price_currency?: string | null
  review_count?: number | null
  rating?: number | null
  country_code?: string | null
  raw_payload?: string | null
  updated_at?: string
}

type AmazonProductResponse = {
  status?: { code?: number; msg?: string }
  data?: {
    list?: Array<Record<string, any>>
    has_more?: boolean
  }
}

type AmazonProductLinkResponse = {
  status?: { code?: number; msg?: string }
  data?: Array<{
    product_id?: string
    link?: string
    partnerboost_link?: string
  }>
}

type AmazonAsinLinkResponse = {
  status?: { code?: number; msg?: string }
  data?: Array<{
    asin?: string
    link?: string
    partnerboost_link?: string
  }>
}

type DtcResponse = {
  status?: { code?: number; msg?: string }
  data?: {
    total?: string
    list?: Array<Record<string, any>>
  }
}

const DEFAULT_SYNC_PAGE_SIZE = 20
const MAX_SYNC_PAGES = 5
const DEFAULT_LINK_BATCH_SIZE = 20
const DEFAULT_FETCH_TIMEOUT_MS = 15_000
const MAX_FETCH_RETRIES = 3

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function normalizeUrl(value: unknown): string | null {
  const text = String(value || '').trim()
  return text || null
}

function normalizeText(value: unknown): string | null {
  const text = String(value || '').replace(/\s+/g, ' ').trim()
  return text || null
}

function normalizeAsin(value: unknown): string | null {
  const text = String(value || '').trim().toUpperCase()
  return text || null
}

function parseNumber(value: unknown): number | null {
  const normalized = String(value ?? '').replace(/[^\d.-]/g, '')
  if (!normalized) return null
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : null
}

function dedupeItems<T>(items: T[], getKey: (item: T) => string): T[] {
  const seen = new Set<string>()
  const result: T[] = []

  for (const item of items) {
    const key = getKey(item)
    if (!key || seen.has(key)) continue
    seen.add(key)
    result.push(item)
  }

  return result
}

function isPartnerboostShortLink(value: string | null): boolean {
  if (!value) return false

  try {
    const parsed = new URL(value)
    const hostname = parsed.hostname.toLowerCase()
    return hostname === 'pboost.me' || hostname.endsWith('.pboost.me')
  } catch {
    return /:\/\/(?:www\.)?pboost\.me\//i.test(value)
  }
}

function resolveAmazonPromoLinks(input: {
  productIdLink?: string | null
  asinLink?: string | null
  asinPartnerboostLink?: string | null
}): {
  promoLink: string | null
  shortPromoLink: string | null
} {
  const productIdLink = normalizeUrl(input.productIdLink)
  const shortPromoLink = normalizeUrl(input.asinPartnerboostLink) || (isPartnerboostShortLink(productIdLink) ? productIdLink : null)
  const promoLink = shortPromoLink || normalizeUrl(input.asinLink) || productIdLink || null

  return {
    promoLink,
    shortPromoLink
  }
}

async function getAffiliateConfig() {
  const amazonToken =
    (await getSettingValue('affiliateSync', 'partnerboostAmazonToken')) ||
    process.env.PARTNERBOOST_AMAZON_TOKEN ||
    ''
  const dtcToken =
    (await getSettingValue('affiliateSync', 'partnerboostDtcToken')) ||
    process.env.PARTNERBOOST_DTC_TOKEN ||
    ''
  const amazonBaseUrl =
    (await getSettingValue('affiliateSync', 'partnerboostAmazonBaseUrl')) ||
    process.env.PARTNERBOOST_AMAZON_BASE_URL ||
    'https://app.partnerboost.com'
  const dtcBaseUrl =
    (await getSettingValue('affiliateSync', 'partnerboostDtcBaseUrl')) ||
    process.env.PARTNERBOOST_DTC_BASE_URL ||
    'https://app.partnerboost.com'

  return { amazonToken, dtcToken, amazonBaseUrl, dtcBaseUrl }
}

async function getNumericAffiliateSetting(key: string, fallback: number): Promise<number> {
  const raw = await getSettingValue('affiliateSync', key)
  const parsed = Number.parseInt(String(raw || ''), 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

async function fetchPartnerboostJson<T>(url: string, init: RequestInit, errorPrefix: string): Promise<T> {
  let lastError: Error | null = null

  for (let attempt = 0; attempt < MAX_FETCH_RETRIES; attempt += 1) {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), DEFAULT_FETCH_TIMEOUT_MS)

    try {
      const response = await fetch(url, {
        ...init,
        signal: controller.signal
      })
      const text = await response.text().catch(() => '')
      if (!response.ok) {
        throw new Error(`${errorPrefix} (${response.status}): ${text.trim().slice(0, 220) || 'request failed'}`)
      }

      if (!text.trim()) {
        throw new Error(`${errorPrefix}: Empty response body`)
      }

      return JSON.parse(text) as T
    } catch (error: any) {
      lastError = error instanceof Error ? error : new Error(String(error))
      if (attempt >= MAX_FETCH_RETRIES - 1) break
      await sleep(300 * (attempt + 1))
    } finally {
      clearTimeout(timeout)
    }
  }

  throw lastError || new Error(errorPrefix)
}

async function fetchAmazonProductLinkMap(baseUrl: string, token: string, productIds: string[]): Promise<Map<string, string>> {
  const map = new Map<string, string>()

  for (let index = 0; index < productIds.length; index += DEFAULT_LINK_BATCH_SIZE) {
    const batchIds = productIds.slice(index, index + DEFAULT_LINK_BATCH_SIZE)
    if (!batchIds.length) continue

    const payload = await fetchPartnerboostJson<AmazonProductLinkResponse>(
      `${baseUrl.replace(/\/$/, '')}/api/datafeed/get_fba_products_link`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          product_ids: batchIds.join(',')
        })
      },
      'Failed to fetch PartnerBoost Amazon product links'
    )

    if (payload.status?.code !== 0) {
      throw new Error(payload.status?.msg || 'Failed to fetch PartnerBoost Amazon product links')
    }

    for (const item of payload.data || []) {
      const productId = String(item.product_id || '').trim()
      const link = normalizeUrl(item.partnerboost_link || item.link)
      if (productId && link) {
        map.set(productId, link)
      }
    }
  }

  return map
}

async function fetchAmazonAsinLinkMap(baseUrl: string, token: string, asins: string[]): Promise<Map<string, { link: string | null; partnerboostLink: string | null }>> {
  const map = new Map<string, { link: string | null; partnerboostLink: string | null }>()

  for (let index = 0; index < asins.length; index += DEFAULT_LINK_BATCH_SIZE) {
    const batchAsins = asins.slice(index, index + DEFAULT_LINK_BATCH_SIZE)
    if (!batchAsins.length) continue

    const payload = await fetchPartnerboostJson<AmazonAsinLinkResponse>(
      `${baseUrl.replace(/\/$/, '')}/api/datafeed/get_amazon_link_by_asin`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          asins: batchAsins.join(','),
          country_code: 'US',
          return_partnerboost_link: 1
        })
      },
      'Failed to fetch PartnerBoost Amazon ASIN links'
    )

    if (payload.status?.code !== 0) {
      throw new Error(payload.status?.msg || 'Failed to fetch PartnerBoost Amazon ASIN links')
    }

    for (const item of payload.data || []) {
      const asin = normalizeAsin(item.asin)
      if (!asin) continue

      map.set(asin, {
        link: normalizeUrl(item.link),
        partnerboostLink: normalizeUrl(item.partnerboost_link)
      })
    }
  }

  return map
}

async function upsertAffiliateProduct(payload: {
  platform: string
  externalId: string
  merchantId?: string | null
  asin?: string | null
  brand?: string | null
  productModel?: string | null
  modelNumber?: string | null
  productType?: string | null
  category?: string | null
  categorySlug?: string | null
  youtubeMatchTerms?: string[] | null
  productName?: string | null
  productUrl?: string | null
  promoLink?: string | null
  shortPromoLink?: string | null
  imageUrl?: string | null
  priceAmount?: number | null
  priceCurrency?: string | null
  commissionRate?: number | null
  reviewCount?: number | null
  rating?: number | null
  countryCode?: string | null
  rawPayload: Record<string, any>
}): Promise<{ id: number; status: 'created' | 'updated' }> {
  const db = await getDatabase()
  const existing = await db.queryOne<{ id: number }>(
    'SELECT id FROM affiliate_products WHERE platform = ? AND external_id = ? LIMIT 1',
    [payload.platform, payload.externalId]
  )

  if (existing?.id) {
    await db.exec(
      `
        UPDATE affiliate_products
        SET merchant_id = ?, asin = ?, brand = ?, product_model = ?, model_number = ?, product_type = ?,
            category = ?, category_slug = ?, product_name = ?, product_url = ?, promo_link = ?,
            short_promo_link = ?, image_url = ?, price_amount = ?, price_currency = ?, commission_rate = ?,
            review_count = ?, rating = ?, country_code = ?, youtube_match_terms_json = ?, raw_payload = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
      [
        payload.merchantId || null,
        payload.asin || null,
        payload.brand || null,
        payload.productModel || null,
        payload.modelNumber || null,
        payload.productType || null,
        payload.category || null,
        payload.categorySlug || null,
        payload.productName || null,
        payload.productUrl || null,
        payload.promoLink || null,
        payload.shortPromoLink || null,
        payload.imageUrl || null,
        payload.priceAmount || null,
        payload.priceCurrency || null,
        payload.commissionRate || null,
        payload.reviewCount || null,
        payload.rating || null,
        payload.countryCode || null,
        payload.youtubeMatchTerms?.length ? JSON.stringify(payload.youtubeMatchTerms) : null,
        JSON.stringify(payload.rawPayload),
        existing.id
      ]
    )
    return {
      id: existing.id,
      status: 'updated'
    }
  }

  const result = await db.exec(
    `
      INSERT INTO affiliate_products (
        platform, external_id, merchant_id, asin, brand, product_model, model_number, product_type, category, category_slug,
        product_name, product_url, promo_link, short_promo_link,
        image_url, price_amount, price_currency, commission_rate, review_count, rating, country_code, raw_payload
        , youtube_match_terms_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      payload.platform,
      payload.externalId,
      payload.merchantId || null,
      payload.asin || null,
      payload.brand || null,
      payload.productModel || null,
      payload.modelNumber || null,
      payload.productType || null,
      payload.category || null,
      payload.categorySlug || null,
      payload.productName || null,
      payload.productUrl || null,
      payload.promoLink || null,
      payload.shortPromoLink || null,
      payload.imageUrl || null,
      payload.priceAmount || null,
      payload.priceCurrency || null,
      payload.commissionRate || null,
      payload.reviewCount || null,
      payload.rating || null,
      payload.countryCode || null,
      JSON.stringify(payload.rawPayload),
      payload.youtubeMatchTerms?.length ? JSON.stringify(payload.youtubeMatchTerms) : null
    ]
  )
  return {
    id: Number(result.lastInsertRowid),
    status: 'created'
  }
}

export async function syncPartnerboostAmazonProducts(pageSize?: number, maxPages?: number): Promise<SyncResult> {
  const { amazonToken, amazonBaseUrl } = await getAffiliateConfig()
  if (!amazonToken) throw new Error('PARTNERBOOST_AMAZON_TOKEN is not configured')
  const effectivePageSize = pageSize || await getNumericAffiliateSetting('amazonPageSize', DEFAULT_SYNC_PAGE_SIZE)
  const effectiveMaxPages = maxPages || await getNumericAffiliateSetting('maxPagesPerSync', MAX_SYNC_PAGES)

  let total = 0
  let created = 0
  let updated = 0
  const createdIds: number[] = []
  const updatedIds: number[] = []
  let page = 1
  let pagesFetched = 0
  let hasMore = false

  while (page <= Math.max(1, effectiveMaxPages)) {
    const payload = await fetchPartnerboostJson<AmazonProductResponse>(
      `${amazonBaseUrl.replace(/\/$/, '')}/api/datafeed/get_fba_products`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: amazonToken,
          page_size: effectivePageSize,
          page,
          default_filter: 0,
          country_code: 'US',
          relationship: 1
        })
      },
      'Failed to sync PartnerBoost Amazon products'
    )
    if (payload.status?.code !== 0) {
      throw new Error(payload.status?.msg || 'Failed to sync PartnerBoost Amazon products')
    }

    const list = dedupeItems(payload.data?.list || [], (item) => String(item.product_id || '').trim() || normalizeAsin(item.asin) || '')
    total += list.length
    pagesFetched += 1
    hasMore = payload.data?.has_more === true

    const productIds = list
      .map((item) => String(item.product_id || '').trim())
      .filter(Boolean)
    const productLinkMap = await fetchAmazonProductLinkMap(amazonBaseUrl, amazonToken, productIds)
    const missingAsins = Array.from(
      new Set(
        list
          .filter((item) => {
            const productId = String(item.product_id || '').trim()
            return !productId || !productLinkMap.has(productId)
          })
          .map((item) => normalizeAsin(item.asin))
          .filter((asin): asin is string => Boolean(asin))
      )
    )
    const asinLinkMap = await fetchAmazonAsinLinkMap(amazonBaseUrl, amazonToken, missingAsins)

    for (const item of list) {
      const productId = String(item.product_id || '').trim()
      const asin = normalizeAsin(item.asin)
      const identity = buildProductIdentityEnrichment({
        productName: normalizeText(item.product_name),
        brand: normalizeText(item.brand_name),
        category: normalizeText(item.category || item.subcategory),
        rawPayload: item,
        hints: normalizeProductAcquisitionHints(item)
      })
      const resolvedLinks = resolveAmazonPromoLinks({
        productIdLink: productLinkMap.get(productId) || null,
        asinLink: asin ? asinLinkMap.get(asin)?.link || null : null,
        asinPartnerboostLink: asin ? asinLinkMap.get(asin)?.partnerboostLink || null : null
      })
      const result = await upsertAffiliateProduct({
        platform: 'partnerboost_amazon',
        externalId: productId,
        merchantId: String(item.brand_id || ''),
        asin,
        brand: normalizeText(item.brand_name),
        productModel: identity.productModel,
        modelNumber: identity.modelNumber,
        productType: identity.productType,
        category: identity.category,
        categorySlug: identity.categorySlug,
        productName: normalizeText(item.product_name),
        productUrl: normalizeUrl(item.url),
        promoLink: resolvedLinks.promoLink,
        shortPromoLink: resolvedLinks.shortPromoLink,
        imageUrl: normalizeUrl(item.image),
        priceAmount: parseNumber(item.discount_price) ?? parseNumber(item.original_price),
        priceCurrency: normalizeText(item.currency) || 'USD',
        commissionRate: parseNumber(item.commission),
        reviewCount: parseNumber(item.reviews),
        rating: parseNumber(item.rating),
        countryCode: normalizeText(item.country_code) || 'US',
        youtubeMatchTerms: identity.youtubeMatchTerms,
        rawPayload: {
          ...item,
          resolvedPromoLink: resolvedLinks.promoLink,
          resolvedShortPromoLink: resolvedLinks.shortPromoLink
        }
      })
      if (result.status === 'created') {
        created += 1
        createdIds.push(result.id)
      }
      if (result.status === 'updated') {
        updated += 1
        updatedIds.push(result.id)
      }
    }

    if (!hasMore || list.length === 0) break
    page += 1
  }

  return {
    total,
    created,
    updated,
    createdIds,
    updatedIds,
    pagesFetched,
    hasMore,
    nextPage: hasMore ? pagesFetched + 1 : null,
    remoteTotal: null
  }
}

export async function syncPartnerboostDtcProducts(limit?: number, maxPages?: number): Promise<SyncResult> {
  const { dtcToken, dtcBaseUrl } = await getAffiliateConfig()
  if (!dtcToken) throw new Error('PARTNERBOOST_DTC_TOKEN is not configured')
  const effectiveLimit = limit || await getNumericAffiliateSetting('dtcPageSize', DEFAULT_SYNC_PAGE_SIZE)
  const effectiveMaxPages = maxPages || await getNumericAffiliateSetting('maxPagesPerSync', MAX_SYNC_PAGES)

  let total = 0
  let created = 0
  let updated = 0
  const createdIds: number[] = []
  const updatedIds: number[] = []
  let page = 1
  let pagesFetched = 0
  let hasMore = false
  let remoteTotal: number | null = null

  while (page <= Math.max(1, effectiveMaxPages)) {
    const payload = await fetchPartnerboostJson<DtcResponse>(
      `${dtcBaseUrl.replace(/\/$/, '')}/api.php?mod=datafeed&op=list`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: dtcToken,
          brand_type: 'DTC',
          page,
          limit: effectiveLimit
        })
      },
      'Failed to sync PartnerBoost DTC products'
    )
    if (payload.status?.code !== 0) {
      throw new Error(payload.status?.msg || 'Failed to sync PartnerBoost DTC products')
    }

    const list = dedupeItems(payload.data?.list || [], (item) => String(item.creative_id || item.sku || item.url || '').trim())
    total += list.length
    pagesFetched += 1
    remoteTotal = Number(payload.data?.total || 0) || null
    hasMore = remoteTotal ? page * effectiveLimit < remoteTotal : list.length === effectiveLimit

    for (const item of list) {
      const identity = buildProductIdentityEnrichment({
        productName: normalizeText(item.name),
        brand: normalizeText(item.brand || item.merchant_name),
        category: normalizeText(item.category || item.subcategory),
        rawPayload: item,
        hints: normalizeProductAcquisitionHints(item)
      })
      const result = await upsertAffiliateProduct({
        platform: 'partnerboost_dtc',
        externalId: String(item.creative_id || item.sku || item.url),
        merchantId: String(item.brand_id || item.mcid || ''),
        brand: normalizeText(item.brand || item.merchant_name),
        productModel: identity.productModel,
        modelNumber: identity.modelNumber,
        productType: identity.productType,
        category: identity.category,
        categorySlug: identity.categorySlug,
        productName: normalizeText(item.name),
        productUrl: normalizeUrl(item.url),
        promoLink: normalizeUrl(item.tracking_url || item.tracking_url_short || item.tracking_url_smart),
        shortPromoLink: normalizeUrl(item.tracking_url_short || item.tracking_url_smart),
        imageUrl: normalizeUrl(item.image),
        priceAmount: parseNumber(item.price),
        priceCurrency: normalizeText(item.currency) || 'USD',
        countryCode: 'US',
        youtubeMatchTerms: identity.youtubeMatchTerms,
        rawPayload: item
      })
      if (result.status === 'created') {
        created += 1
        createdIds.push(result.id)
      }
      if (result.status === 'updated') {
        updated += 1
        updatedIds.push(result.id)
      }
    }

    if (!hasMore || list.length === 0) break
    page += 1
  }

  return {
    total,
    created,
    updated,
    createdIds,
    updatedIds,
    pagesFetched,
    hasMore,
    nextPage: hasMore ? pagesFetched + 1 : null,
    remoteTotal
  }
}

export async function listAffiliateProducts(): Promise<AffiliateProductRecord[]> {
  const db = await getDatabase()
  return db.query<AffiliateProductRecord>(
    `
      SELECT *
      FROM affiliate_products
      ORDER BY updated_at DESC, id DESC
    `
  )
}

export async function getAffiliateProductById(id: number): Promise<AffiliateProductRecord | null> {
  const db = await getDatabase()
  const product = await db.queryOne<AffiliateProductRecord>('SELECT * FROM affiliate_products WHERE id = ? LIMIT 1', [id])
  return product || null
}

export async function upsertManualAffiliateLink(link: string, hints: ProductAcquisitionHints = {}): Promise<number> {
  const db = await getDatabase()
  const rawPayload = {
    source: 'manual',
    acquisitionHints: hints
  }
  const identity = buildProductIdentityEnrichment({
    productName: hints.productModel || link,
    brand: hints.brandName || null,
    category: hints.category || null,
    rawPayload,
    hints
  })
  const existing = await db.queryOne<{ id: number }>(
    'SELECT id FROM affiliate_products WHERE platform = ? AND promo_link = ? LIMIT 1',
    ['manual', link]
  )
  if (existing?.id) {
    await db.exec(
      `
        UPDATE affiliate_products
        SET brand = COALESCE(?, brand),
            product_model = COALESCE(?, product_model),
            model_number = COALESCE(?, model_number),
            product_type = COALESCE(?, product_type),
            category = COALESCE(?, category),
            category_slug = COALESCE(?, category_slug),
            youtube_match_terms_json = COALESCE(?, youtube_match_terms_json),
            raw_payload = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
      [
        hints.brandName || null,
        identity.productModel,
        identity.modelNumber,
        identity.productType,
        identity.category,
        identity.categorySlug,
        identity.youtubeMatchTerms.length ? JSON.stringify(identity.youtubeMatchTerms) : null,
        JSON.stringify({
          ...parseRawPayload((await db.queryOne<{ raw_payload: string | null }>('SELECT raw_payload FROM affiliate_products WHERE id = ? LIMIT 1', [existing.id]))?.raw_payload),
          ...rawPayload
        }),
        existing.id
      ]
    )
    return existing.id
  }

  const result = await db.exec(
    `
      INSERT INTO affiliate_products (
        platform, external_id, brand, product_model, model_number, product_type, category, category_slug,
        product_name, promo_link, product_url, country_code, youtube_match_terms_json, raw_payload
      )
      VALUES ('manual', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      link,
      hints.brandName || null,
      identity.productModel,
      identity.modelNumber,
      identity.productType,
      identity.category,
      identity.categorySlug,
      hints.productModel || link,
      link,
      link,
      hints.countryCode || null,
      identity.youtubeMatchTerms.length ? JSON.stringify(identity.youtubeMatchTerms) : null,
      JSON.stringify(rawPayload)
    ]
  )
  return Number(result.lastInsertRowid)
}
