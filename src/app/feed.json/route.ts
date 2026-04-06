import { getFeedEntries } from '@/lib/feed'
import { listPublishedArticles } from '@/lib/site-data'
import { getSiteUrl } from '@/lib/site-url'

export async function GET() {
  const siteUrl = getSiteUrl()
  const articles = await listPublishedArticles()
  const entries = getFeedEntries(articles, 30)

  return Response.json(
    {
      version: 'https://jsonfeed.org/version/1.1',
      title: 'Bes3 Editorial Feed',
      home_page_url: siteUrl,
      feed_url: `${siteUrl}/feed.json`,
      description: 'Latest Bes3 reviews, comparisons, and guides for buyers who want structured updates.',
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
    },
    {
      headers: {
        'Content-Type': 'application/feed+json; charset=utf-8',
        'Cache-Control': 'public, s-maxage=900, stale-while-revalidate=3600'
      }
    }
  )
}
