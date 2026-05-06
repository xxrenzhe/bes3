import { NextResponse } from 'next/server'
import { getDetailedHealthReportSafe } from '@/lib/health'

export async function GET() {
  const report = await getDetailedHealthReportSafe()
  const databaseConnected = report.database.connected
  const status = databaseConnected ? 'ok' : 'degraded'

  return NextResponse.json(
    {
      status,
      version: report.version,
      build: report.build,
      checkedAt: report.checkedAt,
      service: 'bes3',
      database: {
        connected: databaseConnected,
        type: report.database.type
      }
    },
    { status: databaseConnected ? 200 : 503 }
  )
}
