import { NextResponse } from 'next/server'
import { getDatabase } from '@/lib/db'

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}))
  const email = String(body.email || '').trim().toLowerCase()
  if (!email || !email.includes('@')) {
    return NextResponse.json({ error: 'Valid email is required' }, { status: 400 })
  }

  const db = await getDatabase()
  const existing = await db.queryOne<{ id: number }>('SELECT id FROM newsletter_subscribers WHERE email = ? LIMIT 1', [email])
  if (!existing?.id) {
    await db.exec(
      'INSERT INTO newsletter_subscribers (email, source) VALUES (?, ?)',
      [email, 'site']
    )
  }
  return NextResponse.json({ success: true })
}
