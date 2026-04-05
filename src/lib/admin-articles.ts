import { getDatabase } from '@/lib/db'
import { slugify } from '@/lib/slug'
import { getArticlePath } from '@/lib/article-path'

export interface AdminArticleListItem {
  id: number
  product_id: number | null
  article_type: string
  title: string
  slug: string
  status: 'draft' | 'published'
  summary: string | null
  keyword: string | null
  hero_image_url: string | null
  seo_title: string | null
  seo_description: string | null
  product_name: string | null
  product_brand: string | null
  product_category: string | null
  published_at: string | null
  updated_at: string
}

export interface AdminArticleSeoPage {
  id: number
  page_type: string
  pathname: string
  title: string
  meta_description: string
  canonical_url: string | null
  status: string
  published_at: string | null
  updated_at: string
}

export interface AdminArticleDetail extends AdminArticleListItem {
  content_md: string
  content_html: string
  schema_json: string | null
  seo_pages: AdminArticleSeoPage[]
}

export interface UpdateAdminArticleInput {
  title: string
  slug: string
  summary?: string | null
  keyword?: string | null
  heroImageUrl?: string | null
  contentMd: string
  contentHtml: string
  seoTitle?: string | null
  seoDescription?: string | null
  schemaJson?: string | null
  status: 'draft' | 'published'
}

export class AdminArticleValidationError extends Error {
  statusCode: number

  constructor(message: string, statusCode = 400) {
    super(message)
    this.name = 'AdminArticleValidationError'
    this.statusCode = statusCode
  }
}

function normalizeOptionalText(value?: string | null): string | null {
  const normalized = value?.trim()
  return normalized ? normalized : null
}

function normalizeRequiredText(value: string, label: string): string {
  const normalized = value.trim()
  if (!normalized) {
    throw new AdminArticleValidationError(`${label} is required`)
  }
  return normalized
}

function normalizeSchemaJson(value?: string | null): string | null {
  const normalized = value?.trim()
  if (!normalized) return null
  try {
    JSON.parse(normalized)
  } catch {
    throw new AdminArticleValidationError('Schema JSON is invalid')
  }
  return normalized
}

export async function listAdminArticles(): Promise<AdminArticleListItem[]> {
  const db = await getDatabase()
  return db.query<AdminArticleListItem>(
    `
      SELECT a.id, a.product_id, a.article_type, a.title, a.slug, a.status, a.summary, a.keyword,
        a.hero_image_url, a.seo_title, a.seo_description, a.published_at, a.updated_at,
        p.product_name, p.brand AS product_brand, p.category AS product_category
      FROM articles a
      LEFT JOIN products p ON p.id = a.product_id
      ORDER BY a.updated_at DESC, a.id DESC
    `
  )
}

export async function getAdminArticle(articleId: number): Promise<AdminArticleDetail | null> {
  const db = await getDatabase()
  const article = await db.queryOne<Omit<AdminArticleDetail, 'seo_pages'>>(
    `
      SELECT a.id, a.product_id, a.article_type, a.title, a.slug, a.status, a.summary, a.keyword,
        a.hero_image_url, a.content_md, a.content_html, a.seo_title, a.seo_description, a.schema_json,
        a.published_at, a.updated_at, p.product_name, p.brand AS product_brand, p.category AS product_category
      FROM articles a
      LEFT JOIN products p ON p.id = a.product_id
      WHERE a.id = ?
      LIMIT 1
    `,
    [articleId]
  )

  if (!article) return null

  const seoPages = await db.query<AdminArticleSeoPage>(
    `
      SELECT id, page_type, pathname, title, meta_description, canonical_url, status, published_at, updated_at
      FROM seo_pages
      WHERE article_id = ?
      ORDER BY updated_at DESC, id DESC
    `,
    [articleId]
  )

  return {
    ...article,
    seo_pages: seoPages
  }
}

export async function updateAdminArticle(articleId: number, input: UpdateAdminArticleInput): Promise<AdminArticleDetail> {
  const db = await getDatabase()
  const existing = await db.queryOne<{ id: number; article_type: string; published_at: string | null }>(
    `
      SELECT id, article_type, published_at
      FROM articles
      WHERE id = ?
      LIMIT 1
    `,
    [articleId]
  )

  if (!existing) {
    throw new AdminArticleValidationError('Article not found', 404)
  }

  const title = normalizeRequiredText(input.title, 'Title')
  const slug = slugify(input.slug || title)
  if (!slug) {
    throw new AdminArticleValidationError('Slug is required')
  }

  const contentMd = normalizeRequiredText(input.contentMd, 'Markdown content')
  const contentHtml = normalizeRequiredText(input.contentHtml, 'HTML content')
  const summary = normalizeOptionalText(input.summary)
  const keyword = normalizeOptionalText(input.keyword)
  const heroImageUrl = normalizeOptionalText(input.heroImageUrl)
  const seoTitle = normalizeOptionalText(input.seoTitle)
  const seoDescription = normalizeOptionalText(input.seoDescription)
  const schemaJson = normalizeSchemaJson(input.schemaJson)
  const pathname = getArticlePath(existing.article_type, slug)
  const status = input.status === 'draft' ? 'draft' : 'published'

  const duplicateSlug = await db.queryOne<{ id: number }>(
    'SELECT id FROM articles WHERE slug = ? AND id <> ? LIMIT 1',
    [slug, articleId]
  )
  if (duplicateSlug?.id) {
    throw new AdminArticleValidationError('Slug already exists', 409)
  }

  const conflictingSeoPage = await db.queryOne<{ id: number }>(
    'SELECT id FROM seo_pages WHERE pathname = ? AND article_id <> ? LIMIT 1',
    [pathname, articleId]
  )
  if (conflictingSeoPage?.id) {
    throw new AdminArticleValidationError('SEO pathname already exists', 409)
  }

  if (status === 'published') {
    await db.exec(
      `
        UPDATE articles
        SET title = ?, slug = ?, summary = ?, keyword = ?, hero_image_url = ?, content_md = ?, content_html = ?,
            seo_title = ?, seo_description = ?, schema_json = ?, status = 'published',
            published_at = COALESCE(published_at, CURRENT_TIMESTAMP), updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
      [
        title,
        slug,
        summary,
        keyword,
        heroImageUrl,
        contentMd,
        contentHtml,
        seoTitle,
        seoDescription,
        schemaJson,
        articleId
      ]
    )
  } else {
    await db.exec(
      `
        UPDATE articles
        SET title = ?, slug = ?, summary = ?, keyword = ?, hero_image_url = ?, content_md = ?, content_html = ?,
            seo_title = ?, seo_description = ?, schema_json = ?, status = 'draft', published_at = NULL,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
      [
        title,
        slug,
        summary,
        keyword,
        heroImageUrl,
        contentMd,
        contentHtml,
        seoTitle,
        seoDescription,
        schemaJson,
        articleId
      ]
    )
  }

  const primarySeoPage = await db.queryOne<{ id: number; published_at: string | null }>(
    `
      SELECT id, published_at
      FROM seo_pages
      WHERE article_id = ?
      ORDER BY id ASC
      LIMIT 1
    `,
    [articleId]
  )

  const resolvedSeoTitle = seoTitle || title
  const resolvedSeoDescription = seoDescription || summary || ''

  if (primarySeoPage?.id) {
    if (status === 'published') {
      await db.exec(
        `
          UPDATE seo_pages
          SET page_type = ?, pathname = ?, title = ?, meta_description = ?, canonical_url = ?, schema_json = ?,
              status = 'published', published_at = COALESCE(published_at, CURRENT_TIMESTAMP),
              updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `,
        [existing.article_type, pathname, resolvedSeoTitle, resolvedSeoDescription, pathname, schemaJson, primarySeoPage.id]
      )
    } else {
      await db.exec(
        `
          UPDATE seo_pages
          SET page_type = ?, pathname = ?, title = ?, meta_description = ?, canonical_url = ?, schema_json = ?,
              status = 'draft', published_at = NULL, updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `,
        [existing.article_type, pathname, resolvedSeoTitle, resolvedSeoDescription, pathname, schemaJson, primarySeoPage.id]
      )
    }
  } else {
    if (status === 'published') {
      await db.exec(
        `
          INSERT INTO seo_pages (
            article_id, page_type, pathname, title, meta_description, canonical_url, schema_json, status, published_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, 'published', CURRENT_TIMESTAMP)
        `,
        [articleId, existing.article_type, pathname, resolvedSeoTitle, resolvedSeoDescription, pathname, schemaJson]
      )
    } else {
      await db.exec(
        `
          INSERT INTO seo_pages (
            article_id, page_type, pathname, title, meta_description, canonical_url, schema_json, status
          ) VALUES (?, ?, ?, ?, ?, ?, ?, 'draft')
        `,
        [articleId, existing.article_type, pathname, resolvedSeoTitle, resolvedSeoDescription, pathname, schemaJson]
      )
    }
  }

  const updated = await getAdminArticle(articleId)
  if (!updated) {
    throw new AdminArticleValidationError('Article not found after update', 500)
  }

  return updated
}
