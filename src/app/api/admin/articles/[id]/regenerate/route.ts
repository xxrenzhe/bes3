import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { getDatabase } from '@/lib/db'
import { runPipelineFromLink } from '@/lib/pipeline'

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  await requireAdmin()
  const db = await getDatabase()
  const article = await db.queryOne<{ source_affiliate_link: string }>(
    `
      SELECT p.source_affiliate_link
      FROM articles a
      JOIN products p ON p.id = a.product_id
      WHERE a.id = ?
      LIMIT 1
    `,
    [Number((await params).id)]
  )

  if (!article?.source_affiliate_link) {
    return NextResponse.json({ error: 'Article source link not found' }, { status: 404 })
  }

  const runId = await runPipelineFromLink(article.source_affiliate_link)
  return NextResponse.json({ success: true, runId })
}
