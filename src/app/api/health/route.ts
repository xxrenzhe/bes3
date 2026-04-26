import { NextResponse } from 'next/server'
import fs from 'node:fs'
import path from 'node:path'
import { getDatabase } from '@/lib/db'
import { getSettingValueOrEnv, listSettingDiagnostics, type SettingDiagnostic } from '@/lib/settings'
import { getPipelineWorkerRuntimeConfig, listPipelineOperations } from '@/lib/pipeline'
import type { DatabaseAdapter } from '@/lib/types'

const BES3_VERSION = '0.1.0'

function mapDependencyStatus(status: SettingDiagnostic['status']): 'ok' | 'degraded' | 'unavailable' {
  if (status === 'configured') return 'ok'
  if (status === 'partial') return 'degraded'
  return 'unavailable'
}

function getMigrationFiles(dbType: string): string[] {
  const migrationDir = dbType === 'postgres'
    ? path.join(process.cwd(), 'pg-migrations')
    : path.join(process.cwd(), 'migrations')
  if (!fs.existsSync(migrationDir)) return []
  return fs.readdirSync(migrationDir).filter((file) => file.endsWith('.sql')).sort()
}

async function getMigrationReadiness(db: DatabaseAdapter, dbType: string, connected: boolean) {
  if (!connected) {
    return {
      available: false,
      applied: 0,
      expected: getMigrationFiles(dbType).length,
      pending: null,
      latestApplied: null
    }
  }

  try {
    const files = getMigrationFiles(dbType)
    const appliedRows = await db.query<{ migration_name: string; applied_at?: string | null }>(
      'SELECT migration_name, applied_at FROM migration_history ORDER BY applied_at DESC, id DESC'
    )
    const applied = new Set(appliedRows.map((row) => row.migration_name))
    return {
      available: true,
      applied: appliedRows.length,
      expected: files.length,
      pending: files.filter((file) => !applied.has(file)),
      latestApplied: appliedRows[0]?.migration_name || null
    }
  } catch {
    return {
      available: false,
      applied: 0,
      expected: getMigrationFiles(dbType).length,
      pending: null,
      latestApplied: null
    }
  }
}

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
  const diagnostics = await listSettingDiagnostics().catch(() => [])
  const pipelineOps = await listPipelineOperations().catch(() => null)
  const workerHasFreshHeartbeat = pipelineOps
    ? pipelineOps.workers.some((worker) => {
        const ageMs = Date.now() - new Date(worker.last_seen_at).getTime()
        return worker.status !== 'stopped' && Number.isFinite(ageMs) && ageMs < 120_000
      })
    : false
  const migrations = await getMigrationReadiness(db, dbType, dbConnected)
  const workerConfig = getPipelineWorkerRuntimeConfig()
  const coreDegraded = !dbConnected || (workerConfig.enabled && !workerHasFreshHeartbeat)
  const dependencies = diagnostics.map((item) => ({
    id: item.id,
    title: item.title,
    status: mapDependencyStatus(item.status),
    detail: item.detail
  }))

  return NextResponse.json({
    status: coreDegraded ? 'degraded' : 'ok',
    version: BES3_VERSION,
    worker: {
      ...workerConfig,
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
    },
    migrations,
    dependencies
  })
}
