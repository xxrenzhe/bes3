import { z } from 'zod'
import type { HardcoreCategory, HardcoreRating, HardcoreTag } from '@/lib/hardcore'
import { matchVideoEntity, type ProductIdentityCandidate } from '@/lib/entity-resolution'

export const HARDCORE_RATINGS: HardcoreRating[] = ['Excellent', 'Good', 'Average', 'Struggles', 'Fails']

export const taxonomyRefinementSchema = z.array(
  z.object({
    canonical_tag: z.string().min(2),
    synonyms: z.array(z.string().min(1)).default([]),
    is_core_painpoint: z.boolean()
  })
)

export const videoEvidenceSchema = z.object({
  is_advertorial: z.boolean(),
  overall_sentiment: z.enum(['Positive', 'Neutral', 'Negative']),
  scenario_performance: z.array(
    z.object({
      canonical_tag: z.string().min(2),
      rating: z.enum(['Excellent', 'Good', 'Average', 'Struggles', 'Fails']),
      evidence_quote: z.string().min(8),
      timestamp_seconds: z.number().int().nonnegative().nullable().default(null),
      context_snippet: z.string().min(8).nullable().default(null)
    })
  ),
  unexpected_brilliant_usecases: z.array(z.string()).default([])
})

export const shortsEvidenceSchema = z.object({
  verdict_type: z.enum(['Strong Buy', 'Warning/Avoid', 'Neutral Showcase']),
  killer_feature: z.string().nullable(),
  fatal_flaw: z.string().nullable(),
  vibe_quote: z.string().min(4)
})

export const productEntityExtractionSchema = z.object({
  brand: z.string().nullable(),
  model: z.string().nullable(),
  asin: z.string().nullable().default(null),
  confidence_reason: z.string().min(4)
})

export type TaxonomyRefinementOutput = z.infer<typeof taxonomyRefinementSchema>
export type VideoEvidenceOutput = z.infer<typeof videoEvidenceSchema>
export type ShortsEvidenceOutput = z.infer<typeof shortsEvidenceSchema>
export type ProductEntityExtractionOutput = z.infer<typeof productEntityExtractionSchema>

export interface RetryablePromptResult<T> {
  ok: boolean
  data: T | null
  retryPrompt: string | null
  errors: string[]
}

function stringifyTagList(tags: HardcoreTag[]) {
  return tags.map((tag) => tag.name).join(', ')
}

export function buildTaxonomyRefinementPrompt(category: HardcoreCategory, rawQueries: string[]) {
  return [
    'You are an expert E-commerce Taxonomist and SEO Specialist.',
    `Your task is to analyze raw search queries related to the category: ${category.name}.`,
    '',
    'Rules:',
    '1. Group raw queries into broader standard Canonical Tags.',
    '2. Each Canonical Tag must represent a user pain-point, usage scenario, or physical test.',
    '3. Keep the most searched or most commonly mentioned intent.',
    '4. Output STRICTLY as JSON array with canonical_tag, synonyms, and is_core_painpoint.',
    '',
    'Input Raw Queries:',
    JSON.stringify(rawQueries, null, 2)
  ].join('\n')
}

export function buildVideoEvidencePrompt({
  category,
  tags,
  transcript
}: {
  category: HardcoreCategory
  tags: HardcoreTag[]
  transcript: string
}) {
  return [
    'You are a hardcore hardware engineer and a ruthless product reviewer. You only care about physical evidence, real-world teardowns, and actual data. You hate marketing fluff.',
    '',
    `You are analyzing a transcript for a product in the category: [${category.name}].`,
    `Here is the list of User Pain-Points (Canonical Tags) we care about: [${stringifyTagList(tags)}].`,
    '',
    'Task:',
    'Read the transcript and extract the reviewer verdict ONLY for the provided Canonical Tags.',
    '',
    'Strict Rules:',
    '1. NO HALLUCINATION: If the reviewer did NOT explicitly test a tag, DO NOT include it.',
    '2. TIER 2 MODIFIERS: rating must be one of Excellent, Good, Average, Struggles, Fails.',
    '3. EVIDENCE: Extract a short direct quote proving the rating.',
    '4. TIMESTAMP: Include timestamp_seconds when the transcript provides timing; otherwise use null.',
    '5. CONTEXT: Include a short context_snippet around the quote so code can verify the evidence was actually present.',
    '6. SHILL DETECTION: If the reviewer only praises official specs without physical testing, set is_advertorial true.',
    '7. ESCAPE HATCH: Put unusual tested scenarios outside our tags into unexpected_brilliant_usecases.',
    '8. OUTPUT SHAPE: Return only this JSON object shape: {"is_advertorial":false,"overall_sentiment":"Positive","scenario_performance":[{"canonical_tag":"Pet Hair","rating":"Good","evidence_quote":"exact quote from transcript","timestamp_seconds":null,"context_snippet":"exact context from transcript"}],"unexpected_brilliant_usecases":[]}.',
    '',
    'Transcript:',
    transcript
  ].join('\n')
}

export function buildShortsEvidencePrompt({
  category,
  transcript
}: {
  category: HardcoreCategory
  transcript: string
}) {
  return [
    'You are an expert product analyst.',
    `Analyze this 60-second YouTube Short transcript for the category: [${category.name}].`,
    '',
    'Task:',
    'Shorts are designed for extreme reactions. Do not look for comprehensive data. Look for the Killer Feature or Fatal Flaw.',
    '',
    'Output JSON Schema:',
    '{"verdict_type":"Strong Buy|Warning/Avoid|Neutral Showcase","killer_feature":"String|null","fatal_flaw":"String|null","vibe_quote":"String"}',
    '',
    'Transcript:',
    transcript
  ].join('\n')
}

export function buildProductEntityExtractionPrompt({
  products,
  title,
  transcriptIntro,
  description
}: {
  products: ProductIdentityCandidate[]
  title: string
  transcriptIntro?: string | null
  description?: string | null
}) {
  return [
    'You are a SKU entity resolution analyst. Your job is to identify the exact reviewed product, not a similar product.',
    '',
    'Rules:',
    '1. Prefer an ASIN or merchant link from the video description when present.',
    '2. If no ASIN is present, choose only from the product whitelist.',
    '3. Use brand + model evidence from the title and first transcript minute.',
    '4. If the reviewed product is ambiguous, return null brand and model rather than guessing.',
    '5. Output STRICTLY as JSON with brand, model, asin, and confidence_reason.',
    '',
    'Product whitelist:',
    JSON.stringify(
      products.map((product) => ({
        id: product.id,
        brand: product.brand,
        productName: product.productName,
        asin: product.asin,
        productModel: product.productModel,
        modelNumber: product.modelNumber,
        productType: product.productType,
        category: product.category,
        categorySlug: product.categorySlug,
        youtubeMatchTerms: product.youtubeMatchTerms || []
      })),
      null,
      2
    ),
    '',
    `Video title: ${title}`,
    '',
    `Description: ${description || ''}`,
    '',
    `Transcript intro: ${transcriptIntro || ''}`
  ].join('\n')
}

export function validateProductEntityExtractionOutput({
  output,
  products,
  title,
  transcriptIntro,
  description
}: {
  output: unknown
  products: ProductIdentityCandidate[]
  title: string
  transcriptIntro?: string | null
  description?: string | null
}) {
  const parsed = productEntityExtractionSchema.parse(output)
  const normalizedAsin = parsed.asin?.trim().toUpperCase() || null
  const entityText = [parsed.brand || '', parsed.model || '', normalizedAsin || '', title, transcriptIntro || '', description || ''].join('\n')
  const match = matchVideoEntity({
    title: entityText,
    transcriptIntro,
    description,
    products
  })

  return {
    ...parsed,
    asin: normalizedAsin,
    accepted: Boolean(match.productId && match.confidence >= 0.9),
    match
  }
}

export function validateVideoEvidenceOutput(output: unknown, allowedTags: HardcoreTag[], transcript?: string) {
  const parsed = videoEvidenceSchema.parse(output)
  const allowed = new Set(allowedTags.map((tag) => tag.name.toLowerCase()))
  const normalizedTranscript = transcript?.replace(/\s+/g, ' ').toLowerCase() || ''

  return {
    ...parsed,
    scenario_performance: parsed.scenario_performance
      .filter((item) => allowed.has(item.canonical_tag.toLowerCase()))
      .filter((item) => {
        if (!normalizedTranscript) return true
        const quote = item.evidence_quote.replace(/\s+/g, ' ').toLowerCase()
        const context = item.context_snippet?.replace(/\s+/g, ' ').toLowerCase() || ''
        return normalizedTranscript.includes(quote) || Boolean(context && normalizedTranscript.includes(context))
      })
  }
}

function parseUnknownJson(value: unknown) {
  if (typeof value !== 'string') return value
  const trimmed = value.trim()
  if (!trimmed) return value
  try {
    return JSON.parse(trimmed)
  } catch {
    return value
  }
}

function formatRetryPrompt(errors: string[], allowedTags?: HardcoreTag[]) {
  return [
    'Your previous response failed Bes3 hard validation.',
    '',
    'Fix the response and return STRICT JSON only. Do not add markdown.',
    allowedTags?.length ? `Allowed canonical tags: ${allowedTags.map((tag) => tag.name).join(', ')}` : '',
    '',
    'Validation errors:',
    ...errors.map((error) => `- ${error}`)
  ].filter(Boolean).join('\n')
}

export function parseVideoEvidenceWithRetry(output: unknown, allowedTags: HardcoreTag[], transcript?: string): RetryablePromptResult<VideoEvidenceOutput> {
  const errors: string[] = []
  try {
    const parsed = validateVideoEvidenceOutput(parseUnknownJson(output), allowedTags, transcript)
    if (parsed.scenario_performance.length === 0 && parsed.unexpected_brilliant_usecases.length === 0 && !parsed.is_advertorial) {
      errors.push('No validated scenario_performance rows or unexpected use cases were returned.')
    }
    if (errors.length) {
      return { ok: false, data: null, retryPrompt: formatRetryPrompt(errors, allowedTags), errors }
    }
    return { ok: true, data: parsed, retryPrompt: null, errors: [] }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    errors.push(message)
    return { ok: false, data: null, retryPrompt: formatRetryPrompt(errors, allowedTags), errors }
  }
}

export function parseTaxonomyRefinementWithRetry(output: unknown): RetryablePromptResult<TaxonomyRefinementOutput> {
  const errors: string[] = []
  try {
    const parsed = taxonomyRefinementSchema.parse(parseUnknownJson(output))
    if (!parsed.length) errors.push('At least one canonical_tag is required.')
    if (errors.length) return { ok: false, data: null, retryPrompt: formatRetryPrompt(errors), errors }
    return { ok: true, data: parsed, retryPrompt: null, errors: [] }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    errors.push(message)
    return { ok: false, data: null, retryPrompt: formatRetryPrompt(errors), errors }
  }
}

export function shouldKeepPositiveEvidence({
  isAdvertorial,
  rating
}: {
  isAdvertorial: boolean
  rating: HardcoreRating
}) {
  if (!isAdvertorial) return true
  return rating === 'Struggles' || rating === 'Fails'
}
