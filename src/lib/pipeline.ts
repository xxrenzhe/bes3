import { revalidatePath } from 'next/cache'
import { generateComparisonCopy, generateKeywordIdeas, generateReviewCopy, generateSeoPayload } from '@/lib/ai'
import { escapeHtml } from '@/lib/html'
import { persistMediaAsset } from '@/lib/media'
import { getAffiliateProductById, listAffiliateProducts, type AffiliateProductRecord, upsertManualAffiliateLink } from '@/lib/partnerboost'
import { getDatabase } from '@/lib/db'
import { scrapeProductPage } from '@/lib/scraper'
import type { PipelineStage, PipelineStatus } from '@/lib/types'
import { resolveAffiliateLink } from '@/lib/url-resolver'
import { slugify } from '@/lib/slug'

export interface PipelineRunListItem {
  id: number
  product_id: number | null
  affiliate_product_id: number | null
  status: PipelineStatus
  current_stage: PipelineStage | null
  error_message: string | null
  source_link: string
  created_at: string
  updated_at: string
  product_name: string | null
  slug: string | null
}

export interface PipelineRunDetailItem extends PipelineRunListItem {
  jobs: Array<{
    id: number
    stage: PipelineStage
    status: string
    message: string | null
    payload_json: string | null
    started_at: string | null
    finished_at: string | null
  }>
}

export interface AdminDashboardSummary {
  totals: {
    products: number
    affiliateProducts: number
    articles: number
    runs: number
  }
  recentRuns: PipelineRunListItem[]
  recentAffiliateProducts: AffiliateProductRecord[]
}

async function createRun(sourceLink: string, affiliateProductId?: number | null) {
  const db = await getDatabase()
  const result = await db.exec(
    `
      INSERT INTO content_pipeline_runs (product_id, affiliate_product_id, source_link, status, current_stage)
      VALUES (NULL, ?, ?, 'queued', NULL)
    `,
    [affiliateProductId || null, sourceLink]
  )
  return Number(result.lastInsertRowid)
}

async function markRun(runId: number, status: PipelineStatus, currentStage?: PipelineStage | null, errorMessage?: string | null) {
  const db = await getDatabase()
  await db.exec(
    `
      UPDATE content_pipeline_runs
      SET status = ?, current_stage = ?, error_message = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `,
    [status, currentStage || null, errorMessage || null, runId]
  )
}

async function createJob(runId: number, stage: PipelineStage) {
  const db = await getDatabase()
  const result = await db.exec(
    'INSERT INTO content_pipeline_jobs (run_id, stage, status, started_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)',
    [runId, stage, 'running']
  )
  return Number(result.lastInsertRowid)
}

async function finishJob(jobId: number, status: string, message?: string, payload?: unknown) {
  const db = await getDatabase()
  await db.exec(
    `
      UPDATE content_pipeline_jobs
      SET status = ?, message = ?, payload_json = ?, finished_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `,
    [status, message || null, payload ? JSON.stringify(payload) : null, jobId]
  )
}

async function ensureProductShell(input: {
  affiliateProductId?: number | null
  sourcePlatform: string
  sourceLink: string
  finalUrl: string
  productName: string
  brand: string | null
}): Promise<number> {
  const db = await getDatabase()
  const existing = input.affiliateProductId
    ? await db.queryOne<{ id: number }>('SELECT id FROM products WHERE affiliate_product_id = ? LIMIT 1', [input.affiliateProductId])
    : null

  if (existing?.id) return existing.id

  const result = await db.exec(
    `
      INSERT INTO products (
        affiliate_product_id, source_platform, source_affiliate_link, resolved_url, canonical_url, slug, brand, product_name
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      input.affiliateProductId || null,
      input.sourcePlatform,
      input.sourceLink,
      input.finalUrl,
      input.finalUrl,
      slugify(input.productName),
      input.brand,
      input.productName
    ]
  )

  return Number(result.lastInsertRowid)
}

async function updateProductFromScrape(productId: number, scraped: ReturnType<typeof scrapeProductPage>) {
  const db = await getDatabase()
  await db.exec(
    `
      UPDATE products
      SET resolved_url = ?, canonical_url = ?, slug = ?, brand = ?, product_name = ?, category = ?, description = ?,
          price_amount = ?, price_currency = ?, rating = ?, review_count = ?, specs_json = ?, review_highlights_json = ?,
          source_payload_json = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `,
    [
      scraped.finalUrl,
      scraped.finalUrl,
      slugify(scraped.productName),
      scraped.brand,
      scraped.productName,
      scraped.category,
      scraped.description,
      scraped.priceAmount,
      scraped.priceCurrency,
      scraped.rating,
      scraped.reviewCount,
      JSON.stringify(scraped.specs),
      JSON.stringify(scraped.reviewHighlights),
      JSON.stringify(scraped),
      productId
    ]
  )
}

async function saveKeywords(productId: number, keywords: Awaited<ReturnType<typeof generateKeywordIdeas>>) {
  const db = await getDatabase()
  await db.exec('DELETE FROM keyword_opportunities WHERE product_id = ?', [productId])
  for (const keyword of keywords) {
    const totalScore =
      keyword.buyerIntent * 0.3 +
      keyword.serpWeakness * 0.2 +
      keyword.commissionPotential * 0.2 +
      keyword.contentFit * 0.2 +
      keyword.freshness * 0.1
    await db.exec(
      `
        INSERT INTO keyword_opportunities (
          product_id, keyword, buyer_intent, serp_weakness, commission_potential, content_fit, freshness, total_score
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        productId,
        keyword.keyword,
        keyword.buyerIntent,
        keyword.serpWeakness,
        keyword.commissionPotential,
        keyword.contentFit,
        keyword.freshness,
        totalScore
      ]
    )
  }
}

async function upsertArticle(input: {
  productId: number
  articleType: 'review' | 'comparison'
  title: string
  slug: string
  summary: string
  keyword: string
  heroImageUrl: string | null
  contentMd: string
  contentHtml: string
  seoTitle: string
  seoDescription: string
  schemaJson: string
}): Promise<number> {
  const db = await getDatabase()
  const existing = await db.queryOne<{ id: number }>(
    'SELECT id FROM articles WHERE slug = ? LIMIT 1',
    [input.slug]
  )

  if (existing?.id) {
    await db.exec(
      `
        UPDATE articles
        SET title = ?, summary = ?, keyword = ?, hero_image_url = ?, content_md = ?, content_html = ?,
            seo_title = ?, seo_description = ?, schema_json = ?, status = 'published', published_at = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
      [
        input.title,
        input.summary,
        input.keyword,
        input.heroImageUrl,
        input.contentMd,
        input.contentHtml,
        input.seoTitle,
        input.seoDescription,
        input.schemaJson,
        existing.id
      ]
    )
    return existing.id
  }

  const result = await db.exec(
    `
      INSERT INTO articles (
        product_id, article_type, title, slug, summary, keyword, hero_image_url, content_md, content_html,
        seo_title, seo_description, schema_json, status, published_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'published', CURRENT_TIMESTAMP)
    `,
    [
      input.productId,
      input.articleType,
      input.title,
      input.slug,
      input.summary,
      input.keyword,
      input.heroImageUrl,
      input.contentMd,
      input.contentHtml,
      input.seoTitle,
      input.seoDescription,
      input.schemaJson
    ]
  )
  return Number(result.lastInsertRowid)
}

async function publishSeoPage(articleId: number, pageType: string, pathname: string, title: string, description: string, schemaJson: string) {
  const db = await getDatabase()
  const existing = await db.queryOne<{ id: number }>('SELECT id FROM seo_pages WHERE pathname = ? LIMIT 1', [pathname])
  if (existing?.id) {
    await db.exec(
      `
        UPDATE seo_pages
        SET title = ?, meta_description = ?, schema_json = ?, status = 'published', published_at = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
      [title, description, schemaJson, existing.id]
    )
    return existing.id
  }

  const result = await db.exec(
    `
      INSERT INTO seo_pages (article_id, page_type, pathname, title, meta_description, canonical_url, schema_json, status, published_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'published', CURRENT_TIMESTAMP)
    `,
    [articleId, pageType, pathname, title, description, pathname, schemaJson]
  )
  return Number(result.lastInsertRowid)
}

async function publishEvent(eventType: string, status: string, payload: unknown, seoPageId?: number | null) {
  const db = await getDatabase()
  await db.exec(
    'INSERT INTO publish_events (seo_page_id, event_type, status, payload_json) VALUES (?, ?, ?, ?)',
    [seoPageId || null, eventType, status, JSON.stringify(payload)]
  )
}

export async function listPipelineRuns(): Promise<PipelineRunListItem[]> {
  const db = await getDatabase()
  return db.query<PipelineRunListItem>(
    `
      SELECT r.id, r.product_id, r.affiliate_product_id, r.status, r.current_stage, r.error_message, r.source_link,
        r.created_at, r.updated_at, p.product_name, p.slug
      FROM content_pipeline_runs r
      LEFT JOIN products p ON p.id = r.product_id
      ORDER BY r.updated_at DESC, r.id DESC
    `
  )
}

export async function getPipelineRun(runId: number): Promise<PipelineRunDetailItem | null> {
  const db = await getDatabase()
  const run = await db.queryOne<PipelineRunListItem>(
    `
      SELECT r.id, r.product_id, r.affiliate_product_id, r.status, r.current_stage, r.error_message, r.source_link,
        r.created_at, r.updated_at, p.product_name, p.slug
      FROM content_pipeline_runs r
      LEFT JOIN products p ON p.id = r.product_id
      WHERE r.id = ?
      LIMIT 1
    `,
    [runId]
  )

  if (!run) return null

  const jobs = await db.query<PipelineRunDetailItem['jobs'][number]>(
    `
      SELECT id, stage, status, message, payload_json, started_at, finished_at
      FROM content_pipeline_jobs
      WHERE run_id = ?
      ORDER BY id ASC
    `,
    [runId]
  )
  return { ...run, jobs }
}

export async function runPipelineForAffiliateProduct(affiliateProductId: number): Promise<number> {
  const affiliateProduct = await getAffiliateProductById(affiliateProductId)
  if (!affiliateProduct) throw new Error('Affiliate product not found')
  const sourceLink = affiliateProduct.short_promo_link || affiliateProduct.promo_link || affiliateProduct.product_url
  if (!sourceLink) throw new Error('Affiliate product has no available link')
  return runPipelineInternal(sourceLink, affiliateProductId, affiliateProduct.platform)
}

export async function runPipelineFromLink(sourceLink: string): Promise<number> {
  const affiliateProductId = await upsertManualAffiliateLink(sourceLink)
  return runPipelineInternal(sourceLink, affiliateProductId, 'manual')
}

async function runPipelineInternal(sourceLink: string, affiliateProductId: number | null, sourcePlatform: string): Promise<number> {
  const runId = await createRun(sourceLink, affiliateProductId)
  await markRun(runId, 'running')

  let productId: number | null = null

  try {
    const resolveJob = await createJob(runId, 'resolveAffiliateLink')
    await markRun(runId, 'running', 'resolveAffiliateLink')
    const resolved = await resolveAffiliateLink(sourceLink)
    await finishJob(resolveJob, 'completed', 'Affiliate link resolved', resolved)

    const scrapeJob = await createJob(runId, 'scrapeProductFacts')
    await markRun(runId, 'running', 'scrapeProductFacts')
    const scraped = scrapeProductPage(resolved.finalUrl, resolved.landingHtml)
    await finishJob(scrapeJob, 'completed', 'Product page scraped', {
      productName: scraped.productName,
      imageCount: scraped.imageUrls.length
    })

    const mediaJob = await createJob(runId, 'persistMediaAssets')
    await markRun(runId, 'running', 'persistMediaAssets')
    productId = await ensureProductShell({
      affiliateProductId,
      sourcePlatform,
      sourceLink,
      finalUrl: resolved.finalUrl,
      productName: scraped.productName,
      brand: scraped.brand
    })
    const persistedMediaUrls: string[] = []
    for (const [index, imageUrl] of scraped.imageUrls.slice(0, 6).entries()) {
      try {
        const assetRole = index === 0 ? 'hero' : 'gallery'
        const publicUrl = await persistMediaAsset({ productId, sourceUrl: imageUrl, assetRole, index })
        persistedMediaUrls.push(publicUrl)
      } catch (error: any) {
        persistedMediaUrls.push(imageUrl)
        await publishEvent('media.persist.warning', 'warning', { imageUrl, error: error?.message || String(error) })
      }
    }
    for (const [index, imageUrl] of scraped.reviewImageUrls.slice(0, 6).entries()) {
      try {
        await persistMediaAsset({ productId, sourceUrl: imageUrl, assetRole: 'review', index })
      } catch {
        // Review images are best effort.
      }
    }
    await finishJob(mediaJob, 'completed', 'Media persisted', { persistedMediaUrls })

    const normalizeJob = await createJob(runId, 'normalizeProduct')
    await markRun(runId, 'running', 'normalizeProduct')
    await updateProductFromScrape(productId, scraped)
    await finishJob(normalizeJob, 'completed', 'Product normalized', { productId })

    const db = await getDatabase()
    const product = await db.queryOne<any>(
      `
        SELECT id, slug, brand, product_name AS productName, category, description, price_amount AS priceAmount,
          price_currency AS priceCurrency, rating, review_count AS reviewCount, specs_json, review_highlights_json,
          resolved_url AS resolvedUrl
        FROM products WHERE id = ? LIMIT 1
      `,
      [productId]
    )
    if (!product) throw new Error('Normalized product not found')
    product.specs = product.specs_json ? JSON.parse(product.specs_json) : {}
    product.reviewHighlights = product.review_highlights_json ? JSON.parse(product.review_highlights_json) : []

    const keywordsJob = await createJob(runId, 'mineKeywords')
    await markRun(runId, 'running', 'mineKeywords')
    const keywordIdeas = await generateKeywordIdeas(product)
    await saveKeywords(productId, keywordIdeas)
    await finishJob(keywordsJob, 'completed', 'Keyword opportunities generated', { total: keywordIdeas.length })

    const reviewJob = await createJob(runId, 'generateReviewArticle')
    await markRun(runId, 'running', 'generateReviewArticle')
    const reviewCopy = await generateReviewCopy(product)
    const reviewSeo = await generateSeoPayload(`${product.productName} Review`, reviewCopy.summary)
    const reviewArticleId = await upsertArticle({
      productId,
      articleType: 'review',
      title: `${product.productName} Review`,
      slug: slugify(`${product.productName} review`),
      summary: reviewCopy.summary,
      keyword: keywordIdeas[0]?.keyword || `${product.productName} review`,
      heroImageUrl: persistedMediaUrls[0] || null,
      contentMd: reviewCopy.markdown,
      contentHtml: reviewCopy.html,
      seoTitle: reviewSeo.seoTitle,
      seoDescription: reviewSeo.seoDescription,
      schemaJson: reviewSeo.schemaJson
    })
    await finishJob(reviewJob, 'completed', 'Review article generated', { articleId: reviewArticleId })

    const comparisonJob = await createJob(runId, 'generateComparisonArticle')
    await markRun(runId, 'running', 'generateComparisonArticle')
    const allProducts = await db.query<any>(
      'SELECT id, slug, brand, product_name AS productName, category, description, price_amount AS priceAmount, price_currency AS priceCurrency, rating, review_count AS reviewCount, specs_json, review_highlights_json, resolved_url AS resolvedUrl FROM products WHERE id <> ? ORDER BY updated_at DESC LIMIT 2',
      [productId]
    )
    const alternatives = allProducts.map((item) => ({
      ...item,
      specs: item.specs_json ? JSON.parse(item.specs_json) : {},
      reviewHighlights: item.review_highlights_json ? JSON.parse(item.review_highlights_json) : []
    }))
    const comparisonCopy = await generateComparisonCopy(product, alternatives)
    const comparisonSeo = await generateSeoPayload(`${product.productName} Alternatives`, comparisonCopy.summary)
    const comparisonArticleId = await upsertArticle({
      productId,
      articleType: 'comparison',
      title: `${product.productName} Alternatives`,
      slug: slugify(`${product.productName} alternatives`),
      summary: comparisonCopy.summary,
      keyword: keywordIdeas[1]?.keyword || `${product.productName} alternatives`,
      heroImageUrl: persistedMediaUrls[0] || null,
      contentMd: comparisonCopy.markdown,
      contentHtml: comparisonCopy.html,
      seoTitle: comparisonSeo.seoTitle,
      seoDescription: comparisonSeo.seoDescription,
      schemaJson: comparisonSeo.schemaJson
    })
    await finishJob(comparisonJob, 'completed', 'Comparison article generated', { articleId: comparisonArticleId })

    const seoJob = await createJob(runId, 'generateSeoPayload')
    await markRun(runId, 'running', 'generateSeoPayload')
    await finishJob(seoJob, 'completed', 'SEO payload attached', { reviewArticleId, comparisonArticleId })

    const publishJob = await createJob(runId, 'publishPages')
    await markRun(runId, 'running', 'publishPages')
    const reviewPath = `/reviews/${slugify(`${product.productName} review`)}`
    const comparisonPath = `/compare/${slugify(`${product.productName} alternatives`)}`
    const reviewSeoPageId = await publishSeoPage(reviewArticleId, 'review', reviewPath, `${product.productName} Review`, reviewCopy.summary, reviewSeo.schemaJson)
    const comparisonSeoPageId = await publishSeoPage(comparisonArticleId, 'comparison', comparisonPath, `${product.productName} Alternatives`, comparisonCopy.summary, comparisonSeo.schemaJson)
    await finishJob(publishJob, 'completed', 'SEO pages published', { reviewSeoPageId, comparisonSeoPageId })

    const revalidateJob = await createJob(runId, 'revalidateAndSitemap')
    await markRun(runId, 'running', 'revalidateAndSitemap')
    revalidatePath('/')
    revalidatePath(reviewPath)
    revalidatePath(comparisonPath)
    revalidatePath('/directory')
    await finishJob(revalidateJob, 'completed', 'Paths revalidated')

    const pingJob = await createJob(runId, 'pingAndIndexing')
    await markRun(runId, 'running', 'pingAndIndexing')
    const siteUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    await publishEvent('seo.publish', 'success', { reviewPath, comparisonPath }, reviewSeoPageId)
    if (process.env.PINGOMATIC_ENABLED === 'true') {
      await fetch(
        `https://rpc.pingomatic.com/ping/?title=Bes3&blogurl=${encodeURIComponent(siteUrl)}&rssurl=${encodeURIComponent(`${siteUrl}/sitemap.xml`)}`,
        { method: 'GET' }
      ).catch(() => undefined)
    }
    await finishJob(pingJob, 'completed', 'Ping/indexing completed')

    await markRun(runId, 'completed', null)
    await db.exec('UPDATE content_pipeline_runs SET product_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [productId, runId])
    return runId
  } catch (error: any) {
    await markRun(runId, 'failed', null, error?.message || 'Pipeline failed')
    const db = await getDatabase()
    const lastJob = await db.queryOne<{ id: number }>(
      'SELECT id FROM content_pipeline_jobs WHERE run_id = ? ORDER BY id DESC LIMIT 1',
      [runId]
    )
    if (lastJob?.id) {
      await finishJob(lastJob.id, 'failed', error?.message || 'Pipeline failed', { stack: error?.stack || null })
    }
    throw error
  }
}

export async function batchRunPipelines(ids: number[]): Promise<number[]> {
  const runs: number[] = []
  for (const id of ids) {
    runs.push(await runPipelineForAffiliateProduct(id))
  }
  return runs
}

export async function rescrapeProductMedia(productId: number): Promise<void> {
  const db = await getDatabase()
  const product = await db.queryOne<any>('SELECT source_affiliate_link FROM products WHERE id = ? LIMIT 1', [productId])
  if (!product?.source_affiliate_link) throw new Error('Product source link missing')
  const resolved = await resolveAffiliateLink(product.source_affiliate_link)
  const scraped = scrapeProductPage(resolved.finalUrl, resolved.landingHtml)
  await db.exec('DELETE FROM product_media_assets WHERE product_id = ?', [productId])
  for (const [index, imageUrl] of scraped.imageUrls.slice(0, 6).entries()) {
    await persistMediaAsset({
      productId,
      sourceUrl: imageUrl,
      assetRole: index === 0 ? 'hero' : 'gallery',
      index
    })
  }
}

export async function getAdminDashboardSummary(): Promise<AdminDashboardSummary> {
  const db = await getDatabase()
  const [products, affiliateProducts, articles, runs] = await Promise.all([
    db.queryOne<{ count: number }>('SELECT COUNT(*) AS count FROM products'),
    db.queryOne<{ count: number }>('SELECT COUNT(*) AS count FROM affiliate_products'),
    db.queryOne<{ count: number }>('SELECT COUNT(*) AS count FROM articles'),
    db.queryOne<{ count: number }>('SELECT COUNT(*) AS count FROM content_pipeline_runs')
  ])

  const recentRuns = await listPipelineRuns()
  const recentAffiliateProducts = await listAffiliateProducts()

  return {
    totals: {
      products: Number(products?.count || 0),
      affiliateProducts: Number(affiliateProducts?.count || 0),
      articles: Number(articles?.count || 0),
      runs: Number(runs?.count || 0)
    },
    recentRuns: recentRuns.slice(0, 6),
    recentAffiliateProducts: recentAffiliateProducts.slice(0, 8)
  }
}

export function renderSpecsTable(specs: Record<string, string>): string {
  const rows = Object.entries(specs)
    .map(([label, value]) => `<tr><th>${escapeHtml(label)}</th><td>${escapeHtml(value)}</td></tr>`)
    .join('')
  return `<table>${rows}</table>`
}
