import Link from 'next/link'
import { PublicShell } from '@/components/layout/PublicShell'
import { getArticlePath } from '@/lib/article-path'
import { listPublishedArticles } from '@/lib/site-data'

export default async function NotFound() {
  const articles = (await listPublishedArticles()).slice(0, 3)
  return (
    <PublicShell>
      <div className="mx-auto max-w-7xl space-y-16 px-4 py-16 sm:px-6 lg:px-8">
        <div className="text-center">
          <div className="relative mx-auto mb-8 max-w-3xl">
            <p className="text-[11rem] font-black leading-none text-muted">404</p>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <h1 className="font-[var(--font-display)] text-4xl font-black tracking-tight sm:text-5xl">Oops. Page not found.</h1>
              <p className="mt-4 max-w-xl text-lg leading-8 text-muted-foreground">
                It looks like this page was moved, unpublished, or never existed in the first place.
              </p>
            </div>
          </div>
          <Link href="/" className="inline-flex rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground">
            Back to Home
          </Link>
        </div>
        <div>
          <div className="mb-8 flex items-center justify-between">
            <h2 className="font-[var(--font-display)] text-2xl font-black tracking-tight">Try our trending picks</h2>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {articles.map((article) => (
              <Link key={article.id} href={getArticlePath(article.type, article.slug)} className="rounded-[2rem] bg-white p-7 shadow-panel transition-transform hover:-translate-y-1">
                <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-primary">{article.type}</p>
                <h2 className="mt-4 font-[var(--font-display)] text-2xl font-black tracking-tight">{article.title}</h2>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </PublicShell>
  )
}
