import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { getDatabase } from '@/lib/db'

export async function GET() {
  await requireAdmin()
  const db = await getDatabase()
  const rows = await db.query(
    `
      SELECT a.id, a.product_id, a.article_type, a.title, a.slug, a.status, a.summary, a.keyword,
        a.hero_image_url, a.seo_title, a.seo_description, a.published_at, a.updated_at, p.product_name
      FROM articles a
      LEFT JOIN products p ON p.id = a.product_id
      ORDER BY a.updated_at DESC, a.id DESC
    `
  )
  return NextResponse.json(rows)
}
