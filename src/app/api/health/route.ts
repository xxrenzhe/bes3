import { NextResponse } from 'next/server'
import { getDatabase } from '@/lib/db'
import { getSettingValueOrEnv } from '@/lib/settings'
import { getPipelineWorkerRuntimeConfig } from '@/lib/pipeline'

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

  return NextResponse.json({
    status: 'ok',
    version: BES3_VERSION,
    worker: getPipelineWorkerRuntimeConfig(),
    database: {
      type: dbType,
      connected: dbConnected
    },
    media: {
      driver: mediaDriver
    }
  })
}
