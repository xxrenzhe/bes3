import { NextResponse } from 'next/server'
import { requireAdmin, requireAdminPermission } from '@/lib/auth'
import { logAdminAudit } from '@/lib/admin-governance'
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
  const actor = await requireAdminPermission('prompts:write')
  const { promptId } = await params
  const before = await getPromptVersions(promptId)
  const body = await request.json().catch(() => ({}))
  const version = String(body.version || '')
  await activatePromptVersion(promptId, version)
  await logAdminAudit({
    actor,
    request,
    action: 'prompt_version_activated',
    entityType: 'prompt_versions',
    entityId: `${promptId}:${version}`,
    before: { activeVersion: before.find((item) => item.isActive)?.version || null },
    after: { activeVersion: version }
  })
  return NextResponse.json({ success: true })
}
