import { NextResponse } from 'next/server'
import { getHardcoreProductBySlug } from '@/lib/hardcore'

export const dynamic = 'force-dynamic'

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const product = await getHardcoreProductBySlug(slug)

  if (!product) {
    return NextResponse.json(
      {
        error: 'not_found',
        message: 'No hardcore evidence product report exists for this slug.'
      },
      { status: 404 }
    )
  }

  return NextResponse.json({
    version: 'bes3-evidence-product-v2',
    product
  })
}
