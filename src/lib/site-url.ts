const FALLBACK_SITE_URL = 'http://localhost:3000'

function normalizeSiteUrl(value: string | null | undefined) {
  const normalized = (value || '').trim()

  if (!normalized) return FALLBACK_SITE_URL

  return normalized.replace(/\/+$/, '')
}

export function getSiteUrl() {
  return normalizeSiteUrl(process.env.NEXT_PUBLIC_APP_URL)
}

export function toAbsoluteUrl(path?: string | null) {
  if (!path) return getSiteUrl()
  if (/^https?:\/\//i.test(path)) return path

  return `${getSiteUrl()}${path.startsWith('/') ? path : `/${path}`}`
}
