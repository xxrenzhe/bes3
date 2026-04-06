import type { MetadataRoute } from 'next'
import { getSiteUrl } from '@/lib/site-url'

export default function robots(): MetadataRoute.Robots {
  const siteUrl = getSiteUrl()
  return {
    rules: [
      {
        userAgent: '*',
        allow: [
          '/',
          '/site-map',
          '/brands',
          '/categories',
          '/products',
          '/reviews',
          '/compare',
          '/guides',
          '/deals',
          '/directory',
          '/start',
          '/tools',
          '/about',
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
      `${siteUrl}/taxonomy/sitemap.xml`
    ]
  }
}
