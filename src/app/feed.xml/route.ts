import { getFeedEntries, escapeXml } from '@/lib/feed'
import { createCacheableTextResponse, getLatestTimestamp } from '@/lib/http-cache'
import { listPublishedArticles } from '@/lib/site-data'
import { getSiteUrl } from '@/lib/site-url'

export async function GET(request: Request) {
  const siteUrl = getSiteUrl()
  const articles = await listPublishedArticles()
  const entries = getFeedEntries(articles, 30)
  const latestBuildDate = getLatestTimestamp(entries.map((entry) => entry.updatedAt))

  const body = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">',
    '<channel>',
    `<title>${escapeXml('Bes3 Editorial Feed')}</title>`,
    `<link>${escapeXml(siteUrl)}</link>`,
    `<description>${escapeXml('Latest Bes3 evidence updates and legacy editorial compatibility entries.')}</description>`,
    `<language>${escapeXml('en-US')}</language>`,
    `<lastBuildDate>${escapeXml(new Date(latestBuildDate).toUTCString())}</lastBuildDate>`,
    `<atom:link href="${escapeXml(`${siteUrl}/feed.xml`)}" rel="self" type="application/rss+xml" />`,
    ...entries.map((entry) =>
      [
        '<item>',
        `<title>${escapeXml(entry.title)}</title>`,
        `<link>${escapeXml(entry.url)}</link>`,
        `<guid isPermaLink="true">${escapeXml(entry.url)}</guid>`,
        `<description>${escapeXml(entry.summary)}</description>`,
        `<pubDate>${escapeXml(new Date(entry.updatedAt).toUTCString())}</pubDate>`,
        `<category>${escapeXml(entry.articleType)}</category>`,
        '</item>'
      ].join('')
    ),
    '</channel>',
    '</rss>'
  ].join('')

  return createCacheableTextResponse({
    request,
    body,
    contentType: 'application/rss+xml; charset=utf-8',
    lastModified: latestBuildDate
  })
}
