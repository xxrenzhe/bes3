export function sanitizeInternalHref(value: string | null | undefined) {
  const href = String(value || '').trim()
  if (!href.startsWith('/')) return null
  if (href.startsWith('//')) return null
  return href
}

export function resolveResumeContext(input: {
  returnTo?: string | null
  returnLabel?: string | null
  returnDescription?: string | null
}) {
  const href = sanitizeInternalHref(input.returnTo)
  if (!href) return null

  return {
    href,
    label: String(input.returnLabel || 'Resume this task').trim() || 'Resume this task',
    description: String(input.returnDescription || 'Return to the same shopping task instead of reopening broad browsing.').trim() || 'Return to the same shopping task instead of reopening broad browsing.'
  }
}
