import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { getAdminProductWorkspace } from '@/lib/admin-products'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  await requireAdmin()
  const workspace = await getAdminProductWorkspace(Number((await params).id))
  if (!workspace) {
    return NextResponse.json({ error: 'Product not found' }, { status: 404 })
  }
  return NextResponse.json(workspace)
}
