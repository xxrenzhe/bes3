import { NextResponse } from 'next/server'
import { requireAdmin, requireAdminPermission } from '@/lib/auth'
import { logAdminAudit } from '@/lib/admin-governance'
import { createPromptVersion, listPromptGroups } from '@/lib/prompts'

export async function GET() {
  await requireAdmin()
  return NextResponse.json(await listPromptGroups())
}

export async function POST(request: Request) {
  const actor = await requireAdminPermission('prompts:write')
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
  await logAdminAudit({
    actor,
    request,
    action: 'prompt_version_created',
    entityType: 'prompt_versions',
    entityId: `${String(body.promptId || '')}:${String(body.version || '')}`,
    after: {
      promptId: String(body.promptId || ''),
      version: String(body.version || ''),
      activate: Boolean(body.activate)
    },
    reason: body.changeNotes ? String(body.changeNotes) : null
  })
  return NextResponse.json({ success: true })
}
