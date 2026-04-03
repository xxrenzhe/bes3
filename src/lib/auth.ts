import { cookies } from 'next/headers'
import { SignJWT, jwtVerify } from 'jose'
import { DEFAULT_ADMIN_USERNAME } from '@/lib/constants'
import { getJwtSecret, verifyPassword } from '@/lib/crypto'
import { getDatabase } from '@/lib/db'

const AUTH_COOKIE_NAME = 'auth_token'

type AuthPayload = {
  userId: number
  username: string
  role: 'admin'
}

export async function authenticateUser(username: string, password: string): Promise<AuthPayload | null> {
  const db = await getDatabase()
  const user = await db.queryOne<{
    id: number
    username: string
    password_hash: string
    role: 'admin'
    is_active: number | boolean
  }>('SELECT id, username, password_hash, role, is_active FROM users WHERE username = ? LIMIT 1', [username])

  if (!user) return null
  if (!(user.is_active === true || user.is_active === 1)) return null
  const passwordMatches = await verifyPassword(password, user.password_hash)
  if (!passwordMatches) return null

  return {
    userId: user.id,
    username: user.username,
    role: user.role
  }
}

export async function createAuthToken(payload: AuthPayload): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(getJwtSecret())
}

export async function readAuthSession(): Promise<AuthPayload | null> {
  const token = cookies().get(AUTH_COOKIE_NAME)?.value
  if (!token) return null

  try {
    const result = await jwtVerify(token, getJwtSecret())
    return result.payload as unknown as AuthPayload
  } catch {
    return null
  }
}

export async function requireAdmin(): Promise<AuthPayload> {
  const session = await readAuthSession()
  if (!session || session.role !== 'admin') {
    throw new Error('UNAUTHORIZED')
  }
  return session
}

export function getAuthCookieName(): string {
  return AUTH_COOKIE_NAME
}

export function getDefaultAdminUsername(): string {
  return DEFAULT_ADMIN_USERNAME
}
