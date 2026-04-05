import Link from 'next/link'
import { ArrowRight, Boxes, FileText, GitBranch, Globe2, Settings, Wand2 } from 'lucide-react'
import { MetricCard } from '@/components/admin/MetricCard'
import { StatusBadge } from '@/components/admin/StatusBadge'
import { getArticlePath } from '@/lib/article-path'
import { formatMerchantSource } from '@/lib/merchant-links'
import { getAdminDashboardSummary, getPipelineWorkerRuntimeConfig } from '@/lib/pipeline'

function getHealthTone(count: number) {
  return count === 0 ? 'border-emerald-200 bg-emerald-50/80' : 'border-amber-200 bg-amber-50/80'
}

function formatPercent(value: number) {
  return `${value}%`
}

function formatScore(value: number) {
  return `${Math.round(value * 100)}%`
}

function getFreshnessBadgeClass(value: 'fresh' | 'recent' | 'stale' | 'unknown') {
  switch (value) {
    case 'fresh':
      return 'bg-emerald-100 text-emerald-800'
    case 'recent':
      return 'bg-sky-100 text-sky-800'
    case 'stale':
      return 'bg-amber-100 text-amber-800'
    default:
      return 'bg-slate-100 text-slate-700'
  }
}

export default async function AdminDashboardPage() {
  const [summary, workerConfig] = await Promise.all([getAdminDashboardSummary(), Promise.resolve(getPipelineWorkerRuntimeConfig())])
  const decisionFunnel = summary.conversionSignals.decisionFunnel
  const assistantFunnel = summary.conversionSignals.decisionFunnel.assistantFunnel
  const commerceQuality = summary.commerceQuality
  const brandQuality = summary.brandQuality

  return (
    <div className="space-y-8 p-6 lg:p-10">
      <section className="overflow-hidden rounded-[2.25rem] bg-[linear-gradient(135deg,#0f172a_0%,#1d4ed8_55%,#0f766e_100%)] p-8 text-white shadow-[0_35px_80px_-45px_rgba(15,23,42,0.8)] lg:p-10">
        <div className="grid gap-8 lg:grid-cols-[1.25fr_0.75fr]">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-emerald-200/80">Workflow Center</p>
            <h1 className="mt-4 max-w-3xl font-[var(--font-display)] text-4xl font-black tracking-tight text-white sm:text-5xl">
              Operate the Bes3 buying-guide engine from one internal control layer.
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-8 text-slate-200">
              Sync affiliate inventory, normalize product facts, generate review and comparison pages, and publish updates without exposing pipeline language on the consumer-facing site.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
            <div className="rounded-[1.75rem] border border-white/12 bg-white/10 p-5 backdrop-blur-sm">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-200/85">Worker Runtime</p>
              <div className="mt-4 flex items-end justify-between gap-4">
                <div>
                  <p className="text-3xl font-black">{workerConfig.concurrency}</p>
                  <p className="mt-1 text-sm text-slate-200/75">Concurrent jobs</p>
                </div>
                <StatusBadge value={workerConfig.enabled ? 'configured' : 'missing'} />
              </div>
              <p className="mt-4 text-sm text-slate-200/80">Polling every {workerConfig.pollMs}ms keeps generation work moving without blocking editor operations.</p>
            </div>

            <div className="rounded-[1.75rem] border border-white/12 bg-white/10 p-5 backdrop-blur-sm">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-200/85">High-Value Actions</p>
              <div className="mt-4 grid gap-3">
                <Link href="/admin/products" className="inline-flex items-center justify-between rounded-[1rem] bg-white/10 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-white/15">
                  Product workspace
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link href="/admin/settings" className="inline-flex items-center justify-between rounded-[1rem] bg-white/10 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-white/15">
                  Runtime settings
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link href="/admin/seo-ops" className="inline-flex items-center justify-between rounded-[1rem] bg-white/10 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-white/15">
                  SEO ops
                  <Globe2 className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Affiliate Products" value={summary.totals.affiliateProducts} description="Inventory synced from PartnerBoost or manual imports." />
        <MetricCard label="Products" value={summary.totals.products} description="Normalized product records in the Bes3 database." />
        <MetricCard label="Articles" value={summary.totals.articles} description="Review and comparison pages generated by the pipeline." />
        <MetricCard label="Pipeline Runs" value={summary.totals.runs} description="Total runs recorded for the full content workflow." />
      </section>

      <section className="rounded-[2rem] border border-slate-200/70 bg-white/90 p-8 shadow-[0_32px_70px_-40px_rgba(15,23,42,0.32)]">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-primary">Decision Funnel</p>
            <h2 className="mt-3 text-2xl font-black tracking-tight text-slate-950">How buyers move from shortlist to outbound intent</h2>
          </div>
          <StatusBadge value={decisionFunnel.shortlistVisitors ? 'configured' : 'partial'} />
        </div>

        <div className="mt-6 grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <div className="rounded-[1.5rem] border border-slate-200/80 bg-slate-50/70 p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Shortlist Visitors</p>
              <p className="mt-3 text-3xl font-black text-slate-950">{decisionFunnel.shortlistVisitors}</p>
              <p className="mt-2 text-sm leading-7 text-slate-600">{decisionFunnel.shortlistEvents} shortlist activations in the last {decisionFunnel.lookbackDays} days.</p>
            </div>
            <div className="rounded-[1.5rem] border border-slate-200/80 bg-slate-50/70 p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Compare Visitors</p>
              <p className="mt-3 text-3xl font-black text-slate-950">{decisionFunnel.compareVisitors}</p>
              <p className="mt-2 text-sm leading-7 text-slate-600">{decisionFunnel.compareEvents} compare activations show who is narrowing to finalists.</p>
            </div>
            <div className="rounded-[1.5rem] border border-slate-200/80 bg-slate-50/70 p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Coach Engaged</p>
              <p className="mt-3 text-3xl font-black text-slate-950">{decisionFunnel.coachVisitors}</p>
              <p className="mt-2 text-sm leading-7 text-slate-600">
                {decisionFunnel.coachPrimaryEvents} primary and {decisionFunnel.coachSecondaryEvents} secondary coach clicks in the last {decisionFunnel.lookbackDays} days.
              </p>
            </div>
            <div className="rounded-[1.5rem] border border-slate-200/80 bg-slate-50/70 p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Shared Imports</p>
              <p className="mt-3 text-3xl font-black text-slate-950">{decisionFunnel.sharedImportVisitors}</p>
              <p className="mt-2 text-sm leading-7 text-slate-600">{decisionFunnel.sharedViewVisitors} visitors opened a shared shortlist.</p>
            </div>
            <div className="rounded-[1.5rem] border border-slate-200/80 bg-slate-50/70 p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Merchant Intent</p>
              <p className="mt-3 text-3xl font-black text-slate-950">{decisionFunnel.merchantIntentVisitors}</p>
              <p className="mt-2 text-sm leading-7 text-slate-600">{decisionFunnel.merchantIntentEvents} merchant CTA clicks captured before redirect.</p>
            </div>
            <div className="rounded-[1.5rem] border border-slate-200/80 bg-slate-50/70 p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Verified Exits</p>
              <p className="mt-3 text-3xl font-black text-slate-950">{decisionFunnel.verifiedMerchantVisitors}</p>
              <p className="mt-2 text-sm leading-7 text-slate-600">{decisionFunnel.verifiedMerchantEvents} server-side redirects matched to anonymous buyer IDs.</p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-1">
            <div className="rounded-[1.5rem] bg-[linear-gradient(135deg,#0f172a_0%,#1d4ed8_58%,#0f766e_100%)] p-5 text-white shadow-[0_24px_60px_-36px_rgba(15,23,42,0.5)]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-200/90">Shortlist → Compare</p>
              <p className="mt-3 text-3xl font-black">{formatPercent(decisionFunnel.shortlistToCompareRate)}</p>
              <p className="mt-2 text-sm leading-7 text-slate-200">Visitor-level conversion from saving candidates to loading finalists into compare.</p>
            </div>
            <div className="rounded-[1.5rem] border border-slate-200/80 bg-slate-50/70 p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Coach Share Of Compare</p>
              <p className="mt-3 text-3xl font-black text-slate-950">{formatPercent(decisionFunnel.coachInfluencedCompareRate)}</p>
              <p className="mt-2 text-sm leading-7 text-slate-600">
                {decisionFunnel.topCoachAction
                  ? `${decisionFunnel.coachCompareLoadVisitors} compare visitors were loaded directly by the coach. Top coach action: ${formatMerchantSource(decisionFunnel.topCoachAction)} (${decisionFunnel.topCoachActionEvents}).`
                  : 'Once buyers click coach actions, Bes3 will surface which prompt drives the most movement into compare.'}
              </p>
            </div>
            <div className="rounded-[1.5rem] border border-slate-200/80 bg-slate-50/70 p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Compare → Verified Exit</p>
              <p className="mt-3 text-3xl font-black text-slate-950">{formatPercent(decisionFunnel.compareToVerifiedMerchantRate)}</p>
              <p className="mt-2 text-sm leading-7 text-slate-600">
                {formatPercent(decisionFunnel.compareToMerchantRate)} intent rate versus a verified server-side exit rate from the same lookback window.
              </p>
            </div>
            <div className="rounded-[1.5rem] border border-slate-200/80 bg-slate-50/70 p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Shared View → Import</p>
              <p className="mt-3 text-3xl font-black text-slate-950">{formatPercent(decisionFunnel.sharedViewToImportRate)}</p>
              <p className="mt-2 text-sm leading-7 text-slate-600">Measures whether shared shortlists become active decision workspaces.</p>
            </div>
            <div className="rounded-[1.5rem] border border-slate-200/80 bg-slate-50/70 p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Top Decision Surface</p>
              <p className="mt-3 text-2xl font-black text-slate-950">
                {decisionFunnel.topDecisionSource ? formatMerchantSource(decisionFunnel.topDecisionSource) : 'No decision data yet'}
              </p>
              <p className="mt-2 text-sm leading-7 text-slate-600">
                {decisionFunnel.topDecisionSource ? `${decisionFunnel.topDecisionSourceEvents} tracked decision events from the strongest source.` : 'Once buyers start saving, comparing, or sharing, the strongest decision surface will appear here.'}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="rounded-[2rem] border border-slate-200/70 bg-white/90 p-8 shadow-[0_32px_70px_-40px_rgba(15,23,42,0.32)]">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-primary">Content Health</p>
              <h2 className="mt-3 text-2xl font-black tracking-tight text-slate-950">Quality signals for the public buying experience</h2>
            </div>
            <StatusBadge value={summary.contentHealth.staleArticleCount === 0 && summary.contentHealth.articlesMissingVisual === 0 ? 'configured' : 'partial'} />
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div className={`rounded-[1.5rem] border p-5 ${getHealthTone(summary.contentHealth.productsMissingHero)}`}>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Products With Live Price</p>
              <p className="mt-3 text-3xl font-black text-slate-950">{summary.contentHealth.productsWithLivePrice}</p>
              <p className="mt-2 text-sm leading-7 text-slate-600">Products that currently have both price data and a merchant destination.</p>
            </div>
            <div className={`rounded-[1.5rem] border p-5 ${getHealthTone(summary.contentHealth.productsMissingHero)}`}>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Products Missing Hero</p>
              <p className="mt-3 text-3xl font-black text-slate-950">{summary.contentHealth.productsMissingHero}</p>
              <p className="mt-2 text-sm leading-7 text-slate-600">These products weaken cards, deal modules, and trust on public pages.</p>
            </div>
            <div className={`rounded-[1.5rem] border p-5 ${getHealthTone(summary.contentHealth.articlesMissingVisual)}`}>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Articles Missing Visuals</p>
              <p className="mt-3 text-3xl font-black text-slate-950">{summary.contentHealth.articlesMissingVisual}</p>
              <p className="mt-2 text-sm leading-7 text-slate-600">Published pages that currently lack both article hero media and fallback product hero media.</p>
            </div>
            <div className={`rounded-[1.5rem] border p-5 ${getHealthTone(summary.contentHealth.productsMissingCategory)}`}>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Products Missing Category</p>
              <p className="mt-3 text-3xl font-black text-slate-950">{summary.contentHealth.productsMissingCategory}</p>
              <p className="mt-2 text-sm leading-7 text-slate-600">Category gaps reduce directory quality, search routing, and newsletter relevance.</p>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-[2rem] border border-slate-200/70 bg-white/90 p-8 shadow-[0_32px_70px_-40px_rgba(15,23,42,0.32)]">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-primary">Lifecycle Risk</p>
                <h2 className="mt-3 text-2xl font-black tracking-tight text-slate-950">Pages that need a refresh</h2>
              </div>
              <StatusBadge value={summary.staleArticles.length ? 'partial' : 'configured'} />
            </div>
            <div className="mt-6 space-y-4">
              {summary.staleArticles.length ? (
                summary.staleArticles.map((article) => (
                  <Link
                    key={article.id}
                    href={getArticlePath(article.type, article.slug)}
                    target="_blank"
                    className="block rounded-[1.5rem] border border-slate-200/80 bg-slate-50/70 px-5 py-4 transition-colors hover:border-emerald-200 hover:bg-emerald-50/60"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-semibold text-slate-950">{article.title}</p>
                        <p className="mt-1 text-sm text-slate-500">{article.type} · Last reviewed {article.lastReviewedAt ? new Date(article.lastReviewedAt).toLocaleDateString() : 'unknown'}</p>
                      </div>
                      <div className="rounded-full bg-white px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-600">
                        {article.ageDays}d stale
                      </div>
                    </div>
                  </Link>
                ))
              ) : (
                <div className="rounded-[1.5rem] border border-dashed border-slate-200 bg-slate-50/70 px-5 py-10 text-center text-sm text-slate-500">
                  No stale public pages right now.
                </div>
              )}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-1">
            <div className="rounded-[1.75rem] border border-slate-200/70 bg-white/90 p-6 shadow-[0_26px_60px_-38px_rgba(15,23,42,0.26)]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-primary">Audience Capture</p>
              <p className="mt-3 text-3xl font-black text-slate-950">{summary.contentHealth.newsletterSubscribers}</p>
              <p className="mt-2 text-sm leading-7 text-slate-600">Email subscribers currently stored in the Bes3 CRM table.</p>
            </div>
            <div className="rounded-[1.75rem] border border-slate-200/70 bg-white/90 p-6 shadow-[0_26px_60px_-38px_rgba(15,23,42,0.26)]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-primary">Preference-Aware Leads</p>
              <p className="mt-3 text-3xl font-black text-slate-950">{summary.contentHealth.targetedSubscribers}</p>
              <p className="mt-2 text-sm leading-7 text-slate-600">Subscribers now stored with explicit alert intent for future lifecycle flows.</p>
            </div>
            <div className="rounded-[1.75rem] border border-slate-200/70 bg-white/90 p-6 shadow-[0_26px_60px_-38px_rgba(15,23,42,0.26)]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-primary">Merchant Clicks</p>
              <p className="mt-3 text-3xl font-black text-slate-950">{summary.conversionSignals.totalMerchantClicks}</p>
              <p className="mt-2 text-sm leading-7 text-slate-600">{summary.conversionSignals.merchantClicksLast7Days} tracked over the last 7 days.</p>
            </div>
            <div className="rounded-[1.75rem] border border-slate-200/70 bg-white/90 p-6 shadow-[0_26px_60px_-38px_rgba(15,23,42,0.26)]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-primary">Top Exit Surface</p>
              <p className="mt-3 text-2xl font-black text-slate-950">
                {summary.conversionSignals.topMerchantSource ? formatMerchantSource(summary.conversionSignals.topMerchantSource) : 'No click data yet'}
              </p>
              <p className="mt-2 text-sm leading-7 text-slate-600">
                {summary.conversionSignals.topMerchantSource ? `${summary.conversionSignals.topMerchantSourceClicks} clicks from the strongest public CTA surface.` : 'Once buyers start clicking through, Bes3 will surface the strongest path here.'}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
        <div className="rounded-[2rem] border border-slate-200/70 bg-white/90 p-8 shadow-[0_32px_70px_-40px_rgba(15,23,42,0.32)]">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-primary">Assistant Funnel</p>
              <h2 className="mt-3 text-2xl font-black tracking-tight text-slate-950">How the buyer copilot turns intent into action</h2>
            </div>
            <StatusBadge value={assistantFunnel.sessionVisitors ? 'configured' : 'partial'} />
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-[1.5rem] border border-slate-200/80 bg-slate-50/70 p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Sessions</p>
              <p className="mt-3 text-3xl font-black text-slate-950">{assistantFunnel.sessionVisitors}</p>
              <p className="mt-2 text-sm leading-7 text-slate-600">{assistantFunnel.sessionEvents} starts in the last {assistantFunnel.lookbackDays} days.</p>
            </div>
            <div className="rounded-[1.5rem] border border-slate-200/80 bg-slate-50/70 p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Constraints Added</p>
              <p className="mt-3 text-3xl font-black text-slate-950">{assistantFunnel.constraintVisitors}</p>
              <p className="mt-2 text-sm leading-7 text-slate-600">{formatPercent(assistantFunnel.sessionToConstraintRate)} of assistant visitors added meaningful constraints.</p>
            </div>
            <div className="rounded-[1.5rem] border border-slate-200/80 bg-slate-50/70 p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Recommendation Accepts</p>
              <p className="mt-3 text-3xl font-black text-slate-950">{assistantFunnel.acceptVisitors}</p>
              <p className="mt-2 text-sm leading-7 text-slate-600">{assistantFunnel.acceptEvents} acceptance events with a {formatPercent(assistantFunnel.sessionToAcceptRate)} session-to-accept rate.</p>
            </div>
            <div className="rounded-[1.5rem] border border-slate-200/80 bg-slate-50/70 p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Alert Starts</p>
              <p className="mt-3 text-3xl font-black text-slate-950">{assistantFunnel.alertVisitors}</p>
              <p className="mt-2 text-sm leading-7 text-slate-600">{assistantFunnel.alertEvents} assistant-led alert subscriptions with a {formatPercent(assistantFunnel.sessionToAlertRate)} rate.</p>
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-[1.5rem] bg-[linear-gradient(135deg,#0f172a_0%,#1d4ed8_58%,#0f766e_100%)] p-5 text-white shadow-[0_24px_60px_-36px_rgba(15,23,42,0.5)]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-200/90">Accept → Offer Select</p>
              <p className="mt-3 text-3xl font-black">{formatPercent(assistantFunnel.acceptToMerchantSelectionRate)}</p>
              <p className="mt-2 text-sm leading-7 text-slate-200">Measures whether assistant approval turns into merchant-level offer selection.</p>
            </div>
            <div className="rounded-[1.5rem] border border-slate-200/80 bg-slate-50/70 p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Recommendation Rejects</p>
              <p className="mt-3 text-3xl font-black text-slate-950">{assistantFunnel.rejectVisitors}</p>
              <p className="mt-2 text-sm leading-7 text-slate-600">{assistantFunnel.rejectEvents} rejections show where fallback routes still dominate.</p>
            </div>
            <div className="rounded-[1.5rem] border border-slate-200/80 bg-slate-50/70 p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Offer / Price Exploration</p>
              <p className="mt-3 text-3xl font-black text-slate-950">{assistantFunnel.offerExpandVisitors + assistantFunnel.priceHistoryViewVisitors}</p>
              <p className="mt-2 text-sm leading-7 text-slate-600">{assistantFunnel.offerExpandVisitors} offer expands and {assistantFunnel.priceHistoryViewVisitors} price history views from assistant-led traffic.</p>
            </div>
            <div className="rounded-[1.5rem] border border-slate-200/80 bg-slate-50/70 p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Top Assistant Source</p>
              <p className="mt-3 text-2xl font-black text-slate-950">
                {assistantFunnel.topAssistantSource ? formatMerchantSource(assistantFunnel.topAssistantSource) : 'No assistant data yet'}
              </p>
              <p className="mt-2 text-sm leading-7 text-slate-600">
                {assistantFunnel.topAssistantSource ? `${assistantFunnel.topAssistantSourceEvents} assistant events from the strongest source.` : 'Once assistant traffic grows, the strongest assistant surface will appear here.'}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-[2rem] border border-slate-200/70 bg-white/90 p-8 shadow-[0_32px_70px_-40px_rgba(15,23,42,0.32)]">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-primary">Assistant Readiness</p>
              <h2 className="mt-3 text-2xl font-black tracking-tight text-slate-950">Signals that make the assistant stronger or weaker</h2>
            </div>
            <StatusBadge value={assistantFunnel.sessionVisitors && assistantFunnel.acceptVisitors ? 'configured' : 'partial'} />
          </div>

          <div className="mt-6 space-y-4">
            <div className="rounded-[1.5rem] border border-slate-200/80 bg-slate-50/70 p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Offer Selection Visitors</p>
              <p className="mt-3 text-3xl font-black text-slate-950">{assistantFunnel.merchantOfferSelectionVisitors}</p>
              <p className="mt-2 text-sm leading-7 text-slate-600">{assistantFunnel.merchantOfferSelectionEvents} explicit merchant-offer choices show buyers are engaging with structured commerce data instead of generic CTAs.</p>
            </div>
            <div className="rounded-[1.5rem] border border-slate-200/80 bg-slate-50/70 p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Current Interpretation</p>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                {assistantFunnel.sessionVisitors
                  ? `The assistant is turning ${formatPercent(assistantFunnel.sessionToAcceptRate)} of sessions into an accepted next move, while ${formatPercent(assistantFunnel.sessionToAlertRate)} convert into wait-for-price behavior.`
                  : 'The assistant funnel is wired, but there is not enough traffic yet to draw behavior conclusions.'}
              </p>
            </div>
            <div className="rounded-[1.5rem] border border-slate-200/80 bg-slate-50/70 p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">What To Improve Next</p>
              <div className="mt-3 space-y-2 text-sm leading-7 text-slate-600">
                <p>- Raise constraint capture if sessions are starting without enough category, budget, or must-have detail.</p>
                <p>- Raise accept-to-offer selection if recommendations feel abstract and buyers still hesitate before merchant choice.</p>
                <p>- Watch alert starts: high alert rate is healthy when price timing matters, but can also signal weak buy-now confidence.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.12fr_0.88fr]">
        <div className="rounded-[2rem] border border-slate-200/70 bg-white/90 p-8 shadow-[0_32px_70px_-40px_rgba(15,23,42,0.32)]">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-primary">Commerce QA</p>
              <h2 className="mt-3 text-2xl font-black tracking-tight text-slate-950">Data quality signals that decide what Bes3 should fix next</h2>
            </div>
            <StatusBadge value={commerceQuality.lowConfidenceProducts === 0 && commerceQuality.staleOfferProducts === 0 ? 'configured' : 'partial'} />
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <div className={`rounded-[1.5rem] border p-5 ${getHealthTone(commerceQuality.lowConfidenceProducts)}`}>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Low Confidence</p>
              <p className="mt-3 text-3xl font-black text-slate-950">{commerceQuality.lowConfidenceProducts}</p>
              <p className="mt-2 text-sm leading-7 text-slate-600">Products below the current data confidence threshold and most likely to weaken recommendations.</p>
            </div>
            <div className={`rounded-[1.5rem] border p-5 ${getHealthTone(commerceQuality.staleOfferProducts)}`}>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Stale Offers</p>
              <p className="mt-3 text-3xl font-black text-slate-950">{commerceQuality.staleOfferProducts}</p>
              <p className="mt-2 text-sm leading-7 text-slate-600">Products whose live-offer freshness has already fallen out of the current decision window.</p>
            </div>
            <div className={`rounded-[1.5rem] border p-5 ${getHealthTone(commerceQuality.productsWithoutOffers)}`}>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">No Offers</p>
              <p className="mt-3 text-3xl font-black text-slate-950">{commerceQuality.productsWithoutOffers}</p>
              <p className="mt-2 text-sm leading-7 text-slate-600">These products still lack tracked offer rows, so merchant handoff confidence is weaker.</p>
            </div>
            <div className={`rounded-[1.5rem] border p-5 ${getHealthTone(commerceQuality.productsWithoutEvidence)}`}>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">No Evidence</p>
              <p className="mt-3 text-3xl font-black text-slate-950">{commerceQuality.productsWithoutEvidence}</p>
              <p className="mt-2 text-sm leading-7 text-slate-600">Products that still lack attribute facts and need fact extraction or a rescrape first.</p>
            </div>
            <div className={`rounded-[1.5rem] border p-5 ${getHealthTone(commerceQuality.productsWithoutOfferCompetition)}`}>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Thin Offer Coverage</p>
              <p className="mt-3 text-3xl font-black text-slate-950">{commerceQuality.productsWithoutOfferCompetition}</p>
              <p className="mt-2 text-sm leading-7 text-slate-600">Products with fewer than two tracked offers and weak merchant-side competitive context.</p>
            </div>
            <div className={`rounded-[1.5rem] border p-5 ${getHealthTone(commerceQuality.productsWithoutPriceHistory)}`}>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">No Price History</p>
              <p className="mt-3 text-3xl font-black text-slate-950">{commerceQuality.productsWithoutPriceHistory}</p>
              <p className="mt-2 text-sm leading-7 text-slate-600">These products still cannot explain whether the current price sits inside a credible tracked window.</p>
            </div>
            <div className="rounded-[1.5rem] border border-slate-200/80 bg-slate-50/70 p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Priority Rule</p>
              <p className="mt-3 text-lg font-black text-slate-950">Clicks + quality gaps</p>
              <p className="mt-2 text-sm leading-7 text-slate-600">Bes3 now prioritizes fixes where buyer demand and data weakness overlap, instead of blindly generating more content.</p>
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-4">
            <div className="rounded-[1.5rem] border border-slate-200/80 bg-slate-50/70 p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Freshness Distribution</p>
              <div className="mt-4 space-y-3 text-sm text-slate-600">
                <div className="flex items-center justify-between"><span>Fresh</span><span className="font-semibold text-slate-950">{commerceQuality.freshnessDistribution.fresh}</span></div>
                <div className="flex items-center justify-between"><span>Recent</span><span className="font-semibold text-slate-950">{commerceQuality.freshnessDistribution.recent}</span></div>
                <div className="flex items-center justify-between"><span>Stale</span><span className="font-semibold text-slate-950">{commerceQuality.freshnessDistribution.stale}</span></div>
                <div className="flex items-center justify-between"><span>Unknown</span><span className="font-semibold text-slate-950">{commerceQuality.freshnessDistribution.unknown}</span></div>
              </div>
            </div>
            <div className="rounded-[1.5rem] border border-slate-200/80 bg-slate-50/70 p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Attribute Completeness</p>
              <div className="mt-4 space-y-3 text-sm text-slate-600">
                <div className="flex items-center justify-between"><span>High</span><span className="font-semibold text-slate-950">{commerceQuality.completenessDistribution.high}</span></div>
                <div className="flex items-center justify-between"><span>Medium</span><span className="font-semibold text-slate-950">{commerceQuality.completenessDistribution.medium}</span></div>
                <div className="flex items-center justify-between"><span>Low</span><span className="font-semibold text-slate-950">{commerceQuality.completenessDistribution.low}</span></div>
              </div>
            </div>
            <div className="rounded-[1.5rem] border border-slate-200/80 bg-slate-50/70 p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Offer Coverage</p>
              <div className="mt-4 space-y-3 text-sm text-slate-600">
                <div className="flex items-center justify-between"><span>No offers</span><span className="font-semibold text-slate-950">{commerceQuality.offerCoverageDistribution.none}</span></div>
                <div className="flex items-center justify-between"><span>Single offer</span><span className="font-semibold text-slate-950">{commerceQuality.offerCoverageDistribution.single}</span></div>
                <div className="flex items-center justify-between"><span>Multi offer</span><span className="font-semibold text-slate-950">{commerceQuality.offerCoverageDistribution.multi}</span></div>
              </div>
            </div>
            <div className="rounded-[1.5rem] border border-slate-200/80 bg-slate-50/70 p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Price History Coverage</p>
              <div className="mt-4 space-y-3 text-sm text-slate-600">
                <div className="flex items-center justify-between"><span>No history</span><span className="font-semibold text-slate-950">{commerceQuality.priceHistoryCoverageDistribution.none}</span></div>
                <div className="flex items-center justify-between"><span>Thin history</span><span className="font-semibold text-slate-950">{commerceQuality.priceHistoryCoverageDistribution.thin}</span></div>
                <div className="flex items-center justify-between"><span>Healthy history</span><span className="font-semibold text-slate-950">{commerceQuality.priceHistoryCoverageDistribution.healthy}</span></div>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-[2rem] border border-slate-200/70 bg-white/90 p-8 shadow-[0_32px_70px_-40px_rgba(15,23,42,0.32)]">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-primary">Priority Queue</p>
              <h2 className="mt-3 text-2xl font-black tracking-tight text-slate-950">Products to rescrape or regenerate first</h2>
            </div>
            <StatusBadge value={commerceQuality.topPriorityProducts.length ? 'partial' : 'configured'} />
          </div>

          <div className="mt-6 space-y-4">
            {commerceQuality.topPriorityProducts.length ? (
              commerceQuality.topPriorityProducts.map((product) => (
                <div key={product.id} className="rounded-[1.5rem] border border-slate-200/80 bg-slate-50/70 p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-semibold text-slate-950">{product.productName}</p>
                      <p className="mt-1 text-sm text-slate-500">
                        {product.brand || 'Unknown brand'}{product.category ? ` · ${product.category.replace(/-/g, ' ')}` : ''}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">Priority score</p>
                      <p className="mt-2 text-2xl font-black text-slate-950">{product.priorityScore}</p>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em]">
                    <span className={`inline-flex rounded-full px-3 py-1 ${getFreshnessBadgeClass(product.freshness)}`}>{product.freshness}</span>
                    <span className="inline-flex rounded-full bg-white px-3 py-1 text-slate-700">{product.offerCount} offers</span>
                    <span className="inline-flex rounded-full bg-white px-3 py-1 text-slate-700">{product.evidenceCount} evidence</span>
                    <span className="inline-flex rounded-full bg-white px-3 py-1 text-slate-700">{product.priceHistoryCount} history points</span>
                    <span className="inline-flex rounded-full bg-white px-3 py-1 text-slate-700">{formatScore(product.dataConfidenceScore)} confidence</span>
                    <span className="inline-flex rounded-full bg-white px-3 py-1 text-slate-700">{formatScore(product.attributeCompletenessScore)} completeness</span>
                  </div>

                  <div className="mt-4 space-y-2">
                    {product.reasons.map((reason) => (
                      <p key={reason} className="text-sm leading-7 text-slate-600">- {reason}</p>
                    ))}
                  </div>

                  <div className="mt-5 flex flex-wrap gap-3">
                    <Link href={`/admin/products/${product.id}`} className="inline-flex rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-800">
                      Open product workspace
                    </Link>
                    {product.slug ? (
                      <Link href={`/products/${product.slug}`} target="_blank" className="inline-flex rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm ring-1 ring-slate-200 transition-colors hover:bg-slate-50">
                        Open public page
                      </Link>
                    ) : null}
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-[1.5rem] border border-dashed border-slate-200 bg-slate-50/70 px-5 py-10 text-center text-sm text-slate-500">
                No product currently needs urgent data-quality intervention.
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
        <div className="rounded-[2rem] border border-slate-200/70 bg-white/90 p-8 shadow-[0_32px_70px_-40px_rgba(15,23,42,0.32)]">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-primary">Brand Knowledge Quality</p>
              <h2 className="mt-3 text-2xl font-black tracking-tight text-slate-950">How complete the merchant and brand layer really is</h2>
            </div>
            <StatusBadge value={brandQuality.brandsWithoutPolicy === 0 && brandQuality.brandsWithoutCompatibilityFacts === 0 ? 'configured' : 'partial'} />
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <div className="rounded-[1.5rem] border border-slate-200/80 bg-slate-50/70 p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Tracked Brands</p>
              <p className="mt-3 text-3xl font-black text-slate-950">{brandQuality.trackedBrands}</p>
              <p className="mt-2 text-sm leading-7 text-slate-600">Brands currently represented by products or editorial pages on the public site.</p>
            </div>
            <div className={`rounded-[1.5rem] border p-5 ${getHealthTone(brandQuality.brandsWithoutPolicy)}`}>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Brand Policies Missing</p>
              <p className="mt-3 text-3xl font-black text-slate-950">{brandQuality.brandsWithoutPolicy}</p>
              <p className="mt-2 text-sm leading-7 text-slate-600">These brands still cannot answer shipping, returns, warranty, discount-window, or support questions cleanly.</p>
            </div>
            <div className={`rounded-[1.5rem] border p-5 ${getHealthTone(brandQuality.brandsWithoutCompatibilityFacts)}`}>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Compatibility Gaps</p>
              <p className="mt-3 text-3xl font-black text-slate-950">{brandQuality.brandsWithoutCompatibilityFacts}</p>
              <p className="mt-2 text-sm leading-7 text-slate-600">Without compatibility facts, the assistant and brand layer still miss fit and accessory context.</p>
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="rounded-[1.5rem] border border-slate-200/80 bg-slate-50/70 p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Coverage Snapshot</p>
              <div className="mt-4 space-y-3 text-sm text-slate-600">
                <div className="flex items-center justify-between"><span>Brands with policies</span><span className="font-semibold text-slate-950">{brandQuality.brandsWithPolicy}</span></div>
                <div className="flex items-center justify-between"><span>Brands with compatibility facts</span><span className="font-semibold text-slate-950">{brandQuality.brandsWithCompatibilityFacts}</span></div>
                <div className="flex items-center justify-between"><span>Brands still missing policies</span><span className="font-semibold text-slate-950">{brandQuality.brandsWithoutPolicy}</span></div>
                <div className="flex items-center justify-between"><span>Brands still missing compatibility</span><span className="font-semibold text-slate-950">{brandQuality.brandsWithoutCompatibilityFacts}</span></div>
              </div>
            </div>
            <div className="rounded-[1.5rem] border border-slate-200/80 bg-slate-50/70 p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Operator Guidance</p>
              <div className="mt-3 space-y-2 text-sm leading-7 text-slate-600">
                <p>- Add policy rows first for brands with active product coverage but no shipping / return / warranty answers.</p>
                <p>- Then add compatibility facts for categories where buyers still need accessory, setup, or fit reassurance.</p>
                <p>- Use the brand queue below before generating more editorial copy for the same brands.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-[2rem] border border-slate-200/70 bg-white/90 p-8 shadow-[0_32px_70px_-40px_rgba(15,23,42,0.32)]">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-primary">Brand Priority Queue</p>
              <h2 className="mt-3 text-2xl font-black tracking-tight text-slate-950">Brands to enrich before the next content push</h2>
            </div>
            <StatusBadge value={brandQuality.topPriorityBrands.length ? 'partial' : 'configured'} />
          </div>

          <div className="mt-6 space-y-4">
            {brandQuality.topPriorityBrands.length ? (
              brandQuality.topPriorityBrands.map((brand) => (
                <div key={brand.slug} className="rounded-[1.5rem] border border-slate-200/80 bg-slate-50/70 p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-semibold text-slate-950">{brand.name}</p>
                      <p className="mt-1 text-sm text-slate-500">
                        {brand.productCount} products · {brand.articleCount} editorial pages · {brand.compatibilityFactCount} compatibility facts
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">Priority score</p>
                      <p className="mt-2 text-2xl font-black text-slate-950">{brand.priorityScore}</p>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em]">
                    <span className={`inline-flex rounded-full px-3 py-1 ${brand.hasPolicy ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-900'}`}>
                      {brand.hasPolicy ? 'policy ready' : 'policy missing'}
                    </span>
                    <span className="inline-flex rounded-full bg-white px-3 py-1 text-slate-700">{brand.compatibilityFactCount} compatibility facts</span>
                    <span className="inline-flex rounded-full bg-white px-3 py-1 text-slate-700">
                      Updated {brand.latestUpdate ? new Date(brand.latestUpdate).toLocaleDateString() : 'unknown'}
                    </span>
                  </div>

                  <div className="mt-4 space-y-2">
                    {brand.reasons.map((reason) => (
                      <p key={reason} className="text-sm leading-7 text-slate-600">- {reason}</p>
                    ))}
                  </div>

                  <div className="mt-5 flex flex-wrap gap-3">
                    <Link href={`/brands/${brand.slug}`} target="_blank" className="inline-flex rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-800">
                      Open public brand page
                    </Link>
                    <Link href="/admin/products" className="inline-flex rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm ring-1 ring-slate-200 transition-colors hover:bg-slate-50">
                      Open product workspace
                    </Link>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-[1.5rem] border border-dashed border-slate-200 bg-slate-50/70 px-5 py-10 text-center text-sm text-slate-500">
                No brand currently needs urgent knowledge enrichment.
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-[2rem] border border-slate-200/70 bg-white/90 p-8 shadow-[0_32px_70px_-40px_rgba(15,23,42,0.32)]">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-primary">Recent Runs</p>
              <h2 className="mt-3 text-2xl font-black tracking-tight text-slate-950">Live workflow activity</h2>
            </div>
            <GitBranch className="h-5 w-5 text-slate-400" />
          </div>

          <div className="mt-6 space-y-4">
            {summary.recentRuns.length ? (
              summary.recentRuns.map((run) => (
                <div key={run.id} className="grid gap-4 rounded-[1.5rem] border border-slate-200/80 bg-slate-50/70 px-5 py-4 md:grid-cols-[1fr_auto] md:items-center">
                  <div>
                    <p className="font-semibold text-slate-950">{run.product_name || run.source_link}</p>
                    <p className="mt-1 text-sm text-slate-500">{run.current_stage || 'Idle'} · Attempt {run.attempt_count}</p>
                    <p className="mt-2 text-xs uppercase tracking-[0.18em] text-slate-400">
                      Updated {new Date(run.updated_at).toLocaleString()}
                    </p>
                  </div>
                  <StatusBadge value={run.status} />
                </div>
              ))
            ) : (
              <div className="rounded-[1.5rem] border border-dashed border-slate-200 bg-slate-50/70 px-5 py-10 text-center text-sm text-slate-500">
                No pipeline activity has been recorded yet.
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-[2rem] border border-slate-200/70 bg-white/90 p-8 shadow-[0_32px_70px_-40px_rgba(15,23,42,0.32)]">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-primary">Fresh Inventory</p>
                <h2 className="mt-3 text-2xl font-black tracking-tight text-slate-950">Latest affiliate imports</h2>
              </div>
              <Boxes className="h-5 w-5 text-slate-400" />
            </div>

            <div className="mt-6 space-y-4">
              {summary.recentAffiliateProducts.length ? (
                summary.recentAffiliateProducts.map((product) => (
                  <div key={product.id} className="rounded-[1.5rem] border border-slate-200/80 bg-slate-50/70 px-5 py-4">
                    <p className="font-semibold text-slate-950">{product.product_name || product.promo_link}</p>
                    <p className="mt-1 text-sm text-slate-500">{product.platform}</p>
                  </div>
                ))
              ) : (
                <div className="rounded-[1.5rem] border border-dashed border-slate-200 bg-slate-50/70 px-5 py-10 text-center text-sm text-slate-500">
                  No synced products yet.
                </div>
              )}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-1">
            <Link href="/admin/products" className="rounded-[1.75rem] border border-slate-200/70 bg-white/90 p-6 shadow-[0_26px_60px_-38px_rgba(15,23,42,0.26)] transition-transform hover:-translate-y-0.5">
              <Boxes className="h-5 w-5 text-primary" />
              <h3 className="mt-4 text-lg font-semibold text-slate-950">Product Workspace</h3>
              <p className="mt-2 text-sm leading-7 text-slate-600">Open the queue that turns affiliate URLs into normalized product pages.</p>
            </Link>
            <Link href="/admin/articles" className="rounded-[1.75rem] border border-slate-200/70 bg-white/90 p-6 shadow-[0_26px_60px_-38px_rgba(15,23,42,0.26)] transition-transform hover:-translate-y-0.5">
              <FileText className="h-5 w-5 text-primary" />
              <h3 className="mt-4 text-lg font-semibold text-slate-950">Editorial Output</h3>
              <p className="mt-2 text-sm leading-7 text-slate-600">Review generated review, comparison, and guide content before it reaches the public site.</p>
            </Link>
            <Link href="/admin/settings" className="rounded-[1.75rem] border border-slate-200/70 bg-white/90 p-6 shadow-[0_26px_60px_-38px_rgba(15,23,42,0.26)] transition-transform hover:-translate-y-0.5">
              <Settings className="h-5 w-5 text-primary" />
              <h3 className="mt-4 text-lg font-semibold text-slate-950">Runtime Settings</h3>
              <p className="mt-2 text-sm leading-7 text-slate-600">Adjust AI providers, proxy pools, media storage, and SEO environment values.</p>
            </Link>
          </div>
        </div>
      </section>

      <section className="rounded-[2rem] border border-slate-200/70 bg-white/90 p-8 shadow-[0_32px_70px_-40px_rgba(15,23,42,0.32)]">
        <div className="flex items-center gap-3">
          <Wand2 className="h-5 w-5 text-primary" />
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-primary">Product Principle</p>
            <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950">The admin is internal. The public site is buyer-facing.</h2>
          </div>
        </div>
        <p className="mt-4 max-w-4xl text-sm leading-8 text-slate-600">
          Keep dashboard language operational and precise here, but keep the consumer site focused on shortlists, comparisons, deep dives, and buying confidence. That separation is now reflected in the shell and page hierarchy.
        </p>
      </section>
    </div>
  )
}
