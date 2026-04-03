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
    <article className="overflow-hidden rounded-[28px] border border-border bg-card shadow-panel transition-transform duration-300 hover:-translate-y-1">
      <div className="relative aspect-[4/3] overflow-hidden bg-[#dbe7df]">
        {article.heroImageUrl ? (
          <Image
            src={article.heroImageUrl}
            alt={article.title}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
            className="object-cover"
          />
        ) : (
          <div className="bg-grid absolute inset-0 animate-pulse-grid" />
        )}
      </div>
      <div className="space-y-4 p-6">
        <div className="flex items-center gap-2 text-xs uppercase tracking-[0.22em] text-muted-foreground">
          <span>{article.type}</span>
          {article.product?.category ? <span>{article.product.category}</span> : null}
        </div>
        <h3 className="font-[var(--font-display)] text-2xl font-semibold leading-tight text-foreground">{article.title}</h3>
        <p className="text-sm leading-7 text-muted-foreground">{article.summary}</p>
        <Link href={href} className="inline-flex items-center rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-transform hover:-translate-y-0.5">
          Read the verdict
        </Link>
      </div>
    </article>
  )
}
