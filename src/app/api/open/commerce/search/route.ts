import { NextRequest, NextResponse } from 'next/server'
import { searchOpenCommerceProducts } from '@/lib/site-data'

function parseNumericParam(value: string | null): number | undefined {
  if (!value) return undefined
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : undefined
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get('q')?.trim() || ''
  const category = searchParams.get('category')?.trim() || undefined
  const minPrice = parseNumericParam(searchParams.get('minPrice'))
  const maxPrice = parseNumericParam(searchParams.get('maxPrice'))
  const limit = parseNumericParam(searchParams.get('limit'))

  const products = await searchOpenCommerceProducts(query, {
    category,
    minPrice,
    maxPrice,
    limit
  })

  return NextResponse.json({
    generatedAt: new Date().toISOString(),
    query,
    category: category || null,
    minPrice: minPrice ?? null,
    maxPrice: maxPrice ?? null,
    total: products.length,
    products
  })
}
