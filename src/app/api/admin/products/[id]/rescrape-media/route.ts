import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { rescrapeProductMedia } from '@/lib/pipeline'

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  await requireAdmin()
  await rescrapeProductMedia(Number((await params).id))
  return NextResponse.json({ success: true })
}
