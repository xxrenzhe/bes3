import fs from 'node:fs/promises'
import path from 'node:path'
import { NextResponse } from 'next/server'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ key: string[] }> }
) {
  const filePath = path.join(process.cwd(), process.env.MEDIA_LOCAL_ROOT || 'storage/media', ...(await params).key)
  try {
    const data = await fs.readFile(filePath)
    return new NextResponse(data)
  } catch {
    return NextResponse.json({ error: 'Media not found' }, { status: 404 })
  }
}
