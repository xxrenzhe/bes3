import { NextResponse } from 'next/server'
import { readMediaAsset } from '@/lib/media'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ key: string[] }> }
) {
  const storageKey = (await params).key.join('/')
  try {
    const asset = await readMediaAsset(storageKey)
    if (!asset) {
      return NextResponse.json({ error: 'Media not found' }, { status: 404 })
    }
    return new NextResponse(Buffer.from(asset.body), {
      headers: {
        'Cache-Control': asset.cacheControl,
        'Content-Type': asset.contentType
      }
    })
  } catch {
    return NextResponse.json({ error: 'Media not found' }, { status: 404 })
  }
}
