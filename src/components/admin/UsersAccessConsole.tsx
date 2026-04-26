'use client'

import { useEffect, useState, useTransition } from 'react'
import { RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { StatusBadge } from '@/components/admin/StatusBadge'
import { Button } from '@/components/ui/button'

type Snapshot = {
  summary: Record<string, number>
  users: Array<Record<string, any>>
  sessions: Array<Record<string, any>>
  loginAttempts: Array<Record<string, any>>
  securityEvents: Array<Record<string, any>>
}

function formatDate(value: unknown) {
  if (!value) return 'N/A'
  const date = new Date(String(value))
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString()
}

function value(value: unknown) {
  if (value == null || value === '') return 'N/A'
  return String(value)
}

export function UsersAccessConsole() {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null)
  const [isPending, startTransition] = useTransition()

  const load = async () => {
    const response = await fetch('/api/admin/users')
    const body = await response.json().catch(() => ({}))
    if (!response.ok) {
      toast.error(body.error || 'Failed to load users')
      return
    }
    setSnapshot(body as Snapshot)
  }

  useEffect(() => {
    void load()
  }, [])

  const runAction = (body: Record<string, unknown>, message: string) => {
    startTransition(async () => {
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) {
        toast.error(payload.error || 'Action failed')
        return
      }
      await load()
      toast.success(message)
    })
  }

  const summary = snapshot?.summary || {}

  return (
    <div className="space-y-6 p-6 lg:p-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.28em] text-primary">Users & Access</p>
          <h1 className="mt-2 font-[var(--font-display)] text-4xl font-semibold tracking-tight">Accounts, sessions, and login governance</h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-muted-foreground">
            Manage active users, unlock accounts, disable access, revoke sessions, and inspect recent login and security events.
          </p>
        </div>
        <Button variant="outline" disabled={isPending} onClick={() => startTransition(load)}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        {[
          ['Users', summary.users],
          ['Active Users', summary.active_users],
          ['Locked Users', summary.locked_users],
          ['Active Sessions', summary.active_sessions]
        ].map(([label, count]) => (
          <div key={String(label)} className="rounded-2xl border border-border bg-white p-5 shadow-panel">
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
            <p className="mt-3 text-3xl font-semibold">{Number(count || 0)}</p>
          </div>
        ))}
      </div>

      <section className="rounded-[24px] border border-border bg-white p-6 shadow-panel">
        <p className="font-semibold">Users</p>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-border text-xs uppercase tracking-[0.16em] text-muted-foreground">
              <tr>
                <th className="pb-3 pr-4">User</th>
                <th className="pb-3 pr-4">Role</th>
                <th className="pb-3 pr-4">Status</th>
                <th className="pb-3 pr-4">Failed</th>
                <th className="pb-3 pr-4">Last Login</th>
                <th className="pb-3 pr-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {(snapshot?.users || []).map((user) => (
                <tr key={user.id} className="border-b border-border/70">
                  <td className="py-3 pr-4">
                    <div className="font-medium">{value(user.display_name || user.username)}</div>
                    <div className="text-xs text-muted-foreground">{value(user.email)}</div>
                  </td>
                  <td className="py-3 pr-4"><StatusBadge value={value(user.role)} /></td>
                  <td className="py-3 pr-4">
                    <StatusBadge value={Number(user.is_active) ? 'active' : 'disabled'} />
                  </td>
                  <td className="py-3 pr-4 text-muted-foreground">{value(user.failed_login_count)}</td>
                  <td className="py-3 pr-4 text-muted-foreground">{formatDate(user.last_login_at)}</td>
                  <td className="py-3 pr-4">
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" variant="outline" disabled={isPending} onClick={() => runAction({ action: 'unlockUser', userId: user.id }, 'User unlocked')}>
                        Unlock
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={isPending}
                        onClick={() => runAction({ action: 'setUserActive', userId: user.id, active: !Number(user.is_active) }, 'User access updated')}
                      >
                        {Number(user.is_active) ? 'Disable' : 'Enable'}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-[24px] border border-border bg-white p-6 shadow-panel">
        <p className="font-semibold">Sessions</p>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-border text-xs uppercase tracking-[0.16em] text-muted-foreground">
              <tr>
                <th className="pb-3 pr-4">User</th>
                <th className="pb-3 pr-4">IP</th>
                <th className="pb-3 pr-4">State</th>
                <th className="pb-3 pr-4">Last Activity</th>
                <th className="pb-3 pr-4">Action</th>
              </tr>
            </thead>
            <tbody>
              {(snapshot?.sessions || []).slice(0, 40).map((session) => (
                <tr key={session.id} className="border-b border-border/70">
                  <td className="py-3 pr-4 font-medium">{value(session.username || `User #${session.user_id}`)}</td>
                  <td className="py-3 pr-4 text-muted-foreground">{value(session.ip_address)}</td>
                  <td className="py-3 pr-4"><StatusBadge value={session.revoked_at ? 'revoked' : 'active'} /></td>
                  <td className="py-3 pr-4 text-muted-foreground">{formatDate(session.last_activity_at)}</td>
                  <td className="py-3 pr-4">
                    {!session.revoked_at ? (
                      <Button size="sm" variant="outline" disabled={isPending} onClick={() => runAction({ action: 'revokeSession', sessionId: session.id }, 'Session revoked')}>
                        Revoke
                      </Button>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
