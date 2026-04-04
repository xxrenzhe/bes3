const MAX_SOURCE_LENGTH = 80

export function normalizeMerchantSource(source: string | null | undefined) {
  const normalized = String(source || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-|-$/g, '')

  return normalized.slice(0, MAX_SOURCE_LENGTH) || 'site'
}

export function buildMerchantExitPath(productId: number, source: string) {
  const params = new URLSearchParams({ source: normalizeMerchantSource(source) })
  return `/go/${productId}?${params.toString()}`
}

export function formatMerchantSource(source: string | null | undefined) {
  return source ? source.replace(/[-_]/g, ' ') : 'unknown surface'
}
