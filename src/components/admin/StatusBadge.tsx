import { cn } from '@/lib/utils'

const STYLES: Record<string, string> = {
  queued: 'bg-slate-100 text-slate-700',
  running: 'bg-amber-100 text-amber-800',
  completed: 'bg-emerald-100 text-emerald-800',
  completed_with_issues: 'bg-amber-100 text-amber-800',
  high: 'bg-rose-100 text-rose-800',
  medium: 'bg-amber-100 text-amber-800',
  low: 'bg-slate-100 text-slate-700',
  published: 'bg-emerald-100 text-emerald-800',
  partialFailed: 'bg-orange-100 text-orange-800',
  failed: 'bg-rose-100 text-rose-800',
  success: 'bg-emerald-100 text-emerald-800',
  error: 'bg-rose-100 text-rose-800',
  warning: 'bg-amber-100 text-amber-800',
  skipped: 'bg-slate-100 text-slate-700',
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
  mineHardcoreIntents: 'bg-violet-100 text-violet-800',
  resolveVideoEntities: 'bg-blue-100 text-blue-800',
  extractVideoEvidence: 'bg-cyan-100 text-cyan-800',
  scoreConsensus: 'bg-emerald-100 text-emerald-800',
  refreshPriceValue: 'bg-lime-100 text-lime-800',
  generateScenarioPages: 'bg-fuchsia-100 text-fuchsia-800',
  mineKeywords: 'bg-violet-100 text-violet-800',
  generateReviewArticle: 'bg-rose-100 text-rose-800',
  generateComparisonArticle: 'bg-indigo-100 text-indigo-800',
  generateSeoPayload: 'bg-cyan-100 text-cyan-800',
  publishPages: 'bg-lime-100 text-lime-800',
  revalidateAndSitemap: 'bg-fuchsia-100 text-fuchsia-800',
  pingAndIndexing: 'bg-pink-100 text-pink-800',
  http_error: 'bg-rose-100 text-rose-800',
  out_of_stock: 'bg-amber-100 text-amber-800',
  canonical_missing: 'bg-amber-100 text-amber-800',
  canonical_mismatch: 'bg-rose-100 text-rose-800',
  route_type_mismatch: 'bg-rose-100 text-rose-800',
  thin_description: 'bg-amber-100 text-amber-800',
  low_signal_copy: 'bg-amber-100 text-amber-800',
  title_path_mismatch: 'bg-rose-100 text-rose-800',
  heading_hierarchy_gap: 'bg-amber-100 text-amber-800',
  heading_depth_excess: 'bg-amber-100 text-amber-800',
  missing_h2_structure: 'bg-amber-100 text-amber-800',
  render_http_error: 'bg-rose-100 text-rose-800',
  missing_canonical_tag: 'bg-amber-100 text-amber-800',
  canonical_tag_mismatch: 'bg-rose-100 text-rose-800',
  missing_meta_description_tag: 'bg-amber-100 text-amber-800',
  missing_og_title: 'bg-amber-100 text-amber-800',
  missing_og_description: 'bg-amber-100 text-amber-800',
  missing_json_ld: 'bg-rose-100 text-rose-800',
  missing_h1: 'bg-rose-100 text-rose-800',
  multiple_h1: 'bg-rose-100 text-rose-800',
  published_page_noindex: 'bg-rose-100 text-rose-800',
  trust_http_error: 'bg-rose-100 text-rose-800',
  machine_entry_invalid_content_type: 'bg-amber-100 text-amber-800',
  machine_entry_missing_field: 'bg-amber-100 text-amber-800',
  trust_missing_canonical_tag: 'bg-amber-100 text-amber-800',
  trust_missing_json_ld: 'bg-amber-100 text-amber-800',
  trust_missing_trust_links: 'bg-amber-100 text-amber-800',
  llms_missing_reference: 'bg-amber-100 text-amber-800',
  trust_origin_unreachable: 'bg-amber-100 text-amber-800',
  render_timeout: 'bg-amber-100 text-amber-800',
  render_audit_error: 'bg-rose-100 text-rose-800'
}

function formatValue(value: string) {
  return value
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/_/g, ' ')
    .trim()
}

export function StatusBadge({ value }: { value: string }) {
  return (
    <span
      className={cn(
        'inline-flex rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em]',
        STYLES[value] || 'bg-slate-100 text-slate-700'
      )}
    >
      {formatValue(value)}
    </span>
  )
}
