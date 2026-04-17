import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { SeoFaqSection } from '@/components/site/SeoFaqSection'
import { ResumeShoppingTaskPanel } from '@/components/site/ResumeShoppingTaskPanel'
import { StructuredData } from '@/components/site/StructuredData'
import { NewsletterSignup } from '@/components/site/NewsletterSignup'
import { PersonaPathwaySection } from '@/components/site/PersonaPathwaySection'
import { ShoppingStateRouter } from '@/components/site/ShoppingStateRouter'
import { SectionHeader } from '@/components/site/SectionHeader'
import { ShortlistActionBar } from '@/components/site/ShortlistActionBar'
import { PublicShell } from '@/components/layout/PublicShell'
import { getArticlePath } from '@/lib/article-path'
import { buildCategoryPath } from '@/lib/category'
import { buildPageMetadata } from '@/lib/metadata'
import { getRequestLocale } from '@/lib/request-locale'
import { buildCollectionPageSchema, buildFaqSchema } from '@/lib/structured-data'
import { toShortlistItem } from '@/lib/shortlist'
import { listBrands, listCategories, listPublishedArticles } from '@/lib/site-data'
import { formatPriceSnapshot } from '@/lib/utils'

export async function generateMetadata(): Promise<Metadata> {
  const articles = await listPublishedArticles()
  const freshnessDate = articles[0]?.updatedAt || articles[0]?.publishedAt || articles[0]?.createdAt || null

  return buildPageMetadata({
    title: 'Tech Buying Guide',
    description:
      'Bes3 is a tech buying guide that helps you narrow the field, compare finalists, and keep your place when timing is the blocker.',
    path: '/',
    locale: getRequestLocale(),
    image: articles[0]?.heroImageUrl,
    freshnessDate,
    freshnessInTitle: true,
    keywords: ['tech buying guide', 'product shortlist', 'product comparisons', 'price watch', 'best tech picks']
  })
}

export default async function HomePage() {
  const [articles, brands, categories] = await Promise.all([listPublishedArticles(), listBrands(), listCategories()])
  const featured = articles.slice(0, 3)
  const featuredBrands = brands.slice(0, 4)
  const directoryCategories = categories.slice(0, 3)
  const homeEntryStates = [
    {
      eyebrow: 'State 01',
      title: 'I do not know what to buy yet',
      description: 'Start here when the situation is clear but the product type or model still is not.',
      href: '/assistant',
      label: 'Help me narrow it down'
    },
    {
      eyebrow: 'State 02',
      title: 'I already have a few candidates',
      description: 'Use this when discovery is mostly done and the real job is to compare, validate, and choose.',
      href: '/shortlist',
      label: 'Compare my options'
    },
    {
      eyebrow: 'State 03',
      title: 'I would buy if the price improved',
      description: 'Use this when fit is mostly clear and timing is the only blocker left.',
      href: '/deals',
      label: 'Track price timing'
    }
  ]
  const shoppingStateRoutes = [
    {
      eyebrow: 'State 01',
      title: 'I need help narrowing the field',
      description: 'Use the assistant when the situation is clear but the model names are not. Bes3 will turn the use case into a tighter shortlist.',
      bestIf: 'You know the budget, use case, or deal-breakers, but not the exact product yet.',
      notIf: 'You already have real finalists and only need one last compare.',
      href: '/assistant',
      label: 'Open assistant'
    },
    {
      eyebrow: 'State 02',
      title: 'I already have a few serious options',
      description: 'Use shortlist and comparisons when the goal is no longer discovery. At that point, the job is to choose.',
      bestIf: 'You already have two or three good candidates and want the clearest tradeoffs.',
      notIf: 'You are still unsure what category or model type makes sense.',
      href: '/shortlist',
      label: 'Open shortlist'
    },
    {
      eyebrow: 'State 03',
      title: 'I would buy if the price improved',
      description: 'Use deals and a price watch when product fit is already mostly clear and timing is the only blocker left.',
      bestIf: 'You mostly know what to buy and just want a better moment to act.',
      notIf: 'You still need to understand the category or narrow the shortlist.',
      href: '/deals',
      label: 'See current deals'
    }
  ]
  const personaPathways = [
    {
      eyebrow: 'Persona A',
      title: 'I know the situation, not the model names.',
      summary: 'This is the buyer who knows the use case, budget, or blocker, but still does not know what belongs on the shortlist.',
      internalQuestion: 'Am I about to waste time reading reviews for products that do not even fit the job?',
      firstMove: 'Start with the assistant and turn the situation into a small set of serious options.',
      whyThisMove: 'Bes3 should remove early uncertainty first. The job is to narrow the field before you compare details.',
      href: '/assistant',
      label: 'Open the narrowing path',
      accentClassName: 'bg-amber-100 text-amber-900'
    },
    {
      eyebrow: 'Persona B',
      title: 'I already have a few candidates, but I am stuck.',
      summary: 'This buyer is not missing information. They are missing a clear tradeoff between two or three finalists.',
      internalQuestion: 'Which difference actually matters for my use case, and which one is just spec noise?',
      firstMove: 'Open shortlist or a comparison so the finalists can be judged side by side.',
      whyThisMove: 'Discovery is mostly done. The fastest progress now comes from clarifying tradeoffs instead of searching wider.',
      href: '/shortlist',
      label: 'Compare the finalists',
      accentClassName: 'bg-sky-100 text-sky-900'
    },
    {
      eyebrow: 'Persona C',
      title: 'I would buy, but the timing is not right yet.',
      summary: 'This buyer mostly trusts the product choice already. What they need is a better moment to act without losing context.',
      internalQuestion: 'If I wait a week, will I have to reconstruct this whole decision from scratch?',
      firstMove: 'Track deals or start a price watch so timing changes do not erase the work you already did.',
      whyThisMove: 'Waiting should stay inside the same shopping task. Bes3 should bring you back with context instead of forcing a restart.',
      href: '/deals',
      label: 'Track the timing',
      accentClassName: 'bg-emerald-100 text-emerald-900'
    }
  ]
  const decisionPrinciples = [
    ['Fewer, better picks', 'Bes3 tries to narrow the field to a few strong options instead of overwhelming you with giant lists.'],
    ['Honest comparisons', 'Comparisons focus on products that make sense together, so the tradeoffs stay clear and useful.'],
    ['Pick up where you left off', 'If you wait for a better moment, price watches and shortlist help you come back without restarting the research.']
  ]
  const structuredData = buildCollectionPageSchema({
    path: '/',
    title: 'Tech Buying Guide',
    description: 'Bes3 is a tech buying guide that helps you narrow the field, compare finalists, and keep your place when timing is the blocker.',
    image: featured[0]?.heroImageUrl,
    items: [
      {
        name: 'Assistant',
        path: '/assistant'
      },
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
        path: buildCategoryPath(category)
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
      answer: 'Bes3 is built to help you choose faster. It points you to the right next page instead of making you dig through endless lists.'
    },
    {
      question: 'When should I use a brand page instead of a category page?',
      answer: 'Use a brand page when you already trust a specific brand. Use a category page when you still want to compare different brands fairly.'
    },
    {
      question: 'Why does Bes3 keep only a few entry points on the homepage?',
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
              Narrow faster. Compare easier. Wait without restarting.
            </div>
            <div className="space-y-6">
              <h1 className="max-w-4xl font-[var(--font-display)] text-5xl font-black tracking-tight text-balance text-foreground sm:text-7xl">
                What step are you in <span className="text-primary">right now?</span>
              </h1>
              <p className="max-w-2xl text-lg leading-8 text-muted-foreground sm:text-xl">
                Bes3 works best when it matches your current shopping state. Pick the one that fits, and the next page will narrow faster, compare more clearly, or help you wait without losing your progress.
              </p>
            </div>
            <div className="rounded-[2rem] bg-white p-6 shadow-panel">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">Single low-cost start</p>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">
                You should not have to learn the site map before you can move. Choose the state that matches your situation, and Bes3 will route you into the right next step.
              </p>
            </div>
            <div className="flex flex-wrap gap-4">
              <Link
                href="/start"
                className="rounded-full bg-[linear-gradient(135deg,hsl(var(--primary)),#00855d)] px-8 py-4 text-base font-semibold text-primary-foreground shadow-lg shadow-emerald-950/10 transition-transform hover:-translate-y-0.5"
              >
                Choose your next step
              </Link>
              <Link
                href="/search"
                className="rounded-full border border-border/80 bg-white/70 px-8 py-4 text-base font-semibold text-foreground transition-colors hover:bg-white"
              >
                I already know the product name
              </Link>
            </div>
          </div>
          <div className="relative">
            <div className="absolute inset-0 translate-x-4 translate-y-4 rounded-[2.5rem] bg-primary/10" />
            <div className="editorial-shadow relative overflow-hidden rounded-[2.5rem] bg-white">
              <div className="relative bg-[linear-gradient(135deg,#dfe9fa,#eef4ff)] p-8 sm:p-10">
                <div className="bg-grid absolute inset-0 opacity-50" />
                <div className="relative space-y-5">
                  <div className="inline-flex items-center rounded-full bg-white/85 px-4 py-2 text-[10px] font-black uppercase tracking-[0.22em] text-primary">
                    Choose your shopping state
                  </div>
                  <h2 className="max-w-2xl font-[var(--font-display)] text-3xl font-black tracking-tight text-foreground sm:text-4xl">
                    Start with the question that matches your buying situation.
                  </h2>
                  <p className="max-w-2xl text-base leading-8 text-muted-foreground">
                    Bes3 is strongest when it removes one kind of uncertainty at a time: what belongs on the shortlist, which finalists deserve compare, or whether it is smarter to wait.
                  </p>
                </div>
              </div>
              <div className="grid gap-4 p-8">
                {homeEntryStates.map((state) => (
                  <Link
                    key={state.title}
                    href={state.href}
                    className="rounded-[1.75rem] border border-border/50 bg-white p-6 transition-transform hover:-translate-y-1"
                  >
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">{state.eyebrow}</p>
                    <h3 className="mt-3 font-[var(--font-display)] text-2xl font-black tracking-tight text-foreground">{state.title}</h3>
                    <p className="mt-3 text-sm leading-7 text-muted-foreground">{state.description}</p>
                    <p className="mt-5 text-sm font-semibold text-primary">{state.label} →</p>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 pb-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <ResumeShoppingTaskPanel />
        </div>
      </section>

      <section className="px-4 pb-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <PersonaPathwaySection
            eyebrow="Buyer Personas"
            title="Most shoppers arrive in one of these three decision states."
            description="PMFrame says personas should reflect buying behavior, not demographics. Bes3 now exposes those three states directly so the first click feels easier."
            personas={personaPathways}
          />
        </div>
      </section>

      <section className="px-4 pb-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl space-y-6">
          <ShoppingStateRouter
            eyebrow="Where To Start"
            title="Start from your shopping state, not from the site map."
            description="Most shoppers are in one of three states: they need help narrowing, they already have finalists, or they are waiting for a better price. Pick the state that matches your situation."
            routes={shoppingStateRoutes}
          />
          <div className="grid gap-4 sm:grid-cols-3">
            {decisionPrinciples.map(([title, description]) => (
              <div key={title} className="rounded-[1.5rem] bg-white p-5 shadow-[0_24px_60px_-40px_rgba(15,23,42,0.2)]">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">{title}</p>
                <p className="mt-3 text-sm leading-7 text-muted-foreground">{description}</p>
              </div>
            ))}
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
                href={buildCategoryPath(category)}
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
                description="Open a brand page when you already like a brand and want the quickest path to products, reviews, and comparisons."
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
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">Brand Page</p>
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
