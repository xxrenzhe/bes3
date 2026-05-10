import type { Metadata } from 'next'
import Link from 'next/link'
import { PurchaseDecisionCard } from '@/components/commerce/PurchaseDecisionCard'
import { PublicShell } from '@/components/layout/PublicShell'
import { ComparisonSummaryMatrix } from '@/components/site/ComparisonSummaryMatrix'
import { StructuredData } from '@/components/site/StructuredData'
import { getHardcoreHome } from '@/lib/hardcore'
import { buildPageMetadata } from '@/lib/metadata'
import { buildEvidencePurchaseDecision } from '@/lib/purchase-decision'
import { getRequestLocale } from '@/lib/request-locale'
import { buildCollectionPageSchema, buildFaqSchema } from '@/lib/structured-data'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadata({
    title: 'Compare Best Picks',
    description: 'Bes3 comparison entry point with a current lead, flip conditions, and next steps for the leading finalists.',
    path: '/compare',
    locale: await getRequestLocale(),
    keywords: ['product comparison', 'compare best picks', 'current lead']
  })
}

export default async function ComparePage() {
  const home = await getHardcoreHome()
  const contenders = home.products.slice(0, 2)
  const [winner, challenger] = contenders
  const winnerDecision = winner
    ? buildEvidencePurchaseDecision(winner, {
        pageType: 'compare',
        trackingSource: 'compare-decision-card',
        categoryHref: `/categories/${winner.categorySlug}`,
        alternativeHref: challenger?.slug ? `/products/${challenger.slug}` : `/categories/${winner.categorySlug}`,
        hasAlternatives: Boolean(challenger),
        userIntent: 'current comparison lead'
      })
    : null
  const challengerDecision = challenger
    ? buildEvidencePurchaseDecision(challenger, {
        pageType: 'compare',
        trackingSource: 'compare-decision-card',
        categoryHref: `/categories/${challenger.categorySlug}`,
        alternativeHref: winner?.slug ? `/products/${winner.slug}` : `/categories/${challenger.categorySlug}`,
        hasAlternatives: Boolean(winner),
        userIntent: 'comparison alternative'
      })
    : null
  const faqEntries = [
    {
      question: 'Does the comparison lead always mean buy now?',
      answer: 'No. The lead can still ask you to compare first, watch price, or avoid buying if the link, price, or review proof is not ready.'
    },
    {
      question: 'When should the current lead flip?',
      answer: 'Flip the lead only when your non-negotiable need is price timing, ownership risk, category fit, or a specific scenario where the challenger has stronger review proof.'
    }
  ]

  return (
    <PublicShell>
      <StructuredData
        data={[
          buildCollectionPageSchema({
            path: '/compare',
            title: 'Compare Best Picks',
            description: 'Current comparison leads with clear next-step CTAs.',
            items: contenders.map((product) => ({
              name: product.name,
              path: `/products/${product.slug}`
            }))
          }),
          buildFaqSchema('/compare', faqEntries)
        ]}
      />
      <section className="border-b border-border bg-white px-4 py-14 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[1fr_0.78fr] lg:items-start">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.28em] text-primary">Compare First</p>
            <h1 className="mt-4 max-w-5xl font-[var(--font-display)] text-5xl font-black tracking-tight sm:text-7xl">
              Start with the current lead, then check if your situation flips it.
            </h1>
            <p className="mt-6 max-w-3xl text-lg leading-8 text-muted-foreground">
              Bes3 does not make you infer the strongest pick from a table. The leading pick is called out first, while each finalist keeps a plain next step: check current price, compare, set a price alert, or avoid.
            </p>
            {winner ? (
              <div className="mt-8 rounded-[1.75rem] border border-emerald-200 bg-emerald-50 p-5">
                <p className="text-xs font-bold uppercase tracking-[0.22em] text-emerald-900">Current lead</p>
                <h2 className="mt-3 font-[var(--font-display)] text-3xl font-black tracking-tight text-foreground">
                  {winner.brand ? `${winner.brand} ` : ''}{winner.name}
                </h2>
                <p className="mt-3 text-sm leading-7 text-emerald-950">
                  It leads the current public review ranking. Use the card beside it to decide whether that lead is ready to price-check or still needs comparison.
                </p>
              </div>
            ) : (
              <div className="mt-8 rounded-[1.75rem] border border-dashed border-border bg-slate-50 p-5 text-sm text-muted-foreground">
                Bes3 needs at least two review-backed products before this comparison entry can name a lead.
              </div>
            )}
          </div>
          {winnerDecision ? (
            <PurchaseDecisionCard decision={winnerDecision} />
          ) : (
            <div className="rounded-[1.75rem] border border-dashed border-border bg-slate-50 p-6 text-sm text-muted-foreground">
              Comparison check is waiting for enough review proof.
            </div>
          )}
        </div>
      </section>

      {winner && challenger ? (
        <section className="border-b border-border bg-slate-50 px-4 py-12 sm:px-6 lg:px-8">
          <div className="mx-auto grid max-w-7xl gap-5 lg:grid-cols-2">
            {winnerDecision ? <PurchaseDecisionCard decision={winnerDecision} className="h-full" /> : null}
            {challengerDecision ? <PurchaseDecisionCard decision={challengerDecision} className="h-full" /> : null}
          </div>
        </section>
      ) : null}

      {winner && challenger ? (
        <section className="px-4 py-14 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <ComparisonSummaryMatrix
              leftTitle={winner.name}
              rightTitle={challenger.name}
              winner={winner.name}
              rows={[
                {
                  label: 'Review strength',
                  left: `${winner.consensus.evidenceCount} review report${winner.consensus.evidenceCount === 1 ? '' : 's'} · ${winner.consensus.confidence} confidence`,
                  right: `${challenger.consensus.evidenceCount} review report${challenger.consensus.evidenceCount === 1 ? '' : 's'} · ${challenger.consensus.confidence} confidence`
                },
                {
                  label: 'Current price window',
                  left: winner.price.label,
                  right: challenger.price.label
                },
                {
                  label: 'Best next action',
                  left: winnerDecision?.primaryActionLabel || 'Review proof',
                  right: challengerDecision?.primaryActionLabel || 'Review proof'
                }
              ]}
              scenarios={[
                {
                  label: 'Lowest risk',
                  winner: winner.name,
                  reason: `${winner.name} leads when you want the strongest overall review proof before checkout.`,
                  note: 'If the lead is not ready to buy, follow the card next step instead of forcing a store click.'
                },
                {
                  label: 'Price timing',
                  winner: (challenger.price.valueScore || 0) > (winner.price.valueScore || 0) ? challenger.name : winner.name,
                  reason: 'The better value-score finalist can be the smarter move when both products are otherwise close.',
                  note: 'If the card says watch price, start with a price alert rather than a store link.'
                }
              ]}
            />
          </div>
        </section>
      ) : null}

      <section className="px-4 pb-16 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-5 md:grid-cols-3">
          <Link href="/categories" className="rounded-md border border-border bg-white p-6 hover:border-primary">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-primary">Best Picks</p>
            <h2 className="mt-3 text-xl font-black">Browse category leaders</h2>
            <p className="mt-3 text-sm leading-7 text-muted-foreground">Use category Top 3 pages when this comparison is not the pair you need.</p>
          </Link>
          <Link href="/deals" className="rounded-md border border-border bg-white p-6 hover:border-primary">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-primary">Deals</p>
            <h2 className="mt-3 text-xl font-black">Check price windows</h2>
            <p className="mt-3 text-sm leading-7 text-muted-foreground">Use deal pages when timing matters more than the current review lead.</p>
          </Link>
          <Link href="/shortlist" className="rounded-md border border-border bg-white p-6 hover:border-primary">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-primary">Shortlist</p>
            <h2 className="mt-3 text-xl font-black">Compare your own finalists</h2>
            <p className="mt-3 text-sm leading-7 text-muted-foreground">Load saved picks into a focused compare flow when the public pair is not enough.</p>
          </Link>
        </div>
      </section>
    </PublicShell>
  )
}
