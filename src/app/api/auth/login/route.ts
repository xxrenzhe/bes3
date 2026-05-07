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

async function readLoginBody(request: Request) {
  const contentType = request.headers.get('content-type') || ''
  if (contentType.includes('application/x-www-form-urlencoded') || contentType.includes('multipart/form-data')) {
    const formData = await request.formData().catch(() => null)
    return {
      isFormPost: true,
      body: formData ? Object.fromEntries(formData.entries()) : {}
    }
  }

  return {
    isFormPost: false,
    body: await request.json().catch(() => ({}))
  }
}

function redirectToLogin(request: Request) {
  const url = new URL('/login', request.url)
  url.searchParams.set('error', 'invalid_credentials')
  return NextResponse.redirect(url, { status: 303 })
}

export async function POST(request: Request) {
  const { body, isFormPost } = await readLoginBody(request)
  const parsed = loginSchema.safeParse(body)
  if (!parsed.success) {
    if (isFormPost) return redirectToLogin(request)
    return NextResponse.json({ error: 'Invalid username or password' }, { status: 401 })
  }

  const requestId = request.headers.get('x-request-id') || crypto.randomUUID()
  const session = await authenticateUser(parsed.data.username, parsed.data.password, {
    ipAddress: getClientIp(request),
    userAgent: request.headers.get('user-agent') || 'unknown',
    requestId
  })
  if (!session) {
    if (isFormPost) return redirectToLogin(request)
    return NextResponse.json({ error: 'Invalid username or password' }, { status: 401 })
  }

  const token = await createAuthToken(session)
  const cookieOptions = {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 7
  } as const

  if (isFormPost) {
    const response = NextResponse.redirect(new URL(session.mustChangePassword ? '/change-password' : '/admin', request.url), { status: 303 })
    response.cookies.set(getAuthCookieName(), token, cookieOptions)
    return response
  }

  ;(await cookies()).set(getAuthCookieName(), token, cookieOptions)

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
