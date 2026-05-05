'use client'

import Link from 'next/link'
import { useEffect, useState, useTransition } from 'react'
import { CalendarClock, Globe2, Play, Rocket, Rss, Search, ShieldCheck } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { StatusBadge } from '@/components/admin/StatusBadge'

type SeoOpsSummary = {
  automationDefaults: {
    apply: boolean
    pushIndex: boolean
    limit: number
    signalFile: string
    signalSource: string
    minPriority: number
    signalDays: number
  }
  supportedLocales: string[]
  seoRemediationQueue: Array<{
    severity: 'high' | 'medium' | 'low'
    issueType: string
    pathname: string
    title: string
    issueDetail: string
    articleId: number | null
    productId: number | null
    adminHref: string | null
    publicHref: string
    recommendedAction: string
    updatedAt: string | null
  }>
  seoAlignmentAudit: {
    scannedPages: number
    affectedPages: number
    issuesFound: number
    findings: Array<{
      pathname: string
      title: string
      pageType: string
      articleType: string | null
      issueType: string
      issueDetail: string
      updatedAt: string | null
    }>
  }
  renderedPageAudit: {
    scannedPages: number
    affectedPages: number
    issuesFound: number
    findings: Array<{
      pathname: string
      title: string
      issueType: string
      issueDetail: string
      checkedAt: string
    }>
  }
  trustSurfaceAudit: {
    scannedPages: number
    affectedPages: number
    issuesFound: number
    findings: Array<{
      pathname: string
      title: string
      issueType: string
      issueDetail: string
      checkedAt: string
    }>
  }
  lastLinkInspectorRun: {
    runId: number
    status: string
    totalChecked: number
    issuesFound: number
    brokenCount: number
    outOfStockCount: number
    finishedAt: string | null
  } | null
  latestLinkIssues: Array<{
    id: number
    productId: number | null
    productName: string | null
    sourceUrl: string
    finalUrl: string | null
    httpStatus: number | null
    issueType: string | null
    issueDetail: string | null
    checkedAt: string
  }>
  recentIndexingEvents: Array<{
    id: number
    status: string
    payloadJson: string | null
    createdAt: string
  }>
  recentSyndicationEvents: Array<{
    id: number
    status: string
    payloadJson: string | null
    createdAt: string
  }>
}

type AutomationResult = {
  ok: boolean
  apply: boolean
  pushIndex: boolean
  importedSignals: number
  updatedTags: number
  promotedTags: number
  rescanJobs: number
  pseoPaths: number
  indexing: string
  samplePaths: string[]
}

function formatDate(value: string | null) {
  if (!value) return 'N/A'
  return new Date(value).toLocaleString()
}

function summarizePayload(payloadJson: string | null) {
  if (!payloadJson) return 'No payload captured'
  try {
    const parsed = JSON.parse(payloadJson) as Record<string, unknown>
    if (Array.isArray(parsed.urls)) {
      return `${parsed.urls.length} URL notifications`
    }
    if (Array.isArray(parsed.results)) {
      return `${parsed.results.length} syndication deliveries`
    }
    if (typeof parsed.reason === 'string') {
      return parsed.reason
    }
  } catch {
    return 'Payload available'
  }

  return 'Payload available'
}

export function SeoOpsConsole() {
  const [summary, setSummary] = useState<SeoOpsSummary | null>(null)
  const [automationResult, setAutomationResult] = useState<AutomationResult | null>(null)
  const [automationConfig, setAutomationConfig] = useState({
    limit: '200',
    signalDays: '30',
    minPriority: '0.5',
    signalFile: '',
    signalSource: 'ga4',
    pushIndex: false
  })
  const [isPending, startTransition] = useTransition()

  const load = async () => {
    const response = await fetch('/api/admin/seo-ops')
    if (!response.ok) {
      throw new Error('Failed to load SEO operations summary')
    }
    const payload = (await response.json()) as SeoOpsSummary
    setSummary(payload)
    setAutomationConfig((current) => ({
      ...current,
      limit: String(payload.automationDefaults.limit || current.limit),
      signalDays: String(payload.automationDefaults.signalDays || current.signalDays),
      minPriority: String(payload.automationDefaults.minPriority || current.minPriority),
      signalFile: payload.automationDefaults.signalFile || current.signalFile,
      signalSource: payload.automationDefaults.signalSource || current.signalSource,
      pushIndex: payload.automationDefaults.pushIndex || current.pushIndex
    }))
  }

  useEffect(() => {
    void load().catch(() => undefined)
  }, [])

  const triggerAction = (action: 'linkInspector' | 'reindex' | 'syndicate', successMessage: string) => {
    startTransition(async () => {
      const response = await fetch('/api/admin/seo-ops', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ action })
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) {
        toast.error(payload.error || 'Action failed')
        return
      }
      await load()
      toast.success(successMessage)
    })
  }

  const triggerAutomation = (action: 'automationPreview' | 'automationApply') => {
    startTransition(async () => {
      const response = await fetch('/api/admin/seo-ops', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action,
          limit: Number(automationConfig.limit),
          signalDays: Number(automationConfig.signalDays),
          minPriority: Number(automationConfig.minPriority),
          signalFile: automationConfig.signalFile.trim(),
          signalSource: automationConfig.signalSource.trim() || 'ga4',
          pushIndex: automationConfig.pushIndex
        })
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) {
        toast.error(payload.error || 'SEO 自动化失败')
        return
      }
      setAutomationResult(payload.result as AutomationResult)
      await load()
      toast.success(action === 'automationApply' ? 'SEO 自动化已应用' : 'SEO 自动化预览已完成')
    })
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <div>
          <h1 className="page-title">SEO 运营</h1>
          <p className="page-subtitle max-w-3xl">
            统一管理索引、外部分发、商家链接巡检，并确认搜索引擎可见的多语言足迹。
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button disabled={isPending} onClick={() => triggerAction('linkInspector', '链接巡检已完成')}>
              <Search className="mr-2 h-4 w-4" />
              运行链接巡检
            </Button>
            <Button disabled={isPending} variant="secondary" onClick={() => triggerAction('reindex', 'Google 索引重跑完成')}>
              <Globe2 className="mr-2 h-4 w-4" />
              重跑 Google 索引
            </Button>
            <Button disabled={isPending} variant="secondary" onClick={() => triggerAction('syndicate', '外部分发完成')}>
              <Rss className="mr-2 h-4 w-4" />
              分发 Syndication
            </Button>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-1">
          <div className="rounded-lg border bg-card p-3 shadow-sm">
            <p className="text-sm font-medium text-muted-foreground">语言足迹</p>
            <p className="mt-1 text-2xl font-bold tracking-tight text-slate-950">{summary?.supportedLocales.length || 0}</p>
            <p className="mt-1 text-xs text-slate-600">通过 hreflang 和 sitemap 暴露的公开语言版本。</p>
          </div>
          <div className="rounded-lg border bg-card p-3 shadow-sm">
            <p className="text-sm font-medium text-muted-foreground">SEO 对齐审计</p>
            <p className="mt-1 text-2xl font-bold tracking-tight text-slate-950">{summary?.seoAlignmentAudit.affectedPages || 0}</p>
            <p className="mt-1 text-xs text-slate-600">
              {summary?.seoAlignmentAudit
                ? `${summary.seoAlignmentAudit.scannedPages} 个已发布 SEO 页中有 ${summary.seoAlignmentAudit.issuesFound} 个问题。`
                : '暂无对齐审计快照。'}
            </p>
          </div>
          <div className="rounded-lg border bg-card p-3 shadow-sm">
            <p className="text-sm font-medium text-muted-foreground">渲染页审计</p>
            <p className="mt-1 text-2xl font-bold tracking-tight text-slate-950">{summary?.seoRemediationQueue.length || 0}</p>
            <p className="mt-1 text-xs text-slate-600">
              {summary?.seoRemediationQueue.length
                ? '已有优先修复项待处理。'
                : '当前队列没有活跃修复项。'}
            </p>
          </div>
          <div className="rounded-lg border bg-card p-3 shadow-sm">
            <p className="text-sm font-medium text-muted-foreground">信任面审计</p>
            <p className="mt-1 text-2xl font-bold tracking-tight text-slate-950">{summary?.trustSurfaceAudit.affectedPages || 0}</p>
            <p className="mt-1 text-xs text-slate-600">
              {summary?.trustSurfaceAudit
                ? `${summary.trustSurfaceAudit.scannedPages} 个信任与机器入口页中有 ${summary.trustSurfaceAudit.issuesFound} 个问题。`
                : '暂无信任面审计快照。'}
            </p>
          </div>
          <div className="rounded-lg border bg-card p-3 shadow-sm">
            <p className="text-sm font-medium text-muted-foreground">最近链接巡检</p>
            <p className="mt-1 text-2xl font-bold tracking-tight text-slate-950">{summary?.lastLinkInspectorRun?.totalChecked || 0}</p>
            <p className="mt-1 text-xs text-slate-600">
              {summary?.lastLinkInspectorRun ? `最近一次发现 ${summary.lastLinkInspectorRun.issuesFound} 个问题。` : '暂无巡检记录。'}
            </p>
          </div>
          <div className="rounded-lg border bg-card p-3 shadow-sm">
            <p className="text-sm font-medium text-muted-foreground">近期 SEO 事件</p>
            <p className="mt-1 text-2xl font-bold tracking-tight text-slate-950">
              {(summary?.recentIndexingEvents.length || 0) + (summary?.recentSyndicationEvents.length || 0)}
            </p>
            <p className="mt-1 text-xs text-slate-600">发布事件日志中的索引与分发记录。</p>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200/70 bg-white/90 p-4 shadow-sm lg:p-5">
        <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
          <div>
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-md bg-slate-950 text-white">
                <CalendarClock className="h-4 w-4" />
              </span>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">SEO Automation</p>
                <h2 className="mt-1 text-xl font-black tracking-tight text-slate-950">Scheduled pSEO runbook</h2>
              </div>
            </div>
            <p className="mt-3 max-w-2xl text-xs leading-5 text-slate-600">
              面板和 cron 共用同一 runner。预览只做校验和路径发现；应用会导入搜索信号、更新分类状态，并可推送 pSEO URL 到索引。
            </p>
            <div className="mt-4 grid gap-2 text-sm text-slate-700 sm:grid-cols-3">
              <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
                <ShieldCheck className="h-4 w-4 text-emerald-700" />
                <p className="mt-2 font-semibold text-slate-950">先预览</p>
                <p className="mt-1 text-xs leading-5 text-slate-500">不写入，不调用索引。</p>
              </div>
              <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
                <Play className="h-4 w-4 text-primary" />
                <p className="mt-2 font-semibold text-slate-950">应用信号</p>
                <p className="mt-1 text-xs leading-5 text-slate-500">更新分类和重扫任务。</p>
              </div>
              <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
                <Rocket className="h-4 w-4 text-amber-700" />
                <p className="mt-2 font-semibold text-slate-950">推送索引</p>
                <p className="mt-1 text-xs leading-5 text-slate-500">需要 Google 凭据。</p>
              </div>
            </div>
          </div>

          <div className="rounded-md border border-slate-200 bg-slate-50/70 p-4">
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="seo-automation-limit">路径上限</Label>
                <Input
                  id="seo-automation-limit"
                  type="number"
                  min={1}
                  value={automationConfig.limit}
                  onChange={(event) => setAutomationConfig((current) => ({ ...current, limit: event.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="seo-automation-signal-days">信号窗口天数</Label>
                <Input
                  id="seo-automation-signal-days"
                  type="number"
                  min={1}
                  value={automationConfig.signalDays}
                  onChange={(event) => setAutomationConfig((current) => ({ ...current, signalDays: event.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="seo-automation-min-priority">最低优先级</Label>
                <Input
                  id="seo-automation-min-priority"
                  type="number"
                  min={0}
                  step={0.05}
                  value={automationConfig.minPriority}
                  onChange={(event) => setAutomationConfig((current) => ({ ...current, minPriority: event.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="seo-automation-signal-source">信号来源</Label>
                <Input
                  id="seo-automation-signal-source"
                  value={automationConfig.signalSource}
                  onChange={(event) => setAutomationConfig((current) => ({ ...current, signalSource: event.target.value }))}
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="seo-automation-signal-file">信号文件路径</Label>
                <Input
                  id="seo-automation-signal-file"
                  value={automationConfig.signalFile}
                  placeholder="./ga4-pseo.csv"
                  onChange={(event) => setAutomationConfig((current) => ({ ...current, signalFile: event.target.value }))}
                />
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-md border border-slate-200 bg-white p-3">
              <div>
                <Label htmlFor="seo-automation-push-index">Push indexing after apply</Label>
                <p className="mt-1 text-xs leading-5 text-slate-500">使用已配置的 Google Indexing API 凭据。</p>
              </div>
              <Switch
                id="seo-automation-push-index"
                checked={automationConfig.pushIndex}
                onCheckedChange={(checked) => setAutomationConfig((current) => ({ ...current, pushIndex: checked }))}
              />
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <Button disabled={isPending} variant="secondary" onClick={() => triggerAutomation('automationPreview')}>
                <ShieldCheck className="mr-2 h-4 w-4" />
                Preview Run
              </Button>
              <Button disabled={isPending} onClick={() => triggerAutomation('automationApply')}>
                <Play className="mr-2 h-4 w-4" />
                Apply Run
              </Button>
            </div>

            {automationResult ? (
              <div className="mt-4 rounded-md border border-slate-200 bg-white p-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="font-semibold text-slate-950">最近自动化结果</p>
                  <StatusBadge value={automationResult.ok ? 'configured' : 'warning'} />
                </div>
                <div className="mt-3 grid gap-2 text-sm sm:grid-cols-3">
                  <span>{automationResult.pseoPaths} 条路径</span>
                  <span>{automationResult.updatedTags} 个更新标签</span>
                  <span>{automationResult.promotedTags} 个提升标签</span>
                  <span>{automationResult.importedSignals} 条信号</span>
                  <span>{automationResult.rescanJobs} 个重扫任务</span>
                  <span>{automationResult.indexing}</span>
                </div>
                <div className="mt-3 max-h-28 overflow-auto whitespace-pre-wrap rounded-md bg-slate-950 p-3 text-xs leading-6 text-slate-100">
                  {automationResult.samplePaths.length ? automationResult.samplePaths.join('\n') : '没有返回示例路径'}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200/70 bg-white/90 p-4 shadow-sm lg:p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">SEO 修复队列</p>
            <h2 className="mt-1 text-xl font-black tracking-tight text-slate-950">当前 SEO 审计的优先修复项</h2>
          </div>
          <StatusBadge value={summary?.seoRemediationQueue.length ? 'warning' : 'configured'} />
        </div>
        <div className="mt-4 space-y-3">
          {summary?.seoRemediationQueue.length ? (
            summary.seoRemediationQueue.map((item, index) => (
              <div key={`${item.pathname}-${item.issueType}-${index}`} className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-950">{item.title}</p>
                    <p className="mt-1 break-all text-xs text-slate-500">{item.pathname}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <StatusBadge value={item.severity} />
                    <StatusBadge value={item.issueType} />
                  </div>
                </div>
                <p className="mt-2 text-xs leading-5 text-slate-600">{item.issueDetail}</p>
                <p className="mt-1.5 text-sm font-medium text-slate-800">{item.recommendedAction}</p>
                <div className="mt-3 flex flex-wrap gap-3 text-sm">
                  <Link href={item.publicHref} className="font-semibold text-primary transition-colors hover:text-primary/80">
                    打开前台页
                  </Link>
                  {item.adminHref ? (
                    <Link href={item.adminHref} className="font-semibold text-primary transition-colors hover:text-primary/80">
                      打开后台编辑器
                    </Link>
                  ) : null}
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/70 px-4 py-6 text-center text-sm text-slate-500">
              暂无活跃修复项。当前审计未发现优先 SEO 问题。
            </div>
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200/70 bg-white/90 p-4 shadow-sm lg:p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">支持语言</p>
            <h2 className="mt-1 text-xl font-black tracking-tight text-slate-950">面向索引的多语言足迹</h2>
          </div>
          <StatusBadge value={summary?.supportedLocales.length ? 'configured' : 'missing'} />
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {(summary?.supportedLocales || []).map((locale) => (
            <span key={locale} className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-slate-700">
              {locale}
            </span>
          ))}
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1fr_1fr_0.9fr]">
        <div className="rounded-2xl border border-slate-200/70 bg-white/90 p-4 shadow-sm lg:p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">SEO 对齐审计</p>
              <h2 className="mt-1 text-xl font-black tracking-tight text-slate-950">URL、标题、canonical 与标题层级</h2>
            </div>
            <StatusBadge value={summary?.seoAlignmentAudit.issuesFound ? 'warning' : 'configured'} />
          </div>

          <div className="mt-4 space-y-3">
            {summary?.seoAlignmentAudit.findings.length ? (
              summary.seoAlignmentAudit.findings.map((finding, index) => (
                <div key={`${finding.pathname}-${finding.issueType}-${index}`} className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-950">{finding.title}</p>
                      <p className="mt-1 break-all text-xs text-slate-500">{finding.pathname}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <StatusBadge value={finding.issueType} />
                      <StatusBadge value={finding.articleType || finding.pageType} />
                    </div>
                  </div>
                  <p className="mt-2 text-xs leading-5 text-slate-600">{finding.issueDetail}</p>
                  <p className="mt-2 text-xs uppercase tracking-[0.14em] text-slate-500">
                    更新于 {formatDate(finding.updatedAt)}
                  </p>
                </div>
              ))
            ) : (
              <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/70 px-4 py-6 text-center text-sm text-slate-500">
                最新已发布 SEO 页面快照中没有发现对齐问题。
              </div>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200/70 bg-white/90 p-4 shadow-sm lg:p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">链接巡检</p>
              <h2 className="mt-1 text-xl font-black tracking-tight text-slate-950">失效或缺货目标页</h2>
            </div>
            <StatusBadge value={summary?.latestLinkIssues.length ? 'partial' : 'configured'} />
          </div>

          <div className="mt-4 space-y-3">
            {summary?.latestLinkIssues.length ? (
              summary.latestLinkIssues.map((issue) => (
                <div key={issue.id} className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-950">{issue.productName || issue.sourceUrl}</p>
                      <p className="mt-1 break-all text-xs text-slate-500">{issue.sourceUrl}</p>
                    </div>
                    <StatusBadge value={issue.issueType || 'warning'} />
                  </div>
                  <p className="mt-2 text-xs leading-5 text-slate-600">{issue.issueDetail || '链接巡检标记了这个目标页。'}</p>
                  <div className="mt-3 flex flex-wrap gap-3 text-xs uppercase tracking-[0.14em] text-slate-500">
                    <span>检查于 {formatDate(issue.checkedAt)}</span>
                    <span>{issue.httpStatus ? `HTTP ${issue.httpStatus}` : 'No status'}</span>
                    {issue.finalUrl ? <span className="break-all">Final {issue.finalUrl}</span> : null}
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/70 px-4 py-6 text-center text-sm text-slate-500">
                暂无链接问题。运行巡检可刷新健康快照。
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200/70 bg-white/90 p-4 shadow-sm lg:p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">渲染页审计</p>
                <h2 className="mt-1 text-xl font-black tracking-tight text-slate-950">Canonical、Meta、OG、JSON-LD 与 H1</h2>
              </div>
              <StatusBadge value={summary?.renderedPageAudit.issuesFound ? 'warning' : 'configured'} />
            </div>
            <div className="mt-4 space-y-2">
              {summary?.renderedPageAudit.findings.length ? (
                summary.renderedPageAudit.findings.map((finding, index) => (
                  <div key={`${finding.pathname}-${finding.issueType}-${index}`} className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-semibold text-slate-950">{finding.title}</p>
                      <StatusBadge value={finding.issueType} />
                    </div>
                    <p className="mt-1 break-all text-xs text-slate-500">{finding.pathname}</p>
                    <p className="mt-1.5 text-xs text-slate-600">{finding.issueDetail}</p>
                    <p className="mt-1.5 text-xs uppercase tracking-[0.14em] text-slate-500">{formatDate(finding.checkedAt)}</p>
                  </div>
                ))
              ) : (
                <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/70 px-4 py-6 text-center text-sm text-slate-500">
                  最新公开页面快照中没有发现渲染页 SEO 问题。
                </div>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200/70 bg-white/90 p-4 shadow-sm lg:p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">信任面审计</p>
                <h2 className="mt-1 text-xl font-black tracking-tight text-slate-950">关于、联系、政策、数据文档与 llms.txt</h2>
              </div>
              <StatusBadge value={summary?.trustSurfaceAudit.issuesFound ? 'warning' : 'configured'} />
            </div>
            <div className="mt-4 space-y-2">
              {summary?.trustSurfaceAudit.findings.length ? (
                summary.trustSurfaceAudit.findings.map((finding, index) => (
                  <div key={`${finding.pathname}-${finding.issueType}-${index}`} className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-semibold text-slate-950">{finding.title}</p>
                      <StatusBadge value={finding.issueType} />
                    </div>
                    <p className="mt-1 break-all text-xs text-slate-500">{finding.pathname}</p>
                    <p className="mt-1.5 text-xs text-slate-600">{finding.issueDetail}</p>
                    <p className="mt-1.5 text-xs uppercase tracking-[0.14em] text-slate-500">{formatDate(finding.checkedAt)}</p>
                  </div>
                ))
              ) : (
                <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/70 px-4 py-6 text-center text-sm text-slate-500">
                  信任与机器入口页面中暂无当前问题。
                </div>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200/70 bg-white/90 p-4 shadow-sm lg:p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">Google 索引</p>
                <h2 className="mt-1 text-xl font-black tracking-tight text-slate-950">近期索引事件</h2>
              </div>
              <StatusBadge value={summary?.recentIndexingEvents.length ? 'configured' : 'missing'} />
            </div>
            <div className="mt-4 space-y-2">
              {(summary?.recentIndexingEvents || []).map((event) => (
                <div key={event.id} className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-semibold text-slate-950">事件 #{event.id}</p>
                    <StatusBadge value={event.status} />
                  </div>
                  <p className="mt-1.5 text-xs text-slate-600">{summarizePayload(event.payloadJson)}</p>
                  <p className="mt-1.5 text-xs uppercase tracking-[0.14em] text-slate-500">{formatDate(event.createdAt)}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200/70 bg-white/90 p-4 shadow-sm lg:p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">外部分发</p>
                <h2 className="mt-1 text-xl font-black tracking-tight text-slate-950">近期外部分发</h2>
              </div>
              <StatusBadge value={summary?.recentSyndicationEvents.length ? 'configured' : 'missing'} />
            </div>
            <div className="mt-4 space-y-2">
              {(summary?.recentSyndicationEvents || []).map((event) => (
                <div key={event.id} className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-semibold text-slate-950">事件 #{event.id}</p>
                    <StatusBadge value={event.status} />
                  </div>
                  <p className="mt-1.5 text-xs text-slate-600">{summarizePayload(event.payloadJson)}</p>
                  <p className="mt-1.5 text-xs uppercase tracking-[0.14em] text-slate-500">{formatDate(event.createdAt)}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
