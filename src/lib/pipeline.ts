import { revalidatePath } from 'next/cache'
import os from 'node:os'
import { buildBrandCategoryPath, buildCategoryPath } from '@/lib/category'
import { generateComparisonCopy, generateKeywordIdeas, generateReviewCopy, generateSeoPayload } from '@/lib/ai'
import { updateAdminArticle } from '@/lib/admin-articles'
import { getArticlePath } from '@/lib/article-path'
import { escapeHtml } from '@/lib/html'
import { persistMediaAsset } from '@/lib/media'
import { getDecisionFunnelSummary } from '@/lib/decision-events'
import { getMerchantClickSummary } from '@/lib/merchant-clicks'
import { getAffiliateProductById, listAffiliateProducts, type AffiliateProductRecord, upsertManualAffiliateLink } from '@/lib/partnerboost'
import { getDatabase } from '@/lib/db'
import { runDeepProductScrapeTask } from '@/lib/deep-product-scraper'
import { buildSeoPagePersistencePayload } from '@/lib/seo-page-payload'
import { dispatchSeoNotifications } from '@/lib/seo-ops'
import { scrapeProductPage, type ScrapedProduct } from '@/lib/scraper'
import { getBrandSlug, listBrands, listProducts, listPublishedArticles, type ProductRecord } from '@/lib/site-data'
import { getSettingValueOrEnv } from '@/lib/settings'
import {
  buildProductIdentityEnrichment,
  normalizeProductAcquisitionHints,
  type ProductAcquisitionHints
} from '@/lib/product-acquisition'
import type { PipelineRunType, PipelineStage, PipelineStatus } from '@/lib/types'
import { slugify } from '@/lib/slug'

export interface PipelineRunListItem {
  id: number
  product_id: number | null
  affiliate_product_id: number | null
  run_type: PipelineRunType
  requested_action: ProductWorkspaceAction | null
  status: PipelineStatus
  current_stage: PipelineStage | null
  error_message: string | null
  source_link: string
  worker_id: string | null
  started_at: string | null
  finished_at: string | null
  attempt_count: number
  priority: number
  scheduled_at: string | null
  locked_by: string | null
  lock_expires_at: string | null
  last_heartbeat_at: string | null
  cancel_requested_at: string | null
  created_at: string
  updated_at: string
  product_name: string | null
  slug: string | null
}

export interface PipelineRunDetailItem extends PipelineRunListItem {
  jobs: Array<{
    id: number
    stage: PipelineStage
    status: string
    message: string | null
    payload_json: string | null
    started_at: string | null
    finished_at: string | null
  }>
}

export interface PipelineOperationsSnapshot {
  runtime: ReturnType<typeof getPipelineWorkerRuntimeConfig>
  workers: Array<{
    worker_id: string
    worker_type: string
    hostname: string | null
    pid: number | null
    status: string
    current_run_id: number | null
    last_seen_at: string
    started_at: string
    metadata_json: string | null
  }>
  queues: Array<{
    task_type: PipelineRunType
    enabled: number
    priority: number
    max_concurrency: number
    timeout_seconds: number
    max_attempts: number
    backoff_policy_json: string | null
    queued: number
    running: number
    failed: number
  }>
  staleRunningCount: number
  expiredLockCount: number
}

export interface AdminDashboardSummary {
  totals: {
    products: number
    affiliateProducts: number
    articles: number
    runs: number
  }
  contentHealth: {
    productsWithLivePrice: number
    productsMissingHero: number
    productsMissingCategory: number
    articlesMissingVisual: number
    staleArticleCount: number
    newsletterSubscribers: number
    targetedSubscribers: number
  }
  commerceQuality: {
    lowConfidenceProducts: number
    staleOfferProducts: number
    productsWithoutOffers: number
    productsWithoutEvidence: number
    productsWithoutOfferCompetition: number
    productsWithoutPriceHistory: number
    freshnessDistribution: {
      fresh: number
      recent: number
      stale: number
      unknown: number
    }
    completenessDistribution: {
      high: number
      medium: number
      low: number
    }
    offerCoverageDistribution: {
      none: number
      single: number
      multi: number
    }
    priceHistoryCoverageDistribution: {
      none: number
      thin: number
      healthy: number
    }
    topPriorityProducts: Array<{
      id: number
      slug: string | null
      productName: string
      brand: string | null
      category: string | null
      priorityScore: number
      freshness: 'fresh' | 'recent' | 'stale' | 'unknown'
      recentMerchantClicks: number
      offerCount: number
      evidenceCount: number
      priceHistoryCount: number
      dataConfidenceScore: number
      attributeCompletenessScore: number
      reasons: string[]
    }>
  }
  brandQuality: {
    trackedBrands: number
    brandsWithPolicy: number
    brandsWithCompatibilityFacts: number
    brandsWithoutPolicy: number
    brandsWithoutCompatibilityFacts: number
    topPriorityBrands: Array<{
      slug: string
      name: string
      productCount: number
      articleCount: number
      compatibilityFactCount: number
      hasPolicy: boolean
      latestUpdate: string | null
      priorityScore: number
      reasons: string[]
    }>
  }
  conversionSignals: {
    totalMerchantClicks: number
    merchantClicksLast7Days: number
    topMerchantSource: string | null
    topMerchantSourceClicks: number
    decisionFunnel: {
      lookbackDays: number
      shortlistVisitors: number
      shortlistEvents: number
      compareVisitors: number
      compareEvents: number
      sharedViewVisitors: number
      sharedImportVisitors: number
      shareExportEvents: number
      coachVisitors: number
      coachPrimaryEvents: number
      coachSecondaryEvents: number
      coachCompareLoadVisitors: number
      coachCompareLoadEvents: number
      merchantIntentVisitors: number
      merchantIntentEvents: number
      verifiedMerchantVisitors: number
      verifiedMerchantEvents: number
      shortlistToCompareRate: number
      compareToMerchantRate: number
      coachInfluencedCompareRate: number
      compareToVerifiedMerchantRate: number
      sharedViewToImportRate: number
      topDecisionSource: string | null
      topDecisionSourceEvents: number
      topCoachAction: string | null
      topCoachActionEvents: number
      assistantFunnel: {
        lookbackDays: number
        sessionVisitors: number
        sessionEvents: number
        constraintVisitors: number
        acceptVisitors: number
        acceptEvents: number
        rejectVisitors: number
        rejectEvents: number
        alertVisitors: number
        alertEvents: number
        offerExpandVisitors: number
        priceHistoryViewVisitors: number
        merchantOfferSelectionVisitors: number
        merchantOfferSelectionEvents: number
        sessionToConstraintRate: number
        sessionToAcceptRate: number
        sessionToAlertRate: number
        acceptToMerchantSelectionRate: number
        topAssistantSource: string | null
        topAssistantSourceEvents: number
      }
    }
  }
  recentRuns: PipelineRunListItem[]
  recentAffiliateProducts: AffiliateProductRecord[]
  staleArticles: Array<{
    id: number
    slug: string
    title: string
    type: string
    ageDays: number
    lastReviewedAt: string | null
  }>
}

export type ProductWorkspaceAction =
  | 'contentPack'
  | 'mineKeywords'
  | 'generateReview'
  | 'generateComparison'
  | 'refreshSeo'

type KeywordIdea = Awaited<ReturnType<typeof generateKeywordIdeas>>[number]

type StoredKeywordIdea = KeywordIdea & {
  totalScore: number
}

type StoredProductRecord = ProductRecord & {
  sourceAffiliateLink: string
  affiliateProductId: number | null
}

type GeneratedArticleDraft = {
  articleType: 'review' | 'comparison'
  title: string
  slug: string
  summary: string
  keyword: string
  heroImageUrl: string | null
  contentMd: string
  contentHtml: string
}

type QueuedRunRecord = {
  id: number
  product_id: number | null
  affiliate_product_id: number | null
  run_type: PipelineRunType
  requested_action: ProductWorkspaceAction | null
  source_link: string
  status?: PipelineStatus
  finished_at?: string | null
}

const PIPELINE_WORKER_RECOVERY_MESSAGE = 'Recovered after worker restart'
const PIPELINE_CANCELLED_MESSAGE = 'Cancelled by admin'
const PIPELINE_CANCEL_REQUESTED_MESSAGE = 'Cancellation requested by admin'
const MAX_PIPELINE_WORKER_CONCURRENCY = 4
const PIPELINE_LOCK_GRACE_SECONDS = 90
const PIPELINE_WORKER_STALE_SECONDS = 120
const DEFAULT_PIPELINE_QUEUE_CONFIG: Array<{
  taskType: PipelineRunType
  enabled: number
  priority: number
  maxConcurrency: number
  timeoutSeconds: number
  maxAttempts: number
}> = [
  { taskType: 'fullPipeline', enabled: 1, priority: 100, maxConcurrency: 1, timeoutSeconds: 3600, maxAttempts: 3 },
  { taskType: 'deepProductScrape', enabled: 1, priority: 60, maxConcurrency: 1, timeoutSeconds: 900, maxAttempts: 3 },
  { taskType: 'workspaceAction', enabled: 1, priority: 50, maxConcurrency: 2, timeoutSeconds: 1800, maxAttempts: 3 }
]

type PipelineWorkerState = {
  started: boolean
  scheduled: boolean
  isTicking: boolean
  workerId: string
  activeRuns: number
  nextRunToken: number
  configCache: {
    enabled: boolean | null
    pollMs: number | null
    concurrency: number | null
  }
  configLoaded: boolean
}

export function getPipelineWorkerState(): PipelineWorkerState {
  const scope = globalThis as typeof globalThis & { __bes3PipelineWorkerState?: PipelineWorkerState }
  if (!scope.__bes3PipelineWorkerState) {
    scope.__bes3PipelineWorkerState = {
      started: false,
      scheduled: false,
      isTicking: false,
      workerId: process.env.PIPELINE_WORKER_ID || `${os.hostname()}-${process.pid}`,
      activeRuns: 0,
      nextRunToken: 0,
      configCache: { enabled: null, pollMs: null, concurrency: null },
      configLoaded: false
    }
  }
  return scope.__bes3PipelineWorkerState
}

export async function loadPipelineConfig(): Promise<void> {
  const state = getPipelineWorkerState()
  if (state.configLoaded) return

  const [enabledStr, pollMsStr, concurrencyStr] = await Promise.all([
    getSettingValueOrEnv('pipeline', 'workerEnabled', 'PIPELINE_WORKER_ENABLED', 'true'),
    getSettingValueOrEnv('pipeline', 'workerPollMs', 'PIPELINE_WORKER_POLL_MS', '2500'),
    getSettingValueOrEnv('pipeline', 'workerConcurrency', 'PIPELINE_WORKER_CONCURRENCY', '1')
  ])

  state.configCache.enabled = enabledStr !== 'false'
  state.configCache.pollMs = Math.max(500, Number.parseInt(pollMsStr, 10) || 2500)
  state.configCache.concurrency = Math.min(Math.max(1, Number.parseInt(concurrencyStr, 10) || 1), MAX_PIPELINE_WORKER_CONCURRENCY)
  state.configLoaded = true
}

function isPipelineWorkerEnabled(): boolean {
  const state = getPipelineWorkerState()
  if (!state.configLoaded) {
    // Sync fallback: only use env var until config is loaded
    return (process.env.PIPELINE_WORKER_ENABLED || 'true') !== 'false'
  }
  return state.configCache.enabled !== false
}

function getPipelineWorkerPollMs(): number {
  const state = getPipelineWorkerState()
  if (state.configCache.pollMs !== null) return state.configCache.pollMs
  return Math.max(500, Number.parseInt(process.env.PIPELINE_WORKER_POLL_MS || '2500', 10) || 2500)
}

function getPipelineWorkerConcurrency(): number {
  const state = getPipelineWorkerState()
  if (state.configCache.concurrency !== null) return state.configCache.concurrency
  return Math.min(Math.max(1, Number.parseInt(process.env.PIPELINE_WORKER_CONCURRENCY || '1', 10) || 1), MAX_PIPELINE_WORKER_CONCURRENCY)
}

export function getPipelineWorkerRuntimeConfig() {
  const state = getPipelineWorkerState()
  return {
    enabled: isPipelineWorkerEnabled(),
    pollMs: getPipelineWorkerPollMs(),
    concurrency: getPipelineWorkerConcurrency()
  }
}

class PipelineCancelledError extends Error {
  constructor(message: string = PIPELINE_CANCELLED_MESSAGE) {
    super(message)
    this.name = 'PipelineCancelledError'
  }
}

function isPipelineCancelledError(error: unknown): error is PipelineCancelledError {
  return error instanceof PipelineCancelledError
}

function parsePositiveInt(value: string | undefined, fallback: number, max?: number): number {
  const parsed = Number.parseInt(value || '', 10)
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback
  if (typeof max === 'number') return Math.min(parsed, max)
  return parsed
}

function toDatabaseTimestamp(date = new Date()): string {
  return date.toISOString().slice(0, 19).replace('T', ' ')
}

function secondsFromNow(seconds: number): string {
  return toDatabaseTimestamp(new Date(Date.now() + seconds * 1000))
}

function secondsAgo(seconds: number): string {
  return toDatabaseTimestamp(new Date(Date.now() - seconds * 1000))
}

async function ensureDefaultPipelineQueueConfig(): Promise<void> {
  const db = await getDatabase()
  for (const item of DEFAULT_PIPELINE_QUEUE_CONFIG) {
    await db.exec(
      `
        INSERT INTO pipeline_queue_config (
          task_type, enabled, priority, max_concurrency, timeout_seconds, max_attempts, backoff_policy_json
        )
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(task_type) DO NOTHING
      `,
      [
        item.taskType,
        item.enabled,
        item.priority,
        item.maxConcurrency,
        item.timeoutSeconds,
        item.maxAttempts,
        JSON.stringify({ type: 'exponential', baseSeconds: 30, maxSeconds: 900 })
      ]
    )
  }
}

async function heartbeatPipelineWorker(input: {
  workerId: string
  status: 'starting' | 'idle' | 'running' | 'disabled' | 'stopping' | 'stopped' | 'error'
  currentRunId?: number | null
  metadata?: Record<string, unknown>
}): Promise<void> {
  const db = await getDatabase()
  await db.exec(
    `
      INSERT INTO worker_heartbeats (
        worker_id, worker_type, hostname, pid, status, current_run_id, last_seen_at, started_at, metadata_json
      )
      VALUES (?, 'pipeline', ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, ?)
      ON CONFLICT(worker_id) DO UPDATE SET
        hostname = excluded.hostname,
        pid = excluded.pid,
        status = excluded.status,
        current_run_id = excluded.current_run_id,
        last_seen_at = CURRENT_TIMESTAMP,
        metadata_json = excluded.metadata_json
    `,
    [
      input.workerId,
      os.hostname(),
      process.pid,
      input.status,
      input.currentRunId || null,
      input.metadata ? JSON.stringify(input.metadata) : null
    ]
  )
}

async function refreshActiveWorkerLocks(parentWorkerId: string): Promise<void> {
  const db = await getDatabase()
  await db.exec(
    `
      UPDATE content_pipeline_runs
      SET lock_expires_at = ?,
          last_heartbeat_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
      WHERE status = 'running'
        AND finished_at IS NULL
        AND worker_id LIKE ?
    `,
    [secondsFromNow(PIPELINE_LOCK_GRACE_SECONDS), `${parentWorkerId}-%`]
  )
}

export async function markPipelineWorkerStopped(workerId = getPipelineWorkerState().workerId): Promise<void> {
  await heartbeatPipelineWorker({
    workerId,
    status: 'stopped',
    currentRunId: null,
    metadata: { activeRuns: getPipelineWorkerState().activeRuns }
  })
}

async function createRun(input: {
  sourceLink: string
  affiliateProductId?: number | null
  productId?: number | null
  runType: PipelineRunType
  requestedAction?: ProductWorkspaceAction | null
}) {
  const db = await getDatabase()
  await ensureDefaultPipelineQueueConfig()
  const existing = await db.queryOne<{ id: number }>(
    `
      SELECT id
      FROM content_pipeline_runs
      WHERE status IN ('queued', 'running')
        AND run_type = ?
        AND COALESCE(product_id, 0) = COALESCE(?, 0)
        AND COALESCE(affiliate_product_id, 0) = COALESCE(?, 0)
        AND source_link = ?
        AND COALESCE(requested_action, '') = COALESCE(?, '')
      ORDER BY created_at DESC, id DESC
      LIMIT 1
    `,
    [input.runType, input.productId || null, input.affiliateProductId || null, input.sourceLink, input.requestedAction || null]
  )
  if (existing?.id) {
    return existing.id
  }

  const result = await db.exec(
    `
      INSERT INTO content_pipeline_runs (
        product_id, affiliate_product_id, source_link, run_type, requested_action, status, current_stage, worker_id, locked_at, started_at, finished_at, attempt_count,
        priority, scheduled_at, locked_by, lock_expires_at, last_heartbeat_at, cancel_requested_at, payload_json
      )
      VALUES (?, ?, ?, ?, ?, 'queued', NULL, NULL, NULL, NULL, NULL, 0, ?, NULL, NULL, NULL, NULL, NULL, NULL)
    `,
    [
      input.productId || null,
      input.affiliateProductId || null,
      input.sourceLink,
      input.runType,
      input.requestedAction || null,
      input.runType === 'workspaceAction' ? 50 : input.runType === 'deepProductScrape' ? 60 : 100
    ]
  )
  return Number(result.lastInsertRowid)
}

async function markRun(
  runId: number,
  status: PipelineStatus,
  currentStage?: PipelineStage | null,
  errorMessage?: string | null,
  metadata?: {
    workerId?: string | null
    started?: boolean
    finished?: boolean
  }
) {
  const db = await getDatabase()
  const hasWorkerId = metadata ? Object.prototype.hasOwnProperty.call(metadata, 'workerId') : false
  await db.exec(
    `
      UPDATE content_pipeline_runs
      SET status = ?,
          current_stage = ?,
          error_message = ?,
          worker_id = CASE WHEN ? = 1 THEN ? ELSE worker_id END,
          locked_by = CASE WHEN ? = 1 THEN ? ELSE locked_by END,
          locked_at = CASE
            WHEN ? = 1 THEN CURRENT_TIMESTAMP
            WHEN ? = 1 THEN NULL
            ELSE locked_at
          END,
          lock_expires_at = CASE
            WHEN ? = 1 THEN ?
            WHEN ? = 1 THEN NULL
            ELSE lock_expires_at
          END,
          last_heartbeat_at = CASE
            WHEN ? = 1 THEN CURRENT_TIMESTAMP
            WHEN ? = 1 THEN NULL
            ELSE last_heartbeat_at
          END,
          cancel_requested_at = CASE
            WHEN ? = 1 THEN NULL
            ELSE cancel_requested_at
          END,
          started_at = CASE
            WHEN ? = 1 THEN COALESCE(started_at, CURRENT_TIMESTAMP)
            ELSE started_at
          END,
          finished_at = CASE
            WHEN ? = 1 THEN CURRENT_TIMESTAMP
            ELSE NULL
          END,
          attempt_count = CASE WHEN ? = 1 THEN attempt_count + 1 ELSE attempt_count END,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `,
    [
      status,
      currentStage || null,
      errorMessage || null,
      hasWorkerId ? 1 : 0,
      metadata?.workerId ?? null,
      hasWorkerId ? 1 : 0,
      metadata?.workerId ?? null,
      metadata?.started ? 1 : 0,
      metadata?.finished ? 1 : 0,
      metadata?.started ? 1 : 0,
      metadata?.started ? secondsFromNow(PIPELINE_LOCK_GRACE_SECONDS) : null,
      metadata?.finished ? 1 : 0,
      status === 'running' ? 1 : 0,
      metadata?.finished ? 1 : 0,
      metadata?.finished ? 1 : 0,
      metadata?.started ? 1 : 0,
      metadata?.finished ? 1 : 0,
      metadata?.started ? 1 : 0,
      runId
    ]
  )
}

async function createJob(runId: number, stage: PipelineStage) {
  const db = await getDatabase()
  const result = await db.exec(
    'INSERT INTO content_pipeline_jobs (run_id, stage, status, started_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)',
    [runId, stage, 'running']
  )
  return Number(result.lastInsertRowid)
}

async function finishJob(jobId: number, status: string, message?: string, payload?: unknown) {
  const db = await getDatabase()
  await db.exec(
    `
      UPDATE content_pipeline_jobs
      SET status = ?, message = ?, payload_json = ?, finished_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `,
    [status, message || null, payload ? JSON.stringify(payload) : null, jobId]
  )
}

async function getQueuedRun(runId: number): Promise<QueuedRunRecord | null> {
  const db = await getDatabase()
  const run = await db.queryOne<QueuedRunRecord>(
    `
      SELECT id, product_id, affiliate_product_id, run_type, requested_action, source_link, status
           , finished_at
      FROM content_pipeline_runs
      WHERE id = ?
      LIMIT 1
    `,
    [runId]
  )
  return run || null
}

async function assertRunNotCancelled(runId: number): Promise<void> {
  const run = await getQueuedRun(runId)
  if (!run) {
    throw new Error('Pipeline run not found')
  }
  if (run.status === 'cancelled') {
    throw new PipelineCancelledError(PIPELINE_CANCEL_REQUESTED_MESSAGE)
  }
}

async function getLastRunningJobId(runId: number): Promise<number | null> {
  const db = await getDatabase()
  const job = await db.queryOne<{ id: number }>(
    `
      SELECT id
      FROM content_pipeline_jobs
      WHERE run_id = ? AND status = 'running'
      ORDER BY id DESC
      LIMIT 1
    `,
    [runId]
  )
  return job?.id || null
}

async function finalizeLastRunningJob(runId: number, status: string, message: string, payload?: unknown) {
  const jobId = await getLastRunningJobId(runId)
  if (!jobId) return
  await finishJob(jobId, status, message, payload)
}

export async function recoverInterruptedRuns(): Promise<void> {
  const db = await getDatabase()
  const staleBefore = secondsAgo(PIPELINE_WORKER_STALE_SECONDS)
  const expiredBefore = toDatabaseTimestamp()
  const interruptedRuns = await db.query<{ id: number }>(
    `
      SELECT id
      FROM content_pipeline_runs
      WHERE status = 'running'
        AND finished_at IS NULL
        AND (
          lock_expires_at IS NULL
          OR lock_expires_at <= ?
          OR last_heartbeat_at IS NULL
          OR last_heartbeat_at <= ?
        )
      ORDER BY id ASC
    `,
    [expiredBefore, staleBefore]
  )

  for (const run of interruptedRuns) {
    await db.exec(
      `
        UPDATE content_pipeline_runs
        SET status = 'queued',
            current_stage = NULL,
            error_message = ?,
            worker_id = NULL,
            locked_by = NULL,
            locked_at = NULL,
            lock_expires_at = NULL,
            last_heartbeat_at = NULL,
            cancel_requested_at = NULL,
            started_at = NULL,
            finished_at = NULL,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
      [PIPELINE_WORKER_RECOVERY_MESSAGE, run.id]
    )
    await db.exec(
      `
        UPDATE content_pipeline_jobs
        SET status = 'failed',
            message = ?,
            finished_at = CURRENT_TIMESTAMP
        WHERE run_id = ? AND status = 'running' AND finished_at IS NULL
      `,
      [PIPELINE_WORKER_RECOVERY_MESSAGE, run.id]
    )
  }
}

async function claimNextRun(workerId: string): Promise<QueuedRunRecord | null> {
  const db = await getDatabase()
  await ensureDefaultPipelineQueueConfig()
  const now = toDatabaseTimestamp()
  const lockExpiresAt = secondsFromNow(PIPELINE_LOCK_GRACE_SECONDS)
  for (let index = 0; index < 5; index += 1) {
    const candidate = await db.queryOne<QueuedRunRecord>(
      `
        SELECT r.id, r.product_id, r.affiliate_product_id, r.run_type, r.requested_action, r.source_link, r.status,
          r.finished_at
        FROM content_pipeline_runs r
        LEFT JOIN pipeline_queue_config q ON q.task_type = r.run_type
        WHERE r.status = 'queued'
          AND (r.scheduled_at IS NULL OR r.scheduled_at <= ?)
          AND COALESCE(q.enabled, 1) = 1
          AND r.attempt_count < COALESCE(q.max_attempts, 3)
        ORDER BY COALESCE(r.priority, q.priority, 100) ASC, r.created_at ASC, r.id ASC
        LIMIT 1
      `,
      [now]
    )

    if (!candidate) return null

    const claimResult = await db.exec(
      `
        UPDATE content_pipeline_runs
        SET status = 'running',
            worker_id = ?,
            locked_by = ?,
            locked_at = CURRENT_TIMESTAMP,
            lock_expires_at = ?,
            last_heartbeat_at = CURRENT_TIMESTAMP,
            started_at = COALESCE(started_at, CURRENT_TIMESTAMP),
            finished_at = NULL,
            attempt_count = attempt_count + 1,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ? AND status = 'queued' AND (scheduled_at IS NULL OR scheduled_at <= ?)
      `,
      [workerId, workerId, lockExpiresAt, candidate.id, now]
    )

    if (claimResult.changes > 0) {
      candidate.status = 'running'
      await heartbeatPipelineWorker({ workerId, status: 'running', currentRunId: candidate.id })
      return candidate
    }
  }

  return null
}

function schedulePipelineWorkerTick(delayMs: number) {
  const state = getPipelineWorkerState()
  if (state.scheduled) return
  state.scheduled = true
  setTimeout(() => {
    state.scheduled = false
    void runPipelineWorkerTick()
  }, delayMs)
}

async function runPipelineWorkerTick() {
  const state = getPipelineWorkerState()
  if (state.isTicking) return
  state.isTicking = true

  try {
    if (!isPipelineWorkerEnabled()) {
      await heartbeatPipelineWorker({ workerId: state.workerId, status: 'disabled', currentRunId: null })
      return
    }

    const concurrency = getPipelineWorkerConcurrency()
    await refreshActiveWorkerLocks(state.workerId)
    await recoverInterruptedRuns()

    while (state.activeRuns < concurrency) {
      state.nextRunToken += 1
      const slotWorkerId = `${state.workerId}-${state.nextRunToken}`
      const run = await claimNextRun(slotWorkerId)
      if (!run) {
        break
      }

      state.activeRuns += 1
      void (async () => {
        try {
          if (run.run_type === 'workspaceAction') {
            if (!run.product_id || !run.requested_action) {
              throw new Error('Queued workspace action is missing product_id or requested_action')
            }
            await executeProductWorkspaceActionRun(run.id, run.product_id, run.requested_action, slotWorkerId)
          } else if (run.run_type === 'deepProductScrape') {
            await executeDeepProductScrapeRun(run.id, run.source_link, run.affiliate_product_id, slotWorkerId)
          } else {
            await executeFullPipelineRun(run.id, run.source_link, run.affiliate_product_id, slotWorkerId)
          }
        } catch (error) {
          console.error('[bes3-pipeline-worker] run failed', error)
        } finally {
          state.activeRuns = Math.max(0, state.activeRuns - 1)
          await heartbeatPipelineWorker({
            workerId: slotWorkerId,
            status: 'idle',
            currentRunId: null,
            metadata: { parentWorkerId: state.workerId }
          })
          schedulePipelineWorkerTick(0)
        }
      })()
    }

    await heartbeatPipelineWorker({
      workerId: state.workerId,
      status: state.activeRuns > 0 ? 'running' : 'idle',
      currentRunId: null,
      metadata: { activeRuns: state.activeRuns, concurrency }
    })
    schedulePipelineWorkerTick(getPipelineWorkerPollMs())
  } catch (error) {
    console.error('[bes3-pipeline-worker] tick failed', error)
    await heartbeatPipelineWorker({
      workerId: state.workerId,
      status: 'error',
      currentRunId: null,
      metadata: { error: error instanceof Error ? error.message : String(error) }
    })
    schedulePipelineWorkerTick(getPipelineWorkerPollMs())
  } finally {
    state.isTicking = false
  }
}

export async function startPipelineWorker(): Promise<void> {
  const state = getPipelineWorkerState()
  if (state.started) return
  await loadPipelineConfig()
  await ensureDefaultPipelineQueueConfig()
  state.started = true
  if (!isPipelineWorkerEnabled()) {
    await heartbeatPipelineWorker({ workerId: state.workerId, status: 'disabled', currentRunId: null })
    console.log('[bes3-worker] Disabled, not starting tick loop')
    return
  }
  await heartbeatPipelineWorker({ workerId: state.workerId, status: 'starting', currentRunId: null })
  await recoverInterruptedRuns()
  schedulePipelineWorkerTick(250)
  console.log('[bes3-worker] Tick loop started')
}

async function ensureProductShell(input: {
  affiliateProductId?: number | null
  sourcePlatform: string
  sourceLink: string
  finalUrl: string
  productName: string
  brand: string | null
  productModel?: string | null
  modelNumber?: string | null
  productType?: string | null
  category?: string | null
  categorySlug?: string | null
  youtubeMatchTerms?: string[] | null
}): Promise<number> {
  const db = await getDatabase()
  const slug = slugify(input.productName)
  const existingByAffiliateId = input.affiliateProductId
    ? await db.queryOne<{ id: number }>('SELECT id FROM products WHERE affiliate_product_id = ? LIMIT 1', [input.affiliateProductId])
    : null

  if (existingByAffiliateId?.id) return existingByAffiliateId.id

  const existingByIdentity = await db.queryOne<{ id: number }>(
    `
      SELECT id
      FROM products
      WHERE resolved_url = ?
         OR canonical_url = ?
         OR source_affiliate_link = ?
         OR slug = ?
      LIMIT 1
    `,
    [input.finalUrl, input.finalUrl, input.sourceLink, slug]
  )

  if (existingByIdentity?.id) {
    await db.exec(
      `
        UPDATE products
        SET source_platform = ?,
            source_affiliate_link = COALESCE(source_affiliate_link, ?),
            resolved_url = COALESCE(resolved_url, ?),
            canonical_url = COALESCE(canonical_url, ?),
            brand = COALESCE(brand, ?),
            product_model = COALESCE(product_model, ?),
            model_number = COALESCE(model_number, ?),
            product_type = COALESCE(product_type, ?),
            category = COALESCE(category, ?),
            category_slug = COALESCE(category_slug, ?),
            youtube_match_terms_json = COALESCE(youtube_match_terms_json, ?),
            product_name = COALESCE(product_name, ?),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
      [
        input.sourcePlatform,
        input.sourceLink,
        input.finalUrl,
        input.finalUrl,
        input.brand,
        input.productModel || null,
        input.modelNumber || null,
        input.productType || null,
        input.category || null,
        input.categorySlug || null,
        input.youtubeMatchTerms?.length ? JSON.stringify(input.youtubeMatchTerms) : null,
        input.productName,
        existingByIdentity.id
      ]
    )
    return existingByIdentity.id
  }

  const result = await db.exec(
    `
      INSERT INTO products (
        affiliate_product_id, source_platform, source_affiliate_link, resolved_url, canonical_url, slug, brand,
        product_model, model_number, product_type, category, category_slug, youtube_match_terms_json, product_name
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      input.affiliateProductId || null,
      input.sourcePlatform,
      input.sourceLink,
      input.finalUrl,
      input.finalUrl,
      slug,
      input.brand,
      input.productModel || null,
      input.modelNumber || null,
      input.productType || null,
      input.category || null,
      input.categorySlug || null,
      input.youtubeMatchTerms?.length ? JSON.stringify(input.youtubeMatchTerms) : null,
      input.productName
    ]
  )

  return Number(result.lastInsertRowid)
}

async function findProductIdByAffiliateProductId(affiliateProductId: number | null): Promise<number | null> {
  if (!affiliateProductId) return null
  const db = await getDatabase()
  const row = await db.queryOne<{ id: number }>(
    'SELECT id FROM products WHERE affiliate_product_id = ? LIMIT 1',
    [affiliateProductId]
  )
  return row?.id || null
}

function parseAffiliateRawPayload(affiliateProduct: AffiliateProductRecord | null): Record<string, any> {
  if (!affiliateProduct?.raw_payload) return {}
  if (typeof affiliateProduct.raw_payload === 'string') {
    try {
      return JSON.parse(affiliateProduct.raw_payload) as Record<string, any>
    } catch {
      return {}
    }
  }
  return {}
}

function mergeAffiliateFallbackIntoScrape(affiliateProduct: AffiliateProductRecord | null, scraped: ScrapedProduct): ScrapedProduct {
  if (!affiliateProduct) return scraped

  const rawPayload = parseAffiliateRawPayload(affiliateProduct)
  const acquisitionHints = normalizeProductAcquisitionHints({
    ...(rawPayload.acquisitionHints || {}),
    brandName: affiliateProduct.brand,
    productModel: affiliateProduct.product_model,
    modelNumber: affiliateProduct.model_number,
    productType: affiliateProduct.product_type,
    category: affiliateProduct.category,
    categorySlug: affiliateProduct.category_slug,
    countryCode: affiliateProduct.country_code
  })
  const specs = { ...scraped.specs }
  const assignSpec = (label: string, value: unknown) => {
    const text = String(value || '').trim()
    if (!text || specs[label]) return
    specs[label] = text
  }

  assignSpec('ASIN', affiliateProduct.asin)
  assignSpec('Brand', affiliateProduct.brand)
  assignSpec('Model', acquisitionHints.productModel)
  assignSpec('Model Number', acquisitionHints.modelNumber)
  assignSpec('Product Type', acquisitionHints.productType)
  assignSpec('Category', acquisitionHints.category || rawPayload.category || rawPayload.subcategory)
  assignSpec('Availability', rawPayload.availability)
  assignSpec('Merchant', rawPayload.brand_name || rawPayload.brand || rawPayload.merchant_name)

  const fallbackImage = affiliateProduct.image_url ? [affiliateProduct.image_url] : []
  const fallbackCategory = acquisitionHints.category || String(rawPayload.category || rawPayload.subcategory || '').trim() || null
  const identity = buildProductIdentityEnrichment({
    productName:
      scraped.productName && !/^unknown\b/i.test(scraped.productName)
        ? scraped.productName
        : affiliateProduct.product_name || String(rawPayload.product_name || rawPayload.name || '').trim() || scraped.productName,
    brand: scraped.brand || affiliateProduct.brand || String(rawPayload.brand_name || rawPayload.brand || rawPayload.merchant_name || '').trim() || null,
    category: scraped.category || fallbackCategory,
    specs,
    rawPayload,
    hints: acquisitionHints
  })
  const referencePriceAmount = [rawPayload.original_price, rawPayload.list_price, rawPayload.compare_at_price]
    .map((value) => {
      const parsed = Number.parseFloat(String(value ?? '').replace(/[^\d.-]/g, ''))
      return Number.isFinite(parsed) ? parsed : null
    })
    .find((value) => value != null) ?? null
  const referencePriceCurrency = String(rawPayload.original_price_currency || rawPayload.list_price_currency || rawPayload.currency || affiliateProduct.price_currency || '').trim() || null
  const referencePriceType =
    rawPayload.original_price != null
      ? 'original'
      : rawPayload.list_price != null
        ? 'msrp'
        : rawPayload.compare_at_price != null
          ? 'compare_at'
          : null

  return {
    ...scraped,
    productName:
      scraped.productName && !/^unknown\b/i.test(scraped.productName)
        ? scraped.productName
        : affiliateProduct.product_name || String(rawPayload.product_name || rawPayload.name || '').trim() || scraped.productName,
    brand: scraped.brand || affiliateProduct.brand || String(rawPayload.brand_name || rawPayload.brand || rawPayload.merchant_name || '').trim() || null,
    productModel: scraped.productModel || identity.productModel,
    modelNumber: scraped.modelNumber || identity.modelNumber,
    productType: scraped.productType || identity.productType,
    category: scraped.category || identity.category || fallbackCategory,
    categorySlug: scraped.categorySlug || identity.categorySlug,
    youtubeMatchTerms: scraped.youtubeMatchTerms.length ? scraped.youtubeMatchTerms : identity.youtubeMatchTerms,
    description:
      scraped.description ||
      String(rawPayload.description || rawPayload.promotion_title || '').trim() ||
      null,
    priceAmount: scraped.priceAmount ?? affiliateProduct.price_amount ?? null,
    priceCurrency: scraped.priceCurrency || affiliateProduct.price_currency || String(rawPayload.currency || '').trim() || 'USD',
    rating: scraped.rating ?? affiliateProduct.rating ?? null,
    reviewCount: scraped.reviewCount ?? affiliateProduct.review_count ?? null,
    imageUrls: scraped.imageUrls.length ? scraped.imageUrls : fallbackImage,
    offers: scraped.offers.map((offer) => ({
      ...offer,
      referencePriceAmount:
        offer.referencePriceAmount != null
          ? offer.referencePriceAmount
          : referencePriceAmount != null && offer.priceAmount != null && referencePriceAmount > offer.priceAmount
            ? referencePriceAmount
            : null,
      referencePriceCurrency:
        offer.referencePriceCurrency ||
        (referencePriceAmount != null ? referencePriceCurrency || offer.priceCurrency || affiliateProduct.price_currency || null : null),
      referencePriceType: offer.referencePriceType || referencePriceType,
      referencePriceSource: offer.referencePriceSource || (referencePriceAmount != null ? 'affiliate_payload' : null),
      referencePriceLastCheckedAt: offer.referencePriceLastCheckedAt || (referencePriceAmount != null ? scraped.offerLastCheckedAt : null)
    })),
    specs,
    attributeFacts: scraped.attributeFacts.length ? scraped.attributeFacts : Object.entries(specs).map(([label, value]) => ({
      key: label.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, ''),
      label,
      value,
      sourceUrl: scraped.finalUrl,
      sourceType: 'dom' as const,
      confidenceScore: 0.72,
      isVerified: false
    })),
    attributeCompletenessScore: Math.max(scraped.attributeCompletenessScore, Object.keys(specs).length >= 3 ? 0.6 : scraped.attributeCompletenessScore),
    sourceCount: Math.max(scraped.sourceCount, 2)
  }
}

async function updateProductFromScrape(productId: number, scraped: ReturnType<typeof scrapeProductPage>) {
  const db = await getDatabase()
  await db.exec(
    `
      UPDATE products
      SET resolved_url = ?, canonical_url = ?, slug = ?, brand = ?, product_model = ?, model_number = ?,
          product_type = ?, product_name = ?, category = ?, category_slug = ?, description = ?,
          price_amount = ?, price_currency = ?, rating = ?, review_count = ?, specs_json = ?, review_highlights_json = ?,
          youtube_match_terms_json = ?, source_payload_json = ?, price_last_checked_at = ?, offer_last_checked_at = ?, attribute_completeness_score = ?,
          data_confidence_score = ?, source_count = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `,
    [
      scraped.finalUrl,
      scraped.finalUrl,
      slugify(scraped.productName),
      scraped.brand,
      scraped.productModel,
      scraped.modelNumber,
      scraped.productType,
      scraped.productName,
      scraped.category,
      scraped.categorySlug,
      scraped.description,
      scraped.priceAmount,
      scraped.priceCurrency,
      scraped.rating,
      scraped.reviewCount,
      JSON.stringify(scraped.specs),
      JSON.stringify(scraped.reviewHighlights),
      JSON.stringify(scraped.youtubeMatchTerms),
      JSON.stringify(scraped),
      scraped.priceLastCheckedAt,
      scraped.offerLastCheckedAt,
      scraped.attributeCompletenessScore,
      scraped.dataConfidenceScore,
      scraped.sourceCount,
      productId
    ]
  )
}

async function ensureMerchantRecord(input: {
  name: string
  websiteUrl?: string | null
}): Promise<number | null> {
  const name = input.name.trim()
  if (!name) return null

  const db = await getDatabase()
  const slug = slugify(name)
  const existing = await db.queryOne<{ id: number }>('SELECT id FROM merchants WHERE slug = ? LIMIT 1', [slug])

  if (existing?.id) {
    await db.exec(
      `
        UPDATE merchants
        SET name = ?, website_url = COALESCE(?, website_url), updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
      [name, input.websiteUrl || null, existing.id]
    )
    return existing.id
  }

  const result = await db.exec(
    `
      INSERT INTO merchants (name, slug, website_url)
      VALUES (?, ?, ?)
    `,
    [name, slug, input.websiteUrl || null]
  )

  return Number(result.lastInsertRowid)
}

async function persistProductGraphFromScrape(productId: number, scraped: ReturnType<typeof scrapeProductPage>) {
  const db = await getDatabase()

  await db.transaction(async () => {
    await db.exec('DELETE FROM product_offers WHERE product_id = ?', [productId])
    await db.exec('DELETE FROM product_attribute_facts WHERE product_id = ?', [productId])

    for (const offer of scraped.offers) {
      const merchantId = await ensureMerchantRecord({
        name: offer.merchantName,
        websiteUrl: offer.websiteUrl
      })

      const insertResult = await db.exec(
        `
          INSERT INTO product_offers (
            product_id, merchant_id, offer_url, availability_status, price_amount, price_currency, shipping_cost,
            coupon_text, coupon_type, reference_price_amount, reference_price_currency, reference_price_type,
            reference_price_source, reference_price_last_checked_at, condition_label, source_type, source_url, confidence_score, raw_payload_json,
            last_checked_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          productId,
          merchantId,
          offer.offerUrl,
          offer.availabilityStatus,
          offer.priceAmount,
          offer.priceCurrency,
          offer.shippingCost,
          offer.couponText,
          offer.couponType,
          offer.referencePriceAmount,
          offer.referencePriceCurrency,
          offer.referencePriceType,
          offer.referencePriceSource,
          offer.referencePriceLastCheckedAt,
          offer.conditionLabel,
          offer.sourceType,
          offer.sourceUrl,
          offer.confidenceScore,
          offer.rawPayload ? JSON.stringify(offer.rawPayload) : null,
          scraped.offerLastCheckedAt
        ]
      )

      const offerId = Number(insertResult.lastInsertRowid || 0)
      if (offerId && (offer.priceAmount != null || offer.availabilityStatus)) {
        await db.exec(
          `
            INSERT INTO product_price_history (
              product_id, product_offer_id, price_amount, price_currency, availability_status, captured_at
            ) VALUES (?, ?, ?, ?, ?, ?)
          `,
          [
            productId,
            offerId,
            offer.priceAmount,
            offer.priceCurrency,
            offer.availabilityStatus,
            scraped.offerLastCheckedAt
          ]
        )
      }
    }

    for (const fact of scraped.attributeFacts) {
      await db.exec(
        `
          INSERT INTO product_attribute_facts (
            product_id, attribute_key, attribute_label, attribute_value, source_url, source_type, confidence_score,
            is_verified, last_checked_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          productId,
          fact.key,
          fact.label,
          fact.value,
          fact.sourceUrl,
          fact.sourceType,
          fact.confidenceScore,
          fact.isVerified ? 1 : 0,
          scraped.priceLastCheckedAt
        ]
      )
    }
  })
}

async function saveKeywords(productId: number, keywords: Awaited<ReturnType<typeof generateKeywordIdeas>>) {
  const db = await getDatabase()
  await db.exec('DELETE FROM keyword_opportunities WHERE product_id = ?', [productId])
  for (const keyword of keywords) {
    const totalScore =
      keyword.buyerIntent * 0.3 +
      keyword.serpWeakness * 0.2 +
      keyword.commissionPotential * 0.2 +
      keyword.contentFit * 0.2 +
      keyword.freshness * 0.1
    await db.exec(
      `
        INSERT INTO keyword_opportunities (
          product_id, keyword, buyer_intent, serp_weakness, commission_potential, content_fit, freshness, total_score
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        productId,
        keyword.keyword,
        keyword.buyerIntent,
        keyword.serpWeakness,
        keyword.commissionPotential,
        keyword.contentFit,
        keyword.freshness,
        totalScore
      ]
    )
  }
}

async function upsertArticle(input: {
  productId: number
  articleType: 'review' | 'comparison'
  title: string
  slug: string
  summary: string
  keyword: string
  heroImageUrl: string | null
  contentMd: string
  contentHtml: string
  seoTitle: string
  seoDescription: string
  schemaJson: string
}): Promise<number> {
  const db = await getDatabase()
  const existing =
    (await db.queryOne<{ id: number }>(
      'SELECT id FROM articles WHERE product_id = ? AND article_type = ? LIMIT 1',
      [input.productId, input.articleType]
    )) ||
    (await db.queryOne<{ id: number }>(
      'SELECT id FROM articles WHERE slug = ? LIMIT 1',
      [input.slug]
    ))

  if (existing?.id) {
    await db.exec(
      `
        UPDATE articles
        SET product_id = ?, article_type = ?, title = ?, slug = ?, summary = ?, keyword = ?, hero_image_url = ?, content_md = ?, content_html = ?,
            seo_title = ?, seo_description = ?, schema_json = ?, status = 'published', published_at = COALESCE(published_at, CURRENT_TIMESTAMP),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
      [
        input.productId,
        input.articleType,
        input.title,
        input.slug,
        input.summary,
        input.keyword,
        input.heroImageUrl,
        input.contentMd,
        input.contentHtml,
        input.seoTitle,
        input.seoDescription,
        input.schemaJson,
        existing.id
      ]
    )
    return existing.id
  }

  const result = await db.exec(
    `
      INSERT INTO articles (
        product_id, article_type, title, slug, summary, keyword, hero_image_url, content_md, content_html,
        seo_title, seo_description, schema_json, status, published_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'published', CURRENT_TIMESTAMP)
    `,
    [
      input.productId,
      input.articleType,
      input.title,
      input.slug,
      input.summary,
      input.keyword,
      input.heroImageUrl,
      input.contentMd,
      input.contentHtml,
      input.seoTitle,
      input.seoDescription,
      input.schemaJson
    ]
  )
  return Number(result.lastInsertRowid)
}

async function publishSeoPage(
  articleId: number,
  pageType: string,
  pathname: string,
  title: string,
  description: string,
  schemaJson: string,
  heroImageUrl?: string | null
) {
  const db = await getDatabase()
  const payload = buildSeoPagePersistencePayload({
    pageType,
    pathname,
    title,
    description,
    image: heroImageUrl,
    schemaJson
  })
  const existing =
    (await db.queryOne<{ id: number }>('SELECT id FROM seo_pages WHERE article_id = ? LIMIT 1', [articleId])) ||
    (await db.queryOne<{ id: number }>('SELECT id FROM seo_pages WHERE pathname = ? LIMIT 1', [payload.pathname]))
  if (existing?.id) {
    await db.exec(
      `
        UPDATE seo_pages
        SET article_id = ?, page_type = ?, pathname = ?, title = ?, meta_description = ?, canonical_url = ?, open_graph_json = ?, schema_json = ?,
            status = 'published', published_at = COALESCE(published_at, CURRENT_TIMESTAMP),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
      [
        articleId,
        payload.pageType,
        payload.pathname,
        payload.title,
        payload.metaDescription,
        payload.canonicalUrl,
        payload.openGraphJson,
        payload.schemaJson,
        existing.id
      ]
    )
    return existing.id
  }

  const result = await db.exec(
    `
      INSERT INTO seo_pages (article_id, page_type, pathname, title, meta_description, canonical_url, open_graph_json, schema_json, status, published_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'published', CURRENT_TIMESTAMP)
    `,
    [
      articleId,
      payload.pageType,
      payload.pathname,
      payload.title,
      payload.metaDescription,
      payload.canonicalUrl,
      payload.openGraphJson,
      payload.schemaJson
    ]
  )
  return Number(result.lastInsertRowid)
}

async function publishEvent(eventType: string, status: string, payload: unknown, seoPageId?: number | null) {
  const db = await getDatabase()
  await db.exec(
    'INSERT INTO publish_events (seo_page_id, event_type, status, payload_json) VALUES (?, ?, ?, ?)',
    [seoPageId || null, eventType, status, JSON.stringify(payload)]
  )
}

async function loadStoredProductRecord(productId: number): Promise<StoredProductRecord> {
  const db = await getDatabase()
  const product = await db.queryOne<any>(
    `
      SELECT id, slug, brand, product_name AS productName, category, description, price_amount AS priceAmount,
        price_currency AS priceCurrency, rating, review_count AS reviewCount, specs_json, review_highlights_json,
        resolved_url AS resolvedUrl, source_affiliate_link AS sourceAffiliateLink, affiliate_product_id AS affiliateProductId,
        price_last_checked_at AS priceLastCheckedAt, offer_last_checked_at AS offerLastCheckedAt,
        attribute_completeness_score AS attributeCompletenessScore, data_confidence_score AS dataConfidenceScore,
        source_count AS sourceCount
      FROM products
      WHERE id = ?
      LIMIT 1
    `,
    [productId]
  )

  if (!product) {
    throw new Error('Product not found')
  }

  return {
    ...product,
    specs: product.specs_json ? JSON.parse(product.specs_json) : {},
    reviewHighlights: product.review_highlights_json ? JSON.parse(product.review_highlights_json) : []
  }
}

async function loadStoredKeywordIdeas(productId: number): Promise<StoredKeywordIdea[]> {
  const db = await getDatabase()
  return db.query<StoredKeywordIdea>(
    `
      SELECT keyword, buyer_intent AS buyerIntent, serp_weakness AS serpWeakness, commission_potential AS commissionPotential,
        content_fit AS contentFit, freshness, total_score AS totalScore
      FROM keyword_opportunities
      WHERE product_id = ?
      ORDER BY total_score DESC, id DESC
    `,
    [productId]
  )
}

async function loadPrimaryMediaUrl(productId: number): Promise<string | null> {
  const db = await getDatabase()
  const row = await db.queryOne<{ public_url: string }>(
    `
      SELECT public_url
      FROM product_media_assets
      WHERE product_id = ?
      ORDER BY
        CASE asset_role
          WHEN 'hero' THEN 0
          WHEN 'gallery' THEN 1
          ELSE 2
        END,
        id ASC
      LIMIT 1
    `,
    [productId]
  )
  return row?.public_url || null
}

async function loadComparisonAlternatives(productId: number): Promise<ProductRecord[]> {
  const db = await getDatabase()
  const rows = await db.query<any>(
    `
      SELECT id, slug, brand, product_name AS productName, category, description, price_amount AS priceAmount,
        price_currency AS priceCurrency, rating, review_count AS reviewCount, specs_json, review_highlights_json,
        resolved_url AS resolvedUrl, price_last_checked_at AS priceLastCheckedAt, offer_last_checked_at AS offerLastCheckedAt,
        attribute_completeness_score AS attributeCompletenessScore, data_confidence_score AS dataConfidenceScore,
        source_count AS sourceCount
      FROM products
      WHERE id <> ?
      ORDER BY updated_at DESC
      LIMIT 2
    `,
    [productId]
  )

  return rows.map((item) => ({
    ...item,
    specs: item.specs_json ? JSON.parse(item.specs_json) : {},
    reviewHighlights: item.review_highlights_json ? JSON.parse(item.review_highlights_json) : []
  }))
}

function pickPrimaryKeyword(keywordIdeas: StoredKeywordIdea[], fallback: string): string {
  return keywordIdeas[0]?.keyword || fallback
}

function pickSecondaryKeyword(keywordIdeas: StoredKeywordIdea[], fallback: string): string {
  return keywordIdeas[1]?.keyword || keywordIdeas[0]?.keyword || fallback
}

async function buildReviewDraft(
  product: StoredProductRecord,
  heroImageUrl: string | null,
  keywordIdeas: StoredKeywordIdea[]
): Promise<GeneratedArticleDraft> {
  const title = `${product.productName} Review`
  const reviewCopy = await generateReviewCopy(product)
  return {
    articleType: 'review',
    title,
    slug: slugify(`${product.productName} review`),
    summary: reviewCopy.summary,
    keyword: pickPrimaryKeyword(keywordIdeas, `${product.productName} review`),
    heroImageUrl,
    contentMd: reviewCopy.markdown,
    contentHtml: reviewCopy.html
  }
}

async function buildComparisonDraft(
  product: StoredProductRecord,
  heroImageUrl: string | null,
  keywordIdeas: StoredKeywordIdea[]
): Promise<GeneratedArticleDraft> {
  const title = `${product.productName} Alternatives`
  const comparisonCopy = await generateComparisonCopy(product, await loadComparisonAlternatives(product.id))
  return {
    articleType: 'comparison',
    title,
    slug: slugify(`${product.productName} alternatives`),
    summary: comparisonCopy.summary,
    keyword: pickSecondaryKeyword(keywordIdeas, `${product.productName} alternatives`),
    heroImageUrl,
    contentMd: comparisonCopy.markdown,
    contentHtml: comparisonCopy.html
  }
}

async function persistPublishedArticle(
  productId: number,
  draft: GeneratedArticleDraft,
  seo: Awaited<ReturnType<typeof generateSeoPayload>>
): Promise<{ articleId: number; path: string; seoPageId: number }> {
  const articleId = await upsertArticle({
    productId,
    articleType: draft.articleType,
    title: draft.title,
    slug: draft.slug,
    summary: draft.summary,
    keyword: draft.keyword,
    heroImageUrl: draft.heroImageUrl,
    contentMd: draft.contentMd,
    contentHtml: draft.contentHtml,
    seoTitle: seo.seoTitle,
    seoDescription: seo.seoDescription,
    schemaJson: seo.schemaJson
  })
  const path = getArticlePath(draft.articleType, draft.slug)
  const seoPageId = await publishSeoPage(
    articleId,
    draft.articleType,
    path,
    seo.seoTitle,
    seo.seoDescription,
    seo.schemaJson,
    draft.heroImageUrl
  )
  return { articleId, path, seoPageId }
}

function getInternalServiceBaseUrl(): string {
  const port = process.env.PORT || '3000'
  return `http://127.0.0.1:${port}`
}

async function revalidateGeneratedPaths(paths: string[], category: string | null, brand?: string | null) {
  const uniquePaths = Array.from(new Set(paths.filter(Boolean)))
  const brandSlug = getBrandSlug(brand)
  try {
    const response = await fetch(`${getInternalServiceBaseUrl()}/api/internal/revalidate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-bes3-internal-token': process.env.JWT_SECRET || ''
      },
      body: JSON.stringify({ paths: uniquePaths, category, brand })
    })
    if (response.ok) {
      return
    }
  } catch {
    // Fall back to direct revalidation when a request context exists.
  }

  try {
    revalidatePath('/')
    revalidatePath('/brands')
    revalidatePath('/directory')
    if (category) {
      revalidatePath(buildCategoryPath(category))
    }
    if (brandSlug) {
      revalidatePath(`/brands/${brandSlug}`)
    }
    if (brandSlug && category) {
      revalidatePath(buildBrandCategoryPath(brandSlug, category))
    }
    for (const item of uniquePaths) {
      revalidatePath(item)
    }
  } catch (error: any) {
    console.warn('[pipeline] revalidate skipped outside request context:', error?.message || error)
  }
}

async function notifyPublishedPaths(paths: string[], seoPageId?: number | null) {
  const uniquePaths = Array.from(new Set(paths.filter(Boolean)))
  if (uniquePaths.length === 0) return

  await publishEvent('seo.publish', 'success', { paths: uniquePaths }, seoPageId)
  await dispatchSeoNotifications(uniquePaths, seoPageId)
}

async function buildSeoRefreshPayloads(productId: number) {
  const db = await getDatabase()
  const articles = await db.query<any>(
    `
      SELECT id, article_type, title, slug, summary, keyword, hero_image_url, content_md, content_html, status
      FROM articles
      WHERE product_id = ?
      ORDER BY id ASC
    `,
    [productId]
  )

  if (articles.length === 0) {
    throw new Error('No product articles available for SEO refresh')
  }

  const payloads = []
  for (const article of articles) {
    const seo = await generateSeoPayload(article.title, article.summary || article.title)
    payloads.push({
      articleId: Number(article.id),
      articleType: String(article.article_type),
      slug: String(article.slug),
      input: {
        title: String(article.title),
        slug: String(article.slug),
        summary: article.summary ? String(article.summary) : null,
        keyword: article.keyword ? String(article.keyword) : null,
        heroImageUrl: article.hero_image_url ? String(article.hero_image_url) : null,
        contentMd: String(article.content_md),
        contentHtml: String(article.content_html),
        seoTitle: seo.seoTitle,
        seoDescription: seo.seoDescription,
        schemaJson: seo.schemaJson,
        status: article.status === 'draft' ? 'draft' as const : 'published' as const
      }
    })
  }

  return payloads
}

async function applySeoRefreshPayloads(
  payloads: Awaited<ReturnType<typeof buildSeoRefreshPayloads>>
): Promise<{ paths: string[]; seoPageId: number | null; updatedCount: number }> {
  const paths: string[] = []
  let seoPageId: number | null = null

  for (const payload of payloads) {
    const updated = await updateAdminArticle(payload.articleId, payload.input)
    paths.push(getArticlePath(updated.article_type, updated.slug))
    if (seoPageId == null) {
      seoPageId = updated.seo_pages[0]?.id || null
    }
  }

  return {
    paths,
    seoPageId,
    updatedCount: payloads.length
  }
}

export async function cancelPipelineRun(runId: number): Promise<void> {
  const db = await getDatabase()
  const run = await db.queryOne<{ status: PipelineStatus }>(
    'SELECT status FROM content_pipeline_runs WHERE id = ? LIMIT 1',
    [runId]
  )
  if (!run) {
    throw new Error('Pipeline run not found')
  }
  if (!['queued', 'running'].includes(run.status)) {
    throw new Error('Only queued or running pipeline runs can be cancelled')
  }

  if (run.status === 'queued') {
    await db.exec(
      `
        UPDATE content_pipeline_runs
        SET status = 'cancelled',
            current_stage = NULL,
            error_message = ?,
            worker_id = NULL,
            locked_by = NULL,
            locked_at = NULL,
            lock_expires_at = NULL,
            last_heartbeat_at = NULL,
            cancel_requested_at = CURRENT_TIMESTAMP,
            finished_at = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
      [PIPELINE_CANCELLED_MESSAGE, runId]
    )
    await db.exec(
      `
        UPDATE content_pipeline_jobs
        SET status = 'cancelled',
            message = ?,
            finished_at = CURRENT_TIMESTAMP
        WHERE run_id = ? AND finished_at IS NULL
      `,
      [PIPELINE_CANCELLED_MESSAGE, runId]
    )
    return
  }

  await db.exec(
    `
      UPDATE content_pipeline_runs
      SET status = 'cancelled',
          error_message = ?,
          cancel_requested_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `,
    [PIPELINE_CANCEL_REQUESTED_MESSAGE, runId]
  )
}

export async function retryPipelineRun(runId: number): Promise<number> {
  const run = await getQueuedRun(runId)
  if (!run) {
    throw new Error('Pipeline run not found')
  }
  if (!['failed', 'cancelled'].includes(run.status || '')) {
    throw new Error('Only failed or cancelled pipeline runs can be retried')
  }
  if (run.status === 'cancelled' && !run.finished_at) {
    throw new Error('Cancelled pipeline run is still shutting down')
  }

  const nextRunId = await createRun({
    sourceLink: run.source_link,
    affiliateProductId: run.affiliate_product_id,
    productId: run.product_id,
    runType: run.run_type,
    requestedAction: run.requested_action
  })
  await startPipelineWorker()
  return nextRunId
}

export async function runProductWorkspaceAction(productId: number, action: ProductWorkspaceAction): Promise<number> {
  const product = await loadStoredProductRecord(productId)
  const runId = await createRun({
    sourceLink: product.sourceAffiliateLink,
    affiliateProductId: product.affiliateProductId,
    productId,
    runType: 'workspaceAction',
    requestedAction: action
  })
  await startPipelineWorker()
  return runId
}

async function executeProductWorkspaceActionRun(
  runId: number,
  productId: number,
  action: ProductWorkspaceAction,
  workerId: string
): Promise<void> {
  try {
    await assertRunNotCancelled(runId)
    const product = await loadStoredProductRecord(productId)
    let keywordIdeas = await loadStoredKeywordIdeas(productId)
    const heroImageUrl = await loadPrimaryMediaUrl(productId)

    const mineKeywordsStage = async () => {
      await assertRunNotCancelled(runId)
      const jobId = await createJob(runId, 'mineKeywords')
      await markRun(runId, 'running', 'mineKeywords')
      const generated = await generateKeywordIdeas(product)
      await assertRunNotCancelled(runId)
      await saveKeywords(productId, generated)
      keywordIdeas = await loadStoredKeywordIdeas(productId)
      await finishJob(jobId, 'completed', 'Keyword opportunities regenerated', { total: keywordIdeas.length })
    }

    const runArticleStage = async (articleAction: 'review' | 'comparison') => {
      await assertRunNotCancelled(runId)
      const articleStage: PipelineStage =
        articleAction === 'review' ? 'generateReviewArticle' : 'generateComparisonArticle'
      const articleJobId = await createJob(runId, articleStage)
      await markRun(runId, 'running', articleStage)
      const draft =
        articleAction === 'review'
          ? await buildReviewDraft(product, heroImageUrl, keywordIdeas)
          : await buildComparisonDraft(product, heroImageUrl, keywordIdeas)
      await assertRunNotCancelled(runId)
      await finishJob(articleJobId, 'completed', `${draft.title} drafted`, { slug: draft.slug, keyword: draft.keyword })

      await assertRunNotCancelled(runId)
      const seoJobId = await createJob(runId, 'generateSeoPayload')
      await markRun(runId, 'running', 'generateSeoPayload')
      const seo = await generateSeoPayload(draft.title, draft.summary)
      await assertRunNotCancelled(runId)
      await finishJob(seoJobId, 'completed', `SEO payload generated for ${draft.title}`, {
        seoTitle: seo.seoTitle
      })

      await assertRunNotCancelled(runId)
      const publishJobId = await createJob(runId, 'publishPages')
      await markRun(runId, 'running', 'publishPages')
      const publication = await persistPublishedArticle(productId, draft, seo)
      await assertRunNotCancelled(runId)
      await finishJob(publishJobId, 'completed', `${draft.title} published`, publication)

      await assertRunNotCancelled(runId)
      const revalidateJobId = await createJob(runId, 'revalidateAndSitemap')
      await markRun(runId, 'running', 'revalidateAndSitemap')
      await revalidateGeneratedPaths([publication.path], product.category, product.brand)
      await assertRunNotCancelled(runId)
      await finishJob(revalidateJobId, 'completed', 'Public paths revalidated', { paths: [publication.path] })

      await assertRunNotCancelled(runId)
      const pingJobId = await createJob(runId, 'pingAndIndexing')
      await markRun(runId, 'running', 'pingAndIndexing')
      await notifyPublishedPaths([publication.path], publication.seoPageId)
      await assertRunNotCancelled(runId)
      await finishJob(pingJobId, 'completed', 'SEO notifications dispatched', { paths: [publication.path] })
    }

    const refreshSeoStage = async () => {
      await assertRunNotCancelled(runId)
      const seoJobId = await createJob(runId, 'generateSeoPayload')
      await markRun(runId, 'running', 'generateSeoPayload')
      const seoPayloads = await buildSeoRefreshPayloads(productId)
      await assertRunNotCancelled(runId)
      await finishJob(seoJobId, 'completed', 'SEO payloads regenerated for product articles', {
        total: seoPayloads.length
      })

      await assertRunNotCancelled(runId)
      const publishJobId = await createJob(runId, 'publishPages')
      await markRun(runId, 'running', 'publishPages')
      const refreshed = await applySeoRefreshPayloads(seoPayloads)
      await assertRunNotCancelled(runId)
      await finishJob(publishJobId, 'completed', 'SEO pages synchronized with current article content', {
        total: refreshed.updatedCount
      })

      await assertRunNotCancelled(runId)
      const revalidateJobId = await createJob(runId, 'revalidateAndSitemap')
      await markRun(runId, 'running', 'revalidateAndSitemap')
      await revalidateGeneratedPaths(refreshed.paths, product.category, product.brand)
      await assertRunNotCancelled(runId)
      await finishJob(revalidateJobId, 'completed', 'Public paths revalidated', { paths: refreshed.paths })

      await assertRunNotCancelled(runId)
      const pingJobId = await createJob(runId, 'pingAndIndexing')
      await markRun(runId, 'running', 'pingAndIndexing')
      await notifyPublishedPaths(refreshed.paths, refreshed.seoPageId)
      await assertRunNotCancelled(runId)
      await finishJob(pingJobId, 'completed', 'SEO notifications dispatched', { paths: refreshed.paths })
    }

    if (action === 'contentPack' || action === 'mineKeywords') {
      await mineKeywordsStage()
    }
    if (action === 'contentPack' || action === 'generateReview') {
      await runArticleStage('review')
    }
    if (action === 'contentPack' || action === 'generateComparison') {
      await runArticleStage('comparison')
    }
    if (action === 'refreshSeo') {
      await refreshSeoStage()
    }

    await markRun(runId, 'completed', null, null, { workerId: null, finished: true })
  } catch (error: any) {
    const message = error?.message || 'Workspace action failed'
    if (isPipelineCancelledError(error)) {
      await markRun(runId, 'cancelled', null, message, { workerId: null, finished: true })
      await finalizeLastRunningJob(runId, 'cancelled', message)
      return
    }

    await markRun(runId, 'failed', null, message, { workerId: null, finished: true })
    await finalizeLastRunningJob(runId, 'failed', message, { stack: error?.stack || null })
    throw error
  }
}

export async function listPipelineRuns(): Promise<PipelineRunListItem[]> {
  const db = await getDatabase()
  return db.query<PipelineRunListItem>(
    `
      SELECT r.id, r.product_id, r.affiliate_product_id, r.run_type, r.requested_action, r.status, r.current_stage,
        r.error_message, r.source_link, r.worker_id, r.started_at, r.finished_at, r.attempt_count,
        r.priority, r.scheduled_at, r.locked_by, r.lock_expires_at, r.last_heartbeat_at, r.cancel_requested_at,
        r.created_at, r.updated_at,
        COALESCE(p.product_name, ap.product_name) AS product_name, p.slug
      FROM content_pipeline_runs r
      LEFT JOIN products p ON p.id = r.product_id
      LEFT JOIN affiliate_products ap ON ap.id = r.affiliate_product_id
      ORDER BY r.updated_at DESC, r.id DESC
    `
  )
}

export async function getPipelineRun(runId: number): Promise<PipelineRunDetailItem | null> {
  const db = await getDatabase()
  const run = await db.queryOne<PipelineRunListItem>(
    `
      SELECT r.id, r.product_id, r.affiliate_product_id, r.run_type, r.requested_action, r.status, r.current_stage,
        r.error_message, r.source_link, r.worker_id, r.started_at, r.finished_at, r.attempt_count,
        r.priority, r.scheduled_at, r.locked_by, r.lock_expires_at, r.last_heartbeat_at, r.cancel_requested_at,
        r.created_at, r.updated_at,
        COALESCE(p.product_name, ap.product_name) AS product_name, p.slug
      FROM content_pipeline_runs r
      LEFT JOIN products p ON p.id = r.product_id
      LEFT JOIN affiliate_products ap ON ap.id = r.affiliate_product_id
      WHERE r.id = ?
      LIMIT 1
    `,
    [runId]
  )

  if (!run) return null

  const jobs = await db.query<PipelineRunDetailItem['jobs'][number]>(
    `
      SELECT id, stage, status, message, payload_json, started_at, finished_at
      FROM content_pipeline_jobs
      WHERE run_id = ?
      ORDER BY id ASC
    `,
    [runId]
  )
  return { ...run, jobs }
}

export async function listPipelineOperations(): Promise<PipelineOperationsSnapshot> {
  const db = await getDatabase()
  await ensureDefaultPipelineQueueConfig()
  const staleBefore = secondsAgo(PIPELINE_WORKER_STALE_SECONDS)
  const expiredBefore = toDatabaseTimestamp()

  const [workers, queues, staleRunning, expiredLocks] = await Promise.all([
    db.query<PipelineOperationsSnapshot['workers'][number]>(
      `
        SELECT worker_id, worker_type, hostname, pid, status, current_run_id, last_seen_at, started_at, metadata_json
        FROM worker_heartbeats
        WHERE worker_type = 'pipeline'
        ORDER BY last_seen_at DESC, worker_id ASC
      `
    ),
    db.query<PipelineOperationsSnapshot['queues'][number]>(
      `
        SELECT q.task_type, q.enabled, q.priority, q.max_concurrency, q.timeout_seconds, q.max_attempts,
          q.backoff_policy_json,
          COALESCE(SUM(CASE WHEN r.status = 'queued' THEN 1 ELSE 0 END), 0) AS queued,
          COALESCE(SUM(CASE WHEN r.status = 'running' THEN 1 ELSE 0 END), 0) AS running,
          COALESCE(SUM(CASE WHEN r.status = 'failed' THEN 1 ELSE 0 END), 0) AS failed
        FROM pipeline_queue_config q
        LEFT JOIN content_pipeline_runs r ON r.run_type = q.task_type
        GROUP BY q.task_type, q.enabled, q.priority, q.max_concurrency, q.timeout_seconds, q.max_attempts, q.backoff_policy_json
        ORDER BY q.priority ASC, q.task_type ASC
      `
    ),
    db.queryOne<{ count: number }>(
      `
        SELECT COUNT(*) AS count
        FROM content_pipeline_runs
        WHERE status = 'running'
          AND finished_at IS NULL
          AND (last_heartbeat_at IS NULL OR last_heartbeat_at <= ?)
      `,
      [staleBefore]
    ),
    db.queryOne<{ count: number }>(
      `
        SELECT COUNT(*) AS count
        FROM content_pipeline_runs
        WHERE status = 'running'
          AND finished_at IS NULL
          AND lock_expires_at IS NOT NULL
          AND lock_expires_at <= ?
      `,
      [expiredBefore]
    )
  ])

  return {
    runtime: getPipelineWorkerRuntimeConfig(),
    workers,
    queues: queues.map((queue) => ({
      ...queue,
      queued: Number(queue.queued),
      running: Number(queue.running),
      failed: Number(queue.failed)
    })),
    staleRunningCount: Number(staleRunning?.count || 0),
    expiredLockCount: Number(expiredLocks?.count || 0)
  }
}

export async function runPipelineForAffiliateProduct(affiliateProductId: number): Promise<number> {
  const affiliateProduct = await getAffiliateProductById(affiliateProductId)
  if (!affiliateProduct) throw new Error('Affiliate product not found')
  const sourceLink = affiliateProduct.short_promo_link || affiliateProduct.promo_link || affiliateProduct.product_url
  if (!sourceLink) throw new Error('Affiliate product has no available link')
  const productId = await findProductIdByAffiliateProductId(affiliateProductId)
  const runId = await createRun({
    sourceLink,
    affiliateProductId,
    productId,
    runType: 'fullPipeline'
  })
  await startPipelineWorker()
  return runId
}

export async function runPipelineFromLink(sourceLink: string, hints: ProductAcquisitionHints = {}): Promise<number> {
  const affiliateProductId = await upsertManualAffiliateLink(sourceLink, hints)
  const productId = await findProductIdByAffiliateProductId(affiliateProductId)
  const runId = await createRun({
    sourceLink,
    affiliateProductId,
    productId,
    runType: 'fullPipeline'
  })
  await startPipelineWorker()
  return runId
}

export async function runDeepProductScrapeFromLink(sourceLink: string, hints: ProductAcquisitionHints = {}): Promise<number> {
  const affiliateProductId = await upsertManualAffiliateLink(sourceLink, hints)
  const productId = await findProductIdByAffiliateProductId(affiliateProductId)
  const runId = await createRun({
    sourceLink,
    affiliateProductId,
    productId,
    runType: 'deepProductScrape'
  })
  await startPipelineWorker()
  return runId
}

async function executeFullPipelineRun(
  runId: number,
  sourceLink: string,
  affiliateProductId: number | null,
  workerId: string
): Promise<void> {
  let productId: number | null = null

  try {
    await assertRunNotCancelled(runId)
    const affiliateProduct = affiliateProductId ? await getAffiliateProductById(affiliateProductId) : null
    const sourcePlatform = affiliateProduct?.platform || 'manual'
    const sourceCountryCode = affiliateProduct?.country_code || 'US'

    await assertRunNotCancelled(runId)
    const scrapeJob = await createJob(runId, 'deepBrowserScrape')
    await markRun(runId, 'running', 'deepBrowserScrape')
    const deepScrape = await runDeepProductScrapeTask({
      runId,
      sourceLink,
      affiliateProductId,
      productId,
      countryCode: sourceCountryCode
    })
    const resolved = {
      finalUrl: deepScrape.finalUrl,
      landingHtml: deepScrape.landingHtml,
      redirectTrail: deepScrape.redirectTrail
    }
    const scraped = mergeAffiliateFallbackIntoScrape(affiliateProduct, deepScrape.scraped)
    await assertRunNotCancelled(runId)
    await finishJob(scrapeJob, 'completed', 'Deep browser product page scraped', {
      taskId: deepScrape.taskId,
      productName: scraped.productName,
      imageCount: scraped.imageUrls.length,
      browserUsed: deepScrape.browserUsed,
      fallbackUsed: deepScrape.fallbackUsed,
      confidence: scraped.dataConfidenceScore
    })

    await assertRunNotCancelled(runId)
    const mediaJob = await createJob(runId, 'persistMediaAssets')
    await markRun(runId, 'running', 'persistMediaAssets')
    productId = await ensureProductShell({
      affiliateProductId,
      sourcePlatform,
      sourceLink,
      finalUrl: resolved.finalUrl,
      productName: scraped.productName,
      brand: scraped.brand,
      productModel: scraped.productModel,
      modelNumber: scraped.modelNumber,
      productType: scraped.productType,
      category: scraped.category,
      categorySlug: scraped.categorySlug,
      youtubeMatchTerms: scraped.youtubeMatchTerms
    })
    const persistedMediaUrls: string[] = []
    for (const [index, imageUrl] of scraped.imageUrls.slice(0, 6).entries()) {
      await assertRunNotCancelled(runId)
      try {
        const assetRole = index === 0 ? 'hero' : 'gallery'
        const publicUrl = await persistMediaAsset({ productId, sourceUrl: imageUrl, assetRole, index, countryCode: sourceCountryCode })
        persistedMediaUrls.push(publicUrl)
      } catch (error: any) {
        persistedMediaUrls.push(imageUrl)
        await publishEvent('media.persist.warning', 'warning', { imageUrl, error: error?.message || String(error) })
      }
    }
    for (const [index, imageUrl] of scraped.reviewImageUrls.slice(0, 6).entries()) {
      await assertRunNotCancelled(runId)
      try {
        await persistMediaAsset({ productId, sourceUrl: imageUrl, assetRole: 'review', index, countryCode: sourceCountryCode })
      } catch {
        // Review images are best effort.
      }
    }
    await assertRunNotCancelled(runId)
    await finishJob(mediaJob, 'completed', 'Media persisted', { persistedMediaUrls })

    await assertRunNotCancelled(runId)
    const normalizeJob = await createJob(runId, 'normalizeProduct')
    await markRun(runId, 'running', 'normalizeProduct')
    await updateProductFromScrape(productId, scraped)
    await persistProductGraphFromScrape(productId, scraped)
    await assertRunNotCancelled(runId)
    await finishJob(normalizeJob, 'completed', 'Product normalized', { productId })

    const db = await getDatabase()
    const product = await db.queryOne<any>(
      `
        SELECT id, slug, brand, product_name AS productName, category, description, price_amount AS priceAmount,
          price_currency AS priceCurrency, rating, review_count AS reviewCount, specs_json, review_highlights_json,
          resolved_url AS resolvedUrl, price_last_checked_at AS priceLastCheckedAt, offer_last_checked_at AS offerLastCheckedAt,
          attribute_completeness_score AS attributeCompletenessScore, data_confidence_score AS dataConfidenceScore,
          source_count AS sourceCount
        FROM products WHERE id = ? LIMIT 1
      `,
      [productId]
    )
    if (!product) throw new Error('Normalized product not found')
    product.specs = product.specs_json ? JSON.parse(product.specs_json) : {}
    product.reviewHighlights = product.review_highlights_json ? JSON.parse(product.review_highlights_json) : []

    await assertRunNotCancelled(runId)
    const keywordsJob = await createJob(runId, 'mineKeywords')
    await markRun(runId, 'running', 'mineKeywords')
    const keywordIdeas = await generateKeywordIdeas(product)
    await assertRunNotCancelled(runId)
    await saveKeywords(productId, keywordIdeas)
    await finishJob(keywordsJob, 'completed', 'Keyword opportunities generated', { total: keywordIdeas.length })

    await assertRunNotCancelled(runId)
    const reviewJob = await createJob(runId, 'generateReviewArticle')
    await markRun(runId, 'running', 'generateReviewArticle')
    const reviewCopy = await generateReviewCopy(product)
    const reviewSeo = await generateSeoPayload(`${product.productName} Review`, reviewCopy.summary)
    await assertRunNotCancelled(runId)
    const reviewArticleId = await upsertArticle({
      productId,
      articleType: 'review',
      title: `${product.productName} Review`,
      slug: slugify(`${product.productName} review`),
      summary: reviewCopy.summary,
      keyword: keywordIdeas[0]?.keyword || `${product.productName} review`,
      heroImageUrl: persistedMediaUrls[0] || null,
      contentMd: reviewCopy.markdown,
      contentHtml: reviewCopy.html,
      seoTitle: reviewSeo.seoTitle,
      seoDescription: reviewSeo.seoDescription,
      schemaJson: reviewSeo.schemaJson
    })
    await assertRunNotCancelled(runId)
    await finishJob(reviewJob, 'completed', 'Review article generated', { articleId: reviewArticleId })

    await assertRunNotCancelled(runId)
    const comparisonJob = await createJob(runId, 'generateComparisonArticle')
    await markRun(runId, 'running', 'generateComparisonArticle')
    const allProducts = await db.query<any>(
      'SELECT id, slug, brand, product_name AS productName, category, description, price_amount AS priceAmount, price_currency AS priceCurrency, rating, review_count AS reviewCount, specs_json, review_highlights_json, resolved_url AS resolvedUrl, price_last_checked_at AS priceLastCheckedAt, offer_last_checked_at AS offerLastCheckedAt, attribute_completeness_score AS attributeCompletenessScore, data_confidence_score AS dataConfidenceScore, source_count AS sourceCount FROM products WHERE id <> ? ORDER BY updated_at DESC LIMIT 2',
      [productId]
    )
    const alternatives = allProducts.map((item) => ({
      ...item,
      specs: item.specs_json ? JSON.parse(item.specs_json) : {},
      reviewHighlights: item.review_highlights_json ? JSON.parse(item.review_highlights_json) : []
    }))
    const comparisonCopy = await generateComparisonCopy(product, alternatives)
    const comparisonSeo = await generateSeoPayload(`${product.productName} Alternatives`, comparisonCopy.summary)
    await assertRunNotCancelled(runId)
    const comparisonArticleId = await upsertArticle({
      productId,
      articleType: 'comparison',
      title: `${product.productName} Alternatives`,
      slug: slugify(`${product.productName} alternatives`),
      summary: comparisonCopy.summary,
      keyword: keywordIdeas[1]?.keyword || `${product.productName} alternatives`,
      heroImageUrl: persistedMediaUrls[0] || null,
      contentMd: comparisonCopy.markdown,
      contentHtml: comparisonCopy.html,
      seoTitle: comparisonSeo.seoTitle,
      seoDescription: comparisonSeo.seoDescription,
      schemaJson: comparisonSeo.schemaJson
    })
    await assertRunNotCancelled(runId)
    await finishJob(comparisonJob, 'completed', 'Comparison article generated', { articleId: comparisonArticleId })

    await assertRunNotCancelled(runId)
    const seoJob = await createJob(runId, 'generateSeoPayload')
    await markRun(runId, 'running', 'generateSeoPayload')
    await assertRunNotCancelled(runId)
    await finishJob(seoJob, 'completed', 'SEO payload attached', { reviewArticleId, comparisonArticleId })

    await assertRunNotCancelled(runId)
    const publishJob = await createJob(runId, 'publishPages')
    await markRun(runId, 'running', 'publishPages')
    const reviewPath = `/reviews/${slugify(`${product.productName} review`)}`
    const comparisonPath = `/compare/${slugify(`${product.productName} alternatives`)}`
    const reviewSeoPageId = await publishSeoPage(
      reviewArticleId,
      'review',
      reviewPath,
      reviewSeo.seoTitle,
      reviewSeo.seoDescription,
      reviewSeo.schemaJson,
      persistedMediaUrls[0] || null
    )
    const comparisonSeoPageId = await publishSeoPage(
      comparisonArticleId,
      'comparison',
      comparisonPath,
      comparisonSeo.seoTitle,
      comparisonSeo.seoDescription,
      comparisonSeo.schemaJson,
      persistedMediaUrls[0] || null
    )
    await assertRunNotCancelled(runId)
    await finishJob(publishJob, 'completed', 'SEO pages published', { reviewSeoPageId, comparisonSeoPageId })

    await assertRunNotCancelled(runId)
    const revalidateJob = await createJob(runId, 'revalidateAndSitemap')
    await markRun(runId, 'running', 'revalidateAndSitemap')
    await revalidateGeneratedPaths([reviewPath, comparisonPath], product.category || null, product.brand)
    await assertRunNotCancelled(runId)
    await finishJob(revalidateJob, 'completed', 'Paths revalidated', { paths: [reviewPath, comparisonPath] })

    await assertRunNotCancelled(runId)
    const pingJob = await createJob(runId, 'pingAndIndexing')
    await markRun(runId, 'running', 'pingAndIndexing')
    await publishEvent('seo.publish', 'success', { reviewPath, comparisonPath }, reviewSeoPageId)
    await dispatchSeoNotifications([reviewPath, comparisonPath], reviewSeoPageId)
    await assertRunNotCancelled(runId)
    await finishJob(pingJob, 'completed', 'Ping/indexing completed')

    await markRun(runId, 'completed', null, null, { workerId: null, finished: true })
    await dbUpdateRunProductId(runId, productId)
  } catch (error: any) {
    const message = error?.message || 'Pipeline failed'
    if (isPipelineCancelledError(error)) {
      await markRun(runId, 'cancelled', null, message, { workerId: null, finished: true })
      await finalizeLastRunningJob(runId, 'cancelled', message)
      return
    }

    await markRun(runId, 'failed', null, message, { workerId: null, finished: true })
    await finalizeLastRunningJob(runId, 'failed', message, { stack: error?.stack || null })
    throw error
  }
}

async function executeDeepProductScrapeRun(
  runId: number,
  sourceLink: string,
  affiliateProductId: number | null,
  workerId: string
): Promise<void> {
  let productId: number | null = null

  try {
    await assertRunNotCancelled(runId)
    const affiliateProduct = affiliateProductId ? await getAffiliateProductById(affiliateProductId) : null
    const sourcePlatform = affiliateProduct?.platform || 'manual'
    const sourceCountryCode = affiliateProduct?.country_code || 'US'

    const scrapeJob = await createJob(runId, 'deepBrowserScrape')
    await markRun(runId, 'running', 'deepBrowserScrape')
    const deepScrape = await runDeepProductScrapeTask({
      runId,
      sourceLink,
      affiliateProductId,
      productId,
      countryCode: sourceCountryCode
    })
    const scraped = mergeAffiliateFallbackIntoScrape(affiliateProduct, deepScrape.scraped)
    await assertRunNotCancelled(runId)
    await finishJob(scrapeJob, 'completed', 'Deep browser product facts captured', {
      taskId: deepScrape.taskId,
      finalUrl: deepScrape.finalUrl,
      browserUsed: deepScrape.browserUsed,
      fallbackUsed: deepScrape.fallbackUsed,
      imageCount: scraped.imageUrls.length,
      offerCount: scraped.offers.length
    })

    await assertRunNotCancelled(runId)
    const mediaJob = await createJob(runId, 'persistMediaAssets')
    await markRun(runId, 'running', 'persistMediaAssets')
    productId = await ensureProductShell({
      affiliateProductId,
      sourcePlatform,
      sourceLink,
      finalUrl: deepScrape.finalUrl,
      productName: scraped.productName,
      brand: scraped.brand,
      productModel: scraped.productModel,
      modelNumber: scraped.modelNumber,
      productType: scraped.productType,
      category: scraped.category,
      categorySlug: scraped.categorySlug,
      youtubeMatchTerms: scraped.youtubeMatchTerms
    })
    const persistedMediaUrls: string[] = []
    for (const [index, imageUrl] of scraped.imageUrls.slice(0, 6).entries()) {
      await assertRunNotCancelled(runId)
      try {
        const assetRole = index === 0 ? 'hero' : 'gallery'
        const publicUrl = await persistMediaAsset({ productId, sourceUrl: imageUrl, assetRole, index, countryCode: sourceCountryCode })
        persistedMediaUrls.push(publicUrl)
      } catch (error: any) {
        persistedMediaUrls.push(imageUrl)
        await publishEvent('media.persist.warning', 'warning', { imageUrl, error: error?.message || String(error) })
      }
    }
    await finishJob(mediaJob, 'completed', 'Deep scrape media persisted', { persistedMediaUrls })

    await assertRunNotCancelled(runId)
    const normalizeJob = await createJob(runId, 'normalizeProduct')
    await markRun(runId, 'running', 'normalizeProduct')
    await updateProductFromScrape(productId, scraped)
    await persistProductGraphFromScrape(productId, scraped)
    await assertRunNotCancelled(runId)
    await finishJob(normalizeJob, 'completed', 'Deep scrape product graph normalized', { productId })

    await markRun(runId, 'completed', null, null, { workerId: null, finished: true })
    await dbUpdateRunProductId(runId, productId)
  } catch (error: any) {
    const message = error?.message || 'Deep product scrape failed'
    if (isPipelineCancelledError(error)) {
      await markRun(runId, 'cancelled', null, message, { workerId: null, finished: true })
      await finalizeLastRunningJob(runId, 'cancelled', message)
      return
    }

    await markRun(runId, 'failed', null, message, { workerId: null, finished: true })
    await finalizeLastRunningJob(runId, 'failed', message, { stack: error?.stack || null })
    throw error
  }
}

async function dbUpdateRunProductId(runId: number, productId: number): Promise<void> {
  const db = await getDatabase()
  await db.exec('UPDATE content_pipeline_runs SET product_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [productId, runId])
  await db.exec('UPDATE product_scrape_tasks SET product_id = ?, updated_at = CURRENT_TIMESTAMP WHERE run_id = ?', [productId, runId])
}

export async function batchRunPipelines(ids: number[]): Promise<number[]> {
  const runs: number[] = []
  for (const id of ids) {
    runs.push(await runPipelineForAffiliateProduct(id))
  }
  return runs
}

export async function rescrapeProductMedia(productId: number): Promise<void> {
  const db = await getDatabase()
  const product = await db.queryOne<any>('SELECT source_affiliate_link, affiliate_product_id FROM products WHERE id = ? LIMIT 1', [productId])
  if (!product?.source_affiliate_link) throw new Error('Product source link missing')
  const runId = await createRun({
    sourceLink: product.source_affiliate_link,
    affiliateProductId: product.affiliate_product_id || null,
    productId,
    runType: 'deepProductScrape'
  })
  const deepScrape = await runDeepProductScrapeTask({
    runId,
    sourceLink: product.source_affiliate_link,
    affiliateProductId: product.affiliate_product_id || null,
    productId
  })
  const scraped = deepScrape.scraped
  await db.exec('DELETE FROM product_media_assets WHERE product_id = ?', [productId])
  for (const [index, imageUrl] of scraped.imageUrls.slice(0, 6).entries()) {
    await persistMediaAsset({
      productId,
      sourceUrl: imageUrl,
      assetRole: index === 0 ? 'hero' : 'gallery',
      index
    })
  }
}

function getCommerceFreshnessBucket(value: string | null | undefined): 'fresh' | 'recent' | 'stale' | 'unknown' {
  if (!value) return 'unknown'

  const parsed = Date.parse(value)
  if (!Number.isFinite(parsed)) return 'unknown'

  const deltaMs = Date.now() - parsed
  if (deltaMs <= 36 * 60 * 60 * 1000) return 'fresh'
  if (deltaMs <= 7 * 24 * 60 * 60 * 1000) return 'recent'
  return 'stale'
}

function getCompletenessBucket(value: number): 'high' | 'medium' | 'low' {
  if (value >= 0.8) return 'high'
  if (value >= 0.5) return 'medium'
  return 'low'
}

export async function getAdminDashboardSummary(): Promise<AdminDashboardSummary> {
  const db = await getDatabase()
  const [products, affiliateProducts, articles, runs, recentRuns, recentAffiliateProducts, siteProducts, publishedArticles, brands, newsletterSubscribers, targetedSubscribers, merchantClicks, decisionFunnel, offerCountRows, evidenceCountRows, priceHistoryCountRows, merchantClickRows, brandPolicyRows, compatibilityFactRows] = await Promise.all([
    db.queryOne<{ count: number }>('SELECT COUNT(*) AS count FROM products'),
    db.queryOne<{ count: number }>('SELECT COUNT(*) AS count FROM affiliate_products'),
    db.queryOne<{ count: number }>('SELECT COUNT(*) AS count FROM articles'),
    db.queryOne<{ count: number }>('SELECT COUNT(*) AS count FROM content_pipeline_runs'),
    listPipelineRuns(),
    listAffiliateProducts(),
    listProducts(),
    listPublishedArticles(),
    listBrands(),
    db.queryOne<{ count: number }>('SELECT COUNT(*) AS count FROM newsletter_subscribers'),
    db.queryOne<{ count: number }>(
      `
        SELECT COUNT(*) AS count
        FROM newsletter_subscribers
        WHERE source <> 'site'
           OR (intent <> 'offers' AND intent <> 'deals')
           OR cadence <> 'weekly'
           OR category_slug IS NOT NULL
      `
    ),
    getMerchantClickSummary(),
    getDecisionFunnelSummary(),
    db.query<{ product_id: number; count: number }>(
      `
        SELECT product_id, COUNT(*) AS count
        FROM product_offers
        GROUP BY product_id
      `
    ),
    db.query<{ product_id: number; count: number }>(
      `
        SELECT product_id, COUNT(*) AS count
        FROM product_attribute_facts
        GROUP BY product_id
      `
    ),
    db.query<{ product_id: number; count: number }>(
      `
        SELECT product_id, COUNT(*) AS count
        FROM product_price_history
        GROUP BY product_id
      `
    ),
    db.query<{ product_id: number | null; created_at: string | null }>(
      `
        SELECT product_id, created_at
        FROM merchant_click_events
        WHERE product_id IS NOT NULL
      `
    ),
    db.query<{ brand_slug: string }>(
      `
        SELECT brand_slug
        FROM brand_policies
      `
    ),
    db.query<{ brand_slug: string; count: number }>(
      `
        SELECT brand_slug, COUNT(*) AS count
        FROM compatibility_facts
        GROUP BY brand_slug
      `
    )
  ])

  const staleArticles = publishedArticles
    .map((article) => {
      const lastReviewedAt = article.updatedAt || article.publishedAt || article.createdAt || null
      const ageDays = lastReviewedAt ? Math.max(0, Math.floor((Date.now() - new Date(lastReviewedAt).getTime()) / 86_400_000)) : 999
      return {
        id: article.id,
        slug: article.slug,
        title: article.title,
        type: article.type,
        ageDays,
        lastReviewedAt
      }
    })
    .filter((article) => article.ageDays >= 30)
    .sort((left, right) => right.ageDays - left.ageDays)

  const productsMissingHero = siteProducts.filter((product) => !product.heroImageUrl).length
  const productsMissingCategory = siteProducts.filter((product) => !product.category).length
  const productsWithLivePrice = siteProducts.filter((product) => product.priceAmount !== null && (product.resolvedUrl || product.sourceAffiliateLink)).length
  const articlesMissingVisual = publishedArticles.filter((article) => !article.heroImageUrl && !article.product?.heroImageUrl).length
  const offerCounts = new Map(offerCountRows.map((row) => [row.product_id, Number(row.count || 0)]))
  const evidenceCounts = new Map(evidenceCountRows.map((row) => [row.product_id, Number(row.count || 0)]))
  const priceHistoryCounts = new Map(priceHistoryCountRows.map((row) => [row.product_id, Number(row.count || 0)]))
  const merchantClickThreshold = Date.now() - 30 * 86_400_000
  const recentMerchantClicks = merchantClickRows.reduce((result, row) => {
    if (!row.product_id) return result
    if (!row.created_at) return result

    const timestamp = Date.parse(row.created_at)
    if (!Number.isFinite(timestamp) || timestamp < merchantClickThreshold) return result

    result.set(row.product_id, (result.get(row.product_id) || 0) + 1)
    return result
  }, new Map<number, number>())

  const commerceProducts = siteProducts.map((product) => {
    const offerCount = offerCounts.get(product.id) || 0
    const evidenceCount = evidenceCounts.get(product.id) || 0
    const priceHistoryCount = priceHistoryCounts.get(product.id) || 0
    const freshness = getCommerceFreshnessBucket(product.offerLastCheckedAt || product.priceLastCheckedAt)
    const recentClicks = recentMerchantClicks.get(product.id) || 0
    const confidencePenalty = Math.round((1 - Number(product.dataConfidenceScore || 0)) * 35)
    const completenessPenalty = Math.round((1 - Number(product.attributeCompletenessScore || 0)) * 25)
    const freshnessPenalty = freshness === 'stale' ? 18 : freshness === 'unknown' ? 14 : freshness === 'recent' ? 4 : 0
    const offerPenalty = offerCount === 0 ? 24 : offerCount === 1 ? 12 : 0
    const evidencePenalty = evidenceCount === 0 ? 20 : evidenceCount < 3 ? 8 : 0
    const priceHistoryPenalty = priceHistoryCount === 0 ? 16 : priceHistoryCount < 4 ? 7 : 0
    const demandBonus = recentClicks * 8
    const commercialBonus = product.resolvedUrl || product.sourceAffiliateLink ? 8 : 0
    const priorityScore =
      confidencePenalty +
      completenessPenalty +
      freshnessPenalty +
      offerPenalty +
      evidencePenalty +
      priceHistoryPenalty +
      demandBonus +
      commercialBonus

    const reasons = []
    if (recentClicks > 0) reasons.push(`${recentClicks} merchant click${recentClicks === 1 ? '' : 's'} in the last 30 days`)
    if (freshness === 'stale') reasons.push('Offer freshness is stale')
    if (freshness === 'unknown') reasons.push('Offer freshness has not been established yet')
    if (offerCount === 0) reasons.push('No tracked offers')
    if (offerCount === 1) reasons.push('Only one tracked offer')
    if (evidenceCount === 0) reasons.push('No attribute evidence')
    if (evidenceCount > 0 && evidenceCount < 3) reasons.push('Thin evidence coverage')
    if (priceHistoryCount === 0) reasons.push('No price history')
    if (priceHistoryCount > 0 && priceHistoryCount < 4) reasons.push('Thin price history')
    if (Number(product.dataConfidenceScore || 0) < 0.6) reasons.push('Low confidence score')
    if (Number(product.attributeCompletenessScore || 0) < 0.5) reasons.push('Low attribute completeness')

    return {
      id: product.id,
      slug: product.slug,
      productName: product.productName,
      brand: product.brand,
      category: product.category,
      priorityScore,
      freshness,
      recentMerchantClicks: recentClicks,
      offerCount,
      evidenceCount,
      priceHistoryCount,
      dataConfidenceScore: Number(product.dataConfidenceScore || 0),
      attributeCompletenessScore: Number(product.attributeCompletenessScore || 0),
      reasons: reasons.slice(0, 4)
    }
  })

  const freshnessDistribution = commerceProducts.reduce(
    (result, product) => {
      result[product.freshness] += 1
      return result
    },
    { fresh: 0, recent: 0, stale: 0, unknown: 0 }
  )

  const completenessDistribution = commerceProducts.reduce(
    (result, product) => {
      result[getCompletenessBucket(product.attributeCompletenessScore)] += 1
      return result
    },
    { high: 0, medium: 0, low: 0 }
  )

  const offerCoverageDistribution = commerceProducts.reduce(
    (result, product) => {
      if (product.offerCount <= 0) {
        result.none += 1
      } else if (product.offerCount === 1) {
        result.single += 1
      } else {
        result.multi += 1
      }
      return result
    },
    { none: 0, single: 0, multi: 0 }
  )

  const priceHistoryCoverageDistribution = commerceProducts.reduce(
    (result, product) => {
      if (product.priceHistoryCount <= 0) {
        result.none += 1
      } else if (product.priceHistoryCount < 7) {
        result.thin += 1
      } else {
        result.healthy += 1
      }
      return result
    },
    { none: 0, thin: 0, healthy: 0 }
  )

  const brandPolicySlugs = new Set(brandPolicyRows.map((row) => row.brand_slug).filter(Boolean))
  const compatibilityFactCounts = new Map(compatibilityFactRows.map((row) => [row.brand_slug, Number(row.count || 0)]))
  const brandQualityRows = brands.map((brand) => {
    const hasPolicy = brandPolicySlugs.has(brand.slug)
    const compatibilityFactCount = compatibilityFactCounts.get(brand.slug) || 0
    const latestUpdateAgeDays = brand.latestUpdate
      ? Math.max(0, Math.floor((Date.now() - new Date(brand.latestUpdate).getTime()) / 86_400_000))
      : 999
    const freshnessPenalty = latestUpdateAgeDays >= 45 ? 8 : latestUpdateAgeDays >= 30 ? 4 : 0
    const policyPenalty = hasPolicy ? 0 : 18
    const compatibilityPenalty = compatibilityFactCount === 0 ? 16 : compatibilityFactCount < 3 ? 7 : 0
    const coverageBonus = brand.productCount * 6 + brand.articleCount * 3
    const priorityScore = coverageBonus + freshnessPenalty + policyPenalty + compatibilityPenalty
    const reasons = []

    if (!hasPolicy) reasons.push('No brand policy rows')
    if (compatibilityFactCount === 0) reasons.push('No compatibility facts')
    if (compatibilityFactCount > 0 && compatibilityFactCount < 3) reasons.push('Thin compatibility coverage')
    if (latestUpdateAgeDays >= 45) reasons.push('Brand coverage is aging')
    if (brand.productCount >= 3) reasons.push(`${brand.productCount} products already rely on this brand layer`)
    if (brand.articleCount >= 2) reasons.push(`${brand.articleCount} editorial pages already reference this brand`)

    return {
      slug: brand.slug,
      name: brand.name,
      productCount: brand.productCount,
      articleCount: brand.articleCount,
      compatibilityFactCount,
      hasPolicy,
      latestUpdate: brand.latestUpdate,
      priorityScore,
      reasons: reasons.slice(0, 4)
    }
  })

  return {
    totals: {
      products: Number(products?.count || 0),
      affiliateProducts: Number(affiliateProducts?.count || 0),
      articles: Number(articles?.count || 0),
      runs: Number(runs?.count || 0)
    },
    contentHealth: {
      productsWithLivePrice,
      productsMissingHero,
      productsMissingCategory,
      articlesMissingVisual,
      staleArticleCount: staleArticles.length,
      newsletterSubscribers: Number(newsletterSubscribers?.count || 0),
      targetedSubscribers: Number(targetedSubscribers?.count || 0)
    },
    commerceQuality: {
      lowConfidenceProducts: commerceProducts.filter((product) => product.dataConfidenceScore < 0.6).length,
      staleOfferProducts: commerceProducts.filter((product) => product.freshness === 'stale').length,
      productsWithoutOffers: commerceProducts.filter((product) => product.offerCount === 0).length,
      productsWithoutEvidence: commerceProducts.filter((product) => product.evidenceCount === 0).length,
      productsWithoutOfferCompetition: commerceProducts.filter((product) => product.offerCount < 2).length,
      productsWithoutPriceHistory: commerceProducts.filter((product) => product.priceHistoryCount === 0).length,
      freshnessDistribution,
      completenessDistribution,
      offerCoverageDistribution,
      priceHistoryCoverageDistribution,
      topPriorityProducts: commerceProducts
        .sort((left, right) => {
          if (right.priorityScore !== left.priorityScore) return right.priorityScore - left.priorityScore
          if (right.recentMerchantClicks !== left.recentMerchantClicks) return right.recentMerchantClicks - left.recentMerchantClicks
          return left.productName.localeCompare(right.productName)
        })
        .slice(0, 5)
    },
    brandQuality: {
      trackedBrands: brands.length,
      brandsWithPolicy: brandQualityRows.filter((brand) => brand.hasPolicy).length,
      brandsWithCompatibilityFacts: brandQualityRows.filter((brand) => brand.compatibilityFactCount > 0).length,
      brandsWithoutPolicy: brandQualityRows.filter((brand) => !brand.hasPolicy).length,
      brandsWithoutCompatibilityFacts: brandQualityRows.filter((brand) => brand.compatibilityFactCount <= 0).length,
      topPriorityBrands: brandQualityRows
        .sort((left, right) => {
          if (right.priorityScore !== left.priorityScore) return right.priorityScore - left.priorityScore
          if (right.productCount !== left.productCount) return right.productCount - left.productCount
          return left.name.localeCompare(right.name)
        })
        .slice(0, 5)
    },
    conversionSignals: {
      totalMerchantClicks: merchantClicks.totalClicks,
      merchantClicksLast7Days: merchantClicks.recentClicks,
      topMerchantSource: merchantClicks.topSource,
      topMerchantSourceClicks: merchantClicks.topSourceClicks,
      decisionFunnel: {
        lookbackDays: decisionFunnel.lookbackDays,
        shortlistVisitors: decisionFunnel.shortlistActivations.visitors,
        shortlistEvents: decisionFunnel.shortlistActivations.events,
        compareVisitors: decisionFunnel.compareActivations.visitors,
        compareEvents: decisionFunnel.compareActivations.events,
        sharedViewVisitors: decisionFunnel.sharedShortlistViews.visitors,
        sharedImportVisitors: decisionFunnel.sharedShortlistImports.visitors,
        shareExportEvents: decisionFunnel.shareExports.events,
        coachVisitors: decisionFunnel.coachEngagements.visitors,
        coachPrimaryEvents: decisionFunnel.coachPrimaryClicks.events,
        coachSecondaryEvents: decisionFunnel.coachSecondaryClicks.events,
        coachCompareLoadVisitors: decisionFunnel.coachCompareLoads.visitors,
        coachCompareLoadEvents: decisionFunnel.coachCompareLoads.events,
        merchantIntentVisitors: decisionFunnel.merchantIntentClicks.visitors,
        merchantIntentEvents: decisionFunnel.merchantIntentClicks.events,
        verifiedMerchantVisitors: decisionFunnel.verifiedMerchantExits.visitors,
        verifiedMerchantEvents: decisionFunnel.verifiedMerchantExits.events,
        shortlistToCompareRate: decisionFunnel.shortlistToCompareRate,
        compareToMerchantRate: decisionFunnel.compareToMerchantRate,
        coachInfluencedCompareRate: decisionFunnel.coachInfluencedCompareRate,
        compareToVerifiedMerchantRate: decisionFunnel.compareToVerifiedMerchantRate,
        sharedViewToImportRate: decisionFunnel.sharedViewToImportRate,
        topDecisionSource: decisionFunnel.topSource,
        topDecisionSourceEvents: decisionFunnel.topSourceEvents,
        topCoachAction: decisionFunnel.topCoachAction,
        topCoachActionEvents: decisionFunnel.topCoachActionEvents,
        assistantFunnel: {
          lookbackDays: decisionFunnel.assistantFunnel.lookbackDays,
          sessionVisitors: decisionFunnel.assistantFunnel.sessions.visitors,
          sessionEvents: decisionFunnel.assistantFunnel.sessions.events,
          constraintVisitors: decisionFunnel.assistantFunnel.constraints.visitors,
          acceptVisitors: decisionFunnel.assistantFunnel.recommendationAccepts.visitors,
          acceptEvents: decisionFunnel.assistantFunnel.recommendationAccepts.events,
          rejectVisitors: decisionFunnel.assistantFunnel.recommendationRejects.visitors,
          rejectEvents: decisionFunnel.assistantFunnel.recommendationRejects.events,
          alertVisitors: decisionFunnel.assistantFunnel.alertSubscriptions.visitors,
          alertEvents: decisionFunnel.assistantFunnel.alertSubscriptions.events,
          offerExpandVisitors: decisionFunnel.assistantFunnel.offerExpands.visitors,
          priceHistoryViewVisitors: decisionFunnel.assistantFunnel.priceHistoryViews.visitors,
          merchantOfferSelectionVisitors: decisionFunnel.assistantFunnel.merchantOfferSelections.visitors,
          merchantOfferSelectionEvents: decisionFunnel.assistantFunnel.merchantOfferSelections.events,
          sessionToConstraintRate: decisionFunnel.assistantFunnel.sessionToConstraintRate,
          sessionToAcceptRate: decisionFunnel.assistantFunnel.sessionToAcceptRate,
          sessionToAlertRate: decisionFunnel.assistantFunnel.sessionToAlertRate,
          acceptToMerchantSelectionRate: decisionFunnel.assistantFunnel.acceptToMerchantSelectionRate,
          topAssistantSource: decisionFunnel.assistantFunnel.topSource,
          topAssistantSourceEvents: decisionFunnel.assistantFunnel.topSourceEvents
        }
      }
    },
    recentRuns: recentRuns.slice(0, 6),
    recentAffiliateProducts: recentAffiliateProducts.slice(0, 8),
    staleArticles: staleArticles.slice(0, 5)
  }
}

export function renderSpecsTable(specs: Record<string, string>): string {
  const rows = Object.entries(specs)
    .map(([label, value]) => `<tr><th>${escapeHtml(label)}</th><td>${escapeHtml(value)}</td></tr>`)
    .join('')
  return `<table>${rows}</table>`
}
