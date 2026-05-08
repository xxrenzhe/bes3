#!/usr/bin/env tsx

import { buildPurchaseDecision, type PurchaseDecisionInput, type PurchaseDecisionState } from '@/lib/purchase-decision'

const baseInput: PurchaseDecisionInput = {
  id: 101,
  name: 'Bes3 Test Pick',
  href: '/products/bes3-test-pick',
  readiness: {
    state: 'buy-ready',
    score: 92,
    label: 'Buy-ready',
    primaryAction: 'merchant_handoff',
    summary: 'Ready for purchase.',
    reasons: ['Verified evidence and merchant path.'],
    blockers: []
  },
  hasMerchantHandoff: true,
  isOutOfStock: false,
  isBrokenLink: false,
  evidenceCount: 8,
  confidenceLabel: 'High confidence',
  scoreLabel: '9.1/10 consensus',
  priceLine: '$199.00',
  priceStatus: 'great-value',
  proofSignals: ['Strong creator evidence.', 'Current price is visible.', 'Merchant handoff is verified.'],
  riskSignals: ['Verify return terms before checkout.']
}

const context = {
  pageType: 'product' as const,
  trackingSource: 'product-decision-card',
  categoryHref: '/categories/test',
  alternativeHref: '/categories/test',
  userIntent: 'test purchase decision'
}

function assert(condition: unknown, message: string) {
  if (!condition) throw new Error(message)
}

function decisionState(input: Partial<PurchaseDecisionInput>, hasAlternatives = false) {
  return buildPurchaseDecision({ ...baseInput, ...input }, { ...context, hasAlternatives })
}

const cases: Array<{ label: string; state: PurchaseDecisionState; decision: ReturnType<typeof buildPurchaseDecision> }> = [
  { label: 'buy-ready product maps to buy_now', state: 'buy_now', decision: decisionState({}) },
  { label: 'close alternative maps to compare_first', state: 'compare_first', decision: decisionState({}, true) },
  { label: 'overpriced maps to watch_price', state: 'watch_price', decision: decisionState({ priceStatus: 'overpriced' }) },
  {
    label: 'critical risk maps to skip',
    state: 'skip',
    decision: decisionState({ criticalRisk: 'Critical safety risk found.' })
  },
  {
    label: 'thin evidence maps to researching',
    state: 'researching',
    decision: decisionState({
      readiness: {
        ...baseInput.readiness,
        state: 'not-ready',
        primaryAction: 'continue_research',
        blockers: ['Evidence is thin.']
      }
    })
  },
  {
    label: 'missing merchant handoff maps to link_unavailable',
    state: 'link_unavailable',
    decision: decisionState({ hasMerchantHandoff: false })
  }
]

for (const item of cases) {
  assert(item.decision.state === item.state, `${item.label}: expected ${item.state}, got ${item.decision.state}`)
  assert(item.decision.metadata.purchaseDecisionState === item.state, `${item.label}: metadata state mismatch`)
  assert(item.decision.metadata.pageType === 'product', `${item.label}: metadata pageType mismatch`)
  assert(item.decision.metadata.priceStatus === item.decision.priceStatus, `${item.label}: metadata priceStatus mismatch`)
  assert(item.decision.metadata.evidenceCount === item.decision.evidenceCount, `${item.label}: metadata evidenceCount mismatch`)
  assert(item.decision.ctaVariant === `${item.state.replace(/_/g, '-')}-product`, `${item.label}: ctaVariant mismatch`)
  assert(item.decision.proofBullets.length > 0, `${item.label}: proof bullets missing`)
  assert(item.decision.riskBullets.length > 0, `${item.label}: risk bullets missing`)
}

const buyNow = cases[0].decision
const watchPrice = cases.find((item) => item.state === 'watch_price')?.decision
assert(buyNow.primaryActionHref?.startsWith('/go/101?'), 'buy_now must use /go merchant handoff')
assert(buyNow.primaryActionHref.includes('pdState=buy_now'), 'buy_now /go URL must carry purchase decision state')
assert(buyNow.primaryActionHref.includes('priceStatus=great-value'), 'buy_now /go URL must carry price status')
assert(buyNow.primaryActionHref.includes('evidenceCount=8'), 'buy_now /go URL must carry evidence count')
assert(buyNow.primaryActionHref.includes('ctaVariant=buy-now-product'), 'buy_now /go URL must carry cta variant')

for (const item of cases.filter((entry) => entry.state !== 'buy_now')) {
  assert(!item.decision.primaryActionHref?.startsWith('/go/'), `${item.label}: non-buy state must not use /go`)
}
assert(watchPrice?.primaryActionHref === '#price-alert', 'watch_price must prioritize the price alert anchor')

console.log(`Purchase decision behavior check passed (${cases.length} states)`)
