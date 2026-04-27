import { NextResponse } from 'next/server'
import { recordSearchIntent } from '@/lib/hardcore-ops'
import { listHardcoreTags } from '@/lib/hardcore'

export const dynamic = 'force-dynamic'

function normalizeQuery(value: unknown) {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, 180)
}

export async function GET() {
  const tags = await listHardcoreTags()

  return NextResponse.json({
    endpoint: '/api/open/evidence/search-intake',
    method: 'POST',
    description: 'Capture real buyer search phrasing and map it to the Bes3 taxonomy loop.',
    accepts: {
      query: 'string (required, min 2 chars)',
      categorySlug: 'string (optional)',
      source: 'string (optional)'
    },
    returns: {
      status: '"matched" | "pending"',
      hitCount: 'number',
      matchedTag: 'object | null',
      pendingTag: 'object | null'
    },
    sampleBody: {
      query: 'best air purifier for wildfire smoke',
      categorySlug: 'air-water',
      source: 'public-search'
    },
    canonicalTagsPreview: tags.slice(0, 12).map((tag) => ({
      name: tag.name,
      slug: tag.slug,
      categorySlug: tag.categorySlug
    }))
  })
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
