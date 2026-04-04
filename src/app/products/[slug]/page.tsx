import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { PrimaryCta } from '@/components/site/PrimaryCta'
import { PublicShell } from '@/components/layout/PublicShell'
import { getArticlePath } from '@/lib/article-path'
import { buildBestFor, buildConfidenceSignals, buildNotFor, formatEditorialDate, getFreshnessLabel, getSnapshotDate } from '@/lib/editorial'
import { buildMerchantExitPath } from '@/lib/merchant-links'
import { getProductBySlug, listPublishedArticles } from '@/lib/site-data'
import { formatPriceSnapshot } from '@/lib/utils'

export default async function ProductPage({
  params
}: {
  params: Promise<{ slug: string }>
}) {
  const product = await getProductBySlug((await params).slug)
  if (!product) notFound()

  const articles = await listPublishedArticles()
  const reviewArticle = articles.find((article) => article.productId === product.id && article.type === 'review') || null
  const comparisonArticle = articles.find((article) => article.productId === product.id && article.type === 'comparison') || null
  const heroImageUrl = product.heroImageUrl || reviewArticle?.heroImageUrl || null
  const specs = Object.entries(product.specs).slice(0, 6)
  const snapshotDate = getSnapshotDate(reviewArticle, product)
  const confidenceSignals = buildConfidenceSignals(product)

  return (
    <PublicShell>
      <div className="mx-auto max-w-7xl space-y-14 px-4 py-14 sm:px-6 lg:px-8">
        <section className="space-y-8">
          <nav className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
            <Link href="/" className="transition-colors hover:text-primary">Home</Link>
            <span>/</span>
            <Link href={product.category ? `/categories/${product.category}` : '/directory'} className="transition-colors hover:text-primary">
              {product.category ? product.category.replace(/-/g, ' ') : 'Products'}
            </Link>
            <span>/</span>
            <span className="text-foreground">{product.productName}</span>
          </nav>

          <div className="grid gap-10 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="space-y-6">
              <p className="editorial-kicker">Independent Product Deep-Dive</p>
              <h1 className="font-[var(--font-display)] text-5xl font-black tracking-tight text-balance sm:text-6xl">
                {product.productName}
              </h1>
              <p className="max-w-3xl text-lg leading-8 text-muted-foreground">
                {reviewArticle?.summary || product.description || `${product.productName} is part of the current Bes3 shortlist and this page captures the product facts, price context, and deep-dive notes that matter before you buy.`}
              </p>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-[1.5rem] bg-white p-5 shadow-panel">
                  <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground">Review freshness</p>
                  <p className="mt-2 text-lg font-black text-foreground">{formatEditorialDate(snapshotDate)}</p>
                  <p className="mt-2 text-sm leading-7 text-muted-foreground">{getFreshnessLabel(snapshotDate)}</p>
                </div>
                <div className="rounded-[1.5rem] bg-white p-5 shadow-panel">
                  <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground">Best for</p>
                  <p className="mt-2 text-sm leading-7 text-muted-foreground">{buildBestFor(product, 'product')}</p>
                </div>
                <div className="rounded-[1.5rem] bg-white p-5 shadow-panel">
                  <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground">Skip if</p>
                  <p className="mt-2 text-sm leading-7 text-muted-foreground">{buildNotFor(product, 'product')}</p>
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-[1.5rem] bg-white p-5 shadow-panel">
                  <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground">Current Price</p>
                  <p className="mt-2 text-2xl font-black text-foreground">{formatPriceSnapshot(product.priceAmount, product.priceCurrency || 'USD')}</p>
                </div>
                <div className="rounded-[1.5rem] bg-white p-5 shadow-panel">
                  <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground">Rating</p>
                  <p className="mt-2 text-2xl font-black text-foreground">{product.rating ? `${product.rating.toFixed(1)} / 5` : 'N/A'}</p>
                </div>
                <div className="rounded-[1.5rem] bg-white p-5 shadow-panel">
                  <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground">Reviews</p>
                  <p className="mt-2 text-2xl font-black text-foreground">{product.reviewCount ? product.reviewCount.toLocaleString() : 'N/A'}</p>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="overflow-hidden rounded-[2rem] bg-[linear-gradient(135deg,#e5eeff,#dfe9fa)] shadow-panel">
                <div className="relative aspect-[4/3]">
                  {heroImageUrl ? (
                    <Image
                      src={heroImageUrl}
                      alt={product.productName}
                      fill
                      sizes="(max-width: 1024px) 100vw, 40vw"
                      className="object-cover"
                    />
                  ) : (
                    <div className="bg-grid absolute inset-0" />
                  )}
                </div>
              </div>
              <div className="rounded-[2rem] bg-white p-6 shadow-panel">
                <PrimaryCta
                  href={product.resolvedUrl ? buildMerchantExitPath(product.id, 'product-page-primary-cta') : null}
                  label="Check Current Price"
                  note={`Confidence signals: ${confidenceSignals.join(' · ')}`}
                />
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="space-y-8">
            <div className="rounded-[2rem] bg-white p-8 shadow-panel">
              <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-primary">What stands out</p>
              <div className="mt-5 space-y-4">
                {(product.reviewHighlights.length ? product.reviewHighlights : ['Strong buyer confidence', 'Useful value proposition', 'Worth shortlisting']).map((item) => (
                  <div key={item} className="flex items-start gap-3 text-sm leading-7 text-muted-foreground">
                    <span className="mt-2 flex h-2.5 w-2.5 shrink-0 rounded-full bg-primary" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
            {reviewArticle ? (
              <div className="rounded-[2rem] bg-white p-8 shadow-panel">
                <div className="editorial-prose" dangerouslySetInnerHTML={{ __html: reviewArticle.contentHtml }} />
              </div>
            ) : (
              <div className="rounded-[2rem] bg-white p-8 shadow-panel">
                <div className="editorial-prose">
                  <h2>The Deep Dive Analysis</h2>
                  <p>
                    Bes3 uses this page to capture the product-level detail that sits underneath a shortlist recommendation: the price context, core specs, and the signals that make the product worth considering in the first place.
                  </p>
                </div>
              </div>
            )}
          </div>

          <aside className="space-y-6">
            <div className="rounded-[2rem] bg-[linear-gradient(135deg,#eefaf5,#f6fffb)] p-6 shadow-panel">
              <h2 className="font-[var(--font-display)] text-2xl font-black tracking-tight">Specs Snapshot</h2>
              <div className="mt-5 space-y-3">
                {specs.map(([label, value]) => (
                  <div key={label} className="flex items-center justify-between gap-4 rounded-[1rem] bg-white px-4 py-3">
                    <span className="text-sm text-muted-foreground">{label}</span>
                    <span className="text-sm font-semibold text-foreground">{value}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-[2rem] bg-white p-6 shadow-panel">
              <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-primary">Decision Checklist</p>
              <div className="mt-4 space-y-3">
                {[
                  'Confirm this product still fits your actual use case before clicking through.',
                  'Treat price as a final check, not the only reason to buy.',
                  'Use the specs snapshot to verify there is no hidden mismatch.'
                ].map((item) => (
                  <div key={item} className="flex items-start gap-3 text-sm leading-7 text-muted-foreground">
                    <span className="mt-2 h-2.5 w-2.5 rounded-full bg-primary" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
            {comparisonArticle ? (
              <div className="rounded-[2rem] bg-white p-6 shadow-panel">
                <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-primary">Related Comparison</p>
                <h3 className="mt-3 font-[var(--font-display)] text-2xl font-black tracking-tight">{comparisonArticle.title}</h3>
                <p className="mt-3 text-sm leading-7 text-muted-foreground">{comparisonArticle.summary}</p>
                <Link href={getArticlePath(comparisonArticle.type, comparisonArticle.slug)} className="mt-5 inline-flex text-sm font-semibold text-primary">
                  Open comparison →
                </Link>
              </div>
            ) : null}
          </aside>
        </section>
      </div>
    </PublicShell>
  )
}
