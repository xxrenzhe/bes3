import Link from 'next/link'
import { PublicShell } from '@/components/layout/PublicShell'
import { listCategories, listPublishedArticles } from '@/lib/site-data'

export default async function DirectoryPage() {
  const [categories, articles] = await Promise.all([listCategories(), listPublishedArticles()])

  return (
    <PublicShell>
      <div className="mx-auto max-w-7xl space-y-10 px-4 py-14 sm:px-6 lg:px-8">
        <div className="space-y-3">
          <p className="font-mono text-xs uppercase tracking-[0.28em] text-primary">HTML Sitemap</p>
          <h1 className="font-[var(--font-display)] text-5xl font-semibold tracking-tight">Bes3 Directory</h1>
        </div>
        <div className="grid gap-10 md:grid-cols-2 xl:grid-cols-3">
          {categories.map((category) => (
            <div key={category} className="rounded-[28px] border border-border bg-white p-6 shadow-panel">
              <h2 className="font-[var(--font-display)] text-2xl font-semibold capitalize">{category.replace(/-/g, ' ')}</h2>
              <ul className="mt-5 space-y-3 text-sm text-muted-foreground">
                {articles
                  .filter((article) => article.product?.category === category)
                  .map((article) => (
                    <li key={article.id}>
                      <Link href={article.type === 'comparison' ? `/compare/${article.slug}` : `/reviews/${article.slug}`} className="transition-colors hover:text-foreground">
                        {article.title}
                      </Link>
                    </li>
                  ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </PublicShell>
  )
}
