import { PublicShell } from '@/components/layout/PublicShell'

export default async function GuidePage({
  params
}: {
  params: Promise<{ slug: string }>
}) {
  const slug = (await params).slug
  return (
    <PublicShell>
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[260px_1fr] lg:px-8">
        <aside className="sticky top-24 h-fit rounded-[28px] border border-border bg-[#f7f1e4] p-5">
          <p className="font-mono text-xs uppercase tracking-[0.24em] text-primary">Guide TOC</p>
          <div className="mt-4 flex flex-col gap-3 text-sm text-muted-foreground">
            <a href="#overview">Overview</a>
            <a href="#signal">What Matters</a>
            <a href="#buying">Buying Advice</a>
          </div>
        </aside>
        <article className="prose prose-slate max-w-none rounded-[32px] border border-border bg-white p-8 shadow-panel">
          <h1>{slug.replace(/-/g, ' ')}</h1>
          <p id="overview">This educational guide page is designed for long-form informational SEO content inside Bes3.</p>
          <h2 id="signal">What matters</h2>
          <p>Use this route for evergreen explanations, compatibility notes, and buying heuristics that support product reviews without hard selling.</p>
          <h2 id="buying">Buying advice</h2>
          <p>Keep the tone calm, factual, and practical. Bes3 uses guides to narrow confusion before readers land on a review or comparison page.</p>
        </article>
      </div>
    </PublicShell>
  )
}
