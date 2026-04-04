import Link from 'next/link'
import { PublicShell } from '@/components/layout/PublicShell'
import { getArticlePath } from '@/lib/article-path'
import { listCategories, listPublishedArticles } from '@/lib/site-data'

export default async function DirectoryPage() {
  const [categories, articles] = await Promise.all([listCategories(), listPublishedArticles()])

  return (
    <PublicShell>
      <div className="mx-auto max-w-7xl space-y-14 px-4 py-14 sm:px-6 lg:px-8">
        <div className="border-b border-border/30 pb-8">
          <p className="editorial-kicker">HTML Sitemap</p>
          <h1 className="mt-4 font-[var(--font-display)] text-5xl font-black tracking-tight text-foreground sm:text-6xl">Bes3 Directory</h1>
          <p className="mt-4 max-w-2xl text-lg leading-8 text-muted-foreground">
            A crawl-friendly, human-readable index of every category, review, comparison, and guide currently published on Bes3.
          </p>
        </div>
        <div className="grid gap-10 md:grid-cols-2 xl:grid-cols-4">
          {categories.map((category) => (
            <div key={category} className="rounded-[2rem] bg-white p-7 shadow-panel">
              <h2 className="border-l-2 border-primary pl-3 text-xs font-bold uppercase tracking-[0.16em] text-foreground">{category.replace(/-/g, ' ')}</h2>
              <ul className="mt-5 space-y-3 text-sm text-muted-foreground">
                {articles
                  .filter((article) => article.product?.category === category)
                  .map((article) => (
                    <li key={article.id}>
                      <Link href={getArticlePath(article.type, article.slug)} className="block py-1 transition-colors hover:text-primary">
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
