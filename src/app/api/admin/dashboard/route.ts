import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { getAdminDashboardSummary } from '@/lib/pipeline'

export async function GET() {
  await requireAdmin()
  return NextResponse.json(await getAdminDashboardSummary())
}
