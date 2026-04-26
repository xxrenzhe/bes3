import { NextResponse } from 'next/server'
import { recordSearchIntent } from '@/lib/hardcore-ops'
import { listHardcoreTags } from '@/lib/hardcore'

export const dynamic = 'force-dynamic'

function normalizeQuery(value: unknown) {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, 180)
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}))
  const query = normalizeQuery(body.query)

  if (query.length < 2) {
    return NextResponse.json(
      {
        error: 'invalid_query',
        message: 'query must contain at least 2 characters'
      },
      { status: 400 }
    )
  }

  const tags = await listHardcoreTags()
  const lowered = query.toLowerCase()
  const categorySlug = String(body.categorySlug || '').trim() || null
  const matchedTag = tags.find((tag) => {
    if (lowered.includes(tag.name.toLowerCase())) return true
    return tag.keywords.some((keyword) => lowered.includes(keyword.toLowerCase()))
  })
  const intent = await recordSearchIntent({
    query,
    matchedTagId: matchedTag?.id || null,
    matchedCategorySlug: matchedTag?.categorySlug || categorySlug,
    source: body.source
  })

  return NextResponse.json({
    status: matchedTag?.id ? 'matched' : 'pending',
    hitCount: intent.hitCount,
    matchedTag: matchedTag
      ? {
          id: matchedTag.id,
          name: matchedTag.name,
          slug: matchedTag.slug,
          categorySlug: matchedTag.categorySlug
        }
      : null,
    pendingTag: intent.pendingTag
  })
}
