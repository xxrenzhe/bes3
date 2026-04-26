import { getFeedEntries } from '@/lib/feed'
import { createCacheableTextResponse, getLatestTimestamp } from '@/lib/http-cache'
import { listPublishedArticles } from '@/lib/site-data'
import { getSiteUrl } from '@/lib/site-url'

export async function GET(request: Request) {
  const siteUrl = getSiteUrl()
  const articles = await listPublishedArticles()
  const entries = getFeedEntries(articles, 30)
  const lastModified = getLatestTimestamp(entries.map((entry) => entry.updatedAt))
  const body = JSON.stringify({
    version: 'https://jsonfeed.org/version/1.1',
    title: 'Bes3 Editorial Feed',
    home_page_url: siteUrl,
    feed_url: `${siteUrl}/feed.json`,
    description: 'Latest Bes3 evidence updates and legacy editorial compatibility entries.',
    language: 'en-US',
    items: entries.map((entry) => ({
      id: entry.id,
      url: entry.url,
      title: entry.title,
      summary: entry.summary,
      content_text: entry.summary,
      date_published: entry.publishedAt,
      date_modified: entry.updatedAt,
      image: entry.image,
      tags: [entry.articleType]
    }))
  })

  return createCacheableTextResponse({
    request,
    body,
    contentType: 'application/feed+json; charset=utf-8',
    lastModified
  })
}
