const REVIEW_UI_NOISE_RE = /\b(?:read more|helpful report|report abuse|verified purchase|people found this helpful|customer reviews?)\b/gi
const SCRIPT_NOISE_RE = /\b(?:if\s*\(\s*window\.|ue\.count|desktopcrediblebadges|function\s*\(|document\.|window\.)\b/i
const HTML_TAG_RE = /<[^>]*>/g
const URL_RE = /https?:\/\/\S+/gi

function decodeCommonEntities(value: string) {
  return value
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
}

function normalizePublicWhitespace(value: string) {
  return value
    .replace(/\s+/g, ' ')
    .replace(/\s+([.,;:!?])/g, '$1')
    .trim()
}

function removeLeadingReviewerMetadata(value: string) {
  return value
    .replace(/^.*?\bVerified Purchase\b/i, '')
    .replace(/^.*?\b\d(?:\.\d)?\s+out of 5 stars\b/i, '')
}

function removeReviewMetadata(value: string) {
  return value
    .replace(/\bReviewed in\b.*?(?=\b(?:Pros|Cons)\b|$)/gi, ' ')
    .replace(/\bColor:\s*[^.!,;]+/gi, ' ')
    .replace(/\bSize:\s*[^.!,;]+/gi, ' ')
}

function truncateAtSentence(value: string, maxLength: number) {
  if (value.length <= maxLength) return value

  const sliced = value.slice(0, maxLength + 1)
  const sentenceBreak = Math.max(sliced.lastIndexOf('. '), sliced.lastIndexOf('! '), sliced.lastIndexOf('? '))
  if (sentenceBreak >= Math.floor(maxLength * 0.45)) {
    return sliced.slice(0, sentenceBreak + 1).trim()
  }

  const lastSpace = sliced.lastIndexOf(' ')
  return `${sliced.slice(0, lastSpace >= 60 ? lastSpace : maxLength).trim().replace(/[.,;:!?]+$/g, '')}.`
}

function hasPublicTextNoise(value: string) {
  return SCRIPT_NOISE_RE.test(value) ||
    HTML_TAG_RE.test(value) ||
    URL_RE.test(value) ||
    /\b(?:read more|helpful report|desktopcrediblebadges)\b/i.test(value)
}

export function sanitizePublicSnippet(value: string | null | undefined, maxLength = 240): string | null {
  const raw = normalizePublicWhitespace(decodeCommonEntities(String(value || '')))
  if (!raw) return null

  const withoutHtml = raw.replace(HTML_TAG_RE, ' ')
  const withoutUrls = withoutHtml.replace(URL_RE, ' ')
  const withoutScriptFragments = withoutUrls.replace(/\bif\s*\(\s*window\.[^)]*\)\s*\{[^}]*\}/gi, ' ')
  const withoutMetadata = removeReviewMetadata(removeLeadingReviewerMetadata(withoutScriptFragments))
    .replace(REVIEW_UI_NOISE_RE, ' ')
  const normalized = normalizePublicWhitespace(withoutMetadata)
  if (!normalized || normalized.length < 24 || hasPublicTextNoise(normalized)) return null

  return truncateAtSentence(normalized, maxLength)
}

export function sanitizePublicSnippetList(values: Array<string | null | undefined>, limit = 8, maxLength = 240): string[] {
  const seen = new Set<string>()
  const clean: string[] = []

  for (const value of values) {
    const snippet = sanitizePublicSnippet(value, maxLength)
    if (!snippet) continue

    const key = snippet.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    clean.push(snippet)
    if (clean.length >= limit) break
  }

  return clean
}
