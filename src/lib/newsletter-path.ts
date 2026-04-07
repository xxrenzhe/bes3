import { sanitizeInternalHref } from '@/lib/resume-context'

export function buildNewsletterPath(input: {
  intent?: string
  category?: string | null
  cadence?: string
  returnTo?: string | null
  returnLabel?: string | null
  returnDescription?: string | null
  extras?: Record<string, string | null | undefined>
}) {
  const params = new URLSearchParams()

  if (input.intent) params.set('intent', input.intent)
  if (input.category) params.set('category', input.category)
  if (input.cadence) params.set('cadence', input.cadence)

  const returnTo = sanitizeInternalHref(input.returnTo)
  if (returnTo) params.set('returnTo', returnTo)
  if (input.returnLabel) params.set('returnLabel', input.returnLabel)
  if (input.returnDescription) params.set('returnDescription', input.returnDescription)

  Object.entries(input.extras || {}).forEach(([key, value]) => {
    if (value) params.set(key, value)
  })

  return `/newsletter${params.size ? `?${params.toString()}` : ''}`
}
