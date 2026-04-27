'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useEffect, useState, useTransition } from 'react'
import { ArrowUpRight, FileSearch, RefreshCw, Save, RotateCcw } from 'lucide-react'
import { toast } from 'sonner'
import { buttonVariants, Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { StatusBadge } from '@/components/admin/StatusBadge'
import { getArticlePath } from '@/lib/article-path'
import { cn } from '@/lib/utils'

type ArticleRow = {
  id: number
  product_id: number | null
  article_type: string
  title: string
  slug: string
  status: 'draft' | 'published'
  summary: string | null
  keyword: string | null
  hero_image_url: string | null
  seo_title: string | null
  seo_description: string | null
  product_name: string | null
  product_category: string | null
  published_at: string | null
  updated_at: string
}

type ArticleSeoPage = {
  id: number
  page_type: string
  pathname: string
  title: string
  meta_description: string
  canonical_url: string | null
  status: string
  published_at: string | null
  updated_at: string
}

type ArticleDetail = ArticleRow & {
  content_md: string
  content_html: string
  schema_json: string | null
  seo_pages: ArticleSeoPage[]
}

type ArticleDraft = {
  title: string
  slug: string
  summary: string
  keyword: string
  hero_image_url: string
  content_md: string
  content_html: string
  seo_title: string
  seo_description: string
  schema_json: string
  status: 'draft' | 'published'
}

function formatDate(value: string | null) {
  if (!value) return 'N/A'
  return new Date(value).toLocaleString()
}

function createDraft(article: ArticleDetail): ArticleDraft {
  return {
    title: article.title,
    slug: article.slug,
    summary: article.summary || '',
    keyword: article.keyword || '',
    hero_image_url: article.hero_image_url || '',
    content_md: article.content_md,
    content_html: article.content_html,
    seo_title: article.seo_title || '',
    seo_description: article.seo_description || '',
    schema_json: article.schema_json || '',
    status: article.status
  }
}

function isDirty(article: ArticleDetail | null, draft: ArticleDraft | null) {
  if (!article || !draft) return false
  return (
    draft.title !== article.title ||
    draft.slug !== article.slug ||
    draft.summary !== (article.summary || '') ||
    draft.keyword !== (article.keyword || '') ||
    draft.hero_image_url !== (article.hero_image_url || '') ||
    draft.content_md !== article.content_md ||
    draft.content_html !== article.content_html ||
    draft.seo_title !== (article.seo_title || '') ||
    draft.seo_description !== (article.seo_description || '') ||
    draft.schema_json !== (article.schema_json || '') ||
    draft.status !== article.status
  )
}

function getSeoLengthState(length: number, range: [number, number]) {
  if (length === 0) return { label: 'missing', className: 'bg-rose-100 text-rose-800' }
  if (length < range[0]) return { label: 'thin', className: 'bg-amber-100 text-amber-800' }
  if (length > range[1]) return { label: 'long', className: 'bg-rose-100 text-rose-800' }
  return { label: 'healthy', className: 'bg-emerald-100 text-emerald-800' }
}

export function ArticlesConsole() {
  const searchParams = useSearchParams()
  const [articles, setArticles] = useState<ArticleRow[]>([])
  const [selectedArticleId, setSelectedArticleId] = useState<number | null>(null)
  const [selectedArticle, setSelectedArticle] = useState<ArticleDetail | null>(null)
  const [draft, setDraft] = useState<ArticleDraft | null>(null)
  const [isLoadingArticle, setIsLoadingArticle] = useState(false)
  const [isPending, startTransition] = useTransition()
  const requestedArticleId = Number(searchParams.get('article') || '')

  const loadArticle = async (articleId: number) => {
    setIsLoadingArticle(true)
    const response = await fetch(`/api/admin/articles/${articleId}`)
    if (!response.ok) {
      setSelectedArticle(null)
      setDraft(null)
      setIsLoadingArticle(false)
      return
    }
    const article = (await response.json()) as ArticleDetail
    setSelectedArticle(article)
    setDraft(createDraft(article))
    setIsLoadingArticle(false)
  }

  const load = async (preferredArticleId?: number | null) => {
    const response = await fetch('/api/admin/articles')
    const rows = (await response.json()) as ArticleRow[]
    setArticles(rows)
    const nextArticleId =
      preferredArticleId && rows.some((item) => item.id === preferredArticleId)
        ? preferredArticleId
        : rows[0]?.id || null
    setSelectedArticleId(nextArticleId)
    if (nextArticleId) {
      await loadArticle(nextArticleId)
      return
    }
    setSelectedArticle(null)
    setDraft(null)
  }

  useEffect(() => {
    void load(Number.isFinite(requestedArticleId) && requestedArticleId > 0 ? requestedArticleId : undefined)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestedArticleId])

  const selectedArticleListItem = articles.find((article) => article.id === selectedArticleId) || null
  const draftIsDirty = isDirty(selectedArticle, draft)
  const seoTitleState = getSeoLengthState(draft?.seo_title.trim().length || 0, [35, 60])
  const seoDescriptionState = getSeoLengthState(draft?.seo_description.trim().length || 0, [70, 160])
  const nextPublicPath =
    draft && selectedArticle ? getArticlePath(selectedArticle.article_type, draft.slug.trim() || selectedArticle.slug) : null

  const selectArticle = async (articleId: number) => {
    if (articleId === selectedArticleId) return
    if (draftIsDirty && !window.confirm('Unsaved edits will be discarded. Continue?')) return
    setSelectedArticleId(articleId)
    await loadArticle(articleId)
  }

  return (
    <div className="space-y-6 p-6 lg:p-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.28em] text-primary">Articles</p>
          <h1 className="mt-2 font-[var(--font-display)] text-4xl font-semibold tracking-tight">Editorial workspace with SEO proofreading</h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-muted-foreground">
            Review generated copy, adjust slug and SEO metadata, then publish or hold pages as draft without leaving the article queue.
          </p>
        </div>
        <Button
          variant="outline"
          disabled={isPending}
          onClick={() => {
            startTransition(async () => {
              await load(selectedArticleId)
            })
          }}
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
        <div className="min-w-0 rounded-[32px] border border-border bg-white p-8 shadow-panel">
          <div className="mb-6 flex items-start justify-between gap-4">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.22em] text-primary">Queue</p>
              <p className="mt-2 text-sm text-muted-foreground">{articles.length} generated articles ready for review.</p>
            </div>
            {selectedArticleListItem ? <StatusBadge value={selectedArticleListItem.status} /> : null}
          </div>
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
                    onClick={() => {
                      void selectArticle(article.id)
                    }}
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

        <div className="min-w-0 rounded-[32px] border border-border bg-white p-8 shadow-panel xl:max-h-[calc(100vh-8rem)] xl:overflow-y-auto">
          {selectedArticle && draft ? (
            <div className="space-y-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="flex flex-wrap gap-2">
                    <StatusBadge value={selectedArticle.article_type} />
                    <StatusBadge value={selectedArticle.status} />
                    {draftIsDirty ? (
                      <span className="inline-flex rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
                        Unsaved edits
                      </span>
                    ) : null}
                  </div>
                  <h2 className="mt-3 font-[var(--font-display)] text-3xl font-semibold tracking-tight">{selectedArticle.title}</h2>
                  <p className="mt-3 text-sm leading-7 text-muted-foreground">
                    {selectedArticle.summary || 'No article summary captured yet.'}
                  </p>
                </div>
                <FileSearch className="h-6 w-6 text-primary" />
              </div>

              <div className="flex flex-wrap gap-3">
                {selectedArticle.status === 'published' ? (
                  <Link
                    href={getArticlePath(selectedArticle.article_type, selectedArticle.slug)}
                    target="_blank"
                    className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'rounded-full')}
                  >
                    <ArrowUpRight className="mr-2 h-4 w-4" />
                    Open Public Page
                  </Link>
                ) : null}
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
                      await load(selectedArticle.id)
                      toast.success('Regeneration queued')
                    })
                  }}
                >
                  Queue Regeneration
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={isPending || !draftIsDirty}
                  onClick={() => setDraft(createDraft(selectedArticle))}
                >
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Reset
                </Button>
                <Button
                  size="sm"
                  disabled={isPending || !draftIsDirty}
                  onClick={() => {
                    startTransition(async () => {
                      const response = await fetch(`/api/admin/articles/${selectedArticle.id}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          title: draft.title,
                          slug: draft.slug,
                          summary: draft.summary,
                          keyword: draft.keyword,
                          heroImageUrl: draft.hero_image_url,
                          contentMd: draft.content_md,
                          contentHtml: draft.content_html,
                          seoTitle: draft.seo_title,
                          seoDescription: draft.seo_description,
                          schemaJson: draft.schema_json,
                          status: draft.status
                        })
                      })

                      const body = await response.json().catch(() => ({}))
                      if (!response.ok) {
                        toast.error(body.error || 'Failed to save article')
                        return
                      }
                      const updated = body as ArticleDetail
                      setSelectedArticle(updated)
                      setDraft(createDraft(updated))
                      await load(updated.id)
                      toast.success('Article saved')
                    })
                  }}
                >
                  <Save className="mr-2 h-4 w-4" />
                  Save Changes
                </Button>
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                <label className="block space-y-2">
                  <span className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Title</span>
                  <Input
                    value={draft.title}
                    onChange={(event) => setDraft((current) => current ? { ...current, title: event.target.value } : current)}
                    className="min-h-[48px] rounded-2xl"
                  />
                </label>
                <label className="block space-y-2">
                  <span className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Slug</span>
                  <Input
                    value={draft.slug}
                    onChange={(event) => setDraft((current) => current ? { ...current, slug: event.target.value } : current)}
                    className="min-h-[48px] rounded-2xl font-mono"
                  />
                </label>
                <label className="block space-y-2">
                  <span className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Keyword</span>
                  <Input
                    value={draft.keyword}
                    onChange={(event) => setDraft((current) => current ? { ...current, keyword: event.target.value } : current)}
                    className="min-h-[48px] rounded-2xl"
                  />
                </label>
                <label className="block space-y-2">
                  <span className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Status</span>
                  <select
                    value={draft.status}
                    onChange={(event) =>
                      setDraft((current) =>
                        current ? { ...current, status: event.target.value === 'draft' ? 'draft' : 'published' } : current
                      )
                    }
                    className="flex min-h-[48px] w-full rounded-2xl border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="published">Published</option>
                    <option value="draft">Draft</option>
                  </select>
                </label>
                <label className="block space-y-2 md:col-span-2">
                  <span className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Hero Image URL</span>
                  <Input
                    value={draft.hero_image_url}
                    onChange={(event) => setDraft((current) => current ? { ...current, hero_image_url: event.target.value } : current)}
                    className="min-h-[48px] rounded-2xl"
                  />
                </label>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-[24px] border border-border p-5">
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Product</p>
                  <p className="mt-2 text-sm font-medium">{selectedArticle.product_name || 'No linked product'}</p>
                </div>
                <div className="rounded-[24px] border border-border p-5">
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Public Path</p>
                  <p className="mt-2 break-all font-mono text-sm font-medium">{nextPublicPath || 'N/A'}</p>
                </div>
                <div className="rounded-[24px] border border-border p-5">
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Published</p>
                  <p className="mt-2 text-sm font-medium">{formatDate(selectedArticle.published_at)}</p>
                </div>
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                <label className="block space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Summary</span>
                    <span className="text-xs text-muted-foreground">{draft.summary.trim().length} chars</span>
                  </div>
                  <Textarea
                    value={draft.summary}
                    onChange={(event) => setDraft((current) => current ? { ...current, summary: event.target.value } : current)}
                    rows={8}
                    className="rounded-2xl"
                  />
                </label>

                <div className="rounded-[24px] border border-border p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">SEO Proofing</p>
                      <p className="mt-2 text-sm leading-7 text-muted-foreground">
                        Keep title compact and description descriptive enough for search snippets.
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <div className="rounded-[20px] bg-[#f7f1e4] p-4">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-sm font-medium">SEO title</span>
                        <span className={cn('inline-flex rounded-full px-3 py-1 text-xs font-semibold', seoTitleState.className)}>
                          {seoTitleState.label}
                        </span>
                      </div>
                      <p className="mt-3 text-sm text-muted-foreground">{draft.seo_title.trim().length} / 60 characters</p>
                    </div>
                    <div className="rounded-[20px] bg-[#f7f1e4] p-4">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-sm font-medium">SEO description</span>
                        <span className={cn('inline-flex rounded-full px-3 py-1 text-xs font-semibold', seoDescriptionState.className)}>
                          {seoDescriptionState.label}
                        </span>
                      </div>
                      <p className="mt-3 text-sm text-muted-foreground">{draft.seo_description.trim().length} / 160 characters</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                <label className="block space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs uppercase tracking-[0.18em] text-muted-foreground">SEO Title</span>
                    <span className="text-xs text-muted-foreground">{draft.seo_title.trim().length} chars</span>
                  </div>
                  <Input
                    value={draft.seo_title}
                    onChange={(event) => setDraft((current) => current ? { ...current, seo_title: event.target.value } : current)}
                    className="min-h-[48px] rounded-2xl"
                  />
                </label>
                <label className="block space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs uppercase tracking-[0.18em] text-muted-foreground">SEO Description</span>
                    <span className="text-xs text-muted-foreground">{draft.seo_description.trim().length} chars</span>
                  </div>
                  <Textarea
                    value={draft.seo_description}
                    onChange={(event) => setDraft((current) => current ? { ...current, seo_description: event.target.value } : current)}
                    rows={4}
                    className="rounded-2xl"
                  />
                </label>
              </div>

              <div className="rounded-[24px] border border-border p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Article Markdown</p>
                    <p className="mt-2 text-sm leading-7 text-muted-foreground">
                      Keep the editorial source aligned with any manual edits so regeneration context and audits stay readable.
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground">{draft.content_md.length} chars</span>
                </div>
                <Textarea
                  value={draft.content_md}
                  onChange={(event) => setDraft((current) => current ? { ...current, content_md: event.target.value } : current)}
                  rows={18}
                  className="mt-4 rounded-2xl font-mono text-xs leading-6"
                />
              </div>

              <div className="rounded-[24px] border border-border p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Rendered HTML Source</p>
                    <p className="mt-2 text-sm leading-7 text-muted-foreground">
                      Public article pages render this field directly. Update it when you make structural or phrasing corrections.
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground">{draft.content_html.length} chars</span>
                </div>
                <Textarea
                  value={draft.content_html}
                  onChange={(event) => setDraft((current) => current ? { ...current, content_html: event.target.value } : current)}
                  rows={18}
                  className="mt-4 rounded-2xl font-mono text-xs leading-6"
                />
              </div>

              <div className="rounded-[24px] border border-border p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Structured Data JSON</p>
                    <p className="mt-2 text-sm leading-7 text-muted-foreground">
                      Optional, but when present it must stay valid JSON or the save will be rejected.
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground">{draft.schema_json.trim().length} chars</span>
                </div>
                <Textarea
                  value={draft.schema_json}
                  onChange={(event) => setDraft((current) => current ? { ...current, schema_json: event.target.value } : current)}
                  rows={12}
                  className="mt-4 rounded-2xl font-mono text-xs leading-6"
                />
              </div>

              <div className="rounded-[24px] border border-border p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Linked SEO Pages</p>
                    <p className="mt-2 text-sm leading-7 text-muted-foreground">
                      Saving this article updates the primary linked SEO page path and metadata.
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground">{selectedArticle.seo_pages.length} records</span>
                </div>
                <div className="mt-4 space-y-3">
                  {selectedArticle.seo_pages.length > 0 ? (
                    selectedArticle.seo_pages.map((page) => (
                      <div key={page.id} className="rounded-[20px] bg-[#f7f1e4] p-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="font-medium">{page.title}</p>
                            <p className="mt-1 break-all font-mono text-xs text-muted-foreground">{page.pathname}</p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <StatusBadge value={page.page_type} />
                            <StatusBadge value={page.status} />
                          </div>
                        </div>
                        <p className="mt-3 text-sm leading-7 text-muted-foreground">{page.meta_description}</p>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-[20px] border border-dashed border-border p-4 text-sm text-muted-foreground">
                      No SEO page has been created for this article yet. Saving will create one automatically.
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-[24px] border border-border p-5">
                <div className="flex items-start justify-between gap-4 text-sm">
                  <span className="text-muted-foreground">Updated</span>
                  <span className="font-medium">{formatDate(selectedArticle.updated_at)}</span>
                </div>
                <div className="mt-3 flex items-start justify-between gap-4 text-sm">
                  <span className="text-muted-foreground">Article ID</span>
                  <span className="font-medium">#{selectedArticle.id}</span>
                </div>
                <div className="mt-3 flex items-start justify-between gap-4 text-sm">
                  <span className="text-muted-foreground">Category</span>
                  <span className="font-medium">{selectedArticle.product_category || 'N/A'}</span>
                </div>
              </div>
            </div>
          ) : isLoadingArticle ? (
            <div className="flex min-h-[320px] items-center justify-center rounded-[24px] border border-dashed border-border text-sm text-muted-foreground">
              Loading article workspace...
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
