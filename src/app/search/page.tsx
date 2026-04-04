import Link from 'next/link'
import { PublicShell } from '@/components/layout/PublicShell'
import { getArticlePath } from '@/lib/article-path'
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
      <div className="mx-auto max-w-7xl space-y-12 px-4 py-14 sm:px-6 lg:px-8">
        <section className="mx-auto max-w-3xl text-center">
          <h1 className="font-[var(--font-display)] text-4xl font-black tracking-tight text-foreground sm:text-5xl">Find the future of tech.</h1>
          <p className="mt-4 text-lg leading-8 text-muted-foreground">Search reviews, comparisons, guides, brands, or product names across the Bes3 archive.</p>
        </section>
        <form className="mx-auto max-w-4xl rounded-[2rem] bg-white p-8 shadow-panel">
          <p className="editorial-kicker">Search</p>
          <input
            name="q"
            defaultValue={query}
            className="mt-4 min-h-[64px] w-full rounded-[1.5rem] border-none bg-muted px-6 text-base"
            placeholder="Search reviews, comparisons, or keywords"
          />
        </form>
        {query ? (
          results.length ? (
            <section className="space-y-6">
              <div className="flex items-baseline justify-between border-b border-border/30 pb-4">
                <h2 className="font-[var(--font-display)] text-3xl font-black tracking-tight">Search Results</h2>
                <span className="text-sm text-muted-foreground">
                  Showing {results.length} result{results.length === 1 ? '' : 's'} for "{query}"
                </span>
              </div>
              <div className="grid gap-6">
                {results.map((article) => (
                  <Link key={article.id} href={getArticlePath(article.type, article.slug)} className="grid gap-6 rounded-[2rem] bg-white p-6 shadow-panel transition-transform hover:-translate-y-1 md:grid-cols-[220px_1fr]">
                    <div className="rounded-[1.5rem] bg-[linear-gradient(135deg,#e5eeff,#dfe9fa)] p-5">
                      <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-primary">{article.type}</p>
                      <h3 className="mt-3 font-[var(--font-display)] text-2xl font-black tracking-tight text-foreground">
                        {article.product?.productName || article.title}
                      </h3>
                      <p className="mt-3 text-sm text-muted-foreground">{article.product?.category?.replace(/-/g, ' ') || 'Editorial archive'}</p>
                    </div>
                    <div className="space-y-4">
                      <h3 className="font-[var(--font-display)] text-3xl font-black tracking-tight text-foreground">{article.title}</h3>
                      <p className="text-sm leading-7 text-muted-foreground">{article.summary || 'Clear tradeoffs, practical verdicts, and buyer-focused notes.'}</p>
                      <p className="text-sm font-semibold text-primary">Read the verdict →</p>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          ) : (
            <div className="rounded-[2rem] bg-white p-12 text-center shadow-panel">
              <h2 className="font-[var(--font-display)] text-4xl font-black tracking-tight">No results found.</h2>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">Try a product name, a brand, or a higher-level keyword like keyboard or desk setup.</p>
            </div>
          )
        ) : (
          <div className="rounded-[2rem] bg-white p-8 shadow-panel">
            <h2 className="font-[var(--font-display)] text-3xl font-black tracking-tight">Trending picks</h2>
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
