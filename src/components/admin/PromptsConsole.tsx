'use client'

import { useEffect, useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { StatusBadge } from '@/components/admin/StatusBadge'

type PromptGroup = {
  promptId: string
  category: string
  name: string
  activeVersion: string
  versionCount: number
}

type PromptVersion = {
  id: number
  version: string
  promptContent: string
  isActive: boolean
  createdAt: string
  regressionSummary: {
    activeCases: number
    casesWithExpectedOutput: number
    invalidCases: number
    ready: boolean
  }
}

export function PromptsConsole() {
  const [groups, setGroups] = useState<PromptGroup[]>([])
  const [selectedPromptId, setSelectedPromptId] = useState<string | null>(null)
  const [versions, setVersions] = useState<PromptVersion[]>([])
  const [draft, setDraft] = useState({ promptId: '', category: '', name: '', version: '', promptContent: '' })
  const [isPending, startTransition] = useTransition()

  const loadGroups = async () => {
    const response = await fetch('/api/admin/prompts')
    setGroups(await response.json())
  }

  const loadVersions = async (promptId: string) => {
    const response = await fetch(`/api/admin/prompts/${promptId}`)
    setVersions(await response.json())
  }

  useEffect(() => {
    void loadGroups()
  }, [])

  return (
    <div className="grid gap-4 p-4 sm:p-5 lg:grid-cols-[0.9fr_1.1fr] lg:p-6">
      <section className="space-y-4">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-primary">提示词注册表</p>
          <h1 className="mt-1 font-[var(--font-display)] text-2xl font-semibold tracking-tight">AI 提示词版本管理</h1>
        </div>
        <div className="rounded-2xl border border-border bg-white p-4 shadow-sm">
          <div className="space-y-2">
            {groups.map((group) => (
              <button
                key={group.promptId}
                className="w-full rounded-xl border border-border px-3 py-2.5 text-left transition-colors hover:bg-[#f7f1e4]"
                onClick={() => {
                  setSelectedPromptId(group.promptId)
                  void loadVersions(group.promptId)
                }}
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium">{group.name}</p>
                    <p className="text-xs text-muted-foreground">{group.promptId}</p>
                  </div>
                  <StatusBadge value={group.activeVersion} />
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>
      <section className="space-y-4">
        <div className="rounded-2xl border border-border bg-white p-4 shadow-sm">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-primary">创建版本</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <Input placeholder="promptId" value={draft.promptId} onChange={(event) => setDraft((current) => ({ ...current, promptId: event.target.value }))} />
            <Input placeholder="category" value={draft.category} onChange={(event) => setDraft((current) => ({ ...current, category: event.target.value }))} />
            <Input placeholder="name" value={draft.name} onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))} />
            <Input placeholder="version" value={draft.version} onChange={(event) => setDraft((current) => ({ ...current, version: event.target.value }))} />
          </div>
          <Textarea className="mt-3 min-h-[160px]" placeholder="提示词内容" value={draft.promptContent} onChange={(event) => setDraft((current) => ({ ...current, promptContent: event.target.value }))} />
          <Button
            className="mt-3"
            disabled={isPending || !draft.promptId || !draft.version || !draft.promptContent}
            onClick={() => {
              startTransition(async () => {
                const response = await fetch('/api/admin/prompts', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ ...draft, activate: false })
                })
                if (!response.ok) {
                  toast.error('创建提示词版本失败')
                  return
                }
                toast.success('提示词版本已保存')
                setDraft({ promptId: '', category: '', name: '', version: '', promptContent: '' })
                await loadGroups()
                if (selectedPromptId) await loadVersions(selectedPromptId)
              })
            }}
          >
            保存为未启用版本
          </Button>
        </div>
        <div className="rounded-2xl border border-border bg-white p-4 shadow-sm">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-primary">{selectedPromptId ? `${selectedPromptId} 的版本` : '版本列表'}</p>
          <div className="mt-3 space-y-2">
            {versions.map((version) => (
              <div key={version.id} className="rounded-xl border border-border px-3 py-2.5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{version.version}</p>
                    <p className="text-xs text-muted-foreground">{new Date(version.createdAt).toLocaleString()}</p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      回归用例：{version.regressionSummary.activeCases} 个活跃 · {version.regressionSummary.invalidCases} 个无效
                    </p>
                  </div>
                  <div className="flex flex-wrap justify-end gap-2">
                    <Button
                      size="sm"
                      variant={version.isActive ? 'secondary' : 'default'}
                      disabled={version.isActive || isPending || !selectedPromptId}
                      onClick={() => {
                        startTransition(async () => {
                          const promptId = selectedPromptId
                          if (!promptId) return

                          const response = await fetch(`/api/admin/prompts/${promptId}`, {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ version: version.version })
                          })
                          const body = await response.json().catch(() => ({}))
                          if (!response.ok) {
                            toast.error(body.error || '启用版本失败')
                            return
                          }
                          toast.success('提示词版本已启用')
                          await loadVersions(promptId)
                          await loadGroups()
                        })
                      }}
                    >
                      {version.isActive ? '已启用' : '启用'}
                    </Button>
                    {!version.isActive && !version.regressionSummary.ready ? (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={isPending || !selectedPromptId}
                        onClick={() => {
                          startTransition(async () => {
                            const promptId = selectedPromptId
                            if (!promptId) return

                            const response = await fetch(`/api/admin/prompts/${promptId}`, {
                              method: 'PUT',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ version: version.version, forceActivate: true })
                            })
                            const body = await response.json().catch(() => ({}))
                            if (!response.ok) {
                              toast.error(body.error || '强制启用版本失败')
                              return
                            }
                            toast.success('提示词版本已强制启用')
                            await loadVersions(promptId)
                            await loadGroups()
                          })
                        }}
                      >
                        强制启用
                      </Button>
                    ) : null}
                  </div>
                </div>
                <pre className="mt-3 max-h-64 overflow-x-auto rounded-xl bg-[#f7f1e4] p-3 text-xs leading-6 text-slate-700">{version.promptContent}</pre>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
