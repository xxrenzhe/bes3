import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { authenticateUser, createAuthToken, getAuthCookieName } from '@/lib/auth'

const loginSchema = z.object({
  username: z.string().trim().min(1).max(160),
  password: z.string().min(1).max(512)
})

function getClientIp(request: Request): string {
  const forwardedFor = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
  return forwardedFor || request.headers.get('x-real-ip') || 'unknown'
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}))
  const parsed = loginSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid username or password' }, { status: 401 })
  }

  const requestId = request.headers.get('x-request-id') || crypto.randomUUID()
  const session = await authenticateUser(parsed.data.username, parsed.data.password, {
    ipAddress: getClientIp(request),
    userAgent: request.headers.get('user-agent') || 'unknown',
    requestId
  })
  if (!session) {
    return NextResponse.json({ error: 'Invalid username or password' }, { status: 401 })
  }

  const token = await createAuthToken(session)
  cookies().set(getAuthCookieName(), token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 7
  })

  return NextResponse.json({
    success: true,
    user: {
      userId: session.userId,
      username: session.username,
      role: session.role,
      mustChangePassword: session.mustChangePassword
    },
    mustChangePassword: session.mustChangePassword
  })
}
