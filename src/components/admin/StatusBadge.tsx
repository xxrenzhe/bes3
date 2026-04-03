import { cn } from '@/lib/utils'

const STYLES: Record<string, string> = {
  queued: 'bg-slate-100 text-slate-700',
  running: 'bg-amber-100 text-amber-800',
  completed: 'bg-emerald-100 text-emerald-800',
  published: 'bg-emerald-100 text-emerald-800',
  partialFailed: 'bg-orange-100 text-orange-800',
  failed: 'bg-rose-100 text-rose-800',
  draft: 'bg-slate-100 text-slate-700',
  configured: 'bg-emerald-100 text-emerald-800',
  partial: 'bg-amber-100 text-amber-800',
  missing: 'bg-rose-100 text-rose-800',
  review: 'bg-sky-100 text-sky-800',
  comparison: 'bg-indigo-100 text-indigo-800',
  guide: 'bg-violet-100 text-violet-800',
  hero: 'bg-amber-100 text-amber-800',
  gallery: 'bg-teal-100 text-teal-800',
  manual: 'bg-zinc-100 text-zinc-800',
  partnerboost_amazon: 'bg-orange-100 text-orange-800',
  partnerboost_dtc: 'bg-cyan-100 text-cyan-800',
  resolveAffiliateLink: 'bg-slate-100 text-slate-700',
  scrapeProductFacts: 'bg-sky-100 text-sky-800',
  persistMediaAssets: 'bg-amber-100 text-amber-800',
  normalizeProduct: 'bg-emerald-100 text-emerald-800',
  mineKeywords: 'bg-violet-100 text-violet-800',
  generateReviewArticle: 'bg-rose-100 text-rose-800',
  generateComparisonArticle: 'bg-indigo-100 text-indigo-800',
  generateSeoPayload: 'bg-cyan-100 text-cyan-800',
  publishPages: 'bg-lime-100 text-lime-800',
  revalidateAndSitemap: 'bg-fuchsia-100 text-fuchsia-800',
  pingAndIndexing: 'bg-pink-100 text-pink-800'
}

export function StatusBadge({ value }: { value: string }) {
  return (
    <span className={cn('inline-flex rounded-full px-3 py-1 text-xs font-semibold', STYLES[value] || 'bg-slate-100 text-slate-700')}>
      {value}
    </span>
  )
}
