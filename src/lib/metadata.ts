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
  publishedTime?: string | Date | null
  modifiedTime?: string | Date | null
  freshnessDate?: string | Date | null
  freshnessInTitle?: boolean
}

interface IntentMetadataDescriptionOptions {
  title: string
  description: string
  pageType?: string | null
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

function normalizeDateValue(value: string | Date | null | undefined) {
  if (!value) return ''

  const parsed = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(parsed.getTime())) return ''
  return parsed.toISOString()
}

function formatFreshnessDate(value: string | Date | null | undefined, format: 'short' | 'long' = 'long') {
  const normalized = normalizeDateValue(value)
  if (!normalized) return ''

  return new Intl.DateTimeFormat('en-US', {
    month: format === 'short' ? 'short' : 'long',
    year: 'numeric'
  }).format(new Date(normalized))
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

function truncateDescription(value: string, maxLength = 160) {
  const normalized = normalizeText(value)
  if (normalized.length <= maxLength) return normalized

  const sliced = normalized.slice(0, maxLength + 1)
  const lastSpace = sliced.lastIndexOf(' ')
  const trimmed = (lastSpace >= 120 ? sliced.slice(0, lastSpace) : normalized.slice(0, maxLength)).trim()
  return `${trimmed.replace(/[.,;:!?\s]+$/g, '')}.`
}

function getIntentCompressionTail(pageType?: string | null) {
  switch ((pageType || '').toLowerCase()) {
    case 'review':
    case 'article':
      return 'It includes buyer-fit guidance, current pricing context, and the clearest next step before you buy.'
    case 'comparison':
    case 'compare':
      return 'It breaks down tradeoffs, pricing context, and which option deserves the shortlist.'
    case 'guide':
      return 'It maps the decision checkpoints, related products, and the next pages to open as you narrow the shortlist.'
    case 'product':
      return 'It covers live pricing, key specs, offer coverage, and the right next action before checkout.'
    case 'category':
      return 'It connects the strongest products, reviews, comparisons, and next-step pages for this buying intent.'
    case 'brand':
      return 'It connects brand-specific products, reviews, and adjacent routes for faster shortlist building.'
    default:
      return 'It gives a concise decision summary, linked evidence, and the next useful step for this buying journey.'
  }
}

export function buildIntentMetadataDescription({ title, description, pageType }: IntentMetadataDescriptionOptions) {
  const normalizedTitle = sanitizeMetadataTitle(title)
  const primary = pickMetadataDescription(description)
  const fallbackTail = getIntentCompressionTail(pageType)

  if (!primary) {
    return truncateDescription(`${normalizedTitle}. ${fallbackTail}`)
  }

  if (primary.length >= 110) {
    return truncateDescription(primary)
  }

  return truncateDescription(`${primary.replace(/[.\s]+$/g, '')}. ${fallbackTail}`)
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
  const normalizedPublishedTime = normalizeDateValue(publishedTime)
  const normalizedModifiedTime = normalizeDateValue(modifiedTime)
  const normalizedFreshnessDate = normalizeDateValue(freshnessDate)
  const normalizedTitle = freshnessInTitle ? buildFreshMetadataTitle(title, normalizedFreshnessDate) : sanitizeMetadataTitle(title)
  const normalizedDescription = buildFreshMetadataDescription(
    buildIntentMetadataDescription({ title, description, pageType: type }),
    normalizedFreshnessDate
  )
  const imageUrl = image ? toAbsoluteUrl(image) : undefined
  const resolvedModifiedTime = normalizedModifiedTime || normalizedPublishedTime || normalizedFreshnessDate || undefined
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
            publishedTime: normalizedPublishedTime || normalizedFreshnessDate || undefined,
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
