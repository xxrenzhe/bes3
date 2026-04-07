import { categoryMatches } from '@/lib/category'
import { buildShortlistSharePath } from '@/lib/shortlist'
import {
  getBrandSlug,
  listCategories,
  searchOpenCommerceProducts,
  type CommerceProductRecord
} from '@/lib/site-data'

export type IntentUrgency = 'buy-now' | 'compare-soon' | 'wait-for-price'

export interface IntentSearchInput {
  query: string
  category?: string | null
  budget?: number | null
  mustHaves?: string[]
  avoid?: string[]
  urgency?: IntentUrgency | null
  limit?: number
}

export interface IntentRecommendation {
  product: CommerceProductRecord
  score: number
  reasons: string[]
  concerns: string[]
}

export interface IntentSearchResult {
  normalizedQuery: string
  inferredCategory: string | null
  normalizedBudget: number | null
  mustHaves: string[]
  avoid: string[]
  urgency: IntentUrgency
  recommendations: IntentRecommendation[]
  shortlistPath: string
  comparePath: string
  nextAction: {
    title: string
    description: string
    href: string
    label: string
  }
  fallbackAction: {
    title: string
    description: string
    href: string
    label: string
  }
}

export interface IntentRefinementPrompt {
  id: 'category' | 'budget' | 'must' | 'avoid' | 'timing'
  label: string
  title: string
  description: string
  example: string
}

function normalizeText(value: string | null | undefined) {
  return String(value || '')
    .trim()
    .toLowerCase()
}

function splitIntentTerms(value: string | null | undefined) {
  return String(value || '')
    .split(/[,\n]/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 8)
}

function normalizeUrgency(value: string | null | undefined): IntentUrgency {
  const normalized = normalizeText(value)
  if (normalized === 'buy-now' || normalized === 'compare-soon' || normalized === 'wait-for-price') {
    return normalized
  }
  if (/\b(wait|later|drop|deal|price)\b/.test(normalized)) return 'wait-for-price'
  if (/\b(compare|versus|vs)\b/.test(normalized)) return 'compare-soon'
  return 'buy-now'
}

function extractBudgetFromQuery(query: string): number | null {
  const directMatch = query.match(/\$?\s?(\d{2,5})(?:\s?(usd|dollars?))?/i)
  if (directMatch?.[1]) return Number(directMatch[1])

  const underMatch = query.match(/(?:under|below|less than|max(?:imum)?)\s+\$?\s?(\d{2,5})/i)
  if (underMatch?.[1]) return Number(underMatch[1])

  return null
}

async function inferCategory(query: string, explicitCategory?: string | null) {
  if (explicitCategory) return explicitCategory

  const categories = await listCategories()
  const normalizedQuery = normalizeText(query)

  const match = categories.find((category) => {
    const label = category.replace(/-/g, ' ')
    return normalizedQuery.includes(category) || normalizedQuery.includes(label)
  })

  return match || null
}

function buildSearchCorpus(product: CommerceProductRecord) {
  return [
    product.productName,
    product.brand || '',
    product.category || '',
    product.description || '',
    product.reviewHighlights.join(' '),
    ...Object.keys(product.specs),
    ...Object.values(product.specs)
  ]
    .join(' ')
    .toLowerCase()
}

function buildReasonsAndConcerns(input: {
  product: CommerceProductRecord
  mustHaves: string[]
  avoid: string[]
  budget: number | null
  inferredCategory: string | null
}) {
  const reasons: string[] = []
  const concerns: string[] = []
  const corpus = buildSearchCorpus(input.product)
  const effectivePrice = input.product.bestOffer?.priceAmount ?? input.product.priceAmount

  if (input.inferredCategory && categoryMatches(input.product.category, input.inferredCategory)) {
    reasons.push(`Matches the ${input.inferredCategory.replace(/-/g, ' ')} category`)
  }

  if (input.budget != null && effectivePrice != null && effectivePrice <= input.budget) {
    reasons.push(`Fits the budget at ${effectivePrice.toFixed(0)} or less`)
  }

  if (input.product.freshness === 'fresh') {
    reasons.push('Offer data was checked recently')
  }

  if (input.product.dataConfidenceScore >= 0.8) {
    reasons.push('Carries strong product and offer evidence')
  }

  for (const term of input.mustHaves) {
    if (corpus.includes(normalizeText(term))) {
      reasons.push(`Covers the must-have: ${term}`)
    }
  }

  for (const term of input.avoid) {
    if (corpus.includes(normalizeText(term))) {
      concerns.push(`Potential conflict with avoid term: ${term}`)
    }
  }

  if (!reasons.length) {
    reasons.push('Strong general fit based on the current product signals')
  }

  return {
    reasons: reasons.slice(0, 4),
    concerns: concerns.slice(0, 3)
  }
}

function scoreProduct(input: {
  product: CommerceProductRecord
  inferredCategory: string | null
  budget: number | null
  mustHaves: string[]
  avoid: string[]
  urgency: IntentUrgency
}) {
  const { product, inferredCategory, budget, mustHaves, avoid, urgency } = input
  const corpus = buildSearchCorpus(product)
  const effectivePrice = product.bestOffer?.priceAmount ?? product.priceAmount
  let score = 0

  if (inferredCategory && categoryMatches(product.category, inferredCategory)) score += 26
  if (!inferredCategory && product.category) score += 6

  if (budget != null) {
    if (effectivePrice != null && effectivePrice <= budget) score += 22
    else if (effectivePrice != null && effectivePrice <= budget * 1.12) score += 10
    else score -= 10
  }

  for (const term of mustHaves) {
    if (corpus.includes(normalizeText(term))) score += 9
  }

  for (const term of avoid) {
    if (corpus.includes(normalizeText(term))) score -= 8
  }

  score += Math.round(product.dataConfidenceScore * 20)
  score += Math.round(product.attributeCompletenessScore * 14)
  score += product.freshness === 'fresh' ? 10 : product.freshness === 'recent' ? 5 : 0

  if (product.rating && product.reviewCount) {
    score += Math.min(12, Math.round(product.rating * 1.5 + Math.log10(product.reviewCount + 1) * 2))
  } else if (product.rating) {
    score += Math.min(8, Math.round(product.rating * 1.5))
  }

  if (urgency === 'wait-for-price' && effectivePrice != null && budget != null && effectivePrice > budget) score += 4
  if (urgency === 'buy-now' && product.bestOffer?.availabilityStatus === 'in_stock') score += 6
  if (urgency === 'compare-soon') score += Math.min(6, product.offerCount)

  return score
}

function buildNextAction(input: {
  recommendations: IntentRecommendation[]
  urgency: IntentUrgency
  inferredCategory: string | null
  shortlistPath: string
}) {
  const lead = input.recommendations[0]?.product || null
  const comparePath = input.recommendations.length >= 2
    ? buildShortlistSharePath(input.recommendations.slice(0, 3).map((item) => item.product.id))
    : input.shortlistPath

  if (input.urgency === 'wait-for-price') {
    const category = input.inferredCategory || lead?.category || ''
    const href = category
      ? `/newsletter?intent=price-alert&category=${encodeURIComponent(category)}&cadence=priority`
      : '/newsletter?intent=price-alert&cadence=priority'

    return {
      nextAction: {
        title: 'Turn this search into a price watch',
        description: 'The fit looks close, but price timing still matters more than checkout speed.',
        href,
        label: 'Start price alert'
      },
      fallbackAction: {
        title: 'Keep the finalists together',
        description: 'Save the current recommendations so the research stays stable while you wait.',
        href: input.shortlistPath,
        label: 'Open shortlist'
      }
    }
  }

  if (input.urgency === 'compare-soon' && input.recommendations.length >= 2) {
    return {
      nextAction: {
        title: 'Compare the finalists next',
        description: 'You already have enough evidence to stop browsing and pressure-test the top picks side by side.',
        href: comparePath,
        label: 'Open shortlist finalists'
      },
      fallbackAction: {
        title: 'Open the strongest lead product',
        description: 'If one product already feels close, validate the lead before widening the comparison.',
        href: lead?.slug ? `/products/${lead.slug}` : '/search',
        label: 'Open lead product'
      }
    }
  }

  return {
    nextAction: {
      title: 'Open the strongest lead product',
      description: 'The recommendation is narrow enough that the next useful move is validating the lead product, not opening more broad search results.',
      href: lead?.slug ? `/products/${lead.slug}` : '/search',
      label: 'Open lead product'
    },
    fallbackAction: {
      title: 'Save the current shortlist',
      description: 'Keep the top picks together so the next compare or alert step does not restart from zero.',
      href: input.shortlistPath,
      label: 'Open shortlist'
    }
  }
}

export async function resolveIntentSearch(input: IntentSearchInput): Promise<IntentSearchResult> {
  const normalizedQuery = input.query.trim()
  const mustHaves = (input.mustHaves || []).map((term) => term.trim()).filter(Boolean)
  const avoid = (input.avoid || []).map((term) => term.trim()).filter(Boolean)
  const inferredCategory = await inferCategory(normalizedQuery, input.category || null)
  const normalizedBudget = input.budget ?? extractBudgetFromQuery(normalizedQuery)
  const urgency = normalizeUrgency(input.urgency || normalizedQuery)
  const products = await searchOpenCommerceProducts(normalizedQuery, {
    category: inferredCategory || undefined,
    limit: Math.max(6, input.limit || 8)
  })

  const recommendations = products
    .map((product) => {
      const score = scoreProduct({
        product,
        inferredCategory,
        budget: normalizedBudget,
        mustHaves,
        avoid,
        urgency
      })
      const explanation = buildReasonsAndConcerns({
        product,
        mustHaves,
        avoid,
        budget: normalizedBudget,
        inferredCategory
      })

      return {
        product,
        score,
        reasons: explanation.reasons,
        concerns: explanation.concerns
      }
    })
    .sort((left, right) => right.score - left.score)
    .slice(0, Math.max(1, input.limit || 4))

  const shortlistPath = buildShortlistSharePath(recommendations.map((item) => item.product.id))
  const { nextAction, fallbackAction } = buildNextAction({
    recommendations,
    urgency,
    inferredCategory,
    shortlistPath
  })

  return {
    normalizedQuery,
    inferredCategory,
    normalizedBudget,
    mustHaves,
    avoid,
    urgency,
    recommendations,
    shortlistPath,
    comparePath: buildShortlistSharePath(recommendations.slice(0, 3).map((item) => item.product.id)),
    nextAction,
    fallbackAction
  }
}

export function parseIntentInputFromSearchParams(searchParams: {
  q?: string
  intent?: string
  category?: string
  budget?: string
  must?: string
  avoid?: string
  urgency?: string
}) {
  const query = (searchParams.intent || searchParams.q || '').trim()
  const budget = searchParams.budget ? Number(searchParams.budget) : null

  return {
    query,
    category: searchParams.category || null,
    budget: Number.isFinite(budget) && budget && budget > 0 ? budget : null,
    mustHaves: splitIntentTerms(searchParams.must),
    avoid: splitIntentTerms(searchParams.avoid),
    urgency: normalizeUrgency(searchParams.urgency)
  }
}

export function buildIntentSearchHref(input: {
  query: string
  category?: string | null
  budget?: number | null
  mustHaves?: string[]
  avoid?: string[]
  urgency?: IntentUrgency | null
}) {
  const params = new URLSearchParams({
    mode: 'intent'
  })
  if (input.query.trim()) params.set('intent', input.query.trim())
  if (input.category) params.set('category', input.category)
  if (typeof input.budget === 'number' && Number.isFinite(input.budget) && input.budget > 0) {
    params.set('budget', String(Math.round(input.budget)))
  }
  if (input.mustHaves?.length) params.set('must', input.mustHaves.join(', '))
  if (input.avoid?.length) params.set('avoid', input.avoid.join(', '))
  if (input.urgency) params.set('urgency', input.urgency)
  return `/search?${params.toString()}`
}

export function buildIntentContextChips(result: IntentSearchResult) {
  const chips: string[] = []
  if (result.inferredCategory) chips.push(result.inferredCategory.replace(/-/g, ' '))
  if (result.normalizedBudget != null) chips.push(`under $${result.normalizedBudget}`)
  if (result.mustHaves.length) chips.push(`${result.mustHaves.length} must-have${result.mustHaves.length === 1 ? '' : 's'}`)
  if (result.avoid.length) chips.push(`${result.avoid.length} avoid term${result.avoid.length === 1 ? '' : 's'}`)
  chips.push(result.urgency === 'wait-for-price' ? 'wait for price' : result.urgency === 'compare-soon' ? 'compare soon' : 'buy now')
  return chips
}

export function buildIntentRecommendationNote(result: IntentSearchResult) {
  const lead = result.recommendations[0]
  if (!lead) {
    return {
      title: 'No strong recommendation yet.',
      description: 'Bes3 still needs more evidence or a broader search before it can suggest a lead product.',
      brandHref: null
    }
  }

  const brandHref = lead.product.brand ? `/brands/${getBrandSlug(lead.product.brand)}` : null

  return {
    title: `${lead.product.productName} is the current lead.`,
    description: lead.reasons[0] || 'It best matches the current buying intent and available evidence.',
    brandHref
  }
}

export function buildIntentRefinementPrompts(input: {
  query: string
  inferredCategory?: string | null
  budget?: number | null
  mustHaves?: string[]
  avoid?: string[]
  urgency?: IntentUrgency | null
}) {
  const prompts: IntentRefinementPrompt[] = []

  if (!input.inferredCategory) {
    prompts.push({
      id: 'category',
      label: 'Question 01',
      title: 'What type of product are you really trying to buy?',
      description: 'Naming the category keeps Bes3 inside one market instead of forcing it to guess from broader language.',
      example: 'Try a phrase like: “27-inch 4K monitor”, “Android tablet”, or “wireless gaming router”.'
    })
  }

  if (input.budget == null) {
    prompts.push({
      id: 'budget',
      label: 'Question 02',
      title: 'What price ceiling still feels realistic?',
      description: 'A budget cap helps Bes3 stop recommending good products that would still feel like the wrong spend.',
      example: 'Try a phrase like: “under $500”, “around $900”, or “max $250”.'
    })
  }

  if (!(input.mustHaves || []).length) {
    prompts.push({
      id: 'must',
      label: 'Question 03',
      title: 'What two things absolutely must go right?',
      description: 'Concrete must-haves shrink the shortlist faster than broad quality words like “good” or “best”.',
      example: 'Try details like: “quiet fan, USB-C charging, long battery, bright screen”.'
    })
  }

  if (!(input.avoid || []).length) {
    prompts.push({
      id: 'avoid',
      label: 'Question 04',
      title: 'What would make you reject an otherwise good option?',
      description: 'Skip conditions help Bes3 remove low-regret traps before they ever hit the shortlist.',
      example: 'Try deal-breakers like: “dim panel, bulky size, weak ports, glossy screen”.'
    })
  }

  if (input.urgency == null) {
    prompts.push({
      id: 'timing',
      label: 'Question 05',
      title: 'Are you trying to buy now, compare soon, or wait for a better price?',
      description: 'Timing changes the right next step. The same shortlist can point to a product page, compare flow, or price alert depending on urgency.',
      example: 'Choose one: buy now, compare soon, or wait for price.'
    })
  }

  return prompts.slice(0, 3)
}
