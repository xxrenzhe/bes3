function normalizeQuery(value: string) {
  return value.trim().toLowerCase()
}

export function queryLooksIntentLed(value: string) {
  const query = normalizeQuery(value)
  if (!query) return false

  const wordCount = query.split(/\s+/).filter(Boolean).length

  if (wordCount >= 7) return true
  if (/\b(i need|i want|i'm looking for|looking for|need a|need an|want a|want an)\b/.test(query)) return true
  if (/\bunder\s+\$?\d+|\bbelow\s+\$?\d+|\bbudget\b|\bavoid\b|\bdeal[- ]?breaker\b|\bmust[- ]?have\b/.test(query)) return true
  if (/\bfor\s+(work|travel|gaming|field|home|office|study|video|photo|commute|school)\b/.test(query)) return true

  return false
}

export function queryLooksExactSearchLed(value: string) {
  const query = normalizeQuery(value)
  if (!query || queryLooksIntentLed(query)) return false

  const wordCount = query.split(/\s+/).filter(Boolean).length
  const hasModelToken = /\b[a-z]+\d+[a-z0-9-]*\b|\b\d+[a-z]+[a-z0-9-]*\b|\b[a-z]+-\d+[a-z0-9-]*\b/i.test(query)

  if (hasModelToken && wordCount <= 6) return true

  return false
}
