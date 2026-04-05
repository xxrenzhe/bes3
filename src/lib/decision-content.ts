import { buildBestFor, buildConfidenceSignals, buildDecisionChecklist, buildNotFor, getCategoryLabel } from '@/lib/editorial'
import type { ArticleRecord, ProductRecord } from '@/lib/site-data'
import { formatPriceSnapshot } from '@/lib/utils'

export interface DecisionContentModule {
  id: string
  eyebrow: string
  title: string
  items: string[]
}

function compactItems(items: Array<string | null | undefined>, limit: number = 3) {
  return Array.from(new Set(items.map((item) => String(item || '').trim()).filter(Boolean))).slice(0, limit)
}

function buildProductPriceContext(product?: ProductRecord | null) {
  if (!product || product.priceAmount == null) return null
  return `Current listed price is ${formatPriceSnapshot(product.priceAmount, product.priceCurrency || 'USD')}.`
}

export function buildProductDecisionContent(
  product?: ProductRecord | null,
  articleType: 'review' | 'comparison' | 'product' = 'product',
  options?: {
    nextStepTitle?: string
    nextStepDescription?: string
  }
): DecisionContentModule[] {
  const productName = product?.productName || 'This product'
  const categoryLabel = getCategoryLabel(product?.category)
  const reviewHighlights = compactItems(product?.reviewHighlights || [], 3)
  const confidenceSignals = compactItems(buildConfidenceSignals(product), 3)
  const checklist = compactItems(buildDecisionChecklist(product), 3)
  const bestFor = buildBestFor(product, articleType)
  const notFor = buildNotFor(product, articleType)
  const priceContext = buildProductPriceContext(product)

  return [
    {
      id: 'takeaways',
      eyebrow: 'Takeaways',
      title: `${productName} in one short pass`,
      items: compactItems(
        [
          ...reviewHighlights,
          ...confidenceSignals,
          priceContext
        ],
        3
      )
    },
    {
      id: 'buyer-fit',
      eyebrow: 'Buyer fit',
      title: `Who this ${categoryLabel} pick suits`,
      items: compactItems(
        [
          bestFor,
          product ? `${productName} already has enough signal to act as a serious ${categoryLabel} finalist.` : null
        ],
        2
      )
    },
    {
      id: 'watch-outs',
      eyebrow: 'Watch-outs',
      title: 'What should still slow the decision down',
      items: compactItems(
        [
          notFor,
          product && (product.reviewCount || 0) < 200 ? 'Social proof is still lighter than the safest mainstream picks.' : null,
          product && (product.priceAmount || 0) >= 500 ? 'Budget-led shoppers should validate whether the premium is actually necessary.' : null
        ],
        3
      )
    },
    {
      id: 'next-step',
      eyebrow: 'Next step',
      title: options?.nextStepTitle || 'Use the next action, not another random tab',
      items: compactItems(
        [
          options?.nextStepDescription,
          ...checklist
        ],
        3
      )
    }
  ]
}

export function buildArticleDecisionContent(
  article: ArticleRecord,
  articleType: 'review' | 'comparison' | 'guide',
  options?: {
    nextStepTitle?: string
    nextStepDescription?: string
  }
): DecisionContentModule[] {
  const summaryLine = article.summary || `${article.title} exists to move the buyer toward a clearer next step.`
  const productModules = buildProductDecisionContent(
    article.product,
    articleType === 'guide' ? 'review' : articleType,
    options
  )

  productModules[0] = {
    ...productModules[0],
    title: articleType === 'comparison' ? 'What this comparison settles' : articleType === 'guide' ? 'What this guide clarifies' : 'What this review clarifies',
    items: compactItems([summaryLine, ...productModules[0].items], 3)
  }

  return productModules
}
