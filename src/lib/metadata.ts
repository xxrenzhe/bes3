import type { Metadata } from 'next'
import { DEFAULT_SITE_NAME } from '@/lib/constants'
import { buildLanguageAlternatesWithDefault, getOgLocale, type SiteLocale, addLocaleToPath } from '@/lib/i18n'
import { toAbsoluteUrl } from '@/lib/site-url'

interface PageMetadataOptions {
  title: string
  description: string
  path: string
  locale?: SiteLocale
  image?: string | null
  robots?: Metadata['robots']
  type?: 'website' | 'article'
  keywords?: string[]
  section?: string
  category?: string
  publishedTime?: string | null
  modifiedTime?: string | null
  freshnessDate?: string | null
  freshnessInTitle?: boolean
}

const LOW_SIGNAL_DESCRIPTIONS = new Set([
  'Seeded review page for Bes3.',
  'Seeded comparison page for Bes3.',
  'Seeded guide page for Bes3.',
  'Seeded product page for Bes3.',
  'Seeded article for the homepage and public routes.'
])

function normalizeText(value: string | null | undefined) {
  return value?.replace(/\s+/g, ' ').trim() || ''
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function formatFreshnessDate(value: string | null | undefined, format: 'short' | 'long' = 'long') {
  if (!value) return ''

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return ''

  return new Intl.DateTimeFormat('en-US', {
    month: format === 'short' ? 'short' : 'long',
    year: 'numeric'
  }).format(parsed)
}

export function sanitizeMetadataTitle(value: string) {
  const normalized = normalizeText(value)
  const siteNamePattern = new RegExp(`\\s*[|:-]\\s*${escapeRegExp(DEFAULT_SITE_NAME)}$`, 'i')
  return normalized.replace(siteNamePattern, '').trim() || DEFAULT_SITE_NAME
}

export function pickMetadataDescription(...candidates: Array<string | null | undefined>) {
  for (const candidate of candidates) {
    const normalized = normalizeText(candidate)
    if (!normalized || LOW_SIGNAL_DESCRIPTIONS.has(normalized) || /^(?:A\s+)?seeded\b/i.test(normalized)) continue
    return normalized
  }

  return ''
}

export function toTitleCaseWords(value: string) {
  return normalizeText(value)
    .split(' ')
    .map((word) => (word ? `${word.charAt(0).toUpperCase()}${word.slice(1)}` : word))
    .join(' ')
}

export function buildFreshMetadataDescription(description: string, freshnessDate?: string | null) {
  const freshnessLabel = formatFreshnessDate(freshnessDate, 'long')
  const normalizedDescription = normalizeText(description)

  if (!freshnessLabel || !normalizedDescription || /^updated\s+[a-z]+\s+\d{4}\b/i.test(normalizedDescription)) {
    return normalizedDescription
  }

  return `Updated ${freshnessLabel}. ${normalizedDescription}`
}

export function buildFreshMetadataTitle(title: string, freshnessDate?: string | null) {
  const freshnessLabel = formatFreshnessDate(freshnessDate, 'short')
  const normalizedTitle = sanitizeMetadataTitle(title)

  if (!freshnessLabel || /\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\s+\d{4}\b/i.test(normalizedTitle)) {
    return normalizedTitle
  }

  return `${normalizedTitle} (${freshnessLabel})`
}

export function buildPageMetadata({
  title,
  description,
  path,
  locale,
  image,
  robots,
  type = 'website',
  keywords,
  section,
  category,
  publishedTime,
  modifiedTime,
  freshnessDate,
  freshnessInTitle = false
}: PageMetadataOptions): Metadata {
  const localizedPath = addLocaleToPath(path, locale || 'en')
  const canonical = toAbsoluteUrl(localizedPath)
  const normalizedTitle = freshnessInTitle ? buildFreshMetadataTitle(title, freshnessDate) : sanitizeMetadataTitle(title)
  const normalizedDescription = buildFreshMetadataDescription(description, freshnessDate)
  const imageUrl = image ? toAbsoluteUrl(image) : undefined
  const resolvedModifiedTime = modifiedTime || publishedTime || freshnessDate || undefined
  const alternates = buildLanguageAlternatesWithDefault(path)

  const openGraphBase = {
    title: normalizedTitle,
    description: normalizedDescription,
    url: canonical,
    siteName: DEFAULT_SITE_NAME,
    locale: getOgLocale(locale || 'en'),
    images: imageUrl
      ? [
          {
            url: imageUrl,
            alt: normalizedTitle
          }
        ]
      : undefined
  }

  return {
    title: normalizedTitle,
    description: normalizedDescription,
    keywords,
    category,
    authors: [{ name: DEFAULT_SITE_NAME }],
    creator: DEFAULT_SITE_NAME,
    publisher: DEFAULT_SITE_NAME,
    alternates: {
      canonical,
      languages: Object.fromEntries(Object.entries(alternates).map(([key, value]) => [key, toAbsoluteUrl(value)]))
    },
    robots,
    openGraph:
      type === 'article'
        ? {
            ...openGraphBase,
            type: 'article',
            publishedTime: publishedTime || freshnessDate || undefined,
            modifiedTime: resolvedModifiedTime,
            section,
            tags: keywords
          }
        : {
            ...openGraphBase,
            type: 'website'
          },
    twitter: {
      card: imageUrl ? 'summary_large_image' : 'summary',
      title: normalizedTitle,
      description: normalizedDescription,
      images: imageUrl ? [imageUrl] : undefined
    },
    other:
      type === 'article' && resolvedModifiedTime
        ? {
            'article:modified_time': resolvedModifiedTime
          }
        : undefined
  }
}
