import { PublicShell } from '@/components/layout/PublicShell'

export default async function GuidePage({
  params
}: {
  params: Promise<{ slug: string }>
}) {
  const slug = (await params).slug
  return (
    <PublicShell>
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[280px_1fr] lg:px-8">
        <aside className="hidden md:block">
          <div className="sticky top-28 space-y-8">
            <nav className="rounded-[2rem] bg-white p-6 shadow-panel">
              <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-muted-foreground">Table of Contents</p>
              <div className="mt-4 flex flex-col gap-2 text-sm">
                <a href="#overview">Overview</a>
                <a href="#signal">What Matters</a>
                <a href="#buying">Buying Advice</a>
              </div>
            </nav>
          </div>
        </aside>
        <article className="rounded-[2.5rem] bg-white p-8 shadow-panel sm:p-10">
          <div className="editorial-prose">
            <h1>{slug.replace(/-/g, ' ')}</h1>
            <p id="overview">This educational guide page is designed for long-form informational SEO content inside Bes3.</p>
            <h2 id="signal">What matters</h2>
            <p>Use this route for evergreen explanations, compatibility notes, and buying heuristics that support product reviews without hard selling.</p>
            <h2 id="buying">Buying advice</h2>
            <p>Keep the tone calm, factual, and practical. Bes3 uses guides to narrow confusion before readers land on a review or comparison page.</p>
          </div>
        </article>
      </div>
    </PublicShell>
  )
}
