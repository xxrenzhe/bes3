import { NextResponse } from 'next/server'
import { requireAdmin, requireAdminPermission } from '@/lib/auth'
import { logAdminAudit } from '@/lib/admin-governance'
import { ensureQaRiskAlert, getRiskOperationsSnapshot, updateRiskAlertStatus } from '@/lib/admin-blueprint'

export async function GET() {
  await requireAdmin()
  return NextResponse.json(await getRiskOperationsSnapshot())
}

export async function POST(request: Request) {
  const actor = await requireAdminPermission('risk:write')
  const body = await request.json().catch(() => ({}))
  if (String(body.action || '') === 'ensureQaAlert') {
    const result = await ensureQaRiskAlert({ actor })
    await logAdminAudit({
      actor,
      request,
      action: 'risk_qa_alert_ensured',
      entityType: 'admin_risk_alerts',
      entityId: result.alertId,
      after: result
    })
    return NextResponse.json(result)
  }

  const status = String(body.status || 'resolved') === 'open' ? 'open' : 'resolved'
  let result: Awaited<ReturnType<typeof updateRiskAlertStatus>>
  try {
    result = await updateRiskAlertStatus({
      actor,
      alertId: Number(body.alertId),
      status
    })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Risk status update failed' }, { status: 422 })
  }
  await logAdminAudit({
    actor,
    request,
    action: `risk_${status}`,
    entityType: 'admin_risk_alerts',
    entityId: Number(body.alertId)
  })
  return NextResponse.json(result)
}
