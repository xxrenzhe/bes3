import { HARDCORE_CATEGORIES } from '@/lib/hardcore-catalog'
import { slugify } from '@/lib/slug'

export interface ProductCategoryInput {
  productName?: string | null
  brand?: string | null
  productType?: string | null
  category?: string | null
  categorySlug?: string | null
  description?: string | null
  specs?: Record<string, string> | null
}

export interface NormalizedProductCategory {
  category: string | null
  categorySlug: string | null
  source: 'hardcore' | 'apparel' | 'provided' | 'fallback'
}

const HARDCORE_CATEGORY_ALIASES: Array<{ slug: string; pattern: RegExp }> = [
  { slug: 'bathroom-fixtures', pattern: /\b(smart toilet|bidet|toilet seat|bathroom vanity|vanity unit|marble top|bathroom fixture)\b/i }
]

const APPAREL_CATEGORY = {
  category: 'Apparel',
  categorySlug: 'apparel'
} as const

const APPAREL_TERMS = [
  'apparel',
  'clothing',
  'fashion',
  'womens',
  "women's",
  'mens',
  "men's",
  'unisex',
  'jacket',
  'coat',
  'vest',
  'waistcoat',
  'cardigan',
  'sweater',
  'sweatshirt',
  'hoodie',
  'shirt',
  't-shirt',
  'tee',
  'blouse',
  'top',
  'tank top',
  'pants',
  'trousers',
  'jeans',
  'leggings',
  'shorts',
  'dress',
  'skirt',
  'outerwear',
  'fleece',
  'sherpa',
  'sleeveless',
  'linen pants'
]

const APPAREL_PATTERN = new RegExp(
  `\\b(?:${APPAREL_TERMS.map((term) => term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})\\b`,
  'i'
)

function normalizeText(value: string | null | undefined): string | null {
  const text = String(value || '').replace(/\s+/g, ' ').trim()
  return text || null
}

function normalizeCategorySlug(category: string | null | undefined, categorySlug?: string | null): string | null {
  const slug = normalizeText(categorySlug)
  if (slug) return slugify(slug)

  const name = normalizeText(category)
  return name ? slugify(name) : null
}

function lookupHardcoreCategory(slug: string | null, haystack: string) {
  const direct = HARDCORE_CATEGORIES.find((item) => item.slug === slug || slugify(item.name) === slug)
  if (direct) return direct

  for (const alias of HARDCORE_CATEGORY_ALIASES) {
    if (alias.pattern.test(haystack)) {
      return HARDCORE_CATEGORIES.find((item) => item.slug === alias.slug) || null
    }
  }

  return null
}

export function inferProductCategory(input: ProductCategoryInput): NormalizedProductCategory {
  const providedCategory = normalizeText(input.category)
  const providedSlug = normalizeCategorySlug(providedCategory, input.categorySlug)
  const specsText = Object.entries(input.specs || {})
    .map(([key, value]) => `${key} ${value}`)
    .join(' ')
  const haystack = [
    input.productName,
    input.brand,
    input.productType,
    providedCategory,
    providedSlug,
    input.description,
    specsText
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()

  const hardcoreCategory = lookupHardcoreCategory(providedSlug, haystack)
  if (hardcoreCategory) {
    return {
      category: hardcoreCategory.name,
      categorySlug: hardcoreCategory.slug,
      source: 'hardcore'
    }
  }

  if (APPAREL_PATTERN.test(haystack)) {
    return {
      ...APPAREL_CATEGORY,
      source: 'apparel'
    }
  }

  if (providedCategory) {
    return {
      category: providedCategory,
      categorySlug: providedSlug,
      source: 'provided'
    }
  }

  return {
    category: null,
    categorySlug: null,
    source: 'fallback'
  }
}

export function normalizeProductCategory(input: ProductCategoryInput): NormalizedProductCategory {
  return inferProductCategory(input)
}

export function isHardcoreCategorySlug(categorySlug: string | null | undefined): boolean {
  const normalized = slugify(String(categorySlug || ''))
  return HARDCORE_CATEGORIES.some((item) => item.slug === normalized)
}
