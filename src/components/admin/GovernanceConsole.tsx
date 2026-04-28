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
  if (!value) return '暂无'
  const date = new Date(String(value))
  if (Number.isNaN(date.getTime())) return String(value)
  return date.toLocaleString()
}

function text(value: unknown, fallback = '暂无') {
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
      toast.error(body.error || '加载治理快照失败')
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
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="page-title">安全治理</h1>
          <p className="page-subtitle">查看会话、审计、安全事件与风险提醒</p>
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
          刷新
        </Button>
      </div>

      <div className="grid gap-3 lg:grid-cols-4">
        <div className="min-w-0 rounded-lg border bg-card p-3 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-medium text-muted-foreground">活跃会话</p>
            <UserCheck className="h-4 w-4 text-primary" />
          </div>
          <p className="mt-1 text-2xl font-bold">{activeSessions}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">保留 {snapshot.sessions.length} 条近期会话</p>
        </div>
        <div className="min-w-0 rounded-lg border bg-card p-3 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-medium text-muted-foreground">失败登录</p>
            <ShieldAlert className="h-4 w-4 text-primary" />
          </div>
          <p className="mt-1 text-2xl font-bold">{failedLogins}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">保留 {snapshot.loginAttempts.length} 次尝试</p>
        </div>
        <div className="min-w-0 rounded-lg border bg-card p-3 shadow-sm">
          <p className="text-sm font-medium text-muted-foreground">安全事件</p>
          <p className="mt-1 text-2xl font-bold">{snapshot.securityEvents.length}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">账号与会话信号</p>
        </div>
        <div className="min-w-0 rounded-lg border bg-card p-3 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-medium text-muted-foreground">未处理风险</p>
            <ShieldCheck className="h-4 w-4 text-primary" />
          </div>
          <p className="mt-1 text-2xl font-bold">{openRisks}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">近期 {snapshot.riskAlerts.length} 条风险记录</p>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <section className="min-w-0 rounded-lg border bg-card p-4 shadow-sm">
          <p className="font-semibold">近期会话</p>
          <div className="mt-3 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b bg-white text-xs text-muted-foreground">
                <tr>
                  <th className="pb-2 pr-3">用户</th>
                  <th className="pb-2 pr-3">状态</th>
                  <th className="pb-2 pr-3">IP</th>
                  <th className="pb-2 pr-3">最近活动</th>
                </tr>
              </thead>
              <tbody>
                {snapshot.sessions.slice(0, 12).map((session) => (
                  <tr key={session.id} className="border-b border-border/70 hover:bg-muted/30">
                    <td className="py-2 pr-3 font-medium">{text(session.username, `用户 #${session.user_id}`)}</td>
                    <td className="py-2 pr-3">
                      <StatusBadge value={session.revoked_at ? 'revoked' : 'active'} />
                    </td>
                    <td className="py-2 pr-3 text-muted-foreground">{text(session.ip_address)}</td>
                    <td className="py-2 pr-3 text-muted-foreground">{formatDate(session.last_activity_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="min-w-0 rounded-lg border bg-card p-4 shadow-sm">
          <p className="font-semibold">登录尝试</p>
          <div className="mt-3 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b bg-white text-xs text-muted-foreground">
                <tr>
                  <th className="pb-2 pr-3">身份</th>
                  <th className="pb-2 pr-3">结果</th>
                  <th className="pb-2 pr-3">IP</th>
                  <th className="pb-2 pr-3">尝试时间</th>
                </tr>
              </thead>
              <tbody>
                {snapshot.loginAttempts.slice(0, 12).map((attempt) => (
                  <tr key={attempt.id} className="border-b border-border/70 hover:bg-muted/30">
                    <td className="py-2 pr-3 font-medium">{text(attempt.username_or_email)}</td>
                    <td className="py-2 pr-3">
                      <StatusBadge value={Number(attempt.success) ? 'success' : text(attempt.failure_reason, 'failed')} />
                    </td>
                    <td className="py-2 pr-3 text-muted-foreground">{text(attempt.ip_address)}</td>
                    <td className="py-2 pr-3 text-muted-foreground">{formatDate(attempt.attempted_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <section className="min-w-0 rounded-lg border bg-card p-4 shadow-sm">
          <p className="font-semibold">安全事件</p>
          <div className="mt-3 space-y-2">
            {snapshot.securityEvents.slice(0, 10).map((event) => (
              <div key={event.id} className="rounded-md border p-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{text(event.event_type)}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{formatDate(event.created_at)} · {text(event.ip_address)}</p>
                  </div>
                  <StatusBadge value={text(event.severity, 'info')} />
                </div>
              </div>
            ))}
            {snapshot.securityEvents.length === 0 ? (
              <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                暂无安全事件。
              </div>
            ) : null}
          </div>
        </section>

        <section className="min-w-0 rounded-lg border bg-card p-4 shadow-sm">
          <p className="font-semibold">审计日志</p>
          <div className="mt-3 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b bg-white text-xs text-muted-foreground">
                <tr>
                  <th className="pb-2 pr-3">动作</th>
                  <th className="pb-2 pr-3">实体</th>
                  <th className="pb-2 pr-3">操作者</th>
                  <th className="pb-2 pr-3">创建时间</th>
                </tr>
              </thead>
              <tbody>
                {snapshot.auditLogs.slice(0, 14).map((entry) => (
                  <tr key={entry.id} className="border-b border-border/70 hover:bg-muted/30">
                    <td className="py-2 pr-3 font-medium">{text(entry.action)}</td>
                    <td className="py-2 pr-3 text-muted-foreground">{text(entry.entity_type)} {entry.entity_id ? `#${entry.entity_id}` : ''}</td>
                    <td className="py-2 pr-3 text-muted-foreground">{text(entry.actor_role)} #{text(entry.actor_id)}</td>
                    <td className="py-2 pr-3 text-muted-foreground">{formatDate(entry.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <section className="min-w-0 rounded-lg border bg-card p-4 shadow-sm">
        <p className="font-semibold">风险提醒</p>
        <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
          {snapshot.riskAlerts.slice(0, 12).map((alert) => (
            <div key={alert.id} className="rounded-md border p-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <p className="font-medium">{text(alert.title)}</p>
                <StatusBadge value={text(alert.severity, 'warning')} />
              </div>
              <p className="mt-1.5 text-sm text-muted-foreground">{text(alert.risk_type)} · {text(alert.entity_type)} {alert.entity_id ? `#${alert.entity_id}` : ''}</p>
              <p className="mt-1 text-xs text-muted-foreground">发现时间 {formatDate(alert.detected_at)}</p>
            </div>
          ))}
          {snapshot.riskAlerts.length === 0 ? (
            <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
              暂无风险提醒。
            </div>
          ) : null}
        </div>
      </section>
    </div>
  )
}
