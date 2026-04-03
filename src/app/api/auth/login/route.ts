import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { authenticateUser, createAuthToken, getAuthCookieName } from '@/lib/auth'

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}))
  const username = String(body.username || '').trim()
  const password = String(body.password || '')

  const session = await authenticateUser(username, password)
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

  return NextResponse.json({ success: true, user: session })
}
