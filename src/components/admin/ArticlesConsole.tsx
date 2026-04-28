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
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="page-title">文章管理</h1>
          <p className="page-subtitle">
            审核生成内容，调整 slug 和 SEO 元数据，并在文章队列中完成发布或草稿保留。
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
          刷新
        </Button>
      </div>

      <div className="grid gap-4 xl:grid-cols-[0.92fr_1.08fr]">
        <div className="min-w-0 rounded-lg border bg-card p-4 shadow-sm">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <p className="text-overline font-semibold text-primary">队列</p>
              <p className="mt-1 text-xs text-muted-foreground">{articles.length} 篇生成文章待审核。</p>
            </div>
            {selectedArticleListItem ? <StatusBadge value={selectedArticleListItem.status} /> : null}
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b bg-white text-xs text-muted-foreground">
                <tr>
                  <th className="pb-2 pr-3">标题</th>
                  <th className="pb-2 pr-3">类型</th>
                  <th className="pb-2 pr-3">状态</th>
                  <th className="pb-2 pr-3">更新时间</th>
                </tr>
              </thead>
              <tbody>
                {articles.map((article) => (
                  <tr
                    key={article.id}
                    className={cn(
                      'cursor-pointer border-b border-border/70 transition-colors hover:bg-muted/40',
                      selectedArticleId === article.id ? 'bg-muted/40' : ''
                    )}
                    onClick={() => {
                      void selectArticle(article.id)
                    }}
                  >
                    <td className="py-2.5 pr-3">
                      <div className="font-medium">{article.title}</div>
                      <div className="text-xs text-muted-foreground">{article.product_name}</div>
                    </td>
                    <td className="py-2.5 pr-3">{article.article_type}</td>
                    <td className="py-2.5 pr-3"><StatusBadge value={article.status} /></td>
                    <td className="py-2.5 pr-3 text-muted-foreground">{formatDate(article.updated_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="min-w-0 rounded-lg border bg-card p-4 shadow-sm xl:max-h-[calc(100vh-6rem)] xl:overflow-y-auto">
          {selectedArticle && draft ? (
            <div className="space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap gap-2">
                    <StatusBadge value={selectedArticle.article_type} />
                    <StatusBadge value={selectedArticle.status} />
                    {draftIsDirty ? (
                      <span className="inline-flex rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
                        未保存改动
                      </span>
                    ) : null}
                  </div>
                  <h2 className="mt-2 font-[var(--font-display)] text-2xl font-semibold tracking-tight">{selectedArticle.title}</h2>
                  <p className="mt-1.5 text-xs leading-5 text-muted-foreground">
                    {selectedArticle.summary || '暂无文章摘要。'}
                  </p>
                </div>
                <FileSearch className="h-5 w-5 text-primary" />
              </div>

              <div className="flex flex-wrap gap-2">
                {selectedArticle.status === 'published' ? (
                  <Link
                    href={getArticlePath(selectedArticle.article_type, selectedArticle.slug)}
                    target="_blank"
                    className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'rounded-full')}
                  >
                    <ArrowUpRight className="mr-2 h-4 w-4" />
                    打开前台页
                  </Link>
                ) : null}
                {selectedArticle.product_id ? (
                  <Link
                    href={`/admin/products/${selectedArticle.product_id}`}
                    className={cn(buttonVariants({ variant: 'secondary', size: 'sm' }), 'rounded-full')}
                  >
                    打开工作台
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
                        toast.error(body.error || '重新生成失败')
                        return
                      }
                      await load(selectedArticle.id)
                      toast.success('重新生成已排队')
                    })
                  }}
                >
                  排队重新生成
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={isPending || !draftIsDirty}
                  onClick={() => setDraft(createDraft(selectedArticle))}
                >
                  <RotateCcw className="mr-2 h-4 w-4" />
                  重置
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
                        toast.error(body.error || '保存文章失败')
                        return
                      }
                      const updated = body as ArticleDetail
                      setSelectedArticle(updated)
                      setDraft(createDraft(updated))
                      await load(updated.id)
                      toast.success('文章已保存')
                    })
                  }}
                >
                  <Save className="mr-2 h-4 w-4" />
                  保存改动
                </Button>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <label className="block space-y-2">
                  <span className="text-xs uppercase tracking-[0.16em] text-muted-foreground">标题</span>
                  <Input
                    value={draft.title}
                    onChange={(event) => setDraft((current) => current ? { ...current, title: event.target.value } : current)}
                    className="min-h-10 rounded-xl"
                  />
                </label>
                <label className="block space-y-2">
                  <span className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Slug</span>
                  <Input
                    value={draft.slug}
                    onChange={(event) => setDraft((current) => current ? { ...current, slug: event.target.value } : current)}
                    className="min-h-10 rounded-xl font-mono"
                  />
                </label>
                <label className="block space-y-2">
                  <span className="text-xs uppercase tracking-[0.16em] text-muted-foreground">关键词</span>
                  <Input
                    value={draft.keyword}
                    onChange={(event) => setDraft((current) => current ? { ...current, keyword: event.target.value } : current)}
                    className="min-h-10 rounded-xl"
                  />
                </label>
                <label className="block space-y-2">
                  <span className="text-xs uppercase tracking-[0.16em] text-muted-foreground">状态</span>
                  <select
                    value={draft.status}
                    onChange={(event) =>
                      setDraft((current) =>
                        current ? { ...current, status: event.target.value === 'draft' ? 'draft' : 'published' } : current
                      )
                    }
                    className="flex min-h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="published">已发布</option>
                    <option value="draft">草稿</option>
                  </select>
                </label>
                <label className="block space-y-2 md:col-span-2">
                  <span className="text-xs uppercase tracking-[0.16em] text-muted-foreground">主图 URL</span>
                  <Input
                    value={draft.hero_image_url}
                    onChange={(event) => setDraft((current) => current ? { ...current, hero_image_url: event.target.value } : current)}
                    className="min-h-10 rounded-xl"
                  />
                </label>
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                <div className="rounded-xl border border-border p-3">
                  <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">商品</p>
                  <p className="mt-1 text-sm font-medium">{selectedArticle.product_name || '暂无关联商品'}</p>
                </div>
                <div className="rounded-xl border border-border p-3">
                  <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">公开路径</p>
                  <p className="mt-1 break-all font-mono text-sm font-medium">{nextPublicPath || '暂无'}</p>
                </div>
                <div className="rounded-xl border border-border p-3">
                  <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">发布时间</p>
                  <p className="mt-1 text-sm font-medium">{formatDate(selectedArticle.published_at)}</p>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <label className="block space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs uppercase tracking-[0.16em] text-muted-foreground">摘要</span>
                    <span className="text-xs text-muted-foreground">{draft.summary.trim().length} 字符</span>
                  </div>
                  <Textarea
                    value={draft.summary}
                    onChange={(event) => setDraft((current) => current ? { ...current, summary: event.target.value } : current)}
                    rows={5}
                    className="rounded-xl"
                  />
                </label>

                <div className="rounded-xl border border-border p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">SEO 校对</p>
                      <p className="mt-1 text-xs leading-5 text-muted-foreground">
                        标题保持紧凑，描述覆盖搜索摘要需要的关键信息。
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    <div className="rounded-md bg-muted/40 p-3">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-sm font-medium">SEO 标题</span>
                        <span className={cn('inline-flex rounded-full px-3 py-1 text-xs font-semibold', seoTitleState.className)}>
                          {seoTitleState.label}
                        </span>
                      </div>
                      <p className="mt-2 text-xs text-muted-foreground">{draft.seo_title.trim().length} / 60 字符</p>
                    </div>
                    <div className="rounded-md bg-muted/40 p-3">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-sm font-medium">SEO 描述</span>
                        <span className={cn('inline-flex rounded-full px-3 py-1 text-xs font-semibold', seoDescriptionState.className)}>
                          {seoDescriptionState.label}
                        </span>
                      </div>
                      <p className="mt-2 text-xs text-muted-foreground">{draft.seo_description.trim().length} / 160 字符</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <label className="block space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs uppercase tracking-[0.16em] text-muted-foreground">SEO 标题</span>
                    <span className="text-xs text-muted-foreground">{draft.seo_title.trim().length} 字符</span>
                  </div>
                  <Input
                    value={draft.seo_title}
                    onChange={(event) => setDraft((current) => current ? { ...current, seo_title: event.target.value } : current)}
                    className="min-h-10 rounded-xl"
                  />
                </label>
                <label className="block space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs uppercase tracking-[0.16em] text-muted-foreground">SEO 描述</span>
                    <span className="text-xs text-muted-foreground">{draft.seo_description.trim().length} 字符</span>
                  </div>
                  <Textarea
                    value={draft.seo_description}
                    onChange={(event) => setDraft((current) => current ? { ...current, seo_description: event.target.value } : current)}
                    rows={4}
                    className="rounded-xl"
                  />
                </label>
              </div>

              <div className="rounded-xl border border-border p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">文章 Markdown</p>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">
                      手动编辑后保持源内容同步，便于后续重生成与审计。
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground">{draft.content_md.length} 字符</span>
                </div>
                <Textarea
                  value={draft.content_md}
                  onChange={(event) => setDraft((current) => current ? { ...current, content_md: event.target.value } : current)}
                  rows={14}
                  className="mt-3 rounded-xl font-mono text-xs leading-6"
                />
              </div>

              <div className="rounded-xl border border-border p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">渲染 HTML 源码</p>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">
                      前台文章直接渲染此字段，结构或措辞修正后需要同步更新。
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground">{draft.content_html.length} 字符</span>
                </div>
                <Textarea
                  value={draft.content_html}
                  onChange={(event) => setDraft((current) => current ? { ...current, content_html: event.target.value } : current)}
                  rows={14}
                  className="mt-3 rounded-xl font-mono text-xs leading-6"
                />
              </div>

              <div className="rounded-xl border border-border p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">结构化数据 JSON</p>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">
                      可选；一旦填写必须保持有效 JSON，否则保存会被拒绝。
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground">{draft.schema_json.trim().length} 字符</span>
                </div>
                <Textarea
                  value={draft.schema_json}
                  onChange={(event) => setDraft((current) => current ? { ...current, schema_json: event.target.value } : current)}
                  rows={9}
                  className="mt-3 rounded-xl font-mono text-xs leading-6"
                />
              </div>

              <div className="rounded-xl border border-border p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">关联 SEO 页面</p>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">
                      保存文章会同步更新主关联 SEO 页面的路径与元数据。
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground">{selectedArticle.seo_pages.length} 条</span>
                </div>
                <div className="mt-3 space-y-2">
                  {selectedArticle.seo_pages.length > 0 ? (
                    selectedArticle.seo_pages.map((page) => (
                      <div key={page.id} className="rounded-md bg-muted/40 p-3">
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
                        <p className="mt-2 text-xs leading-5 text-muted-foreground">{page.meta_description}</p>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-xl border border-dashed border-border p-3 text-sm text-muted-foreground">
                      这篇文章还没有关联 SEO 页面，保存后会自动创建。
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-xl border border-border p-3">
                <div className="flex items-start justify-between gap-3 text-sm">
                  <span className="text-muted-foreground">更新时间</span>
                  <span className="font-medium">{formatDate(selectedArticle.updated_at)}</span>
                </div>
                <div className="mt-2 flex items-start justify-between gap-3 text-sm">
                  <span className="text-muted-foreground">文章 ID</span>
                  <span className="font-medium">#{selectedArticle.id}</span>
                </div>
                <div className="mt-2 flex items-start justify-between gap-3 text-sm">
                  <span className="text-muted-foreground">分类</span>
                  <span className="font-medium">{selectedArticle.product_category || '暂无'}</span>
                </div>
              </div>
            </div>
          ) : isLoadingArticle ? (
            <div className="flex min-h-[220px] items-center justify-center rounded-xl border border-dashed border-border text-sm text-muted-foreground">
              正在加载文章工作台...
            </div>
          ) : (
            <div className="flex min-h-[220px] items-center justify-center rounded-xl border border-dashed border-border text-sm text-muted-foreground">
              未选择文章。
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
