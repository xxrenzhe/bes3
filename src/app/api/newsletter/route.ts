import { NextResponse } from 'next/server'
import { getDatabase } from '@/lib/db'
import { slugify } from '@/lib/slug'

const VALID_INTENTS = new Set(['deals', 'price-alert', 'category-brief'])
const VALID_CADENCES = new Set(['weekly', 'priority'])

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}))
  const email = String(body.email || '').trim().toLowerCase()
  const source = String(body.source || 'site').trim().slice(0, 80) || 'site'
  const intent = VALID_INTENTS.has(String(body.intent || '')) ? String(body.intent) : 'deals'
  const cadence = VALID_CADENCES.has(String(body.cadence || '')) ? String(body.cadence) : 'weekly'
  const categorySlug = slugify(String(body.categorySlug || '')) || null
  const notes = String(body.notes || '').trim().slice(0, 240) || null

  if (!email || !email.includes('@')) {
    return NextResponse.json({ error: 'Valid email is required' }, { status: 400 })
  }

  const db = await getDatabase()
  const existing = await db.queryOne<{ id: number }>('SELECT id FROM newsletter_subscribers WHERE email = ? LIMIT 1', [email])
  if (existing?.id) {
    await db.exec(
      `
        UPDATE newsletter_subscribers
        SET source = ?, intent = ?, category_slug = ?, cadence = ?, notes = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
      [source, intent, categorySlug, cadence, notes, existing.id]
    )
  } else {
    await db.exec(
      'INSERT INTO newsletter_subscribers (email, source, intent, category_slug, cadence, notes) VALUES (?, ?, ?, ?, ?, ?)',
      [email, source, intent, categorySlug, cadence, notes]
    )
  }
  return NextResponse.json({ success: true, intent, cadence, categorySlug })
}
