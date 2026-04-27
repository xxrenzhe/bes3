import { NextResponse } from 'next/server'
import { hasValidInternalServiceToken } from '@/lib/internal-service'

export async function GET(request: Request) {
  if (!hasValidInternalServiceToken(request.headers)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let report: unknown
  try {
    const { getDetailedHealthReportSafe } = await import('@/lib/health')
    report = await getDetailedHealthReportSafe()
  } catch (error) {
    report = {
      status: 'degraded',
      version: process.env.npm_package_version || '0.1.0',
      checkedAt: new Date().toISOString(),
      worker: {
        enabled: (process.env.PIPELINE_WORKER_ENABLED || 'true') !== 'false',
        pollMs: Number.parseInt(process.env.PIPELINE_WORKER_POLL_MS || '2500', 10) || 2500,
        concurrency: Number.parseInt(process.env.PIPELINE_WORKER_CONCURRENCY || '1', 10) || 1,
        heartbeatFresh: false,
        staleRunningCount: null,
        expiredLockCount: null
      },
      database: {
        type: 'unknown',
        connected: false
      },
      media: {
        driver: process.env.MEDIA_DRIVER || 'local'
      },
      migrations: {
        available: false,
        applied: 0,
        expected: 0,
        pending: null,
        latestApplied: null
      },
      dependencies: [],
      error: error instanceof Error ? error.message : String(error)
    }
  }

  return NextResponse.json(report)
}
