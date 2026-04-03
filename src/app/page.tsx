import Link from 'next/link'
import { ArticleCard } from '@/components/site/ArticleCard'
import { NewsletterSignup } from '@/components/site/NewsletterSignup'
import { PrimaryCta } from '@/components/site/PrimaryCta'
import { SectionHeader } from '@/components/site/SectionHeader'
import { PublicShell } from '@/components/layout/PublicShell'
import { listCategories, listPublishedArticles } from '@/lib/site-data'

export default async function HomePage() {
  const [articles, categories] = await Promise.all([listPublishedArticles(), listCategories()])
  const featured = articles.slice(0, 3)

  return (
    <PublicShell>
      <section className="border-b border-border bg-[linear-gradient(135deg,#fff6e8_0%,#ecf8f2_52%,#f4efe4_100%)]">
        <div className="mx-auto grid max-w-7xl gap-12 px-4 py-16 sm:px-6 lg:grid-cols-[1.2fr_0.8fr] lg:px-8 lg:py-24">
          <div className="space-y-8">
            <div className="inline-flex rounded-full border border-primary/15 bg-white/80 px-4 py-2 font-mono text-xs uppercase tracking-[0.28em] text-primary shadow-sm">
              Bes3 Review Engine
            </div>
            <div className="space-y-5">
              <h1 className="max-w-4xl font-[var(--font-display)] text-5xl font-semibold tracking-tight text-balance text-foreground sm:text-6xl">
                The best 3 tech picks, decoded.
              </h1>
              <p className="max-w-2xl text-lg leading-8 text-muted-foreground">
                Bes3 turns affiliate products into practical review pages, comparison breakdowns, and buyer-ready summaries with a clear CTA and transparent tradeoffs.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <PrimaryCta href={featured[0] ? `/reviews/${featured[0].slug}` : '/deals'} label="Browse Featured Review" />
              <Link href="/directory" className="rounded-full border border-border bg-white px-5 py-3 text-sm font-semibold text-foreground shadow-sm transition-transform hover:-translate-y-0.5">
                Open Directory
              </Link>
            </div>
          </div>
          <div className="rounded-[32px] border border-white/60 bg-white/80 p-6 shadow-panel backdrop-blur">
            <div className="bg-grid rounded-[24px] border border-border bg-[#f7f1e4] p-6">
              <p className="font-mono text-xs uppercase tracking-[0.24em] text-muted-foreground">Core Workflow</p>
              <div className="mt-5 space-y-4">
                {[
                  'Paste affiliate link or sync products from PartnerBoost',
                  'Resolve redirects and scrape the real product page',
                  'Mine high-value long-tail keywords',
                  'Generate review and comparison content',
                  'Publish SEO pages and update sitemap'
                ].map((item, index) => (
                  <div key={item} className="flex items-start gap-4 rounded-2xl border border-border bg-white px-4 py-4">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                      {index + 1}
                    </div>
                    <p className="text-sm leading-7 text-foreground">{item}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl space-y-10 px-4 py-16 sm:px-6 lg:px-8">
        <SectionHeader eyebrow="Featured Reviews" title="High-signal pages built for buyers, not fluff." description="Review pages, comparison guides, and supporting informational content share one consistent visual system and one clean buying language." />
        <div className="grid gap-8 lg:grid-cols-3">
          {featured.map((article) => {
            const href = article.type === 'comparison' ? `/compare/${article.slug}` : `/reviews/${article.slug}`
            return <ArticleCard key={article.id} article={article} href={href} />
          })}
        </div>
      </section>

      <section className="border-y border-border bg-[#f7f1e4]">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <SectionHeader eyebrow="Categories" title="Topic hubs designed for crawl depth and fast browsing." />
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {categories.map((category) => (
              <Link
                key={category}
                href={`/categories/${category}`}
                className="rounded-[28px] border border-border bg-white p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-panel"
              >
                <p className="font-mono text-xs uppercase tracking-[0.24em] text-primary">Category</p>
                <h3 className="mt-4 font-[var(--font-display)] text-2xl font-semibold capitalize">{category.replace(/-/g, ' ')}</h3>
                <p className="mt-3 text-sm leading-7 text-muted-foreground">Review hubs, comparisons, and price-driven picks in one place.</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-4">
            <p className="font-mono text-xs uppercase tracking-[0.28em] text-primary">Buyer Method</p>
            <h2 className="font-[var(--font-display)] text-4xl font-semibold">Why only three picks?</h2>
            <p className="text-base leading-8 text-muted-foreground">
              Bes3 is built around decision compression. Instead of flooding buyers with fifteen near-identical options, we surface a shortlist with clear reasons to buy, reasons to skip, and one low-friction CTA.
            </p>
          </div>
          <NewsletterSignup />
        </div>
      </section>
    </PublicShell>
  )
}
