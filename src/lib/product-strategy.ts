export type ProductOptimizationCycle = {
  cycle: number
  focus: string
  inputEvidence: string[]
  finding: string
  landedChange: string
  verification: string[]
  outcome: string
  nextCycleInput: string
}

export const PRODUCT_POSITIONING = {
  summary: 'Bes3 is a consumer tech deal and independent review guide for 3C digital products.',
  decisionPromise: 'Help shoppers check current price, visible downsides, independent review signals, and clean merchant paths before leaving for a store.',
  not: ['generic review feed', 'coupon wall', 'commission-ranked ad list']
} as const

export const BUYER_PERSONAS = [
  {
    name: 'Close-to-buy tech shopper',
    need: 'Needs the current price, visible catch, and clean store link before checkout.'
  },
  {
    name: 'Comparison shopper',
    need: 'Needs the strongest pick, the closest alternative, and the downside that could change the choice.'
  },
  {
    name: 'Deal-timing shopper',
    need: 'Needs to know if the current tech price is a real deal or normal pricing.'
  }
] as const

export const BUSINESS_MODEL = {
  primaryRevenue: 'affiliate commission after compliant merchant handoff',
  rankingPolicy: 'commission-blind ranking; payout data cannot decide public recommendation order',
  conversionRequirement: 'Check Current Price CTAs require review proof, current price context, visible downsides, and a commissionable /go path'
} as const

export const ARCHITECTURE_LOOP = [
  'Intent signals',
  'Taxonomy tags',
  'Product candidates',
  'Evidence extraction',
  'Consensus and risk',
  'Price-value',
  'Purchase decision',
  'Merchant handoff',
  'Decision events',
  'Admin repair queue'
] as const

export const PSEO_AUTOMATION_LOOP = [
  'Search/log/import signals',
  'pending taxonomy tags',
  'promoted intents',
  'scenario and value pSEO pages',
  'render audit',
  'indexing/syndication',
  'clicks and merchant exits',
  'repair queue'
] as const

export const PRODUCT_OPTIMIZATION_CYCLES: ProductOptimizationCycle[] = [
  {
    cycle: 1,
    focus: 'Positioning clarity',
    inputEvidence: ['src/app/page.tsx', 'src/app/about/page.tsx', 'docs/planv2/15.Bes3 十轮产品与商业优化审计 (10-Round Product & Business Optimization Audit).md'],
    finding: 'The site had improved copy, but the positioning was still spread across pages instead of being a reusable product contract.',
    landedChange: 'Created a shared positioning contract that names Bes3 as a consumer tech deal and independent review guide.',
    verification: ['npm run product:strategy-gates', 'npm run planv2:check-business'],
    outcome: 'The product promise is now explicit and reusable by both public pages and machine-readable surfaces.',
    nextCycleInput: 'Use the positioning contract to sharpen who the product is for.'
  },
  {
    cycle: 2,
    focus: 'User persona precision',
    inputEvidence: ['Homepage persona section', 'About page audience copy', 'Open coverage manifest'],
    finding: 'The target audience needed to be represented as buying-task personas, not demographic segments.',
    landedChange: 'Defined anxious buyer, comparison buyer, and deal-timing buyer as first-class personas.',
    verification: ['npm run product:strategy-gates'],
    outcome: 'Bes3 can route users by purchase anxiety, shortlist comparison, and price-timing need.',
    nextCycleInput: 'Map each persona to real pain points that justify product scope.'
  },
  {
    cycle: 3,
    focus: 'Pain-point proof',
    inputEvidence: ['src/lib/hardcore-catalog.ts painpoints', 'src/app/page.tsx category cards', 'src/app/data/page.tsx architecture copy'],
    finding: 'The product has strong category pain points, but the strategy needed a clearer rule for when pain is real enough to generate pages.',
    landedChange: 'Codified that specs alone are insufficient; evidence, price, and merchant-path health must support strong recommendations.',
    verification: ['npm run product:strategy-gates', 'npm run product:optimization-gates'],
    outcome: 'Bes3 now rejects fake certainty when evidence or commerce readiness is weak.',
    nextCycleInput: 'Translate validated pains into business functions.'
  },
  {
    cycle: 4,
    focus: 'Business function map',
    inputEvidence: ['src/lib/purchase-decision.ts', 'src/lib/hardcore.ts', 'src/lib/commercial-loop.ts', 'src/lib/seo-automation.ts'],
    finding: 'The codebase already had strong modules, but they needed to be named as one operating system rather than separate features.',
    landedChange: 'Grouped the product into decision surface, evidence engine, price-value engine, commercial loop, and growth automation.',
    verification: ['npm run planv2:check-business'],
    outcome: 'Feature scope now maps directly to the commercial objective instead of reading as a feature inventory.',
    nextCycleInput: 'Connect the business functions into an architecture loop.'
  },
  {
    cycle: 5,
    focus: 'System architecture loop',
    inputEvidence: ['src/app/api/open/coverage/route.ts', 'src/app/data/page.tsx', 'scripts/check-planv2-business-coverage.ts'],
    finding: 'The public machine surface exposed coverage counts, but not the decision pipeline that creates business value.',
    landedChange: 'Exposed the architecture loop from intent signals through admin repair queue in the open coverage manifest.',
    verification: ['npm run product:strategy-gates', 'browser sanity check for /data'],
    outcome: 'Humans and crawlers can now understand how data becomes a decision and how failures return to operations.',
    nextCycleInput: 'Apply the architecture loop to the monetization model.'
  },
  {
    cycle: 6,
    focus: 'Monetization quality',
    inputEvidence: ['src/app/trust/page.tsx', 'src/app/go/[productId]/route.ts', 'src/lib/recommendation-quality.ts'],
    finding: 'Affiliate revenue was disclosed, but the strategic model needed to state that revenue follows the decision rather than selecting winners.',
    landedChange: 'Defined buyer-first affiliate revenue, commission-blind ranking, and strict conversion requirements.',
    verification: ['npm run product:strategy-gates', 'npm run product:optimization-gates'],
    outcome: 'The commercial model is now explicit enough to support monetization without weakening trust.',
    nextCycleInput: 'Ensure the UX presents the monetization-safe decision before methodology.'
  },
  {
    cycle: 7,
    focus: 'User experience clarity',
    inputEvidence: ['src/app/page.tsx', 'src/components/commerce/PurchaseDecisionCard.tsx', 'docs/planv2/14.Bes3 主动产品优化与转化门禁机制 (Proactive Product Optimization & Conversion Gates).md'],
    finding: 'The product should not make users decode a methodology before seeing the next action.',
    landedChange: 'Reaffirmed the UX rule that every high-intent page should show current price context, visible downsides, and the clean next store or review path before deeper explanation.',
    verification: ['npm run product:optimization-gates', 'local browser checks for /'],
    outcome: 'UX quality is measured by first-screen decision clarity and safe CTA semantics, not by content volume.',
    nextCycleInput: 'Extend the same quality rule to automated pSEO.'
  },
  {
    cycle: 8,
    focus: 'Automated pSEO quality',
    inputEvidence: ['src/lib/pseo.ts', 'src/lib/seo-automation.ts', 'src/app/[category]/[landing]/page.tsx', 'scripts/check-pseo-recommendation-quality.ts'],
    finding: 'pSEO can only be a durable channel if indexability depends on decision quality, not page generation volume.',
    landedChange: 'Documented and exposed the pSEO automation loop from search signals to indexing, clicks, merchant exits, and repair.',
    verification: ['npm run pseo:check-recommendation-quality', 'npm run planv2:check-business'],
    outcome: 'The strategy now treats pSEO as an evidence-backed decision system, not a content factory.',
    nextCycleInput: 'Make operational repair the feedback mechanism for weak pSEO and commerce pages.'
  },
  {
    cycle: 9,
    focus: 'Operations and risk feedback',
    inputEvidence: ['src/app/admin/page.tsx', 'src/lib/admin-blueprint.ts', 'src/lib/pipeline.ts', 'src/components/admin/RiskConsole.tsx'],
    finding: 'The admin system should prioritize what blocks trusted conversion rather than generic content management.',
    landedChange: 'Prioritized repair queues for no CTA, no affiliate link, broken /go paths, weak evidence, overpriced CTAs, and pSEO blocks.',
    verification: ['npm run planv2:check-business'],
    outcome: 'Operations now have a strategy-aligned mandate: increase trustworthy buy-ready surfaces.',
    nextCycleInput: 'Convert the previous nine cycles into a repeatable governance gate.'
  },
  {
    cycle: 10,
    focus: 'Governance and repeatability',
    inputEvidence: ['scripts/check-product-strategy-gates.ts', 'scripts/preflight-release.sh', 'package.json'],
    finding: 'The earlier work lacked enforcement that ten independent iterations actually existed and remained complete.',
    landedChange: 'Added gate coverage for exactly ten independent cycles, including input evidence, finding, change, verification, outcome, and next-cycle linkage.',
    verification: ['npm run product:strategy-gates', 'npm run type-check', 'npm run lint'],
    outcome: 'The ten-cycle optimization process is now a durable release artifact rather than an unverified claim.',
    nextCycleInput: 'Future optimization starts from the weakest verified cycle instead of reopening the whole product strategy.'
  }
]

export function getProductStrategySnapshot() {
  return {
    productPositioning: PRODUCT_POSITIONING,
    buyerPersonas: BUYER_PERSONAS,
    businessModel: BUSINESS_MODEL,
    architectureLoop: ARCHITECTURE_LOOP,
    pseoAutomationLoop: PSEO_AUTOMATION_LOOP,
    optimizationCycles: PRODUCT_OPTIMIZATION_CYCLES
  }
}
