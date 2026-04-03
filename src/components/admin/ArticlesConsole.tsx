'use client'

import { useEffect, useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/admin/StatusBadge'

export function ArticlesConsole() {
  const [articles, setArticles] = useState<any[]>([])
  const [isPending, startTransition] = useTransition()

  const load = async () => {
    const response = await fetch('/api/admin/articles')
    setArticles(await response.json())
  }

  useEffect(() => {
    void load()
  }, [])

  return (
    <div className="space-y-6 p-6 lg:p-10">
      <div>
        <p className="font-mono text-xs uppercase tracking-[0.28em] text-primary">Articles</p>
        <h1 className="mt-2 font-[var(--font-display)] text-4xl font-semibold tracking-tight">Published and draft content</h1>
      </div>
      <div className="rounded-[32px] border border-border bg-white p-8 shadow-panel">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-border text-xs uppercase tracking-[0.18em] text-muted-foreground">
              <tr>
                <th className="pb-3 pr-3">Title</th>
                <th className="pb-3 pr-3">Type</th>
                <th className="pb-3 pr-3">Status</th>
                <th className="pb-3 pr-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {articles.map((article) => (
                <tr key={article.id} className="border-b border-border/70">
                  <td className="py-4 pr-3">
                    <div className="font-medium">{article.title}</div>
                    <div className="text-muted-foreground">{article.product_name}</div>
                  </td>
                  <td className="py-4 pr-3">{article.article_type}</td>
                  <td className="py-4 pr-3"><StatusBadge value={article.status} /></td>
                  <td className="py-4 pr-3">
                    <Button
                      disabled={isPending}
                      variant="secondary"
                      onClick={() => {
                        startTransition(async () => {
                          const response = await fetch(`/api/admin/articles/${article.id}/regenerate`, { method: 'POST' })
                          if (!response.ok) {
                            const body = await response.json().catch(() => ({}))
                            toast.error(body.error || 'Regeneration failed')
                            return
                          }
                          toast.success('Regeneration triggered')
                        })
                      }}
                    >
                      Regenerate
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
