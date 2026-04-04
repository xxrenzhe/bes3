import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { StructuredData } from '@/components/site/StructuredData'
import { NewsletterSignup } from '@/components/site/NewsletterSignup'
import { SectionHeader } from '@/components/site/SectionHeader'
import { ShortlistActionBar } from '@/components/site/ShortlistActionBar'
import { PublicShell } from '@/components/layout/PublicShell'
import { getArticlePath } from '@/lib/article-path'
import { buildPageMetadata } from '@/lib/metadata'
import { buildCollectionPageSchema } from '@/lib/structured-data'
import { toShortlistItem } from '@/lib/shortlist'
import { listCategories, listPublishedArticles } from '@/lib/site-data'
import { formatPriceSnapshot } from '@/lib/utils'

export const metadata: Metadata = buildPageMetadata({
  title: 'Buyer-First Tech Buying Guide',
  description:
    'Bes3 helps shoppers shortlist real tech products, read verdicts, compare finalists, and track price shifts without losing the buying lane.',
  path: '/'
})

export default async function HomePage() {
  const [articles, categories] = await Promise.all([listPublishedArticles(), listCategories()])
  const featured = articles.slice(0, 3)
  const directoryCategories = categories.slice(0, 3)
  const featuredReview = articles.find((article) => article.type === 'review') || featured[0] || null
  const featuredComparison = articles.find((article) => article.type === 'comparison') || featured[1] || featuredReview
  const intentRoutes = [
    {
      eyebrow: 'Start narrow',
      title: 'Build a shortlist',
      description: 'Use product-first search when you already know the use case and want Bes3 to narrow the field into a few serious options.',
      href: '/search?scope=products',
      label: 'Search products'
    },
    {
      eyebrow: 'Go deep',
      title: 'Read a real verdict',
      description: 'Open the full review when you need the buyer fit, the main tradeoffs, and the reasons to skip a product before you click out.',
      href: featuredReview ? getArticlePath(featuredReview.type, featuredReview.slug) : '/search?scope=review',
      label: 'Open a review'
    },
    {
      eyebrow: 'Decide faster',
      title: 'Compare finalists',
      description: 'Use side-by-side comparisons or the shortlist workspace once you already have two or three credible candidates.',
      href: featuredComparison ? getArticlePath(featuredComparison.type, featuredComparison.slug) : '/shortlist',
      label: 'Open comparisons'
    },
    {
      eyebrow: 'Stay price-aware',
      title: 'Track deals and shifts',
      description: 'Use Bes3 deals and briefing flows when you are not ready to buy today but want the next worthwhile price or category move.',
      href: '/deals',
      label: 'See current deals'
    }
  ]
  const decisionPrinciples = [
    ['Intent first', 'Pick the route that matches where you are in the buying journey instead of sifting through raw archives.'],
    ['Same-category compare', 'Bes3 keeps comparisons inside one product lane so the tradeoffs stay honest and useful.'],
    ['Low-pressure next step', 'Save, compare, or check price only when the decision is mature enough to justify the click.']
  ]
  const structuredData = buildCollectionPageSchema({
    path: '/',
    title: 'Buyer-First Tech Buying Guide',
    description: 'Bes3 helps shoppers shortlist real tech products, read verdicts, compare finalists, and track price shifts without losing the buying lane.',
    image: featured[0]?.heroImageUrl,
    items: [
      ...featured.map((article) => ({
        name: article.title,
        path: getArticlePath(article.type, article.slug)
      })),
      ...directoryCategories.map((category) => ({
        name: category.replace(/-/g, ' '),
        path: `/categories/${category}`
      }))
    ]
  })

  return (
    <PublicShell>
      <StructuredData data={structuredData} />
      <section className="overflow-hidden px-4 pb-16 pt-8 sm:px-6 lg:px-8 lg:pb-24">
        <div className="mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="space-y-8">
            <div className="inline-flex items-center rounded-full bg-secondary px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.28em] text-secondary-foreground">
              Expert Selection
            </div>
            <div className="space-y-6">
              <h1 className="max-w-4xl font-[var(--font-display)] text-5xl font-black tracking-tight text-balance text-foreground sm:text-7xl">
                The Best 3 Tech Picks, <span className="text-primary">decoded.</span>
              </h1>
              <p className="max-w-2xl text-lg leading-8 text-muted-foreground sm:text-xl">
                Bes3 is a buyer-first consumer guide for tech and home-office gear. We turn noisy product research into shortlists, deep-dive verdicts, cleaner comparisons, and price-aware next steps.
              </p>
            </div>
            <div className="flex flex-wrap gap-4">
              <Link
                href={featured[0] ? getArticlePath(featured[0].type, featured[0].slug) : '/directory'}
                className="rounded-full bg-[linear-gradient(135deg,hsl(var(--primary)),#00855d)] px-8 py-4 text-base font-semibold text-primary-foreground shadow-lg shadow-emerald-950/10 transition-transform hover:-translate-y-0.5"
              >
                Explore the Top 3
              </Link>
              <Link
                href="/shortlist"
                className="rounded-full border border-border/80 bg-white/70 px-8 py-4 text-base font-semibold text-foreground transition-colors hover:bg-white"
              >
                Open My Shortlist
              </Link>
              <Link
                href="/deals"
                className="rounded-full border border-border/80 bg-white/70 px-8 py-4 text-base font-semibold text-foreground transition-colors hover:bg-white"
              >
                See Trending Deals
              </Link>
            </div>
          </div>
          <div className="relative">
            <div className="absolute inset-0 translate-x-4 translate-y-4 rounded-[2.5rem] bg-primary/10" />
            <div className="editorial-shadow relative overflow-hidden rounded-[2.5rem] bg-white">
              <div className="relative aspect-[4/4.7] bg-[linear-gradient(135deg,#dfe9fa,#eef4ff)]">
                {featured[0]?.heroImageUrl ? (
                  <Image
                    src={featured[0].heroImageUrl}
                    alt={featured[0].title}
                    fill
                    priority
                    sizes="(max-width: 1024px) 100vw, 42vw"
                    className="object-cover"
                  />
                ) : (
                  <div className="bg-grid absolute inset-0" />
                )}
              </div>
              <div className="space-y-5 p-8">
                <div className="flex items-center gap-3">
                  <span className="rounded-full bg-primary px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-primary-foreground">
                    Featured Review
                  </span>
                  {featured[0]?.product?.category ? (
                    <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                      {featured[0].product.category.replace(/-/g, ' ')}
                    </span>
                  ) : null}
                </div>
                <h2 className="font-[var(--font-display)] text-3xl font-black tracking-tight text-foreground">
                  {featured[0]?.title || 'Calm, buyer-first recommendations.'}
                </h2>
                <p className="text-base leading-8 text-muted-foreground">
                  {featured[0]?.summary || 'Practical verdicts, clear tradeoffs, and direct paths into the products that actually deserve your time.'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 pb-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl rounded-[2.5rem] bg-[linear-gradient(135deg,#fff8ef_0%,#f8fbff_48%,#eefaf5_100%)] p-8 shadow-panel sm:p-10">
          <div className="grid gap-8 xl:grid-cols-[1fr_0.95fr] xl:items-start">
            <div>
              <SectionHeader
                eyebrow="Buyer Intent Routes"
                title="Choose the route that matches your buying moment."
                description="Bes3 works best when it meets shoppers where they are: finding candidates, reading a verdict, comparing finalists, or waiting for the right price."
              />
              <div className="mt-6 grid gap-4 sm:grid-cols-3">
                {decisionPrinciples.map(([title, description]) => (
                  <div key={title} className="rounded-[1.5rem] bg-white/85 p-5 shadow-[0_24px_60px_-40px_rgba(15,23,42,0.35)]">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">{title}</p>
                    <p className="mt-3 text-sm leading-7 text-muted-foreground">{description}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {intentRoutes.map((route) => (
                <Link
                  key={route.title}
                  href={route.href}
                  className="group rounded-[1.75rem] bg-white p-6 shadow-[0_24px_60px_-40px_rgba(15,23,42,0.35)] transition-transform hover:-translate-y-1"
                >
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">{route.eyebrow}</p>
                  <h2 className="mt-3 font-[var(--font-display)] text-2xl font-black tracking-tight text-foreground group-hover:text-primary">{route.title}</h2>
                  <p className="mt-3 text-sm leading-7 text-muted-foreground">{route.description}</p>
                  <p className="mt-5 text-sm font-semibold text-primary">{route.label} →</p>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="tonal-surface border-y border-white/50 px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-16 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <SectionHeader
              eyebrow="Category Directory"
              title="Browse by category once you know the lane."
              description="Category hubs are still useful, but they work best after intent is clear. Each hub gathers the strongest reviews, comparisons, and supporting buyer guidance in one place."
            />
            <Link href="/directory" className="inline-flex items-center gap-2 text-sm font-semibold text-primary transition-transform hover:translate-x-1">
              View all categories <span aria-hidden="true">→</span>
            </Link>
          </div>
          <div className="grid gap-8 md:grid-cols-3">
            {directoryCategories.map((category) => (
              <Link
                key={category}
                href={`/categories/${category}`}
                className="editorial-shadow group rounded-[2rem] bg-white p-8 transition-transform hover:-translate-y-1"
              >
                <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary text-primary">
                  <span className="text-lg font-black">{category[0]?.toUpperCase()}</span>
                </div>
                <h3 className="font-[var(--font-display)] text-3xl font-black tracking-tight text-foreground group-hover:text-primary">
                  {category.replace(/-/g, ' ')}
                </h3>
                <p className="mt-4 text-sm leading-7 text-muted-foreground">
                  Reviews, comparisons, and buyer notes organized for fast decision-making.
                </p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
        <div className="mx-auto max-w-7xl">
          <div className="mb-14 text-center">
            <p className="editorial-kicker">Currently Trending</p>
            <h2 className="mt-4 font-[var(--font-display)] text-4xl font-black tracking-tight text-foreground sm:text-5xl">
              The Current Best 3
            </h2>
            <div className="mx-auto mt-5 h-1.5 w-24 rounded-full bg-primary" />
            <p className="mx-auto mt-5 max-w-2xl text-sm leading-7 text-muted-foreground">
              These are not just recent publishes. They are the clearest current entry points into the Bes3 decision flow: a candidate worth saving, a verdict worth reading, or a comparison worth acting on.
            </p>
          </div>
          <div className="grid gap-10 lg:grid-cols-3">
            {featured.map((article, index) => (
              <article key={article.id} className="editorial-shadow group relative flex flex-col overflow-hidden rounded-[2rem] bg-white">
                <div className="absolute left-5 top-5 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-primary text-base font-black text-primary-foreground shadow-lg shadow-emerald-950/10">
                  {index + 1}
                </div>
                <div className="relative aspect-[4/3] overflow-hidden bg-[linear-gradient(135deg,#e5eeff,#dfe9fa)]">
                  {article.heroImageUrl ? (
                    <Image
                      src={article.heroImageUrl}
                      alt={article.title}
                      fill
                      sizes="(max-width: 1024px) 100vw, 33vw"
                      className="object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                  ) : (
                    <div className="bg-grid absolute inset-0" />
                  )}
                </div>
                <div className="flex flex-1 flex-col p-8">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-primary">
                    {article.product?.category?.replace(/-/g, ' ') || article.type}
                  </p>
                  <h3 className="mt-3 font-[var(--font-display)] text-3xl font-black tracking-tight text-foreground">{article.title}</h3>
                  <p className="mt-4 text-sm leading-7 text-muted-foreground">
                    {article.summary || 'Clear tradeoffs and calm buyer guidance.'}
                  </p>
                  {article.product ? <ShortlistActionBar item={toShortlistItem(article.product)} compact className="mt-5" source="homepage-best3-card" /> : null}
                  <div className="mt-auto flex items-center justify-between pt-8">
                    <span className="text-xl font-black text-foreground">
                      {formatPriceSnapshot(article.product?.priceAmount, article.product?.priceCurrency || 'USD')}
                    </span>
                    <Link
                      href={getArticlePath(article.type, article.slug)}
                      className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-transform hover:-translate-y-0.5"
                    >
                      Review
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 pb-20 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-10 overflow-hidden rounded-[2.5rem] bg-[#14202c] px-8 py-10 text-white lg:grid-cols-[0.95fr_1.05fr] lg:px-12 lg:py-14">
          <div className="space-y-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-emerald-200">Weekly Briefing</p>
            <h2 className="font-[var(--font-display)] text-4xl font-black tracking-tight text-balance text-white">Stay decoded.</h2>
            <p className="max-w-xl text-base leading-8 text-slate-300">
              Join the Bes3 shortlist for buyer-focused email notes on category shifts, newly published comparisons, worthwhile price drops, and the next decision-ready product lanes.
            </p>
          </div>
          <NewsletterSignup categoryOptions={categories.slice(0, 6)} source="homepage-alert-module" />
        </div>
      </section>
    </PublicShell>
  )
}
