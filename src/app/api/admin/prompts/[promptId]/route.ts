import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { activatePromptVersion, getPromptVersions } from '@/lib/prompts'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ promptId: string }> }
) {
  await requireAdmin()
  return NextResponse.json(await getPromptVersions((await params).promptId))
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ promptId: string }> }
) {
  await requireAdmin()
  const body = await request.json().catch(() => ({}))
  await activatePromptVersion((await params).promptId, String(body.version || ''))
  return NextResponse.json({ success: true })
}
