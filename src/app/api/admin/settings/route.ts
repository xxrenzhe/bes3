import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { listSettings, saveSetting } from '@/lib/settings'

export async function GET() {
  await requireAdmin()
  return NextResponse.json(await listSettings())
}

export async function PUT(request: Request) {
  await requireAdmin()
  const body = await request.json().catch(() => ({}))
  const items = Array.isArray(body.items) ? body.items : []
  for (const item of items) {
    await saveSetting({
      category: String(item.category || ''),
      key: String(item.key || ''),
      value: item.value === null ? null : String(item.value || ''),
      dataType: item.dataType || 'string',
      isSensitive: Boolean(item.isSensitive),
      description: item.description || null
    })
  }
  return NextResponse.json({ success: true })
}
