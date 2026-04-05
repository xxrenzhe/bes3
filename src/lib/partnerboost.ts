import { getDatabase } from '@/lib/db'
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

function normalizeUrl(value: unknown): string | null {
  const text = String(value || '').trim()
  return text || null
}

function normalizeAsin(value: unknown): string | null {
  const text = String(value || '').trim().toUpperCase()
  return text || null
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

async function fetchPartnerboostJson<T>(url: string, init: RequestInit, errorPrefix: string): Promise<T> {
  const response = await fetch(url, init)
  const text = await response.text().catch(() => '')
  if (!response.ok) {
    throw new Error(`${errorPrefix} (${response.status}): ${text.trim().slice(0, 220) || 'request failed'}`)
  }

  if (!text.trim()) {
    throw new Error(`${errorPrefix}: Empty response body`)
  }

  return JSON.parse(text) as T
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
        SET merchant_id = ?, asin = ?, brand = ?, product_name = ?, product_url = ?, promo_link = ?,
            short_promo_link = ?, image_url = ?, price_amount = ?, price_currency = ?, commission_rate = ?,
            review_count = ?, rating = ?, country_code = ?, raw_payload = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
      [
        payload.merchantId || null,
        payload.asin || null,
        payload.brand || null,
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
        platform, external_id, merchant_id, asin, brand, product_name, product_url, promo_link, short_promo_link,
        image_url, price_amount, price_currency, commission_rate, review_count, rating, country_code, raw_payload
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      payload.platform,
      payload.externalId,
      payload.merchantId || null,
      payload.asin || null,
      payload.brand || null,
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
      JSON.stringify(payload.rawPayload)
    ]
  )
  return {
    id: Number(result.lastInsertRowid),
    status: 'created'
  }
}

export async function syncPartnerboostAmazonProducts(pageSize: number = DEFAULT_SYNC_PAGE_SIZE, maxPages: number = MAX_SYNC_PAGES): Promise<SyncResult> {
  const { amazonToken, amazonBaseUrl } = await getAffiliateConfig()
  if (!amazonToken) throw new Error('PARTNERBOOST_AMAZON_TOKEN is not configured')

  let total = 0
  let created = 0
  let updated = 0
  const createdIds: number[] = []
  const updatedIds: number[] = []
  let page = 1
  let pagesFetched = 0
  let hasMore = false

  while (page <= Math.max(1, maxPages)) {
    const payload = await fetchPartnerboostJson<AmazonProductResponse>(
      `${amazonBaseUrl.replace(/\/$/, '')}/api/datafeed/get_fba_products`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: amazonToken,
          page_size: pageSize,
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

    const list = payload.data?.list || []
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
        brand: item.brand_name || null,
        productName: item.product_name || null,
        productUrl: item.url || null,
        promoLink: resolvedLinks.promoLink,
        shortPromoLink: resolvedLinks.shortPromoLink,
        imageUrl: item.image || null,
        priceAmount: Number(String(item.discount_price || item.original_price || '').replace(/[^\d.]/g, '')) || null,
        priceCurrency: item.currency || 'USD',
        commissionRate: Number(String(item.commission || '').replace(/[^\d.]/g, '')) || null,
        reviewCount: Number(item.reviews || 0) || null,
        rating: Number(item.rating || 0) || null,
        countryCode: item.country_code || 'US',
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

export async function syncPartnerboostDtcProducts(limit: number = DEFAULT_SYNC_PAGE_SIZE, maxPages: number = MAX_SYNC_PAGES): Promise<SyncResult> {
  const { dtcToken, dtcBaseUrl } = await getAffiliateConfig()
  if (!dtcToken) throw new Error('PARTNERBOOST_DTC_TOKEN is not configured')

  let total = 0
  let created = 0
  let updated = 0
  const createdIds: number[] = []
  const updatedIds: number[] = []
  let page = 1
  let pagesFetched = 0
  let hasMore = false
  let remoteTotal: number | null = null

  while (page <= Math.max(1, maxPages)) {
    const response = await fetch(`${dtcBaseUrl.replace(/\/$/, '')}/api.php?mod=datafeed&op=list`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token: dtcToken,
        brand_type: 'DTC',
        page,
        limit
      })
    })
    const payload = (await response.json()) as DtcResponse
    if (payload.status?.code !== 0) {
      throw new Error(payload.status?.msg || 'Failed to sync PartnerBoost DTC products')
    }

    const list = payload.data?.list || []
    total += list.length
    pagesFetched += 1
    remoteTotal = Number(payload.data?.total || 0) || null
    hasMore = remoteTotal ? page * limit < remoteTotal : list.length === limit

    for (const item of list) {
      const result = await upsertAffiliateProduct({
        platform: 'partnerboost_dtc',
        externalId: String(item.creative_id || item.sku || item.url),
        merchantId: String(item.brand_id || item.mcid || ''),
        brand: item.brand || item.merchant_name || null,
        productName: item.name || null,
        productUrl: item.url || null,
        promoLink: item.tracking_url || item.tracking_url_short || item.tracking_url_smart || null,
        shortPromoLink: item.tracking_url_short || item.tracking_url_smart || null,
        imageUrl: item.image || null,
        priceAmount: Number(item.price || 0) || null,
        priceCurrency: item.currency || 'USD',
        countryCode: 'US',
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

export async function upsertManualAffiliateLink(link: string): Promise<number> {
  const db = await getDatabase()
  const existing = await db.queryOne<{ id: number }>(
    'SELECT id FROM affiliate_products WHERE platform = ? AND promo_link = ? LIMIT 1',
    ['manual', link]
  )
  if (existing?.id) return existing.id

  const result = await db.exec(
    `
      INSERT INTO affiliate_products (platform, external_id, product_name, promo_link, product_url, raw_payload)
      VALUES ('manual', ?, ?, ?, ?, ?)
    `,
    [link, link, link, link, JSON.stringify({ source: 'manual' })]
  )
  return Number(result.lastInsertRowid)
}
