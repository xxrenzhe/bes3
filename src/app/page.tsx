import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { SeoFaqSection } from '@/components/site/SeoFaqSection'
import { StructuredData } from '@/components/site/StructuredData'
import { NewsletterSignup } from '@/components/site/NewsletterSignup'
import { SectionHeader } from '@/components/site/SectionHeader'
import { ShortlistActionBar } from '@/components/site/ShortlistActionBar'
import { PublicShell } from '@/components/layout/PublicShell'
import { getArticlePath } from '@/lib/article-path'
import { buildPageMetadata } from '@/lib/metadata'
import { buildCollectionPageSchema, buildFaqSchema } from '@/lib/structured-data'
import { toShortlistItem } from '@/lib/shortlist'
import { listBrands, listCategories, listPublishedArticles } from '@/lib/site-data'
import { formatPriceSnapshot } from '@/lib/utils'

export async function generateMetadata(): Promise<Metadata> {
  const articles = await listPublishedArticles()
  const freshnessDate = articles[0]?.updatedAt || articles[0]?.publishedAt || articles[0]?.createdAt || null

  return buildPageMetadata({
    title: 'Tech Reviews, Comparisons, and Deals',
    description:
      'Bes3 helps you find the right tech faster with clear reviews, side-by-side comparisons, and verified deals.',
    path: '/',
    image: articles[0]?.heroImageUrl,
    freshnessDate,
    freshnessInTitle: true,
    keywords: ['tech buying guide', 'product reviews', 'product comparisons', 'verified deals', 'best tech picks']
  })
}

export default async function HomePage() {
  const [articles, brands, categories] = await Promise.all([listPublishedArticles(), listBrands(), listCategories()])
  const featured = articles.slice(0, 3)
  const featuredBrands = brands.slice(0, 4)
  const directoryCategories = categories.slice(0, 3)
  const featuredReview = articles.find((article) => article.type === 'review') || featured[0] || null
  const featuredComparison = articles.find((article) => article.type === 'comparison') || featured[1] || featuredReview
  const intentRoutes = [
    {
      eyebrow: 'Start here',
      title: 'Not sure where to start?',
      description: 'Open the start page when you want Bes3 to point you to the most useful next step instead of dumping you into a giant archive.',
      href: '/start',
      label: 'Open start page'
    },
    {
      eyebrow: 'Go deep',
      title: 'Read a full review',
      description: 'Open the full review when one product already looks promising and you want the pros, cons, and reasons to skip it.',
      href: featuredReview ? getArticlePath(featuredReview.type, featuredReview.slug) : '/search?scope=review',
      label: 'Open a review'
    },
    {
      eyebrow: 'Compare',
      title: 'See your best options side by side',
      description: 'Use comparisons or shortlist once you already have two or three strong options.',
      href: featuredComparison ? getArticlePath(featuredComparison.type, featuredComparison.slug) : '/shortlist',
      label: 'Open comparisons'
    },
    {
      eyebrow: 'Wait for a better price',
      title: 'Track deals without the spam',
      description: 'Use deals and alerts when you are not ready to buy today but still want to catch a worthwhile price drop.',
      href: '/deals',
      label: 'See current deals'
    }
  ]
  const decisionPrinciples = [
    ['Fewer, better picks', 'Bes3 tries to narrow the field to a few strong options instead of overwhelming you with giant lists.'],
    ['Honest comparisons', 'Comparisons focus on products that make sense together, so the tradeoffs stay clear and useful.'],
    ['Pick up where you left off', 'If you wait for a deal, alerts and shortlist help you come back without starting your research over.']
  ]
  const structuredData = buildCollectionPageSchema({
    path: '/',
    title: 'Tech Reviews, Comparisons, and Deals',
    description: 'Bes3 helps you find the right tech faster with clear reviews, side-by-side comparisons, and verified deals.',
    image: featured[0]?.heroImageUrl,
    items: [
      {
        name: 'Start Here',
        path: '/start'
      },
      ...featured.map((article) => ({
        name: article.title,
        path: getArticlePath(article.type, article.slug)
      })),
      ...directoryCategories.map((category) => ({
        name: category.replace(/-/g, ' '),
        path: `/categories/${category}`
      })),
      ...featuredBrands.map((brand) => ({
        name: brand.name,
        path: `/brands/${brand.slug}`
      }))
    ]
  })
  const faqEntries = [
    {
      question: 'What is Bes3 actually optimized for?',
      answer: 'Bes3 is built to help you make a buying decision faster. It points you to the right next page instead of making you dig through endless lists.'
    },
    {
      question: 'When should I use a brand hub instead of a category hub?',
      answer: 'Use a brand page when you already trust a specific manufacturer. Use a category page when you still want to compare different brands fairly.'
    },
    {
      question: 'Why does Bes3 keep only a few routes on the homepage?',
      answer: 'Because most people do not need twenty choices just to get started. The homepage keeps the main paths simple so you can move quickly.'
    }
  ]

  return (
    <PublicShell>
      <StructuredData data={[structuredData, buildFaqSchema('/', faqEntries)]} />
      <section className="overflow-hidden px-4 pb-16 pt-8 sm:px-6 lg:px-8 lg:pb-24">
        <div className="mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="space-y-8">
            <div className="inline-flex items-center rounded-full bg-secondary px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.28em] text-secondary-foreground">
              Smarter Tech Shopping
            </div>
            <div className="space-y-6">
              <h1 className="max-w-4xl font-[var(--font-display)] text-5xl font-black tracking-tight text-balance text-foreground sm:text-7xl">
                Clear advice for your next <span className="text-primary">tech buy.</span>
              </h1>
              <p className="max-w-2xl text-lg leading-8 text-muted-foreground sm:text-xl">
                Bes3 helps you cut through noisy research with useful reviews, easy comparisons, and deal tracking that does not waste your time.
              </p>
            </div>
            <div className="flex flex-wrap gap-4">
              <Link
                href="/start"
                className="rounded-full bg-[linear-gradient(135deg,hsl(var(--primary)),#00855d)] px-8 py-4 text-base font-semibold text-primary-foreground shadow-lg shadow-emerald-950/10 transition-transform hover:-translate-y-0.5"
              >
                Start here
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
                See Live Deals
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
                  {featured[0]?.title || 'Straightforward reviews and smart picks.'}
                </h2>
                <p className="text-base leading-8 text-muted-foreground">
                  {featured[0]?.summary || 'Clear pros and cons, honest buying advice, and direct paths to products worth your attention.'}
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
                eyebrow="Where To Start"
                title="Pick the page that fits where you are."
                description="Some shoppers need ideas. Others need a review, a comparison, or a price alert. Start with the page that matches your situation."
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
              title="Browse by category when you know what you need."
              description="Each category page gathers the most useful reviews, comparisons, and buying tips in one place."
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
                  Reviews, comparisons, and buying notes organized for faster shopping.
                </p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {featuredBrands.length ? (
        <section className="px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="mb-12 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <SectionHeader
                eyebrow="Brands"
                title="Browse brands you already trust."
                description="Open a brand page when you already like a manufacturer and want the quickest path to products, reviews, and comparisons."
              />
              <Link href="/brands" className="inline-flex items-center gap-2 text-sm font-semibold text-primary transition-transform hover:translate-x-1">
                View all brands <span aria-hidden="true">→</span>
              </Link>
            </div>
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
              {featuredBrands.map((brand) => (
                <Link
                  key={brand.slug}
                  href={`/brands/${brand.slug}`}
                  className="rounded-[2rem] bg-white p-7 shadow-panel transition-transform hover:-translate-y-1"
                >
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">Brand Hub</p>
                  <h2 className="mt-3 font-[var(--font-display)] text-3xl font-black tracking-tight text-foreground">{brand.name}</h2>
                  <p className="mt-3 text-sm leading-7 text-muted-foreground">
                    {brand.description || `Browse ${brand.name} products and reviews without running a new site search.`}
                  </p>
                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-[1.25rem] bg-muted px-4 py-3">
                      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Products</p>
                      <p className="mt-2 text-xl font-black text-foreground">{brand.productCount}</p>
                    </div>
                    <div className="rounded-[1.25rem] bg-muted px-4 py-3">
                      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Editorial</p>
                      <p className="mt-2 text-xl font-black text-foreground">{brand.articleCount}</p>
                    </div>
                  </div>
                  <p className="mt-5 text-sm font-semibold text-primary">Open {brand.name} →</p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <section className="px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
        <div className="mx-auto max-w-7xl">
          <div className="mb-14 text-center">
            <p className="editorial-kicker">Currently Trending</p>
            <h2 className="mt-4 font-[var(--font-display)] text-4xl font-black tracking-tight text-foreground sm:text-5xl">
              The Current Best 3
            </h2>
            <div className="mx-auto mt-5 h-1.5 w-24 rounded-full bg-primary" />
            <p className="mx-auto mt-5 max-w-2xl text-sm leading-7 text-muted-foreground">
              These are the strongest pages to open right now: a useful review, a good comparison, or a product worth saving.
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
            <h2 className="font-[var(--font-display)] text-4xl font-black tracking-tight text-balance text-white">Get useful deal updates.</h2>
            <p className="max-w-xl text-base leading-8 text-slate-300">
              Get simple email updates on new reviews, worthwhile price drops, and the products worth checking next.
            </p>
          </div>
          <NewsletterSignup categoryOptions={categories.slice(0, 6)} source="homepage-alert-module" />
        </div>
      </section>

      <section className="px-4 pb-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <SeoFaqSection
            title="Homepage intent questions, answered clearly."
            entries={faqEntries}
            description="These quick answers explain what Bes3 does and where to go next without forcing you to decode the site structure."
          />
        </div>
      </section>
    </PublicShell>
  )
}
