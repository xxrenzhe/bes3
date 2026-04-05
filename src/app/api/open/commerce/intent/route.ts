import { NextRequest, NextResponse } from 'next/server'
import { parseIntentInputFromSearchParams, resolveIntentSearch } from '@/lib/commerce-intent'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const input = parseIntentInputFromSearchParams({
    q: searchParams.get('q') || undefined,
    intent: searchParams.get('intent') || undefined,
    category: searchParams.get('category') || undefined,
    budget: searchParams.get('budget') || undefined,
    must: searchParams.get('must') || undefined,
    avoid: searchParams.get('avoid') || undefined,
    urgency: searchParams.get('urgency') || undefined
  })

  if (!input.query) {
    return NextResponse.json({ error: 'intent or q is required' }, { status: 400 })
  }

  const result = await resolveIntentSearch(input)

  return NextResponse.json({
    generatedAt: new Date().toISOString(),
    result
  })
}
