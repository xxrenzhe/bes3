'use client'

import { useEffect, useState, useTransition } from 'react'
import { RefreshCw, ShieldAlert, ShieldCheck, UserCheck } from 'lucide-react'
import { toast } from 'sonner'
import { StatusBadge } from '@/components/admin/StatusBadge'
import { Button } from '@/components/ui/button'

type GovernanceSnapshot = {
  sessions: Array<Record<string, any>>
  loginAttempts: Array<Record<string, any>>
  securityEvents: Array<Record<string, any>>
  auditLogs: Array<Record<string, any>>
  riskAlerts: Array<Record<string, any>>
}

const EMPTY_SNAPSHOT: GovernanceSnapshot = {
  sessions: [],
  loginAttempts: [],
  securityEvents: [],
  auditLogs: [],
  riskAlerts: []
}

function formatDate(value: unknown) {
  if (!value) return 'N/A'
  const date = new Date(String(value))
  if (Number.isNaN(date.getTime())) return String(value)
  return date.toLocaleString()
}

function text(value: unknown, fallback = 'N/A') {
  if (value == null || value === '') return fallback
  return String(value)
}

function countActiveSessions(snapshot: GovernanceSnapshot) {
  return snapshot.sessions.filter((session) => !session.revoked_at && new Date(String(session.expires_at)).getTime() > Date.now()).length
}

function countFailedLogins(snapshot: GovernanceSnapshot) {
  return snapshot.loginAttempts.filter((attempt) => !Number(attempt.success)).length
}

function countOpenRisks(snapshot: GovernanceSnapshot) {
  return snapshot.riskAlerts.filter((alert) => alert.status === 'open').length
}

export function GovernanceConsole() {
  const [snapshot, setSnapshot] = useState<GovernanceSnapshot>(EMPTY_SNAPSHOT)
  const [isPending, startTransition] = useTransition()

  const loadSnapshot = async () => {
    const response = await fetch('/api/admin/governance')
    const body = await response.json().catch(() => ({}))
    if (!response.ok) {
      toast.error(body.error || 'Governance snapshot failed')
      return
    }
    setSnapshot(body as GovernanceSnapshot)
  }

  useEffect(() => {
    void loadSnapshot()
  }, [])

  const activeSessions = countActiveSessions(snapshot)
  const failedLogins = countFailedLogins(snapshot)
  const openRisks = countOpenRisks(snapshot)

  return (
    <div className="space-y-6 p-6 lg:p-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.28em] text-primary">Governance</p>
          <h1 className="mt-2 font-[var(--font-display)] text-4xl font-semibold tracking-tight">Sessions, audit, security, and risk</h1>
        </div>
        <Button
          variant="outline"
          disabled={isPending}
          onClick={() => {
            startTransition(async () => {
              await loadSnapshot()
            })
          }}
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-4">
        <div className="rounded-2xl border border-border bg-white p-5 shadow-panel">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Active Sessions</p>
            <UserCheck className="h-4 w-4 text-primary" />
          </div>
          <p className="mt-3 text-2xl font-semibold">{activeSessions}</p>
          <p className="mt-1 text-sm text-muted-foreground">{snapshot.sessions.length} recent sessions</p>
        </div>
        <div className="rounded-2xl border border-border bg-white p-5 shadow-panel">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Failed Logins</p>
            <ShieldAlert className="h-4 w-4 text-primary" />
          </div>
          <p className="mt-3 text-2xl font-semibold">{failedLogins}</p>
          <p className="mt-1 text-sm text-muted-foreground">{snapshot.loginAttempts.length} attempts retained</p>
        </div>
        <div className="rounded-2xl border border-border bg-white p-5 shadow-panel">
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Security Events</p>
          <p className="mt-3 text-2xl font-semibold">{snapshot.securityEvents.length}</p>
          <p className="mt-1 text-sm text-muted-foreground">account and session signals</p>
        </div>
        <div className="rounded-2xl border border-border bg-white p-5 shadow-panel">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Open Risks</p>
            <ShieldCheck className="h-4 w-4 text-primary" />
          </div>
          <p className="mt-3 text-2xl font-semibold">{openRisks}</p>
          <p className="mt-1 text-sm text-muted-foreground">{snapshot.riskAlerts.length} recent risk rows</p>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="rounded-[24px] border border-border bg-white p-6 shadow-panel">
          <p className="font-semibold">Recent sessions</p>
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-border text-xs uppercase tracking-[0.16em] text-muted-foreground">
                <tr>
                  <th className="pb-3 pr-3">User</th>
                  <th className="pb-3 pr-3">Status</th>
                  <th className="pb-3 pr-3">IP</th>
                  <th className="pb-3 pr-3">Last Activity</th>
                </tr>
              </thead>
              <tbody>
                {snapshot.sessions.slice(0, 12).map((session) => (
                  <tr key={session.id} className="border-b border-border/70">
                    <td className="py-3 pr-3 font-medium">{text(session.username, `User #${session.user_id}`)}</td>
                    <td className="py-3 pr-3">
                      <StatusBadge value={session.revoked_at ? 'revoked' : 'active'} />
                    </td>
                    <td className="py-3 pr-3 text-muted-foreground">{text(session.ip_address)}</td>
                    <td className="py-3 pr-3 text-muted-foreground">{formatDate(session.last_activity_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-[24px] border border-border bg-white p-6 shadow-panel">
          <p className="font-semibold">Login attempts</p>
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-border text-xs uppercase tracking-[0.16em] text-muted-foreground">
                <tr>
                  <th className="pb-3 pr-3">Identity</th>
                  <th className="pb-3 pr-3">Result</th>
                  <th className="pb-3 pr-3">IP</th>
                  <th className="pb-3 pr-3">Attempted</th>
                </tr>
              </thead>
              <tbody>
                {snapshot.loginAttempts.slice(0, 12).map((attempt) => (
                  <tr key={attempt.id} className="border-b border-border/70">
                    <td className="py-3 pr-3 font-medium">{text(attempt.username_or_email)}</td>
                    <td className="py-3 pr-3">
                      <StatusBadge value={Number(attempt.success) ? 'success' : text(attempt.failure_reason, 'failed')} />
                    </td>
                    <td className="py-3 pr-3 text-muted-foreground">{text(attempt.ip_address)}</td>
                    <td className="py-3 pr-3 text-muted-foreground">{formatDate(attempt.attempted_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <section className="rounded-[24px] border border-border bg-white p-6 shadow-panel">
          <p className="font-semibold">Security events</p>
          <div className="mt-4 space-y-3">
            {snapshot.securityEvents.slice(0, 10).map((event) => (
              <div key={event.id} className="rounded-2xl border border-border p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{text(event.event_type)}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{formatDate(event.created_at)} · {text(event.ip_address)}</p>
                  </div>
                  <StatusBadge value={text(event.severity, 'info')} />
                </div>
              </div>
            ))}
            {snapshot.securityEvents.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border p-5 text-sm text-muted-foreground">
                No security events recorded.
              </div>
            ) : null}
          </div>
        </section>

        <section className="rounded-[24px] border border-border bg-white p-6 shadow-panel">
          <p className="font-semibold">Audit log</p>
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-border text-xs uppercase tracking-[0.16em] text-muted-foreground">
                <tr>
                  <th className="pb-3 pr-3">Action</th>
                  <th className="pb-3 pr-3">Entity</th>
                  <th className="pb-3 pr-3">Actor</th>
                  <th className="pb-3 pr-3">Created</th>
                </tr>
              </thead>
              <tbody>
                {snapshot.auditLogs.slice(0, 14).map((entry) => (
                  <tr key={entry.id} className="border-b border-border/70">
                    <td className="py-3 pr-3 font-medium">{text(entry.action)}</td>
                    <td className="py-3 pr-3 text-muted-foreground">{text(entry.entity_type)} {entry.entity_id ? `#${entry.entity_id}` : ''}</td>
                    <td className="py-3 pr-3 text-muted-foreground">{text(entry.actor_role)} #{text(entry.actor_id)}</td>
                    <td className="py-3 pr-3 text-muted-foreground">{formatDate(entry.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <section className="rounded-[24px] border border-border bg-white p-6 shadow-panel">
        <p className="font-semibold">Risk alerts</p>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {snapshot.riskAlerts.slice(0, 12).map((alert) => (
            <div key={alert.id} className="rounded-2xl border border-border p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <p className="font-medium">{text(alert.title)}</p>
                <StatusBadge value={text(alert.severity, 'warning')} />
              </div>
              <p className="mt-2 text-sm text-muted-foreground">{text(alert.risk_type)} · {text(alert.entity_type)} {alert.entity_id ? `#${alert.entity_id}` : ''}</p>
              <p className="mt-2 text-xs text-muted-foreground">Detected {formatDate(alert.detected_at)}</p>
            </div>
          ))}
          {snapshot.riskAlerts.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border p-5 text-sm text-muted-foreground">
              No risk alerts recorded.
            </div>
          ) : null}
        </div>
      </section>
    </div>
  )
}
