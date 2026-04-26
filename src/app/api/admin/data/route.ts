import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { logAdminAudit } from '@/lib/admin-governance'
import { getDataManagementSnapshot, recordAdminImportRun } from '@/lib/admin-blueprint'

export async function GET() {
  await requireAdmin()
  return NextResponse.json(await getDataManagementSnapshot())
}

export async function POST(request: Request) {
  const actor = await requireAdmin()
  const body = await request.json().catch(() => ({}))
  const result = await recordAdminImportRun({
    actor,
    importType: String(body.importType || 'manual'),
    sourceFilename: body.sourceFilename ? String(body.sourceFilename) : null,
    dryRun: body.dryRun !== false
  })
  await logAdminAudit({
    actor,
    request,
    action: 'data_import_run_recorded',
    entityType: 'admin_import_runs',
    entityId: result.importRunId,
    after: result
  })
  return NextResponse.json({ success: true, result })
}
