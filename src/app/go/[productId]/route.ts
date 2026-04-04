import { NextRequest, NextResponse } from 'next/server'
import { getDatabase } from '@/lib/db'
import { DECISION_VISITOR_QUERY_PARAM, normalizeDecisionVisitorId } from '@/lib/decision-visitor'
import { recordMerchantClick } from '@/lib/merchant-clicks'
import { normalizeMerchantSource } from '@/lib/merchant-links'

function getFallbackPath(product: { slug: string | null } | null) {
  return product?.slug ? `/products/${product.slug}` : '/directory'
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  const productId = Number((await params).productId)
  if (!Number.isInteger(productId) || productId <= 0) {
    return NextResponse.redirect(new URL('/directory', request.url))
  }

  const db = await getDatabase()
  const product = await db.queryOne<{ id: number; slug: string | null; resolved_url: string | null; source_affiliate_link: string | null }>(
    `
      SELECT id, slug, resolved_url, source_affiliate_link
      FROM products
      WHERE id = ?
      LIMIT 1
    `,
    [productId]
  )

  if (!product) {
    return NextResponse.redirect(new URL('/directory', request.url))
  }

  const destination = product.resolved_url || product.source_affiliate_link
  if (!destination) {
    return NextResponse.redirect(new URL(getFallbackPath(product), request.url))
  }

  try {
    await recordMerchantClick({
      productId: product.id,
      visitorId: normalizeDecisionVisitorId(request.nextUrl.searchParams.get(DECISION_VISITOR_QUERY_PARAM)),
      source: normalizeMerchantSource(request.nextUrl.searchParams.get('source')),
      targetUrl: destination,
      referer: request.headers.get('referer'),
      userAgent: request.headers.get('user-agent')
    })
  } catch {
    // Attribution should not block a buyer from reaching the merchant page.
  }

  try {
    const response = NextResponse.redirect(new URL(destination), 307)
    response.headers.set('Cache-Control', 'no-store')
    response.headers.set('Referrer-Policy', 'origin')
    return response
  } catch {
    return NextResponse.redirect(new URL(getFallbackPath(product), request.url))
  }
}
