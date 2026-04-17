import { SeoFaqSection } from '@/components/site/SeoFaqSection'
import type { FaqEntry } from '@/lib/structured-data'

export function buildOfferFaqEntries(input?: {
  scope?: string
  categoryLabel?: string
}): FaqEntry[] {
  const scope = input?.scope || 'offers'
  const categoryLabel = input?.categoryLabel || 'this category'

  return [
    {
      question: 'Why do some products show a percent off and others do not?',
      answer:
        'Bes3 only shows a percentage-off label when a reliable reference price exists and is still fresh. Otherwise the page falls back to timing language like live offer or near tracked low.'
    },
    {
      question: `How does Bes3 rank ${scope}?`,
      answer:
        'Bes3 ranks public offers by verified savings, tracked low distance, freshness, and evidence strength. Commission decides whether a product is eligible to appear, but it does not boost public ranking.'
    },
    {
      question: `Why does Bes3 limit ${categoryLabel === 'this category' ? 'the final recommendation layer' : `${categoryLabel} recommendations`} to three picks?`,
      answer:
        'Because the job of an offer page is to reduce final decision load. Bes3 keeps at most three same-category contenders in view, then explains why one winner currently deserves the lead.'
    }
  ]
}

export function OfferTransparencyFaqSection({
  title,
  entries
}: {
  title: string
  entries: FaqEntry[]
}) {
  return (
    <SeoFaqSection
      eyebrow="Offer FAQ"
      title={title}
      description="These questions explain how Bes3 decides what counts as a promotion, why some discounts look bigger than others, and how the final shortlist stays tight."
      entries={entries}
    />
  )
}
