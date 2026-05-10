#!/usr/bin/env tsx

import './load-env'
import fs from 'node:fs'
import path from 'node:path'
import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process'
import { chromium, type BrowserContext, type Page } from 'playwright'
import { DEFAULT_ADMIN_USERNAME } from '@/lib/constants'
import { bootstrapApplication } from '@/lib/bootstrap'
import { getDatabase } from '@/lib/db'
import { getHardcoreHome, listHardcoreTags } from '@/lib/hardcore'
import { isCommissionableMerchantUrl } from '@/lib/merchant-links'
import { buildScenarioPseoPath, buildValuePseoPath } from '@/lib/pseo'
import { buildCommercePurchaseDecision, buildEvidencePurchaseDecision } from '@/lib/purchase-decision'
import { listOpenCommerceProducts, listPublishedArticles } from '@/lib/site-data'
import type { DatabaseAdapter } from '@/lib/types'

const port = Number.parseInt(process.env.BROWSER_E2E_PORT || '3220', 10)
const baseUrl = `http://localhost:${Number.isFinite(port) ? port : 3220}`
const startupTimeoutMs = Number.parseInt(process.env.BROWSER_E2E_STARTUP_TIMEOUT_MS || '45000', 10)
const localFixtureSlugPrefix = 'planv2-e2e-'
const localFixtureSource = 'planv2-e2e'

type Plan13TestRoutes = {
  categoryPath: string
  dealDetailPath: string
  productPath: string
  reviewPath: string | null
  scenarioPath: string
  buyNowHandoffPath: string | null
  buyNowProductId: number | null
}

type Plan13FixtureProduct = {
  slug: string
  brand: string
  name: string
  model: string
  asin: string
  price: number
  histLow: number
  avg90d: number
  affiliateUrl: string
  videoId: string
  channelName: string
  channelUrl: string
  videoTitle: string
  evidenceQuote: string
  contextSnippet: string
  bloggerRank: number
}

const plan13FixtureProducts: Plan13FixtureProduct[] = [
  {
    slug: 'planv2-e2e-aquaclimb-triton-900',
    brand: 'AquaClimb',
    name: 'AquaClimb Triton 900 Pool Wall Robot',
    model: 'Triton 900',
    asin: 'B0PLANV201',
    price: 429,
    histLow: 449,
    avg90d: 579,
    affiliateUrl: 'https://www.amazon.com/dp/B0PLANV201?tag=bes3-20&ascsubtag=planv2-e2e-triton',
    videoId: 'planv2e2e001',
    channelName: 'Pool Robotics Lab',
    channelUrl: 'https://www.youtube.com/@PoolRoboticsLab',
    videoTitle: 'AquaClimb Triton 900 wall climb field review',
    evidenceQuote: 'AquaClimb Triton 900 reached the tile line on six straight wall-climb passes and kept scrubbing instead of sliding down.',
    contextSnippet: 'The field review repeats the same wall-climb pass in shallow and deep-end lanes before scoring the cleaner.',
    bloggerRank: 2.1
  },
  {
    slug: 'planv2-e2e-poolcrest-wallmaster-700',
    brand: 'PoolCrest',
    name: 'PoolCrest WallMaster 700 Pool Robot',
    model: 'WallMaster 700',
    asin: 'B0PLANV202',
    price: 399,
    histLow: 389,
    avg90d: 499,
    affiliateUrl: 'https://www.amazon.com/dp/B0PLANV202?tag=bes3-20&ascsubtag=planv2-e2e-wallmaster',
    videoId: 'planv2e2e002',
    channelName: 'Waterline Test Bench',
    channelUrl: 'https://www.youtube.com/@WaterlineTestBench',
    videoTitle: 'PoolCrest WallMaster 700 waterline climbing review',
    evidenceQuote: 'PoolCrest WallMaster 700 climbed past the cove and held traction at the waterline during the timed tile-wall run.',
    contextSnippet: 'The reviewer compares wall traction, basket loading, and waterline dwell time across three cleaning cycles.',
    bloggerRank: 1.9
  },
  {
    slug: 'planv2-e2e-tilepro-ascent-600',
    brand: 'TilePro',
    name: 'TilePro Ascent 600 Pool Robot',
    model: 'Ascent 600',
    asin: 'B0PLANV203',
    price: 459,
    histLow: 449,
    avg90d: 569,
    affiliateUrl: 'https://www.amazon.com/dp/B0PLANV203?tag=bes3-20&ascsubtag=planv2-e2e-ascent',
    videoId: 'planv2e2e003',
    channelName: 'Backyard Automation Review',
    channelUrl: 'https://www.youtube.com/@BackyardAutomationReview',
    videoTitle: 'TilePro Ascent 600 pool robot wall traction review',
    evidenceQuote: 'TilePro Ascent 600 finished the wall-climb route without losing suction and cleared debris along the tile transition.',
    contextSnippet: 'The test records wall traction, debris pickup, and recovery behavior after the cleaner reverses near the waterline.',
    bloggerRank: 1.7
  }
]

function requireEnv(name: string) {
  const value = process.env[name]?.trim()
  if (!value) throw new Error(`${name} is required for browser e2e`)
  return value
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function absoluteTestUrl(routePath: string) {
  const normalizedPath = routePath.startsWith('/') ? routePath : `/${routePath}`
  return `${baseUrl}${normalizedPath}`
}

async function gotoAppPage(page: Page, routePath: string) {
  await page.goto(absoluteTestUrl(routePath), { waitUntil: 'domcontentloaded' })
}

function inClause(values: number[]) {
  return values.map(() => '?').join(', ')
}

async function cleanPlan13LocalFixtureData(db: DatabaseAdapter) {
  if (db.type !== 'sqlite') return

  const products = await db.query<{ id: number }>(
    'SELECT id FROM products WHERE slug LIKE ? OR source_platform = ?',
    [`${localFixtureSlugPrefix}%`, localFixtureSource]
  )
  const productIds = products.map((product) => Number(product.id)).filter(Number.isFinite)
  if (productIds.length) {
    const placeholders = inClause(productIds)
    await db.exec(`DELETE FROM merchant_click_events WHERE product_id IN (${placeholders})`, productIds)
    await db.exec(`DELETE FROM buyer_decision_events WHERE product_id IN (${placeholders})`, productIds)
    await db.exec(`DELETE FROM product_attribute_facts WHERE product_id IN (${placeholders})`, productIds)
    await db.exec(`DELETE FROM product_price_history WHERE product_id IN (${placeholders})`, productIds)
    await db.exec(`DELETE FROM product_offers WHERE product_id IN (${placeholders})`, productIds)
    await db.exec(`DELETE FROM affiliate_links WHERE product_id IN (${placeholders})`, productIds)
    await db.exec(`DELETE FROM articles WHERE product_id IN (${placeholders})`, productIds)
    await db.exec(`DELETE FROM analysis_reports WHERE product_id IN (${placeholders})`, productIds)
    await db.exec(`DELETE FROM products WHERE id IN (${placeholders})`, productIds)
  }
  await db.exec('DELETE FROM articles WHERE slug LIKE ?', [`${localFixtureSlugPrefix}%`])
  await db.exec('DELETE FROM review_videos WHERE youtube_id LIKE ?', ['planv2e2e%'])
}

async function ensurePlan13LocalFixtureData() {
  const db = await getDatabase()
  if (db.type !== 'sqlite' || process.env.BROWSER_E2E_SKIP_FIXTURES === 'true') {
    return false
  }

  await cleanPlan13LocalFixtureData(db)

  const category = await db.queryOne<{ id: number }>(
    'SELECT id FROM hardcore_categories WHERE slug = ? LIMIT 1',
    ['yard-pool-automation']
  )
  const tag = await db.queryOne<{ id: number }>(
    'SELECT id FROM taxonomy_tags WHERE category_slug = ? AND slug = ? LIMIT 1',
    ['yard-pool-automation', 'pool-wall-climbing']
  )
  if (!category?.id || !tag?.id) {
    throw new Error('Plan13 browser E2E fixture requires yard-pool-automation / pool-wall-climbing taxonomy seed')
  }

  await db.exec(
    `
      INSERT OR IGNORE INTO merchants (name, slug, website_url, country_code)
      VALUES ('Amazon', 'amazon', 'https://www.amazon.com', 'US')
    `
  )
  const merchant = await db.queryOne<{ id: number }>('SELECT id FROM merchants WHERE slug = ? LIMIT 1', ['amazon'])

  for (const fixture of plan13FixtureProducts) {
    const inserted = await db.exec(
      `
        INSERT INTO products (
          source_platform,
          source_affiliate_link,
          resolved_url,
          canonical_url,
          slug,
          brand,
          product_model,
          model_number,
          product_type,
          category_slug,
          product_name,
          category,
          description,
          price_amount,
          price_currency,
          current_price,
          hist_low_price,
          avg_90d_price,
          price_status,
          rating,
          review_count,
          youtube_match_terms_json,
          specs_json,
          review_highlights_json,
          source_payload_json,
          price_last_checked_at,
          offer_last_checked_at,
          attribute_completeness_score,
          data_confidence_score,
          source_count,
          asin,
          published_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pool robot', 'yard-pool-automation', ?, 'Yard and Pool Automation', ?, ?, 'USD', ?, ?, ?, 'great-value', ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `,
      [
        localFixtureSource,
        fixture.affiliateUrl,
        fixture.affiliateUrl,
        `https://www.amazon.com/dp/${fixture.asin}`,
        fixture.slug,
        fixture.brand,
        fixture.model,
        fixture.asin,
        fixture.name,
        `${fixture.name} is a wall-climbing pool robot with crawler-visible YouTube proof, price context, and a verified affiliate handoff for PlanV2 browser E2E coverage.`,
        fixture.price,
        fixture.price,
        fixture.histLow,
        fixture.avg90d,
        4.7,
        128,
        JSON.stringify([`${fixture.name} review`, `${fixture.model} wall climbing`, 'pool robot climbs walls']),
        JSON.stringify({
          category: 'pool robot',
          model: fixture.model,
          wallClimb: 'tile-line verified',
          basket: 'top load'
        }),
        JSON.stringify(['Wall-climb test passed', 'Current price is below the 90-day average', 'Commissionable merchant handoff verified']),
        JSON.stringify({ planv2E2e: true }),
        0.92,
        0.94,
        3,
        fixture.asin
      ]
    )
    const productId = Number(inserted.lastInsertRowid)
    if (!productId) throw new Error(`Failed to insert Plan13 fixture product ${fixture.slug}`)

    await db.exec(
      `
        INSERT INTO affiliate_links (
          product_id,
          platform,
          affiliate_url,
          original_url,
          country_code,
          commission_rate,
          status,
          last_verified
        ) VALUES (?, 'PartnerBoost', ?, ?, 'US', 0.08, 'active', CURRENT_TIMESTAMP)
      `,
      [productId, fixture.affiliateUrl, `https://www.amazon.com/dp/${fixture.asin}`]
    )
    await db.exec(
      `
        INSERT INTO product_offers (
          product_id,
          merchant_id,
          offer_url,
          merchant_sku,
          availability_status,
          price_amount,
          price_currency,
          source_type,
          source_url,
          confidence_score,
          last_checked_at
        ) VALUES (?, ?, ?, ?, 'in_stock', ?, 'USD', 'affiliate', ?, 0.95, CURRENT_TIMESTAMP)
      `,
      [
        productId,
        merchant?.id || null,
        `${fixture.affiliateUrl}&ascsubtag=offer`,
        fixture.asin,
        fixture.price,
        `https://www.amazon.com/dp/${fixture.asin}`
      ]
    )
    await db.exec(
      `
        INSERT INTO product_attribute_facts (
          product_id,
          attribute_key,
          attribute_label,
          attribute_value,
          source_url,
          source_type,
          confidence_score,
          is_verified
        ) VALUES (?, 'wall_climb', 'Wall climb evidence', 'Reached and scrubbed the tile line in source video', ?, 'review', 0.92, 1)
      `,
      [productId, `https://www.youtube.com/watch?v=${fixture.videoId}&t=428s`]
    )
    const offer = await db.queryOne<{ id: number }>(
      'SELECT id FROM product_offers WHERE product_id = ? ORDER BY id DESC LIMIT 1',
      [productId]
    )
    await db.exec(
      `
        INSERT INTO product_price_history (
          product_id,
          product_offer_id,
          price_amount,
          price_currency,
          availability_status,
          captured_at
        ) VALUES (?, ?, ?, 'USD', 'in_stock', CURRENT_TIMESTAMP)
      `,
      [productId, offer?.id || null, fixture.price]
    )
    await db.exec(
      `
        INSERT INTO review_videos (
          youtube_id,
          channel_name,
          channel_url,
          blogger_rank,
          authority_tier,
          title,
          video_type,
          transcript,
          description,
          processed_status,
          published_at
        ) VALUES (?, ?, ?, ?, 'specialist', ?, 'long-form', ?, ?, 'success', CURRENT_TIMESTAMP)
      `,
      [
        fixture.videoId,
        fixture.channelName,
        fixture.channelUrl,
        fixture.bloggerRank,
        fixture.videoTitle,
        fixture.contextSnippet,
        `Field review covering ${fixture.name} wall traction and waterline behavior.`
      ]
    )
    const video = await db.queryOne<{ id: number }>(
      'SELECT id FROM review_videos WHERE youtube_id = ? LIMIT 1',
      [fixture.videoId]
    )
    if (!video?.id) throw new Error(`Failed to insert Plan13 fixture video ${fixture.videoId}`)
    await db.exec(
      `
        INSERT INTO analysis_reports (
          product_id,
          video_id,
          tag_id,
          rating,
          evidence_quote,
          timestamp_seconds,
          context_snippet,
          evidence_confidence,
          evidence_type,
          is_advertorial,
          quality_flags_json
        ) VALUES (?, ?, ?, 'Excellent', ?, 428, ?, 0.91, 'side-by-side', 0, ?)
      `,
      [
        productId,
        video.id,
        tag.id,
        fixture.evidenceQuote,
        fixture.contextSnippet,
        JSON.stringify({ planv2E2e: true, productModel: fixture.model })
      ]
    )
  }

  const lead = await db.queryOne<{ id: number; product_name: string }>(
    'SELECT id, product_name FROM products WHERE slug = ? LIMIT 1',
    [plan13FixtureProducts[0].slug]
  )
  if (!lead?.id) throw new Error('Failed to locate Plan13 lead fixture product')
  await db.exec(
    `
      INSERT INTO articles (
        product_id,
        article_type,
        title,
        slug,
        summary,
        keyword,
        content_md,
        content_html,
        seo_title,
        seo_description,
        schema_json,
        status,
        published_at
      ) VALUES (?, 'review', ?, ?, ?, ?, ?, ?, ?, ?, ?, 'published', CURRENT_TIMESTAMP)
    `,
    [
      lead.id,
      `${lead.product_name} Review After YouTube Wall-Climb Tests`,
      'planv2-e2e-aquaclimb-triton-900-review',
      'This review validates the PlanV2 purchase decision loop with source evidence, price context, and a commissionable merchant handoff.',
      'aquaclimb triton 900 review',
      `# ${lead.product_name}\n\nEvidence Verdict: buy only after checking the live store terms.`,
      `<h2>Evidence Verdict</h2><p>${plan13FixtureProducts[0].evidenceQuote}</p><p>Use the purchase decision card before opening the merchant handoff.</p>`,
      `${lead.product_name} Review | Bes3`,
      'Purchase decision review with YouTube wall-climb evidence, risk notes, and commission-neutral disclosure.',
      JSON.stringify({ '@type': 'Review', reviewRating: { '@type': 'Rating', ratingValue: '4.7' } })
    ]
  )

  console.log('✓ Plan13 local browser fixture data is ready')
  return true
}

async function findPlan13TestRoutes(): Promise<Plan13TestRoutes> {
  const [home, tags, articles, commerceProducts] = await Promise.all([
    getHardcoreHome(),
    listHardcoreTags(),
    listPublishedArticles(),
    listOpenCommerceProducts()
  ])
  const products = home.products
  const leadHardcoreProduct = products.find((product) => product.consensus.evidenceCount > 0 && product.categorySlug === 'yard-pool-automation')
    || products.find((product) => product.consensus.evidenceCount > 0)
    || products[0]
  const categorySlug = leadHardcoreProduct?.categorySlug || home.categories.find((item) => item.productCount > 0)?.category.slug || 'yard-pool-automation'
  const scenarioTag = tags.find((tag) => tag.categorySlug === categorySlug && tag.slug === 'pool-wall-climbing')
    || tags.find((tag) => tag.categorySlug === categorySlug && tag.isCorePainpoint)
    || tags.find((tag) => tag.categorySlug === categorySlug)
  const dealCategorySlug = products.find((product) => product.price.currentPrice != null && product.price.currentPrice <= 500)?.categorySlug || categorySlug
  const reviewArticle = articles.find((article) => article.type === 'review' && article.product?.slug)
    || articles.find((article) => article.type === 'review')
    || null
  const buyNowHardcore = products
    .map((product) => ({
      product,
      decision: buildEvidencePurchaseDecision(product, {
        pageType: 'product',
        trackingSource: 'browser-e2e-buy-now',
        categoryHref: `/categories/${product.categorySlug}`,
        alternativeHref: `/categories/${product.categorySlug}`,
        userIntent: 'browser e2e merchant handoff'
      })
    }))
    .find(({ decision }) => decision.state === 'buy_now' && decision.primaryActionHref?.startsWith('/go/'))
  const buyNowCommerce = buyNowHardcore
    ? null
    : commerceProducts
        .map((product) => ({
          product,
          decision: buildCommercePurchaseDecision(product, {
            pageType: 'product',
            trackingSource: 'browser-e2e-buy-now',
            categoryHref: product.categorySlug ? `/categories/${product.categorySlug}` : '/categories',
            alternativeHref: product.categorySlug ? `/categories/${product.categorySlug}` : '/categories',
            userIntent: 'browser e2e merchant handoff'
          })
        }))
        .find(({ decision }) => decision.state === 'buy_now' && decision.primaryActionHref?.startsWith('/go/'))

  if (!leadHardcoreProduct) {
    throw new Error('Plan13 browser E2E requires at least one public evidence product for category/deal/scenario/compare pages')
  }
  if (!scenarioTag) {
    throw new Error(`Plan13 browser E2E requires at least one active scenario tag for ${categorySlug}`)
  }

  return {
    categoryPath: `/categories/${categorySlug}`,
    dealDetailPath: buildValuePseoPath(dealCategorySlug, 500),
    productPath: buyNowHardcore?.product.slug
      ? `/products/${buyNowHardcore.product.slug}`
      : buyNowCommerce?.product.slug
        ? `/products/${buyNowCommerce.product.slug}`
        : `/products/${leadHardcoreProduct.slug}`,
    reviewPath: reviewArticle ? `/reviews/${reviewArticle.slug}` : null,
    scenarioPath: buildScenarioPseoPath(categorySlug, scenarioTag.slug),
    buyNowHandoffPath: buyNowHardcore?.decision.primaryActionHref || buyNowCommerce?.decision.primaryActionHref || null,
    buyNowProductId: buyNowHardcore?.product.id || buyNowCommerce?.product.id || null
  }
}

function ensureStandaloneStaticAssets() {
  const standaloneRoot = path.join(process.cwd(), '.next', 'standalone')
  const standaloneNextDir = path.join(standaloneRoot, '.next')
  const sourceStatic = path.join(process.cwd(), '.next', 'static')
  const targetStatic = path.join(standaloneNextDir, 'static')
  const sourcePublic = path.join(process.cwd(), 'public')
  const targetPublic = path.join(standaloneRoot, 'public')

  if (!fs.existsSync(sourceStatic)) return
  fs.mkdirSync(standaloneNextDir, { recursive: true })
  if (!fs.existsSync(targetStatic)) {
    fs.symlinkSync(sourceStatic, targetStatic, 'dir')
  }
  if (fs.existsSync(sourcePublic) && !fs.existsSync(targetPublic)) {
    fs.symlinkSync(sourcePublic, targetPublic, 'dir')
  }
}

async function injectAdminSession(context: BrowserContext, adminPassword: string) {
  const loginResponse = await context.request.post('/api/auth/login', {
    data: {
      username: process.env.DEFAULT_ADMIN_USERNAME || DEFAULT_ADMIN_USERNAME,
      password: adminPassword
    },
    maxRedirects: 0
  })
  if (loginResponse.status() !== 200) {
    throw new Error(`browser e2e admin credential authentication failed: ${loginResponse.status()}`)
  }

  const body = await loginResponse.json().catch(() => ({}))
  return body
}

function startServer() {
  const standaloneServer = '.next/standalone/server.js'
  const useStandalone = fs.existsSync(standaloneServer)
  if (useStandalone) ensureStandaloneStaticAssets()
  const child = useStandalone
    ? spawn(process.execPath, [standaloneServer], {
        cwd: process.cwd(),
        env: {
          ...process.env,
          NODE_ENV: 'production',
          PORT: String(port),
          HOSTNAME: '0.0.0.0',
          NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || baseUrl
        },
        stdio: ['ignore', 'pipe', 'pipe']
      })
    : spawn('npm', ['run', 'start', '--', '-p', String(port)], {
        cwd: process.cwd(),
        env: {
          ...process.env,
          NODE_ENV: 'production',
          PORT: String(port),
          HOSTNAME: '0.0.0.0',
          NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || baseUrl
        },
        stdio: ['ignore', 'pipe', 'pipe']
      })
  child.stdout.on('data', (chunk) => process.stdout.write(`[browser-e2e-server] ${chunk}`))
  child.stderr.on('data', (chunk) => process.stdout.write(`[browser-e2e-server] ${chunk}`))
  return child
}

async function stopServer(child: ChildProcessWithoutNullStreams) {
  if (child.exitCode != null) return
  child.kill('SIGTERM')
  await Promise.race([
    new Promise((resolve) => child.once('exit', resolve)),
    wait(5000).then(() => {
      if (child.exitCode == null) child.kill('SIGKILL')
    })
  ])
}

async function waitForServer() {
  const startedAt = Date.now()
  let lastError = ''

  while (Date.now() - startedAt < startupTimeoutMs) {
    try {
      const response = await fetch(`${baseUrl}/api/health`, { redirect: 'manual' })
      if (response.status === 200) return
      lastError = `HTTP ${response.status}`
    } catch (error: any) {
      lastError = error?.message || String(error)
    }
    await wait(500)
  }

  throw new Error(`Timed out waiting for ${baseUrl}: ${lastError}`)
}

async function assertNoHorizontalOverflow(page: Page, label: string) {
  const overflow = await page.evaluate(() => ({
    innerWidth: window.innerWidth,
    scrollWidth: document.documentElement.scrollWidth,
    bodyScrollWidth: document.body.scrollWidth
  }))
  const maxScrollWidth = Math.max(overflow.scrollWidth, overflow.bodyScrollWidth)
  if (maxScrollWidth > overflow.innerWidth + 2) {
    throw new Error(`${label}: horizontal overflow ${maxScrollWidth}px > ${overflow.innerWidth}px`)
  }
}

async function assertText(page: Page, text: string, label: string) {
  const locator = page.getByText(text, { exact: false }).first()
  if (!(await locator.isVisible({ timeout: 8000 }).catch(() => false))) {
    const debug = await page.evaluate(() => ({
      url: window.location.href,
      title: document.title,
      h1: document.querySelector('h1')?.textContent?.replace(/\s+/g, ' ').trim() || '',
      bodyExcerpt: document.body.textContent?.replace(/\s+/g, ' ').trim().slice(0, 500) || ''
    })).catch(() => null)
    throw new Error(`${label}: missing visible text "${text}"${debug ? ` at ${debug.url} h1="${debug.h1}" body="${debug.bodyExcerpt}"` : ''}`)
  }
}

async function assertAnyText(page: Page, texts: string[], label: string) {
  for (const text of texts) {
    const locator = page.getByText(text, { exact: false }).first()
    if (await locator.isVisible({ timeout: 2500 }).catch(() => false)) return
  }
  throw new Error(`${label}: missing any visible text: ${texts.join(' | ')}`)
}

async function gotoAndAssert(page: Page, routePath: string, label: string, texts: string[]) {
  await gotoAppPage(page, routePath)
  for (const text of texts) {
    await assertText(page, text, label)
  }
  await assertNoHorizontalOverflow(page, label)
}

async function assertDecisionSurface(page: Page, label: string) {
  await assertAnyText(page, ['Should you buy it?', 'Top 3 decisions', 'Top buying decisions', 'Default winner', 'Top buy windows', 'Top 3 decision cards'], label)
  await assertAnyText(page, ['Buy now', 'Compare first', 'Watch price', 'Researching', 'Link unavailable', 'Skip'], label)
  await assertAnyText(page, ['Why this decision', 'Evidence', 'Review proof', 'View evidence'], label)
  await assertAnyText(page, ['Bes3 may earn', 'Affiliate disclosure:', 'Commission availability never changes the evidence score or recommendation order.'], label)
}

async function assertSinglePrimaryCtaSemantics(page: Page, label: string) {
  const evidence = await page.evaluate(() => {
    const links = Array.from(document.querySelectorAll<HTMLAnchorElement>('a[href]'))
      .filter((link) => {
        const rect = link.getBoundingClientRect()
        const style = window.getComputedStyle(link)
        return rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none'
      })
      .map((link) => ({
        text: (link.textContent || '').replace(/\s+/g, ' ').trim(),
        href: link.getAttribute('href') || '',
        target: link.getAttribute('target') || '',
        rel: link.getAttribute('rel') || ''
      }))
    const merchantLinks = links.filter((link) => link.href.startsWith('/go/'))
    const unsafeMerchantLinks = merchantLinks.filter((link) => link.target !== '_blank' || !link.rel.includes('noopener') || !link.rel.includes('noreferrer'))
    const internalOperationLinks = links.filter((link) => link.href.startsWith('#'))
    const unsafeInternalLinks = internalOperationLinks.filter((link) => link.target === '_blank' || /↗/.test(link.text))
    const decisionCards = Array.from(document.querySelectorAll<HTMLElement>('section[aria-labelledby^="purchase-decision-"]')).map((card) => ({
      text: (card.textContent || '').replace(/\s+/g, ' ').trim(),
      merchantLinkCount: Array.from(card.querySelectorAll<HTMLAnchorElement>('a[href^="/go/"]')).length
    }))
    const nonBuyCardsWithMerchantLinks = decisionCards.filter((card) =>
      /(Compare first|Watch price|Researching|Link unavailable|Skip)/i.test(card.text) && card.merchantLinkCount > 0
    )
    return {
      merchantLinks,
      unsafeMerchantLinks,
      unsafeInternalLinks,
      nonBuyCardsWithMerchantLinks
    }
  })

  if (evidence.unsafeMerchantLinks.length) {
    throw new Error(`${label}: visible /go CTA must open safely in a new tab`)
  }
  if (evidence.unsafeInternalLinks.length) {
    throw new Error(`${label}: internal operation link should stay in current tab`)
  }
  if (evidence.nonBuyCardsWithMerchantLinks.length) {
    throw new Error(`${label}: No visible /go CTA for non-buy state`)
  }
}

async function assertSeoGeoPayload(page: Page, label: string) {
  const payload = await page.evaluate(() => ({
    ldJsonCount: document.querySelectorAll('script[type="application/ld+json"]').length,
    html: document.documentElement.innerHTML
  }))
  if (payload.ldJsonCount < 1) {
    throw new Error(`${label}: missing application/ld+json SEO/GEO payload`)
  }
  if (!/(decision-notes|AI Answer Summary|Open product JSON|FAQPage|CollectionPage|Product)/i.test(payload.html)) {
    throw new Error(`${label}: missing crawler-readable decision or open JSON payload`)
  }
}

async function assertBuyNowMerchantHandoff(page: Page, href: string | null) {
  if (!href) {
    throw new Error('Plan13 buy_now route discovery did not find a /go merchant handoff')
  }
  const response = await page.request.get(href, { maxRedirects: 0 })
  if (![307, 308].includes(response.status())) {
    throw new Error(`buy_now merchant handoff expected 307/308, got ${response.status()}`)
  }
  const location = response.headers().location || ''
  if (!isCommissionableMerchantUrl(location)) {
    throw new Error(`buy_now merchant handoff is not commissionable: ${location || 'missing location'}`)
  }
}

async function assertPurchaseDecisionViewTracked(page: Page, routePath: string, productId: number | null) {
  const responsePromise = page.waitForResponse((response) => {
    if (!response.url().endsWith('/api/decision-events')) return false
    if (response.request().method() !== 'POST') return false
    const postData = response.request().postData() || ''
    if (!postData.includes('"eventType":"purchase_decision_view"')) return false
    if (!postData.includes('"purchaseDecisionState":"buy_now"')) return false
    if (!postData.includes('"hasMerchantHandoff":true')) return false
    if (productId && !postData.includes(`"productId":${productId}`)) return false
    return true
  }, { timeout: 15000 }).catch(() => null)

  await gotoAppPage(page, routePath)
  await assertText(page, 'Should you buy it?', 'Plan13 tracked purchase decision view')
  await page.waitForLoadState('load', { timeout: 15000 }).catch(() => undefined)

  const trackingResponse = await responsePromise
  if (!trackingResponse) {
    throw new Error('purchase_decision_view event was not posted by the rendered product page')
  }
  if (trackingResponse.status() !== 200) {
    throw new Error(`purchase_decision_view event post failed with ${trackingResponse.status()}`)
  }

  const db = await getDatabase()
  const startedAt = Date.now()
  while (Date.now() - startedAt < 5000) {
    const events = await db.query<{ metadata_json: string | null }>(
      `
        SELECT metadata_json
        FROM buyer_decision_events
        WHERE event_type = 'purchase_decision_view'
          AND (? IS NULL OR product_id = ?)
        ORDER BY created_at DESC, rowid DESC
        LIMIT 20
      `,
      [productId, productId]
    )
    const purchaseDecisionView = events.find((event) => {
      if (!event.metadata_json) return false
      try {
        const metadata = JSON.parse(event.metadata_json)
        return metadata?.purchaseDecisionState === 'buy_now' && metadata?.hasMerchantHandoff === true
      } catch {
        return false
      }
    })
    if (purchaseDecisionView) {
      return
    }

    await wait(250)
  }

  throw new Error('purchase_decision_view event with buy_now decision metadata was not recorded')
}

async function runBrowserChecks(plan13Routes: Plan13TestRoutes) {
  const adminPassword = requireEnv('DEFAULT_ADMIN_PASSWORD')
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({
    baseURL: baseUrl,
    viewport: { width: 1440, height: 1000 }
  })
  const pageErrors: string[] = []
  context.on('page', (page) => {
    page.on('pageerror', (error) => pageErrors.push(error.message))
    page.on('console', (message) => {
      if (message.type() === 'error') pageErrors.push(message.text())
    })
  })

  try {
    const page = await context.newPage()

    await gotoAppPage(page, '/')
    await assertText(page, 'Tech deals checked by Alex', 'desktop home')
    await assertText(page, 'Find Best Picks', 'desktop home')
    await assertText(page, 'Check Current Price', 'desktop home')
    await assertNoHorizontalOverflow(page, 'desktop home')
    console.log('✓ browser home page renders without overflow')

    await assertText(page, 'Find the current price and the catch before you buy tech gear.', 'Plan13 home purchase task routes')
    await assertText(page, 'Independent review signals', 'Plan13 home purchase task routes')
    await assertSinglePrimaryCtaSemantics(page, 'Plan13 home purchase task routes')
    await assertSeoGeoPayload(page, 'Plan13 home purchase task routes')
    console.log('✓ Plan13 home purchase task routes expose conversion-first IA')

    await gotoAppPage(page, '/products')
    await assertText(page, 'Products', 'desktop products')
    await assertNoHorizontalOverflow(page, 'desktop products')
    console.log('✓ browser product directory renders')

    await gotoAndAssert(page, plan13Routes.categoryPath, 'Plan13 category Top 3 decisions', ['Top 3 decisions', 'Best Picks'])
    await assertDecisionSurface(page, 'Plan13 category Top 3 decisions')
    await assertSinglePrimaryCtaSemantics(page, 'Plan13 category Top 3 decisions')
    await assertSeoGeoPayload(page, 'Plan13 category Top 3 decisions')
    console.log(`✓ Plan13 category Top 3 decisions render (${plan13Routes.categoryPath})`)

    await gotoAndAssert(page, plan13Routes.productPath, 'Plan13 product purchase decision', ['Should you buy it?', 'Why this decision'])
    await assertDecisionSurface(page, 'Plan13 product purchase decision')
    await assertSinglePrimaryCtaSemantics(page, 'Plan13 product purchase decision')
    await assertSeoGeoPayload(page, 'Plan13 product purchase decision')
    console.log(`✓ Plan13 product purchase decision renders (${plan13Routes.productPath})`)

    if (plan13Routes.reviewPath) {
      await gotoAndAssert(page, plan13Routes.reviewPath, 'Plan13 review purchase decision', ['Review', 'Decision snapshot'])
      await assertDecisionSurface(page, 'Plan13 review purchase decision')
      await assertSinglePrimaryCtaSemantics(page, 'Plan13 review purchase decision')
      await assertSeoGeoPayload(page, 'Plan13 review purchase decision')
      console.log(`✓ Plan13 review purchase decision renders (${plan13Routes.reviewPath})`)
    } else {
      throw new Error('Plan13 review purchase decision requires a public review article with evidence')
    }

    await gotoAndAssert(page, '/deals', 'Plan13 deals buy window', ['Buy Window', 'Top buy windows'])
    await assertDecisionSurface(page, 'Plan13 deals buy window')
    await assertSinglePrimaryCtaSemantics(page, 'Plan13 deals buy window')
    await assertSeoGeoPayload(page, 'Plan13 deals buy window')
    console.log('✓ Plan13 deals buy window renders')

    await gotoAndAssert(page, plan13Routes.dealDetailPath, 'Plan13 deal detail decision cards', ['Top 3 decision cards', 'buy now, compare first, watch price, or skip'])
    await assertDecisionSurface(page, 'Plan13 deal detail decision cards')
    await assertSinglePrimaryCtaSemantics(page, 'Plan13 deal detail decision cards')
    await assertSeoGeoPayload(page, 'Plan13 deal detail decision cards')
    console.log(`✓ Plan13 deal detail decision cards render (${plan13Routes.dealDetailPath})`)

    await gotoAndAssert(page, plan13Routes.scenarioPath, 'Plan13 scenario Top buying decisions', ['BLUF:', 'Top buying decisions'])
    await assertDecisionSurface(page, 'Plan13 scenario Top buying decisions')
    await assertSinglePrimaryCtaSemantics(page, 'Plan13 scenario Top buying decisions')
    await assertSeoGeoPayload(page, 'Plan13 scenario Top buying decisions')
    console.log(`✓ Plan13 scenario Top buying decisions render (${plan13Routes.scenarioPath})`)

    await gotoAndAssert(page, '/compare', 'Plan13 compare default winner', ['Default winner', 'Start with a default winner'])
    await assertDecisionSurface(page, 'Plan13 compare default winner')
    await assertSinglePrimaryCtaSemantics(page, 'Plan13 compare default winner')
    await assertSeoGeoPayload(page, 'Plan13 compare default winner')
    console.log('✓ Plan13 compare default winner renders')

    await assertBuyNowMerchantHandoff(page, plan13Routes.buyNowHandoffPath)
    console.log('✓ Plan13 buy_now /go merchant handoff redirects to commissionable URL')

    await assertPurchaseDecisionViewTracked(page, plan13Routes.productPath, plan13Routes.buyNowProductId)
    console.log('✓ Plan13 purchase_decision_view denominator event carries buy_now metadata')

    const coverageResponse = await page.request.get('/api/open/coverage')
    if (coverageResponse.status() !== 200) throw new Error(`coverage manifest status ${coverageResponse.status()}`)
    const coverage = await coverageResponse.json()
    if (coverage.feedType !== 'coverage-manifest-v1') throw new Error('coverage manifest feedType mismatch')
    if (coverage.planv2Readiness?.publicLoginEntryExposed !== false) throw new Error('coverage manifest readiness mismatch')
    console.log('✓ browser context can read open coverage manifest')

    const redirectResponse = await page.request.get('/go/999999999?source=evidence-review', {
      maxRedirects: 0
    })
    if (![307, 308].includes(redirectResponse.status())) {
      throw new Error(`commercial redirect fallback status failed: ${redirectResponse.status()}`)
    }
    const redirectLocation = redirectResponse.headers().location || ''
    const redirectPath = redirectLocation.startsWith('http') ? new URL(redirectLocation).pathname : redirectLocation
    if (!['/directory', '/categories', '/products'].includes(redirectPath)) {
      throw new Error(`commercial redirect fallback failed: location=${redirectLocation || 'none'}`)
    }
    console.log('✓ browser commercial redirect family safely degrades')

    const anonymousResponse = await page.request.get('/api/auth/me')
    if (anonymousResponse.status() !== 401) throw new Error(`anonymous /api/auth/me expected 401, got ${anonymousResponse.status()}`)
    const loginBody = await injectAdminSession(context, adminPassword)
    const authenticatedProbe = await page.request.get('/api/auth/me')
    if (authenticatedProbe.status() !== 200) {
      throw new Error(`injected admin session was not accepted by /api/auth/me: ${authenticatedProbe.status()}`)
    }
    await gotoAppPage(page, loginBody.mustChangePassword ? '/change-password' : '/admin')
    if (!['/admin', '/change-password'].includes(new URL(page.url()).pathname)) {
      throw new Error(`authenticated admin did not reach protected area: ${page.url()}`)
    }
    const meResponse = await page.request.get('/api/auth/me')
    if (meResponse.status() !== 200) throw new Error(`authenticated /api/auth/me failed with ${meResponse.status()}`)
    const me = await meResponse.json()
    if (!me?.user?.role || me.user.role !== 'admin') throw new Error('authenticated user is not admin')
    console.log(`✓ browser admin session works (${page.url().includes('/change-password') ? 'password-change-required' : 'admin-console'})`)

    const mobileContext = await browser.newContext({
      baseURL: baseUrl,
      viewport: { width: 390, height: 844 },
      isMobile: true
    })
    mobileContext.on('page', (mobile) => {
      mobile.on('pageerror', (error) => pageErrors.push(error.message))
      mobile.on('console', (message) => {
        if (message.type() === 'error') pageErrors.push(message.text())
      })
    })
    const mobilePage = await mobileContext.newPage()
    await gotoAppPage(mobilePage, '/')
    await assertText(mobilePage, 'Tech deals checked by Alex', 'mobile home')
    await assertText(mobilePage, 'Find Best Picks', 'mobile home')
    await assertNoHorizontalOverflow(mobilePage, 'mobile home')
    await assertSinglePrimaryCtaSemantics(mobilePage, 'mobile home')
    await gotoAppPage(mobilePage, '/products')
    await assertNoHorizontalOverflow(mobilePage, 'mobile products')
    await gotoAppPage(mobilePage, plan13Routes.productPath)
    await assertText(mobilePage, 'Should you buy it?', 'mobile Plan13 product purchase decision')
    await assertDecisionSurface(mobilePage, 'mobile Plan13 product purchase decision')
    await assertSinglePrimaryCtaSemantics(mobilePage, 'mobile Plan13 product purchase decision')
    await assertNoHorizontalOverflow(mobilePage, 'mobile Plan13 product purchase decision')
    await mobilePage.close()
    await mobileContext.close()
    console.log('✓ mobile browser surfaces render without horizontal overflow')

    if (pageErrors.length > 0) {
      throw new Error(`browser console/page errors: ${pageErrors.slice(0, 5).join(' | ')}`)
    }

    console.log('PlanV2 browser E2E check passed with Plan13/14 purchase decision coverage')
  } finally {
    await browser.close()
  }
}

async function main() {
  await bootstrapApplication()
  const insertedLocalFixtures = await ensurePlan13LocalFixtureData()
  const plan13Routes = await findPlan13TestRoutes()
  console.log(`✓ Plan13 browser routes: ${JSON.stringify(plan13Routes)}`)
  const child = startServer()
  try {
    await waitForServer()
    await runBrowserChecks(plan13Routes)
  } finally {
    await stopServer(child)
    if (insertedLocalFixtures) {
      await cleanPlan13LocalFixtureData(await getDatabase())
      console.log('✓ Plan13 local browser fixture data cleaned up')
    }
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
