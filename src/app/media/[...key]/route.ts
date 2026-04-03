import fs from 'node:fs/promises'
import path from 'node:path'
import { NextResponse } from 'next/server'
import { getResolvedLocalMediaRoot } from '@/lib/media'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ key: string[] }> }
) {
  const filePath = path.join(await getResolvedLocalMediaRoot(), ...(await params).key)
  try {
    const data = await fs.readFile(filePath)
    return new NextResponse(data)
  } catch {
    return NextResponse.json({ error: 'Media not found' }, { status: 404 })
  }
}
