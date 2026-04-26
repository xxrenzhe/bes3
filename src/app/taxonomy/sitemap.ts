import type { MetadataRoute } from 'next'
import { HARDCORE_CATEGORIES, listHardcoreTags } from '@/lib/hardcore'
import { buildLocalizedSitemapRoute } from '@/lib/sitemap-utils'

function isSitemapEligible(status: string) {
  return status !== 'low_priority' && status !== 'paused'
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const tags = await listHardcoreTags()
  const singleTagRoutes = HARDCORE_CATEGORIES.flatMap((category) =>
    tags
      .filter((tag) => tag.categorySlug === category.slug && isSitemapEligible(tag.status))
      .slice(0, 12)
      .flatMap((tag) =>
        buildLocalizedSitemapRoute(`/${category.slug}/best-${category.slug}-for-${tag.slug}`, {
          changeFrequency: 'weekly',
          priority: tag.isCorePainpoint ? 0.82 : 0.72
        })
      )
  )
  const multiConstraintRoutes = HARDCORE_CATEGORIES.flatMap((category) => {
    const categoryTags = tags.filter((tag) => tag.categorySlug === category.slug && tag.isCorePainpoint && isSitemapEligible(tag.status)).slice(0, 4)
    return categoryTags.flatMap((first, firstIndex) =>
      categoryTags.slice(firstIndex + 1).flatMap((second) =>
        buildLocalizedSitemapRoute(`/${category.slug}/best-${first.slug}-${second.slug}-${category.slug}`, {
          changeFrequency: 'weekly',
          priority: 0.76
        })
      )
    )
  })

  return [...singleTagRoutes, ...multiConstraintRoutes]
}
