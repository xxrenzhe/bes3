import type { Metadata } from 'next'
import Link from 'next/link'
import { buildCategoryPath } from '@/lib/category'
import { DecisionSummaryPanel } from '@/components/site/DecisionSummaryPanel'
import { PublicShell } from '@/components/layout/PublicShell'
import { TimingDecisionPanel } from '@/components/site/TimingDecisionPanel'
import { getArticlePath } from '@/lib/article-path'
import { getCategoryLabel } from '@/lib/editorial'
import { buildPageMetadata } from '@/lib/metadata'
import { buildNewsletterPath } from '@/lib/newsletter-path'
import { resolveResumeContext } from '@/lib/resume-context'
import { getRequestLocale } from '@/lib/request-locale'
import { listCategories, listPublishedArticles } from '@/lib/site-data'

const VALID_INTENTS = new Set(['buyer-support', 'editorial-feedback', 'correction', 'partnership', 'general'] as const)

type ContactIntent = 'buyer-support' | 'editorial-feedback' | 'correction' | 'partnership' | 'general'

function normalizeIntent(value: string | undefined): ContactIntent {
  if (VALID_INTENTS.has((value || '') as ContactIntent)) {
    return value as ContactIntent
  }

  return 'general'
}

function buildThankYouMeta(intent: ContactIntent) {
  switch (intent) {
    case 'buyer-support':
      return {
        title: 'Buyer Support Request Received',
        description: 'Bes3 received your support request. While the team reviews it, you can keep shopping with search, shortlist, or a price watch.'
      }
    case 'editorial-feedback':
      return {
        title: 'Editorial Feedback Received',
        description: 'Thanks for helping improve Bes3. Your feedback is in review while the public site stays open.'
      }
    case 'correction':
      return {
        title: 'Correction Request Received',
        description: 'Bes3 received your correction request and will review the public page issue while you keep shopping from the most useful next page.'
      }
    case 'partnership':
      return {
        title: 'Partnership Inquiry Received',
        description: 'Your Bes3 partnership note is with the team. In the meantime, the live site remains the best way to understand how the product works.'
      }
    default:
      return {
        title: 'Thank You',
        description: 'Your message is with the Bes3 team, and the site can still help you move forward while it is being reviewed.'
      }
  }
}

export async function generateMetadata({
  searchParams
}: {
  searchParams: Promise<{ intent?: string; subject?: string; name?: string; returnTo?: string; returnLabel?: string; returnDescription?: string }>
}): Promise<Metadata> {
  const resolvedParams = await searchParams
  const intent = normalizeIntent(resolvedParams.intent)
  const meta = buildThankYouMeta(intent)

  return buildPageMetadata({
    title: meta.title,
    description: meta.description,
    path: '/thank-you',
    locale: getRequestLocale(),
    robots: {
      index: false,
      follow: false
    }
  })
}

export default async function ThankYouPage({
  searchParams
}: {
  searchParams: Promise<{ intent?: string; subject?: string; name?: string; returnTo?: string; returnLabel?: string; returnDescription?: string }>
}) {
  const resolvedParams = await searchParams
  const intent = normalizeIntent(resolvedParams.intent)
  const subject = String(resolvedParams.subject || '').trim().slice(0, 80)
  const firstName = String(resolvedParams.name || '').trim().split(/\s+/)[0] || ''
  const resumeContext = resolveResumeContext({
    returnTo: resolvedParams.returnTo,
    returnLabel: resolvedParams.returnLabel,
    returnDescription: resolvedParams.returnDescription
  })
  const articles = await listPublishedArticles()
  const categories = await listCategories()
  const leadReview = articles.find((article) => article.type === 'review') || null
  const leadComparison = articles.find((article) => article.type === 'comparison') || null
  const leadGuide = articles.find((article) => article.type === 'guide') || null
  const leadCategory = leadReview?.product?.category || leadComparison?.product?.category || categories[0] || ''
  const leadCategoryLabel = getCategoryLabel(leadCategory)
  const taskRecoveryTitle = resumeContext
    ? `Return to ${resumeContext.label.toLowerCase()}`
    : 'Return to your shortlist'
  const taskRecoveryDescription = resumeContext
    ? resumeContext.description
    : 'Reopen the shortlist so the same saved options stay together while the team reviews your note.'
  const taskRecoveryRoutes = [
    {
      eyebrow: 'Resume',
      title: taskRecoveryTitle,
      description: taskRecoveryDescription,
      href: resumeContext?.href || '/shortlist',
      label: resumeContext ? resumeContext.label : 'Open shortlist'
    },
    {
      eyebrow: 'Price move',
      title: 'Check today’s strongest price changes',
      description: 'Open the live deals view when the next useful question is whether today changed the timing enough to act.',
      href: '/deals',
      label: 'Open deals'
    },
    leadComparison
      ? {
          eyebrow: 'Compare',
          title: 'Continue comparing the finalists',
          description: 'Use the lead comparison when the real job is still choosing between two or three serious options.',
          href: getArticlePath(leadComparison.type, leadComparison.slug),
          label: 'Open comparison'
        }
      : {
          eyebrow: 'Compare',
          title: 'Keep the finalist set together',
          description: 'Use shortlist when the decision is already narrow enough that compare is the next meaningful move.',
          href: '/shortlist',
          label: 'Open shortlist'
        }
  ]
  const thankYouAlertHref = buildNewsletterPath({
    intent: leadCategory ? 'price-alert' : 'deals',
    category: leadCategory || '',
    cadence: 'priority',
    returnTo: resumeContext?.href || '/thank-you',
    returnLabel: resumeContext?.label || 'Resume current task',
    returnDescription: resumeContext?.description || 'Return to the same shopping task instead of dropping into generic updates.'
  })

  const intentMeta: Record<
    ContactIntent,
    {
      eyebrow: string
      title: string
      description: string
      bestRoute: string
      routes: Array<{
        title: string
        description: string
        href: string
        label: string
      }>
    }
  > = {
    'buyer-support': {
      eyebrow: 'Buyer Support',
      title: 'Your question is with the Bes3 team.',
      description:
        'A Bes3 reviewer will look at the issue you flagged. While that happens, the fastest answer is often still on the site: search, save your options, or start a price watch.',
      bestRoute:
        'Use search, shortlist, or category updates so you do not lose your place while we review your message.',
      routes: [
        resumeContext
          ? {
              title: resumeContext.label,
              description: resumeContext.description,
              href: resumeContext.href,
              label: 'Resume task'
            }
          : null,
        {
          title: 'Search products',
          description: 'Best when your use case is clear and you still need Bes3 to narrow the field.',
          href: '/search?scope=products',
          label: 'Open search'
        },
        {
          title: 'Keep options in shortlist',
          description: 'Best when you already have a few good options and just need to keep them together while you wait.',
          href: '/shortlist',
          label: 'Open shortlist'
        },
        {
          title: `Track ${leadCategoryLabel}`,
          description: 'Best when timing, not product fit, is the last blocker left.',
          href: thankYouAlertHref,
          label: leadCategory ? `Track ${leadCategoryLabel}` : 'Start a price watch'
        }
      ].filter(Boolean) as Array<{
        title: string
        description: string
        href: string
        label: string
      }>
    },
    'editorial-feedback': {
      eyebrow: 'Editorial Feedback',
      title: 'Thanks for helping sharpen the public site.',
      description:
        'Editorial feedback is most useful when it helps Bes3 become clearer and more useful. The team will review your note and use it to improve the site where needed.',
      bestRoute:
        'The clearest next move is to stay on a real page, so the feedback remains tied to an actual shopping moment.',
      routes: [
        resumeContext
          ? {
              title: resumeContext.label,
              description: resumeContext.description,
              href: resumeContext.href,
              label: 'Resume task'
            }
          : null,
        {
          title: 'Read a live review',
          description: 'Use a real review page to anchor what felt clear or unclear in the current writing style.',
          href: leadReview ? getArticlePath(leadReview.type, leadReview.slug) : '/search?scope=review',
          label: leadReview ? 'Open review' : 'Browse reviews'
        },
        {
          title: 'Open how Bes3 works',
          description: 'Return to the About page if your note is about structure, trust, or how the site is organized.',
          href: '/about',
          label: 'Open About'
        },
        {
          title: `Browse ${leadCategoryLabel}`,
          description: 'Stay close to the category where the page structure and buying cues can be judged in context.',
          href: buildCategoryPath(leadCategory),
          label: leadCategory ? 'Open category page' : 'Open directory'
        }
      ].filter(Boolean) as Array<{
        title: string
        description: string
        href: string
        label: string
      }>
    },
    correction: {
      eyebrow: 'Correction',
      title: 'Correction request received.',
      description:
        'Thanks for flagging a public-site issue. Bes3 treats accuracy corrections seriously because stale pricing or factual errors can damage trust quickly.',
      bestRoute:
        'If the issue was tied to one page or one category, keep that page open while the team reviews the correction so your context stays intact.',
      routes: [
        resumeContext
          ? {
              title: resumeContext.label,
              description: resumeContext.description,
              href: resumeContext.href,
              label: 'Resume task'
            }
          : null,
        {
          title: 'See how Bes3 checks recommendations',
          description: 'Use the About page to understand the rules Bes3 is trying to maintain on the public site.',
          href: '/about',
          label: 'Open About'
        },
        {
          title: 'Browse current category pages',
          description: 'Stay in the same category so you can re-check the latest pages once the fix lands.',
          href: buildCategoryPath(leadCategory),
          label: leadCategory ? 'Open category page' : 'Open directory'
        },
        {
          title: 'Return to shortlist',
          description: 'Keep saved candidates together while the public page is being reviewed.',
          href: '/shortlist',
          label: 'Open shortlist'
        }
      ].filter(Boolean) as Array<{
        title: string
        description: string
        href: string
        label: string
      }>
    },
    partnership: {
      eyebrow: 'Partnership',
      title: 'Your partnership note is with the Bes3 team.',
      description:
        'Partnership conversations are reviewed separately from buyer-support requests so they do not distort the public shopping experience or our rankings.',
      bestRoute:
        'If you are evaluating fit with Bes3, the best context comes from the live site rather than a generic media kit.',
      routes: [
        resumeContext
          ? {
              title: resumeContext.label,
              description: resumeContext.description,
              href: resumeContext.href,
              label: 'Resume task'
            }
          : null,
        {
          title: 'See how Bes3 works',
          description: 'Review the buyer-first model and the public-site rules that shape Bes3.',
          href: '/about',
          label: 'Open About'
        },
        {
          title: `Browse ${leadCategoryLabel}`,
          description: 'See a live category page instead of a static brand deck to understand how Bes3 serves real shoppers.',
          href: buildCategoryPath(leadCategory),
          label: leadCategory ? 'Open category page' : 'Open directory'
        },
        {
          title: 'Browse live deals',
          description: 'Browse real deals without the usual spam.',
          href: '/deals',
          label: 'Open deals'
        }
      ].filter(Boolean) as Array<{
        title: string
        description: string
        href: string
        label: string
      }>
    },
    general: {
      eyebrow: 'General',
      title: 'Thanks for reaching out to Bes3.',
      description:
        'Your note is with the team. While it is being reviewed, the public site can still help if the real question is about product fit, comparison, or timing.',
      bestRoute:
        'Use one concrete next step instead of reopening broad browsing. That keeps the question closer to a real buying action.',
      routes: [
        resumeContext
          ? {
              title: resumeContext.label,
              description: resumeContext.description,
              href: resumeContext.href,
              label: 'Resume task'
            }
          : null,
        {
          title: 'Search the site',
          description: 'Best when the question is really about a product or use case that needs narrowing.',
          href: '/search?scope=products',
          label: 'Open search'
        },
        {
          title: 'Read a lead guide',
          description: 'Best when you still need a broader guide before picking candidates or comparing top picks.',
          href: leadGuide ? getArticlePath(leadGuide.type, leadGuide.slug) : '/directory',
          label: leadGuide ? 'Open guide' : 'Open directory'
        },
        {
          title: 'Keep a shortlist alive',
          description: 'Best when the decision is already partly formed and just needs continuity rather than more noise.',
          href: '/shortlist',
          label: 'Open shortlist'
        }
      ].filter(Boolean) as Array<{
        title: string
        description: string
        href: string
        label: string
      }>
    }
  }

  const selectedMeta = intentMeta[intent]

  return (
    <PublicShell>
      <div className="mx-auto max-w-7xl space-y-14 px-4 py-16 sm:px-6 lg:px-8">
        <section className="rounded-[2.5rem] bg-white p-10 shadow-panel sm:p-14">
          <div className="mx-auto max-w-4xl text-center">
            <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-primary/10 text-5xl text-primary">✓</div>
            <p className="mt-6 text-[11px] font-semibold uppercase tracking-[0.24em] text-primary">{selectedMeta.eyebrow}</p>
            <h1 className="mt-4 font-[var(--font-display)] text-5xl font-black tracking-tight text-foreground">
              {firstName ? `${firstName}, ` : ''}
              {selectedMeta.title}
            </h1>
            <p className="mx-auto mt-4 max-w-3xl text-lg leading-8 text-muted-foreground">{selectedMeta.description}</p>
            <div className="mx-auto mt-6 max-w-3xl rounded-[1.75rem] bg-[linear-gradient(135deg,#fff8ef_0%,#f8fbff_48%,#eefaf5_100%)] p-5 text-left shadow-panel">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">Do not lose the task</p>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">
                The message is sent. The next useful move is to reopen the same shopping task, check whether price timing changed, or continue comparing the finalists instead of dropping back to generic browsing.
              </p>
            </div>
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              <span className="rounded-full bg-muted px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                {selectedMeta.eyebrow}
              </span>
              {subject ? (
                <span className="rounded-full bg-muted px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  {subject}
                </span>
              ) : null}
            </div>
          </div>
        </section>

        <section className="rounded-[2.5rem] bg-[linear-gradient(135deg,#fff8ef_0%,#f8fbff_48%,#eefaf5_100%)] p-8 shadow-panel sm:p-10">
          <div className="flex flex-col gap-4 border-b border-border/40 pb-6 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="editorial-kicker">Return To The Task</p>
              <h2 className="mt-3 font-[var(--font-display)] text-4xl font-black tracking-tight text-foreground">
                Pick back up where the decision actually was.
              </h2>
            </div>
            <p className="max-w-2xl text-sm leading-7 text-muted-foreground">
              A thank-you page should not become a side alley. Use one of these routes to go back to the same shortlist, the strongest live price moves, or the finalist comparison.
            </p>
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {taskRecoveryRoutes.map((route) => (
              <Link
                key={`${route.eyebrow}-${route.title}`}
                href={route.href}
                className="rounded-[1.75rem] bg-white p-6 shadow-[0_24px_60px_-40px_rgba(15,23,42,0.35)] transition-transform hover:-translate-y-1"
              >
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">{route.eyebrow}</p>
                <h3 className="mt-3 font-[var(--font-display)] text-2xl font-black tracking-tight text-foreground">{route.title}</h3>
                <p className="mt-3 text-sm leading-7 text-muted-foreground">{route.description}</p>
                <p className="mt-5 text-sm font-semibold text-primary">{route.label} →</p>
              </Link>
            ))}
          </div>
        </section>

        <TimingDecisionPanel
          eyebrow="Do Not Lose The Task"
          title="The message is sent. Your shopping task should still keep moving."
          description="A confirmation page should reconnect you to the same shortlist, comparison, or price-timing path while the team reviews your note."
          signalBadge={resumeContext ? 'Resume current task' : 'Keep shortlist warm'}
          signalTitle={
            resumeContext
              ? `Return to ${resumeContext.label.toLowerCase()} with the same context intact`
              : 'Reopen the most useful next step instead of broad browsing'
          }
          signalDescription={
            resumeContext
              ? `Bes3 already knows the route you came from. The cleanest next move is to reopen ${resumeContext.label.toLowerCase()} rather than treat this confirmation as the end of the shopping journey.`
              : 'If the team reply is not needed for the decision itself, keep moving through shortlist, compare, or price timing instead of restarting from the homepage.'
          }
          decisionLabel="Best Bes3 call"
          decisionText={
            resumeContext
              ? `Go back to ${resumeContext.label.toLowerCase()} first. If timing is the only blocker left after that, switch into deals or a price watch. If the finalists still need pressure-testing, continue compare from the same task.`
              : 'Use the strongest concrete next move now: reopen the shortlist, check whether price timing changed, or continue comparing finalists. Do not let the contact step turn into a dead end.'
          }
          metrics={[
            {
              label: 'Resume first',
              value: taskRecoveryRoutes[0]?.title || 'Current task',
              note: taskRecoveryRoutes[0]?.description || 'Return to the same decision path first.'
            },
            {
              label: 'Timing check',
              value: 'Live deals',
              note: 'Use today’s strongest price changes only after product fit is mostly settled.'
            },
            {
              label: 'Final choice',
              value: leadComparison ? 'Lead comparison' : 'Shortlist',
              note: 'Keep the finalist set tight while you finish the decision.'
            }
          ]}
          actions={taskRecoveryRoutes.map((route, index) => ({
            href: route.href,
            label: route.label,
            variant: index === 0 ? 'primary' : 'secondary'
          }))}
        />

        <section className="rounded-[2.5rem] bg-[linear-gradient(135deg,#fff8ef_0%,#f8fbff_48%,#eefaf5_100%)] p-8 shadow-panel sm:p-10">
          <div className="grid gap-8 xl:grid-cols-[1fr_0.95fr] xl:items-start">
            <div>
              <p className="editorial-kicker">While You Wait</p>
              <h2 className="mt-3 font-[var(--font-display)] text-4xl font-black tracking-tight text-foreground">Keep shopping progress moving.</h2>
              <p className="mt-4 max-w-3xl text-sm leading-8 text-muted-foreground">
                A contact confirmation should not trap you in a dead end. Bes3 uses this step to point you back to the page most likely to help while the team reviews your message.
              </p>
              <div className="mt-6 rounded-[1.75rem] bg-slate-950 p-5 text-white">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-200">Best next step</p>
                <p className="mt-3 text-sm leading-7 text-slate-200">{selectedMeta.bestRoute}</p>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              {selectedMeta.routes.map((route) => (
                <Link
                  key={route.title}
                  href={route.href}
                  className="rounded-[1.75rem] bg-white p-6 shadow-[0_24px_60px_-40px_rgba(15,23,42,0.35)] transition-transform hover:-translate-y-1"
                >
                  <h3 className="font-[var(--font-display)] text-2xl font-black tracking-tight text-foreground">{route.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-muted-foreground">{route.description}</p>
                  <p className="mt-5 text-sm font-semibold text-primary">{route.label} →</p>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <DecisionSummaryPanel
          eyebrow="Decision Summary"
          title="Sending a message should not end the buying journey."
          description="A strong confirmation page should answer four things fast: what task should resume now, who should keep the task alive, why the page exists, and what to avoid next."
          items={[
            {
              eyebrow: 'Use now',
              title: taskRecoveryRoutes[0]?.title || 'Pick one concrete next step',
              description: taskRecoveryRoutes[0]?.description || 'Choose the next page that gets you closer to a real decision.'
            },
            {
              eyebrow: 'Keep alive',
              title: 'Return to shortlist, compare, or price timing with context',
              description: 'If you are not buying this minute, the best outcome is to preserve the work already done and reconnect it to the same candidates or category instead of restarting later.',
              tone: 'muted'
            },
            {
              eyebrow: 'Why now',
              title: 'This page is the task-recovery checkpoint',
              description: 'The confirmation step exists to hand you back to the clearest next move while the team reviews your note, so the shopping task does not go cold.'
            },
            {
              eyebrow: 'Avoid',
              title: 'Do not go back to generic browsing',
              description: 'The goal after contact is not to wander the site again. It is to reopen the most useful task with less friction.',
              tone: 'strong'
            }
          ]}
        />

        <section className="grid gap-6 md:grid-cols-3">
          {articles.slice(0, 3).map((article) => (
            <Link key={article.id} href={getArticlePath(article.type, article.slug)} className="rounded-[2rem] bg-white p-7 shadow-panel transition-transform hover:-translate-y-1">
              <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-primary">{article.type}</p>
              <h2 className="mt-4 font-[var(--font-display)] text-2xl font-black tracking-tight text-foreground">{article.title}</h2>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">{article.summary}</p>
            </Link>
          ))}
        </section>

        <div className="flex flex-wrap gap-3">
          <Link href="/contact" className="rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground">
            Send another note
          </Link>
          <Link href="/" className="rounded-full border border-border px-6 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-muted">
            Return home
          </Link>
        </div>
      </div>
    </PublicShell>
  )
}
