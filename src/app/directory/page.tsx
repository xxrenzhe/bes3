import Link from 'next/link'
import { PublicShell } from '@/components/layout/PublicShell'
import { ShortlistActionBar } from '@/components/site/ShortlistActionBar'
import { getArticlePath } from '@/lib/article-path'
import { formatEditorialDate } from '@/lib/editorial'
import { toShortlistItem } from '@/lib/shortlist'
import { listCategories, listPublishedArticles, listPublishedProducts } from '@/lib/site-data'
import { formatPriceSnapshot } from '@/lib/utils'

export default async function DirectoryPage() {
  const [categories, articles, products] = await Promise.all([listCategories(), listPublishedArticles(), listPublishedProducts()])

  return (
    <PublicShell>
      <div className="mx-auto max-w-7xl space-y-14 px-4 py-14 sm:px-6 lg:px-8">
        <div className="border-b border-border/30 pb-8">
          <p className="editorial-kicker">Buyer Directory</p>
          <h1 className="mt-4 font-[var(--font-display)] text-5xl font-black tracking-tight text-foreground sm:text-6xl">Browse the Bes3 shortlist by category.</h1>
          <p className="mt-4 max-w-2xl text-lg leading-8 text-muted-foreground">
            This page stays crawl-friendly, but it now works like a discovery layer too: every category card shows what is worth opening first instead of dumping a raw archive.
          </p>
        </div>
        <div className="grid gap-8 xl:grid-cols-3">
          {categories.map((category) => {
            const categoryArticles = articles.filter((article) => article.product?.category === category)
            const categoryProducts = products.filter((product) => product.category === category)
            const featuredArticle = categoryArticles[0] || null
            const featuredProduct = categoryProducts[0] || null
            const latestRefresh =
              featuredArticle?.updatedAt ||
              featuredArticle?.publishedAt ||
              featuredProduct?.updatedAt ||
              featuredProduct?.publishedAt ||
              null

            return (
              <div key={category} className="rounded-[2rem] bg-white p-7 shadow-panel">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="border-l-2 border-primary pl-3 text-xs font-bold uppercase tracking-[0.16em] text-foreground">{category.replace(/-/g, ' ')}</h2>
                    <p className="mt-4 text-sm leading-7 text-muted-foreground">
                      {categoryProducts.length} products · {categoryArticles.length} published pages · Refreshed {formatEditorialDate(latestRefresh, 'soon')}
                    </p>
                  </div>
                  <Link href={`/categories/${category}`} className="text-sm font-semibold text-primary transition-colors hover:text-emerald-700">
                    Open hub →
                  </Link>
                </div>

                {featuredProduct ? (
                  <div className="mt-6 rounded-[1.5rem] bg-muted/50 p-5">
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">Start here</p>
                    <h3 className="mt-3 font-[var(--font-display)] text-2xl font-black tracking-tight text-foreground">{featuredProduct.productName}</h3>
                    <p className="mt-3 text-sm leading-7 text-muted-foreground">
                      {featuredProduct.description || 'Current price context and a clean path into the product-level Bes3 verdict.'}
                    </p>
                    <ShortlistActionBar item={toShortlistItem(featuredProduct)} compact className="mt-4" />
                    <div className="mt-4 flex items-center justify-between gap-4">
                      <span className="text-sm font-semibold text-foreground">
                        {formatPriceSnapshot(featuredProduct.priceAmount, featuredProduct.priceCurrency || 'USD')}
                      </span>
                      {featuredProduct.slug ? (
                        <Link href={`/products/${featuredProduct.slug}`} className="text-sm font-semibold text-primary transition-colors hover:text-emerald-700">
                          Open deep-dive →
                        </Link>
                      ) : null}
                    </div>
                  </div>
                ) : null}

                <div className="mt-6 space-y-3 text-sm text-muted-foreground">
                  {categoryArticles.slice(0, 3).map((article) => (
                    <Link key={article.id} href={getArticlePath(article.type, article.slug)} className="block rounded-[1.25rem] border border-border/60 px-4 py-3 transition-colors hover:border-primary/30 hover:text-primary">
                      {article.title}
                    </Link>
                  ))}
                  {!featuredArticle && !featuredProduct ? <p>Coverage is still being built for this category.</p> : null}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </PublicShell>
  )
}
