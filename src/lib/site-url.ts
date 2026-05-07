const FALLBACK_SITE_URL = 'http://localhost:3000'
const CANONICAL_PRODUCTION_SITE_URL = 'https://www.bes3.com'

function normalizeSiteUrl(value: string | null | undefined) {
  const normalized = (value || '').trim()

  if (!normalized) return FALLBACK_SITE_URL

  const withoutTrailingSlash = normalized.replace(/\/+$/, '')
  if (withoutTrailingSlash === 'https://bes3.com') return CANONICAL_PRODUCTION_SITE_URL

  return withoutTrailingSlash
}

export function getSiteUrl() {
  return normalizeSiteUrl(process.env.NEXT_PUBLIC_APP_URL)
}

export function toAbsoluteUrl(path?: string | null) {
  if (!path) return getSiteUrl()
  if (/^https?:\/\//i.test(path)) return path

  return `${getSiteUrl()}${path.startsWith('/') ? path : `/${path}`}`
}
