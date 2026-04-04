import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { PublicShell } from '@/components/layout/PublicShell'
import { ShortlistActionBar } from '@/components/site/ShortlistActionBar'
import { getArticlePath } from '@/lib/article-path'
import { buildBestFor, buildConfidenceSignals, buildNotFor, formatEditorialDate, getFreshnessLabel, getSnapshotDate } from '@/lib/editorial'
import { toShortlistItem } from '@/lib/shortlist'
import { getArticleBySlug, listPublishedArticles } from '@/lib/site-data'
import { formatPriceSnapshot } from '@/lib/utils'

function buildFallbackNote(productName: string) {
  return `${productName} is best for buyers who want a straightforward recommendation without spending another week comparing near-identical options.`
}

export default async function ReviewPage({
  params
}: {
  params: Promise<{ slug: string }>
}) {
  const article = await getArticleBySlug((await params).slug)
  if (!article || article.type !== 'review') notFound()

  const articles = await listPublishedArticles()
  const category = article.product?.category || null
  const snapshotDate = getSnapshotDate(article, article.product)
  const confidenceSignals = buildConfidenceSignals(article.product)

  const reviewPicks = [
    article,
    ...articles.filter((candidate) => {
      if (candidate.id === article.id) return false
      if (candidate.type !== 'review') return false
      if (category && candidate.product?.category !== category) return false
      return true
    })
  ].slice(0, 3)

  return (
    <PublicShell>
      <div className="mx-auto max-w-7xl space-y-14 px-4 py-14 sm:px-6 lg:px-8">
        <section className="space-y-8">
          <nav className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
            <Link href="/" className="transition-colors hover:text-primary">Home</Link>
            <span>/</span>
            <Link href={category ? `/categories/${category}` : '/directory'} className="transition-colors hover:text-primary">
              {category ? category.replace(/-/g, ' ') : 'Reviews'}
            </Link>
            <span>/</span>
            <span className="text-foreground">{article.title}</span>
          </nav>
          <div className="space-y-6">
            <div className="inline-flex items-center rounded-full bg-secondary px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.28em] text-secondary-foreground">
              Top 3 Review Landing
            </div>
            <h1 className="max-w-5xl font-[var(--font-display)] text-5xl font-black tracking-tight text-balance sm:text-6xl">
              {article.title}
            </h1>
            <div className="flex flex-wrap items-center gap-4 border-y border-border/30 py-6 text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">Buyer-first editorial shortlist</span>
              <span className="hidden sm:inline">•</span>
              <span>{article.publishedAt ? `Updated ${new Date(article.publishedAt).toLocaleDateString()}` : 'Freshly curated'}</span>
            </div>
            <p className="max-w-3xl text-lg leading-8 text-muted-foreground">
              {article.summary || buildFallbackNote(article.product?.productName || article.title)}
            </p>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-[1.5rem] bg-white p-5 shadow-panel">
                <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground">Freshness</p>
                <p className="mt-2 text-lg font-black text-foreground">{formatEditorialDate(snapshotDate)}</p>
                <p className="mt-2 text-sm leading-7 text-muted-foreground">{getFreshnessLabel(snapshotDate)}</p>
              </div>
              <div className="rounded-[1.5rem] bg-white p-5 shadow-panel">
                <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground">Best for</p>
                <p className="mt-2 text-sm leading-7 text-muted-foreground">{buildBestFor(article.product, 'review')}</p>
              </div>
              <div className="rounded-[1.5rem] bg-white p-5 shadow-panel">
                <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground">Skip if</p>
                <p className="mt-2 text-sm leading-7 text-muted-foreground">{buildNotFor(article.product, 'review')}</p>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-10">
          {reviewPicks.map((pick, index) => {
            const product = pick.product
            const productHref = product?.slug ? `/products/${product.slug}` : getArticlePath(pick.type, pick.slug)
            const specs = Object.entries(product?.specs || {}).slice(0, 2)

            return (
              <article key={pick.id} className="overflow-hidden rounded-[2rem] bg-white shadow-panel">
                <div className={`grid gap-8 p-8 md:p-10 ${index % 2 === 0 ? 'md:grid-cols-[1.1fr_0.9fr]' : 'md:grid-cols-[0.9fr_1.1fr]'}`}>
                  <div className={`space-y-8 ${index % 2 === 1 ? 'md:order-2' : ''}`}>
                    <div className="space-y-4">
                      <span className={`inline-flex rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.24em] ${index === 0 ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                        #{index + 1} {index === 0 ? 'Best Overall' : index === 1 ? 'Best Value' : 'Alternative Pick'}
                      </span>
                      <h2 className="font-[var(--font-display)] text-4xl font-black tracking-tight text-foreground">
                        {product?.productName || pick.title}
                      </h2>
                      <p className="text-sm leading-7 text-muted-foreground">
                        <strong className="text-foreground">BLUF:</strong> {pick.summary || buildFallbackNote(product?.productName || pick.title)}
                      </p>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-[1.25rem] bg-muted p-4">
                        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Current Price</p>
                        <p className="mt-2 text-lg font-black text-foreground">{formatPriceSnapshot(product?.priceAmount, product?.priceCurrency || 'USD')}</p>
                      </div>
                      <div className="rounded-[1.25rem] bg-muted p-4">
                        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Reader Signal</p>
                        <p className="mt-2 text-lg font-black text-foreground">
                          {product?.rating ? `${product.rating.toFixed(1)} / 5` : 'No rating yet'}
                        </p>
                      </div>
                      {specs.map(([label, value]) => (
                        <div key={label} className="rounded-[1.25rem] bg-muted p-4">
                          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">{label}</p>
                          <p className="mt-2 text-lg font-black text-foreground">{value}</p>
                        </div>
                      ))}
                    </div>

                    <div className="grid gap-6 md:grid-cols-2">
                      <div className="rounded-[1.5rem] bg-[linear-gradient(135deg,#eefaf5,#f6fffb)] p-6">
                        <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-primary">Bes3 Radar Score</p>
                        <div className="mt-5 space-y-4">
                          {[
                            ['Build quality', product?.rating ? Math.min(9.8, product.rating * 2) : 8.2],
                            ['Buyer confidence', product?.reviewCount ? Math.min(9.9, 6 + Math.log10(product.reviewCount + 1)) : 7.4],
                            ['Value signal', product?.priceAmount ? Math.max(6.6, 10 - Math.min(product.priceAmount / 200, 3)) : 7.8]
                          ].map(([label, score]) => (
                            <div key={label}>
                              <div className="mb-1 flex items-center justify-between text-xs font-semibold text-foreground">
                                <span>{label}</span>
                                <span>{Number(score).toFixed(1)}</span>
                              </div>
                              <div className="h-2 overflow-hidden rounded-full bg-white">
                                <div className="h-full rounded-full bg-[linear-gradient(135deg,hsl(var(--primary)),#00855d)]" style={{ width: `${(Number(score) / 10) * 100}%` }} />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="rounded-[1.5rem] bg-rose-50 p-6">
                        <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-rose-700">Who it&apos;s not for</p>
                        <p className="mt-4 text-sm leading-7 text-rose-900/80">
                          Buyers chasing the most extreme niche performance or a radically different use case should keep comparing before buying.
                        </p>
                      </div>
                    </div>

                    <Link
                      href={productHref}
                      className="inline-flex rounded-full bg-[linear-gradient(135deg,hsl(var(--primary)),#00855d)] px-8 py-4 text-lg font-semibold text-primary-foreground shadow-lg shadow-emerald-950/10 transition-transform hover:-translate-y-0.5"
                    >
                      Open Deep-Dive
                    </Link>
                    {product ? <ShortlistActionBar item={toShortlistItem(product)} compact /> : null}
                    {index === 0 ? (
                      <p className="text-xs leading-6 text-muted-foreground">
                        Confidence signals: {confidenceSignals.join(' · ')}
                      </p>
                    ) : null}
                  </div>

                  <div className={index % 2 === 1 ? 'md:order-1' : ''}>
                    <div className="relative overflow-hidden rounded-[1.75rem] bg-[linear-gradient(135deg,#e5eeff,#dfe9fa)]">
                      <div className="relative aspect-square">
                        {pick.heroImageUrl ? (
                          <Image
                            src={pick.heroImageUrl}
                            alt={pick.title}
                            fill
                            sizes="(max-width: 768px) 100vw, 36vw"
                            className="object-cover"
                          />
                        ) : (
                          <div className="bg-grid absolute inset-0" />
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </article>
            )
          })}
        </section>

        <section className="rounded-[2.5rem] bg-white p-8 shadow-panel sm:p-10">
          <div className="editorial-prose" dangerouslySetInnerHTML={{ __html: article.contentHtml }} />
        </section>
      </div>
    </PublicShell>
  )
}
