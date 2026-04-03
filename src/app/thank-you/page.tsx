import Link from 'next/link'
import { PublicShell } from '@/components/layout/PublicShell'
import { listPublishedArticles } from '@/lib/site-data'

export default async function ThankYouPage() {
  const articles = (await listPublishedArticles()).slice(0, 3)
  return (
    <PublicShell>
      <div className="mx-auto max-w-5xl space-y-10 px-4 py-16 sm:px-6 lg:px-8">
        <div className="rounded-[32px] border border-border bg-white p-10 text-center shadow-panel">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 text-4xl text-emerald-700">✓</div>
          <h1 className="mt-6 font-[var(--font-display)] text-5xl font-semibold tracking-tight">Thanks for reaching out.</h1>
          <p className="mt-4 text-lg leading-8 text-muted-foreground">Your message is in. Bes3 keeps the funnel moving, so here are a few reviews to keep browsing.</p>
          <Link href="/" className="mt-8 inline-flex rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground">
            Return to Homepage
          </Link>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {articles.map((article) => (
            <Link key={article.id} href={article.type === 'comparison' ? `/compare/${article.slug}` : `/reviews/${article.slug}`} className="rounded-[28px] border border-border bg-white p-6 shadow-panel">
              <p className="text-xs uppercase tracking-[0.22em] text-primary">{article.type}</p>
              <h2 className="mt-4 font-[var(--font-display)] text-2xl font-semibold">{article.title}</h2>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">{article.summary}</p>
            </Link>
          ))}
        </div>
      </div>
    </PublicShell>
  )
}
