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
      title: 'Rebuild Content Pack',
      description: 'Reuse the current product facts and media to regenerate keyword opportunities, the review page, and the comparison page without re-scraping the landing page.',
      badge: `${workspace.keywords.length} keywords · ${workspace.articles.length} articles`,
      accentClassName: 'bg-[#f7f1e4] text-primary',
      cta: 'Queue Content Pack',
      successMessage: 'Content pack queued and workspace refreshed',
      icon: Wand2,
      spanClassName: 'lg:col-span-2'
    },
    {
      id: 'mineKeywords',
      title: 'Mine Keywords',
      description: 'Refresh high-intent long-tail opportunities from the normalized product facts currently stored in the database.',
      badge: workspace.keywords.length > 0 ? `${workspace.keywords.length} saved` : 'Not generated',
      accentClassName: 'bg-sky-100 text-sky-800',
      cta: 'Queue Keyword Mining',
      successMessage: 'Keyword mining queued and workspace refreshed',
      icon: Search
    },
    {
      id: 'generateReview',
      title: 'Generate Review',
      description: 'Rebuild the product review article, regenerate its SEO payload, and republish the public review path.',
      badge: reviewArticle ? `Updated ${formatDate(reviewArticle.updatedAt)}` : 'Not generated',
      accentClassName: 'bg-rose-100 text-rose-800',
      cta: 'Queue Review',
      successMessage: 'Review article queued and workspace refreshed',
      icon: FileText
    },
    {
      id: 'generateComparison',
      title: 'Generate Comparison',
      description: 'Rebuild the alternatives article from the current product database and republish the comparison page.',
      badge: comparisonArticle ? `Updated ${formatDate(comparisonArticle.updatedAt)}` : 'Not generated',
      accentClassName: 'bg-indigo-100 text-indigo-800',
      cta: 'Queue Comparison',
      successMessage: 'Comparison article queued and workspace refreshed',
      icon: FileText
    },
    {
      id: 'refreshSeo',
      title: 'Refresh SEO',
      description: 'Recompute SEO title, meta description, and schema for all current product articles, then sync the linked SEO pages.',
      badge: workspace.seoPages.length > 0 ? `${workspace.seoPages.length} SEO pages` : 'No SEO pages yet',
      accentClassName: 'bg-emerald-100 text-emerald-800',
      cta: 'Queue SEO Refresh',
      successMessage: 'SEO refresh queued and workspace synchronized',
      icon: RefreshCw
    }
  ]

  const refreshWorkspace = async () => {
    const response = await fetch(`/api/admin/products/${workspace.product.id}`)
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}))
      throw new Error(payload.error || 'Failed to refresh workspace')
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
        toast.error(payload.error || 'Action failed')
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
    <div className="space-y-8 p-6 lg:p-10">
      <section className="rounded-[36px] border border-border bg-white p-8 shadow-panel">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="max-w-3xl">
            <Link
              href="/admin/products"
              className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'mb-5 rounded-full px-0 text-muted-foreground hover:bg-transparent')}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Products
            </Link>
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge value={workspace.product.sourcePlatform} />
              {workspace.affiliateSource ? <StatusBadge value={workspace.affiliateSource.platform} /> : null}
              {workspace.product.category ? <StatusBadge value={workspace.product.category} /> : null}
            </div>
            <p className="mt-4 font-mono text-xs uppercase tracking-[0.28em] text-primary">Product Workspace</p>
            <h1 className="mt-3 font-[var(--font-display)] text-4xl font-semibold tracking-tight text-foreground">
              {workspace.product.productName}
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground">
              {workspace.product.description || 'No product description has been captured yet. Re-run the pipeline after confirming the affiliate source link.'}
            </p>
          </div>
          <div className="flex flex-wrap justify-end gap-3">
            {workspace.affiliateSource ? (
              <Button
                disabled={isPending}
                onClick={() =>
                  triggerAction({
                    path: `/api/admin/products/${workspace.affiliateSource?.id}/run-pipeline`,
                    successMessage: 'Pipeline queued and workspace refreshed'
                  })
                }
              >
                <Wand2 className="mr-2 h-4 w-4" />
                Queue Full Pipeline
              </Button>
            ) : null}
            <Button
              disabled={isPending}
              variant="secondary"
              onClick={() =>
                triggerAction({
                  path: `/api/admin/products/${workspace.product.id}/rescrape-media`,
                  successMessage: 'Media rescraped and workspace refreshed'
                })
              }
            >
              <Scan className="mr-2 h-4 w-4" />
              Rescrape Media
            </Button>
            <Button
              disabled={isPending}
              variant="outline"
              onClick={() => {
                startTransition(async () => {
                  try {
                    await refreshWorkspace()
                    router.refresh()
                    toast.success('Workspace refreshed')
                  } catch (error) {
                    toast.error(error instanceof Error ? error.message : 'Refresh failed')
                  }
                })
              }}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
          </div>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-[24px] border border-border bg-[#f7f1e4] p-5">
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Price</p>
            <p className="mt-2 text-2xl font-semibold">{formatMoney(workspace.product.priceAmount, workspace.product.priceCurrency)}</p>
          </div>
          <div className="rounded-[24px] border border-border bg-[#f7f1e4] p-5">
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Rating</p>
            <p className="mt-2 text-2xl font-semibold">{workspace.product.rating ? `${workspace.product.rating.toFixed(1)} / 5` : 'N/A'}</p>
            <p className="mt-1 text-sm text-muted-foreground">{workspace.product.reviewCount ? `${workspace.product.reviewCount.toLocaleString()} reviews` : 'No review count'}</p>
          </div>
          <div className="rounded-[24px] border border-border bg-[#f7f1e4] p-5">
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Assets</p>
            <p className="mt-2 text-2xl font-semibold">{workspace.mediaAssets.length}</p>
            <p className="mt-1 text-sm text-muted-foreground">{reviewMedia.length} review images captured</p>
          </div>
          <div className="rounded-[24px] border border-border bg-[#f7f1e4] p-5">
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Content Output</p>
            <p className="mt-2 text-2xl font-semibold">{workspace.articles.length}</p>
            <p className="mt-1 text-sm text-muted-foreground">{workspace.keywords.length} keyword opportunities saved</p>
          </div>
        </div>
      </section>

      <section className="rounded-[32px] border border-border bg-white p-8 shadow-panel">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl">
            <p className="font-mono text-xs uppercase tracking-[0.24em] text-primary">Workflow Controls</p>
            <h2 className="mt-2 font-[var(--font-display)] text-3xl font-semibold tracking-tight">Drive the funnel one stage at a time</h2>
            <p className="mt-3 text-sm leading-7 text-muted-foreground">
              Use the stored product facts when you only need to rerun keywords, content, or SEO. Keep the full pipeline for cases where the landing page itself changed.
            </p>
          </div>
          <div className="rounded-[24px] border border-border bg-[#f7f1e4] px-5 py-4 text-sm text-muted-foreground">
            Full pipeline is still available above for link resolution and fresh scraping.
          </div>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
          {workflowActions.map((action) => {
            const Icon = action.icon
            return (
              <div
                key={action.id}
                className={cn(
                  'rounded-[28px] border border-border p-5',
                  action.id === 'contentPack' ? 'bg-[#f7f1e4]' : 'bg-white',
                  action.spanClassName
                )}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className={cn('rounded-2xl p-3', action.accentClassName)}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <span className="rounded-full bg-white/80 px-3 py-1 text-xs font-semibold text-slate-700">
                    {action.badge}
                  </span>
                </div>
                <h3 className="mt-4 text-xl font-semibold">{action.title}</h3>
                <p className="mt-3 text-sm leading-7 text-muted-foreground">{action.description}</p>
                <Button
                  className="mt-5 w-full"
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

      <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="space-y-6">
          <div className="rounded-[32px] border border-border bg-white p-8 shadow-panel">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-mono text-xs uppercase tracking-[0.24em] text-primary">Product Facts</p>
                <h2 className="mt-2 font-[var(--font-display)] text-3xl font-semibold tracking-tight">Normalized record</h2>
              </div>
              {workspace.product.resolvedUrl ? (
                <Link
                  href={workspace.product.resolvedUrl}
                  target="_blank"
                  className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'rounded-full')}
                >
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Open Landing Page
                </Link>
              ) : null}
            </div>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div className="space-y-4 rounded-[24px] border border-border p-5">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Brand</p>
                  <p className="mt-1 font-medium">{workspace.product.brand || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Model</p>
                  <p className="mt-1 font-medium">{workspace.product.productModel || workspace.product.modelNumber || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Product Type</p>
                  <p className="mt-1 font-medium">{workspace.product.productType || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Slug</p>
                  <p className="mt-1 font-medium">{workspace.product.slug || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Updated</p>
                  <p className="mt-1 font-medium">{formatDate(workspace.product.updatedAt)}</p>
                </div>
              </div>
              <div className="space-y-4 rounded-[24px] border border-border p-5">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Source Affiliate Link</p>
                  <p className="mt-1 break-all text-sm text-muted-foreground">{workspace.product.sourceAffiliateLink}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Canonical URL</p>
                  <p className="mt-1 break-all text-sm text-muted-foreground">{workspace.product.canonicalUrl || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">YouTube Match Terms</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {workspace.product.youtubeMatchTerms.length ? workspace.product.youtubeMatchTerms.join(' · ') : 'N/A'}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-6 grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
              <div className="rounded-[24px] border border-border p-5">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Specs</p>
                <div className="mt-4 space-y-3">
                  {Object.entries(workspace.product.specs).length > 0 ? (
                    Object.entries(workspace.product.specs).map(([label, value]) => (
                      <div key={label} className="flex items-start justify-between gap-5 border-b border-border/70 pb-3 text-sm last:border-b-0 last:pb-0">
                        <span className="text-muted-foreground">{label}</span>
                        <span className="text-right font-medium">{value}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">No structured specs stored yet.</p>
                  )}
                </div>
              </div>
              <div className="rounded-[24px] border border-border p-5">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Review Highlights</p>
                <div className="mt-4 flex flex-wrap gap-3">
                  {workspace.product.reviewHighlights.length > 0 ? (
                    workspace.product.reviewHighlights.map((item) => (
                      <span key={item} className="rounded-full bg-[#f7f1e4] px-4 py-2 text-sm text-slate-700">
                        {item}
                      </span>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">No review highlights stored yet.</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-[32px] border border-border bg-white p-8 shadow-panel">
            <p className="font-mono text-xs uppercase tracking-[0.24em] text-primary">Keyword Mining</p>
            <h2 className="mt-2 font-[var(--font-display)] text-3xl font-semibold tracking-tight">High-intent opportunities</h2>
            <div className="mt-6 overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-border text-xs uppercase tracking-[0.18em] text-muted-foreground">
                  <tr>
                    <th className="pb-3 pr-4">Keyword</th>
                    <th className="pb-3 pr-4">Score</th>
                    <th className="pb-3 pr-4">Intent</th>
                    <th className="pb-3 pr-4">SERP</th>
                    <th className="pb-3 pr-4">Fit</th>
                  </tr>
                </thead>
                <tbody>
                  {workspace.keywords.length > 0 ? (
                    workspace.keywords.map((keyword) => (
                      <tr key={keyword.id} className="border-b border-border/70 last:border-b-0">
                        <td className="py-4 pr-4 font-medium">{keyword.keyword}</td>
                        <td className={cn('py-4 pr-4 font-semibold', scoreTone(keyword.totalScore))}>{keyword.totalScore.toFixed(1)}</td>
                        <td className="py-4 pr-4 text-muted-foreground">{keyword.buyerIntent.toFixed(1)}</td>
                        <td className="py-4 pr-4 text-muted-foreground">{keyword.serpWeakness.toFixed(1)}</td>
                        <td className="py-4 pr-4 text-muted-foreground">{keyword.contentFit.toFixed(1)}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="py-6 text-muted-foreground">No keyword opportunities found yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-[32px] border border-border bg-white p-8 shadow-panel">
            <p className="font-mono text-xs uppercase tracking-[0.24em] text-primary">Pipeline Detail</p>
            <h2 className="mt-2 font-[var(--font-display)] text-3xl font-semibold tracking-tight">Latest run jobs</h2>
            <div className="mt-6 space-y-4">
              {workspace.latestRunJobs.length > 0 ? (
                workspace.latestRunJobs.map((job) => (
                  <div key={job.id} className="rounded-[24px] border border-border p-5">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="font-medium">{job.stage}</p>
                        <p className="mt-1 text-sm text-muted-foreground">{job.message || 'No job note captured'}</p>
                      </div>
                      <StatusBadge value={job.status} />
                    </div>
                    <p className="mt-3 text-xs text-muted-foreground">
                      {formatDate(job.startedAt)} to {formatDate(job.finishedAt)}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No pipeline jobs recorded yet.</p>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-[32px] border border-border bg-white p-8 shadow-panel">
            <p className="font-mono text-xs uppercase tracking-[0.24em] text-primary">Media Assets</p>
            <h2 className="mt-2 font-[var(--font-display)] text-3xl font-semibold tracking-tight">Hero, gallery, and review images</h2>

            {heroMedia ? (
              <div className="mt-6 rounded-[28px] border border-border bg-[#f7f1e4] p-4">
                <div className="relative aspect-[16/10] overflow-hidden rounded-[22px]">
                  <Image
                    src={heroMedia.publicUrl}
                    alt={workspace.product.productName}
                    fill
                    sizes="(max-width: 1280px) 100vw, 40vw"
                    className="object-cover"
                  />
                </div>
                <div className="mt-3 flex items-center justify-between gap-4">
                  <div>
                    <p className="font-medium">Hero image</p>
                    <p className="text-sm text-muted-foreground">{formatDate(heroMedia.createdAt)}</p>
                  </div>
                  <StatusBadge value={heroMedia.assetRole} />
                </div>
              </div>
            ) : null}

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {galleryMedia.map((asset) => (
                <div key={asset.id} className="rounded-[24px] border border-border p-3">
                  <div className="relative aspect-[4/3] overflow-hidden rounded-[18px] bg-[#f7f1e4]">
                    <Image src={asset.publicUrl} alt={`${workspace.product.productName} gallery`} fill sizes="(max-width: 1280px) 50vw, 20vw" className="object-cover" />
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <span className="text-sm font-medium">Gallery</span>
                    <StatusBadge value={asset.assetRole} />
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6">
              <div className="mb-4 flex items-center justify-between gap-4">
                <p className="text-sm font-semibold">Review images</p>
                <p className="text-sm text-muted-foreground">{reviewMedia.length} captured</p>
              </div>
              <div className="grid gap-3 grid-cols-2 sm:grid-cols-3">
                {reviewMedia.length > 0 ? (
                  reviewMedia.map((asset) => (
                    <div key={asset.id} className="relative aspect-square overflow-hidden rounded-[18px] border border-border bg-[#f7f1e4]">
                      <Image src={asset.publicUrl} alt={`${workspace.product.productName} review`} fill sizes="(max-width: 1280px) 33vw, 12vw" className="object-cover" />
                    </div>
                  ))
                ) : (
                  <p className="col-span-full text-sm text-muted-foreground">No review images stored yet.</p>
                )}
              </div>
            </div>
          </div>

          <div className="rounded-[32px] border border-border bg-white p-8 shadow-panel">
            <p className="font-mono text-xs uppercase tracking-[0.24em] text-primary">Generated Content</p>
            <h2 className="mt-2 font-[var(--font-display)] text-3xl font-semibold tracking-tight">Articles and SEO pages</h2>
            <div className="mt-6 space-y-4">
              {workspace.articles.length > 0 ? (
                workspace.articles.map((article) => (
                  <div key={article.id} className="rounded-[24px] border border-border p-5">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <div className="flex flex-wrap gap-2">
                          <StatusBadge value={article.articleType} />
                          <StatusBadge value={article.status} />
                        </div>
                        <p className="mt-3 font-medium">{article.title}</p>
                        <p className="mt-2 text-sm text-muted-foreground">{article.summary || 'No summary available.'}</p>
                      </div>
                      <div className="flex flex-wrap justify-end gap-2">
                        <Link
                          href={`/admin/articles?article=${article.id}`}
                          className={cn(buttonVariants({ variant: 'secondary', size: 'sm' }), 'rounded-full')}
                        >
                          Open Editor
                        </Link>
                        <Link
                          href={getArticlePath(article.articleType, article.slug)}
                          target="_blank"
                          className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'rounded-full')}
                        >
                          <ExternalLink className="mr-2 h-4 w-4" />
                          Open
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
                          Regenerate
                        </Button>
                      </div>
                    </div>
                    <div className="mt-4 text-xs text-muted-foreground">
                      Keyword: {article.keyword || 'N/A'} | Published: {formatDate(article.publishedAt)}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No articles generated yet.</p>
              )}
            </div>

            <div className="mt-8 space-y-4">
              <p className="text-sm font-semibold">SEO pages</p>
              {workspace.seoPages.length > 0 ? (
                workspace.seoPages.map((page) => (
                  <div key={page.id} className="rounded-[24px] border border-border p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-medium">{page.title}</p>
                        <p className="mt-1 text-sm text-muted-foreground">{page.pathname}</p>
                        <p className="mt-2 text-sm text-muted-foreground">{page.metaDescription}</p>
                      </div>
                      <StatusBadge value={page.pageType} />
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No SEO pages generated yet.</p>
              )}
            </div>
          </div>

          <div className="rounded-[32px] border border-border bg-white p-8 shadow-panel">
            <p className="font-mono text-xs uppercase tracking-[0.24em] text-primary">Recent Runs</p>
            <h2 className="mt-2 font-[var(--font-display)] text-3xl font-semibold tracking-tight">Execution history</h2>
            <div className="mt-6 space-y-4">
              {workspace.recentRuns.length > 0 ? (
                workspace.recentRuns.map((run) => (
                  <div key={run.id} className="rounded-[24px] border border-border p-5">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="font-medium">Run #{run.id}</p>
                        <p className="mt-1 text-sm text-muted-foreground">{run.currentStage || 'idle'}</p>
                      </div>
                      <StatusBadge value={run.status} />
                    </div>
                    {run.errorMessage ? <p className="mt-3 text-sm text-rose-700">{run.errorMessage}</p> : null}
                    <p className="mt-3 break-all text-xs text-muted-foreground">{run.sourceLink}</p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No runs recorded yet.</p>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
