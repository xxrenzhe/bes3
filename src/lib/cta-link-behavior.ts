export function isExternalCtaHref(href: string | null | undefined) {
  if (!href) return false
  return href.startsWith('/go/') || href.startsWith('http://') || href.startsWith('https://')
}
