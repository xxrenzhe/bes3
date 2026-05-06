import { NextResponse } from 'next/server'
import { requireAdmin, requireAdminPermission } from '@/lib/auth'
import { logAdminAudit } from '@/lib/admin-governance'
import { buildCommercialLoopRuntimeGuide, runCommercialLoop, type CommercialLoopOptions } from '@/lib/commercial-loop'

function readBoolean(value: unknown, fallback = false) {
  return typeof value === 'boolean' ? value : fallback
}

function readPositiveInteger(value: unknown, fallback: number, max: number) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback
  return Math.min(Math.floor(parsed), max)
}

function readScore(value: unknown, fallback: number) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return fallback
  return Math.max(0, Math.min(Math.floor(parsed), 100))
}

function readSyncPlatform(value: unknown): CommercialLoopOptions['syncPlatform'] {
  const normalized = String(value || 'none').trim().toLowerCase()
  if (normalized === 'amazon' || normalized === 'dtc' || normalized === 'all') return normalized
  return 'none'
}

function readOptions(body: Record<string, unknown>): CommercialLoopOptions {
  const execute = readBoolean(body.execute, false)
  return {
    execute,
    limit: readPositiveInteger(body.limit, execute ? 1 : 10, execute ? 5 : 25),
    minScore: readScore(body.minScore, 65),
    syncPlatform: readSyncPlatform(body.syncPlatform || body.sync),
    discoverVideos: readBoolean(body.discoverVideos, execute),
    enrichProducts: readBoolean(body.enrichProducts, false),
    fetchTranscripts: readBoolean(body.fetchTranscripts, execute),
    extractEvidence: readBoolean(body.extractEvidence, execute),
    publishArticles: readBoolean(body.publishArticles, execute),
    pushIndex: readBoolean(body.pushIndex, false),
    maxVideosPerProduct: readPositiveInteger(body.maxVideosPerProduct, 3, 5)
  }
}

export async function GET() {
  await requireAdmin()
  return NextResponse.json({
    guide: buildCommercialLoopRuntimeGuide()
  })
}

export async function POST(request: Request) {
  const actor = await requireAdminPermission('pipeline:write')
  const body = await request.json().catch(() => ({}))
  const options = readOptions(body && typeof body === 'object' && !Array.isArray(body) ? body as Record<string, unknown> : {})
  const result = await runCommercialLoop(options)
  await logAdminAudit({
    actor,
    request,
    action: options.execute ? 'commercial_loop_execute' : 'commercial_loop_preview',
    entityType: 'commercial_loop',
    after: {
      options: result.options,
      ok: result.ok,
      selected: result.selected.length,
      videosDiscovered: result.videosDiscovered,
      transcriptsFetched: result.transcriptsFetched,
      evidenceReportsWritten: result.evidenceReportsWritten,
      articlesPublished: result.articlesPublished.length,
      skipped: result.skipped.length
    }
  })
  return NextResponse.json({ success: result.ok, result }, { status: result.ok ? 200 : 422 })
}
