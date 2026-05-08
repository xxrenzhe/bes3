import { buildCommerceDecisionReadiness, buildEvidenceDecisionReadiness, type DecisionReadinessSignal } from '@/lib/decision-readiness'
import type { EntryStatus, HardcoreProduct } from '@/lib/hardcore'
import { formatHardcorePrice } from '@/lib/hardcore'
import { buildMerchantExitPath, hasMerchantExitTarget, isCommissionableMerchantUrl } from '@/lib/merchant-links'
import type { CommerceProductRecord, ProductRecord } from '@/lib/site-data'
import { formatPriceSnapshot } from '@/lib/utils'

export type PurchaseDecisionState =
  | 'buy_now'
  | 'compare_first'
  | 'watch_price'
  | 'skip'
  | 'researching'
  | 'link_unavailable'

export type PurchaseDecisionPageType = 'product' | 'review' | 'deal' | 'category' | 'compare' | 'scenario' | 'matrix'

export type PurchaseDecisionPriceStatus = EntryStatus | 'missing'

export interface PurchaseDecisionContext {
  pageType: PurchaseDecisionPageType
  trackingSource: string
  hasAlternatives?: boolean
  alternativeHref?: string | null
  categoryHref?: string | null
  userIntent?: string | null
  visitorId?: string | null
  offerId?: number | null
}

export interface PurchaseDecisionInput {
  id: number
  name: string
  href: string
  readiness: DecisionReadinessSignal
  hasMerchantHandoff: boolean
  isOutOfStock: boolean
  isBrokenLink: boolean
  evidenceCount: number
  confidenceLabel: string
  scoreLabel: string
  priceLine: string
  priceStatus: PurchaseDecisionPriceStatus
  criticalRisk?: string | null
  proofSignals: string[]
  riskSignals: string[]
}

export interface PurchaseDecision {
  productId: number
  productName: string
  state: PurchaseDecisionState
  stateLabel: string
  pageType: PurchaseDecisionPageType
  headline: string
  summary: string
  primaryActionLabel: string
  primaryActionHref: string | null
  secondaryActionLabel: string
  secondaryActionHref: string | null
  proofBullets: string[]
  riskBullets: string[]
  priceLine: string
  priceStatus: PurchaseDecisionPriceStatus
  confidenceLine: string
  evidenceCount: number
  trackingSource: string
  ctaVariant: string
  metadata: Record<string, string | number | boolean | null>
}

function firstItems(values: string[], limit: number, fallback: string[]) {
  const cleaned = values.map((value) => value.trim()).filter(Boolean)
  return (cleaned.length ? cleaned : fallback).slice(0, limit)
}

function hasPriceBlocker(input: PurchaseDecisionInput) {
  return input.priceStatus === 'overpriced'
}

function hasEvidenceBlocker(input: PurchaseDecisionInput) {
  return input.readiness.state === 'not-ready' || input.criticalRisk || input.scoreLabel.toLowerCase().includes('do not buy')
}

function buildDecisionMetadata(input: PurchaseDecisionInput, context: PurchaseDecisionContext, state: PurchaseDecisionState) {
  const ctaVariant = `${state}-${context.pageType}`
  return {
    pageType: context.pageType,
    purchaseDecisionState: state,
    priceStatus: input.priceStatus,
    evidenceCount: input.evidenceCount,
    ctaVariant,
    hasAlternatives: Boolean(context.hasAlternatives),
    hasMerchantHandoff: input.hasMerchantHandoff
  }
}

function buildPrimaryHref(input: PurchaseDecisionInput, context: PurchaseDecisionContext, state: PurchaseDecisionState) {
  if (state !== 'buy_now') return null
  if (!input.hasMerchantHandoff || input.isOutOfStock || input.isBrokenLink) return null
  return buildMerchantExitPath(input.id, context.trackingSource, context.visitorId, context.offerId, buildDecisionMetadata(input, context, state))
}

function chooseState(input: PurchaseDecisionInput, context: PurchaseDecisionContext): PurchaseDecisionState {
  if (input.criticalRisk || input.scoreLabel.toLowerCase().includes('do not buy')) return 'skip'
  if (input.readiness.state === 'not-ready') return input.evidenceCount > 0 ? 'researching' : 'skip'
  if (!input.hasMerchantHandoff || input.isOutOfStock || input.isBrokenLink) return 'link_unavailable'
  if (hasPriceBlocker(input) || input.readiness.state === 'watch-price') return 'watch_price'
  if (context.hasAlternatives || input.readiness.state === 'research-ready') return 'compare_first'
  return 'buy_now'
}

function stateLabel(state: PurchaseDecisionState) {
  switch (state) {
    case 'buy_now':
      return 'Buy now'
    case 'compare_first':
      return 'Compare first'
    case 'watch_price':
      return 'Watch price'
    case 'skip':
      return 'Skip'
    case 'researching':
      return 'Researching'
    case 'link_unavailable':
      return 'Link unavailable'
  }
}

function buildCopy(input: PurchaseDecisionInput, context: PurchaseDecisionContext, state: PurchaseDecisionState) {
  const name = input.name
  switch (state) {
    case 'buy_now':
      return {
        headline: `Buy ${name} if the live merchant terms still match.`,
        summary: 'Evidence, price context, and the verified merchant handoff are strong enough for a purchase decision.',
        primaryActionLabel: 'Check current price',
        secondaryActionLabel: 'View evidence',
        secondaryActionHref: input.href
      }
    case 'compare_first':
      return {
        headline: `Compare ${name} before buying.`,
        summary: context.userIntent
          ? `This is a plausible fit for ${context.userIntent}, but alternatives are close enough to compare first.`
          : 'This product is credible, but nearby alternatives or incomplete fit signals make comparison the safer next step.',
        primaryActionLabel: 'Compare alternatives',
        secondaryActionLabel: 'View evidence',
        secondaryActionHref: input.href
      }
    case 'watch_price':
      return {
        headline: `Wait for a better buy window on ${name}.`,
        summary: 'The product can stay on the shortlist, but current price timing does not justify a strong buy CTA.',
        primaryActionLabel: 'Track price drop',
        secondaryActionLabel: 'View evidence',
        secondaryActionHref: input.href
      }
    case 'skip':
      return {
        headline: `Skip ${name} for now.`,
        summary: input.criticalRisk || 'Current evidence or readiness signals are too weak to support a purchase recommendation.',
        primaryActionLabel: 'See safer pick',
        secondaryActionLabel: 'Read evidence',
        secondaryActionHref: input.href
      }
    case 'researching':
      return {
        headline: `${name} needs more proof before buying.`,
        summary: 'Bes3 has some useful context, but not enough validated evidence and price data for a direct purchase recommendation.',
        primaryActionLabel: 'Browse category',
        secondaryActionLabel: 'Read evidence',
        secondaryActionHref: input.href
      }
    case 'link_unavailable':
      return {
        headline: `${name} is not purchase-ready from Bes3.`,
        summary: input.isOutOfStock
          ? 'The item appears out of stock or unavailable through the verified handoff.'
          : input.isBrokenLink
            ? 'The merchant path is not healthy enough to send buyers there.'
            : 'The evidence may be useful, but no verified commissionable merchant handoff is available.',
        primaryActionLabel: 'See available alternatives',
        secondaryActionLabel: 'Read evidence',
        secondaryActionHref: input.href
      }
  }
}

function buildPrimaryFallbackHref(context: PurchaseDecisionContext, state: PurchaseDecisionState) {
  if (state === 'watch_price') return context.categoryHref || '#price-alert'
  if (state === 'compare_first' || state === 'skip' || state === 'link_unavailable') {
    return context.alternativeHref || context.categoryHref || '/categories'
  }
  if (state === 'researching') return context.categoryHref || '/categories'
  return null
}

export function buildPurchaseDecision(input: PurchaseDecisionInput, context: PurchaseDecisionContext): PurchaseDecision {
  const state = chooseState(input, context)
  const copy = buildCopy(input, context, state)
  const primaryActionHref = buildPrimaryHref(input, context, state) || buildPrimaryFallbackHref(context, state)
  const riskFallback = hasEvidenceBlocker(input)
    ? ['Evidence is not strong enough for a direct buy recommendation yet.']
    : ['Verify live price, stock, return terms, and seller details before checkout.']
  const proofBullets = firstItems(input.proofSignals, 3, input.readiness.reasons)
  const riskBullets = firstItems(input.riskSignals, 2, input.readiness.blockers.length ? input.readiness.blockers : riskFallback)
  const ctaVariant = `${state}-${context.pageType}`
  const metadata = buildDecisionMetadata(input, context, state)

  return {
    productId: input.id,
    productName: input.name,
    state,
    stateLabel: stateLabel(state),
    pageType: context.pageType,
    headline: copy.headline,
    summary: copy.summary,
    primaryActionLabel: copy.primaryActionLabel,
    primaryActionHref,
    secondaryActionLabel: copy.secondaryActionLabel,
    secondaryActionHref: copy.secondaryActionHref,
    proofBullets,
    riskBullets,
    priceLine: input.priceLine,
    priceStatus: input.priceStatus,
    confidenceLine: `${input.confidenceLabel} · ${input.evidenceCount} evidence signal${input.evidenceCount === 1 ? '' : 's'}`,
    evidenceCount: input.evidenceCount,
    trackingSource: context.trackingSource,
    ctaVariant,
    metadata
  }
}

export function buildCommercePurchaseDecision(
  product: CommerceProductRecord | ProductRecord,
  context: PurchaseDecisionContext
): PurchaseDecision {
  const commerceProduct = {
    ...product,
    bestOffer: 'bestOffer' in product ? product.bestOffer : null,
    offerCount: 'offerCount' in product ? product.offerCount : product.sourceAffiliateLink ? 1 : 0,
    evidenceCount: 'evidenceCount' in product ? product.evidenceCount : product.publicEvidenceCount,
    freshness: 'freshness' in product ? product.freshness : 'unknown'
  } as CommerceProductRecord
  const readiness = buildCommerceDecisionReadiness(commerceProduct)
  const priceAmount = commerceProduct.bestOffer?.priceAmount || commerceProduct.priceAmount
  const priceCurrency = commerceProduct.bestOffer?.priceCurrency || commerceProduct.priceCurrency || 'USD'
  const hasPrice = priceAmount != null

  return buildPurchaseDecision(
    {
      id: commerceProduct.id,
      name: commerceProduct.productName,
      href: commerceProduct.slug ? `/products/${commerceProduct.slug}` : '/products',
      readiness,
      hasMerchantHandoff: hasMerchantExitTarget(commerceProduct),
      isOutOfStock: commerceProduct.bestOffer?.availabilityStatus === 'out_of_stock',
      isBrokenLink: false,
      evidenceCount: Number(commerceProduct.evidenceCount || commerceProduct.publicEvidenceCount || 0),
      confidenceLabel: `${Math.round(Number(commerceProduct.dataConfidenceScore || 0) * 100)}% data confidence`,
      scoreLabel: commerceProduct.rating == null ? 'Researching' : `${commerceProduct.rating.toFixed(1)}/5 rating`,
      priceLine: hasPrice ? formatPriceSnapshot(priceAmount, priceCurrency) : 'Price unavailable',
      priceStatus: hasPrice ? 'normal' : 'missing',
      proofSignals: [
        commerceProduct.bestOffer ? 'Current offer is visible before merchant handoff.' : '',
        commerceProduct.reviewCount ? `${commerceProduct.reviewCount} buyer review signal${commerceProduct.reviewCount === 1 ? '' : 's'} available.` : '',
        commerceProduct.evidenceCount ? `${commerceProduct.evidenceCount} product fact${commerceProduct.evidenceCount === 1 ? '' : 's'} tracked by Bes3.` : ''
      ],
      riskSignals: readiness.blockers
    },
    context
  )
}

export function buildEvidencePurchaseDecision(product: HardcoreProduct, context: PurchaseDecisionContext): PurchaseDecision {
  const readiness = buildEvidenceDecisionReadiness(product)
  const hasMerchantHandoff = Boolean(
    isCommissionableMerchantUrl(product.affiliateUrl) &&
    product.affiliateStatus !== 'out_of_stock' &&
    product.affiliateStatus !== 'broken'
  )
  const criticalRisk =
    product.consensus.badge === 'Do Not Buy'
      ? 'Evidence consensus indicates this product should not be purchased.'
      : product.consensus.frozenForReview
        ? 'The recommendation is frozen for review until evidence is rechecked.'
        : null

  return buildPurchaseDecision(
    {
      id: product.id,
      name: product.brand ? `${product.brand} ${product.name}` : product.name,
      href: `/products/${product.slug}`,
      readiness,
      hasMerchantHandoff,
      isOutOfStock: product.affiliateStatus === 'out_of_stock',
      isBrokenLink: product.affiliateStatus === 'broken',
      evidenceCount: product.consensus.evidenceCount,
      confidenceLabel: `${product.consensus.confidence} confidence`,
      scoreLabel: product.consensus.badge || (product.consensus.score10 == null ? 'Researching' : `${product.consensus.score10.toFixed(1)}/10 consensus`),
      priceLine: product.price.currentPrice == null ? 'Price unavailable' : formatHardcorePrice(product.price.currentPrice, product.price.currency),
      priceStatus: product.price.currentPrice == null ? 'missing' : product.price.entryStatus,
      criticalRisk,
      proofSignals: [
        product.consensus.score10 != null ? `${product.consensus.score10.toFixed(1)}/10 creator consensus.` : '',
        product.consensus.evidenceCount ? `${product.consensus.evidenceCount} validated evidence report${product.consensus.evidenceCount === 1 ? '' : 's'}.` : '',
        product.price.label
      ],
      riskSignals: [
        product.consensus.controversy ? 'Creator evidence is meaningfully split.' : '',
        product.price.entryStatus === 'overpriced' ? 'Price-value status suggests waiting.' : '',
        product.affiliateStatus === 'out_of_stock' ? 'Current merchant path is out of stock.' : '',
        product.affiliateStatus === 'broken' ? 'Current merchant path needs repair.' : ''
      ]
    },
    context
  )
}
