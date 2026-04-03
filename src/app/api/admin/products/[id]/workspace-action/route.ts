import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
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
  await requireAdmin()
  const body = await request.json().catch(() => ({}))
  const action = String(body.action || '') as ProductWorkspaceAction

  if (!ACTIONS.has(action)) {
    return NextResponse.json({ error: 'Unsupported workspace action' }, { status: 400 })
  }

  const runId = await runProductWorkspaceAction(Number((await params).id), action)
  return NextResponse.json({ success: true, runId })
}
