import { NextResponse } from 'next/server'
import { requireAdminPermission } from '@/lib/auth'
import { logAdminAudit } from '@/lib/admin-governance'
import { getDatabase } from '@/lib/db'
import { runPipelineFromLink } from '@/lib/pipeline'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const actor = await requireAdminPermission('articles:write')
  const articleId = Number((await params).id)
  const db = await getDatabase()
  const article = await db.queryOne<{ source_affiliate_link: string }>(
    `
      SELECT p.source_affiliate_link
      FROM articles a
      JOIN products p ON p.id = a.product_id
      WHERE a.id = ?
      LIMIT 1
    `,
    [articleId]
  )

  if (!article?.source_affiliate_link) {
    return NextResponse.json({ error: 'Article source link not found' }, { status: 404 })
  }

  const runId = await runPipelineFromLink(article.source_affiliate_link)
  await logAdminAudit({
    actor,
    request,
    action: 'article_regeneration_pipeline_queued',
    entityType: 'content_pipeline_runs',
    entityId: runId,
    after: { articleId, runId, status: 'queued' }
  })
  return NextResponse.json({ success: true, queued: true, runId, status: 'queued' })
}
