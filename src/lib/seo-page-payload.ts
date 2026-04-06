import { DEFAULT_SITE_NAME } from '@/lib/constants'
import { buildIntentMetadataDescription } from '@/lib/metadata'
import { toAbsoluteUrl } from '@/lib/site-url'

type SeoPageOpenGraphType = 'article' | 'website'

export interface BuildSeoPagePersistenceInput {
  pageType: string
  pathname: string
  title: string
  description: string
  image?: string | null
  schemaJson?: string | null
}

export interface SeoPagePersistencePayload {
  pageType: string
  pathname: string
  title: string
  metaDescription: string
  canonicalUrl: string
  openGraphJson: string
  schemaJson: string | null
}

function normalizeText(value: string | null | undefined) {
  return value?.replace(/\s+/g, ' ').trim() || ''
}

function getOpenGraphType(pageType: string): SeoPageOpenGraphType {
  return ['review', 'comparison', 'guide', 'article'].includes(pageType) ? 'article' : 'website'
}

export function buildSeoPagePersistencePayload(input: BuildSeoPagePersistenceInput): SeoPagePersistencePayload {
  const pathname = normalizeText(input.pathname) || '/'
  const title = normalizeText(input.title) || DEFAULT_SITE_NAME
  const metaDescription = buildIntentMetadataDescription({
    title,
    description: input.description,
    pageType: input.pageType
  })
  const canonicalUrl = toAbsoluteUrl(pathname)
  const image = normalizeText(input.image)

  return {
    pageType: input.pageType,
    pathname,
    title,
    metaDescription,
    canonicalUrl,
    openGraphJson: JSON.stringify({
      title,
      description: metaDescription,
      url: canonicalUrl,
      type: getOpenGraphType(input.pageType),
      siteName: DEFAULT_SITE_NAME,
      image: image ? toAbsoluteUrl(image) : undefined
    }),
    schemaJson: input.schemaJson || null
  }
}
