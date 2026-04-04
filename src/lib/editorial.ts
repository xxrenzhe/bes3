import type { ArticleRecord, ProductRecord } from '@/lib/site-data'
import { formatCurrency } from '@/lib/utils'

function parseDate(value: string | null | undefined): Date | null {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

export function formatEditorialDate(value: string | null | undefined, fallback: string = 'Recently updated') {
  const date = parseDate(value)
  if (!date) return fallback

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  }).format(date)
}

export function getFreshnessLabel(value: string | null | undefined) {
  const date = parseDate(value)
  if (!date) return 'Freshness tracking starts after first publish.'

  const days = Math.max(0, Math.floor((Date.now() - date.getTime()) / 86_400_000))
  if (days <= 7) return 'Updated this week'
  if (days <= 30) return 'Updated this month'
  if (days <= 60) return 'Review this quarter'
  return `${days} days since latest refresh`
}

export function getCategoryLabel(category: string | null | undefined) {
  return category ? category.replace(/-/g, ' ') : 'general tech'
}

export function getSnapshotDate(article?: ArticleRecord | null, product?: ProductRecord | null) {
  return article?.updatedAt || article?.publishedAt || product?.updatedAt || product?.publishedAt || null
}

export function buildBestFor(product?: ProductRecord | null, articleType: 'review' | 'comparison' | 'product' = 'review') {
  if (!product) {
    return articleType === 'comparison'
      ? 'Buyers who want a fast answer without manually comparing every edge case.'
      : 'Shoppers who want a clear recommendation without spending another week in research mode.'
  }

  if ((product.reviewCount || 0) > 5000 && (product.rating || 0) >= 4.3) {
    return `${product.productName} fits mainstream ${getCategoryLabel(product.category)} shoppers who want the safest low-regret pick.`
  }

  if ((product.priceAmount || 0) > 0 && (product.priceAmount || 0) < 150) {
    return `${product.productName} fits value-first buyers who want a practical ${getCategoryLabel(product.category)} option without paying premium prices.`
  }

  if (articleType === 'product') {
    return `${product.productName} fits buyers who already narrowed the field and now want product-level confidence before clicking through.`
  }

  return `${product.productName} fits shoppers who want dependable performance, strong buyer signal, and a straightforward purchase decision.`
}

export function buildNotFor(product?: ProductRecord | null, articleType: 'review' | 'comparison' | 'product' = 'review') {
  if (!product) {
    return articleType === 'comparison'
      ? 'Not ideal for buyers with a highly specialized requirement that changes the comparison criteria.'
      : 'Not ideal for buyers chasing a niche edge-case feature instead of a strong all-around recommendation.'
  }

  if ((product.priceAmount || 0) >= 500) {
    return `${product.productName} is not the right fit for budget-led shoppers who only need the core job done.`
  }

  if ((product.reviewCount || 0) < 200) {
    return `${product.productName} is not ideal for buyers who only trust products with a large review history and heavier social proof.`
  }

  if (articleType === 'product') {
    return `${product.productName} is not ideal for shoppers who are still deciding between categories and have not narrowed their shortlist yet.`
  }

  return `${product.productName} is not the best fit if you need an extreme niche spec or want to optimize for a single edge-case workflow.`
}

export function buildConfidenceSignals(product?: ProductRecord | null) {
  if (!product) {
    return ['Editorial review refreshed', 'Decision criteria summarized', 'Affiliate disclosure visible']
  }

  const signals = []
  if (product.rating) {
    signals.push(`${product.rating.toFixed(1)} / 5 rating signal`)
  }
  if (product.reviewCount) {
    signals.push(`${product.reviewCount.toLocaleString()} buyer reviews`)
  }
  if (product.priceAmount !== null) {
    signals.push(`Current price snapshot ${formatCurrency(product.priceAmount, product.priceCurrency || 'USD')}`)
  }

  return signals.length ? signals : ['Price and buyer signals are still being gathered']
}

export function buildDecisionChecklist(product?: ProductRecord | null) {
  const base = [
    'Use category fit first, not price alone, to narrow the shortlist.',
    'Treat rating and review count as confidence signals, not automatic proof.',
    'Click through only after you know whether this pick matches your actual use case.'
  ]

  if (!product) return base

  const extras = []
  if (product.priceAmount !== null) {
    extras.push(`If price is within your budget, ${product.productName} is already viable enough to move to merchant-level checking.`)
  }
  if (product.reviewHighlights.length) {
    extras.push(product.reviewHighlights[0])
  }

  return [...extras, ...base].slice(0, 4)
}
