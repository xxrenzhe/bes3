import { getArticlePath } from '@/lib/article-path'
import { buildBrandCategoryPath } from '@/lib/category'
import { escapeXml } from '@/lib/feed'
import { createCacheableTextResponse, getLatestTimestamp } from '@/lib/http-cache'
import { SUPPORTED_LOCALES, addLocaleToPath } from '@/lib/i18n'
import { maxDate } from '@/lib/sitemap-utils'
import { getSiteUrl } from '@/lib/site-url'
import { listBrandCategoryHubs, listBrands, listOpenCommerceProducts, listPublishedArticles } from '@/lib/site-data'

type ImageSitemapEntry = {
  loc: string
  image: string
  lastModified: string | null
  title: string
}

function toAbsoluteUrl(pathOrUrl: string, siteUrl: string) {
  return new URL(pathOrUrl, siteUrl).toString()
}

function toIsoTimestamp(values: Array<string | null | undefined>) {
  return maxDate(values)?.toISOString() || null
}

function buildLocalizedImageEntries(
  route: string,
  image: string | null | undefined,
  title: string,
  lastModified: string | null | undefined,
  siteUrl: string
): ImageSitemapEntry[] {
  if (!image) return []

  let absoluteImage: string
  try {
    absoluteImage = toAbsoluteUrl(image, siteUrl)
  } catch {
    return []
  }

  return SUPPORTED_LOCALES.map((locale) => ({
    loc: toAbsoluteUrl(addLocaleToPath(route, locale), siteUrl),
    image: absoluteImage,
    lastModified: lastModified || null,
    title
  }))
}

export async function GET(request: Request) {
  const siteUrl = getSiteUrl()
  const [products, articles, brands, brandCategoryHubs] = await Promise.all([
    listOpenCommerceProducts(),
    listPublishedArticles(),
    listBrands(),
    listBrandCategoryHubs()
  ])

  const entries = [
    ...products.flatMap((product) =>
      product.slug
        ? buildLocalizedImageEntries(
            `/products/${product.slug}`,
            product.heroImageUrl,
            product.productName,
            toIsoTimestamp([product.updatedAt, product.publishedAt]),
            siteUrl
          )
        : []
    ),
    ...articles.flatMap((article) =>
      buildLocalizedImageEntries(
        getArticlePath(article.type, article.slug),
        article.heroImageUrl || article.product?.heroImageUrl,
        article.title,
        toIsoTimestamp([article.updatedAt, article.publishedAt, article.createdAt]),
        siteUrl
      )
    ),
    ...brands.flatMap((brand) =>
      buildLocalizedImageEntries(`/brands/${brand.slug}`, brand.heroImageUrl, brand.name, toIsoTimestamp([brand.latestUpdate]), siteUrl)
    ),
    ...brandCategoryHubs.flatMap((hub) =>
      buildLocalizedImageEntries(
        buildBrandCategoryPath(hub.brandSlug, hub.category),
        hub.heroImageUrl,
        `${hub.brandName} ${hub.category.replace(/-/g, ' ')}`,
        toIsoTimestamp([hub.latestUpdate]),
        siteUrl
      )
    )
  ]

  const body = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">',
    ...entries.map((entry) =>
      [
        '<url>',
        `<loc>${escapeXml(entry.loc)}</loc>`,
        entry.lastModified ? `<lastmod>${escapeXml(entry.lastModified)}</lastmod>` : '',
        '<image:image>',
        `<image:loc>${escapeXml(entry.image)}</image:loc>`,
        `<image:title>${escapeXml(entry.title)}</image:title>`,
        '</image:image>',
        '</url>'
      ]
        .filter(Boolean)
        .join('')
    ),
    '</urlset>'
  ].join('')

  return createCacheableTextResponse({
    request,
    body,
    contentType: 'application/xml; charset=utf-8',
    lastModified: getLatestTimestamp(entries.map((entry) => entry.lastModified))
  })
}
