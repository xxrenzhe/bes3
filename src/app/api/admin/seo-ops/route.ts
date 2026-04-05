import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { getSeoOperationsSummary, rerunGoogleIndexing, rerunSyndication, runLinkInspector } from '@/lib/seo-ops'

export async function GET() {
  await requireAdmin()
  return NextResponse.json(await getSeoOperationsSummary())
}

export async function POST(request: Request) {
  await requireAdmin()
  const body = await request.json().catch(() => ({}))
  const action = String(body.action || '')
  const paths = Array.isArray(body.paths) ? body.paths.map((item: unknown) => String(item || '')).filter(Boolean) : undefined

  if (action === 'linkInspector') {
    const result = await runLinkInspector(Number(body.limit) > 0 ? Number(body.limit) : undefined)
    return NextResponse.json({ success: true, result })
  }

  if (action === 'reindex') {
    const result = await rerunGoogleIndexing(paths)
    return NextResponse.json({ success: true, result })
  }

  if (action === 'syndicate') {
    const result = await rerunSyndication(paths)
    return NextResponse.json({ success: true, result })
  }

  return NextResponse.json({ error: 'Unknown SEO ops action' }, { status: 400 })
}
