import { createCacheableTextResponse, getLatestTimestamp } from '@/lib/http-cache'
import { listBrands, listOpenCommerceProducts, listPublishedArticles } from '@/lib/site-data'
import { getSiteUrl } from '@/lib/site-url'

function escapeXml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

export async function GET(request: Request) {
  const siteUrl = getSiteUrl()
  const [articles, brands, products] = await Promise.all([
    listPublishedArticles(),
    listBrands(),
    listOpenCommerceProducts()
  ])

  const lastModified = getLatestTimestamp([
    ...articles.map((article) => article.updatedAt || article.publishedAt || article.createdAt),
    ...products.map((product) => product.updatedAt || product.publishedAt),
    ...brands.map((brand) => brand.latestUpdate)
  ])

  const body = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<OpenSearchDescription xmlns="http://a9.com/-/spec/opensearch/1.1/">',
    `<ShortName>${escapeXml('Bes3 Search')}</ShortName>`,
    `<Description>${escapeXml('Search Bes3 products, reviews, comparisons, guides, and offers.')}</Description>`,
    `<InputEncoding>${escapeXml('UTF-8')}</InputEncoding>`,
    `<OutputEncoding>${escapeXml('UTF-8')}</OutputEncoding>`,
    `<Language>${escapeXml('en-us')}</Language>`,
    `<Url type="${escapeXml('text/html')}" method="${escapeXml('get')}" template="${escapeXml(`${siteUrl}/search?q={searchTerms}&scope=products`)}" />`,
    `<Image height="${escapeXml('64')}" width="${escapeXml('64')}" type="${escapeXml('image/svg+xml')}">${escapeXml(`${siteUrl}/icon.svg`)}</Image>`,
    `<Developer>${escapeXml('Bes3')}</Developer>`,
    `<Tags>${escapeXml('search reviews comparisons guides offers products')}</Tags>`,
    `<Attribution>${escapeXml('Search results and decision guidance by Bes3')}</Attribution>`,
    `<SyndicationRight>${escapeXml('open')}</SyndicationRight>`,
    '<AdultContent>false</AdultContent>',
    '</OpenSearchDescription>'
  ].join('')

  return createCacheableTextResponse({
    request,
    body,
    contentType: 'application/opensearchdescription+xml; charset=utf-8',
    lastModified
  })
}
