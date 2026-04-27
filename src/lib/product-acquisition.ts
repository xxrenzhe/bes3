import { slugify } from '@/lib/slug'

export interface ProductAcquisitionHints {
  brandName?: string | null
  productModel?: string | null
  modelNumber?: string | null
  productType?: string | null
  category?: string | null
  categorySlug?: string | null
  countryCode?: string | null
}

export interface ProductIdentityEnrichment {
  productModel: string | null
  modelNumber: string | null
  productType: string | null
  category: string | null
  categorySlug: string | null
  youtubeMatchTerms: string[]
}

function normalizeText(value: unknown): string | null {
  const text = String(value ?? '').replace(/\s+/g, ' ').trim()
  return text || null
}

function firstText(...values: unknown[]): string | null {
  for (const value of values) {
    const text = normalizeText(value)
    if (text) return text
  }
  return null
}

function normalizeSlug(value: unknown): string | null {
  const text = normalizeText(value)
  if (!text) return null
  return slugify(text)
}

function readSpec(specs: Record<string, string> | null | undefined, labels: string[]): string | null {
  if (!specs) return null
  const normalizedLabels = labels.map((label) => label.toLowerCase())
  for (const [key, value] of Object.entries(specs)) {
    if (normalizedLabels.includes(key.trim().toLowerCase())) {
      return normalizeText(value)
    }
  }
  return null
}

function stripBrandFromName(productName: string | null, brand: string | null): string | null {
  if (!productName || !brand) return null
  const escapedBrand = brand.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const stripped = productName.replace(new RegExp(`^${escapedBrand}\\b[\\s:-]*`, 'i'), '').trim()
  if (!stripped || stripped === productName) return null
  return stripped.length <= 96 ? stripped : null
}

function extractLikelyModelNumber(...values: Array<string | null | undefined>): string | null {
  for (const value of values) {
    const text = normalizeText(value)
    if (!text) continue
    const match = text.match(/\b[A-Z]{1,8}[-_\s]?\d[A-Z0-9._-]{1,16}\b/i)
    if (match?.[0]) return match[0].replace(/\s+/g, '-').toUpperCase()
  }
  return null
}

function uniqueTerms(values: Array<string | null | undefined>): string[] {
  const seen = new Set<string>()
  const terms: string[] = []
  for (const value of values) {
    const text = normalizeText(value)
    if (!text) continue
    const key = slugify(text)
    if (!key || seen.has(key)) continue
    seen.add(key)
    terms.push(text)
  }
  return terms.slice(0, 16)
}

export function parseRawPayload(value: unknown): Record<string, any> {
  if (!value) return {}
  if (typeof value === 'object' && !Array.isArray(value)) return value as Record<string, any>
  if (typeof value !== 'string') return {}
  try {
    const parsed = JSON.parse(value)
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as Record<string, any> : {}
  } catch {
    return {}
  }
}

export function normalizeProductAcquisitionHints(input: Record<string, unknown>): ProductAcquisitionHints {
  return {
    brandName: firstText(input.brandName, input.brand_name, input.brand),
    productModel: firstText(input.productModel, input.product_model, input.model),
    modelNumber: firstText(input.modelNumber, input.model_number, input.sku, input.mpn),
    productType: firstText(input.productType, input.product_type, input.type),
    category: firstText(input.category, input.productCategory, input.product_category),
    categorySlug: normalizeSlug(firstText(input.categorySlug, input.category_slug, input.productCategorySlug, input.product_category_slug)),
    countryCode: firstText(input.countryCode, input.country_code, input.targetCountry, input.target_country)?.toUpperCase() || null
  }
}

export function buildProductIdentityEnrichment(input: {
  productName?: string | null
  brand?: string | null
  category?: string | null
  specs?: Record<string, string> | null
  rawPayload?: Record<string, any> | null
  hints?: ProductAcquisitionHints | null
}): ProductIdentityEnrichment {
  const raw = input.rawPayload || {}
  const hints = input.hints || {}
  const brand = firstText(hints.brandName, input.brand, raw.brand_name, raw.brand, raw.merchant_name)
  const category = firstText(hints.category, input.category, raw.category, raw.subcategory, raw.product_category)
  const productType = firstText(
    hints.productType,
    raw.product_type,
    raw.type,
    raw.item_type,
    readSpec(input.specs, ['Product Type', 'Type', 'Item Type'])
  )
  const explicitModel = firstText(
    hints.productModel,
    raw.product_model,
    raw.model,
    raw.model_name,
    readSpec(input.specs, ['Model', 'Model Name'])
  )
  const modelNumber = firstText(
    hints.modelNumber,
    raw.model_number,
    raw.model_no,
    raw.mpn,
    raw.sku,
    readSpec(input.specs, ['Model Number', 'Item model number', 'Part Number', 'MPN', 'SKU']),
    extractLikelyModelNumber(input.productName, explicitModel)
  )
  const productModel = explicitModel || stripBrandFromName(normalizeText(input.productName), brand) || modelNumber
  const categorySlug = hints.categorySlug || normalizeSlug(raw.category_slug) || normalizeSlug(category)
  const productName = normalizeText(input.productName)

  return {
    productModel,
    modelNumber,
    productType,
    category,
    categorySlug,
    youtubeMatchTerms: uniqueTerms([
      brand && productModel ? `${brand} ${productModel}` : null,
      brand && modelNumber ? `${brand} ${modelNumber}` : null,
      productName,
      productModel,
      modelNumber,
      productType && productModel ? `${productModel} ${productType}` : null,
      category && productModel ? `${productModel} ${category}` : null,
      categorySlug && productModel ? `${productModel} ${categorySlug.replace(/-/g, ' ')}` : null
    ])
  }
}
