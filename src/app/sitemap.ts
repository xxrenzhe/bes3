import type { MetadataRoute } from 'next'
import { HARDCORE_CATEGORIES, listHardcoreTags } from '@/lib/hardcore'
import { getMultiConstraintPseoRoutes, getScenarioPseoRoutes, getValuePseoRoutes } from '@/lib/pseo'
import { buildLocalizedSitemapRoute } from '@/lib/sitemap-utils'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const tags = await listHardcoreTags()
  const scenarioRoutes = getScenarioPseoRoutes(tags).map((route) => route.path)
  const multiConstraintRoutes = getMultiConstraintPseoRoutes(tags).map((route) => route.path)
  const valueRoutes = getValuePseoRoutes(HARDCORE_CATEGORIES).map((route) => route.path)

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
    ...valueRoutes.flatMap((route) => buildLocalizedSitemapRoute(route, { changeFrequency: 'daily', priority: 0.82 })),
    ...scenarioRoutes.flatMap((route) => buildLocalizedSitemapRoute(route, { changeFrequency: 'weekly', priority: 0.8 })),
    ...multiConstraintRoutes.flatMap((route) => buildLocalizedSitemapRoute(route, { changeFrequency: 'weekly', priority: 0.76 }))
  ]
}
