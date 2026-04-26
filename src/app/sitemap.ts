import type { MetadataRoute } from 'next'
import { HARDCORE_CATEGORIES, listHardcoreTags } from '@/lib/hardcore'
import { buildLocalizedSitemapRoute } from '@/lib/sitemap-utils'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const tags = await listHardcoreTags()
  const scenarioRoutes = HARDCORE_CATEGORIES.flatMap((category) =>
    tags.filter((tag) => tag.categorySlug === category.slug).slice(0, 8)
      .map((tag) => `/${category.slug}/best-${category.slug}-for-${tag.slug}`)
  )
  const multiConstraintRoutes = HARDCORE_CATEGORIES.flatMap((category) => {
    const categoryTags = tags.filter((tag) => tag.categorySlug === category.slug && tag.isCorePainpoint).slice(0, 4)
    return categoryTags.flatMap((first, firstIndex) =>
      categoryTags.slice(firstIndex + 1).map((second) => `/${category.slug}/best-${first.slug}-${second.slug}-${category.slug}`)
    )
  })

  return [
    ...buildLocalizedSitemapRoute('', { changeFrequency: 'daily', priority: 1 }),
    ...buildLocalizedSitemapRoute('/categories', { changeFrequency: 'weekly', priority: 0.95 }),
    ...buildLocalizedSitemapRoute('/products', { changeFrequency: 'weekly', priority: 0.9 }),
    ...buildLocalizedSitemapRoute('/deals', { changeFrequency: 'daily', priority: 0.9 }),
    ...buildLocalizedSitemapRoute('/data', { changeFrequency: 'weekly', priority: 0.74 }),
    ...buildLocalizedSitemapRoute('/trust', { changeFrequency: 'monthly', priority: 0.72 }),
    ...buildLocalizedSitemapRoute('/about', { changeFrequency: 'monthly', priority: 0.7 }),
    ...buildLocalizedSitemapRoute('/privacy', { changeFrequency: 'yearly', priority: 0.2 }),
    ...buildLocalizedSitemapRoute('/terms', { changeFrequency: 'yearly', priority: 0.2 }),
    ...HARDCORE_CATEGORIES.flatMap((category) =>
      buildLocalizedSitemapRoute(`/categories/${category.slug}`, { changeFrequency: 'weekly', priority: 0.88 })
    ),
    ...HARDCORE_CATEGORIES.flatMap((category) =>
      buildLocalizedSitemapRoute(`/deals/best-value-${category.slug}-under-500`, { changeFrequency: 'daily', priority: 0.82 })
    ),
    ...scenarioRoutes.flatMap((route) => buildLocalizedSitemapRoute(route, { changeFrequency: 'weekly', priority: 0.8 })),
    ...multiConstraintRoutes.flatMap((route) => buildLocalizedSitemapRoute(route, { changeFrequency: 'weekly', priority: 0.76 }))
  ]
}
