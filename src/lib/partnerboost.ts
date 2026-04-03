import { getDatabase } from '@/lib/db'
import { getSettingValue } from '@/lib/settings'

export interface SyncResult {
  total: number
  created: number
  updated: number
}

export interface AffiliateProductRecord {
  id: number
  platform: string
  product_name: string | null
  promo_link: string | null
  short_promo_link: string | null
  product_url: string | null
  brand?: string | null
  image_url?: string | null
  price_amount?: number | null
  updated_at?: string
}

type AmazonProductResponse = {
  status?: { code?: number; msg?: string }
  data?: {
    list?: Array<Record<string, any>>
    has_more?: boolean
  }
}

type DtcResponse = {
  status?: { code?: number; msg?: string }
  data?: {
    total?: string
    list?: Array<Record<string, any>>
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
}): Promise<'created' | 'updated'> {
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
    return 'updated'
  }

  await db.exec(
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
  return 'created'
}

export async function syncPartnerboostAmazonProducts(pageSize: number = 20): Promise<SyncResult> {
  const { amazonToken, amazonBaseUrl } = await getAffiliateConfig()
  if (!amazonToken) throw new Error('PARTNERBOOST_AMAZON_TOKEN is not configured')

  const response = await fetch(`${amazonBaseUrl.replace(/\/$/, '')}/api/datafeed/get_fba_products`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      token: amazonToken,
      page_size: pageSize,
      page: 1,
      default_filter: 0,
      country_code: 'US',
      relationship: 1
    })
  })
  const payload = (await response.json()) as AmazonProductResponse
  if (payload.status?.code !== 0) {
    throw new Error(payload.status?.msg || 'Failed to sync PartnerBoost Amazon products')
  }

  let created = 0
  let updated = 0
  for (const item of payload.data?.list || []) {
    const result = await upsertAffiliateProduct({
      platform: 'partnerboost_amazon',
      externalId: String(item.product_id),
      merchantId: String(item.brand_id || ''),
      asin: item.asin || null,
      brand: item.brand_name || null,
      productName: item.product_name || null,
      productUrl: item.url || null,
      promoLink: item.url || null,
      imageUrl: item.image || null,
      priceAmount: Number(String(item.discount_price || item.original_price || '').replace(/[^\d.]/g, '')) || null,
      priceCurrency: item.currency || 'USD',
      commissionRate: Number(String(item.commission || '').replace(/[^\d.]/g, '')) || null,
      reviewCount: Number(item.reviews || 0) || null,
      rating: Number(item.rating || 0) || null,
      countryCode: item.country_code || 'US',
      rawPayload: item
    })
    if (result === 'created') created += 1
    if (result === 'updated') updated += 1
  }

  return {
    total: (payload.data?.list || []).length,
    created,
    updated
  }
}

export async function syncPartnerboostDtcProducts(limit: number = 20): Promise<SyncResult> {
  const { dtcToken, dtcBaseUrl } = await getAffiliateConfig()
  if (!dtcToken) throw new Error('PARTNERBOOST_DTC_TOKEN is not configured')

  const response = await fetch(`${dtcBaseUrl.replace(/\/$/, '')}/api.php?mod=datafeed&op=list`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      token: dtcToken,
      brand_type: 'DTC',
      page: 1,
      limit
    })
  })
  const payload = (await response.json()) as DtcResponse
  if (payload.status?.code !== 0) {
    throw new Error(payload.status?.msg || 'Failed to sync PartnerBoost DTC products')
  }

  let created = 0
  let updated = 0
  for (const item of payload.data?.list || []) {
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
    if (result === 'created') created += 1
    if (result === 'updated') updated += 1
  }

  return {
    total: (payload.data?.list || []).length,
    created,
    updated
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
