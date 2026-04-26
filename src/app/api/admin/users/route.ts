import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { logAdminAudit } from '@/lib/admin-governance'
import { getUsersAccessSnapshot, runUsersAccessAction } from '@/lib/admin-blueprint'

export async function GET() {
  await requireAdmin()
  return NextResponse.json(await getUsersAccessSnapshot())
}

export async function POST(request: Request) {
  const actor = await requireAdmin()
  const body = await request.json().catch(() => ({}))
  const result = await runUsersAccessAction({
    actor,
    action: String(body.action || ''),
    userId: Number(body.userId) || undefined,
    sessionId: Number(body.sessionId) || undefined,
    active: body.active == null ? undefined : Boolean(body.active)
  })
  await logAdminAudit({
    actor,
    request,
    action: `users_access_${String(body.action || 'action')}`,
    entityType: body.sessionId ? 'admin_user_sessions' : 'users',
    entityId: body.sessionId || body.userId || null,
    after: result
  })
  return NextResponse.json({ success: true, result })
}
