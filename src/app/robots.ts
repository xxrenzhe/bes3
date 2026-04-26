import type { MetadataRoute } from 'next'
import { getSiteUrl } from '@/lib/site-url'

export default function robots(): MetadataRoute.Robots {
  const siteUrl = getSiteUrl()
  return {
    rules: [
      {
        userAgent: ['GPTBot', 'ClaudeBot', 'Google-Extended', 'PerplexityBot'],
        allow: '/'
      },
      {
        userAgent: '*',
        allow: [
          '/',
          '/site-map',
          '/categories',
          '/products',
          '/deals',
          '/feed.xml',
          '/feed.json',
          '/opensearch.xml',
          '/.well-known/security.txt',
          '/directory',
          '/start',
          '/tools',
          '/about',
          '/trust',
          '/search',
          '/data',
          '/llms.txt',
          '/api/open/'
        ],
        disallow: ['/admin', '/api/admin', '/api/auth', '/api/internal', '/api/newsletter', '/api/decision-events', '/login', '/thank-you']
      }
    ],
    host: siteUrl,
    sitemap: [
      `${siteUrl}/sitemap.xml`,
      `${siteUrl}/products/sitemap.xml`,
      `${siteUrl}/editorial/sitemap.xml`,
      `${siteUrl}/taxonomy/sitemap.xml`,
      `${siteUrl}/trust/sitemap.xml`,
      `${siteUrl}/media-sitemap.xml`
    ]
  }
}
