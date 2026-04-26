import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { logAdminAudit } from '@/lib/admin-governance'
import { getTaxonomyOperationsSnapshot, runTaxonomyAction } from '@/lib/admin-blueprint'

export async function GET() {
  await requireAdmin()
  return NextResponse.json(await getTaxonomyOperationsSnapshot())
}

export async function POST(request: Request) {
  const actor = await requireAdmin()
  const body = await request.json().catch(() => ({}))
  const result = await runTaxonomyAction({
    action: String(body.action || ''),
    categorySlug: body.categorySlug ? String(body.categorySlug) : undefined,
    tagSlug: body.tagSlug ? String(body.tagSlug) : undefined,
    limit: Number(body.limit) > 0 ? Number(body.limit) : undefined,
    minPriorityScore: Number.isFinite(Number(body.minPriorityScore)) ? Number(body.minPriorityScore) : undefined
  })
  await logAdminAudit({
    actor,
    request,
    action: `taxonomy_${String(body.action || 'action')}`,
    entityType: 'taxonomy',
    after: result
  })
  return NextResponse.json({ success: true, result })
}
