'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useTransition } from 'react'
import { ArrowLeft, ExternalLink, FileText, RefreshCw, Scan, Search, Wand2 } from 'lucide-react'
import { toast } from 'sonner'
import type { AdminProductWorkspace } from '@/lib/admin-products'
import { getArticlePath } from '@/lib/article-path'
import { cn } from '@/lib/utils'
import { buttonVariants, Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/admin/StatusBadge'

function formatMoney(amount: number | null, currency: string | null) {
  if (amount == null) return 'N/A'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency || 'USD',
    maximumFractionDigits: 2
  }).format(amount)
}

function formatDate(value: string | null) {
  if (!value) return 'N/A'
  return new Date(value).toLocaleString()
}

function scoreTone(score: number) {
  if (score >= 8.3) return 'text-emerald-700'
  if (score >= 7.4) return 'text-amber-700'
  return 'text-slate-600'
}

type WorkspaceActionId =
  | 'contentPack'
  | 'mineKeywords'
  | 'generateReview'
  | 'generateComparison'
  | 'refreshSeo'

export function ProductWorkspaceConsole({
  initialWorkspace
}: {
  initialWorkspace: AdminProductWorkspace
}) {
  const router = useRouter()
  const [workspace, setWorkspace] = useState(initialWorkspace)
  const [isPending, startTransition] = useTransition()

  const heroMedia = workspace.mediaAssets.find((item) => item.assetRole === 'hero') || null
  const galleryMedia = workspace.mediaAssets.filter((item) => item.assetRole === 'gallery')
  const reviewMedia = workspace.mediaAssets.filter((item) => item.assetRole === 'review')
  const reviewArticle = workspace.articles.find((item) => item.articleType === 'review') || null
  const comparisonArticle = workspace.articles.find((item) => item.articleType === 'comparison') || null
  const hasActiveRuns = workspace.recentRuns.some((run) => run.status === 'queued' || run.status === 'running')
  const workflowActions: Array<{
    id: WorkspaceActionId
    title: string
    description: string
    badge: string
    accentClassName: string
    cta: string
    successMessage: string
    icon: typeof Wand2
    spanClassName?: string
  }> = [
    {
      id: 'contentPack',
      title: '重建内容包',
      description: '复用当前商品事实和媒体素材，重新生成关键词机会、评测页与对比页，不重新抓取落地页。',
      badge: `${workspace.keywords.length} 个关键词 · ${workspace.articles.length} 篇文章`,
      accentClassName: 'bg-[#f7f1e4] text-primary',
      cta: '排队内容包',
      successMessage: '内容包已排队，工作台已刷新',
      icon: Wand2,
      spanClassName: 'lg:col-span-2'
    },
    {
      id: 'mineKeywords',
      title: '挖掘关键词',
      description: '基于数据库中的标准化商品事实刷新高意图长尾机会。',
      badge: workspace.keywords.length > 0 ? `已保存 ${workspace.keywords.length} 个` : '尚未生成',
      accentClassName: 'bg-sky-100 text-sky-800',
      cta: '排队关键词挖掘',
      successMessage: '关键词挖掘已排队，工作台已刷新',
      icon: Search
    },
    {
      id: 'generateReview',
      title: '生成评测',
      description: '重建商品评测文章，重新生成 SEO 载荷，并发布公开评测路径。',
      badge: reviewArticle ? `更新于 ${formatDate(reviewArticle.updatedAt)}` : '尚未生成',
      accentClassName: 'bg-rose-100 text-rose-800',
      cta: '排队评测',
      successMessage: '评测文章已排队，工作台已刷新',
      icon: FileText
    },
    {
      id: 'generateComparison',
      title: '生成对比',
      description: '基于当前商品数据库重建替代品文章，并重新发布对比页面。',
      badge: comparisonArticle ? `更新于 ${formatDate(comparisonArticle.updatedAt)}` : '尚未生成',
      accentClassName: 'bg-indigo-100 text-indigo-800',
      cta: '排队对比',
      successMessage: '对比文章已排队，工作台已刷新',
      icon: FileText
    },
    {
      id: 'refreshSeo',
      title: '刷新 SEO',
      description: '重新计算当前商品文章的 SEO 标题、描述和 schema，并同步关联 SEO 页面。',
      badge: workspace.seoPages.length > 0 ? `${workspace.seoPages.length} 个 SEO 页面` : '暂无 SEO 页面',
      accentClassName: 'bg-emerald-100 text-emerald-800',
      cta: '排队 SEO 刷新',
      successMessage: 'SEO 刷新已排队，工作台已同步',
      icon: RefreshCw
    }
  ]

  const refreshWorkspace = async () => {
    const response = await fetch(`/api/admin/products/${workspace.product.id}`)
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}))
      throw new Error(payload.error || '刷新工作台失败')
    }
    setWorkspace((await response.json()) as AdminProductWorkspace)
  }

  const triggerAction = (input: {
    path: string
    body?: unknown
    successMessage: string
  }) => {
    startTransition(async () => {
      const response = await fetch(input.path, {
        method: 'POST',
        headers: input.body ? { 'Content-Type': 'application/json' } : undefined,
        body: input.body ? JSON.stringify(input.body) : undefined
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) {
        toast.error(payload.error || '操作失败')
        return
      }
      await refreshWorkspace()
      router.refresh()
      toast.success(input.successMessage)
    })
  }

  useEffect(() => {
    if (!hasActiveRuns) return
    const intervalId = window.setInterval(() => {
      startTransition(async () => {
        try {
          await refreshWorkspace()
          router.refresh()
        } catch {
          // Keep polling silent until the next successful refresh.
        }
      })
    }, 4000)
    return () => window.clearInterval(intervalId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasActiveRuns, workspace.product.id])

  return (
    <div className="space-y-4 p-4 sm:p-5 lg:p-6">
      <section className="rounded-2xl border border-border bg-white p-4 shadow-sm lg:p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl">
            <Link
              href="/admin/products"
              className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'mb-3 rounded-full px-0 text-muted-foreground hover:bg-transparent')}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              返回商品列表
            </Link>
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge value={workspace.product.sourcePlatform} />
              {workspace.affiliateSource ? <StatusBadge value={workspace.affiliateSource.platform} /> : null}
              {workspace.product.category ? <StatusBadge value={workspace.product.category} /> : null}
            </div>
            <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.22em] text-primary">商品工作台</p>
            <h1 className="mt-1.5 font-[var(--font-display)] text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              {workspace.product.productName}
            </h1>
            <p className="mt-1.5 max-w-2xl text-xs leading-5 text-muted-foreground">
              {workspace.product.description || '暂未采集到商品描述。确认联盟来源链接后可重新运行流水线。'}
            </p>
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            {workspace.affiliateSource ? (
              <Button
                disabled={isPending}
                onClick={() =>
                  triggerAction({
                    path: `/api/admin/products/${workspace.affiliateSource?.id}/run-pipeline`,
                    successMessage: '流水线已排队，工作台已刷新'
                  })
                }
              >
                <Wand2 className="mr-2 h-4 w-4" />
                排队完整流水线
              </Button>
            ) : null}
            <Button
              disabled={isPending}
              variant="secondary"
              onClick={() =>
                triggerAction({
                  path: `/api/admin/products/${workspace.product.id}/rescrape-media`,
                  successMessage: '媒体已重新抓取，工作台已刷新'
                })
              }
            >
              <Scan className="mr-2 h-4 w-4" />
              重新抓取媒体
            </Button>
            <Button
              disabled={isPending}
              variant="outline"
              onClick={() => {
                startTransition(async () => {
                  try {
                    await refreshWorkspace()
                    router.refresh()
                    toast.success('工作台已刷新')
                  } catch (error) {
                    toast.error(error instanceof Error ? error.message : '刷新失败')
                  }
                })
              }}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              刷新
            </Button>
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-xl border border-border bg-[#f7f1e4] p-3">
            <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">价格</p>
            <p className="mt-1 text-xl font-semibold">{formatMoney(workspace.product.priceAmount, workspace.product.priceCurrency)}</p>
          </div>
          <div className="rounded-xl border border-border bg-[#f7f1e4] p-3">
            <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">评分</p>
            <p className="mt-1 text-xl font-semibold">{workspace.product.rating ? `${workspace.product.rating.toFixed(1)} / 5` : '暂无'}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{workspace.product.reviewCount ? `${workspace.product.reviewCount.toLocaleString()} 条评价` : '暂无评价数'}</p>
          </div>
          <div className="rounded-xl border border-border bg-[#f7f1e4] p-3">
            <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">素材</p>
            <p className="mt-1 text-xl font-semibold">{workspace.mediaAssets.length}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{reviewMedia.length} 张评价图</p>
          </div>
          <div className="rounded-xl border border-border bg-[#f7f1e4] p-3">
            <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">内容产出</p>
            <p className="mt-1 text-xl font-semibold">{workspace.articles.length}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{workspace.keywords.length} 个关键词机会</p>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-white p-4 shadow-sm lg:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="max-w-3xl">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-primary">工作流控制</p>
            <h2 className="mt-1 font-[var(--font-display)] text-2xl font-semibold tracking-tight">按阶段推进内容漏斗</h2>
            <p className="mt-1.5 text-xs leading-5 text-muted-foreground">
              仅重跑关键词、内容或 SEO 时使用已存商品事实；落地页变化时再运行完整流水线。
            </p>
          </div>
          <div className="rounded-xl border border-border bg-[#f7f1e4] px-3 py-2 text-xs text-muted-foreground">
            完整流水线仍在上方，用于链接解析和新抓取。
          </div>
        </div>

        <div className="mt-4 grid gap-3 lg:grid-cols-2 xl:grid-cols-4">
          {workflowActions.map((action) => {
            const Icon = action.icon
            return (
              <div
                key={action.id}
                className={cn(
                  'rounded-xl border border-border p-3',
                  action.id === 'contentPack' ? 'bg-[#f7f1e4]' : 'bg-white',
                  action.spanClassName
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className={cn('rounded-xl p-2.5', action.accentClassName)}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <span className="rounded-full bg-white/80 px-3 py-1 text-xs font-semibold text-slate-700">
                    {action.badge}
                  </span>
                </div>
                <h3 className="mt-3 text-lg font-semibold">{action.title}</h3>
                <p className="mt-1.5 text-xs leading-5 text-muted-foreground">{action.description}</p>
                <Button
                  className="mt-3 w-full"
                  variant={action.id === 'contentPack' ? 'default' : 'secondary'}
                  disabled={isPending}
                  onClick={() =>
                    triggerAction({
                      path: `/api/admin/products/${workspace.product.id}/workspace-action`,
                      body: { action: action.id },
                      successMessage: action.successMessage
                    })
                  }
                >
                  {action.cta}
                </Button>
              </div>
            )
          })}
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="space-y-4">
          <div className="rounded-2xl border border-border bg-white p-4 shadow-sm lg:p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-primary">商品事实</p>
                <h2 className="mt-1 font-[var(--font-display)] text-2xl font-semibold tracking-tight">标准化记录</h2>
              </div>
              {workspace.product.resolvedUrl ? (
                <Link
                  href={workspace.product.resolvedUrl}
                  target="_blank"
                  className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'rounded-full')}
                >
                  <ExternalLink className="mr-2 h-4 w-4" />
                  打开落地页
                </Link>
              ) : null}
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <div className="space-y-3 rounded-xl border border-border p-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">品牌</p>
                  <p className="mt-1 font-medium">{workspace.product.brand || '暂无'}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">型号</p>
                  <p className="mt-1 font-medium">{workspace.product.productModel || workspace.product.modelNumber || '暂无'}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">商品类型</p>
                  <p className="mt-1 font-medium">{workspace.product.productType || '暂无'}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Slug</p>
                  <p className="mt-1 font-medium">{workspace.product.slug || '暂无'}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">更新时间</p>
                  <p className="mt-1 font-medium">{formatDate(workspace.product.updatedAt)}</p>
                </div>
              </div>
              <div className="space-y-3 rounded-xl border border-border p-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">来源联盟链接</p>
                  <p className="mt-1 break-all text-sm text-muted-foreground">{workspace.product.sourceAffiliateLink}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Canonical URL</p>
                  <p className="mt-1 break-all text-sm text-muted-foreground">{workspace.product.canonicalUrl || '暂无'}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">YouTube 匹配词</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {workspace.product.youtubeMatchTerms.length ? workspace.product.youtubeMatchTerms.join(' · ') : '暂无'}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-4 grid gap-3 lg:grid-cols-[0.95fr_1.05fr]">
              <div className="rounded-xl border border-border p-3">
                <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">规格</p>
                <div className="mt-3 space-y-2">
                  {Object.entries(workspace.product.specs).length > 0 ? (
                    Object.entries(workspace.product.specs).map(([label, value]) => (
                      <div key={label} className="flex items-start justify-between gap-4 border-b border-border/70 pb-2 text-sm last:border-b-0 last:pb-0">
                        <span className="text-muted-foreground">{label}</span>
                        <span className="text-right font-medium">{value}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">暂无结构化规格。</p>
                  )}
                </div>
              </div>
              <div className="rounded-xl border border-border p-3">
                <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">评价亮点</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {workspace.product.reviewHighlights.length > 0 ? (
                    workspace.product.reviewHighlights.map((item) => (
                      <span key={item} className="rounded-full bg-[#f7f1e4] px-3 py-1.5 text-sm text-slate-700">
                        {item}
                      </span>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">暂无评价亮点。</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-white p-4 shadow-sm lg:p-5">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-primary">关键词挖掘</p>
            <h2 className="mt-1 font-[var(--font-display)] text-2xl font-semibold tracking-tight">高意图机会</h2>
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-border text-xs uppercase tracking-[0.14em] text-muted-foreground">
                  <tr>
                    <th className="pb-2 pr-3">关键词</th>
                    <th className="pb-2 pr-3">分数</th>
                    <th className="pb-2 pr-3">意图</th>
                    <th className="pb-2 pr-3">SERP</th>
                    <th className="pb-2 pr-3">匹配</th>
                  </tr>
                </thead>
                <tbody>
                  {workspace.keywords.length > 0 ? (
                    workspace.keywords.map((keyword) => (
                      <tr key={keyword.id} className="border-b border-border/70 last:border-b-0">
                        <td className="py-2.5 pr-3 font-medium">{keyword.keyword}</td>
                        <td className={cn('py-2.5 pr-3 font-semibold', scoreTone(keyword.totalScore))}>{keyword.totalScore.toFixed(1)}</td>
                        <td className="py-2.5 pr-3 text-muted-foreground">{keyword.buyerIntent.toFixed(1)}</td>
                        <td className="py-2.5 pr-3 text-muted-foreground">{keyword.serpWeakness.toFixed(1)}</td>
                        <td className="py-2.5 pr-3 text-muted-foreground">{keyword.contentFit.toFixed(1)}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="py-4 text-muted-foreground">暂无关键词机会。</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-white p-4 shadow-sm lg:p-5">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-primary">流水线详情</p>
            <h2 className="mt-1 font-[var(--font-display)] text-2xl font-semibold tracking-tight">最近 Job</h2>
            <div className="mt-4 space-y-2">
              {workspace.latestRunJobs.length > 0 ? (
                workspace.latestRunJobs.map((job) => (
                  <div key={job.id} className="rounded-xl border border-border p-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="font-medium">{job.stage}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">{job.message || '暂无 Job 备注'}</p>
                      </div>
                      <StatusBadge value={job.status} />
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {formatDate(job.startedAt)} 至 {formatDate(job.finishedAt)}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">暂无流水线 Job 记录。</p>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-border bg-white p-4 shadow-sm lg:p-5">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-primary">媒体素材</p>
            <h2 className="mt-1 font-[var(--font-display)] text-2xl font-semibold tracking-tight">主图、图库与评价图</h2>

            {heroMedia ? (
              <div className="mt-4 rounded-xl border border-border bg-[#f7f1e4] p-3">
                <div className="relative aspect-[16/10] overflow-hidden rounded-xl">
                  <Image
                    src={heroMedia.publicUrl}
                    alt={workspace.product.productName}
                    fill
                    sizes="(max-width: 1280px) 100vw, 40vw"
                    className="object-cover"
                  />
                </div>
                <div className="mt-2 flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium">主图</p>
                    <p className="text-xs text-muted-foreground">{formatDate(heroMedia.createdAt)}</p>
                  </div>
                  <StatusBadge value={heroMedia.assetRole} />
                </div>
              </div>
            ) : null}

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {galleryMedia.map((asset) => (
                <div key={asset.id} className="rounded-xl border border-border p-2">
                  <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-[#f7f1e4]">
                    <Image src={asset.publicUrl} alt={`${workspace.product.productName} gallery`} fill sizes="(max-width: 1280px) 50vw, 20vw" className="object-cover" />
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <span className="text-sm font-medium">图库</span>
                    <StatusBadge value={asset.assetRole} />
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <p className="text-sm font-semibold">评价图</p>
                <p className="text-xs text-muted-foreground">{reviewMedia.length} 张</p>
              </div>
              <div className="grid gap-3 grid-cols-2 sm:grid-cols-3">
                {reviewMedia.length > 0 ? (
                  reviewMedia.map((asset) => (
                    <div key={asset.id} className="relative aspect-square overflow-hidden rounded-xl border border-border bg-[#f7f1e4]">
                      <Image src={asset.publicUrl} alt={`${workspace.product.productName} review`} fill sizes="(max-width: 1280px) 33vw, 12vw" className="object-cover" />
                    </div>
                  ))
                ) : (
                  <p className="col-span-full text-sm text-muted-foreground">暂无评价图。</p>
                )}
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-white p-4 shadow-sm lg:p-5">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-primary">生成内容</p>
            <h2 className="mt-1 font-[var(--font-display)] text-2xl font-semibold tracking-tight">文章与 SEO 页面</h2>
            <div className="mt-4 space-y-2">
              {workspace.articles.length > 0 ? (
                workspace.articles.map((article) => (
                  <div key={article.id} className="rounded-xl border border-border p-3">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap gap-2">
                          <StatusBadge value={article.articleType} />
                          <StatusBadge value={article.status} />
                        </div>
                        <p className="mt-2 font-medium">{article.title}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{article.summary || '暂无摘要。'}</p>
                      </div>
                      <div className="flex flex-wrap justify-end gap-2">
                        <Link
                          href={`/admin/articles?article=${article.id}`}
                          className={cn(buttonVariants({ variant: 'secondary', size: 'sm' }), 'rounded-full')}
                        >
                          打开编辑器
                        </Link>
                        <Link
                          href={getArticlePath(article.articleType, article.slug)}
                          target="_blank"
                          className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'rounded-full')}
                        >
                          <ExternalLink className="mr-2 h-4 w-4" />
                          打开
                        </Link>
                        <Button
                          size="sm"
                          variant="secondary"
                          disabled={isPending}
                          onClick={() =>
                            triggerAction({
                              path: `/api/admin/articles/${article.id}/regenerate`,
                              successMessage: 'Article regenerated through full pipeline'
                            })
                          }
                        >
                          重新生成
                        </Button>
                      </div>
                    </div>
                    <div className="mt-4 text-xs text-muted-foreground">
                      关键词：{article.keyword || '暂无'} | 发布时间：{formatDate(article.publishedAt)}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">暂无生成文章。</p>
              )}
            </div>

            <div className="mt-5 space-y-2">
              <p className="text-sm font-semibold">SEO 页面</p>
              {workspace.seoPages.length > 0 ? (
                workspace.seoPages.map((page) => (
                  <div key={page.id} className="rounded-xl border border-border p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium">{page.title}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{page.pathname}</p>
                        <p className="mt-1.5 text-xs text-muted-foreground">{page.metaDescription}</p>
                      </div>
                      <StatusBadge value={page.pageType} />
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">暂无 SEO 页面。</p>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-white p-4 shadow-sm lg:p-5">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-primary">近期运行</p>
            <h2 className="mt-1 font-[var(--font-display)] text-2xl font-semibold tracking-tight">执行历史</h2>
            <div className="mt-4 space-y-2">
              {workspace.recentRuns.length > 0 ? (
                workspace.recentRuns.map((run) => (
                  <div key={run.id} className="rounded-xl border border-border p-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="font-medium">运行 #{run.id}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">{run.currentStage || '空闲'}</p>
                      </div>
                      <StatusBadge value={run.status} />
                    </div>
                    {run.errorMessage ? <p className="mt-2 text-sm text-rose-700">{run.errorMessage}</p> : null}
                    <p className="mt-2 break-all text-xs text-muted-foreground">{run.sourceLink}</p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">暂无运行记录。</p>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
