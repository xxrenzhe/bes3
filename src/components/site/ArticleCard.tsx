import Image from 'next/image'
import Link from 'next/link'
import type { ArticleRecord } from '@/lib/site-data'

export function ArticleCard({
  article,
  href
}: {
  article: ArticleRecord
  href: string
}) {
  return (
    <article className="group editorial-shadow overflow-hidden rounded-[2rem] bg-card transition-transform duration-300 hover:-translate-y-1">
      <div className="relative aspect-[4/3] overflow-hidden bg-[linear-gradient(135deg,#e5eeff,#dfe9fa)]">
        {article.heroImageUrl ? (
          <Image
            src={article.heroImageUrl}
            alt={article.title}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
            className="object-cover transition-transform duration-700 group-hover:scale-105"
          />
        ) : (
          <div className="bg-grid absolute inset-0 animate-pulse-grid" />
        )}
      </div>
      <div className="space-y-4 p-7">
        <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
          <span className="rounded-full bg-secondary px-3 py-1 text-secondary-foreground">{article.type}</span>
          {article.product?.category ? <span>{article.product.category.replace(/-/g, ' ')}</span> : null}
        </div>
        <h3 className="font-[var(--font-display)] text-2xl font-black leading-tight tracking-tight text-foreground">{article.title}</h3>
        <p className="text-sm leading-7 text-muted-foreground">{article.summary || 'Expert curation, practical tradeoffs, and buyer-focused notes.'}</p>
        <Link href={href} className="inline-flex items-center gap-2 text-sm font-semibold text-primary transition-transform hover:translate-x-1">
          Read the verdict
          <span aria-hidden="true">→</span>
        </Link>
      </div>
    </article>
  )
}
