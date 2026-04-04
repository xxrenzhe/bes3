import type { Metadata } from 'next'
import { PublicShell } from '@/components/layout/PublicShell'
import { NewsletterSignup } from '@/components/site/NewsletterSignup'
import { getArticlePath } from '@/lib/article-path'
import { getCategoryLabel } from '@/lib/editorial'
import { buildPageMetadata, toTitleCaseWords } from '@/lib/metadata'
import { listCategories, listPublishedArticles } from '@/lib/site-data'
import { slugify } from '@/lib/slug'

const VALID_INTENTS = new Set(['deals', 'price-alert', 'category-brief'] as const)
const VALID_CADENCE = new Set(['weekly', 'priority'] as const)

export async function generateMetadata({
  searchParams
}: {
  searchParams: Promise<{ intent?: string; category?: string; cadence?: string }>
}): Promise<Metadata> {
  const resolvedParams = await searchParams
  const selectedIntent = VALID_INTENTS.has((resolvedParams.intent || '') as 'deals')
    ? (resolvedParams.intent as 'deals' | 'price-alert' | 'category-brief')
    : 'deals'
  const selectedCategory = slugify(String(resolvedParams.category || ''))
  const selectedCategoryLabel = getCategoryLabel(selectedCategory)
  const hasPrefill = Boolean(resolvedParams.intent || resolvedParams.category || resolvedParams.cadence)
  const title = selectedCategory
    ? `Track ${toTitleCaseWords(selectedCategoryLabel)}`
    : selectedIntent === 'price-alert'
      ? 'Price Alerts'
      : selectedIntent === 'category-brief'
        ? 'Category Briefs'
        : 'Newsletter'

  const description =
    selectedIntent === 'price-alert'
      ? `Set Bes3 price alerts${selectedCategory ? ` for ${selectedCategoryLabel}` : ''} so a better deal can bring you back without restarting research.`
      : selectedIntent === 'category-brief'
        ? `Subscribe to Bes3 category briefs${selectedCategory ? ` for ${selectedCategoryLabel}` : ''} to keep one buying lane current while you wait.`
        : 'Subscribe to Bes3 updates for deal alerts, shortlist-friendly watch flows, and buyer guidance that stays tied to real product decisions.'

  return buildPageMetadata({
    title,
    description,
    path: '/newsletter',
    robots: {
      index: !hasPrefill,
      follow: true
    }
  })
}

export default async function NewsletterPage({
  searchParams
}: {
  searchParams: Promise<{ intent?: string; category?: string; cadence?: string }>
}) {
  const resolvedParams = await searchParams
  const [categories, articles] = await Promise.all([listCategories(), listPublishedArticles()])
  const selectedIntent = VALID_INTENTS.has((resolvedParams.intent || '') as 'deals')
    ? (resolvedParams.intent as 'deals' | 'price-alert' | 'category-brief')
    : 'deals'
  const selectedCadence = VALID_CADENCE.has((resolvedParams.cadence || '') as 'weekly')
    ? (resolvedParams.cadence as 'weekly' | 'priority')
    : 'weekly'
  const selectedCategory = slugify(String(resolvedParams.category || ''))
  const selectedCategoryLabel = getCategoryLabel(selectedCategory)
  const categoryCoverage = selectedCategory ? articles.filter((article) => article.product?.category === selectedCategory) : []
  const relatedComparison = categoryCoverage.find((article) => article.type === 'comparison') || null
  const relatedReview = categoryCoverage.find((article) => article.type === 'review') || null
  const relatedGuide = categoryCoverage.find((article) => article.type === 'guide') || null
  const alertGuideCards = [
    {
      label: 'Signal type',
      value:
        selectedIntent === 'price-alert'
          ? 'Price watch'
          : selectedIntent === 'category-brief'
            ? 'Category brief'
            : 'Deal alerts',
      description:
        selectedIntent === 'price-alert'
          ? `Wait for worthwhile price movement${selectedCategory ? ` in ${selectedCategoryLabel}` : ''}, not every tiny dip.`
          : selectedIntent === 'category-brief'
            ? `Stay current on what changed in ${selectedCategory ? selectedCategoryLabel : 'the categories you follow'} without restarting research.`
            : 'Get the strongest live promotions Bes3 can verify without turning the feed into noise.'
    },
    {
      label: 'Cadence',
      value: selectedCadence === 'priority' ? 'Priority' : 'Weekly',
      description:
        selectedCadence === 'priority'
          ? 'Best when timing matters and you want the signal as soon as it deserves action.'
          : 'Best when you are researching steadily and want one cleaner digest instead of frequent pings.'
    },
    {
      label: 'While you wait',
      value: selectedCategory ? selectedCategoryLabel : 'Stay in lane',
      description: selectedCategory
        ? `Keep researching inside ${selectedCategoryLabel} so the alert supports the same buying lane you are already in.`
        : 'Keep shortlist, search, and deals aligned so you do not lose your decision context while waiting.'
    }
  ]
  const followUpRoutes = [
    selectedCategory
      ? {
          eyebrow: 'Return',
          title: `Browse ${selectedCategoryLabel}`,
          description: 'Keep the same category lane open while Bes3 monitors the market in the background.',
          href: `/categories/${selectedCategory}`,
          label: 'Open category hub'
        }
      : {
          eyebrow: 'Search',
          title: 'Keep narrowing candidates',
          description: 'Use product search when you still need Bes3 to turn the broad market into a tighter shortlist.',
          href: '/search?scope=products',
          label: 'Search product lanes'
        },
    {
      eyebrow: 'Shortlist',
      title: 'Keep finalists saved',
      description: 'Use shortlist to hold the credible options together while price timing or category movement plays out.',
      href: '/shortlist',
      label: 'Open shortlist'
    },
    relatedComparison
      ? {
          eyebrow: 'Compare',
          title: 'Open the lead comparison',
          description: 'Use the strongest nearby comparison if your buying lane is already mature enough for a finalist decision.',
          href: getArticlePath(relatedComparison.type, relatedComparison.slug),
          label: 'Open comparison'
        }
      : relatedReview
        ? {
            eyebrow: 'Validate',
            title: 'Read the lead verdict',
            description: 'Return to the clearest review when you still need product-level confidence before clicking through.',
            href: getArticlePath(relatedReview.type, relatedReview.slug),
            label: 'Open review verdict'
          }
        : relatedGuide
          ? {
              eyebrow: 'Learn',
              title: 'Use the category guide',
              description: 'Stay inside one lane and use the guide only to sharpen what matters before you buy.',
              href: getArticlePath(relatedGuide.type, relatedGuide.slug),
              label: 'Open guide'
            }
          : {
              eyebrow: 'Deals',
              title: 'Check live deal coverage',
              description: 'Use current deal coverage only after the category fit is already credible enough to deserve price timing.',
              href: '/deals',
              label: 'Open deals board'
            }
  ]

  return (
    <PublicShell>
      <div className="mx-auto grid max-w-7xl gap-14 px-4 py-16 sm:px-6 lg:grid-cols-[0.95fr_1.05fr] lg:px-8">
        <div className="space-y-8">
          <p className="editorial-kicker">The Newsletter</p>
          <h1 className="font-[var(--font-display)] text-5xl font-black tracking-tight text-foreground sm:text-7xl">
            Get alerts shaped like a buying tool, not a generic newsletter.
          </h1>
          <p className="max-w-2xl text-lg leading-8 text-muted-foreground">
            Bes3 updates are preference-aware: deal alerts, category briefs, and watchlist signals that match what you are actually considering buying{selectedCategory ? ` in ${selectedCategory.replace(/-/g, ' ')}` : ''}.
          </p>
          <div className="rounded-[1.5rem] bg-white p-6 shadow-panel">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">Prefill-friendly flow</p>
            <p className="mt-3 text-sm leading-7 text-muted-foreground">
              Category and product pages can send buyers here with a preselected watch intent, so waiting on a better price or category shift becomes part of the decision flow instead of a dead end.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            {alertGuideCards.map((card) => (
              <div key={card.label} className="rounded-[1.5rem] bg-white p-6 shadow-panel">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">{card.label}</p>
                <h2 className="mt-3 font-[var(--font-display)] text-2xl font-black tracking-tight">{card.value}</h2>
                <p className="mt-3 text-sm leading-7 text-muted-foreground">{card.description}</p>
              </div>
            ))}
          </div>
          <div className="rounded-[1.75rem] bg-[linear-gradient(135deg,#fff8ef_0%,#f8fbff_48%,#eefaf5_100%)] p-6 shadow-panel">
            <p className="editorial-kicker">After You Subscribe</p>
            <h2 className="mt-3 font-[var(--font-display)] text-3xl font-black tracking-tight text-foreground">Waiting should still leave you with a next move.</h2>
            <p className="mt-3 text-sm leading-8 text-muted-foreground">
              Bes3 treats alerts as a pause inside the same decision lane, not as a detached marketing list. Subscribe, then keep browsing, comparing, or saving inside the same category context.
            </p>
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              {followUpRoutes.map((route) => (
                <div key={route.title} className="rounded-[1.25rem] bg-white/85 p-4 shadow-[0_20px_45px_-35px_rgba(15,23,42,0.45)]">
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">{route.eyebrow}</p>
                  <p className="mt-2 text-base font-semibold text-foreground">{route.title}</p>
                  <p className="mt-2 text-sm leading-7 text-muted-foreground">{route.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
        <NewsletterSignup
          categoryOptions={categories}
          source="newsletter-page"
          initialIntent={selectedIntent}
          initialCadence={selectedCadence}
          initialCategorySlug={selectedCategory}
          afterSignupRoutes={followUpRoutes}
        />
      </div>
    </PublicShell>
  )
}
