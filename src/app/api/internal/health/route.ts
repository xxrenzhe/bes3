import { NextResponse } from 'next/server'
import { getDetailedHealthReportSafe } from '@/lib/health'
import { hasValidInternalServiceToken } from '@/lib/internal-service'

export async function GET(request: Request) {
  if (!hasValidInternalServiceToken(request.headers)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const report = await getDetailedHealthReportSafe()
  return NextResponse.json(report)
}
