import Link from 'next/link'
import { ArrowRight, Boxes, GitBranch, Globe2, Search, Settings, ShieldAlert, Wand2 } from 'lucide-react'
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

function getFreshnessLabel(value: 'fresh' | 'recent' | 'stale' | 'unknown') {
  const labels = {
    fresh: '新鲜',
    recent: '近期',
    stale: '过期',
    unknown: '未知'
  }
  return labels[value]
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
  const assistantFunnel = decisionFunnel.assistantFunnel
  const commerceQuality = summary.commerceQuality
  const brandQuality = summary.brandQuality

  const quickActions = [
    {
      title: '导入商品',
      description: '同步联盟商品或粘贴单个链接',
      href: '/admin/products',
      icon: Boxes,
      tone: 'bg-blue-50 text-blue-700'
    },
    {
      title: '查看流水线',
      description: '跟踪生成、抓取和发布任务',
      href: '/admin/pipeline-runs',
      icon: GitBranch,
      tone: 'bg-emerald-50 text-emerald-700'
    },
    {
      title: '处理 SEO',
      description: '修复索引、链接和结构化数据问题',
      href: '/admin/seo-ops',
      icon: Globe2,
      tone: 'bg-cyan-50 text-cyan-700'
    },
    {
      title: '调整配置',
      description: '管理 AI、代理、媒体和运行时参数',
      href: '/admin/settings',
      icon: Settings,
      tone: 'bg-slate-100 text-slate-700'
    }
  ]

  const healthCards = [
    {
      label: '有实时价格',
      value: summary.contentHealth.productsWithLivePrice,
      description: '已具备价格与商家跳转的商品。'
    },
    {
      label: '缺少主图',
      value: summary.contentHealth.productsMissingHero,
      description: '影响商品卡片、专题页和信任感。'
    },
    {
      label: '文章缺图',
      value: summary.contentHealth.articlesMissingVisual,
      description: '需要补齐文章主图或商品兜底图。'
    },
    {
      label: '缺少分类',
      value: summary.contentHealth.productsMissingCategory,
      description: '影响目录、搜索路由和邮件分发。'
    }
  ]

  const funnelCards = [
    {
      label: '收藏访客',
      value: decisionFunnel.shortlistVisitors,
      description: `${decisionFunnel.lookbackDays} 天内 ${decisionFunnel.shortlistEvents} 次收藏动作`
    },
    {
      label: '对比访客',
      value: decisionFunnel.compareVisitors,
      description: `${decisionFunnel.compareEvents} 次对比动作`
    },
    {
      label: '商家意向',
      value: decisionFunnel.merchantIntentVisitors,
      description: `${decisionFunnel.merchantIntentEvents} 次商家 CTA 点击`
    },
    {
      label: '验证跳转',
      value: decisionFunnel.verifiedMerchantVisitors,
      description: `${decisionFunnel.verifiedMerchantEvents} 次服务端跳转`
    }
  ]

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="page-title">运营总览</h1>
          <p className="page-subtitle">集中查看商品、内容、SEO 和流水线的关键状态</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/admin/products" className="inline-flex min-h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90">
            导入商品
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
          <Link href="/admin/seo-ops" className="inline-flex min-h-10 items-center gap-2 rounded-md border border-input bg-background px-4 text-sm font-medium text-foreground transition-colors hover:bg-accent hover:text-accent-foreground">
            查看 SEO
          </Link>
        </div>
      </div>

      <section className="overflow-hidden rounded-lg border bg-card text-card-foreground shadow-sm">
        <div className="grid gap-3 p-4 lg:grid-cols-[1.25fr_0.75fr]">
          <div>
            <p className="text-overline font-semibold text-primary">工作台摘要</p>
            <h2 className="mt-2 text-xl font-semibold tracking-tight text-slate-950">
              用一个后台管理商品、内容、SEO 和运行状态。
            </h2>
            <p className="mt-2 max-w-2xl text-body-sm text-muted-foreground">
              首页只保留需要立即判断的指标和入口：先看任务是否正常，再处理商品质量、内容老化和 SEO 风险。
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            <div className="rounded-md border bg-muted/40 p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">流水线并发</p>
                  <p className="mt-1 text-2xl font-bold text-slate-950">{workerConfig.concurrency}</p>
                </div>
                <StatusBadge value={workerConfig.enabled ? 'configured' : 'missing'} />
              </div>
              <p className="mt-2 text-xs text-muted-foreground">每 {workerConfig.pollMs}ms 轮询一次，避免编辑被生成任务阻塞。</p>
            </div>
            <div className="rounded-md border bg-muted/40 p-3">
              <p className="text-sm font-medium text-muted-foreground">助手转化</p>
              <p className="mt-1 text-2xl font-bold text-slate-950">{formatPercent(assistantFunnel.sessionToAcceptRate)}</p>
              <p className="mt-2 text-xs text-muted-foreground">从助手会话进入接受推荐动作的比例。</p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {quickActions.map((action) => {
          const Icon = action.icon
          return (
            <Link
              key={action.href}
              href={action.href}
              className="group rounded-lg border bg-card p-3 shadow-sm transition-all hover:border-blue-200 hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-3">
                <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${action.tone}`}>
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </div>
                <ArrowRight className="h-4 w-4 text-slate-300 transition-transform group-hover:translate-x-1 group-hover:text-blue-500" aria-hidden="true" />
              </div>
              <h3 className="mt-3 text-sm font-bold text-slate-950">{action.title}</h3>
              <p className="mt-1 text-xs leading-5 text-slate-500">{action.description}</p>
            </Link>
          )
        })}
      </section>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="联盟商品" value={summary.totals.affiliateProducts} description="来自 PartnerBoost 或手动导入的原始库存。" tone="blue" />
        <MetricCard label="标准商品" value={summary.totals.products} description="已归一化并进入 Bes3 数据库的商品。" tone="green" />
        <MetricCard label="内容文章" value={summary.totals.articles} description="流水线生成或编辑维护的评测与对比页。" tone="amber" />
        <MetricCard label="流水线任务" value={summary.totals.runs} description="完整内容工作流累计运行记录。" tone="slate" />
      </section>

      <section className="grid gap-3 xl:grid-cols-[1fr_0.9fr]">
        <div className="rounded-lg border bg-card p-4 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-overline font-semibold text-primary">买家漏斗</p>
              <h2 className="card-title mt-1">从收藏到商家跳转</h2>
            </div>
            <StatusBadge value={decisionFunnel.shortlistVisitors ? 'configured' : 'partial'} />
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {funnelCards.map((card) => (
              <div key={card.label} className="rounded-md border bg-muted/40 p-3">
                <p className="text-sm font-medium text-muted-foreground">{card.label}</p>
                <p className="mt-1 text-xl font-bold text-slate-950">{card.value}</p>
                <p className="mt-1 text-xs text-muted-foreground">{card.description}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-md bg-slate-950 p-3 text-white">
              <p className="text-xs font-semibold text-blue-200">收藏到对比</p>
              <p className="mt-1 text-xl font-bold">{formatPercent(decisionFunnel.shortlistToCompareRate)}</p>
            </div>
            <div className="rounded-md border bg-white p-3">
              <p className="text-xs font-semibold text-slate-500">对比到跳转</p>
              <p className="mt-1 text-xl font-bold text-slate-950">{formatPercent(decisionFunnel.compareToVerifiedMerchantRate)}</p>
            </div>
            <div className="rounded-md border bg-white p-3">
              <p className="text-xs font-semibold text-slate-500">助手影响对比</p>
              <p className="mt-1 text-xl font-bold text-slate-950">{formatPercent(decisionFunnel.coachInfluencedCompareRate)}</p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border bg-card p-4 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-overline font-semibold text-primary">内容健康</p>
              <h2 className="card-title mt-1">优先修复会影响信任的缺口</h2>
            </div>
            <StatusBadge value={summary.contentHealth.staleArticleCount === 0 && summary.contentHealth.articlesMissingVisual === 0 ? 'configured' : 'partial'} />
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {healthCards.map((card) => (
              <div key={card.label} className={`rounded-md border p-3 ${getHealthTone(card.value)}`}>
                <p className="text-sm font-medium text-slate-500">{card.label}</p>
                <p className="mt-1 text-xl font-bold text-slate-950">{card.value}</p>
                <p className="mt-1 text-xs text-slate-600">{card.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-3 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="rounded-lg border bg-card p-4 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-blue-600">待处理文章</p>
              <h2 className="mt-2 text-xl font-black tracking-tight text-slate-950">需要复查的公开页面</h2>
            </div>
            <StatusBadge value={summary.staleArticles.length ? 'partial' : 'configured'} />
          </div>
          <div className="mt-4 space-y-2">
            {summary.staleArticles.length ? (
              summary.staleArticles.slice(0, 5).map((article) => (
                <Link
                  key={article.id}
                  href={getArticlePath(article.type, article.slug)}
                  target="_blank"
                  className="block rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 transition-colors hover:border-blue-200 hover:bg-blue-50/50"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-950">{article.title}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{article.type} · 上次复查 {article.lastReviewedAt ? new Date(article.lastReviewedAt).toLocaleDateString() : '未知'}</p>
                    </div>
                    <span className="shrink-0 rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-slate-600">{article.ageDays} 天</span>
                  </div>
                </Link>
              ))
            ) : (
              <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
                当前没有需要紧急复查的公开页面。
              </div>
            )}
          </div>
        </div>

        <div className="rounded-lg border bg-card p-4 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-blue-600">商品优先级</p>
              <h2 className="mt-2 text-xl font-black tracking-tight text-slate-950">先修复高需求且数据薄弱的商品</h2>
            </div>
            <StatusBadge value={commerceQuality.topPriorityProducts.length ? 'partial' : 'configured'} />
          </div>
          <div className="mt-4 space-y-2">
            {commerceQuality.topPriorityProducts.length ? (
              commerceQuality.topPriorityProducts.slice(0, 4).map((product) => (
                <div key={product.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-950">{product.productName}</p>
                      <p className="mt-1 text-sm text-slate-500">
                        {product.brand || '未知品牌'}{product.category ? ` · ${product.category.replace(/-/g, ' ')}` : ''}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-semibold text-slate-500">优先级</p>
                      <p className="mt-1 text-2xl font-black text-slate-950">{product.priorityScore}</p>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1.5 text-xs font-semibold">
                    <span className={`rounded-full px-2.5 py-1 ${getFreshnessBadgeClass(product.freshness)}`}>{getFreshnessLabel(product.freshness)}</span>
                    <span className="rounded-full bg-white px-2.5 py-1 text-slate-700">{product.offerCount} 个报价</span>
                    <span className="rounded-full bg-white px-2.5 py-1 text-slate-700">{product.evidenceCount} 条证据</span>
                    <span className="rounded-full bg-white px-2.5 py-1 text-slate-700">{formatScore(product.dataConfidenceScore)} 置信度</span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Link href={`/admin/products/${product.id}`} className="inline-flex rounded-full bg-slate-950 px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800">
                      打开商品工作台
                    </Link>
                    {product.slug ? (
                      <Link href={`/products/${product.slug}`} target="_blank" className="inline-flex rounded-full bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 ring-1 ring-slate-200 transition-colors hover:bg-slate-50">
                        查看前台页
                      </Link>
                    ) : null}
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
                当前没有需要紧急干预的数据质量问题。
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="grid gap-3 xl:grid-cols-3">
        <div className="rounded-lg border bg-card p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <Search className="h-4 w-4 text-blue-600" aria-hidden="true" />
            <h2 className="text-lg font-black text-slate-950">商业数据质量</h2>
          </div>
          <div className="mt-3 space-y-2 text-sm text-slate-600">
            <div className="flex justify-between gap-3"><span>低置信商品</span><strong className="text-slate-950">{commerceQuality.lowConfidenceProducts}</strong></div>
            <div className="flex justify-between gap-3"><span>报价过期</span><strong className="text-slate-950">{commerceQuality.staleOfferProducts}</strong></div>
            <div className="flex justify-between gap-3"><span>没有报价</span><strong className="text-slate-950">{commerceQuality.productsWithoutOffers}</strong></div>
            <div className="flex justify-between gap-3"><span>缺少证据</span><strong className="text-slate-950">{commerceQuality.productsWithoutEvidence}</strong></div>
          </div>
        </div>

        <div className="rounded-lg border bg-card p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <Wand2 className="h-4 w-4 text-blue-600" aria-hidden="true" />
            <h2 className="text-lg font-black text-slate-950">助手就绪度</h2>
          </div>
          <div className="mt-3 space-y-2 text-sm text-slate-600">
            <div className="flex justify-between gap-3"><span>助手会话</span><strong className="text-slate-950">{assistantFunnel.sessionVisitors}</strong></div>
            <div className="flex justify-between gap-3"><span>补充约束</span><strong className="text-slate-950">{assistantFunnel.constraintVisitors}</strong></div>
            <div className="flex justify-between gap-3"><span>接受推荐</span><strong className="text-slate-950">{assistantFunnel.acceptVisitors}</strong></div>
            <div className="flex justify-between gap-3"><span>价格提醒</span><strong className="text-slate-950">{assistantFunnel.alertVisitors}</strong></div>
          </div>
        </div>

        <div className="rounded-lg border bg-card p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <ShieldAlert className="h-4 w-4 text-blue-600" aria-hidden="true" />
            <h2 className="text-lg font-black text-slate-950">品牌知识层</h2>
          </div>
          <div className="mt-3 space-y-2 text-sm text-slate-600">
            <div className="flex justify-between gap-3"><span>跟踪品牌</span><strong className="text-slate-950">{brandQuality.trackedBrands}</strong></div>
            <div className="flex justify-between gap-3"><span>缺少政策</span><strong className="text-slate-950">{brandQuality.brandsWithoutPolicy}</strong></div>
            <div className="flex justify-between gap-3"><span>兼容性缺口</span><strong className="text-slate-950">{brandQuality.brandsWithoutCompatibilityFacts}</strong></div>
            <div className="flex justify-between gap-3"><span>最强出口</span><strong className="text-right text-slate-950">{summary.conversionSignals.topMerchantSource ? formatMerchantSource(summary.conversionSignals.topMerchantSource) : '暂无数据'}</strong></div>
          </div>
        </div>
      </section>
    </div>
  )
}
