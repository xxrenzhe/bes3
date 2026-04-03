'use client'

import { useEffect, useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

type SettingItem = {
  category: string
  key: string
  value: string | null
  dataType: string
  isSensitive: boolean
  description: string | null
}

export function SettingsConsole() {
  const [items, setItems] = useState<SettingItem[]>([])
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    void fetch('/api/admin/settings')
      .then((response) => response.json())
      .then((body) => setItems(body))
  }, [])

  const grouped = items.reduce<Record<string, SettingItem[]>>((accumulator, item) => {
    accumulator[item.category] = accumulator[item.category] || []
    accumulator[item.category].push(item)
    return accumulator
  }, {})

  return (
    <div className="space-y-6 p-6 lg:p-10">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.28em] text-primary">Settings</p>
          <h1 className="mt-2 font-[var(--font-display)] text-4xl font-semibold tracking-tight">AI, proxy, affiliate sync, media, and SEO configuration</h1>
        </div>
        <Button
          disabled={isPending}
          onClick={() => {
            startTransition(async () => {
              const response = await fetch('/api/admin/settings', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ items })
              })
              if (!response.ok) {
                toast.error('Failed to save settings')
                return
              }
              toast.success('Settings saved')
            })
          }}
        >
          Save Settings
        </Button>
      </div>
      <div className="grid gap-6 xl:grid-cols-2">
        {Object.entries(grouped).map(([category, categoryItems]) => (
          <div key={category} className="rounded-[32px] border border-border bg-white p-8 shadow-panel">
            <p className="font-mono text-xs uppercase tracking-[0.24em] text-primary">{category}</p>
            <div className="mt-6 space-y-4">
              {categoryItems.map((item) => (
                <label key={`${item.category}.${item.key}`} className="block space-y-2">
                  <span className="text-sm font-medium">{item.key}</span>
                  <Input
                    value={item.value || ''}
                    type={item.isSensitive ? 'password' : 'text'}
                    onChange={(event) => {
                      const nextValue = event.target.value
                      setItems((current) =>
                        current.map((candidate) =>
                          candidate.category === item.category && candidate.key === item.key
                            ? { ...candidate, value: nextValue }
                            : candidate
                        )
                      )
                    }}
                    className="min-h-[48px] rounded-2xl"
                  />
                  {item.description ? <p className="text-xs leading-6 text-muted-foreground">{item.description}</p> : null}
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
