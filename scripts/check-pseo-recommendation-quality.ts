#!/usr/bin/env tsx

import fs from 'node:fs'
import path from 'node:path'
import { inferProductCategory } from '@/lib/product-category'

type FileExpectation = {
  label: string
  filePath: string
  required: string[]
  forbidden: string[]
}

const root = process.cwd()

const expectations: FileExpectation[] = [
  {
    label: 'Scenario pSEO page recommendation contract',
    filePath: 'src/app/[category]/[landing]/page.tsx',
    required: [
      'Current Evidence-Backed Pick',
      'Current Recommendation',
      'AI Answer Summary',
      'Recommendation Guardrails',
      'buildAiRecommendationSummary',
      'current evidence-backed pick',
      'shortlist recommendation',
      'Confidence boundary',
      'Index quality gate',
      'getScenarioIndexEligibility',
      'productDisplayName',
      'currentPick'
    ],
    forbidden: [
      'Evidence Check',
      'Research Snapshot',
      'Research Status',
      'not a ranked recommendation yet',
      'not yet strong enough for a final ranking'
    ]
  },
  {
    label: 'Evidence matrix recommendation copy',
    filePath: 'src/components/site/HardcoreEvidenceMatrix.tsx',
    required: [
      'Why this is the current shortlist pick',
      'Use this table to verify the current recommendation',
      'confidence warning'
    ],
    forbidden: [
      'Current source proof and missing confidence signals',
      'This table is not a ranked recommendation yet'
    ]
  },
  {
    label: 'Production post-deploy pSEO verifier',
    filePath: 'scripts/production-post-deploy-verify.ts',
    required: [
      'Current Recommendation',
      'AI Answer Summary',
      'Confidence boundary',
      'Index quality gate',
      'demoPoolWall001',
      'expectPseoNoindex',
      'noindex',
      'indexable'
    ],
    forbidden: [
      'stillNoindex'
    ]
  },
  {
    label: 'Trust methodology page',
    filePath: 'src/app/trust/page.tsx',
    required: [
      'Index quality gate',
      'Commission-blind audit',
      'Schema safety',
      'getCommercialFocusCategories'
    ],
    forbidden: []
  },
  {
    label: 'Product structured data safety',
    filePath: 'src/lib/structured-data.ts',
    required: [
      'getProductSchemaEligibility',
      'includeAggregateRating',
      'includeOffer'
    ],
    forbidden: [
      'safeReviewCount || 1'
    ]
  }
]

const workflowExpectation: FileExpectation = {
  label: 'Release workflow quality gate',
  filePath: '.github/workflows/deploy.yml',
  required: ['Run pSEO recommendation quality gate', 'npm run pseo:check-recommendation-quality', 'NEXT_PUBLIC_APP_URL: https://www.bes3.com'],
  forbidden: ['NEXT_PUBLIC_APP_URL: https://bes3.com']
}

const dockerfileExpectation: FileExpectation = {
  label: 'Docker production URL default',
  filePath: 'Dockerfile',
  required: ['ENV NEXT_PUBLIC_APP_URL=https://www.bes3.com'],
  forbidden: ['ENV NEXT_PUBLIC_APP_URL=https://bes3.com']
}

const packageExpectation: FileExpectation = {
  label: 'Package script quality gate',
  filePath: 'package.json',
  required: ['pseo:check-recommendation-quality'],
  forbidden: []
}

function readFile(filePath: string) {
  const absolutePath = path.join(root, filePath)
  if (!fs.existsSync(absolutePath)) {
    return { content: '', failures: [`missing ${filePath}`] }
  }
  return { content: fs.readFileSync(absolutePath, 'utf8'), failures: [] as string[] }
}

function checkExpectation(expectation: FileExpectation) {
  const { content, failures } = readFile(expectation.filePath)
  if (failures.length) {
    return failures.map((failure) => `${expectation.label}: ${failure}`)
  }

  const missingRequired = expectation.required
    .filter((text) => !content.includes(text))
    .map((text) => `${expectation.label}: missing required text "${text}" in ${expectation.filePath}`)
  const foundForbidden = expectation.forbidden
    .filter((text) => content.includes(text))
    .map((text) => `${expectation.label}: forbidden text "${text}" found in ${expectation.filePath}`)

  return [...missingRequired, ...foundForbidden]
}

const failures = [
  ...expectations.flatMap(checkExpectation),
  ...[workflowExpectation, dockerfileExpectation, packageExpectation].flatMap(checkExpectation)
]

const lomonCategory = inferProductCategory({
  productName: 'LOMON Womens Fuzzy Sherpa Fleece Jacket Lightweight Vest Cozy Sleeveless Cardigan Zipper Waistcoat Outerwear With Pocket',
  category: 'tech'
})
if (lomonCategory.category !== 'Apparel' || lomonCategory.categorySlug !== 'apparel') {
  failures.push(`Product category semantics: LOMON apparel fixture normalized to ${lomonCategory.category || 'null'} / ${lomonCategory.categorySlug || 'null'}`)
}

if (failures.length) {
  console.error('pSEO recommendation quality gate failed:')
  for (const failure of failures) {
    console.error(`- ${failure}`)
  }
  process.exit(1)
}

console.log('pSEO recommendation quality gate passed')
