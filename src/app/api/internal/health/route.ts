import { NextResponse } from 'next/server'
import { getDetailedHealthReport } from '@/lib/health'
import { hasValidInternalServiceToken } from '@/lib/internal-service'

export async function GET(request: Request) {
  if (!hasValidInternalServiceToken(request.headers)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const report = await getDetailedHealthReport()
  return NextResponse.json(report, { status: report.status === 'ok' ? 200 : 503 })
}
