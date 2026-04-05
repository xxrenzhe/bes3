import { revalidatePath } from 'next/cache'
import { NextResponse } from 'next/server'
import { getBrandSlug } from '@/lib/site-data'

export async function POST(request: Request) {
  const internalToken = request.headers.get('x-bes3-internal-token') || ''
  const expectedToken = process.env.JWT_SECRET || ''

  if (!expectedToken || internalToken !== expectedToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = (await request.json().catch(() => ({}))) as { paths?: string[]; category?: string | null; brand?: string | null }
  const uniquePaths = Array.from(new Set((Array.isArray(body.paths) ? body.paths : []).filter(Boolean)))
  const brandSlug = getBrandSlug(body.brand)

  revalidatePath('/')
  revalidatePath('/brands')
  revalidatePath('/directory')
  if (body.category) {
    revalidatePath(`/categories/${body.category}`)
  }
  if (brandSlug) {
    revalidatePath(`/brands/${brandSlug}`)
  }
  if (brandSlug && body.category) {
    revalidatePath(`/brands/${brandSlug}/categories/${body.category}`)
  }
  for (const path of uniquePaths) {
    revalidatePath(path)
  }

  return NextResponse.json({ success: true, paths: uniquePaths })
}
