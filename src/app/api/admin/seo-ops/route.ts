import { NextResponse } from 'next/server'
import { requireAdmin, requireAdminPermission } from '@/lib/auth'
import { logAdminAudit } from '@/lib/admin-governance'
import { getSeoOperationsSummary, rerunGoogleIndexing, rerunSyndication, runLinkInspector } from '@/lib/seo-ops'

export async function GET() {
  await requireAdmin()
  return NextResponse.json(await getSeoOperationsSummary())
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

  return NextResponse.json({ error: 'Unknown SEO ops action' }, { status: 400 })
}
