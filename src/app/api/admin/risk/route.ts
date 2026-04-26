import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { logAdminAudit } from '@/lib/admin-governance'
import { getRiskOperationsSnapshot, updateRiskAlertStatus } from '@/lib/admin-blueprint'

export async function GET() {
  await requireAdmin()
  return NextResponse.json(await getRiskOperationsSnapshot())
}

export async function POST(request: Request) {
  const actor = await requireAdmin()
  const body = await request.json().catch(() => ({}))
  const status = String(body.status || 'resolved') === 'open' ? 'open' : 'resolved'
  const result = await updateRiskAlertStatus({
    actor,
    alertId: Number(body.alertId),
    status
  })
  await logAdminAudit({
    actor,
    request,
    action: `risk_${status}`,
    entityType: 'admin_risk_alerts',
    entityId: Number(body.alertId)
  })
  return NextResponse.json(result)
}
