import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { batchRunPipelines } from '@/lib/pipeline'

export async function POST(request: Request) {
  await requireAdmin()
  const body = (await request.json().catch(() => ({}))) as { ids?: unknown[] }
  const ids = Array.isArray(body.ids)
    ? body.ids
        .map((value: unknown) => Number(value))
        .filter((value: number): value is number => Number.isFinite(value))
    : []
  if (ids.length === 0) {
    return NextResponse.json({ error: 'At least one affiliate product id is required' }, { status: 400 })
  }

  const runIds = await batchRunPipelines(ids)
  return NextResponse.json({ success: true, queued: true, runIds })
}
