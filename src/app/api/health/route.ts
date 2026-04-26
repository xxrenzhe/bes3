import { NextResponse } from 'next/server'
import { getDatabase } from '@/lib/db'
import { getSettingValueOrEnv } from '@/lib/settings'
import { getPipelineWorkerRuntimeConfig, listPipelineOperations } from '@/lib/pipeline'

const BES3_VERSION = '0.1.0'

export async function GET() {
  const db = await getDatabase()
  let dbConnected = false
  let dbType = 'unknown'

  try {
    await db.query('SELECT 1')
    dbConnected = true
    dbType = db.type
  } catch {
    dbConnected = false
  }

  const mediaDriver = await getSettingValueOrEnv('media', 'driver', 'MEDIA_DRIVER', 'local')
  const pipelineOps = await listPipelineOperations().catch(() => null)
  const workerHasFreshHeartbeat = pipelineOps
    ? pipelineOps.workers.some((worker) => {
        const ageMs = Date.now() - new Date(worker.last_seen_at).getTime()
        return worker.status !== 'stopped' && Number.isFinite(ageMs) && ageMs < 120_000
      })
    : false

  return NextResponse.json({
    status: dbConnected ? 'ok' : 'degraded',
    version: BES3_VERSION,
    worker: {
      ...getPipelineWorkerRuntimeConfig(),
      heartbeatFresh: workerHasFreshHeartbeat,
      staleRunningCount: pipelineOps?.staleRunningCount ?? null,
      expiredLockCount: pipelineOps?.expiredLockCount ?? null
    },
    database: {
      type: dbType,
      connected: dbConnected
    },
    media: {
      driver: mediaDriver
    }
  })
}
