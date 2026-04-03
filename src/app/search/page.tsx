import Link from 'next/link'
import { ArticleCard } from '@/components/site/ArticleCard'
import { PublicShell } from '@/components/layout/PublicShell'
import { searchArticles } from '@/lib/site-data'

export default async function SearchPage({
  searchParams
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const query = (await searchParams).q || ''
  const results = await searchArticles(query)

  return (
    <PublicShell>
      <div className="mx-auto max-w-7xl space-y-10 px-4 py-14 sm:px-6 lg:px-8">
        <form className="rounded-[32px] border border-border bg-white p-8 shadow-panel">
          <p className="font-mono text-xs uppercase tracking-[0.28em] text-primary">Search</p>
          <input
            name="q"
            defaultValue={query}
            className="mt-4 min-h-[58px] w-full rounded-2xl border border-border px-5 text-base"
            placeholder="Search reviews, comparisons, or keywords"
          />
        </form>
        {query ? (
          results.length ? (
            <div className="grid gap-8 lg:grid-cols-3">
              {results.map((article) => (
                <ArticleCard
                  key={article.id}
                  article={article}
                  href={article.type === 'comparison' ? `/compare/${article.slug}` : `/reviews/${article.slug}`}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-[32px] border border-border bg-[#f7f1e4] p-10 text-center shadow-panel">
              <h1 className="font-[var(--font-display)] text-4xl font-semibold">No results found.</h1>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">Try a product name, a brand, or a higher-level keyword like keyboard or desk setup.</p>
            </div>
          )
        ) : (
          <div className="rounded-[32px] border border-border bg-white p-8 shadow-panel">
            <h1 className="font-[var(--font-display)] text-3xl font-semibold">Trending picks</h1>
            <p className="mt-3 text-sm leading-7 text-muted-foreground">Start with a product name or category, or browse the Bes3 directory.</p>
            <Link href="/directory" className="mt-6 inline-flex rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground">
              Open Directory
            </Link>
          </div>
        )}
      </div>
    </PublicShell>
  )
}
