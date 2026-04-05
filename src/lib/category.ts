import { slugify } from '@/lib/slug'

export function normalizeCategoryName(value: string | null | undefined): string {
  return String(value || '').replace(/\s+/g, ' ').trim()
}

export function getCategorySlug(value: string | null | undefined): string {
  const normalized = normalizeCategoryName(value)
  return normalized ? slugify(normalized) : ''
}

export function categoryMatches(value: string | null | undefined, slugOrValue: string | null | undefined): boolean {
  const left = getCategorySlug(value)
  const right = getCategorySlug(slugOrValue)
  return Boolean(left && right && left === right)
}

export function buildCategoryPath(category: string | null | undefined, hash?: string): string {
  const categorySlug = getCategorySlug(category)
  if (!categorySlug) return '/directory'
  const hashSuffix = hash ? `#${hash.replace(/^#/, '')}` : ''
  return `/categories/${categorySlug}${hashSuffix}`
}

export function buildBrandCategoryPath(brandSlug: string, category: string | null | undefined): string {
  const categorySlug = getCategorySlug(category)
  return brandSlug && categorySlug ? `/brands/${brandSlug}/categories/${categorySlug}` : `/brands/${brandSlug}`
}
