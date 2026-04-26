#!/usr/bin/env tsx

import fs from 'node:fs'
import path from 'node:path'

type SurfaceCheck = {
  label: string
  filePath: string
  required: string[]
}

const root = process.cwd()
const checks: SurfaceCheck[] = [
  {
    label: 'Scenario pSEO page',
    filePath: 'src/app/[category]/[landing]/page.tsx',
    required: [
      'BLUF:',
      'DecisionFitSection',
      'HardcoreEvidenceMatrix',
      'EvidenceStream',
      'SeoFaqSection',
      'buildFaqSchema',
      'buildProductAggregateSchema',
      'robots: page.status ===',
      'no fabricated winners'
    ]
  },
  {
    label: 'Evidence comparison table',
    filePath: 'src/components/site/HardcoreEvidenceMatrix.tsx',
    required: [
      '<table',
      'Consensus Matrix',
      'Hardcore Proof',
      'Review by',
      '(Affiliate Link)',
      'Currently Out of Stock'
    ]
  },
  {
    label: 'Public compliance shell',
    filePath: 'src/components/layout/PublicShell.tsx',
    required: ['CookieConsentBanner', 'we may earn a commission']
  },
  {
    label: 'Crawler policy',
    filePath: 'src/app/robots.ts',
    required: ['/api/open/', '/admin', '/api/admin', '/llms.txt']
  },
  {
    label: 'Machine-readable coverage',
    filePath: 'src/app/api/open/coverage/route.ts',
    required: ['/api/open/evidence', '/llms.txt', '/trust', 'coverage-manifest-v1']
  }
]

const failures = checks.flatMap((check) => {
  const absolutePath = path.join(root, check.filePath)
  if (!fs.existsSync(absolutePath)) return [`${check.label}: missing ${check.filePath}`]
  const content = fs.readFileSync(absolutePath, 'utf8')
  return check.required
    .filter((required) => !content.includes(required))
    .map((required) => `${check.label}: missing "${required}" in ${check.filePath}`)
})

if (failures.length > 0) {
  console.error('Planv2 SEO/evidence surface check failed:')
  for (const failure of failures) {
    console.error(`- ${failure}`)
  }
  process.exit(1)
}

console.log('Planv2 SEO/evidence surface check passed')
