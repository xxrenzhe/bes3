import Link from 'next/link'
import { PriceValueBadge } from '@/components/site/PriceValueBadge'
import { StructuredData } from '@/components/site/StructuredData'
import { getArticlePath } from '@/lib/article-path'
import { prepareEditorialHtmlWithToc } from '@/lib/editorial-html'
import { buildArticleSchema, buildBreadcrumbSchema, buildProductSchema, buildReviewSchema } from '@/lib/structured-data'
import type { ArticleRecord } from '@/lib/site-data'

function getArticleLabel(type: string) {
  if (type === 'comparison') return 'Comparison'
  if (type === 'guide') return 'Guide'
  return 'Review'
}

function getDescription(article: ArticleRecord) {
  return article.summary || article.seoDescription || `${article.title} gives buyers the decision context, product facts, and next steps needed before purchasing.`
}

export function EditorialArticlePage({ article }: { article: ArticleRecord }) {
  const path = getArticlePath(article.type, article.slug)
  const prepared = prepareEditorialHtmlWithToc(article.contentHtml || `<p>${getDescription(article)}</p>`)
  const product = article.product
  const description = getDescription(article)
  const label = getArticleLabel(article.type)
  const structuredData = [
    buildBreadcrumbSchema(path, [
      { name: 'Home', path: '/' },
      { name: label, path: article.type === 'comparison' ? '/compare' : '/reviews' },
      { name: article.title, path }
    ]),
    article.type === 'review'
      ? buildReviewSchema(article, path)
      : buildArticleSchema({
          path,
          title: article.seoTitle || article.title,
          description,
          image: article.heroImageUrl || product?.heroImageUrl,
          datePublished: article.publishedAt || article.createdAt,
          dateModified: article.updatedAt || article.publishedAt || article.createdAt,
          type: 'Article',
          about: product ? { '@type': 'Product', name: product.productName } : undefined
        }),
    product ? buildProductSchema(product, product.slug ? `/products/${product.slug}` : path, description, article.heroImageUrl || product.heroImageUrl) : null
  ].filter(Boolean)

  return (
    <>
      <StructuredData data={structuredData} />
      <article>
        <section className="border-b border-border bg-white px-4 py-14 sm:px-6 lg:px-8">
          <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[1fr_360px]">
            <div>
              <p className="text-xs font-bold uppercase text-primary">{label}</p>
              <h1 className="mt-4 max-w-5xl font-[var(--font-display)] text-4xl font-black tracking-tight sm:text-6xl">
                {article.title}
              </h1>
              <p className="mt-6 max-w-3xl text-lg leading-8 text-muted-foreground">{description}</p>
              <div className="mt-8 flex flex-wrap gap-3">
                {product?.slug ? (
                  <Link href={`/products/${product.slug}`} className="rounded-md border border-border bg-white px-4 py-2 text-sm font-semibold hover:border-primary hover:text-primary">
                    View evidence report
                  </Link>
                ) : null}
                {product?.resolvedUrl || product?.sourceAffiliateLink ? (
                  <a href={product.slug ? `/go/${product.id}` : product.resolvedUrl || product.sourceAffiliateLink || '#'} className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
                    Check price
                  </a>
                ) : null}
              </div>
            </div>
            <aside className="rounded-md border border-border bg-slate-50 p-6">
              <p className="text-xs font-bold uppercase text-muted-foreground">Decision snapshot</p>
              <dl className="mt-5 space-y-4 text-sm">
                <div>
                  <dt className="font-semibold text-foreground">Page type</dt>
                  <dd className="mt-1 text-muted-foreground">{label}</dd>
                </div>
                {product ? (
                  <>
                    <div>
                      <dt className="font-semibold text-foreground">Product</dt>
                      <dd className="mt-1 text-muted-foreground">{product.productName}</dd>
                    </div>
                    <div>
                      <dt className="font-semibold text-foreground">Category</dt>
                      <dd className="mt-1 text-muted-foreground">{product.category || product.categorySlug || 'Researching'}</dd>
                    </div>
                    <div>
                      <dt className="font-semibold text-foreground">Current price</dt>
                      <dd className="mt-2">
                        <PriceValueBadge
                          price={{
                            currentPrice: product.priceAmount,
                            histLowPrice: null,
                            avg90dPrice: null,
                            currency: product.priceCurrency || 'USD',
                            valueScore: null,
                            entryStatus: 'unknown',
                            label: product.priceAmount ? `${product.priceCurrency || 'USD'} ${Number(product.priceAmount).toFixed(2)}` : 'Researching',
                            explanation: 'Offer and price history are refreshed by the commerce pipeline.'
                          }}
                        />
                      </dd>
                    </div>
                  </>
                ) : (
                  <div>
                    <dt className="font-semibold text-foreground">Product link</dt>
                    <dd className="mt-1 text-muted-foreground">This article is published before a public product entity is ready.</dd>
                  </div>
                )}
              </dl>
            </aside>
          </div>
        </section>

        <section className="px-4 py-14 sm:px-6 lg:px-8">
          <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[260px_1fr]">
            <nav className="hidden lg:block">
              <div className="sticky top-24 rounded-md border border-border bg-white p-5">
                <p className="text-xs font-bold uppercase text-muted-foreground">On this page</p>
                <div className="mt-4 space-y-3 text-sm">
                  {prepared.toc.length ? prepared.toc.map((entry) => (
                    <a key={entry.id} href={`#${entry.id}`} className={`block text-muted-foreground hover:text-primary ${entry.level === 3 ? 'pl-4' : ''}`}>
                      {entry.label}
                    </a>
                  )) : (
                    <span className="block text-muted-foreground">Decision summary</span>
                  )}
                </div>
              </div>
            </nav>
            <div className="editorial-prose rounded-md border border-border bg-white p-6 sm:p-8">
              <div dangerouslySetInnerHTML={{ __html: prepared.html }} />
            </div>
          </div>
        </section>
      </article>
    </>
  )
}
