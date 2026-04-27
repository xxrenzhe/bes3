import { NextResponse } from 'next/server'
import { getPublicHealthReport } from '@/lib/health'

export async function GET() {
  const report = await getPublicHealthReport()
  return NextResponse.json(report, { status: report.status === 'ok' ? 200 : 503 })
}
