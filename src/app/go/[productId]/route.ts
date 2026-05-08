import { NextRequest, NextResponse } from 'next/server'
import { getDatabase } from '@/lib/db'
import { DECISION_VISITOR_QUERY_PARAM, normalizeDecisionVisitorId } from '@/lib/decision-visitor'
import { recordMerchantClick } from '@/lib/merchant-clicks'
import { getCommissionableMerchantUrl, getMerchantExitContextFromSearchParams, normalizeMerchantSource } from '@/lib/merchant-links'
import { toAbsoluteUrl } from '@/lib/site-url'

function getFallbackPath(product: { slug: string | null } | null) {
  return product?.slug ? `/products/${product.slug}` : '/directory'
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  const productId = Number((await params).productId)
  if (!Number.isInteger(productId) || productId <= 0) {
    return NextResponse.redirect(toAbsoluteUrl('/directory'))
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
    return NextResponse.redirect(toAbsoluteUrl('/directory'))
  }

  const requestedOfferId = Number.parseInt(request.nextUrl.searchParams.get('offerId') || '', 10)
  const selectedOffer =
    Number.isInteger(requestedOfferId) && requestedOfferId > 0
      ? await db.queryOne<{ offer_url: string | null; source_url: string | null }>(
          `
            SELECT offer_url, source_url
            FROM product_offers
            WHERE id = ? AND product_id = ?
            LIMIT 1
          `,
          [requestedOfferId, productId]
        )
      : null

  const activeAffiliateLink = await db.queryOne<{ affiliate_url: string | null; original_url: string | null }>(
    `
      SELECT affiliate_url, original_url
      FROM affiliate_links
      WHERE product_id = ?
        AND status NOT IN ('broken', 'inactive')
      ORDER BY CASE status WHEN 'active' THEN 0 WHEN 'unknown' THEN 1 ELSE 2 END, updated_at DESC, id DESC
      LIMIT 1
    `,
    [productId]
  )

  const destination = getCommissionableMerchantUrl(
    selectedOffer?.offer_url,
    product.source_affiliate_link,
    activeAffiliateLink?.affiliate_url,
    selectedOffer?.source_url,
    product.resolved_url,
    activeAffiliateLink?.original_url
  )
  if (!destination) {
    return NextResponse.redirect(toAbsoluteUrl(getFallbackPath(product)))
  }

  try {
    const metadata = getMerchantExitContextFromSearchParams(request.nextUrl.searchParams)
    await recordMerchantClick({
      productId: product.id,
      visitorId: normalizeDecisionVisitorId(request.nextUrl.searchParams.get(DECISION_VISITOR_QUERY_PARAM)),
      source: normalizeMerchantSource(request.nextUrl.searchParams.get('source')),
      targetUrl: destination,
      metadata,
      referer: request.headers.get('referer'),
      userAgent: request.headers.get('user-agent')
    })
  } catch {
    // Attribution should not block a buyer from reaching the merchant page.
  }

  try {
    const response = NextResponse.redirect(destination, 307)
    response.headers.set('Cache-Control', 'no-store')
    response.headers.set('Referrer-Policy', 'origin')
    return response
  } catch {
    return NextResponse.redirect(toAbsoluteUrl(getFallbackPath(product)))
  }
}
