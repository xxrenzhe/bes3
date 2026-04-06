'use client'

import { useEffect, useState, useTransition } from 'react'
import { Globe2, Rss, Search } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/admin/StatusBadge'

type SeoOpsSummary = {
  supportedLocales: string[]
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
  const [isPending, startTransition] = useTransition()

  const load = async () => {
    const response = await fetch('/api/admin/seo-ops')
    if (!response.ok) {
      throw new Error('Failed to load SEO operations summary')
    }
    setSummary((await response.json()) as SeoOpsSummary)
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

  return (
    <div className="space-y-8 p-6 lg:p-10">
      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-[2.25rem] bg-[linear-gradient(135deg,#0f172a_0%,#1d4ed8_52%,#0f766e_100%)] p-8 text-white shadow-[0_35px_80px_-45px_rgba(15,23,42,0.8)] lg:p-10">
          <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-emerald-200/80">SEO Ops</p>
          <h1 className="mt-4 font-[var(--font-display)] text-4xl font-black tracking-tight sm:text-5xl">
            Indexing, syndication, and link health from one control surface.
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-8 text-slate-200">
            Use this panel to re-run Google indexing, dispatch external syndication payloads, inspect merchant links, and confirm the locale footprint exposed to search engines.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button disabled={isPending} className="rounded-full bg-white text-slate-950 hover:bg-slate-100" onClick={() => triggerAction('linkInspector', 'Link inspector completed')}>
              <Search className="mr-2 h-4 w-4" />
              Run Link Inspector
            </Button>
            <Button disabled={isPending} variant="secondary" className="rounded-full border border-white/15 bg-white/10 text-white hover:bg-white/15" onClick={() => triggerAction('reindex', 'Google indexing re-run finished')}>
              <Globe2 className="mr-2 h-4 w-4" />
              Re-run Google Indexing
            </Button>
            <Button disabled={isPending} variant="secondary" className="rounded-full border border-white/15 bg-white/10 text-white hover:bg-white/15" onClick={() => triggerAction('syndicate', 'Syndication dispatch finished')}>
              <Rss className="mr-2 h-4 w-4" />
              Dispatch Syndication
            </Button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-1">
          <div className="rounded-[1.75rem] border border-slate-200/70 bg-white/90 p-6 shadow-[0_26px_60px_-40px_rgba(15,23,42,0.26)]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-primary">Locale Footprint</p>
            <p className="mt-4 text-4xl font-black tracking-tight text-slate-950">{summary?.supportedLocales.length || 0}</p>
            <p className="mt-2 text-sm text-slate-600">Public locale variants currently exposed through hreflang and sitemap.</p>
          </div>
          <div className="rounded-[1.75rem] border border-slate-200/70 bg-white/90 p-6 shadow-[0_26px_60px_-40px_rgba(15,23,42,0.26)]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-primary">SEO Alignment Audit</p>
            <p className="mt-4 text-4xl font-black tracking-tight text-slate-950">{summary?.seoAlignmentAudit.affectedPages || 0}</p>
            <p className="mt-2 text-sm text-slate-600">
              {summary?.seoAlignmentAudit
                ? `${summary.seoAlignmentAudit.issuesFound} issue(s) across ${summary.seoAlignmentAudit.scannedPages} published SEO pages.`
                : 'No alignment audit snapshot yet.'}
            </p>
          </div>
          <div className="rounded-[1.75rem] border border-slate-200/70 bg-white/90 p-6 shadow-[0_26px_60px_-40px_rgba(15,23,42,0.26)]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-primary">Rendered Page Audit</p>
            <p className="mt-4 text-4xl font-black tracking-tight text-slate-950">{summary?.renderedPageAudit.affectedPages || 0}</p>
            <p className="mt-2 text-sm text-slate-600">
              {summary?.renderedPageAudit
                ? `${summary.renderedPageAudit.issuesFound} issue(s) across ${summary.renderedPageAudit.scannedPages} rendered pages.`
                : 'No rendered-page audit snapshot yet.'}
            </p>
          </div>
          <div className="rounded-[1.75rem] border border-slate-200/70 bg-white/90 p-6 shadow-[0_26px_60px_-40px_rgba(15,23,42,0.26)]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-primary">Latest Link Run</p>
            <p className="mt-4 text-4xl font-black tracking-tight text-slate-950">{summary?.lastLinkInspectorRun?.totalChecked || 0}</p>
            <p className="mt-2 text-sm text-slate-600">
              {summary?.lastLinkInspectorRun ? `${summary.lastLinkInspectorRun.issuesFound} issue(s) found in the last run.` : 'No inspection run yet.'}
            </p>
          </div>
          <div className="rounded-[1.75rem] border border-slate-200/70 bg-white/90 p-6 shadow-[0_26px_60px_-40px_rgba(15,23,42,0.26)]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-primary">Recent SEO Events</p>
            <p className="mt-4 text-4xl font-black tracking-tight text-slate-950">
              {(summary?.recentIndexingEvents.length || 0) + (summary?.recentSyndicationEvents.length || 0)}
            </p>
            <p className="mt-2 text-sm text-slate-600">Recent indexing and syndication dispatch records stored in the publish event log.</p>
          </div>
        </div>
      </section>

      <section className="rounded-[2rem] border border-slate-200/70 bg-white/90 p-8 shadow-[0_32px_70px_-40px_rgba(15,23,42,0.32)]">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-primary">Supported Locales</p>
            <h2 className="mt-3 text-2xl font-black tracking-tight text-slate-950">Locale-aware indexing footprint</h2>
          </div>
          <StatusBadge value={summary?.supportedLocales.length ? 'configured' : 'missing'} />
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          {(summary?.supportedLocales || []).map((locale) => (
            <span key={locale} className="rounded-full bg-slate-100 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-700">
              {locale}
            </span>
          ))}
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_1fr_0.9fr]">
        <div className="rounded-[2rem] border border-slate-200/70 bg-white/90 p-8 shadow-[0_32px_70px_-40px_rgba(15,23,42,0.32)]">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-primary">SEO Alignment Audit</p>
              <h2 className="mt-3 text-2xl font-black tracking-tight text-slate-950">URL, title, canonical, and heading-tree issues</h2>
            </div>
            <StatusBadge value={summary?.seoAlignmentAudit.issuesFound ? 'warning' : 'configured'} />
          </div>

          <div className="mt-6 space-y-4">
            {summary?.seoAlignmentAudit.findings.length ? (
              summary.seoAlignmentAudit.findings.map((finding, index) => (
                <div key={`${finding.pathname}-${finding.issueType}-${index}`} className="rounded-[1.5rem] border border-slate-200/80 bg-slate-50/70 p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-950">{finding.title}</p>
                      <p className="mt-2 break-all text-sm text-slate-500">{finding.pathname}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <StatusBadge value={finding.issueType} />
                      <StatusBadge value={finding.articleType || finding.pageType} />
                    </div>
                  </div>
                  <p className="mt-3 text-sm leading-7 text-slate-600">{finding.issueDetail}</p>
                  <p className="mt-3 text-xs uppercase tracking-[0.18em] text-slate-500">
                    Updated {formatDate(finding.updatedAt)}
                  </p>
                </div>
              ))
            ) : (
              <div className="rounded-[1.5rem] border border-dashed border-slate-200 bg-slate-50/70 px-5 py-10 text-center text-sm text-slate-500">
                No current alignment issues found in the latest published SEO page snapshot.
              </div>
            )}
          </div>
        </div>

        <div className="rounded-[2rem] border border-slate-200/70 bg-white/90 p-8 shadow-[0_32px_70px_-40px_rgba(15,23,42,0.32)]">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-primary">Link Inspector</p>
              <h2 className="mt-3 text-2xl font-black tracking-tight text-slate-950">Broken and out-of-stock destinations</h2>
            </div>
            <StatusBadge value={summary?.latestLinkIssues.length ? 'partial' : 'configured'} />
          </div>

          <div className="mt-6 space-y-4">
            {summary?.latestLinkIssues.length ? (
              summary.latestLinkIssues.map((issue) => (
                <div key={issue.id} className="rounded-[1.5rem] border border-slate-200/80 bg-slate-50/70 p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-950">{issue.productName || issue.sourceUrl}</p>
                      <p className="mt-2 break-all text-sm text-slate-500">{issue.sourceUrl}</p>
                    </div>
                    <StatusBadge value={issue.issueType || 'warning'} />
                  </div>
                  <p className="mt-3 text-sm leading-7 text-slate-600">{issue.issueDetail || 'Link inspector flagged this destination.'}</p>
                  <div className="mt-4 flex flex-wrap gap-4 text-xs uppercase tracking-[0.18em] text-slate-500">
                    <span>Checked {formatDate(issue.checkedAt)}</span>
                    <span>{issue.httpStatus ? `HTTP ${issue.httpStatus}` : 'No status'}</span>
                    {issue.finalUrl ? <span className="break-all">Final {issue.finalUrl}</span> : null}
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-[1.5rem] border border-dashed border-slate-200 bg-slate-50/70 px-5 py-10 text-center text-sm text-slate-500">
                No current link issues. Run the inspector to refresh the health snapshot.
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-[2rem] border border-slate-200/70 bg-white/90 p-8 shadow-[0_32px_70px_-40px_rgba(15,23,42,0.32)]">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-primary">Rendered Page Audit</p>
                <h2 className="mt-3 text-2xl font-black tracking-tight text-slate-950">Canonical, meta, OG, JSON-LD, and H1 checks</h2>
              </div>
              <StatusBadge value={summary?.renderedPageAudit.issuesFound ? 'warning' : 'configured'} />
            </div>
            <div className="mt-6 space-y-3">
              {summary?.renderedPageAudit.findings.length ? (
                summary.renderedPageAudit.findings.map((finding, index) => (
                  <div key={`${finding.pathname}-${finding.issueType}-${index}`} className="rounded-[1.25rem] border border-slate-200/80 bg-slate-50/70 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-semibold text-slate-950">{finding.title}</p>
                      <StatusBadge value={finding.issueType} />
                    </div>
                    <p className="mt-2 break-all text-sm text-slate-500">{finding.pathname}</p>
                    <p className="mt-2 text-sm text-slate-600">{finding.issueDetail}</p>
                    <p className="mt-2 text-xs uppercase tracking-[0.18em] text-slate-500">{formatDate(finding.checkedAt)}</p>
                  </div>
                ))
              ) : (
                <div className="rounded-[1.5rem] border border-dashed border-slate-200 bg-slate-50/70 px-5 py-10 text-center text-sm text-slate-500">
                  No current rendered-page SEO issues found in the latest public-page snapshot.
                </div>
              )}
            </div>
          </div>

          <div className="rounded-[2rem] border border-slate-200/70 bg-white/90 p-8 shadow-[0_32px_70px_-40px_rgba(15,23,42,0.32)]">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-primary">Google Indexing</p>
                <h2 className="mt-3 text-2xl font-black tracking-tight text-slate-950">Recent indexing events</h2>
              </div>
              <StatusBadge value={summary?.recentIndexingEvents.length ? 'configured' : 'missing'} />
            </div>
            <div className="mt-6 space-y-3">
              {(summary?.recentIndexingEvents || []).map((event) => (
                <div key={event.id} className="rounded-[1.25rem] border border-slate-200/80 bg-slate-50/70 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-semibold text-slate-950">Event #{event.id}</p>
                    <StatusBadge value={event.status} />
                  </div>
                  <p className="mt-2 text-sm text-slate-600">{summarizePayload(event.payloadJson)}</p>
                  <p className="mt-2 text-xs uppercase tracking-[0.18em] text-slate-500">{formatDate(event.createdAt)}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[2rem] border border-slate-200/70 bg-white/90 p-8 shadow-[0_32px_70px_-40px_rgba(15,23,42,0.32)]">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-primary">Syndication</p>
                <h2 className="mt-3 text-2xl font-black tracking-tight text-slate-950">Recent external dispatches</h2>
              </div>
              <StatusBadge value={summary?.recentSyndicationEvents.length ? 'configured' : 'missing'} />
            </div>
            <div className="mt-6 space-y-3">
              {(summary?.recentSyndicationEvents || []).map((event) => (
                <div key={event.id} className="rounded-[1.25rem] border border-slate-200/80 bg-slate-50/70 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-semibold text-slate-950">Event #{event.id}</p>
                    <StatusBadge value={event.status} />
                  </div>
                  <p className="mt-2 text-sm text-slate-600">{summarizePayload(event.payloadJson)}</p>
                  <p className="mt-2 text-xs uppercase tracking-[0.18em] text-slate-500">{formatDate(event.createdAt)}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
