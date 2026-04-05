import type { MetadataRoute } from 'next'
import { SUPPORTED_LOCALES, addLocaleToPath } from '@/lib/i18n'
import { getSiteUrl } from '@/lib/site-url'

export function toDate(value: string | null | undefined) {
  if (!value) return null

  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

export function maxDate(values: Array<string | null | undefined>) {
  return values
    .map(toDate)
    .filter(Boolean)
    .sort((left, right) => right!.getTime() - left!.getTime())[0] || undefined
}

export function buildLocalizedSitemapRoute(
  route: string,
  options?: {
    lastModified?: Date
    changeFrequency?: MetadataRoute.Sitemap[number]['changeFrequency']
    priority?: number
  }
): MetadataRoute.Sitemap {
  const siteUrl = getSiteUrl()

  return SUPPORTED_LOCALES.map((locale) => ({
    url: new URL(addLocaleToPath(route, locale), siteUrl).toString(),
    lastModified: options?.lastModified,
    changeFrequency: options?.changeFrequency || (route === '' || route === '/' ? 'daily' : 'weekly'),
    priority: options?.priority ?? (route === '' || route === '/' ? 1 : 0.8)
  }))
}
