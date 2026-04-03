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
    <div className="grid gap-6 p-6 lg:grid-cols-[0.9fr_1.1fr] lg:p-10">
      <section className="space-y-6">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.28em] text-primary">Prompt Registry</p>
          <h1 className="mt-2 font-[var(--font-display)] text-4xl font-semibold tracking-tight">Versioned AI prompts</h1>
        </div>
        <div className="rounded-[32px] border border-border bg-white p-6 shadow-panel">
          <div className="space-y-4">
            {groups.map((group) => (
              <button
                key={group.promptId}
                className="w-full rounded-[24px] border border-border px-5 py-4 text-left transition-colors hover:bg-[#f7f1e4]"
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
      <section className="space-y-6">
        <div className="rounded-[32px] border border-border bg-white p-6 shadow-panel">
          <p className="font-mono text-xs uppercase tracking-[0.24em] text-primary">Create Version</p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Input placeholder="promptId" value={draft.promptId} onChange={(event) => setDraft((current) => ({ ...current, promptId: event.target.value }))} />
            <Input placeholder="category" value={draft.category} onChange={(event) => setDraft((current) => ({ ...current, category: event.target.value }))} />
            <Input placeholder="name" value={draft.name} onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))} />
            <Input placeholder="version" value={draft.version} onChange={(event) => setDraft((current) => ({ ...current, version: event.target.value }))} />
          </div>
          <Textarea className="mt-4 min-h-[200px]" placeholder="Prompt content" value={draft.promptContent} onChange={(event) => setDraft((current) => ({ ...current, promptContent: event.target.value }))} />
          <Button
            className="mt-4"
            disabled={isPending || !draft.promptId || !draft.version || !draft.promptContent}
            onClick={() => {
              startTransition(async () => {
                const response = await fetch('/api/admin/prompts', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ ...draft, activate: true })
                })
                if (!response.ok) {
                  toast.error('Failed to create prompt version')
                  return
                }
                toast.success('Prompt version created')
                setDraft({ promptId: '', category: '', name: '', version: '', promptContent: '' })
                await loadGroups()
                if (selectedPromptId) await loadVersions(selectedPromptId)
              })
            }}
          >
            Save Version
          </Button>
        </div>
        <div className="rounded-[32px] border border-border bg-white p-6 shadow-panel">
          <p className="font-mono text-xs uppercase tracking-[0.24em] text-primary">Versions {selectedPromptId ? `for ${selectedPromptId}` : ''}</p>
          <div className="mt-4 space-y-4">
            {versions.map((version) => (
              <div key={version.id} className="rounded-[24px] border border-border px-5 py-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-medium">{version.version}</p>
                    <p className="text-xs text-muted-foreground">{new Date(version.createdAt).toLocaleString()}</p>
                  </div>
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
                        if (!response.ok) {
                          toast.error('Failed to activate version')
                          return
                        }
                        toast.success('Prompt version activated')
                        await loadVersions(promptId)
                        await loadGroups()
                      })
                    }}
                  >
                    {version.isActive ? 'Active' : 'Activate'}
                  </Button>
                </div>
                <pre className="mt-4 overflow-x-auto rounded-2xl bg-[#f7f1e4] p-4 text-xs leading-6 text-slate-700">{version.promptContent}</pre>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
