import { z } from 'zod'
import type { HardcoreCategory, HardcoreRating, HardcoreTag } from '@/lib/hardcore'

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

export type TaxonomyRefinementOutput = z.infer<typeof taxonomyRefinementSchema>
export type VideoEvidenceOutput = z.infer<typeof videoEvidenceSchema>
export type ShortsEvidenceOutput = z.infer<typeof shortsEvidenceSchema>

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
