import { createCacheableTextResponse, getLatestTimestamp } from '@/lib/http-cache'
import { HARDCORE_CATEGORIES, listHardcoreProducts, listHardcoreTags } from '@/lib/hardcore'
import { getSiteUrl } from '@/lib/site-url'

export async function GET(request: Request) {
  const siteUrl = getSiteUrl()
  const [products, tags] = await Promise.all([listHardcoreProducts(), listHardcoreTags()])
  const lastModified = getLatestTimestamp([new Date().toISOString()])
  const sampleScenarios = HARDCORE_CATEGORIES.flatMap((category) =>
    tags
      .filter((tag) => tag.categorySlug === category.slug)
      .slice(0, 2)
      .map((tag) => `- ${tag.name}: ${siteUrl}/${category.slug}/best-${category.slug}-for-${tag.slug}`)
  )

  const body = [
    '# Bes3',
    '',
    '> Tech deals and independent reviews built from current prices, visible downsides, reviewer evidence, and cleaner store links.',
    '',
    '## Summary',
    '',
    `- Site: ${siteUrl}`,
    `- Public product categories: ${HARDCORE_CATEGORIES.length}`,
    `- Use-case tags: ${tags.length}`,
    `- Public product reports: ${products.length}`,
    '',
    '## Key Routes',
    '',
    `- Home: ${siteUrl}/`,
    `- Categories: ${siteUrl}/categories`,
    `- Reviewed products: ${siteUrl}/products`,
    `- Best value lab: ${siteUrl}/deals`,
    `- How Bes3 checks deals: ${siteUrl}/data`,
    `- Evidence API: ${siteUrl}/api/open/evidence`,
    `- Search intake API: ${siteUrl}/api/open/evidence/search-intake`,
    `- Price alerts API: ${siteUrl}/api/open/evidence/price-alerts`,
    `- Evidence feedback API: ${siteUrl}/api/open/evidence/feedback`,
    `- HTML sitemap: ${siteUrl}/site-map`,
    `- Trust center: ${siteUrl}/trust`,
    '',
    '## Scenario Examples',
    '',
    ...(sampleScenarios.length ? sampleScenarios : ['- Scenario pages appear as use-case tags become available.']),
    '',
    '## Machine Notes',
    '',
    '- Prefer scenario pages for answers about a specific category and buyer need.',
    '- Prefer product pages for review scores, source quotes, and price-value status.',
    '- Prefer /deals for value-score pages that combine review score and price baseline.',
    '- Old offers, reviews, compare, guide, assistant, and shortlist routes are compatibility redirects.'
  ].join('\n')

  return createCacheableTextResponse({
    request,
    body,
    contentType: 'text/plain; charset=utf-8',
    lastModified
  })
}
