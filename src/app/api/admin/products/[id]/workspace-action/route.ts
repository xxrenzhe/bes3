import { NextResponse } from 'next/server'
import { requireAdminPermission } from '@/lib/auth'
import { logAdminAudit } from '@/lib/admin-governance'
import { runProductWorkspaceAction, type ProductWorkspaceAction } from '@/lib/pipeline'

const ACTIONS = new Set<ProductWorkspaceAction>([
  'contentPack',
  'mineKeywords',
  'generateReview',
  'generateComparison',
  'refreshSeo'
])

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const actor = await requireAdminPermission('pipeline:write')
  const body = await request.json().catch(() => ({}))
  const action = String(body.action || '') as ProductWorkspaceAction

  if (!ACTIONS.has(action)) {
    return NextResponse.json({ error: 'Unsupported workspace action' }, { status: 400 })
  }

  const productId = Number((await params).id)
  let runId: number
  try {
    runId = await runProductWorkspaceAction(productId, action)
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Workspace action failed' }, { status: 422 })
  }
  await logAdminAudit({
    actor,
    request,
    action: `product_workspace_${action}`,
    entityType: 'content_pipeline_runs',
    entityId: runId,
    after: { productId, runId, status: 'queued' }
  })
  return NextResponse.json({ success: true, queued: true, runId, status: 'queued' })
}
