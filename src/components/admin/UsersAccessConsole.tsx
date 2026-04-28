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
  rolePermissions: Array<Record<string, any>>
}

function formatDate(value: unknown) {
  if (!value) return '暂无'
  const date = new Date(String(value))
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString()
}

function value(value: unknown) {
  if (value == null || value === '') return '暂无'
  return String(value)
}

export function UsersAccessConsole() {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null)
  const [isPending, startTransition] = useTransition()

  const load = async () => {
    const response = await fetch('/api/admin/users')
    const body = await response.json().catch(() => ({}))
    if (!response.ok) {
      toast.error(body.error || '加载用户失败')
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
        toast.error(payload.error || '操作失败')
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
          <p className="font-mono text-xs uppercase tracking-[0.28em] text-primary">用户权限</p>
          <h1 className="mt-2 font-[var(--font-display)] text-4xl font-semibold tracking-tight">账号、会话与登录治理</h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-muted-foreground">
            管理用户启停、账号解锁、会话撤销，并查看近期登录与安全事件。
          </p>
        </div>
        <Button variant="outline" disabled={isPending} onClick={() => startTransition(load)}>
          <RefreshCw className="mr-2 h-4 w-4" />
          刷新
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        {[
          ['用户数', summary.users],
          ['活跃用户', summary.active_users],
          ['锁定用户', summary.locked_users],
          ['活跃会话', summary.active_sessions]
        ].map(([label, count]) => (
          <div key={String(label)} className="rounded-2xl border border-border bg-white p-5 shadow-panel">
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
            <p className="mt-3 text-3xl font-semibold">{Number(count || 0)}</p>
          </div>
        ))}
      </div>

      <section className="rounded-[24px] border border-border bg-white p-6 shadow-panel">
        <p className="font-semibold">用户列表</p>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-border text-xs uppercase tracking-[0.16em] text-muted-foreground">
              <tr>
                <th className="pb-3 pr-4">用户</th>
                <th className="pb-3 pr-4">角色</th>
                <th className="pb-3 pr-4">状态</th>
                <th className="pb-3 pr-4">失败次数</th>
                <th className="pb-3 pr-4">最近登录</th>
                <th className="pb-3 pr-4">操作</th>
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
                      <Button size="sm" variant="outline" disabled={isPending} onClick={() => runAction({ action: 'unlockUser', userId: user.id }, '用户已解锁')}>
                        解锁
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={isPending}
                        onClick={() => runAction({ action: 'setUserActive', userId: user.id, active: !Number(user.is_active) }, '用户权限已更新')}
                      >
                        {Number(user.is_active) ? '停用' : '启用'}
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
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-semibold">角色权限矩阵</p>
            <p className="mt-1 text-sm text-muted-foreground">Planv2 运营角色及其可写入的系统范围。</p>
          </div>
          <StatusBadge value={`${snapshot?.rolePermissions.length || 0} grants`} />
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          {['admin', 'evidence_ops', 'content_seo_editor', 'commerce_ops', 'viewer'].map((role) => {
            const permissions = (snapshot?.rolePermissions || []).filter((item) => item.role === role && Number(item.allowed))
            return (
              <div key={role} className="rounded-2xl border border-border bg-slate-50 p-4">
                <p className="text-sm font-semibold capitalize text-slate-950">{role.replace(/_/g, ' ')}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {permissions.map((item) => (
                    <StatusBadge key={`${role}-${item.permission}`} value={String(item.permission)} />
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </section>

      <section className="rounded-[24px] border border-border bg-white p-6 shadow-panel">
        <p className="font-semibold">会话</p>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-border text-xs uppercase tracking-[0.16em] text-muted-foreground">
              <tr>
                <th className="pb-3 pr-4">用户</th>
                <th className="pb-3 pr-4">IP</th>
                <th className="pb-3 pr-4">状态</th>
                <th className="pb-3 pr-4">最近活动</th>
                <th className="pb-3 pr-4">操作</th>
              </tr>
            </thead>
            <tbody>
              {(snapshot?.sessions || []).slice(0, 40).map((session) => (
                <tr key={session.id} className="border-b border-border/70">
                  <td className="py-3 pr-4 font-medium">{value(session.username || `用户 #${session.user_id}`)}</td>
                  <td className="py-3 pr-4 text-muted-foreground">{value(session.ip_address)}</td>
                  <td className="py-3 pr-4"><StatusBadge value={session.revoked_at ? 'revoked' : 'active'} /></td>
                  <td className="py-3 pr-4 text-muted-foreground">{formatDate(session.last_activity_at)}</td>
                  <td className="py-3 pr-4">
                    {!session.revoked_at ? (
                      <Button size="sm" variant="outline" disabled={isPending} onClick={() => runAction({ action: 'revokeSession', sessionId: session.id }, '会话已撤销')}>
                        撤销
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
