import { NextResponse } from 'next/server'
import { upsertNewsletterSubscriber } from '@/lib/newsletter'

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}))
  const email = String(body.email || '').trim().toLowerCase()

  if (!email || !email.includes('@')) {
    return NextResponse.json({ error: 'Valid email is required' }, { status: 400 })
  }

  const subscription = await upsertNewsletterSubscriber({
    email,
    source: body.source,
    intent: body.intent,
    cadence: body.cadence,
    categorySlug: body.categorySlug,
    notes: body.notes
  })

  return NextResponse.json({
    success: true,
    intent: subscription.intent,
    cadence: subscription.cadence,
    categorySlug: subscription.categorySlug
  })
}
