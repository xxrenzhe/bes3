export interface EvidenceProductIdentity {
  productName?: string | null
  brand?: string | null
  productModel?: string | null
  modelNumber?: string | null
}

export interface EvidenceQualityInput {
  youtubeId?: string | null
  title?: string | null
  channelName?: string | null
  evidenceQuote?: string | null
  contextSnippet?: string | null
}

const SYNTHETIC_EVIDENCE_PATTERN = /(?:^|[^a-z0-9])(demo|fixture|sample|seeded|mock|qa)(?:[^a-z0-9]|$)/i
const MODEL_TOKEN_PATTERN = /\b[A-Z]{1,}[A-Z0-9]*(?:[-_ ][A-Z0-9]+)+\b|\b[A-Z]{2,}\d[A-Z0-9-]{2,}\b/g

function cleanText(value: unknown) {
  return String(value || '').replace(/\s+/g, ' ').trim()
}

function normalizeModelToken(value: unknown) {
  return cleanText(value).toUpperCase().replace(/[^A-Z0-9]/g, '')
}

function modelSegments(value: unknown) {
  const text = cleanText(value)
  if (!/\d/.test(text)) return []
  return text
    .toUpperCase()
    .split(/[^A-Z0-9]+/)
    .map((segment) => segment.trim())
    .filter(Boolean)
}

function extractModelMentions(value: unknown) {
  return cleanText(value).match(MODEL_TOKEN_PATTERN) || []
}

function sameModelFamily(expected: string, mention: string) {
  const expectedSegments = modelSegments(expected)
  const mentionSegments = modelSegments(mention)
  if (expectedSegments.length < 2 || mentionSegments.length < 2) return false

  const firstSegmentMatches = expectedSegments[0] === mentionSegments[0]
  const lastSegmentMatches = expectedSegments.at(-1) === mentionSegments.at(-1)
  return firstSegmentMatches && lastSegmentMatches
}

export function looksSyntheticEvidenceText(...values: unknown[]) {
  return SYNTHETIC_EVIDENCE_PATTERN.test(values.map(cleanText).join(' '))
}

export function hasConflictingModelEvidence(identity: EvidenceProductIdentity, ...values: unknown[]) {
  const expectedModels = [
    identity.modelNumber,
    identity.productModel,
    ...extractModelMentions(identity.productName)
  ]
    .map((value) => cleanText(value))
    .filter((value) => normalizeModelToken(value).length >= 5 && /\d/.test(value))

  if (!expectedModels.length) return false

  const evidenceText = values.map(cleanText).join(' ')
  const mentions = extractModelMentions(evidenceText)

  return mentions.some((mention) => {
    const normalizedMention = normalizeModelToken(mention)
    if (!normalizedMention || expectedModels.some((expected) => normalizeModelToken(expected) === normalizedMention)) return false
    return expectedModels.some((expected) => sameModelFamily(expected, mention))
  })
}

export function getEvidenceQualityIssues(identity: EvidenceProductIdentity, evidence: EvidenceQualityInput) {
  const values = [
    evidence.youtubeId,
    evidence.title,
    evidence.channelName,
    evidence.evidenceQuote,
    evidence.contextSnippet
  ]
  const issues: string[] = []

  if (looksSyntheticEvidenceText(...values)) issues.push('synthetic_evidence')
  if (hasConflictingModelEvidence(identity, ...values)) issues.push('model_mismatch')

  return issues
}

export function isPublicEvidenceUsable(identity: EvidenceProductIdentity, evidence: EvidenceQualityInput) {
  return getEvidenceQualityIssues(identity, evidence).length === 0
}
