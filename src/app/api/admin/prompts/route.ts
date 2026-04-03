import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { createPromptVersion, listPromptGroups } from '@/lib/prompts'

export async function GET() {
  await requireAdmin()
  return NextResponse.json(await listPromptGroups())
}

export async function POST(request: Request) {
  await requireAdmin()
  const body = await request.json().catch(() => ({}))
  await createPromptVersion({
    promptId: String(body.promptId || ''),
    category: String(body.category || ''),
    name: String(body.name || ''),
    version: String(body.version || ''),
    promptContent: String(body.promptContent || ''),
    changeNotes: body.changeNotes ? String(body.changeNotes) : undefined,
    activate: Boolean(body.activate)
  })
  return NextResponse.json({ success: true })
}
