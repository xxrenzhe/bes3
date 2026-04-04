import { DEFAULT_SITE_NAME, DEFAULT_SITE_TAGLINE } from '@/lib/constants'
import { getCategoryLabel } from '@/lib/editorial'
import { pickMetadataDescription, sanitizeMetadataTitle } from '@/lib/metadata'
import type { ArticleRecord, ProductRecord } from '@/lib/site-data'

export type SchemaNode = Record<string, unknown>

export interface BreadcrumbItem {
  name: string
  path: string
}

export interface ItemListEntry {
  name: string
  path: string
}

interface WebPageSchemaOptions {
  path: string
  title: string
  description: string
  type?: string
  image?: string | null
  mainEntity?: SchemaNode
  about?: SchemaNode | SchemaNode[]
}

interface ArticleSchemaOptions {
  path: string
  title: string
  description: string
  image?: string | null
  datePublished?: string | null
  dateModified?: string | null
  type?: string
  about?: SchemaNode | SchemaNode[]
}

interface CollectionPageSchemaOptions {
  path: string
  title: string
  description: string
  items: ItemListEntry[]
  image?: string | null
}

interface SearchResultsSchemaOptions {
  path: string
  title: string
  description: string
  query: string
  items: ItemListEntry[]
}

const SCHEMA_CONTEXT = 'https://schema.org'

function getSiteUrl() {
  return process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
}

export function toAbsoluteUrl(path?: string | null) {
  if (!path) return getSiteUrl()
  if (/^https?:\/\//i.test(path)) return path

  return `${getSiteUrl()}${path.startsWith('/') ? path : `/${path}`}`
}

function buildOrganizationReference() {
  return {
    '@id': `${toAbsoluteUrl('/')}#organization`
  }
}

function buildWebsiteReference() {
  return {
    '@id': `${toAbsoluteUrl('/')}#website`
  }
}

export function buildItemListSchema(pagePath: string, items: ItemListEntry[]) {
  return {
    '@type': 'ItemList',
    '@id': `${toAbsoluteUrl(pagePath)}#item-list`,
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      url: toAbsoluteUrl(item.path)
    }))
  }
}

export function buildBreadcrumbSchema(pagePath: string, items: BreadcrumbItem[]): SchemaNode {
  return {
    '@context': SCHEMA_CONTEXT,
    '@type': 'BreadcrumbList',
    '@id': `${toAbsoluteUrl(pagePath)}#breadcrumb`,
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: toAbsoluteUrl(item.path)
    }))
  }
}

export function buildWebPageSchema({
  path,
  title,
  description,
  type = 'WebPage',
  image,
  mainEntity,
  about
}: WebPageSchemaOptions): SchemaNode {
  const url = toAbsoluteUrl(path)

  return {
    '@context': SCHEMA_CONTEXT,
    '@type': type,
    '@id': `${url}#webpage`,
    url,
    name: sanitizeMetadataTitle(title),
    description,
    image: image ? [toAbsoluteUrl(image)] : undefined,
    isPartOf: buildWebsiteReference(),
    about,
    mainEntity
  }
}

export function buildCollectionPageSchema({
  path,
  title,
  description,
  items,
  image
}: CollectionPageSchemaOptions): SchemaNode {
  return buildWebPageSchema({
    path,
    title,
    description,
    type: 'CollectionPage',
    image,
    mainEntity: items.length ? buildItemListSchema(path, items) : undefined
  })
}

export function buildSearchResultsPageSchema({
  path,
  title,
  description,
  query,
  items
}: SearchResultsSchemaOptions): SchemaNode {
  return buildWebPageSchema({
    path,
    title,
    description,
    type: 'SearchResultsPage',
    about: {
      '@type': 'Thing',
      name: query
    },
    mainEntity: items.length ? buildItemListSchema(path, items) : undefined
  })
}

export function buildArticleSchema({
  path,
  title,
  description,
  image,
  datePublished,
  dateModified,
  type = 'Article',
  about
}: ArticleSchemaOptions): SchemaNode {
  const url = toAbsoluteUrl(path)

  return {
    '@context': SCHEMA_CONTEXT,
    '@type': type,
    '@id': `${url}#article`,
    url,
    headline: sanitizeMetadataTitle(title),
    name: sanitizeMetadataTitle(title),
    description,
    image: image ? [toAbsoluteUrl(image)] : undefined,
    datePublished: datePublished || undefined,
    dateModified: dateModified || datePublished || undefined,
    mainEntityOfPage: {
      '@id': `${url}#webpage`
    },
    isPartOf: buildWebsiteReference(),
    author: buildOrganizationReference(),
    publisher: buildOrganizationReference(),
    about
  }
}

export function buildOrganizationSchema(): SchemaNode {
  return {
    '@context': SCHEMA_CONTEXT,
    '@type': 'Organization',
    '@id': `${toAbsoluteUrl('/')}#organization`,
    name: DEFAULT_SITE_NAME,
    url: toAbsoluteUrl('/'),
    logo: {
      '@type': 'ImageObject',
      url: toAbsoluteUrl('/icon.svg')
    },
    description: 'Bes3 helps shoppers compare real tech products, track pricing, and read high-signal buying guides.',
    slogan: DEFAULT_SITE_TAGLINE,
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'customer support',
      email: 'hello@bes3.local',
      url: toAbsoluteUrl('/contact')
    }
  }
}

export function buildWebsiteSchema(): SchemaNode {
  return {
    '@context': SCHEMA_CONTEXT,
    '@type': 'WebSite',
    '@id': `${toAbsoluteUrl('/')}#website`,
    url: toAbsoluteUrl('/'),
    name: DEFAULT_SITE_NAME,
    description: 'Bes3 helps shoppers compare real tech products, track pricing, and read high-signal buying guides.',
    publisher: buildOrganizationReference(),
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${toAbsoluteUrl('/search')}?q={search_term_string}&scope=products`
      },
      'query-input': 'required name=search_term_string'
    }
  }
}

function buildProductThing(product: ProductRecord, path: string, description?: string | null, image?: string | null): SchemaNode {
  const resolvedDescription =
    pickMetadataDescription(description, product.description) ||
    `${product.productName} on Bes3 includes shortlist context, product facts, and buyer-fit guidance before you click out to a merchant.`

  return {
    '@type': 'Product',
    '@id': `${toAbsoluteUrl(path)}#product`,
    url: toAbsoluteUrl(path),
    name: product.productName,
    description: resolvedDescription,
    image: image || product.heroImageUrl ? [toAbsoluteUrl(image || product.heroImageUrl)] : undefined,
    brand: product.brand
      ? {
          '@type': 'Brand',
          name: product.brand
        }
      : undefined,
    category: getCategoryLabel(product.category),
    aggregateRating:
      product.rating && product.reviewCount
        ? {
            '@type': 'AggregateRating',
            ratingValue: Number(product.rating).toFixed(1),
            reviewCount: product.reviewCount
          }
        : undefined,
    offers:
      product.priceAmount && product.priceAmount > 0
        ? {
            '@type': 'Offer',
            url: toAbsoluteUrl(product.resolvedUrl || path),
            price: Number(product.priceAmount).toFixed(2),
            priceCurrency: product.priceCurrency || 'USD'
          }
        : undefined
  }
}

export function buildProductSchema(product: ProductRecord, path: string, description?: string | null, image?: string | null): SchemaNode {
  return {
    '@context': SCHEMA_CONTEXT,
    ...buildProductThing(product, path, description, image)
  }
}

export function buildReviewSchema(article: ArticleRecord, path: string): SchemaNode {
  const product = article.product
  const description =
    pickMetadataDescription(article.seoDescription, article.summary, product?.description) ||
    `${article.title} on Bes3 helps buyers validate fit before they compare finalists or click out to a merchant.`

  return {
    '@context': SCHEMA_CONTEXT,
    '@type': 'Review',
    '@id': `${toAbsoluteUrl(path)}#review`,
    url: toAbsoluteUrl(path),
    name: sanitizeMetadataTitle(article.seoTitle || article.title),
    headline: sanitizeMetadataTitle(article.seoTitle || article.title),
    description,
    reviewBody: article.summary || description,
    datePublished: article.publishedAt || article.createdAt || undefined,
    dateModified: article.updatedAt || article.publishedAt || article.createdAt || undefined,
    author: buildOrganizationReference(),
    publisher: buildOrganizationReference(),
    itemReviewed: product
      ? buildProductThing(product, product.slug ? `/products/${product.slug}` : path, description, article.heroImageUrl || product.heroImageUrl)
      : {
          '@type': 'Thing',
          name: article.title
        },
    mainEntityOfPage: {
      '@id': `${toAbsoluteUrl(path)}#webpage`
    }
  }
}
