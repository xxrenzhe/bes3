import { HARDCORE_CATEGORIES, type HardcoreCategory } from '@/lib/hardcore-catalog'
import type { HardcoreTag } from '@/lib/hardcore'

export const PSEO_VALUE_PRICE_TIERS = [500] as const

export function isPseoIndexableStatus(status: string | null | undefined) {
  return status !== 'low_priority' && status !== 'paused'
}

export function buildScenarioPseoPath(categorySlug: string, tagSlug: string) {
  return `/${categorySlug}/best-${categorySlug}-for-${tagSlug}`
}

export function buildMultiConstraintPseoPath(categorySlug: string, firstTagSlug: string, secondTagSlug: string) {
  return `/${categorySlug}/best-${firstTagSlug}-${secondTagSlug}-${categorySlug}`
}

export function buildValuePseoPath(categorySlug: string, priceLimit: number) {
  return `/deals/best-${categorySlug}-under-${priceLimit}`
}

export function buildLegacyValuePseoPath(categorySlug: string, priceLimit: number) {
  return `/deals/best-value-${categorySlug}-under-${priceLimit}`
}

export function normalizeValuePseoSlug(slug: string) {
  if (slug.startsWith('best-value-')) return slug.slice('best-value-'.length)
  if (slug.startsWith('best-')) return slug.slice('best-'.length)
  return ''
}

export function parseValuePseoSlug(slug: string) {
  const valueSlug = normalizeValuePseoSlug(slug)
  const match = valueSlug.match(/^(.+)-under-(\d+)$/)
  if (!match) return null

  const priceLimit = Number(match[2])
  if (!Number.isFinite(priceLimit)) return null

  return {
    categorySlug: match[1],
    priceLimit,
    valueSlug
  }
}

export function getValuePseoRoutes(categories: HardcoreCategory[] = HARDCORE_CATEGORIES) {
  return categories.flatMap((category) =>
    PSEO_VALUE_PRICE_TIERS.map((priceLimit) => ({
      category,
      priceLimit,
      path: buildValuePseoPath(category.slug, priceLimit)
    }))
  )
}

export function getScenarioPseoRoutes(
  tags: HardcoreTag[],
  options: {
    categories?: HardcoreCategory[]
    limitPerCategory?: number
  } = {}
) {
  const categories = options.categories || HARDCORE_CATEGORIES
  const limitPerCategory = options.limitPerCategory || 8

  return categories.flatMap((category) =>
    tags
      .filter((tag) => tag.categorySlug === category.slug && isPseoIndexableStatus(tag.status))
      .slice(0, limitPerCategory)
      .map((tag) => ({
        category,
        tag,
        path: buildScenarioPseoPath(category.slug, tag.slug)
      }))
  )
}

export function getMultiConstraintPseoRoutes(
  tags: HardcoreTag[],
  options: {
    categories?: HardcoreCategory[]
    limitPerCategory?: number
  } = {}
) {
  const categories = options.categories || HARDCORE_CATEGORIES
  const limitPerCategory = options.limitPerCategory || 4

  return categories.flatMap((category) => {
    const categoryTags = tags
      .filter((tag) => tag.categorySlug === category.slug && tag.isCorePainpoint && isPseoIndexableStatus(tag.status))
      .slice(0, limitPerCategory)

    return categoryTags.flatMap((first, firstIndex) =>
      categoryTags.slice(firstIndex + 1).map((second) => ({
        category,
        tags: [first, second] as const,
        path: buildMultiConstraintPseoPath(category.slug, first.slug, second.slug)
      }))
    )
  })
}

export function getScenarioPseoStaticParams(tags: HardcoreTag[]) {
  return [
    ...getScenarioPseoRoutes(tags, { limitPerCategory: 12 }).map((route) => ({
      category: route.category.slug,
      landing: route.path.split('/')[2]
    })),
    ...getMultiConstraintPseoRoutes(tags).map((route) => ({
      category: route.category.slug,
      landing: route.path.split('/')[2]
    }))
  ]
}

export function getValuePseoStaticParams(categories: HardcoreCategory[] = HARDCORE_CATEGORIES) {
  return getValuePseoRoutes(categories).map((route) => ({
    slug: route.path.split('/')[2]
  }))
}
