#!/usr/bin/env tsx

import fs from 'node:fs'
import path from 'node:path'

type ArtifactCheck = {
  label: string
  filePath: string
  required?: string[]
}

type PlanDocCheck = {
  doc: string
  requirement: string
  artifacts: ArtifactCheck[]
}

const root = process.cwd()

function exists(filePath: string) {
  return fs.existsSync(path.join(root, filePath))
}

function read(filePath: string) {
  return fs.readFileSync(path.join(root, filePath), 'utf8')
}

function checkArtifact(artifact: ArtifactCheck) {
  const absolutePath = path.join(root, artifact.filePath)
  if (!fs.existsSync(absolutePath)) return [`${artifact.label}: missing ${artifact.filePath}`]
  const content = fs.readFileSync(absolutePath, 'utf8')
  return (artifact.required || [])
    .filter((needle) => !content.includes(needle))
    .map((needle) => `${artifact.label}: missing "${needle}" in ${artifact.filePath}`)
}

const checks: PlanDocCheck[] = [
  {
    doc: '1. Master PRD',
    requirement: 'Hardcore category scope, monetization, compliance, UX, AI/data pipeline, and growth surfaces are present.',
    artifacts: [
      { label: 'Hardcore category roster', filePath: 'src/lib/hardcore-catalog.ts', required: ['HARDCORE_CATEGORIES', 'yard-pool-automation'] },
      { label: 'Commercial focus quality rules', filePath: 'src/lib/recommendation-quality.ts', required: ['COMMERCIAL_FOCUS_CATEGORY_SLUGS', 'PSEO_INDEX_QUALITY_GATE', 'auditCommissionBlindCandidateOrder'] },
      { label: 'Buyer decision homepage', filePath: 'src/app/page.tsx', required: ['Find Best Picks', 'See Deals', 'Commission neutral'] },
      { label: 'Commercial loop monetization', filePath: 'src/lib/commercial-loop.ts', required: ['listAffiliateReviewCandidates', 'rel="nofollow sponsored"', '/go/${product.id}?source=evidence-review'] },
      { label: 'FTC and cookie shell', filePath: 'src/components/layout/PublicShell.tsx', required: ['CookieConsentBanner', 'we may earn a commission'] }
    ]
  },
  {
    doc: '2. Taxonomy and data fusion',
    requirement: 'Intent ingestion, keyword import, pending tag promotion, site-search feedback, and rescan workflows are implemented.',
    artifacts: [
      { label: 'Amazon/Reddit intent collection', filePath: 'scripts/collect-hardcore-intents.ts', required: ['amazon', 'reddit', 'promote-pending'] },
      { label: 'Keyword Planner import', filePath: 'scripts/import-keyword-planner-intents.ts', required: ['keyword', 'category'] },
      { label: 'Taxonomy evolution', filePath: 'scripts/evolve-hardcore-taxonomy.ts', required: ['promotePendingTags', 'exportTaxonomyRescanJobs'] },
      { label: 'Search intake API', filePath: 'src/app/api/open/evidence/search-intake/route.ts', required: ['recordSearchIntent', 'pendingTag'] },
      { label: 'Taxonomy admin API', filePath: 'src/app/api/admin/taxonomy/route.ts', required: ['getTaxonomyOperationsSnapshot', 'runTaxonomyAction'] },
      { label: 'Taxonomy persistence', filePath: 'src/lib/hardcore-ops.ts', required: ['site_search_logs', 'taxonomy_rescan_queue'] }
    ]
  },
  {
    doc: '3. Abstract database ERD',
    requirement: 'Core product, affiliate, taxonomy, video, evidence, search, and evolution tables exist in the schema.',
    artifacts: [
      { label: 'Runtime schema', filePath: 'src/lib/db/schema.ts', required: ['affiliate_products', 'products', 'affiliate_links', 'taxonomy_tags', 'review_videos', 'analysis_reports', 'site_search_logs'] },
      { label: 'Schema definition SSOT', filePath: 'src/lib/db/schema-definition.ts', required: ['introspectSchemaDefinition', 'renderSqliteBaseline', 'renderPostgresBaseline'] },
      { label: 'Generated dictionary', filePath: 'docs/planv2/database-dictionary.generated.md', required: ['## affiliate_products', '## analysis_reports', '## pseo_page_signals'] }
    ]
  },
  {
    doc: '4. Meta-prompting and AI engineering',
    requirement: 'Prompt templates, evidence parsing, shorts import, regression cases, and runtime AI provider configuration are available.',
    artifacts: [
      { label: 'Evidence prompt guards', filePath: 'src/lib/hardcore-prompts.ts', required: ['buildVideoEvidencePrompt', 'parseVideoEvidenceWithRetry', 'shouldKeepPositiveEvidence'] },
      { label: 'Prompt lab persistence', filePath: 'src/lib/prompts.ts', required: ['prompt_versions', 'prompt_regression_cases'] },
      { label: 'Shorts evidence import', filePath: 'scripts/import-shorts-evidence.ts', required: ['shorts', 'analysis_reports'] },
      { label: 'AI runtime settings', filePath: 'src/lib/settings.ts', required: ['gemini_provider', 'GEMINI_RELAY_API_KEY', 'GEMINI_API_KEY'] }
    ]
  },
  {
    doc: '5. GEO and SEO growth',
    requirement: 'Crawler policy, llms.txt, scenario pSEO, value pSEO, schema, FAQ, and open coverage manifest are implemented.',
    artifacts: [
      { label: 'Robots policy', filePath: 'src/app/robots.ts', required: ['/llms.txt', '/api/open/', '/admin'] },
      { label: 'LLM text route', filePath: 'src/app/llms.txt/route.ts', required: ['Bes3', '/api/open/evidence'] },
      { label: 'Scenario pSEO route', filePath: 'src/app/[category]/[landing]/page.tsx', required: ['BLUF:', 'SeoFaqSection', 'buildProductAggregateSchema', 'getScenarioIndexEligibility', 'Index quality gate'] },
      { label: 'Value pSEO route', filePath: 'src/app/deals/[slug]/page.tsx', required: ['buildValuePseoPath', 'Price Drop Alert'] },
      { label: 'Open coverage manifest', filePath: 'src/app/api/open/coverage/route.ts', required: ['coverage-manifest-v1', '/trust'] }
    ]
  },
  {
    doc: '6. Entity resolution and risk management',
    requirement: 'SKU matching, proxy-aware scraping, transcript-only YouTube collection, affiliate link inspection, graceful degradation, and compliance are covered.',
    artifacts: [
      { label: 'Entity resolution core', filePath: 'src/lib/entity-resolution.ts', required: ['matchVideoEntity', 'confidence'] },
      { label: 'Entity resolution CLI', filePath: 'scripts/resolve-video-entities.ts', required: ['dry-run', 'limit'] },
      { label: 'Browser proxy runtime', filePath: 'src/lib/browser-proxy.ts', required: ['resolveBrowserProxy', 'getBrowserProxyUrl', 'BROWSER_PROXY_URLS_JSON'] },
      { label: 'Transcript command', filePath: 'scripts/youtube-transcript-command.ts', required: ['--skip-download', '--write-auto-sub', '--proxy'] },
      { label: 'Affiliate link inspector', filePath: 'scripts/inspect-hardcore-affiliate-links.ts', required: ['affiliate_links', 'dry-run'] },
      { label: 'Public shell compliance', filePath: 'src/components/layout/PublicShell.tsx', required: ['CookieConsentBanner', 'we may earn a commission'] }
    ]
  },
  {
    doc: '7. Weighted consensus and scoring',
    requirement: 'Weighted evidence scoring, shill/ad feedback, conflict handling, and public matrix display exist.',
    artifacts: [
      { label: 'Consensus algorithm', filePath: 'src/lib/hardcore.ts', required: ['summarizeConsensus', 'feedbackPenalty', 'isAdvertorial'] },
      { label: 'Evidence feedback API', filePath: 'src/app/api/open/evidence/feedback/route.ts', required: ['recordEvidenceFeedback', 'feedbackType'] },
      { label: 'Evidence feedback persistence', filePath: 'src/lib/hardcore-ops.ts', required: ['creator_feedback_events'] },
      { label: 'Evidence review persistence', filePath: 'src/lib/admin-blueprint.ts', required: ['evidence_review_decisions', 'reviewEvidenceReport'] },
      { label: 'Evidence matrix UI', filePath: 'src/components/site/HardcoreEvidenceMatrix.tsx', required: ['Consensus Matrix', 'Hardcore Proof', 'Review by'] },
      { label: 'Admin evidence operations', filePath: 'src/app/api/admin/evidence/route.ts', required: ['getEvidenceOperationsSnapshot', 'reviewEvidenceReport'] }
    ]
  },
  {
    doc: '8. Price-value entry point',
    requirement: 'Current/historical price, value score, buy-window logic, pSEO linkage, and retention alerts are implemented.',
    artifacts: [
      { label: 'Price-value algorithm', filePath: 'src/lib/hardcore.ts', required: ['summarizePriceValue', 'valueScore'] },
      { label: 'Price snapshot refresh', filePath: 'scripts/refresh-hardcore-price-value.ts', required: ['refreshPriceValueSnapshotsForProducts', 'dry-run'] },
      { label: 'Alert evaluation', filePath: 'scripts/evaluate-price-alerts.ts', required: ['evaluatePriceAlerts', 'queueNotifications'] },
      { label: 'Alert dispatch', filePath: 'scripts/dispatch-price-alert-notifications.ts', required: ['PRICE_ALERT_WEBHOOK_URL'] },
      { label: 'Open alerts API', filePath: 'src/app/api/open/evidence/price-alerts/route.ts', required: ['upsertPriceAlert', 'email'] },
      { label: 'Price-value persistence', filePath: 'src/lib/hardcore-ops.ts', required: ['price_value_snapshots', 'price_alerts', 'price_alert_notifications'] },
      { label: 'Admin price-value console', filePath: 'src/components/admin/PriceValueConsole.tsx', required: ['Price', 'Value'] }
    ]
  },
  {
    doc: '9. Programmatic SEO strategy',
    requirement: 'Intent matrix, URL helpers, scenario/value pages, SEO automation, pSEO signal imports, indexing, and syndication are available.',
    artifacts: [
      { label: 'pSEO helpers', filePath: 'src/lib/pseo.ts', required: ['buildScenarioPseoPath', 'buildValuePseoPath', 'getScenarioPseoStaticParams'] },
      { label: 'pSEO signal import', filePath: 'scripts/import-pseo-signals.ts', required: ['recordPseoPageSignal'] },
      { label: 'pSEO push', filePath: 'scripts/push-hardcore-pseo.ts', required: ['rerunGoogleIndexing'] },
      { label: 'SEO automation core', filePath: 'src/lib/seo-automation.ts', required: ['runSeoAutomation', 'applyPseoSignalsToTaxonomy', 'rerunGoogleIndexing'] },
      { label: 'Syndication handoff', filePath: 'scripts/syndicate-pages.ts', required: ['rerunSyndication'] },
      { label: 'pSEO signal persistence', filePath: 'src/lib/hardcore-ops.ts', required: ['pseo_page_signals'] },
      { label: 'Syndication settings', filePath: 'src/lib/seo-ops.ts', required: ['SEO_SYNDICATION_TARGETS_JSON'] }
    ]
  },
  {
    doc: '10. Admin console blueprint',
    requirement: 'Authenticated admin IA, product/evidence/taxonomy/price/SEO/pipeline/risk/prompt/data/user modules, permissions, and audit are present.',
    artifacts: [
      { label: 'Admin shell', filePath: 'src/components/layout/AdminShell.tsx', required: ['/admin/products', '/admin/evidence', '/admin/seo-ops'] },
      { label: 'Admin permissions', filePath: 'src/lib/admin-permissions.ts', required: ['ADMIN_ROLE_PERMISSIONS'] },
      { label: 'Admin audit governance', filePath: 'src/lib/admin-governance.ts', required: ['admin_audit_logs', 'admin_risk_alerts'] },
      { label: 'Admin dashboard API', filePath: 'src/app/api/admin/dashboard/route.ts', required: ['requireAdmin'] },
      { label: 'Admin settings validation', filePath: 'src/app/api/admin/settings/validate/route.ts', required: ['proxy', 'affiliate_sync', 'ai'] },
      { label: 'User access console', filePath: 'src/components/admin/UsersAccessConsole.tsx', required: ['用户列表', '角色'] }
    ]
  },
  {
    doc: '11. Database architecture optimization',
    requirement: 'Schema SSOT, SQLite/Postgres migrations, drift checking, production security tables, pipeline ops tables, and backup scripts exist.',
    artifacts: [
      { label: 'SQLite baseline', filePath: 'migrations/000_init_schema_consolidated.sqlite.sql', required: ['admin_security_events', 'content_pipeline_runs'] },
      { label: 'Postgres baseline', filePath: 'pg-migrations/000_init_schema_consolidated.pg.sql', required: ['admin_security_events', 'content_pipeline_runs'] },
      { label: 'Drift checker', filePath: 'scripts/check-db-baseline-drift.ts', required: ['renderSqliteBaseline', 'renderPostgresBaseline'] },
      { label: 'Backup script', filePath: 'scripts/backup-runtime.sh', required: ['data', 'storage/media', 'tar'] },
      { label: 'Restore script', filePath: 'scripts/restore-runtime.sh', required: ['BES3_RESTORE_CONFIRM', 'storage/media', 'tar'] }
    ]
  },
  {
    doc: '12. Production alerting and launch SOP',
    requirement: 'Release preflight, runtime env validation, health checks, deployment, backup/restore, and alerting surfaces are available.',
    artifacts: [
      { label: 'Release preflight', filePath: 'scripts/preflight-release.sh', required: ['check-runtime-env.js', 'planv2:check-business', 'hardcore:check-planv2-seo', 'commercial-loop:check', 'ops:check-planv2-security', 'db:check-drift', 'type-check', 'ops:smoke-e2e', 'ops:browser-e2e'] },
      { label: 'Browser E2E', filePath: 'scripts/browser-planv2-e2e.ts', required: ['playwright', 'Buying Decisions', 'Find Best Picks', 'DEFAULT_ADMIN_USERNAME', 'DEFAULT_ADMIN_PASSWORD'] },
      { label: 'Runtime E2E smoke', filePath: 'scripts/smoke-planv2-e2e.ts', required: ['coverage-manifest-v1', '/go/999999999', '/reviews/non-existent-commercial-loop-smoke', 'x-bes3-blocked-reason'] },
      { label: 'Runtime env validation', filePath: 'scripts/check-runtime-env.js', required: ['JWT_SECRET', 'ENCRYPTION_KEY', 'BROWSER_PROXY_URLS_JSON'] },
      { label: 'Health endpoint', filePath: 'src/app/api/health/route.ts', required: ['status', 'database'] },
      { label: 'Internal health endpoint', filePath: 'src/app/api/internal/health/route.ts', required: ['hasValidInternalServiceToken'] },
      { label: 'GHCR deploy script', filePath: 'scripts/deploy-ghcr.sh', required: ['docker', 'GHCR'] },
      { label: 'Pipeline worker', filePath: 'scripts/worker-standalone.ts', required: ['startPipelineWorker'] }
    ]
  },
  {
    doc: 'Commercial loop audit',
    requirement: 'Affiliate-to-review-to-pSEO-to-merchant-click commercial loop is implemented and has an executable integration check.',
    artifacts: [
      { label: 'Commercial loop core', filePath: 'src/lib/commercial-loop.ts', required: ['runCommercialLoop', 'syncPartnerboostAmazonProducts', 'discoverYoutubeVideos', 'upsertEvidenceArticle'] },
      { label: 'Commercial loop CLI', filePath: 'scripts/run-commercial-loop.ts', required: ['runCommercialLoop', 'execute', 'push-index'] },
      { label: 'Commercial loop integration', filePath: 'scripts/check-commercial-loop-integration.ts', required: ['publicly readable by long-tail slug', 'merchant CTA redirects and records attribution', 'yt-dlp proxy uses normalized authenticated URL', 'commission-blind ranking audit'] },
      { label: 'Commercial loop live readiness', filePath: 'scripts/check-commercial-loop-live-readiness.ts', required: ['recommendedSampleSize', 'nextCommand', 'runCommercialLoop'] },
      { label: 'Affiliate redirect route', filePath: 'src/app/go/[productId]/route.ts', required: ['recordMerchantClick', 'NextResponse.redirect'] },
      { label: 'Review route', filePath: 'src/app/reviews/[slug]/page.tsx', required: ['getArticleBySlug', 'article.type !=='] }
    ]
  },
  {
    doc: '13. Purchase decision and affiliate conversion loop',
    requirement: 'One-shot purchase decision conversion loop is implemented across decision logic, public pages, tracking, merchant handoff, and admin repair operations.',
    artifacts: [
      {
        label: 'Purchase decision behavior check',
        filePath: 'scripts/check-purchase-decision-behavior.ts',
        required: [
          'buy-ready product maps to buy_now',
          'close alternative maps to compare_first',
          'overpriced maps to watch_price',
          'critical risk maps to skip',
          'thin evidence maps to researching',
          'missing merchant handoff maps to link_unavailable',
          'non-buy state must not use /go'
        ]
      },
      {
        label: 'Purchase decision core',
        filePath: 'src/lib/purchase-decision.ts',
        required: [
          'export type PurchaseDecisionState',
          "'buy_now'",
          "'compare_first'",
          "'watch_price'",
          "'skip'",
          "'researching'",
          "'link_unavailable'",
          'export function buildPurchaseDecision',
          'export function buildCommercePurchaseDecision',
          'export function buildEvidencePurchaseDecision',
          'buildDecisionMetadata',
          'buildMerchantExitPath(input.id, context.trackingSource, context.visitorId, context.offerId, buildDecisionMetadata'
        ]
      },
      {
        label: 'Purchase decision card',
        filePath: 'src/components/commerce/PurchaseDecisionCard.tsx',
        required: [
          'export function PurchaseDecisionCard',
          'PurchaseDecisionTracker',
          'PurchaseDecisionActionLink',
          'PrimaryCta',
          'StickyMobileCta',
          'trackingMetadata={decision.metadata}',
          'mobile-sticky-decision',
          'actionTone={decision.state}',
          'Affiliate disclosure:',
          'Commission availability never changes the evidence score or recommendation order.'
        ]
      },
      {
        label: 'Purchase decision action link',
        filePath: 'src/components/commerce/PurchaseDecisionActionLink.tsx',
        required: [
          "'use client'",
          "eventType: 'purchase_decision_cta_click'",
          'trackDecisionEvent',
          'metadata: decision.metadata'
        ]
      },
      {
        label: 'Purchase decision view tracker',
        filePath: 'src/components/commerce/PurchaseDecisionTracker.tsx',
        required: [
          "'use client'",
          "eventType: 'purchase_decision_view'",
          'trackDecisionEvent',
          'metadata: decision.metadata'
        ]
      },
      {
        label: 'Primary nav convergence',
        filePath: 'src/components/layout/PublicShell.tsx',
        required: [
          "{ href: '/categories', label: 'Best Picks' }",
          "{ href: '/deals', label: 'Deals' }",
          "{ href: '/reviews', label: 'Reviews' }",
          "{ href: '/trust', label: 'Trust' }",
          "aria-label=\"Primary navigation\""
        ]
      },
      {
        label: 'Product page decision-first hero',
        filePath: 'src/app/products/[slug]/page.tsx',
        required: [
          'PurchaseDecisionCard',
          'buildCommercePurchaseDecision',
          'buildEvidencePurchaseDecision',
          'Should you buy it?',
          'DecisionReadinessCard'
        ]
      },
      {
        label: 'Homepage routes to purchase tasks',
        filePath: 'src/app/page.tsx',
        required: [
          'Know what to buy, compare, wait on, or skip.',
          'Find Best Picks',
          'See Deals',
          'Commission neutral'
        ]
      },
      {
        label: 'Review article decision card',
        filePath: 'src/components/site/EditorialArticlePage.tsx',
        required: [
          'PurchaseDecisionCard',
          'buildCommercePurchaseDecision',
          "trackingSource: article.type === 'comparison' ? 'compare-decision-card' : 'review-decision-card'"
        ]
      },
      {
        label: 'Compare page default winner',
        filePath: 'src/app/compare/page.tsx',
        required: [
          'PurchaseDecisionCard',
          'ComparisonSummaryMatrix',
          'Default winner',
          'compare-decision-card',
          'Start with a default winner'
        ]
      },
      {
        label: 'Deals index buy-window cards',
        filePath: 'src/app/deals/page.tsx',
        required: [
          'PurchaseDecisionCard',
          'buildEvidencePurchaseDecision',
          'Buy Window',
          'Top buy windows'
        ]
      },
      {
        label: 'Deal detail decision cards',
        filePath: 'src/app/deals/[slug]/page.tsx',
        required: [
          'PurchaseDecisionCard',
          'buildEvidencePurchaseDecision',
          'Top 3 decision cards',
          'buy now, compare first, watch price, or skip'
        ]
      },
      {
        label: 'Category top decisions',
        filePath: 'src/app/categories/[slug]/page.tsx',
        required: [
          'PurchaseDecisionCard',
          'buildEvidencePurchaseDecision',
          'Top 3 decisions',
          'Best Picks'
        ]
      },
      {
        label: 'Matrix row CTA decision metadata',
        filePath: 'src/components/site/HardcoreEvidenceMatrix.tsx',
        required: [
          'buildEvidencePurchaseDecision',
          "pageType: 'matrix'",
          "trackingSource: 'matrix-row-cta'",
          'purchaseDecision.primaryActionHref'
        ]
      },
      {
        label: 'Scenario page top buying decisions',
        filePath: 'src/app/[category]/[landing]/page.tsx',
        required: [
          'PurchaseDecisionCard',
          'buildEvidencePurchaseDecision',
          'Top buying decisions',
          'scenario-decision-card'
        ]
      },
      {
        label: 'Merchant exit context serialization',
        filePath: 'src/lib/merchant-links.ts',
        required: [
          'export interface MerchantExitContext',
          "purchaseDecisionState: 'pdState'",
          'normalizeMerchantExitContext',
          'getMerchantExitContextFromSearchParams',
          'params.set(MERCHANT_CONTEXT_QUERY_PARAMS.purchaseDecisionState'
        ]
      },
      {
        label: 'Merchant click metadata persistence',
        filePath: 'src/lib/merchant-clicks.ts',
        required: [
          'metadata_json',
          'serializeMetadata',
          'normalizeMerchantExitContext',
          'INSERT INTO merchant_click_events'
        ]
      },
      {
        label: 'Affiliate redirect records decision context',
        filePath: 'src/app/go/[productId]/route.ts',
        required: [
          'getMerchantExitContextFromSearchParams',
          'metadata,',
          'recordMerchantClick',
          'NextResponse.redirect'
        ]
      },
      {
        label: 'Decision event type for purchase views',
        filePath: 'src/lib/decision-event-types.ts',
        required: [
          "'purchase_decision_view'",
          "'purchase_decision_cta_click'",
          "'merchant_cta_click'"
        ]
      },
      {
        label: 'Buy-ready CTR aggregation',
        filePath: 'src/lib/decision-events.ts',
        required: [
          'PURCHASE_DECISION_VIEW_TYPES',
          'buyReadyDecisionViews',
          'buyReadyMerchantExits',
          'purchaseDecisionCtaClicks',
          'buyReadyValidAffiliateCtr',
          "row.metadata?.purchaseDecisionState === 'buy_now'",
          'SELECT visitor_id, source, created_at'
        ]
      },
      {
        label: 'Merchant click schema metadata',
        filePath: 'src/lib/db/schema.ts',
        required: [
          'CREATE TABLE IF NOT EXISTS merchant_click_events',
          'metadata_json TEXT',
          "await ensureColumn(db, 'merchant_click_events', 'metadata_json'",
          'idx_merchant_click_events_metadata_json_gin'
        ]
      },
      {
        label: 'Admin commercial command center',
        filePath: 'src/app/admin/page.tsx',
        required: [
          'Commercial Command Center',
          'buy-ready 有效 CTR',
          'purchaseDecisionViewEvents',
          'commercialRepairQueue',
          '阻碍购买闭环'
        ]
      },
      {
        label: 'Products conversion readiness',
        filePath: 'src/app/api/admin/products/route.ts',
        required: [
          'type ConversionReadiness',
          "'buy-ready'",
          "'blocked-no-link'",
          "'blocked-price'",
          "'blocked-evidence'",
          "'blocked-stock'",
          "'blocked-risk'",
          'buildConversionReadiness',
          'conversion_readiness',
          'conversion_blockers',
          'active_affiliate_links',
          'evidence_count'
        ]
      },
      {
        label: 'Products console conversion readiness filter',
        filePath: 'src/components/admin/ProductsConsole.tsx',
        required: [
          'ConversionReadinessFilter',
          'conversionReadinessFilter',
          'Conversion readiness',
          'renderConversionReadiness',
          'blocked-no-link',
          'blocked-price',
          'blocked-evidence',
          'blocked-stock',
          'blocked-risk'
        ]
      },
      {
        label: 'Risk center commercial risks',
        filePath: 'src/lib/admin-blueprint.ts',
        required: [
          'commercialRisks',
          'commercial_risks',
          'high_intent_no_cta',
          'high_score_no_link',
          'broken_go_path',
          'weak_evidence_buy_cta',
          'overpriced_buy_cta',
          'out_of_stock_buy_cta'
        ]
      },
      {
        label: 'Risk console commercial risk section',
        filePath: 'src/components/admin/RiskConsole.tsx',
        required: [
          '商业风险',
          'commercial_risks',
          'commercialRisks',
          'risk_type'
        ]
      },
      {
        label: 'Pipeline repair queue and buy-ready metrics',
        filePath: 'src/lib/pipeline.ts',
        required: [
          'commercialRepairQueue',
          'buyReadyValidAffiliateCtr',
          'buyReadyDecisionViewEvents',
          'purchaseDecisionCtaEvents',
          'buyReadyMerchantExitEvents',
          'high_score_no_link'
        ]
      },
      {
        label: 'Commercial loop metadata integration check',
        filePath: 'scripts/check-commercial-loop-integration.ts',
        required: [
          'purchase decision metadata reaches merchant click attribution',
          'pdState=buy_now',
          'decisionMetadataClick?.metadata_json',
          'metadata?.purchaseDecisionState ==='
        ]
      }
    ]
  },
  {
    doc: '14. Proactive product optimization and conversion gates',
    requirement: 'Bes3 has an executable proactive optimization mechanism that catches viewport, CTA, affiliate handoff, SEO/GEO, and release preflight regressions before users report them.',
    artifacts: [
      {
        label: 'Proactive optimization policy',
        filePath: 'docs/planv2/14.Bes3 主动产品优化与转化门禁机制 (Proactive Product Optimization & Conversion Gates).md',
        required: [
          'Buy-ready CTA visibility',
          'Valid affiliate handoff',
          '390x844',
          '1024x768',
          '1100x900',
          '1279x900',
          'SEO/GEO',
          'npm run product:optimization-gates'
        ]
      },
      {
        label: 'Executable product optimization gates',
        filePath: 'scripts/check-product-optimization-gates.ts',
        required: [
          'Product optimization gates passed',
          'checkViewportPolicy',
          'checkProductPageOrdering',
          'checkPurchaseCardOrdering',
          'checkReleaseGateIsBeforeBuild',
          'order-first overflow-hidden',
          'product image must not be forced ahead of decision content',
          'Web layouts must not wait until 1280px before adapting',
          'lg:row-start-1',
          'lg:col-span-2',
          'data-product-ux="decision-shortcuts"',
          'data-product-ux="decision-path"',
          'data-product-ux="decision-notes-cta"',
          'isExternalCtaHref',
          'sticky mobile CTA can collapse'
        ]
      },
      {
        label: 'Dynamic product conversion UX audit',
        filePath: 'scripts/audit-product-conversion-ux.ts',
        required: [
          'PRODUCT_UX_AUDIT_BASE_URL',
          '390',
          '1024',
          'web-narrow',
          'web-before-xl',
          'collectViewportEvidence',
          'assertViewportEvidence',
          'Visible /go CTA redirects to a commissionable merchant URL',
          'isCommissionableMerchantUrl',
          'console issues',
          'horizontal overflow',
          'decision notes does not span the content grid',
          'decision shortcuts are missing',
          'decision notes CTA is missing',
          'sticky mobile CTA is not reserved above the final content'
        ]
      },
      {
        label: 'Release preflight product gate',
        filePath: 'scripts/preflight-release.sh',
        required: [
          'product optimization gates',
          'npm run product:optimization-gates',
          'BES3_PREFLIGHT_RUN_PRODUCT_UX_AUDIT',
          'npm run product:conversion-ux-audit'
        ]
      },
      {
        label: 'Product optimization npm script',
        filePath: 'package.json',
        required: [
          '"product:optimization-gates": "tsx scripts/check-product-optimization-gates.ts"',
          '"product:conversion-ux-audit": "tsx scripts/audit-product-conversion-ux.ts"'
        ]
      }
    ]
  }
]

const failures: string[] = []
const coveredDocs: string[] = []

for (const check of checks) {
  coveredDocs.push(check.doc)
  for (const artifact of check.artifacts) {
    failures.push(...checkArtifact(artifact).map((failure) => `${check.doc}: ${failure}`))
  }
}

const planDocs = fs.readdirSync(path.join(root, 'docs/planv2')).filter((file) => file.endsWith('.md'))
for (const file of planDocs) {
  if (!exists(path.join('docs/planv2', file))) failures.push(`Plan document missing: ${file}`)
}

const packageJson = JSON.parse(read('package.json')) as { scripts?: Record<string, string> }
const expectedScripts = [
  'hardcore:check-planv2-seo',
  'ops:check-planv2-security',
  'commercial-loop:check',
  'commercial-loop:check-live-readiness',
  'db:check-drift',
  'ops:check-env:local',
  'ops:smoke-e2e',
  'ops:browser-e2e',
  'planv2:check-business',
  'product:optimization-gates',
  'product:conversion-ux-audit'
]
for (const scriptName of expectedScripts) {
  if (!packageJson.scripts?.[scriptName]) failures.push(`package.json: missing script ${scriptName}`)
}

if (failures.length > 0) {
  console.error('PlanV2 business coverage check failed:')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log(`PlanV2 business coverage check passed (${coveredDocs.length} requirement groups, ${checks.reduce((count, check) => count + check.artifacts.length, 0)} artifacts)`)
