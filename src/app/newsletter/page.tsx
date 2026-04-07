import type { Metadata } from 'next'
import { DecisionReasonPanel } from '@/components/site/DecisionReasonPanel'
import { PublicShell } from '@/components/layout/PublicShell'
import { NewsletterSignup } from '@/components/site/NewsletterSignup'
import { TimingDecisionPanel } from '@/components/site/TimingDecisionPanel'
import { getArticlePath } from '@/lib/article-path'
import { buildCategoryPath, categoryMatches } from '@/lib/category'
import { getCategoryLabel } from '@/lib/editorial'
import { buildPageMetadata, toTitleCaseWords } from '@/lib/metadata'
import { getRequestLocale } from '@/lib/request-locale'
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
        ? 'Category Updates'
        : 'Newsletter'

  const description =
    selectedIntent === 'price-alert'
      ? `Set Bes3 price alerts${selectedCategory ? ` for ${selectedCategoryLabel}` : ''} so a better deal can bring you back without making you start over.`
      : selectedIntent === 'category-brief'
        ? `Subscribe to Bes3 category updates${selectedCategory ? ` for ${selectedCategoryLabel}` : ''} so you can keep up with that category while you wait.`
        : 'Subscribe to Bes3 updates for deal alerts, category updates, and shopping advice tied to real products.'

  return buildPageMetadata({
    title,
    description,
    path: '/newsletter',
    locale: getRequestLocale(),
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
  const matchedCategory = categories.find((category) => categoryMatches(category, selectedCategory)) || selectedCategory
  const selectedCategoryLabel = getCategoryLabel(matchedCategory)
  const categoryCoverage = selectedCategory ? articles.filter((article) => categoryMatches(article.product?.category, selectedCategory)) : []
  const relatedComparison = categoryCoverage.find((article) => article.type === 'comparison') || null
  const relatedReview = categoryCoverage.find((article) => article.type === 'review') || null
  const relatedGuide = categoryCoverage.find((article) => article.type === 'guide') || null
  const alertGuideCards = [
    {
      label: 'Alert type',
      value:
        selectedIntent === 'price-alert'
          ? 'Price watch'
          : selectedIntent === 'category-brief'
            ? 'Category update'
            : 'Deal alerts',
      description:
        selectedIntent === 'price-alert'
          ? `Wait for worthwhile price movement${selectedCategory ? ` in ${selectedCategoryLabel}` : ''}, not every tiny dip.`
        : selectedIntent === 'category-brief'
            ? `Stay current on what changed in ${selectedCategory ? selectedCategoryLabel : 'the categories you follow'} without restarting your research.`
            : 'Get the best live deals Bes3 finds without turning your inbox into noise.'
    },
    {
      label: 'Timing',
      value: selectedCadence === 'priority' ? 'Right away' : 'Weekly',
      description:
        selectedCadence === 'priority'
          ? 'Best when price timing matters and you want an email as soon as it matters.'
          : 'Best when you are researching steadily and want one cleaner digest instead of frequent pings.'
    },
    {
      label: 'While you wait',
      value: selectedCategory ? selectedCategoryLabel : 'Keep your place',
      description: selectedCategory
        ? `Keep researching inside ${selectedCategoryLabel} so the alert supports the same category you are already considering.`
        : 'Keep shortlist, search, and deals aligned so you do not lose your place while waiting.'
    }
  ]
  const followUpRoutes = [
    selectedCategory
      ? {
          eyebrow: 'Return',
          title: `Browse ${selectedCategoryLabel}`,
          description: 'Keep the same category open while Bes3 monitors the market in the background.',
          href: buildCategoryPath(selectedCategory),
          label: 'Open category page'
        }
      : {
          eyebrow: 'Search',
          title: 'Keep narrowing candidates',
          description: 'Use product search when you still need Bes3 to turn the broad market into a tighter shortlist.',
          href: '/search?scope=products',
          label: 'Search products'
        },
    {
      eyebrow: 'Shortlist',
      title: 'Keep your top picks saved',
      description: 'Use shortlist to hold the best options together while price timing or category changes play out.',
      href: '/shortlist',
      label: 'Open shortlist'
    },
    relatedComparison
      ? {
          eyebrow: 'Compare',
          title: 'Open the lead comparison',
          description: 'Open the strongest comparison when you are down to two or three options.',
          href: getArticlePath(relatedComparison.type, relatedComparison.slug),
          label: 'Open comparison'
        }
      : relatedReview
        ? {
            eyebrow: 'Review',
            title: 'Read the lead review',
            description: 'Return to the clearest review when you still need more confidence before clicking through.',
            href: getArticlePath(relatedReview.type, relatedReview.slug),
            label: 'Open review'
          }
        : relatedGuide
          ? {
              eyebrow: 'Learn',
              title: 'Use the category guide',
              description: 'Use the guide to sharpen what matters before you buy.',
              href: getArticlePath(relatedGuide.type, relatedGuide.slug),
              label: 'Open guide'
            }
          : {
              eyebrow: 'Deals',
              title: 'Check live deals',
              description: 'Check deals only after the category already looks right.',
              href: '/deals',
              label: 'Open deals'
            }
  ]

  return (
    <PublicShell>
      <div className="mx-auto grid max-w-7xl gap-14 px-4 py-16 sm:px-6 lg:grid-cols-[0.95fr_1.05fr] lg:px-8">
        <div className="space-y-8">
          <p className="editorial-kicker">Email Updates</p>
          <h1 className="font-[var(--font-display)] text-5xl font-black tracking-tight text-foreground sm:text-7xl">
            Get useful updates, not marketing spam.
          </h1>
          <p className="max-w-2xl text-lg leading-8 text-muted-foreground">
            Bes3 updates are tailored to what you are actually considering buying: deal alerts, category updates, and price watches{selectedCategory ? ` for ${selectedCategory.replace(/-/g, ' ')}` : ''}.
          </p>
          <div className="rounded-[1.5rem] bg-white p-6 shadow-panel">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">Smart defaults</p>
            <p className="mt-3 text-sm leading-7 text-muted-foreground">
              Category and product pages can send you here with the right update already selected, so waiting for a better price or a category update never becomes a dead end.
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
          <TimingDecisionPanel
            eyebrow="Wait On Purpose"
            title="Subscribe only when waiting is the real blocker."
            description="Alerts should preserve your shopping progress. If fit is already clear, Bes3 helps you wait with context; if fit is still fuzzy, you should go back to shortlist, search, or compare instead."
            signalBadge={
              selectedIntent === 'price-alert'
                ? 'Price watch'
                : selectedIntent === 'category-brief'
                  ? 'Category update'
                  : 'Deal alerts'
            }
            signalTitle={
              selectedIntent === 'price-alert'
                ? 'Wait for a worthwhile move, not for every tiny dip.'
                : selectedIntent === 'category-brief'
                  ? 'Stay current on the category without restarting research.'
                  : 'Use alerts to catch the few deals worth acting on.'
            }
            signalDescription={
              selectedIntent === 'price-alert'
                ? `Bes3 will bring you back when ${selectedCategory ? `${selectedCategoryLabel} pricing` : 'pricing'} changes in a way that may justify action.`
                : selectedIntent === 'category-brief'
                  ? `Bes3 will keep ${selectedCategory ? selectedCategoryLabel : 'your category research'} warm while the market changes.`
                  : 'Bes3 uses deal alerts to reduce noise, not to create another reason to impulse buy.'
            }
            decisionText={
              selectedIntent === 'price-alert'
                ? 'This is the right move when the shortlist or product fit is already mostly settled and timing is the only thing still open.'
                : selectedIntent === 'category-brief'
                  ? 'This is the right move when you want to stay oriented in the category while the shortlist is still evolving.'
                  : 'This is the right move when you already know the product type you want and only need the strongest market signals.'
            }
            metrics={alertGuideCards.map((card) => ({
              label: card.label,
              value: card.value,
              note: card.description
            }))}
            actions={followUpRoutes.slice(0, 3).map((route, index) => ({
              href: route.href,
              label: route.label,
              variant: index === 0 ? 'primary' : 'secondary'
            }))}
          />
        </div>
        <DecisionReasonPanel
          eyebrow="Why alerts exist"
          title="A price watch should keep your progress alive, not send you into a separate funnel."
          description="This page is part of the same shopping task. Use it when timing is the blocker, not when the shortlist itself is still weak."
          cards={[
            {
              eyebrow: 'Use it when',
              title: 'Product fit is mostly settled',
              description: 'Alerts work best when you already know the category or finalists worth following.'
            },
            {
              eyebrow: 'What it should do',
              title: 'Bring you back with context',
              description: selectedCategory
                ? `When ${selectedCategoryLabel} changes in a useful way, Bes3 should bring you back to the same category context, not make you restart.`
                : 'Bes3 should bring you back to the same shortlist or category context, not just dump a generic deal into your inbox.',
              tone: 'muted'
            },
            {
              eyebrow: 'Skip it if',
              title: 'You still do not know what belongs on the shortlist',
              description: 'If the category still feels fuzzy, go back to assistant, search, or shortlist first. Alerts should follow a decision, not replace one.',
              tone: 'strong'
            }
          ]}
        />
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
