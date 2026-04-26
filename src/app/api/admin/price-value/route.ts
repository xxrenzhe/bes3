import { NextResponse } from 'next/server'
import { requireAdmin, requireAdminPermission } from '@/lib/auth'
import { logAdminAudit } from '@/lib/admin-governance'
import { getPriceValueOperationsSnapshot, runPriceValueAction } from '@/lib/admin-blueprint'

export async function GET() {
  await requireAdmin()
  return NextResponse.json(await getPriceValueOperationsSnapshot())
}

export async function POST(request: Request) {
  const actor = await requireAdminPermission('price-value:write')
  const body = await request.json().catch(() => ({}))
  const result = await runPriceValueAction({
    action: String(body.action || ''),
    limit: Number(body.limit) > 0 ? Number(body.limit) : undefined,
    markNotified: Boolean(body.markNotified),
    queueNotifications: Boolean(body.queueNotifications)
  })
  await logAdminAudit({
    actor,
    request,
    action: `price_value_${String(body.action || 'action')}`,
    entityType: 'price_value',
    after: result
  })
  return NextResponse.json({ success: true, result })
}
