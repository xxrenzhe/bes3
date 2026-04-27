import { cookies } from 'next/headers'
import { SignJWT, jwtVerify } from 'jose'
import { createHash, randomBytes } from 'node:crypto'
import { DEFAULT_ADMIN_USERNAME } from '@/lib/constants'
import { getJwtSecret, hashPassword, verifyPassword } from '@/lib/crypto'
import { getDatabase } from '@/lib/db'
import { hasAdminPermission, isAdminRole, type AdminPermission } from '@/lib/admin-permissions'
import type { UserRole } from '@/lib/types'

const AUTH_COOKIE_NAME = 'auth_token'
const SESSION_DURATION_SECONDS = 60 * 60 * 24 * 7
const FAILED_LOGIN_LOCK_THRESHOLD = 5
const LOGIN_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000
const LOGIN_RATE_LIMIT_MAX_FAILURES = 10

export type AuthPayload = {
  userId: number
  username: string
  role: UserRole
  sessionId: number
  jwtId: string
  mustChangePassword: boolean
}

export type AuthRequestContext = {
  ipAddress: string
  userAgent: string
  requestId?: string
}

type UserRow = {
  id: number
  username: string
  email: string
  password_hash: string
  role: UserRole
  is_active: number | boolean
  must_change_password: number | boolean
  failed_login_count: number | null
  locked_until: string | null
}

function nowIso(): string {
  return new Date().toISOString()
}

function isTruthy(value: number | boolean | null | undefined): boolean {
  return value === true || value === 1
}

function hashSessionToken(value: string): string {
  return createHash('sha256').update(value).digest('hex')
}

function getDeviceFingerprint(userAgent: string, ipAddress: string): string {
  const ipPrefix = ipAddress.split('.').slice(0, 2).join('.')
  const normalizedUserAgent = userAgent
    .toLowerCase()
    .replace(/chrome\/[\d.]+/g, 'chrome')
    .replace(/firefox\/[\d.]+/g, 'firefox')
    .replace(/safari\/[\d.]+/g, 'safari')
    .replace(/\s+/g, ' ')
    .trim()

  return createHash('sha256').update(`${ipPrefix}|${normalizedUserAgent}`).digest('hex').slice(0, 32)
}

async function recordLoginAttempt(input: {
  usernameOrEmail: string
  userId?: number
  success: boolean
  failureReason?: string
  context: AuthRequestContext
}): Promise<void> {
  const db = await getDatabase()
  await db.exec(
    `
      INSERT INTO admin_login_attempts (
        username_or_email, user_id, ip_address, user_agent, success, failure_reason, request_id, attempted_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      input.usernameOrEmail,
      input.userId || null,
      input.context.ipAddress,
      input.context.userAgent,
      input.success ? 1 : 0,
      input.failureReason || null,
      input.context.requestId || null,
      nowIso()
    ]
  )
}

async function recordSecurityEvent(input: {
  userId?: number
  eventType: string
  severity?: 'info' | 'warning' | 'critical'
  metadata?: Record<string, unknown>
  context: AuthRequestContext
}): Promise<void> {
  const db = await getDatabase()
  await db.exec(
    `
      INSERT INTO admin_security_events (
        user_id, event_type, severity, ip_address, user_agent, metadata_json, request_id, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      input.userId || null,
      input.eventType,
      input.severity || 'info',
      input.context.ipAddress,
      input.context.userAgent,
      input.metadata ? JSON.stringify(input.metadata) : null,
      input.context.requestId || null,
      nowIso()
    ]
  )
}

async function countRecentFailedAttempts(usernameOrEmail: string, ipAddress: string): Promise<number> {
  const db = await getDatabase()
  const windowStart = new Date(Date.now() - LOGIN_RATE_LIMIT_WINDOW_MS).toISOString()
  const row = await db.queryOne<{ count: number }>(
    `
      SELECT COUNT(*) AS count
      FROM admin_login_attempts
      WHERE success = 0
        AND attempted_at > ?
        AND (username_or_email = ? OR ip_address = ?)
    `,
    [windowStart, usernameOrEmail, ipAddress]
  )
  return Number(row?.count || 0)
}

async function createServerSession(user: UserRow, context: AuthRequestContext): Promise<AuthPayload> {
  const db = await getDatabase()
  const jwtId = randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + SESSION_DURATION_SECONDS * 1000).toISOString()
  const deviceFingerprint = getDeviceFingerprint(context.userAgent, context.ipAddress)
  const sessionTokenHash = hashSessionToken(jwtId)
  const result = await db.exec(
    `
      INSERT INTO admin_user_sessions (
        user_id, session_token_hash, jwt_id, ip_address, user_agent, device_fingerprint, expires_at, created_at, last_activity_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [user.id, sessionTokenHash, jwtId, context.ipAddress, context.userAgent, deviceFingerprint, expiresAt, nowIso(), nowIso()]
  )

  const activeSessions = await db.query<{ id: number }>(
    `
      SELECT id
      FROM admin_user_sessions
      WHERE user_id = ? AND revoked_at IS NULL
      ORDER BY created_at DESC
    `,
    [user.id]
  )
  for (const staleSession of activeSessions.slice(3)) {
    await db.exec('UPDATE admin_user_sessions SET revoked_at = ? WHERE id = ?', [nowIso(), staleSession.id])
  }

  return {
    userId: user.id,
    username: user.username,
    role: user.role,
    sessionId: Number(result.lastInsertRowid),
    jwtId,
    mustChangePassword: isTruthy(user.must_change_password)
  }
}

export async function authenticateUser(
  usernameOrEmail: string,
  password: string,
  context: AuthRequestContext
): Promise<AuthPayload | null> {
  const normalizedUsername = usernameOrEmail.trim()
  if (!normalizedUsername || !password) return null

  if (await countRecentFailedAttempts(normalizedUsername, context.ipAddress) >= LOGIN_RATE_LIMIT_MAX_FAILURES) {
    await recordLoginAttempt({
      usernameOrEmail: normalizedUsername,
      success: false,
      failureReason: 'rate_limited',
      context
    })
    await recordSecurityEvent({
      eventType: 'login_rate_limited',
      severity: 'warning',
      metadata: { usernameOrEmail: normalizedUsername },
      context
    })
    return null
  }

  const db = await getDatabase()
  const user = await db.queryOne<UserRow>(
    `
      SELECT id, username, email, password_hash, role, is_active, must_change_password,
             failed_login_count, locked_until
      FROM users
      WHERE username = ? OR email = ?
      LIMIT 1
    `,
    [normalizedUsername, normalizedUsername]
  )

  const fail = async (failureReason: string, userId?: number) => {
    await recordLoginAttempt({
      usernameOrEmail: normalizedUsername,
      userId,
      success: false,
      failureReason,
      context
    })
    return null
  }

  if (!user) return fail('invalid_credentials')
  if (!isTruthy(user.is_active)) return fail('inactive_user', user.id)
  if (user.locked_until && new Date(user.locked_until).getTime() > Date.now()) {
    return fail('locked_user', user.id)
  }

  const passwordMatches = await verifyPassword(password, user.password_hash)
  if (!passwordMatches) {
    const failedLoginCount = Number(user.failed_login_count || 0) + 1
    const lockedUntil =
      failedLoginCount >= FAILED_LOGIN_LOCK_THRESHOLD
        ? new Date(Date.now() + 30 * 60 * 1000).toISOString()
        : null
    await db.exec(
      `
        UPDATE users
        SET failed_login_count = ?, last_failed_login = ?, locked_until = COALESCE(?, locked_until), updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
      [failedLoginCount, nowIso(), lockedUntil, user.id]
    )
    if (lockedUntil) {
      await recordSecurityEvent({
        userId: user.id,
        eventType: 'account_locked',
        severity: 'warning',
        metadata: { failedLoginCount, lockedUntil },
        context
      })
    }
    return fail('invalid_credentials', user.id)
  }

  await db.exec(
    `
      UPDATE users
      SET failed_login_count = 0, locked_until = NULL, last_failed_login = NULL, last_login_at = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `,
    [nowIso(), user.id]
  )
  await recordLoginAttempt({
    usernameOrEmail: normalizedUsername,
    userId: user.id,
    success: true,
    context
  })
  const payload = await createServerSession(user, context)
  await recordSecurityEvent({
    userId: user.id,
    eventType: 'login_success',
    severity: payload.mustChangePassword ? 'warning' : 'info',
    metadata: { sessionId: payload.sessionId, mustChangePassword: payload.mustChangePassword },
    context
  })
  return payload
}

export async function createAuthToken(payload: AuthPayload): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setJti(payload.jwtId)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION_SECONDS}s`)
    .sign(getJwtSecret())
}

export async function readAuthSession(): Promise<AuthPayload | null> {
  const token = (await cookies()).get(AUTH_COOKIE_NAME)?.value
  if (!token) return null

  try {
    const result = await jwtVerify(token, getJwtSecret())
    const payload = result.payload as unknown as AuthPayload
    if (!payload.jwtId || !payload.sessionId || !payload.userId) return null

    const db = await getDatabase()
    const session = await db.queryOne<{
      id: number
      user_id: number
      expires_at: string
      revoked_at: string | null
      is_active: number | boolean
      must_change_password: number | boolean
      username: string
      role: UserRole
    }>(
      `
        SELECT s.id, s.user_id, s.expires_at, s.revoked_at, u.is_active, u.must_change_password, u.username, u.role
        FROM admin_user_sessions s
        JOIN users u ON u.id = s.user_id
        WHERE s.id = ? AND s.session_token_hash = ?
        LIMIT 1
      `,
      [payload.sessionId, hashSessionToken(payload.jwtId)]
    )

    if (!session) return null
    if (session.revoked_at) return null
    if (new Date(session.expires_at).getTime() <= Date.now()) return null
    if (!isTruthy(session.is_active)) return null

    await db.exec('UPDATE admin_user_sessions SET last_activity_at = ? WHERE id = ?', [nowIso(), session.id])
    return {
      userId: session.user_id,
      username: session.username,
      role: session.role,
      sessionId: session.id,
      jwtId: payload.jwtId,
      mustChangePassword: isTruthy(session.must_change_password)
    }
  } catch {
    return null
  }
}

export async function revokeAuthSession(payload: AuthPayload | null): Promise<void> {
  if (!payload) return
  const db = await getDatabase()
  await db.exec('UPDATE admin_user_sessions SET revoked_at = ? WHERE id = ?', [nowIso(), payload.sessionId])
}

export async function changeAdminPassword(
  payload: AuthPayload,
  currentPassword: string,
  nextPassword: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (nextPassword.length < 12) {
    return { ok: false, error: 'Password must be at least 12 characters.' }
  }
  if (!/[a-z]/.test(nextPassword) || !/[A-Z]/.test(nextPassword) || !/\d/.test(nextPassword) || !/[^A-Za-z0-9]/.test(nextPassword)) {
    return { ok: false, error: 'Password must include uppercase, lowercase, number, and symbol characters.' }
  }

  const db = await getDatabase()
  const user = await db.queryOne<{ password_hash: string }>('SELECT password_hash FROM users WHERE id = ? LIMIT 1', [payload.userId])
  if (!user) return { ok: false, error: 'User not found.' }
  const currentPasswordMatches = await verifyPassword(currentPassword, user.password_hash)
  if (!currentPasswordMatches) return { ok: false, error: 'Current password is incorrect.' }

  const nextPasswordHash = await hashPassword(nextPassword)
  await db.transaction(async () => {
    await db.exec('INSERT INTO admin_password_history (user_id, password_hash, created_at) VALUES (?, ?, ?)', [
      payload.userId,
      user.password_hash,
      nowIso()
    ])
    await db.exec(
      `
        UPDATE users
        SET password_hash = ?, must_change_password = 0, failed_login_count = 0,
            locked_until = NULL, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
      [nextPasswordHash, payload.userId]
    )
    await db.exec('UPDATE admin_user_sessions SET revoked_at = ? WHERE user_id = ? AND id <> ?', [
      nowIso(),
      payload.userId,
      payload.sessionId
    ])
  })

  return { ok: true }
}

export async function requireAdmin(): Promise<AuthPayload> {
  const session = await readAuthSession()
  if (!session || !isAdminRole(session.role)) {
    throw new Error('UNAUTHORIZED')
  }
  return session
}

export async function requireAdminPermission(permission: AdminPermission): Promise<AuthPayload> {
  const session = await requireAdmin()
  if (!hasAdminPermission(session.role, permission)) {
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
