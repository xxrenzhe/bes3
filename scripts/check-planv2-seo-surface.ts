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
      'Current Review-Backed Pick',
      'Current Recommendation',
      'Quick Shopping Summary',
      'Recommendation Guardrails',
      'buildAiRecommendationSummary',
      'current review-backed pick',
      'shortlist recommendation',
      'Coverage limit',
      'DecisionFitSection',
      'HardcoreEvidenceMatrix',
      'EvidenceStream',
      'SeoFaqSection',
      'buildFaqSchema',
      'buildProductAggregateSchema',
      'generateStaticParams',
      'buildBreadcrumbSchema',
      'not a fake top-10'
    ]
  },
  {
    label: 'Value pSEO page',
    filePath: 'src/app/deals/[slug]/page.tsx',
    required: [
      'generateStaticParams',
      'buildValuePseoPath',
      'buildBreadcrumbSchema',
      'buildProductAggregateSchema',
      'robots: page.status ===',
      'Price Drop Alert'
    ]
  },
  {
    label: 'Canonical pSEO route helpers',
    filePath: 'src/lib/pseo.ts',
    required: [
      'buildScenarioPseoPath',
      'buildValuePseoPath',
      '/deals/best-',
      'getScenarioPseoStaticParams',
      'getValuePseoStaticParams'
    ]
  },
  {
    label: 'Automated SEO workflow CLI',
    filePath: 'scripts/run-seo-automation.ts',
    required: [
      'getSeoAutomationDefaults',
      'runSeoAutomation',
      'skip-checks',
      'push-index'
    ]
  },
  {
    label: 'Automated SEO workflow core',
    filePath: 'src/lib/seo-automation.ts',
    required: [
      'SEO_AUTOMATION_APPLY',
      'hardcore:check-planv2-seo',
      'applyPseoSignalsToTaxonomy',
      'promotePendingTags',
      'rerunGoogleIndexing'
    ]
  },
  {
    label: 'Admin SEO automation controls',
    filePath: 'src/components/admin/SeoOpsConsole.tsx',
    required: [
      'SEO Automation',
      'Scheduled pSEO runbook',
      'automationPreview',
      'automationApply',
      'Preview Run',
      'Apply Run',
      'Push indexing after apply'
    ]
  },
  {
    label: 'Admin SEO automation API',
    filePath: 'src/app/api/admin/seo-ops/route.ts',
    required: [
      'getSeoAutomationDefaults',
      'runSeoAutomation',
      'automationPreview',
      'automationApply',
      'seo_ops_automation_apply'
    ]
  },
  {
    label: 'SEO automation package command',
    filePath: 'package.json',
    required: ['hardcore:seo-automation']
  },
  {
    label: 'Evidence comparison table',
    filePath: 'src/components/site/HardcoreEvidenceMatrix.tsx',
    required: [
      '<table',
      'Review Signals',
      'Review proof',
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
