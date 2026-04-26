import type { PipelineStage } from '@/lib/types'

export const DEFAULT_ADMIN_USERNAME = process.env.DEFAULT_ADMIN_USERNAME || 'autobes3'
export const DEFAULT_ADMIN_EMAIL = process.env.DEFAULT_ADMIN_EMAIL || 'admin@bes3.local'

export const PIPELINE_STAGES: PipelineStage[] = [
  'resolveAffiliateLink',
  'scrapeProductFacts',
  'persistMediaAssets',
  'normalizeProduct',
  'mineHardcoreIntents',
  'resolveVideoEntities',
  'extractVideoEvidence',
  'scoreConsensus',
  'refreshPriceValue',
  'generateScenarioPages',
  'generateSeoPayload',
  'publishPages',
  'revalidateAndSitemap',
  'pingAndIndexing'
]

export const SETTINGS_CATEGORIES = [
  'ai',
  'proxy',
  'affiliateSync',
  'media',
  'seo',
  'system'
] as const

export const DEFAULT_SITE_NAME = 'Bes3'
export const DEFAULT_SITE_TAGLINE = 'Real specs from hardware teardowns, not SEO spam.'
