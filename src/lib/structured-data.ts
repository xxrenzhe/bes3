import { DEFAULT_SITE_NAME, DEFAULT_SITE_TAGLINE } from '@/lib/constants'
import { getCategoryLabel } from '@/lib/editorial'
import { pickMetadataDescription, sanitizeMetadataTitle } from '@/lib/metadata'
import { toAbsoluteUrl } from '@/lib/site-url'
import type { ArticleRecord, ProductRecord } from '@/lib/site-data'
import { slugify } from '@/lib/slug'

export type SchemaNode = Record<string, unknown>

export interface BreadcrumbItem {
  name: string
  path: string
}

export interface ItemListEntry {
  name: string
  path: string
}

export interface HowToStepEntry {
  name: string
  text: string
  path?: string
}

export interface FaqEntry {
  question: string
  answer: string
}

interface WebPageSchemaOptions {
  path: string
  title: string
  description: string
  type?: string
  image?: string | null
  mainEntity?: SchemaNode
  about?: SchemaNode | SchemaNode[]
  breadcrumbItems?: BreadcrumbItem[]
  datePublished?: string | null
  dateModified?: string | null
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
  about?: SchemaNode | SchemaNode[]
  breadcrumbItems?: BreadcrumbItem[]
  datePublished?: string | null
  dateModified?: string | null
}

interface SearchResultsSchemaOptions {
  path: string
  title: string
  description: string
  query: string
  items: ItemListEntry[]
}

interface DatasetSchemaOptions {
  path: string
  name: string
  description: string
  dateModified?: string | null
  keywords?: string[]
  variableMeasured?: string[]
}

interface DataCatalogEntry {
  name: string
  path: string
  description?: string
}

interface DataCatalogSchemaOptions {
  path: string
  name: string
  description: string
  entries: DataCatalogEntry[]
  dateModified?: string | null
}

interface DataFeedSchemaOptions {
  path: string
  name: string
  description: string
  dateModified?: string | null
  docsPath?: string
}

interface WebApiSchemaOptions {
  path: string
  name: string
  description: string
  documentationPath?: string
}

const SCHEMA_CONTEXT = 'https://schema.org'
const TRUST_PAGE_LINKS: ItemListEntry[] = [
  { name: 'About Bes3', path: '/about' },
  { name: 'Contact Bes3', path: '/contact' },
  { name: 'Privacy Policy', path: '/privacy' },
  { name: 'Terms of Service', path: '/terms' },
  { name: 'Open Data Coverage', path: '/data' },
  { name: 'HTML Sitemap', path: '/site-map' },
  { name: 'LLMs Manifest', path: '/llms.txt' },
  { name: 'Coverage Manifest API', path: '/api/open/coverage' },
  { name: 'Buying Feed API', path: '/api/open/buying-feed' }
]

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

function buildTrustPageReferences() {
  return TRUST_PAGE_LINKS.map((item) => ({
    '@type': item.path.startsWith('/api/open/')
      ? item.path.includes('buying-feed')
        ? 'DataFeed'
        : 'WebAPI'
      : 'WebPage',
    name: item.name,
    url: toAbsoluteUrl(item.path)
  }))
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
  about,
  breadcrumbItems,
  datePublished,
  dateModified
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
    breadcrumb: breadcrumbItems?.length
      ? {
          '@id': `${url}#breadcrumb`
        }
      : undefined,
    primaryImageOfPage: image
      ? {
          '@type': 'ImageObject',
          url: toAbsoluteUrl(image)
        }
      : undefined,
    inLanguage: 'en-US',
    publisher: buildOrganizationReference(),
    datePublished: datePublished || undefined,
    dateModified: dateModified || datePublished || undefined,
    about,
    mainEntity
  }
}

export function buildCollectionPageSchema({
  path,
  title,
  description,
  items,
  image,
  about,
  breadcrumbItems,
  datePublished,
  dateModified
}: CollectionPageSchemaOptions): SchemaNode {
  return buildWebPageSchema({
    path,
    title,
    description,
    type: 'CollectionPage',
    image,
    about,
    breadcrumbItems,
    datePublished,
    dateModified,
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

export function buildDatasetSchema({
  path,
  name,
  description,
  dateModified,
  keywords,
  variableMeasured
}: DatasetSchemaOptions): SchemaNode {
  const url = toAbsoluteUrl(path)

  return {
    '@context': SCHEMA_CONTEXT,
    '@type': 'Dataset',
    '@id': `${url}#dataset`,
    url,
    name,
    description,
    creator: buildOrganizationReference(),
    publisher: buildOrganizationReference(),
    isPartOf: buildWebsiteReference(),
    keywords,
    variableMeasured: variableMeasured?.map((item) => ({
      '@type': 'PropertyValue',
      name: item
    })),
    dateModified: dateModified || undefined
  }
}

export function buildDataCatalogSchema({
  path,
  name,
  description,
  entries,
  dateModified
}: DataCatalogSchemaOptions): SchemaNode {
  const url = toAbsoluteUrl(path)

  return {
    '@context': SCHEMA_CONTEXT,
    '@type': 'DataCatalog',
    '@id': `${url}#data-catalog`,
    url,
    name,
    description,
    creator: buildOrganizationReference(),
    publisher: buildOrganizationReference(),
    isPartOf: buildWebsiteReference(),
    dateModified: dateModified || undefined,
    dataset: entries.map((entry) => ({
      '@type': 'Dataset',
      '@id': `${toAbsoluteUrl(entry.path)}#dataset`,
      url: toAbsoluteUrl(entry.path),
      name: entry.name,
      description: entry.description || undefined,
      creator: buildOrganizationReference(),
      publisher: buildOrganizationReference(),
      isPartOf: {
        '@id': `${url}#data-catalog`
      }
    }))
  }
}

export function buildDataFeedSchema({
  path,
  name,
  description,
  dateModified,
  docsPath
}: DataFeedSchemaOptions): SchemaNode {
  const url = toAbsoluteUrl(path)

  return {
    '@context': SCHEMA_CONTEXT,
    '@type': 'DataFeed',
    '@id': `${url}#data-feed`,
    url,
    name,
    description,
    dateModified: dateModified || undefined,
    creator: buildOrganizationReference(),
    publisher: buildOrganizationReference(),
    isPartOf: buildWebsiteReference(),
    includedInDataCatalog: docsPath
      ? {
          '@id': `${toAbsoluteUrl(docsPath)}#data-catalog`
        }
      : undefined
  }
}

export function buildWebApiSchema({
  path,
  name,
  description,
  documentationPath
}: WebApiSchemaOptions): SchemaNode {
  const url = toAbsoluteUrl(path)

  return {
    '@context': SCHEMA_CONTEXT,
    '@type': 'WebAPI',
    '@id': `${url}#webapi`,
    url,
    name,
    description,
    provider: buildOrganizationReference(),
    documentation: documentationPath ? toAbsoluteUrl(documentationPath) : undefined,
    termsOfService: toAbsoluteUrl('/terms'),
    isPartOf: buildWebsiteReference(),
    audience: {
      '@type': 'Audience',
      audienceType: 'developers, automation, researchers, search systems'
    },
    potentialAction: {
      '@type': 'ConsumeAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: url,
        actionPlatform: [
          'https://schema.org/DesktopWebPlatform',
          'https://schema.org/MobileWebPlatform'
        ]
      }
    }
  }
}

export function buildTrustSignalsSchema(pagePath: string): SchemaNode {
  return {
    '@context': SCHEMA_CONTEXT,
    ...buildItemListSchema(pagePath, TRUST_PAGE_LINKS)
  }
}

export function buildOrganizationSchema(): SchemaNode {
  const publicContactEmail = process.env.NEXT_PUBLIC_CONTACT_EMAIL
  const publicContactPhone = process.env.NEXT_PUBLIC_CONTACT_PHONE

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
    description: 'Bes3 is a structured buyer decision system for tech and home-office products, built to turn noisy research into shortlists, verdicts, comparisons, and wait flows.',
    slogan: DEFAULT_SITE_TAGLINE,
    email: publicContactEmail || undefined,
    telephone: publicContactPhone || undefined,
    knowsAbout: ['product reviews', 'product comparisons', 'buying guides', 'buyer decision systems', 'price tracking', 'shortlist workflows', 'brand and category discovery'],
    areaServed: 'Worldwide',
    contactPoint: [
      {
        '@type': 'ContactPoint',
        contactType: 'customer support',
        email: publicContactEmail || undefined,
        telephone: publicContactPhone || undefined,
        url: toAbsoluteUrl('/contact'),
        availableLanguage: ['en'],
        areaServed: 'Worldwide'
      },
      {
        '@type': 'ContactPoint',
        contactType: 'editorial corrections',
        email: publicContactEmail || undefined,
        url: toAbsoluteUrl('/contact'),
        availableLanguage: ['en'],
        areaServed: 'Worldwide'
      },
      {
        '@type': 'ContactPoint',
        contactType: 'partnerships',
        email: publicContactEmail || undefined,
        url: toAbsoluteUrl('/contact'),
        availableLanguage: ['en'],
        areaServed: 'Worldwide'
      }
    ],
    hasPart: buildTrustPageReferences()
  }
}

export function buildWebsiteSchema(): SchemaNode {
  return {
    '@context': SCHEMA_CONTEXT,
    '@type': 'WebSite',
    '@id': `${toAbsoluteUrl('/')}#website`,
    url: toAbsoluteUrl('/'),
    name: DEFAULT_SITE_NAME,
    alternateName: DEFAULT_SITE_TAGLINE,
    description: 'Bes3 is a structured buyer decision system for tech and home-office products, built to turn noisy research into shortlists, verdicts, comparisons, and wait flows.',
    inLanguage: 'en-US',
    about: buildOrganizationReference(),
    publisher: buildOrganizationReference(),
    hasPart: buildTrustPageReferences(),
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

export function buildAboutPageSchema(path: string, title: string, description: string): SchemaNode {
  return buildWebPageSchema({
    path,
    title,
    description,
    type: 'AboutPage',
    about: buildOrganizationReference(),
    mainEntity: buildOrganizationReference(),
    breadcrumbItems: [
      { name: 'Home', path: '/' },
      { name: 'About', path }
    ]
  })
}

export function buildContactPageSchema(path: string, title: string, description: string): SchemaNode {
  return buildWebPageSchema({
    path,
    title,
    description,
    type: 'ContactPage',
    about: buildOrganizationReference(),
    mainEntity: buildOrganizationReference(),
    breadcrumbItems: [
      { name: 'Home', path: '/' },
      { name: 'Contact', path }
    ]
  })
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

export function buildHowToSchema(pagePath: string, name: string, description: string, steps: HowToStepEntry[]): SchemaNode | null {
  if (!steps.length) return null

  return {
    '@context': SCHEMA_CONTEXT,
    '@type': 'HowTo',
    '@id': `${toAbsoluteUrl(pagePath)}#how-to`,
    name,
    description,
    inLanguage: 'en-US',
    step: steps.map((step, index) => ({
      '@type': 'HowToStep',
      '@id': `${toAbsoluteUrl(pagePath)}#${slugify(step.name) || `step-${index + 1}`}`,
      position: index + 1,
      name: step.name,
      text: step.text,
      url: step.path ? toAbsoluteUrl(step.path) : undefined
    }))
  }
}

export function buildFaqSchema(pagePath: string, entries: FaqEntry[]): SchemaNode | null {
  if (!entries.length) return null

  return {
    '@context': SCHEMA_CONTEXT,
    '@type': 'FAQPage',
    '@id': `${toAbsoluteUrl(pagePath)}#faq`,
    mainEntity: entries.map((entry, index) => ({
      '@type': 'Question',
      '@id': `${toAbsoluteUrl(pagePath)}#faq-${index + 1}`,
      name: entry.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: entry.answer
      }
    }))
  }
}
