import { NextResponse } from 'next/server'
import { requireAdmin, requireAdminPermission } from '@/lib/auth'
import { logAdminAudit } from '@/lib/admin-governance'
import { getSeoOperationsSummary, rerunGoogleIndexing, rerunSyndication, runLinkInspector } from '@/lib/seo-ops'
import { getSeoAutomationDefaults, runSeoAutomation } from '@/lib/seo-automation'

export async function GET() {
  await requireAdmin()
  const [summary, automationDefaults] = await Promise.all([
    getSeoOperationsSummary(),
    Promise.resolve(getSeoAutomationDefaults())
  ])
  return NextResponse.json({ ...summary, automationDefaults })
}

export async function POST(request: Request) {
  const actor = await requireAdminPermission('seo-ops:write')
  const body = await request.json().catch(() => ({}))
  const action = String(body.action || '')
  const paths = Array.isArray(body.paths) ? body.paths.map((item: unknown) => String(item || '')).filter(Boolean) : undefined

  if (action === 'linkInspector') {
    const result = await runLinkInspector(Number(body.limit) > 0 ? Number(body.limit) : undefined)
    await logAdminAudit({
      actor,
      request,
      action: 'seo_ops_link_inspector',
      entityType: 'seo_ops',
      after: result
    })
    return NextResponse.json({ success: true, result })
  }

  if (action === 'reindex') {
    const result = await rerunGoogleIndexing(paths)
    await logAdminAudit({
      actor,
      request,
      action: 'seo_ops_reindex',
      entityType: 'seo_ops',
      after: { paths: paths || null, result }
    })
    return NextResponse.json({ success: true, result })
  }

  if (action === 'syndicate') {
    const result = await rerunSyndication(paths)
    await logAdminAudit({
      actor,
      request,
      action: 'seo_ops_syndicate',
      entityType: 'seo_ops',
      after: { paths: paths || null, result }
    })
    return NextResponse.json({ success: true, result })
  }

  if (action === 'automationPreview' || action === 'automationApply') {
    const apply = action === 'automationApply'
    const result = await runSeoAutomation({
      apply,
      pushIndex: apply && body.pushIndex === true,
      skipChecks: body.skipChecks === true,
      limit: Number(body.limit) > 0 ? Number(body.limit) : undefined,
      signalDays: Number(body.signalDays) > 0 ? Number(body.signalDays) : undefined,
      minPriority: Number.isFinite(Number(body.minPriority)) ? Number(body.minPriority) : undefined,
      signalFile: typeof body.signalFile === 'string' ? body.signalFile : undefined,
      signalSource: typeof body.signalSource === 'string' ? body.signalSource : undefined
    })
    await logAdminAudit({
      actor,
      request,
      action: apply ? 'seo_ops_automation_apply' : 'seo_ops_automation_preview',
      entityType: 'seo_ops',
      after: {
        apply,
        pushIndex: apply && body.pushIndex === true,
        limit: Number(body.limit) > 0 ? Number(body.limit) : null,
        result
      }
    })
    return NextResponse.json({ success: result.ok, result }, { status: result.ok ? 200 : 422 })
  }

  return NextResponse.json({ error: 'Unknown SEO ops action' }, { status: 400 })
}
