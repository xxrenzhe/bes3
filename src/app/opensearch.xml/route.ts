import { createCacheableTextResponse, getLatestTimestamp } from '@/lib/http-cache'
import { listHardcoreProducts } from '@/lib/hardcore'
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
  const products = await listHardcoreProducts()

  const lastModified = getLatestTimestamp([
    ...products.map(() => new Date().toISOString())
  ])

  const body = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<OpenSearchDescription xmlns="http://a9.com/-/spec/opensearch/1.1/">',
    `<ShortName>${escapeXml('Bes3 Evidence')}</ShortName>`,
    `<Description>${escapeXml('Browse Bes3 teardown-backed product evidence reports.')}</Description>`,
    `<InputEncoding>${escapeXml('UTF-8')}</InputEncoding>`,
    `<OutputEncoding>${escapeXml('UTF-8')}</OutputEncoding>`,
    `<Language>${escapeXml('en-us')}</Language>`,
    `<Url type="${escapeXml('text/html')}" method="${escapeXml('get')}" template="${escapeXml(`${siteUrl}/products?q={searchTerms}`)}" />`,
    `<Image height="${escapeXml('64')}" width="${escapeXml('64')}" type="${escapeXml('image/svg+xml')}">${escapeXml(`${siteUrl}/icon.svg`)}</Image>`,
    `<Developer>${escapeXml('Bes3')}</Developer>`,
    `<Tags>${escapeXml('hardware teardowns evidence products consensus score')}</Tags>`,
    `<Attribution>${escapeXml('Evidence reports and price-value analysis by Bes3')}</Attribution>`,
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
