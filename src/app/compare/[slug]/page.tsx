import { notFound } from 'next/navigation'
import { PublicShell } from '@/components/layout/PublicShell'
import { PrimaryCta } from '@/components/site/PrimaryCta'
import { getArticleBySlug } from '@/lib/site-data'

export default async function ComparisonPage({
  params
}: {
  params: Promise<{ slug: string }>
}) {
  const article = await getArticleBySlug((await params).slug)
  if (!article || article.type !== 'comparison') notFound()

  return (
    <PublicShell>
      <div className="mx-auto max-w-6xl space-y-10 px-4 py-14 sm:px-6 lg:px-8">
        <div className="rounded-[32px] border border-border bg-white p-8 shadow-panel">
          <p className="font-mono text-xs uppercase tracking-[0.28em] text-primary">Head to Head</p>
          <h1 className="mt-4 font-[var(--font-display)] text-5xl font-semibold tracking-tight text-balance">{article.title}</h1>
          <p className="mt-4 max-w-3xl text-lg leading-8 text-muted-foreground">{article.summary}</p>
        </div>
        <div className="grid gap-8 lg:grid-cols-[1.25fr_0.75fr]">
          <article className="prose prose-slate max-w-none rounded-[32px] border border-border bg-white p-8 shadow-panel" dangerouslySetInnerHTML={{ __html: article.contentHtml }} />
          <aside className="space-y-6 rounded-[32px] border border-border bg-[#f7f1e4] p-6">
            <div className="rounded-3xl border border-primary/20 bg-white p-5">
              <p className="font-mono text-xs uppercase tracking-[0.24em] text-primary">Winner</p>
              <h2 className="mt-3 font-[var(--font-display)] text-2xl font-semibold">{article.product?.productName}</h2>
              <p className="mt-2 text-sm leading-7 text-muted-foreground">Best balance of price, confidence, and broad buyer fit.</p>
            </div>
            <PrimaryCta href={article.product?.resolvedUrl || '#'} label="Check Current Price on Amazon" />
          </aside>
        </div>
      </div>
    </PublicShell>
  )
}
