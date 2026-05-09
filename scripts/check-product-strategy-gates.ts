#!/usr/bin/env tsx

import fs from 'node:fs'
import path from 'node:path'

type Gate = {
  area: string
  filePath: string
  required: string[]
}

const root = process.cwd()

function read(filePath: string) {
  return fs.readFileSync(path.join(root, filePath), 'utf8')
}

function assert(condition: unknown, message: string) {
  if (!condition) throw new Error(message)
}

function checkGate(gate: Gate) {
  const content = read(gate.filePath)
  const missing = gate.required.filter((needle) => !content.includes(needle))
  assert(missing.length === 0, `${gate.area}: ${gate.filePath} missing ${missing.join(', ')}`)
  return gate
}

function checkIndependentCycles() {
  const content = read('src/lib/product-strategy.ts')
  const cycleMatches = Array.from(content.matchAll(/cycle:\s*(\d+)/g)).map((match) => Number(match[1]))
  const uniqueCycles = new Set(cycleMatches)
  assert(cycleMatches.length === 10, `src/lib/product-strategy.ts must define exactly 10 cycles, found ${cycleMatches.length}`)
  assert(uniqueCycles.size === 10, 'src/lib/product-strategy.ts cycle numbers must be unique')
  for (let cycle = 1; cycle <= 10; cycle += 1) {
    assert(uniqueCycles.has(cycle), `src/lib/product-strategy.ts missing cycle ${cycle}`)
  }

  const objectBlocks = content.split(/\n\s*\{\n\s*cycle:\s*/).slice(1).map((block) => `cycle: ${block}`)
  assert(objectBlocks.length === 10, `src/lib/product-strategy.ts must contain 10 independent cycle objects, found ${objectBlocks.length}`)
  for (const block of objectBlocks) {
    const numberMatch = block.match(/cycle:\s*(\d+)/)
    const cycleNumber = numberMatch ? Number(numberMatch[1]) : 0
    for (const field of ['focus', 'inputEvidence', 'finding', 'landedChange', 'verification', 'outcome', 'nextCycleInput']) {
      assert(block.includes(`${field}:`), `cycle ${cycleNumber} missing ${field}`)
    }
    const evidenceEntries = block.match(/inputEvidence:\s*\[([\s\S]*?)\]/)?.[1].match(/'/g)?.length || 0
    const verificationEntries = block.match(/verification:\s*\[([\s\S]*?)\]/)?.[1].match(/'/g)?.length || 0
    assert(evidenceEntries >= 2, `cycle ${cycleNumber} must cite at least two input evidence items`)
    assert(verificationEntries >= 1, `cycle ${cycleNumber} must cite at least one verification item`)
  }
}

const strategyDoc = 'docs/planv2/15.Bes3 十轮产品与商业优化审计 (10-Round Product & Business Optimization Audit).md'

const gates: Gate[] = [
  {
    area: '10-round strategy artifact',
    filePath: strategyDoc,
    required: [
      'Round 1 - 产品定位',
      'Round 2 - 用户画像',
      'Round 3 - 真实痛点',
      'Round 4 - 业务功能',
      'Round 5 - 系统架构',
      'Round 6 - 盈利模式',
      'Round 7 - 用户体验',
      'Round 8 - 自动化 pSEO',
      'Round 9 - 运营与风控',
      'Round 10 - 下一阶段产品策略',
      'buy / compare / wait / skip',
      'commission-blind',
      'Search/log/import signals -> pending taxonomy tags -> promoted intents',
      'Intent signals -> Taxonomy tags -> Product candidates -> Evidence extraction',
      'Cycle 1 independent iteration',
      'Cycle 10 independent iteration',
      '输入证据',
      '落地改动',
      '验证',
      '下一轮输入'
    ]
  },
  {
    area: 'Independent cycle SSOT',
    filePath: 'src/lib/product-strategy.ts',
    required: [
      'export const PRODUCT_OPTIMIZATION_CYCLES',
      'cycle: 1',
      'cycle: 10',
      'inputEvidence',
      'landedChange',
      'nextCycleInput',
      'getProductStrategySnapshot',
      'buy / compare / wait / skip',
      'commission-blind'
    ]
  },
  {
    area: 'Homepage positioning',
    filePath: 'src/app/page.tsx',
    required: [
      'Buyer decision engine',
      'For anxious buyers',
      'For comparison buyers',
      'For deal-timing buyers',
      'Not an ad list',
      'Decision loop',
      'buy / compare / wait / skip',
      'High-intent question',
      'Admin repair queue'
    ]
  },
  {
    area: 'About positioning',
    filePath: 'src/app/about/page.tsx',
    required: [
      'Who Bes3 is for',
      'Anxious buyer',
      'Comparison buyer',
      'Deal-timing buyer',
      'Who Bes3 is not for',
      'Product promise',
      'No evidence, no strong recommendation',
      'No commission-ranked winners'
    ]
  },
  {
    area: 'Trust commercial model',
    filePath: 'src/app/trust/page.tsx',
    required: [
      'Buyer-first affiliate model',
      'Revenue model',
      'Commission-blind ranking',
      'pSEO quality gate',
      'buy / compare / wait / skip',
      'affiliate commission',
      'no extra cost'
    ]
  },
  {
    area: 'Open data architecture',
    filePath: 'src/app/data/page.tsx',
    required: [
      'Architecture loop',
      'Intent signals',
      'Taxonomy tags',
      'Purchase decision',
      'Merchant handoff',
      'pSEO automation loop',
      'Search/log/import signals',
      'indexing/syndication'
    ]
  },
  {
    area: 'Coverage manifest strategy',
    filePath: 'src/app/api/open/coverage/route.ts',
    required: [
      'productPositioning',
      'buyerPersonas',
      'businessModel',
      'architectureLoop',
      'pseoAutomationLoop',
      'optimizationCycles',
      'getProductStrategySnapshot'
    ]
  },
  {
    area: 'Release preflight',
    filePath: 'scripts/preflight-release.sh',
    required: [
      'product strategy gates',
      'npm run product:strategy-gates',
      'npm run product:optimization-gates'
    ]
  },
  {
    area: 'Package script',
    filePath: 'package.json',
    required: [
      '"product:strategy-gates": "tsx scripts/check-product-strategy-gates.ts"'
    ]
  }
]

for (const gate of gates) checkGate(gate)
checkIndependentCycles()

console.log(`Product strategy gates passed (${gates.length} gates, 10 independent cycles)`)
