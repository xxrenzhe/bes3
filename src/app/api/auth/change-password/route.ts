import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { changeAdminPassword, createAuthToken, getAuthCookieName, readAuthSession } from '@/lib/auth'

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1).max(512),
  nextPassword: z.string().min(12).max(512)
})

export async function POST(request: Request) {
  const session = await readAuthSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const parsed = changePasswordSchema.safeParse(await request.json().catch(() => ({})))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Password does not meet policy.' }, { status: 400 })
  }

  const result = await changeAdminPassword(session, parsed.data.currentPassword, parsed.data.nextPassword)
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 })
  }

  const refreshedSession = {
    ...session,
    mustChangePassword: false
  }
  const token = await createAuthToken(refreshedSession)
  cookies().set(getAuthCookieName(), token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 7
  })

  return NextResponse.json({ success: true })
}
