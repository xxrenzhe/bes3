'use client'

import Link from 'next/link'
import { useEffect, useState, useTransition } from 'react'
import { ArrowUpRight, FileSearch } from 'lucide-react'
import { toast } from 'sonner'
import { buttonVariants, Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/admin/StatusBadge'
import { cn } from '@/lib/utils'

type ArticleRow = {
  id: number
  product_id: number | null
  article_type: string
  title: string
  slug: string
  status: string
  summary: string | null
  keyword: string | null
  hero_image_url: string | null
  seo_title: string | null
  seo_description: string | null
  product_name: string | null
  published_at: string | null
  updated_at: string
}

function getArticlePath(articleType: string, slug: string) {
  if (articleType === 'comparison') return `/compare/${slug}`
  if (articleType === 'guide') return `/guides/${slug}`
  return `/reviews/${slug}`
}

function formatDate(value: string | null) {
  if (!value) return 'N/A'
  return new Date(value).toLocaleString()
}

export function ArticlesConsole() {
  const [articles, setArticles] = useState<ArticleRow[]>([])
  const [selectedArticleId, setSelectedArticleId] = useState<number | null>(null)
  const [isPending, startTransition] = useTransition()

  const load = async () => {
    const response = await fetch('/api/admin/articles')
    const rows = (await response.json()) as ArticleRow[]
    setArticles(rows)
    setSelectedArticleId((current) => {
      if (current && rows.some((item) => item.id === current)) return current
      return rows[0]?.id || null
    })
  }

  useEffect(() => {
    void load()
  }, [])

  const selectedArticle = articles.find((article) => article.id === selectedArticleId) || null

  return (
    <div className="space-y-6 p-6 lg:p-10">
      <div>
        <p className="font-mono text-xs uppercase tracking-[0.28em] text-primary">Articles</p>
        <h1 className="mt-2 font-[var(--font-display)] text-4xl font-semibold tracking-tight">Content output with workspace linkage</h1>
      </div>
      <div className="grid gap-6 xl:grid-cols-[1.06fr_0.94fr]">
        <div className="rounded-[32px] border border-border bg-white p-8 shadow-panel">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-border text-xs uppercase tracking-[0.18em] text-muted-foreground">
                <tr>
                  <th className="pb-3 pr-3">Title</th>
                  <th className="pb-3 pr-3">Type</th>
                  <th className="pb-3 pr-3">Status</th>
                  <th className="pb-3 pr-3">Updated</th>
                </tr>
              </thead>
              <tbody>
                {articles.map((article) => (
                  <tr
                    key={article.id}
                    className={cn(
                      'cursor-pointer border-b border-border/70 transition-colors hover:bg-[#f7f1e4]',
                      selectedArticleId === article.id ? 'bg-[#f7f1e4]' : ''
                    )}
                    onClick={() => setSelectedArticleId(article.id)}
                  >
                    <td className="py-4 pr-3">
                      <div className="font-medium">{article.title}</div>
                      <div className="text-muted-foreground">{article.product_name}</div>
                    </td>
                    <td className="py-4 pr-3">{article.article_type}</td>
                    <td className="py-4 pr-3"><StatusBadge value={article.status} /></td>
                    <td className="py-4 pr-3 text-muted-foreground">{formatDate(article.updated_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-[32px] border border-border bg-white p-8 shadow-panel">
          {selectedArticle ? (
            <div className="space-y-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="flex flex-wrap gap-2">
                    <StatusBadge value={selectedArticle.article_type} />
                    <StatusBadge value={selectedArticle.status} />
                  </div>
                  <h2 className="mt-3 font-[var(--font-display)] text-3xl font-semibold tracking-tight">{selectedArticle.title}</h2>
                  <p className="mt-3 text-sm leading-7 text-muted-foreground">
                    {selectedArticle.summary || 'No article summary captured yet.'}
                  </p>
                </div>
                <FileSearch className="h-6 w-6 text-primary" />
              </div>

              <div className="flex flex-wrap gap-3">
                <Link
                  href={getArticlePath(selectedArticle.article_type, selectedArticle.slug)}
                  target="_blank"
                  className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'rounded-full')}
                >
                  <ArrowUpRight className="mr-2 h-4 w-4" />
                  Open Public Page
                </Link>
                {selectedArticle.product_id ? (
                  <Link
                    href={`/admin/products/${selectedArticle.product_id}`}
                    className={cn(buttonVariants({ variant: 'secondary', size: 'sm' }), 'rounded-full')}
                  >
                    Open Workspace
                  </Link>
                ) : null}
                <Button
                  size="sm"
                  disabled={isPending}
                  onClick={() => {
                    startTransition(async () => {
                      const response = await fetch(`/api/admin/articles/${selectedArticle.id}/regenerate`, { method: 'POST' })
                      if (!response.ok) {
                        const body = await response.json().catch(() => ({}))
                        toast.error(body.error || 'Regeneration failed')
                        return
                      }
                      await load()
                      toast.success('Regeneration triggered')
                    })
                  }}
                >
                  Regenerate
                </Button>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-[24px] border border-border p-5">
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Keyword</p>
                  <p className="mt-2 text-sm font-medium">{selectedArticle.keyword || 'N/A'}</p>
                </div>
                <div className="rounded-[24px] border border-border p-5">
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Product</p>
                  <p className="mt-2 text-sm font-medium">{selectedArticle.product_name || 'No linked product'}</p>
                </div>
              </div>

              <div className="rounded-[24px] border border-border p-5">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">SEO Title</p>
                <p className="mt-2 text-sm font-medium">{selectedArticle.seo_title || 'N/A'}</p>
                <p className="mt-5 text-xs uppercase tracking-[0.18em] text-muted-foreground">SEO Description</p>
                <p className="mt-2 text-sm leading-7 text-muted-foreground">{selectedArticle.seo_description || 'N/A'}</p>
              </div>

              <div className="rounded-[24px] border border-border p-5">
                <div className="flex items-start justify-between gap-4 text-sm">
                  <span className="text-muted-foreground">Published</span>
                  <span className="font-medium">{formatDate(selectedArticle.published_at)}</span>
                </div>
                <div className="mt-3 flex items-start justify-between gap-4 text-sm">
                  <span className="text-muted-foreground">Updated</span>
                  <span className="font-medium">{formatDate(selectedArticle.updated_at)}</span>
                </div>
                <div className="mt-3 flex items-start justify-between gap-4 text-sm">
                  <span className="text-muted-foreground">Slug</span>
                  <span className="font-medium">{selectedArticle.slug}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex min-h-[320px] items-center justify-center rounded-[24px] border border-dashed border-border text-sm text-muted-foreground">
              No article selected.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
