import Link from 'next/link'
import { PublicShell } from '@/components/layout/PublicShell'
import { listPublishedArticles } from '@/lib/site-data'

export default async function NotFound() {
  const articles = (await listPublishedArticles()).slice(0, 3)
  return (
    <PublicShell>
      <div className="mx-auto max-w-5xl space-y-10 px-4 py-16 sm:px-6 lg:px-8">
        <div className="rounded-[32px] border border-border bg-white p-10 text-center shadow-panel">
          <h1 className="font-[var(--font-display)] text-6xl font-semibold tracking-tight">404</h1>
          <p className="mt-3 text-lg leading-8 text-muted-foreground">Oops. That page is missing, but the buying funnel does not have to stop here.</p>
          <Link href="/" className="mt-8 inline-flex rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground">
            Back to Home
          </Link>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {articles.map((article) => (
            <Link key={article.id} href={article.type === 'comparison' ? `/compare/${article.slug}` : `/reviews/${article.slug}`} className="rounded-[28px] border border-border bg-[#f7f1e4] p-6">
              <p className="text-xs uppercase tracking-[0.22em] text-primary">{article.type}</p>
              <h2 className="mt-4 font-[var(--font-display)] text-2xl font-semibold">{article.title}</h2>
            </Link>
          ))}
        </div>
      </div>
    </PublicShell>
  )
}
