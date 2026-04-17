export const LEGACY_OFFER_NEWSLETTER_INTENT = 'deals' as const
export const DEFAULT_NEWSLETTER_INTENT = 'offers' as const
export const CANONICAL_NEWSLETTER_INTENTS = [DEFAULT_NEWSLETTER_INTENT, 'price-alert', 'category-brief'] as const
export const VALID_NEWSLETTER_INTENTS = new Set([
  LEGACY_OFFER_NEWSLETTER_INTENT,
  ...CANONICAL_NEWSLETTER_INTENTS
] as const)

export type CanonicalNewsletterIntent = (typeof CANONICAL_NEWSLETTER_INTENTS)[number]
export type SupportedNewsletterIntent = CanonicalNewsletterIntent | typeof LEGACY_OFFER_NEWSLETTER_INTENT

export function isSupportedNewsletterIntent(value: string | null | undefined): value is SupportedNewsletterIntent {
  return VALID_NEWSLETTER_INTENTS.has(String(value || '').trim().toLowerCase() as SupportedNewsletterIntent)
}

export function normalizeNewsletterIntent(value: string | null | undefined): CanonicalNewsletterIntent {
  const normalizedValue = String(value || '').trim().toLowerCase()

  if (normalizedValue === LEGACY_OFFER_NEWSLETTER_INTENT || normalizedValue === DEFAULT_NEWSLETTER_INTENT) {
    return DEFAULT_NEWSLETTER_INTENT
  }

  if (normalizedValue === 'price-alert' || normalizedValue === 'category-brief') {
    return normalizedValue
  }

  return DEFAULT_NEWSLETTER_INTENT
}

export function isOfferNewsletterIntent(value: string | null | undefined): boolean {
  return normalizeNewsletterIntent(value) === DEFAULT_NEWSLETTER_INTENT
}
