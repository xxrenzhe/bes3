import { formatPriceSnapshot } from '@/lib/utils'

export interface ShortlistItem {
  id: number
  slug: string | null
  brand: string | null
  productName: string
  category: string | null
  description: string | null
  heroImageUrl: string | null
  priceAmount: number | null
  priceCurrency: string | null
  rating: number | null
  reviewCount: number | null
  reviewHighlights: string[]
  specSummary: string[]
  specSnapshot: ShortlistSpecEntry[]
  resolvedUrl: string | null
  sourceAffiliateLink: string | null
  publishedAt: string | null
  updatedAt: string | null
}

export interface ShortlistSpecEntry {
  label: string
  value: string
}

export const SHORTLIST_STORAGE_KEY = 'bes3-shortlist'
export const COMPARE_STORAGE_KEY = 'bes3-compare'
export const MAX_COMPARE_ITEMS = 3
export const MAX_SHARED_SHORTLIST_ITEMS = 8

export interface ShortlistSummary {
  itemCount: number
  categoryCount: number
  categoryLabel: string
  categoryNote: string
  priceRangeLabel: string
  priceRangeNote: string
  averageRating: number | null
  averageRatingLabel: string
  buyerProofLabel: string
  buyerProofNote: string
  strongestSignal: string
  overview: string
  decisionNote: string
}

export interface ShortlistDecisionState {
  score: number
  stage: 'signal-building' | 'needs-check' | 'compare-ready' | 'finalist'
  profileLabel: string
  decisionLens: string
  label: string
  note: string
  whySaved: string[]
  gaps: string[]
}

export interface ShortlistDecisionSummary {
  averageScore: number
  compareReadyCount: number
  finalistCount: number
  needsCheckCount: number
  buildingCount: number
  label: string
  note: string
  decisionLens: string
  topGap: string
  nextAction: string
}

export interface ShortlistComparisonRow {
  label: string
  values: string[]
}

export interface ShortlistComparisonSummary {
  lensLabel: string
  lensNote: string
  focusNote: string
  rows: ShortlistComparisonRow[]
}

type ShortlistItemInput = Omit<ShortlistItem, 'reviewHighlights' | 'specSummary' | 'specSnapshot'> & {
  reviewHighlights?: string[] | null
  specSummary?: string[] | null
  specSnapshot?: ShortlistSpecEntry[] | null
  specs?: Record<string, string> | null
}

const DAY_MS = 86_400_000

type CategoryDecisionProfile = {
  id: string
  label: string
  decisionLens: string
  compareFocus: string
  categoryMatchers: string[]
  specKeywords: string[]
  specTag: string
  missingSpecGap: string
}

const GENERIC_DECISION_PROFILE: CategoryDecisionProfile = {
  id: 'generic',
  label: 'General buyer fit',
  decisionLens: 'Bes3 weighs price proof, store availability, buyer reviews, recent checks, and clear tradeoffs before deciding whether a saved pick is strong enough for compare.',
  compareFocus: 'Compare the clearest tradeoffs first.',
  categoryMatchers: [],
  specKeywords: [],
  specTag: 'Decision specs visible',
  missingSpecGap: 'Category-specific specs still thin'
}

const CATEGORY_DECISION_PROFILES: CategoryDecisionProfile[] = [
  {
    id: 'audio',
    label: 'Audio fit',
    decisionLens: 'For audio picks, Bes3 prioritizes comfort, battery, noise control, and tuning clues before price-only offer hype.',
    compareFocus: 'Compare comfort, battery life, and sound or ANC tradeoffs first.',
    categoryMatchers: ['headphone', 'earbud', 'speaker', 'audio'],
    specKeywords: ['battery', 'anc', 'noise', 'driver', 'wireless', 'bluetooth', 'latency', 'weight'],
    specTag: 'Listening tradeoffs visible',
    missingSpecGap: 'Key listening specs still need verification'
  },
  {
    id: 'display',
    label: 'Display fit',
    decisionLens: 'For display products, Bes3 prioritizes panel quality, resolution, refresh rate, and port practicality because those create most buyer regret.',
    compareFocus: 'Compare resolution, refresh, brightness, and connectivity before chasing discounts.',
    categoryMatchers: ['monitor', 'display', 'tv', 'projector'],
    specKeywords: ['resolution', 'refresh', 'brightness', 'panel', 'hdr', 'contrast', 'size', 'port'],
    specTag: 'Display specs visible',
    missingSpecGap: 'Core display specs are still too thin'
  },
  {
    id: 'computing',
    label: 'Compute fit',
    decisionLens: 'For laptops and computing gear, Bes3 prioritizes processor, memory, storage, battery, and portability because those decide real-world usefulness.',
    compareFocus: 'Compare processor, memory, storage, and battery before using price as the tie-breaker.',
    categoryMatchers: ['laptop', 'desktop', 'tablet', 'computer'],
    specKeywords: ['processor', 'cpu', 'chip', 'ram', 'memory', 'storage', 'battery', 'gpu', 'weight'],
    specTag: 'Performance specs visible',
    missingSpecGap: 'Core compute specs still need verification'
  },
  {
    id: 'mobile',
    label: 'Mobile fit',
    decisionLens: 'For phones and wearables, Bes3 prioritizes battery, camera, storage, display, and charging practicality over headline price alone.',
    compareFocus: 'Compare battery, camera, storage, and display quality before checking the final deal.',
    categoryMatchers: ['phone', 'smartphone', 'wearable', 'watch'],
    specKeywords: ['camera', 'battery', 'storage', 'display', 'charging', 'cellular'],
    specTag: 'Mobile priorities visible',
    missingSpecGap: 'Mobile-specific proof is still thin'
  },
  {
    id: 'camera',
    label: 'Capture fit',
    decisionLens: 'For cameras, Bes3 prioritizes sensor, lens range, stabilization, and video capability because those matter more than superficial spec-sheet wins.',
    compareFocus: 'Compare sensor, lens, stabilization, and video workflow before using price to decide.',
    categoryMatchers: ['camera'],
    specKeywords: ['sensor', 'lens', 'stabilization', 'zoom', 'video', 'megapixel', 'iso'],
    specTag: 'Capture specs visible',
    missingSpecGap: 'Capture workflow specs still need verification'
  },
  {
    id: 'home-office',
    label: 'Home setup fit',
    decisionLens: 'For home and utility products, Bes3 prioritizes capacity, operating mode, footprint, and setup constraints because those drive long-term regret more than price alone.',
    compareFocus: 'Compare capacity, mode, and physical setup constraints before treating price as the deciding factor.',
    categoryMatchers: ['home-office', 'appliance', 'kitchen', 'cleaning', 'laundry', 'freezer'],
    specKeywords: ['capacity', 'mode', 'finish', 'power', 'noise', 'dimension', 'size', 'temperature', 'door'],
    specTag: 'Setup constraints visible',
    missingSpecGap: 'Setup and capacity details still need verification'
  }
]

export function toShortlistItem(product: ShortlistItemInput): ShortlistItem {
  const specSnapshot = buildSpecSnapshot(product)

  return {
    id: product.id,
    slug: product.slug,
    brand: product.brand,
    productName: product.productName,
    category: product.category,
    description: product.description,
    heroImageUrl: product.heroImageUrl,
    priceAmount: product.priceAmount,
    priceCurrency: product.priceCurrency,
    rating: product.rating,
    reviewCount: product.reviewCount,
    reviewHighlights: (product.reviewHighlights || []).slice(0, 3),
    specSummary: buildSpecSummary({
      ...product,
      specSnapshot
    }),
    specSnapshot,
    resolvedUrl: product.resolvedUrl,
    sourceAffiliateLink: 'sourceAffiliateLink' in product && typeof product.sourceAffiliateLink === 'string' ? product.sourceAffiliateLink : null,
    publishedAt: product.publishedAt,
    updatedAt: product.updatedAt
  }
}

function hasShortlistMerchantExitTarget(item: Pick<ShortlistItem, 'resolvedUrl' | 'sourceAffiliateLink'>) {
  return Boolean(item.resolvedUrl || item.sourceAffiliateLink)
}

export function getShortlistProductPath(item: Pick<ShortlistItem, 'slug'>) {
  return item.slug ? `/products/${item.slug}` : '/directory'
}

function normalizeShortlistIds(ids: number[]) {
  return ids
    .filter((id) => Number.isInteger(id) && id > 0)
    .filter((id, index, list) => list.indexOf(id) === index)
    .slice(0, MAX_SHARED_SHORTLIST_ITEMS)
}

export function parseShortlistShareValue(value: string | string[] | undefined) {
  const rawValue = Array.isArray(value) ? value[0] : value
  if (!rawValue) return []

  return normalizeShortlistIds(
    rawValue
      .split(',')
      .map((item) => Number(item.trim()))
  )
}

export function buildShortlistSharePath(items: Array<Pick<ShortlistItem, 'id'> | number>) {
  const ids = normalizeShortlistIds(items.map((item) => (typeof item === 'number' ? item : item.id)))
  if (!ids.length) return '/shortlist'

  const params = new URLSearchParams({ items: ids.join(',') })
  return `/shortlist?${params.toString()}`
}

function humanizeCategory(category: string | null) {
  return category ? category.replace(/-/g, ' ') : 'saved shortlist'
}

function normalizeDecisionText(value: string | null | undefined) {
  return String(value || '').trim().toLowerCase()
}

function pushUnique(items: string[], value: string | null | undefined) {
  if (!value || items.includes(value)) return
  items.push(value)
}

function parseShortlistTimestamp(value: string | null | undefined) {
  if (!value) return null
  const timestamp = new Date(value).getTime()
  return Number.isNaN(timestamp) ? null : timestamp
}

function buildSpecSummary(product: ShortlistItemInput) {
  const directSummary = Array.isArray(product.specSummary)
    ? product.specSummary.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    : []

  if (directSummary.length) {
    return directSummary.slice(0, 6)
  }

  const snapshotLabels = Array.isArray(product.specSnapshot)
    ? product.specSnapshot
        .filter((item): item is ShortlistSpecEntry => Boolean(item) && typeof item.label === 'string' && item.label.trim().length > 0)
        .map((item) => item.label)
    : []

  if (snapshotLabels.length) {
    return snapshotLabels.slice(0, 6)
  }

  const specKeys = product.specs && typeof product.specs === 'object'
    ? Object.keys(product.specs).filter((key) => key.trim().length > 0)
    : []

  return specKeys.slice(0, 6)
}

function buildSpecSnapshot(product: ShortlistItemInput): ShortlistSpecEntry[] {
  const directSnapshot = Array.isArray(product.specSnapshot)
    ? product.specSnapshot.filter(
        (item): item is ShortlistSpecEntry =>
          Boolean(item) &&
          typeof item === 'object' &&
          typeof item.label === 'string' &&
          item.label.trim().length > 0 &&
          typeof item.value === 'string' &&
          item.value.trim().length > 0
      )
    : []

  if (directSnapshot.length) {
    return directSnapshot.slice(0, 6)
  }

  if (!product.specs || typeof product.specs !== 'object') {
    return []
  }

  return Object.entries(product.specs)
    .filter(([label, value]) => label.trim().length > 0 && String(value || '').trim().length > 0)
    .slice(0, 6)
    .map(([label, value]) => ({
      label,
      value: String(value)
    }))
}

function getCategoryDecisionProfile(item: ShortlistItem) {
  const category = normalizeDecisionText(item.category)
  const specText = item.specSummary.map((spec) => normalizeDecisionText(spec)).join(' ')

  const categoryMatch = CATEGORY_DECISION_PROFILES.find((profile) =>
    profile.categoryMatchers.some((matcher) => category.includes(matcher))
  )
  if (categoryMatch) return categoryMatch

  const specMatch = CATEGORY_DECISION_PROFILES
    .map((profile) => ({
      profile,
      hits: profile.specKeywords.filter((keyword) => specText.includes(keyword)).length
    }))
    .sort((left, right) => right.hits - left.hits)[0]

  if (specMatch && specMatch.hits >= 2) {
    return specMatch.profile
  }

  return GENERIC_DECISION_PROFILE
}

export function getShortlistDecisionState(
  item: ShortlistItem,
  options?: {
    shortlistSize?: number
    compareIds?: number[]
  }
): ShortlistDecisionState {
  const shortlistSize = Math.max(1, options?.shortlistSize || 1)
  const inCompare = (options?.compareIds || []).includes(item.id)
  const profile = getCategoryDecisionProfile(item)
  const whySaved: string[] = []
  const gaps: string[] = []
  let score = 0

  if (item.priceAmount !== null && item.priceAmount !== undefined && Number.isFinite(item.priceAmount) && item.priceAmount > 0) {
    score += 15
    pushUnique(whySaved, 'Verified price')
  } else {
    pushUnique(gaps, 'Current price still missing')
  }

  if (hasShortlistMerchantExitTarget(item)) {
    score += 15
    pushUnique(whySaved, 'Store link ready')
  } else {
    pushUnique(gaps, 'Store link still pending')
  }

  const rating = item.rating || 0
  const reviewCount = item.reviewCount || 0

  if (rating >= 4.4 && reviewCount >= 1000) {
    score += 20
    pushUnique(whySaved, 'Strong review proof')
  } else if (rating >= 4.1 && reviewCount >= 200) {
    score += 16
    pushUnique(whySaved, 'Review-backed')
  } else if (rating >= 4.4) {
    score += 12
    pushUnique(whySaved, 'High buyer rating')
  } else if (reviewCount >= 1000) {
    score += 12
    pushUnique(whySaved, 'Heavy review volume')
  } else if (rating >= 4 || reviewCount >= 200) {
    score += 8
    pushUnique(whySaved, 'Early review proof')
  } else {
    pushUnique(gaps, 'Review proof still thin')
  }

  if (item.reviewHighlights.length) {
    score += 15
    pushUnique(whySaved, 'Clear tradeoff clue')
  } else if (item.description) {
    score += 10
    pushUnique(whySaved, 'Clear use case')
  } else {
    pushUnique(gaps, 'Product-page detail still thin')
  }

  if (item.specSummary.length) {
    const specText = item.specSummary.map((spec) => normalizeDecisionText(spec)).join(' ')
    const profileSpecHits = profile.specKeywords.filter((keyword) => specText.includes(keyword)).length

    if (profile.id !== GENERIC_DECISION_PROFILE.id && profileSpecHits >= 2) {
      score += 12
      pushUnique(whySaved, profile.specTag)
    } else if (item.specSummary.length >= 2) {
      score += 8
      pushUnique(whySaved, GENERIC_DECISION_PROFILE.specTag)
    } else {
      score += 4
      pushUnique(whySaved, 'Some specs visible')
    }
  } else {
    pushUnique(gaps, profile.missingSpecGap)
  }

  const signalTimestamp = parseShortlistTimestamp(item.updatedAt || item.publishedAt)
  if (signalTimestamp !== null) {
    const ageDays = Math.max(0, Math.floor((Date.now() - signalTimestamp) / DAY_MS))

    if (ageDays <= 14) {
      score += 15
      pushUnique(whySaved, 'Freshly checked')
    } else if (ageDays <= 45) {
      score += 10
      pushUnique(whySaved, 'Recently checked')
    } else {
      score += 5
      pushUnique(gaps, 'Snapshot needs a fresher check')
    }
  } else {
    pushUnique(gaps, 'Recent update still unclear')
  }

  if (inCompare) {
    score += 20
    pushUnique(whySaved, 'Already in compare')
  } else if (shortlistSize >= 2) {
    score += 10
    pushUnique(whySaved, 'Ready for compare')
  } else {
    pushUnique(gaps, 'Needs one more contender')
  }

  const boundedScore = Math.max(0, Math.min(100, score))

  if (inCompare && boundedScore >= 70) {
    return {
      score: boundedScore,
      stage: 'finalist',
      profileLabel: profile.label,
      decisionLens: profile.decisionLens,
      label: 'Finalist',
      note: `${profile.compareFocus} This finalist already has enough proof to move toward price and store checks.`,
      whySaved: whySaved.slice(0, 4),
      gaps: gaps.slice(0, 2)
    }
  }

  if (boundedScore >= 70) {
    return {
      score: boundedScore,
      stage: 'compare-ready',
      profileLabel: profile.label,
      decisionLens: profile.decisionLens,
      label: 'Ready to compare',
      note: `${profile.compareFocus} This pick already carries enough context to become a finalist now.`,
      whySaved: whySaved.slice(0, 4),
      gaps: gaps.slice(0, 2)
    }
  }

  if (boundedScore >= 45) {
    return {
      score: boundedScore,
      stage: 'needs-check',
      profileLabel: profile.label,
      decisionLens: profile.decisionLens,
      label: 'Needs one more check',
      note: gaps[0]
        ? `Strong option, but ${gaps[0].charAt(0).toLowerCase()}${gaps[0].slice(1)} before it belongs in compare.`
        : 'Strong option, but it still needs one tighter proof point before it belongs in compare.',
      whySaved: whySaved.slice(0, 4),
      gaps: gaps.slice(0, 2)
    }
  }

  return {
    score: boundedScore,
    stage: 'signal-building',
    profileLabel: profile.label,
    decisionLens: profile.decisionLens,
    label: 'Still building',
    note: 'Worth keeping visible, but the supporting proof is still too thin to treat this as a serious finalist.',
    whySaved: whySaved.slice(0, 4),
    gaps: gaps.slice(0, 2)
  }
}

export function summarizeShortlistDecisionReadiness(items: ShortlistItem[], compareIds: number[] = []): ShortlistDecisionSummary {
  if (!items.length) {
    return {
      averageScore: 0,
      compareReadyCount: 0,
      finalistCount: 0,
      needsCheckCount: 0,
      buildingCount: 0,
      label: 'No shortlist yet',
      note: 'Save a few products first so Bes3 can tell you which ones are actually ready to compare.',
      decisionLens: GENERIC_DECISION_PROFILE.decisionLens,
      topGap: 'No saved picks yet.',
      nextAction: 'Add products from search, offers, or category pages to start building a real shortlist.'
    }
  }

  const states = items.map((item) =>
    getShortlistDecisionState(item, {
      shortlistSize: items.length,
      compareIds
    })
  )

  const averageScore = Math.round(states.reduce((sum, state) => sum + state.score, 0) / states.length)
  const compareReadyCount = states.filter((state) => state.stage === 'compare-ready').length
  const finalistCount = states.filter((state) => state.stage === 'finalist').length
  const needsCheckCount = states.filter((state) => state.stage === 'needs-check').length
  const buildingCount = states.filter((state) => state.stage === 'signal-building').length
  const dominantLensEntry = Array.from(
    states.reduce((result, state) => {
      result.set(state.decisionLens, (result.get(state.decisionLens) || 0) + 1)
      return result
    }, new Map<string, number>()).entries()
  ).sort((left, right) => right[1] - left[1])[0]
  const decisionLens = dominantLensEntry && dominantLensEntry[1] === items.length
    ? dominantLensEntry[0]
    : 'This shortlist spans multiple product types, so Bes3 blends shared buying cues with category-specific checks before calling anything ready for compare.'

  const missingPriceCount = items.filter((item) => item.priceAmount === null || item.priceAmount === undefined || !Number.isFinite(item.priceAmount)).length
  const missingMerchantCount = items.filter((item) => !hasShortlistMerchantExitTarget(item)).length
  const missingSpecCount = states.filter((state) => state.gaps.some((gap) => gap.toLowerCase().includes('spec') || gap.toLowerCase().includes('capacity') || gap.toLowerCase().includes('setup'))).length
  const thinProofCount = items.filter((item) => (item.rating || 0) < 4 && (item.reviewCount || 0) < 200).length
  const staleCheckCount = items.filter((item) => {
    const timestamp = parseShortlistTimestamp(item.updatedAt || item.publishedAt)
    if (timestamp === null) return true
    return Date.now() - timestamp > 45 * DAY_MS
  }).length
  const noMajorGapLabel = 'No major proof gaps remain.'

  const topGap = missingMerchantCount
    ? `${missingMerchantCount} ${missingMerchantCount === 1 ? 'pick still lacks' : 'picks still lack'} a working store link.`
    : missingPriceCount
      ? `${missingPriceCount} ${missingPriceCount === 1 ? 'pick is still missing' : 'picks are still missing'} a current price.`
      : missingSpecCount
        ? `${missingSpecCount} ${missingSpecCount === 1 ? 'pick still needs' : 'picks still need'} category-specific spec context.`
      : thinProofCount
        ? `${thinProofCount} ${thinProofCount === 1 ? 'pick still needs' : 'picks still need'} stronger review proof.`
        : staleCheckCount
          ? `${staleCheckCount} ${staleCheckCount === 1 ? 'pick needs' : 'picks need'} a newer check.`
          : noMajorGapLabel

  if (finalistCount >= 2) {
    return {
      averageScore,
      compareReadyCount,
      finalistCount,
      needsCheckCount,
      buildingCount,
      label: 'Choice in motion',
      note: `${finalistCount} finalists already sit in compare, so the shortlist is now supporting a real choice instead of passive saving.`,
      decisionLens,
      topGap,
      nextAction: 'Use the compare table, then check store pricing only for the finalists instead of reopening the whole search.'
    }
  }

  if (compareReadyCount >= 2) {
    return {
      averageScore,
      compareReadyCount,
      finalistCount,
      needsCheckCount,
      buildingCount,
      label: 'Ready to compare',
      note: `${compareReadyCount} saved ${compareReadyCount === 1 ? 'pick already has' : 'picks already have'} enough proof to become finalists.`,
      decisionLens,
      topGap,
      nextAction: 'Move the strongest two or three picks into compare before adding anything new.'
    }
  }

  if (finalistCount >= 1 && compareReadyCount >= 1) {
    return {
      averageScore,
      compareReadyCount,
      finalistCount,
      needsCheckCount,
      buildingCount,
      label: 'Final shortlist forming',
      note: `${finalistCount} ${finalistCount === 1 ? 'finalist is' : 'finalists are'} already in compare and ${compareReadyCount} saved ${compareReadyCount === 1 ? 'pick is' : 'picks are'} ready to join them.`,
      decisionLens,
      topGap,
      nextAction: 'Promote the compare-ready pick into compare for a cleaner head-to-head instead of adding new candidates.'
    }
  }

  if (items.length === 1) {
    return {
      averageScore,
      compareReadyCount,
      finalistCount,
      needsCheckCount,
      buildingCount,
      label: 'Too early to decide',
      note: 'One saved product is still a preference, not a real choice yet.',
      decisionLens,
      topGap,
      nextAction: 'Add one same-category alternative so the tradeoffs become obvious.'
    }
  }

  if (buildingCount >= Math.ceil(items.length / 2)) {
    return {
      averageScore,
      compareReadyCount,
      finalistCount,
      needsCheckCount,
      buildingCount,
      label: 'Proof still uneven',
      note: `${buildingCount} saved ${buildingCount === 1 ? 'pick is' : 'picks are'} still building evidence, so the shortlist is not ready to collapse into finalists yet.`,
      decisionLens,
      topGap,
      nextAction: `Close the biggest gap next: ${topGap}`
    }
  }

  return {
    averageScore,
    compareReadyCount,
    finalistCount,
    needsCheckCount,
    buildingCount,
    label: 'Shortlist taking shape',
    note: `${needsCheckCount} ${needsCheckCount === 1 ? 'pick is' : 'picks are'} close, but the shortlist still has one main proof gap to close before compare gets cleaner.`,
    decisionLens,
    topGap,
    nextAction: topGap === noMajorGapLabel
      ? 'Promote the strongest remaining pick into compare instead of widening the shortlist.'
      : `Tighten the shortlist by fixing the biggest gap first: ${topGap}`
  }
}

function findSpecValueByLabel(item: ShortlistItem, label: string) {
  const normalizedLabel = normalizeDecisionText(label)
  const exact = item.specSnapshot.find((entry) => normalizeDecisionText(entry.label) === normalizedLabel)
  if (exact) return exact.value

  const loose = item.specSnapshot.find((entry) => {
    const candidate = normalizeDecisionText(entry.label)
    return candidate.includes(normalizedLabel) || normalizedLabel.includes(candidate)
  })
  return loose?.value || null
}

function buildPrimarySpecValue(item: ShortlistItem) {
  const primaryEntry = item.specSnapshot[0]
  if (primaryEntry) {
    return `${primaryEntry.label}: ${primaryEntry.value}`
  }

  return item.specSummary[0] || 'Open product page'
}

function buildCategorySpecificComparisonRows(items: ShortlistItem[], profile: CategoryDecisionProfile) {
  if (profile.id === GENERIC_DECISION_PROFILE.id) return []

  const labelMap = new Map<string, { label: string; hits: number; priority: number }>()

  items.forEach((item) => {
    item.specSnapshot.forEach((entry) => {
      const normalizedLabel = normalizeDecisionText(entry.label)
      const matchedKeywordIndexes = profile.specKeywords.reduce<number[]>((result, keyword, index) => {
        if (normalizedLabel.includes(keyword) || keyword.includes(normalizedLabel)) {
          result.push(index)
        }
        return result
      }, [])
      const keywordHits = matchedKeywordIndexes.length
      if (!keywordHits) return

      const priority = matchedKeywordIndexes[0] ?? profile.specKeywords.length

      const current = labelMap.get(normalizedLabel)
      if (current) {
        current.hits += keywordHits
        current.priority = Math.min(current.priority, priority)
        return
      }

      labelMap.set(normalizedLabel, {
        label: entry.label,
        hits: keywordHits,
        priority
      })
    })
  })

  return Array.from(labelMap.values())
    .sort((left, right) => {
      if (right.hits !== left.hits) return right.hits - left.hits
      if (left.priority !== right.priority) return left.priority - right.priority
      return left.label.localeCompare(right.label)
    })
    .slice(0, 3)
    .map((entry) => ({
      label: entry.label,
      values: items.map((item) => findSpecValueByLabel(item, entry.label) || 'Not surfaced')
    }))
}

export function buildShortlistComparisonSummary(items: ShortlistItem[]): ShortlistComparisonSummary {
  if (!items.length) {
    return {
      lensLabel: 'What matters most',
      lensNote: GENERIC_DECISION_PROFILE.decisionLens,
      focusNote: 'Add at least two finalists to compare product-level tradeoffs.',
      rows: []
    }
  }

  const states = items.map((item) => getShortlistDecisionState(item, { shortlistSize: items.length, compareIds: items.map((candidate) => candidate.id) }))
  const profiles = items.map((item) => getCategoryDecisionProfile(item))
  const allSameProfile = profiles.every((profile) => profile.id === profiles[0]?.id)
  const dominantProfileEntry = Array.from(
    profiles.reduce((result, profile) => {
      result.set(profile.id, {
        profile,
        count: (result.get(profile.id)?.count || 0) + 1
      })
      return result
    }, new Map<string, { profile: CategoryDecisionProfile; count: number }>()).values()
  ).sort((left, right) => right.count - left.count)[0]
  const dominantProfile = dominantProfileEntry?.profile || GENERIC_DECISION_PROFILE

  const rows: ShortlistComparisonRow[] = []

  if (allSameProfile) {
    rows.push(...buildCategorySpecificComparisonRows(items, dominantProfile))
    if (!rows.length) {
      rows.push({
        label: 'Key spec',
        values: items.map((item) => buildPrimarySpecValue(item))
      })
    }
  } else {
    rows.push({
      label: 'Best fit',
      values: states.map((state) => state.profileLabel)
    })
    rows.push({
      label: 'Key spec',
      values: items.map((item) => buildPrimarySpecValue(item))
    })
  }

  rows.push(
    {
      label: 'Price',
      values: items.map((item) => formatPriceSnapshot(item.priceAmount, item.priceCurrency || 'USD'))
    },
    {
      label: 'User rating',
      values: items.map((item) => (item.rating ? `${item.rating.toFixed(1)} / 5` : 'Rating pending'))
    },
    {
      label: 'Review count',
      values: items.map((item) => (item.reviewCount ? item.reviewCount.toLocaleString() : 'Pending'))
    },
    {
      label: 'Best clue',
      values: items.map((item) => item.reviewHighlights[0] || item.description || 'Open the product page for the fuller picture')
    }
  )

  if (allSameProfile) {
    return {
      lensLabel: dominantProfile.label,
      lensNote: dominantProfile.decisionLens,
      focusNote: items.length >= 2 ? dominantProfile.compareFocus : 'Add one more finalist so Bes3 can expose the real tradeoffs instead of showing a single-item snapshot.',
      rows
    }
  }

  return {
    lensLabel: 'Mixed-category shortlist',
    lensNote: 'These finalists span different product types, so Bes3 compares fit, key specs, and review proof before asking you to collapse them into one compare group.',
    focusNote: 'Use the matrix to identify whether one product type is clearly dominating your actual use case before checking prices.',
    rows
  }
}

function formatShortlistPriceRange(items: ShortlistItem[]) {
  const pricedItems = items.filter(
    (item) =>
      item.priceAmount !== null &&
      item.priceAmount !== undefined &&
      Number.isFinite(item.priceAmount) &&
      item.priceAmount > 0 &&
      item.priceCurrency
  )

  if (!pricedItems.length) {
    return {
      label: 'Price pending',
      note: 'Bes3 is still waiting on a stable current price.'
    }
  }

  const currencies = Array.from(new Set(pricedItems.map((item) => item.priceCurrency)))
  if (currencies.length > 1) {
    return {
      label: 'Mixed pricing',
      note: 'The shared picks span multiple currencies.'
    }
  }

  const currency = currencies[0] || 'USD'
  const amounts = pricedItems
    .map((item) => item.priceAmount as number)
    .sort((left, right) => left - right)

  const minLabel = formatPriceSnapshot(amounts[0], currency)
  const maxLabel = formatPriceSnapshot(amounts[amounts.length - 1], currency)

  if (amounts[0] === amounts[amounts.length - 1]) {
    return {
      label: minLabel,
      note: pricedItems.length === 1 ? 'Only one shared pick has a confirmed price.' : 'Every shared pick currently sits at the same price point.'
    }
  }

  return {
    label: `${minLabel} - ${maxLabel}`,
    note: `${pricedItems.length} of ${items.length} shared picks have a confirmed price.`
  }
}

function pickStrongestSignal(items: ShortlistItem[]) {
  const candidates = items
    .map((item) => ({
      item,
      clue: item.reviewHighlights[0] || item.description,
      rating: item.rating ?? 0,
      reviewCount: item.reviewCount ?? 0
    }))
    .filter((candidate) => candidate.clue)
    .sort((left, right) => {
      if (right.rating !== left.rating) return right.rating - left.rating
      return right.reviewCount - left.reviewCount
    })

  const strongest = candidates[0]
  if (!strongest) {
    return 'Open the product pages to review the full Bes3 take on each option.'
  }

  return `${strongest.item.productName}: ${strongest.clue}`
}

export function summarizeShortlist(items: ShortlistItem[]): ShortlistSummary {
  const categories = Array.from(new Set(items.map((item) => humanizeCategory(item.category))))
  const ratedItems = items.filter((item) => item.rating !== null && item.rating !== undefined && item.rating > 0)
  const totalReviews = items.reduce((sum, item) => sum + (item.reviewCount || 0), 0)
  const averageRating = ratedItems.length
    ? Math.round(
        (ratedItems.reduce((sum, item) => sum + (item.rating || 0), 0) / ratedItems.length) * 10
      ) / 10
    : null
  const priceRange = formatShortlistPriceRange(items)

  const categoryLabel =
    categories.length <= 1
      ? categories[0] || 'Mixed shortlist'
      : `${categories.length} categories`
  const categoryNote =
    categories.length <= 2
      ? categories.join(' and ')
      : `${categories.slice(0, 2).join(', ')} and ${categories.length - 2} more`

  const averageRatingLabel = averageRating ? `${averageRating.toFixed(1)} / 5` : 'Rating pending'
  const buyerProofLabel = totalReviews
    ? `${totalReviews.toLocaleString()} reviews`
    : ratedItems.length
      ? `${ratedItems.length} rated picks`
      : 'Early review proof'

  return {
    itemCount: items.length,
    categoryCount: categories.length,
    categoryLabel,
    categoryNote: categoryNote || 'Bes3 is still grouping the category mix.',
    priceRangeLabel: priceRange.label,
    priceRangeNote: priceRange.note,
    averageRating,
    averageRatingLabel,
    buyerProofLabel,
    buyerProofNote: totalReviews
      ? 'Enough review proof to share the shortlist context with someone else.'
      : 'This shortlist is still early, so use the product pages for deeper validation.',
    strongestSignal: pickStrongestSignal(items),
    overview: items.length
      ? `${items.length} ${items.length === 1 ? 'pick' : 'picks'} across ${
          categories.length || 1
        } ${categories.length === 1 ? 'category' : 'categories'}.`
      : 'No shared picks yet.',
    decisionNote: averageRating
      ? `Average rating is ${averageRating.toFixed(1)} / 5${totalReviews ? ` across ${totalReviews.toLocaleString()} reviews` : ''}.`
      : totalReviews
        ? `${totalReviews.toLocaleString()} buyer reviews are already tracked across the shared set.`
        : 'Proof is still building, so lean on the product pages before choosing.'
  }
}

export function buildShortlistBuyingBrief(items: ShortlistItem[]) {
  if (!items.length) return 'No shortlist items selected.'

  const summary = summarizeShortlist(items)
  const decisionSummary = summarizeShortlistDecisionReadiness(items)

  return [
    'Bes3 shortlist summary',
    `${summary.overview} ${summary.decisionNote}`,
    `Shortlist readiness: ${decisionSummary.label} (${decisionSummary.averageScore}/100 average).`,
    `What matters most: ${decisionSummary.decisionLens}`,
    `Next move: ${decisionSummary.nextAction}`,
    `Price range: ${summary.priceRangeLabel}.`,
    `Strongest reason: ${summary.strongestSignal}`,
    '',
    ...items.map((item, index) => {
      const notes = item.reviewHighlights[0] || item.description || 'Open the product page for the full Bes3 read.'
      const ratingLabel = item.rating ? `${item.rating.toFixed(1)} / 5` : 'Rating pending'
      const decisionState = getShortlistDecisionState(item, { shortlistSize: items.length })
      const whySaved = decisionState.whySaved.length ? `Why saved: ${decisionState.whySaved.slice(0, 3).join(', ')}.` : ''

      return `${index + 1}. ${item.productName} (${humanizeCategory(item.category)}) - ${formatPriceSnapshot(
        item.priceAmount,
        item.priceCurrency || 'USD'
      )} - ${ratingLabel} - ${decisionState.label} ${decisionState.score}/100 - ${whySaved} ${notes}`.trim()
    })
  ].join('\n')
}
