import { notFound } from 'next/navigation'
import { PrimaryCta } from '@/components/site/PrimaryCta'
import { PublicShell } from '@/components/layout/PublicShell'
import { getArticleBySlug } from '@/lib/site-data'

export default async function ReviewPage({
  params
}: {
  params: Promise<{ slug: string }>
}) {
  const article = await getArticleBySlug((await params).slug)
  if (!article || article.type !== 'review') notFound()

  return (
    <PublicShell>
      <div className="mx-auto max-w-6xl space-y-10 px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-6">
            <p className="font-mono text-xs uppercase tracking-[0.28em] text-primary">Independent Review</p>
            <h1 className="font-[var(--font-display)] text-5xl font-semibold tracking-tight text-balance">{article.title}</h1>
            <p className="text-lg leading-8 text-muted-foreground">{article.summary}</p>
            {article.product ? (
              <div className="grid gap-4 rounded-[28px] border border-border bg-[#f7f1e4] p-6 sm:grid-cols-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Price</p>
                  <p className="mt-2 text-2xl font-semibold">{article.product.priceCurrency} {article.product.priceAmount?.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Rating</p>
                  <p className="mt-2 text-2xl font-semibold">{article.product.rating ?? 'N/A'}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Reviews</p>
                  <p className="mt-2 text-2xl font-semibold">{article.product.reviewCount ?? 'N/A'}</p>
                </div>
              </div>
            ) : null}
          </div>
          <aside className="space-y-6 rounded-[32px] border border-border bg-white p-6 shadow-panel">
            <PrimaryCta href={article.product?.resolvedUrl || '#'} label="Check Current Price on Amazon" />
            <div className="rounded-3xl border border-amber-300 bg-amber-50 p-5">
              <h2 className="font-[var(--font-display)] text-xl font-semibold text-amber-900">Who this is not for</h2>
              <p className="mt-2 text-sm leading-7 text-amber-900/80">
                Buyers who need ultra-premium fit and finish or the absolute top-end performance ceiling should keep looking.
              </p>
            </div>
            {article.product ? (
              <div className="rounded-3xl border border-border bg-[#f7f1e4] p-5">
                <h2 className="font-[var(--font-display)] text-xl font-semibold">Specs Snapshot</h2>
                <div className="mt-4 space-y-3 text-sm">
                  {Object.entries(article.product.specs).slice(0, 6).map(([label, value]) => (
                    <div key={label} className="flex justify-between gap-4 border-b border-border pb-2">
                      <span className="text-muted-foreground">{label}</span>
                      <span className="font-medium">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </aside>
        </div>
        <article className="prose prose-slate max-w-none rounded-[32px] border border-border bg-white p-8 shadow-panel" dangerouslySetInnerHTML={{ __html: article.contentHtml }} />
      </div>
    </PublicShell>
  )
}
