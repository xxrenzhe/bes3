import { loadActivePrompt } from '@/lib/prompts'
import type { ProductRecord } from '@/lib/site-data'
import { extractJsonTextBlock, generateGeminiContent } from '@/lib/gemini'

type KeywordIdea = {
  keyword: string
  buyerIntent: number
  serpWeakness: number
  commissionPotential: number
  contentFit: number
  freshness: number
}

function interpolate(template: string, variables: Record<string, string>): string {
  return Object.entries(variables).reduce((acc, [key, value]) => {
    return acc.replaceAll(`{{${key}}}`, value)
  }, template)
}

async function generateTextWithGemini(prompt: string): Promise<string | null> {
  const result = await generateGeminiContent({ prompt })
  return result?.text || null
}

function parseJsonFromAiText<T>(text: string | null): T | null {
  if (!text) return null

  const candidates = [text, extractJsonTextBlock(text)].filter((item): item is string => Boolean(item))
  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate) as T
    } catch {
      // Try the next candidate.
    }
  }

  return null
}

export async function generateKeywordIdeas(product: ProductRecord): Promise<KeywordIdea[]> {
  const prompt = await loadActivePrompt('keyword_mining')
  const interpolatedPrompt = interpolate(prompt, {
    'product.productName': product.productName,
    'product.category': product.category || 'tech'
  })
  const aiResult = await generateGeminiContent(
    {
      prompt: interpolatedPrompt,
      temperature: 0.3,
      maxOutputTokens: 2048,
      responseMimeType: 'application/json',
      responseSchema: {
        type: 'ARRAY',
        items: {
          type: 'OBJECT',
          required: ['keyword', 'buyerIntent', 'serpWeakness', 'commissionPotential', 'contentFit', 'freshness'],
          properties: {
            keyword: { type: 'STRING' },
            buyerIntent: { type: 'NUMBER' },
            serpWeakness: { type: 'NUMBER' },
            commissionPotential: { type: 'NUMBER' },
            contentFit: { type: 'NUMBER' },
            freshness: { type: 'NUMBER' }
          }
        }
      }
    }
  )
  const parsedIdeas = parseJsonFromAiText<KeywordIdea[]>(aiResult?.text || null)

  if (parsedIdeas && Array.isArray(parsedIdeas) && parsedIdeas.length) {
    return parsedIdeas
      .filter((item) => item && typeof item.keyword === 'string')
      .slice(0, 12)
      .map((item) => ({
        keyword: item.keyword,
        buyerIntent: Number(item.buyerIntent) || 0,
        serpWeakness: Number(item.serpWeakness) || 0,
        commissionPotential: Number(item.commissionPotential) || 0,
        contentFit: Number(item.contentFit) || 0,
        freshness: Number(item.freshness) || 0
      }))
  }

  return [
    `${product.productName} review`,
    `best ${product.productName} alternative`,
    `${product.productName} vs competitors`,
    `${product.productName} worth it`,
    `${product.productName} price tracker`,
    `${product.productName} pros and cons`
  ].map((keyword, index) => ({
    keyword,
    buyerIntent: 8.5 - index * 0.3,
    serpWeakness: 7.8 - index * 0.2,
    commissionPotential: 8.2 - index * 0.1,
    contentFit: 8.8 - index * 0.1,
    freshness: 7.5 + index * 0.1
  }))
}

export async function generateReviewCopy(product: ProductRecord): Promise<{ markdown: string; html: string; summary: string }> {
  const prompt = await loadActivePrompt('review_generation')
  const aiText = await generateTextWithGemini(
    interpolate(prompt, {
      'product.productName': product.productName,
      'product.category': product.category || 'tech'
    })
  )

  const fallback = [
    `Bes3 tested ${product.productName} from a buyer's perspective.`,
    `The headline advantage is value density: you get more substance than the average product in this price band.`,
    `The main caveat is that this is not the best pick if your priority is extreme premium finish or niche performance tuning.`,
    `If you want a practical winner with real-world upside, this is a strong shortlist candidate.`
  ].join('\n\n')

  const markdown = aiText || fallback
  const html = markdown
    .split(/\n{2,}/)
    .map((paragraph) => `<p>${paragraph}</p>`)
    .join('')
  return {
    markdown,
    html,
    summary: `Independent review of ${product.productName}, including practical strengths, tradeoffs, and buyer fit.`
  }
}

export async function generateComparisonCopy(product: ProductRecord, alternatives: ProductRecord[]): Promise<{ markdown: string; html: string; summary: string }> {
  const prompt = await loadActivePrompt('comparison_generation')
  const aiText = await generateTextWithGemini(
    interpolate(prompt, {
      'product.productName': product.productName,
      alternatives: alternatives.map((item) => item.productName).join(', ')
    })
  )

  const alternativeNames = alternatives.map((item) => item.productName).join(', ') || 'two category alternatives'
  const markdown =
    aiText ||
    `${product.productName} sits in the middle of the current shortlist.\n\nCompared with ${alternativeNames}, it stands out on value and purchase confidence.\n\nIf your priority is balanced performance and lower risk, Bes3 would start here first.`
  const html = markdown
    .split(/\n{2,}/)
    .map((paragraph) => `<p>${paragraph}</p>`)
    .join('')

  return {
    markdown,
    html,
    summary: `Bes3 compares ${product.productName} against close alternatives so buyers can choose faster.`
  }
}

export async function generateSeoPayload(title: string, summary: string): Promise<{
  seoTitle: string
  seoDescription: string
  schemaJson: string
}> {
  const prompt = await loadActivePrompt('seo_enrichment')
  const interpolatedPrompt = interpolate(prompt, {
    'article.title': title,
    'article.summary': summary
  })
  const aiResult = await generateGeminiContent(
    {
      prompt: interpolatedPrompt,
      temperature: 0.2,
      maxOutputTokens: 2048,
      responseMimeType: 'application/json',
      responseSchema: {
        type: 'OBJECT',
        required: ['seoTitle', 'seoDescription', 'schemaJson'],
        properties: {
          seoTitle: { type: 'STRING' },
          seoDescription: { type: 'STRING' },
          schemaJson: { type: 'OBJECT' }
        }
      }
    }
  )
  const parsed = parseJsonFromAiText<{ seoTitle?: string; seoDescription?: string; schemaJson?: unknown }>(aiResult?.text || null)

  if (parsed) {
    return {
      seoTitle: parsed.seoTitle || title,
      seoDescription: parsed.seoDescription || summary,
      schemaJson: JSON.stringify(parsed.schemaJson || { '@type': 'FAQPage', mainEntity: [] })
    }
  }

  return {
    seoTitle: title,
    seoDescription: summary,
    schemaJson: JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: []
    })
  }
}
