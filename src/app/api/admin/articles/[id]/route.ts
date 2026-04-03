import { revalidatePath } from 'next/cache'
import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { getArticlePath } from '@/lib/article-path'
import {
  AdminArticleValidationError,
  getAdminArticle,
  updateAdminArticle
} from '@/lib/admin-articles'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  await requireAdmin()
  const article = await getAdminArticle(Number((await params).id))
  if (!article) {
    return NextResponse.json({ error: 'Article not found' }, { status: 404 })
  }
  return NextResponse.json(article)
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  await requireAdmin()
  const articleId = Number((await params).id)
  const existing = await getAdminArticle(articleId)

  if (!existing) {
    return NextResponse.json({ error: 'Article not found' }, { status: 404 })
  }

  const body = await request.json().catch(() => ({}))

  try {
    const article = await updateAdminArticle(articleId, {
      title: String(body.title || ''),
      slug: String(body.slug || ''),
      summary: body.summary != null ? String(body.summary) : null,
      keyword: body.keyword != null ? String(body.keyword) : null,
      heroImageUrl: body.heroImageUrl != null ? String(body.heroImageUrl) : null,
      contentMd: String(body.contentMd || ''),
      contentHtml: String(body.contentHtml || ''),
      seoTitle: body.seoTitle != null ? String(body.seoTitle) : null,
      seoDescription: body.seoDescription != null ? String(body.seoDescription) : null,
      schemaJson: body.schemaJson != null ? String(body.schemaJson) : null,
      status: body.status === 'draft' ? 'draft' : 'published'
    })

    const previousPath = getArticlePath(existing.article_type, existing.slug)
    const nextPath = getArticlePath(article.article_type, article.slug)

    revalidatePath(previousPath)
    revalidatePath(nextPath)
    revalidatePath('/')
    revalidatePath('/directory')
    if (existing.product_category) {
      revalidatePath(`/categories/${existing.product_category}`)
    }

    return NextResponse.json(article)
  } catch (error) {
    if (error instanceof AdminArticleValidationError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }
    throw error
  }
}
