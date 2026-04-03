import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { runPipelineFromLink } from '@/lib/pipeline'

export async function POST(request: Request) {
  await requireAdmin()
  const body = await request.json().catch(() => ({}))
  const link = String(body.link || '').trim()
  if (!link) {
    return NextResponse.json({ error: 'Affiliate link is required' }, { status: 400 })
  }

  const runId = await runPipelineFromLink(link)
  return NextResponse.json({ success: true, runId })
}
