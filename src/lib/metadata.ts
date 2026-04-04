import type { Metadata } from 'next'
import { DEFAULT_SITE_NAME } from '@/lib/constants'

interface PageMetadataOptions {
  title: string
  description: string
  path: string
  image?: string | null
  robots?: Metadata['robots']
  type?: 'website' | 'article'
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

export function buildPageMetadata({
  title,
  description,
  path,
  image,
  robots,
  type = 'website'
}: PageMetadataOptions): Metadata {
  const normalizedTitle = sanitizeMetadataTitle(title)

  return {
    title: normalizedTitle,
    description,
    alternates: {
      canonical: path
    },
    robots,
    openGraph: {
      type,
      title: normalizedTitle,
      description,
      url: path,
      siteName: DEFAULT_SITE_NAME,
      locale: 'en_US',
      images: image
        ? [
            {
              url: image,
              alt: normalizedTitle
            }
          ]
        : undefined
    },
    twitter: {
      card: image ? 'summary_large_image' : 'summary',
      title: normalizedTitle,
      description,
      images: image ? [image] : undefined
    }
  }
}
