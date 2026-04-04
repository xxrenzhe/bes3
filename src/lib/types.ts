export type DatabaseType = 'sqlite' | 'postgres'

export type UserRole = 'admin'

export type AffiliatePlatform = 'partnerboost_amazon' | 'partnerboost_dtc' | 'manual'

export type MediaAssetRole = 'hero' | 'gallery' | 'variant' | 'review' | 'thumbnail'

export type MediaStorageProvider = 'local' | 's3'

export type PipelineStage =
  | 'resolveAffiliateLink'
  | 'scrapeProductFacts'
  | 'persistMediaAssets'
  | 'normalizeProduct'
  | 'mineKeywords'
  | 'generateReviewArticle'
  | 'generateComparisonArticle'
  | 'generateSeoPayload'
  | 'publishPages'
  | 'revalidateAndSitemap'
  | 'pingAndIndexing'

export type PipelineRunType = 'fullPipeline' | 'workspaceAction'

export type PipelineStatus = 'queued' | 'running' | 'partialFailed' | 'failed' | 'completed' | 'cancelled'

export type ArticleKind = 'review' | 'comparison' | 'guide'

export type SeoPageType = 'review' | 'comparison' | 'guide' | 'category' | 'system'

export type SettingDataType = 'string' | 'number' | 'boolean' | 'json' | 'secret'

export type PromptCategory = 'keywordMining' | 'reviewGeneration' | 'comparisonGeneration' | 'seoEnrichment'

export interface DatabaseAdapter {
  type: DatabaseType
  query<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T[]>
  queryOne<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T | undefined>
  exec(sql: string, params?: unknown[]): Promise<{ changes: number; lastInsertRowid?: number }>
  transaction<T>(fn: () => T | Promise<T>): Promise<T>
}
