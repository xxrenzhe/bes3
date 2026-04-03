import { revalidatePath } from 'next/cache'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const internalToken = request.headers.get('x-bes3-internal-token') || ''
  const expectedToken = process.env.JWT_SECRET || ''

  if (!expectedToken || internalToken !== expectedToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = (await request.json().catch(() => ({}))) as { paths?: string[]; category?: string | null }
  const uniquePaths = Array.from(new Set((Array.isArray(body.paths) ? body.paths : []).filter(Boolean)))

  revalidatePath('/')
  revalidatePath('/directory')
  if (body.category) {
    revalidatePath(`/categories/${body.category}`)
  }
  for (const path of uniquePaths) {
    revalidatePath(path)
  }

  return NextResponse.json({ success: true, paths: uniquePaths })
}
