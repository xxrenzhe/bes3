import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { getDatabase } from '@/lib/db'
import { listAffiliateProducts } from '@/lib/partnerboost'

export async function GET() {
  await requireAdmin()
  const db = await getDatabase()
  const products = await db.query(
    `
      SELECT p.*, (
        SELECT public_url
        FROM product_media_assets m
        WHERE m.product_id = p.id AND m.asset_role = 'hero'
        ORDER BY m.id ASC
        LIMIT 1
      ) AS hero_image_url
      FROM products p
      ORDER BY p.updated_at DESC, p.id DESC
    `
  )

  return NextResponse.json({
    affiliateProducts: await listAffiliateProducts(),
    products
  })
}
