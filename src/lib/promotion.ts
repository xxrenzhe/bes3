function normalizePromotionWhitespace(value: string) {
  return value.replace(/\s+/g, ' ').trim()
}

const COUPON_LANGUAGE_RE = /\b(?:coupon|coupons|coupon code|promo code|discount code|voucher|voucher code)\b/i

export function sanitizePromotionSummary(value: string | null | undefined) {
  if (!value) return null

  const normalized = normalizePromotionWhitespace(value)
  if (!normalized) return null

  if (!COUPON_LANGUAGE_RE.test(normalized)) {
    return normalized
  }

  const percentMatch = normalized.match(/-?\d+(?:\.\d+)?\s*%/i)
  const moneyMatch = normalized.match(/[$€£¥]\s?\d+(?:[.,]\d+)?/i)
  const savingsMatch = percentMatch?.[0] || moneyMatch?.[0] || null

  if (savingsMatch) {
    return `Extra ${normalizePromotionWhitespace(savingsMatch)} off right now`
  }

  return 'Limited-time promotion available'
}
