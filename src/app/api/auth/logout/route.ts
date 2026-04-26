import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { getAuthCookieName, readAuthSession, revokeAuthSession } from '@/lib/auth'

export async function POST(request: Request) {
  const session = await readAuthSession()
  await revokeAuthSession(session)
  cookies().delete(getAuthCookieName())

  const wantsJson = request.headers.get('content-type')?.includes('application/json')
  if (wantsJson) {
    return NextResponse.json({ success: true })
  }

  return NextResponse.redirect(new URL('/login', request.url))
}
