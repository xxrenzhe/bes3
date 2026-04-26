import { NextResponse } from 'next/server'
import { requireAdmin, requireAdminPermission } from '@/lib/auth'
import { logAdminAudit } from '@/lib/admin-governance'
import { getEvidenceOperationsSnapshot, reviewEvidenceReport } from '@/lib/admin-blueprint'

export async function GET() {
  await requireAdmin()
  return NextResponse.json(await getEvidenceOperationsSnapshot())
}

export async function POST(request: Request) {
  const actor = await requireAdminPermission('evidence:write')
  const body = await request.json().catch(() => ({}))
  const result = await reviewEvidenceReport({
    actor,
    reportId: Number(body.reportId),
    decision: String(body.decision || 'approve') as any,
    reason: body.reason ? String(body.reason) : null
  })
  await logAdminAudit({
    actor,
    request,
    action: 'evidence_reviewed',
    entityType: 'analysis_reports',
    entityId: Number(body.reportId),
    after: { decision: body.decision }
  })
  return NextResponse.json(result)
}
