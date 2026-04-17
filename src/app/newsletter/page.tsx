import type { Metadata } from 'next'
import { PublicShell } from '@/components/layout/PublicShell'
import { DecisionSummaryPanel } from '@/components/site/DecisionSummaryPanel'
import { NewsletterSignup } from '@/components/site/NewsletterSignup'
import { TimingDecisionPanel } from '@/components/site/TimingDecisionPanel'
import { getArticlePath } from '@/lib/article-path'
import { buildCategoryPath, categoryMatches } from '@/lib/category'
import { getCategoryLabel } from '@/lib/editorial'
import { buildPageMetadata, toTitleCaseWords } from '@/lib/metadata'
import { resolveResumeContext } from '@/lib/resume-context'
import { getRequestLocale } from '@/lib/request-locale'
import { listCategories, listPublishedArticles } from '@/lib/site-data'
import { slugify } from '@/lib/slug'

const VALID_INTENTS = new Set(['deals', 'price-alert', 'category-brief'] as const)
const VALID_CADENCE = new Set(['weekly', 'priority'] as const)

export async function generateMetadata({
  searchParams
}: {
  searchParams: Promise<{ intent?: string; category?: string; cadence?: string; returnTo?: string; returnLabel?: string; returnDescription?: string }>
}): Promise<Metadata> {
  const resolvedParams = await searchParams
  const selectedIntent = VALID_INTENTS.has((resolvedParams.intent || '') as 'deals')
    ? (resolvedParams.intent as 'deals' | 'price-alert' | 'category-brief')
    : 'deals'
  const selectedCategory = slugify(String(resolvedParams.category || ''))
  const selectedCategoryLabel = getCategoryLabel(selectedCategory)
  const hasPrefill = Boolean(resolvedParams.intent || resolvedParams.category || resolvedParams.cadence || resolvedParams.returnTo)
  const title = selectedCategory
    ? `Track ${toTitleCaseWords(selectedCategoryLabel)}`
    : selectedIntent === 'price-alert'
      ? 'Price Watch'
      : selectedIntent === 'category-brief'
        ? 'Category Updates'
        : 'Newsletter'

  const description =
    selectedIntent === 'price-alert'
      ? `Start Bes3 price-watch updates${selectedCategory ? ` for ${selectedCategoryLabel}` : ''} so a better deal can bring you back without making you start over.`
      : selectedIntent === 'category-brief'
        ? `Subscribe to Bes3 category updates${selectedCategory ? ` for ${selectedCategoryLabel}` : ''} so you can keep up with that category while you wait.`
        : 'Subscribe to Bes3 updates for price watches, category updates, and deal follow-up tied to real shopping tasks.'

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
  searchParams: Promise<{ intent?: string; category?: string; cadence?: string; returnTo?: string; returnLabel?: string; returnDescription?: string }>
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
  const resumeContext = resolveResumeContext({
    returnTo: resolvedParams.returnTo,
    returnLabel: resolvedParams.returnLabel,
    returnDescription: resolvedParams.returnDescription
  })
  const categoryCoverage = selectedCategory ? articles.filter((article) => categoryMatches(article.product?.category, selectedCategory)) : []
  const relatedComparison = categoryCoverage.find((article) => article.type === 'comparison') || null
  const relatedReview = categoryCoverage.find((article) => article.type === 'review') || null
  const relatedGuide = categoryCoverage.find((article) => article.type === 'guide') || null
  const alertGuideCards = [
    {
      label: 'Alert type',
      value:
        selectedIntent === 'price-alert'
          ? 'Price watch updates'
          : selectedIntent === 'category-brief'
            ? 'Category update'
            : 'Offer updates',
      description:
        selectedIntent === 'price-alert'
          ? `Wait for worthwhile price movement${selectedCategory ? ` in ${selectedCategoryLabel}` : ''}, not every tiny dip.`
        : selectedIntent === 'category-brief'
            ? `Stay current on what changed in ${selectedCategory ? selectedCategoryLabel : 'the categories you follow'} without restarting your research.`
            : 'Get the best live offers Bes3 finds without turning your inbox into noise.'
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
        : 'Keep shortlist, search, and offers aligned so you do not lose your place while waiting.'
    }
  ]
  const followUpRoutes = [
    resumeContext
      ? {
          eyebrow: 'Resume',
          title: resumeContext.label,
          description: resumeContext.description,
          href: resumeContext.href,
          label: resumeContext.label
        }
      : null,
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
              eyebrow: 'Offers',
              title: 'Check live offers',
              description: 'Check offers only after the category already looks right.',
              href: '/offers',
              label: 'Open offers'
            }
  ].filter((route): route is {
    eyebrow: string
    title: string
    description: string
    href: string
    label: string
  } => Boolean(route))
    .filter((route, index, list) => list.findIndex((candidate) => candidate.href === route.href) === index)
  const taskAnchorLabel = resumeContext
    ? resumeContext.label
    : selectedCategory
      ? `${selectedCategoryLabel} research`
      : 'your current shopping task'
  const heroTitle = resumeContext
    ? `Keep ${resumeContext.label.toLowerCase()} alive while you wait.`
    : selectedCategory
      ? `Keep your ${selectedCategoryLabel.toLowerCase()} task alive while you wait.`
      : 'Keep your shopping task alive while you wait.'
  const heroDescription = resumeContext
    ? `You are not joining a separate email funnel. You are preserving ${resumeContext.label.toLowerCase()} so Bes3 can bring you back when timing changes in a way that matters.`
    : selectedCategory
      ? `Use wait updates to preserve your ${selectedCategoryLabel} research, shortlist, and next step so waiting for a better moment does not erase the work you already did.`
      : 'Use wait updates to preserve your shortlist, category context, and next step so waiting for a better moment does not force you to restart from zero.'
  const alertExamples = [
    {
      label: 'Worth opening now',
      title: selectedCategory
        ? `${selectedCategoryLabel} pricing moved enough to justify another look`
        : 'A tracked price move is big enough to justify another look',
      description: 'This kind of update should tell you the market changed in a way that may change the decision, not just that a tiny discount exists.'
    },
    {
      label: 'Keep waiting',
      title: 'The price moved, but the timing still is not strong enough',
      description: 'A useful wait journey should also tell you when not to act yet, so updates reduce pressure instead of creating it.'
    },
    {
      label: 'Resume the task',
      title: `Return to ${taskAnchorLabel} with the same context still intact`,
      description: 'When you come back, Bes3 should reconnect you to the same shortlist, category, or comparison path instead of dropping you onto a generic landing page.'
    }
  ]

  return (
    <PublicShell>
      <div className="mx-auto grid max-w-7xl gap-14 px-4 py-16 sm:px-6 lg:grid-cols-[0.95fr_1.05fr] lg:px-8">
        <div className="space-y-8">
          <p className="editorial-kicker">Keep The Task Alive</p>
          <h1 className="font-[var(--font-display)] text-5xl font-black tracking-tight text-foreground sm:text-7xl">
            {heroTitle}
          </h1>
          <p className="max-w-2xl text-lg leading-8 text-muted-foreground">
            {heroDescription}
          </p>
          <div className="rounded-[1.5rem] bg-white p-6 shadow-panel">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">Current task</p>
            <p className="mt-3 text-sm leading-7 text-muted-foreground">
              {resumeContext
                ? `Bes3 already knows you came from ${resumeContext.label.toLowerCase()}. The wait flow should preserve that exact route and bring you back there when waiting stops being the right move.`
                : selectedCategory
                  ? `This wait flow is anchored to ${selectedCategoryLabel}, so the follow-up path stays tied to the same category instead of drifting into generic deal mail.`
                  : 'Pages across Bes3 can send you here with the right context selected, so waiting for a better time never becomes a dead end.'}
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
            description="Wait updates should preserve your shopping progress. If fit is already clear, Bes3 helps you wait with context; if fit is still fuzzy, you should go back to shortlist, search, or compare instead."
            signalBadge={
              selectedIntent === 'price-alert'
                ? 'Price watch'
                : selectedIntent === 'category-brief'
                  ? 'Category update'
                  : 'Offer updates'
            }
            signalTitle={
              selectedIntent === 'price-alert'
                ? 'Wait for a worthwhile move, not for every tiny dip.'
                : selectedIntent === 'category-brief'
                  ? 'Stay current on the category without restarting research.'
                  : 'Use offer updates to catch the few signals worth acting on.'
            }
            signalDescription={
              selectedIntent === 'price-alert'
                ? `Bes3 will bring you back when ${selectedCategory ? `${selectedCategoryLabel} pricing` : 'pricing'} changes in a way that may justify action.`
                : selectedIntent === 'category-brief'
                  ? `Bes3 will keep ${selectedCategory ? selectedCategoryLabel : 'your category research'} warm while the market changes.`
                  : 'Bes3 uses offer updates to reduce noise, not to create another reason to impulse buy.'
            }
            decisionText={
              resumeContext
                ? `This alert will preserve the current task and bring you back to ${resumeContext.label.toLowerCase()} when the market changes in a useful way.`
                : selectedIntent === 'price-alert'
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
          <section className="rounded-[2rem] bg-[linear-gradient(135deg,#fff8ef_0%,#f8fbff_48%,#eefaf5_100%)] p-6 shadow-panel sm:p-8">
            <div className="flex flex-col gap-3 border-b border-border/40 pb-5 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="editorial-kicker">Update Preview</p>
                <h2 className="mt-3 font-[var(--font-display)] text-3xl font-black tracking-tight text-foreground">
                  The update should tell you whether to act, not just that something changed.
                </h2>
              </div>
              <p className="max-w-2xl text-sm leading-7 text-muted-foreground">
                These examples show the standard this wait flow should meet: explain the signal, say what changed, and reconnect you to the same task.
              </p>
            </div>
            <div className="mt-6 grid gap-4 md:grid-cols-3">
              {alertExamples.map((example) => (
                <div key={example.label} className="rounded-[1.5rem] bg-white p-5 shadow-[0_24px_60px_-40px_rgba(15,23,42,0.35)]">
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">{example.label}</p>
                  <h3 className="mt-3 font-[var(--font-display)] text-2xl font-black tracking-tight text-foreground">{example.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-muted-foreground">{example.description}</p>
                </div>
              ))}
            </div>
          </section>
        </div>
        <DecisionSummaryPanel
          eyebrow="Decision Summary"
          title="A price watch should keep your progress alive, not send you into a separate email loop."
          description="A strong wait page should answer four things fast: who should use it, who should step back, why this page matters now, and what Bes3 wants you to do next."
          items={[
            {
              eyebrow: 'Who should use this',
              title: 'Buyers whose product fit is mostly settled',
              description: 'Price watches work best when you already know the category or finalists worth following.'
            },
            {
              eyebrow: 'Who should leave',
              title: 'Shoppers who still do not know what belongs on the shortlist',
              description: 'If the category still feels fuzzy, go back to assistant, search, or shortlist first. Wait updates should follow a decision, not replace one.',
              tone: 'muted'
            },
            {
              eyebrow: 'Why now',
              title: 'This page is the wait-with-context checkpoint',
              description: selectedCategory
                ? `Use it to preserve your ${selectedCategoryLabel} task so timing changes bring you back to the same category context instead of making you restart.`
                : 'Use it to preserve the same shortlist or category context so a future signal can reconnect you to the same task.'
            },
            {
              eyebrow: 'Next step',
              title: 'Save the wait flow, then resume the same task',
              description: 'The right move after signup is not wandering into generic browsing. It is returning to the shortlist, category, or comparison route that already had the strongest decision signal.',
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
