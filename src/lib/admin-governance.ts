import type { AuthPayload } from '@/lib/auth'
import { getDatabase } from '@/lib/db'

type AuditInput = {
  actor: AuthPayload
  request?: Request
  action: string
  entityType: string
  entityId?: string | number | null
  before?: unknown
  after?: unknown
  reason?: string | null
}

function getRequestIp(request?: Request): string | null {
  if (!request) return null
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || null
}

function jsonOrNull(value: unknown): string | null {
  if (value === undefined || value === null) return null
  return JSON.stringify(value)
}

export async function logAdminAudit(input: AuditInput): Promise<void> {
  const db = await getDatabase()
  await db.exec(
    `
      INSERT INTO admin_audit_logs (
        actor_id, actor_role, action, entity_type, entity_id, before_json, after_json,
        reason, ip_address, user_agent, request_id, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      input.actor.userId,
      input.actor.role,
      input.action,
      input.entityType,
      input.entityId == null ? null : String(input.entityId),
      jsonOrNull(input.before),
      jsonOrNull(input.after),
      input.reason || null,
      getRequestIp(input.request),
      input.request?.headers.get('user-agent') || null,
      input.request?.headers.get('x-request-id') || null,
      new Date().toISOString()
    ]
  )
}

export async function listAdminGovernanceSnapshot() {
  const db = await getDatabase()
  const [sessions, loginAttempts, securityEvents, auditLogs, riskAlerts] = await Promise.all([
    db.query(
      `
        SELECT s.id, s.user_id, u.username, s.ip_address, s.device_fingerprint, s.is_suspicious,
               s.suspicious_reason, s.last_activity_at, s.expires_at, s.revoked_at, s.created_at
        FROM admin_user_sessions s
        LEFT JOIN users u ON u.id = s.user_id
        ORDER BY s.created_at DESC
        LIMIT 50
      `
    ),
    db.query(
      `
        SELECT id, username_or_email, user_id, ip_address, success, failure_reason, request_id, attempted_at
        FROM admin_login_attempts
        ORDER BY attempted_at DESC
        LIMIT 100
      `
    ),
    db.query(
      `
        SELECT id, user_id, event_type, severity, ip_address, metadata_json, request_id, resolved_at, created_at
        FROM admin_security_events
        ORDER BY created_at DESC
        LIMIT 100
      `
    ),
    db.query(
      `
        SELECT id, actor_id, actor_role, action, entity_type, entity_id, reason, request_id, created_at
        FROM admin_audit_logs
        ORDER BY created_at DESC
        LIMIT 100
      `
    ),
    db.query(
      `
        SELECT id, risk_type, severity, entity_type, entity_id, title, status, detected_at, resolved_at
        FROM admin_risk_alerts
        ORDER BY detected_at DESC
        LIMIT 100
      `
    )
  ])

  return {
    sessions,
    loginAttempts,
    securityEvents,
    auditLogs,
    riskAlerts
  }
}
