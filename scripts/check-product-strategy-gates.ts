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
      'Intent signals -> Taxonomy tags -> Product candidates -> Evidence extraction'
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
      'buy / compare / wait / skip',
      'commission-blind'
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

console.log(`Product strategy gates passed (${gates.length} gates)`)
