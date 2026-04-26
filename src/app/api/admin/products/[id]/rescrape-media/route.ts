import { NextResponse } from 'next/server'
import { requireAdminPermission } from '@/lib/auth'
import { logAdminAudit } from '@/lib/admin-governance'
import { rescrapeProductMedia } from '@/lib/pipeline'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const actor = await requireAdminPermission('products:write')
  const productId = Number((await params).id)
  await rescrapeProductMedia(productId)
  await logAdminAudit({
    actor,
    request,
    action: 'product_media_rescraped',
    entityType: 'products',
    entityId: productId,
    after: { productId }
  })
  return NextResponse.json({ success: true })
}
