import { NextResponse } from 'next/server'
import { readAuthSession } from '@/lib/auth'

export async function GET() {
  const session = await readAuthSession()
  if (!session) {
    return NextResponse.json({ user: null }, { status: 401 })
  }
  return NextResponse.json({
    user: {
      userId: session.userId,
      username: session.username,
      role: session.role,
      mustChangePassword: session.mustChangePassword
    }
  })
}
