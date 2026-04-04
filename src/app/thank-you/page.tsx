import Link from 'next/link'
import { PublicShell } from '@/components/layout/PublicShell'
import { getArticlePath } from '@/lib/article-path'
import { listPublishedArticles } from '@/lib/site-data'

export default async function ThankYouPage() {
  const articles = (await listPublishedArticles()).slice(0, 3)
  return (
    <PublicShell>
      <div className="mx-auto max-w-7xl space-y-14 px-4 py-16 sm:px-6 lg:px-8">
        <div className="rounded-[2.5rem] bg-white p-10 text-center shadow-panel sm:p-14">
          <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-primary/10 text-5xl text-primary">✓</div>
          <h1 className="mt-6 font-[var(--font-display)] text-5xl font-black tracking-tight">Message sent.</h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg leading-8 text-muted-foreground">
            Thanks for reaching out. A member of the Bes3 team will get back to you soon. In the meantime, here are a few reviews worth browsing next.
          </p>
          <Link href="/" className="mt-8 inline-flex rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground">
            Return to Homepage
          </Link>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {articles.map((article) => (
            <Link key={article.id} href={getArticlePath(article.type, article.slug)} className="rounded-[2rem] bg-white p-7 shadow-panel transition-transform hover:-translate-y-1">
              <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-primary">{article.type}</p>
              <h2 className="mt-4 font-[var(--font-display)] text-2xl font-black tracking-tight">{article.title}</h2>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">{article.summary}</p>
            </Link>
          ))}
        </div>
      </div>
    </PublicShell>
  )
}
