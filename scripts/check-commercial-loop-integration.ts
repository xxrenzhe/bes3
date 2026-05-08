#!/usr/bin/env tsx

import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

type CheckResult = {
  label: string
  ok: boolean
  detail?: string
}

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bes3-commercial-loop-'))
const databasePath = path.join(tempDir, 'commercial-loop.db')

process.env.DATABASE_PATH = databasePath
delete process.env.DATABASE_URL
process.env.NODE_ENV = 'test'
process.env.NEXT_PUBLIC_APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
process.env.JWT_SECRET = process.env.JWT_SECRET || 'commercial-loop-integration-secret-at-least-32-chars'
process.env.DEFAULT_ADMIN_PASSWORD = process.env.DEFAULT_ADMIN_PASSWORD || 'CommercialLoopTest!23456'

function assertCondition(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message)
}

function readRepoFile(filePath: string) {
  return fs.readFileSync(path.join(process.cwd(), filePath), 'utf8')
}

function staticCheck(label: string, filePath: string, required: string[]): CheckResult {
  const content = readRepoFile(filePath)
  const missing = required.filter((needle) => !content.includes(needle))
  return {
    label,
    ok: missing.length === 0,
    detail: missing.length ? `Missing: ${missing.join(', ')}` : filePath
  }
}

async function seedCommercialLoopFixture() {
  const { getDatabase } = await import('@/lib/db')
  const db = await getDatabase()

  const tag = await db.queryOne<{ id: number }>(
    'SELECT id FROM taxonomy_tags WHERE category_slug = ? ORDER BY is_core_painpoint DESC, id ASC LIMIT 1',
    ['yard-pool-automation']
  )
  assertCondition(tag?.id, 'No seeded yard-pool-automation taxonomy tag found')

  const affiliateInsert = await db.exec(
    `
      INSERT INTO affiliate_products (
        platform,
        external_id,
        merchant_id,
        asin,
        brand,
        category,
        category_slug,
        product_name,
        product_url,
        promo_link,
        short_promo_link,
        image_url,
        price_amount,
        price_currency,
        commission_rate,
        review_count,
        rating,
        country_code,
        youtube_match_terms_json,
        raw_payload
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      'partnerboost_amazon',
      'commercial-loop-test-poolbot',
      'merchant-test',
      'B0CLTEST01',
      'AquaProof',
      'Yard & Pool Automation',
      'yard-pool-automation',
      'AquaProof Wall-Climb Pool Robot',
      'https://example.com/products/aquaproof-wall-climb-pool-robot',
      'https://pboost.me/commercial-loop-test',
      'https://pboost.me/commercial-loop-test',
      'https://example.com/images/aquaproof.jpg',
      499,
      'USD',
      8,
      128,
      4.6,
      'US',
      JSON.stringify(['AquaProof pool robot wall climb review', 'B0CLTEST01 review']),
      JSON.stringify({ fixture: true })
    ]
  )
  const affiliateProductId = Number(affiliateInsert.lastInsertRowid || 0)
  assertCondition(affiliateProductId > 0, 'Affiliate fixture insert failed')

  const productInsert = await db.exec(
    `
      INSERT INTO products (
        affiliate_product_id,
        source_platform,
        source_affiliate_link,
        resolved_url,
        canonical_url,
        slug,
        brand,
        product_name,
        category,
        category_slug,
        price_amount,
        price_currency,
        current_price,
        hist_low_price,
        avg_90d_price,
        rating,
        review_count,
        asin,
        youtube_match_terms_json,
        source_payload_json,
        published_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `,
    [
      affiliateProductId,
      'partnerboost_amazon',
      'https://pboost.me/commercial-loop-test',
      'https://pboost.me/commercial-loop-test',
      'https://example.com/products/aquaproof-wall-climb-pool-robot',
      'aquaproof-wall-climb-pool-robot',
      'AquaProof',
      'AquaProof Wall-Climb Pool Robot',
      'Yard & Pool Automation',
      'yard-pool-automation',
      499,
      'USD',
      429,
      399,
      469,
      4.6,
      128,
      'B0CLTEST01',
      JSON.stringify(['AquaProof pool robot wall climb review', 'B0CLTEST01 review']),
      JSON.stringify({ fixture: true })
    ]
  )
  const productId = Number(productInsert.lastInsertRowid || 0)
  assertCondition(productId > 0, 'Product fixture insert failed')

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
      ) VALUES (?, ?, ?, ?, 'US', ?, 'active', CURRENT_TIMESTAMP)
    `,
    [
      productId,
      'partnerboost_amazon',
      'https://pboost.me/commercial-loop-test',
      'https://example.com/products/aquaproof-wall-climb-pool-robot',
      8
    ]
  )

  const videoInsert = await db.exec(
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
        published_at,
        entity_match_json
      ) VALUES (?, ?, ?, 2, 'specialist', ?, 'long-form', ?, ?, 'success', ?, ?)
    `,
    [
      'commercialLoopTest001',
      'Pool Gear Lab',
      'https://www.youtube.com/@poolgearlab',
      'AquaProof Wall-Climb Pool Robot real wall climbing review',
      'The robot climbed tile walls reliably and recovered after drains without losing suction.',
      'Hands-on pool robot test with wall climbing, drain recovery, and debris pickup.',
      '2026-05-01T00:00:00.000Z',
      JSON.stringify({
        matchedAt: new Date().toISOString(),
        productId,
        confidence: 1,
        strategy: 'asin',
        reason: 'Fixture ASIN match for commercial loop integration.'
      })
    ]
  )
  const videoId = Number(videoInsert.lastInsertRowid || 0)
  assertCondition(videoId > 0, 'Video fixture insert failed')

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
      ) VALUES (?, ?, ?, 'Excellent', ?, 184, ?, 0.95, 'standard-review', 0, ?)
    `,
    [
      productId,
      videoId,
      tag.id,
      'It climbed tile walls reliably and did not lose suction around the main drain.',
      'Wall-climb and drain recovery test segment.',
      JSON.stringify({ fixture: true, commercial_loop: true })
    ]
  )

  const nonMonetizableInsert = await db.exec(
    `
      INSERT INTO affiliate_products (
        platform,
        external_id,
        merchant_id,
        asin,
        brand,
        category,
        category_slug,
        product_name,
        product_url,
        promo_link,
        short_promo_link,
        image_url,
        price_amount,
        price_currency,
        commission_rate,
        review_count,
        rating,
        country_code,
        youtube_match_terms_json,
        raw_payload
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      'partnerboost_dtc',
      'commercial-loop-no-promo',
      'merchant-test',
      'B0NOPROMO1',
      'NoPromo',
      'Yard & Pool Automation',
      'yard-pool-automation',
      'NoPromo High Score Pool Robot',
      'https://example.com/products/no-promo-pool-robot',
      'https://example.com/images/no-promo.jpg',
      899,
      'USD',
      12,
      999,
      4.9,
      'US',
      JSON.stringify(['NoPromo pool robot wall climb review', 'B0NOPROMO1 review']),
      JSON.stringify({ fixture: true, expectedBlockReason: 'missing_affiliate_promotion_link' })
    ]
  )
  const nonMonetizableAffiliateProductId = Number(nonMonetizableInsert.lastInsertRowid || 0)
  assertCondition(nonMonetizableAffiliateProductId > 0, 'Non-monetizable affiliate fixture insert failed')

  const hiddenProductInsert = await db.exec(
    `
      INSERT INTO products (
        source_platform,
        source_affiliate_link,
        resolved_url,
        canonical_url,
        slug,
        brand,
        product_name,
        category,
        category_slug,
        price_amount,
        price_currency,
        current_price,
        rating,
        review_count,
        youtube_match_terms_json,
        source_payload_json,
        published_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `,
    [
      'manual_fixture',
      'https://example.com/products/no-commission-no-video-pool-robot',
      'https://example.com/products/no-commission-no-video-pool-robot',
      'https://example.com/products/no-commission-no-video-pool-robot',
      'no-commission-no-video-pool-robot',
      'NoProof',
      'NoProof No Commission No Video Pool Robot',
      'Yard & Pool Automation',
      'yard-pool-automation',
      299,
      'USD',
      299,
      4.2,
      12,
      JSON.stringify(['NoProof pool robot review']),
      JSON.stringify({ fixture: true, expectedBlockReason: 'no_commission_no_video_evidence' })
    ]
  )
  const hiddenProductId = Number(hiddenProductInsert.lastInsertRowid || 0)
  assertCondition(hiddenProductId > 0, 'Hidden no-commission/no-video product insert failed')

  const hiddenArticleInsert = await db.exec(
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
        status,
        published_at
      ) VALUES (?, 'review', ?, ?, ?, ?, ?, ?, ?, ?, 'published', CURRENT_TIMESTAMP)
    `,
    [
      hiddenProductId,
      'NoProof No Commission No Video Pool Robot Review',
      'noproof-no-commission-no-video-pool-robot-review',
      'This fixture should never be publicly routable because it lacks commission and review video evidence.',
      'NoProof no commission no video review',
      'Fixture review without evidence.',
      '<p>Fixture review without evidence.</p>',
      'NoProof No Commission No Video Pool Robot Review',
      'Fixture review without evidence.'
    ]
  )
  const hiddenArticleId = Number(hiddenArticleInsert.lastInsertRowid || 0)
  assertCondition(hiddenArticleId > 0, 'Hidden no-commission/no-video review article insert failed')

  return { affiliateProductId, productId, nonMonetizableAffiliateProductId, hiddenProductId, hiddenArticleId }
}

async function runDatabaseIntegrationCheck(): Promise<CheckResult[]> {
  const { bootstrapApplication } = await import('@/lib/bootstrap')
  const { getDatabase } = await import('@/lib/db')
  const { runCommercialLoop } = await import('@/lib/commercial-loop')
  const { getBrowserProxyUrl, resolveBrowserProxy } = await import('@/lib/browser-proxy')
  const { NextRequest } = await import('next/server')
  const merchantExitRoute = await import('@/app/go/[productId]/route')
  const categorySemantics = await import('@/lib/product-category')

  await bootstrapApplication()
  const db = await getDatabase()
  process.env.BROWSER_PROXY_URLS_JSON = JSON.stringify([
    { country: 'US', url: 'proxy.example.test:8080:user:pass' }
  ])
  await db.exec(
    `
      UPDATE system_settings
      SET value = '[]'
      WHERE category = 'proxy' AND key = 'urls'
    `
  )
  const envProxy = await resolveBrowserProxy('US')
  const ytDlpProxyUrl = await getBrowserProxyUrl('US')
  const fixture = await seedCommercialLoopFixture()
  const result = await runCommercialLoop({
    execute: true,
    syncPlatform: 'none',
    limit: 5,
    minScore: 1,
    discoverVideos: false,
    enrichProducts: false,
    fetchTranscripts: false,
    extractEvidence: false,
    publishArticles: true,
    pushIndex: false,
    maxVideosPerProduct: 1
  })

  const article = await db.queryOne<{
    id: number
    title: string
    slug: string
    keyword: string | null
    content_html: string
    status: string
  }>(
    'SELECT id, title, slug, keyword, content_html, status FROM articles WHERE product_id = ? AND article_type = ? LIMIT 1',
    [fixture.productId, 'review']
  )
  const seoPage = article
    ? await db.queryOne<{ id: number; pathname: string; status: string; schema_json: string | null }>(
        'SELECT id, pathname, status, schema_json FROM seo_pages WHERE article_id = ? LIMIT 1',
        [article.id]
      )
    : null
  const publishEvent = seoPage
    ? await db.queryOne<{ id: number }>(
        'SELECT id FROM publish_events WHERE seo_page_id = ? AND event_type = ? LIMIT 1',
        [seoPage.id, 'commercial_loop.review_published']
      )
    : null
  const affiliateLink = await db.queryOne<{ id: number; status: string; affiliate_url: string }>(
    'SELECT id, status, affiliate_url FROM affiliate_links WHERE product_id = ? AND platform = ? AND country_code = ? LIMIT 1',
    [fixture.productId, 'partnerboost_amazon', 'US']
  )
  const siteData = await import('@/lib/site-data')
  const publicArticle = article?.slug ? await siteData.getArticleBySlug(article.slug) : null
  const sitemapSourceArticles = await siteData.listPublishedArticles()
  const openCommerceProducts = await siteData.listOpenCommerceProducts()
  const hiddenOpenProduct = await siteData.getOpenCommerceProductBySlug('no-commission-no-video-pool-robot')
  const hiddenPublicArticle = await siteData.getArticleBySlug('noproof-no-commission-no-video-pool-robot-review')
  const lomonCategory = categorySemantics.inferProductCategory({
    productName: 'LOMON Womens Fuzzy Sherpa Fleece Jacket Lightweight Vest Cozy Sleeveless Cardigan Zipper Waistcoat Outerwear With Pocket',
    category: 'tech'
  })
  const hardcore = await import('@/lib/hardcore')
  const hardcoreProducts = await hardcore.listHardcoreProducts()
  const hiddenHardcoreProduct = await hardcore.getHardcoreProductBySlug('no-commission-no-video-pool-robot')
  const merchantResponse = await merchantExitRoute.GET(
    new NextRequest(`http://localhost:3000/go/${fixture.productId}?source=evidence-review&visitor=commercial-loop-visitor`, {
      headers: {
        referer: `http://localhost:3000/reviews/${article?.slug || ''}`,
        'user-agent': 'Bes3CommercialLoopIntegration/1.0'
      }
    }),
    { params: Promise.resolve({ productId: String(fixture.productId) }) }
  )
  const merchantClick = await db.queryOne<{
    id: number
    source: string
    visitor_id: string | null
    target_url: string | null
    metadata_json: string | null
  }>(
    `
      SELECT id, source, visitor_id, target_url, metadata_json
      FROM merchant_click_events
      WHERE product_id = ?
      ORDER BY id DESC
      LIMIT 1
    `,
    [fixture.productId]
  )
  const decisionMetadataResponse = await merchantExitRoute.GET(
    new NextRequest(
      `http://localhost:3000/go/${fixture.productId}?source=product-decision-card&visitor=commercial-loop-pd-visitor&pageType=product&pdState=buy_now&priceStatus=great-value&evidenceCount=7&ctaVariant=buy-now-product`,
      {
        headers: {
          referer: `http://localhost:3000/products/aquaproof-wall-climb-pool-robot`,
          'user-agent': 'Bes3CommercialLoopIntegration/1.0'
        }
      }
    ),
    { params: Promise.resolve({ productId: String(fixture.productId) }) }
  )
  const decisionMetadataClick = await db.queryOne<{
    id: number
    source: string
    visitor_id: string | null
    target_url: string | null
    metadata_json: string | null
  }>(
    `
      SELECT id, source, visitor_id, target_url, metadata_json
      FROM merchant_click_events
      WHERE product_id = ? AND visitor_id = ?
      ORDER BY id DESC
      LIMIT 1
    `,
    [fixture.productId, 'commercial-loop-pd-visitor']
  )
  const metadata = decisionMetadataClick?.metadata_json
    ? JSON.parse(decisionMetadataClick.metadata_json) as Record<string, unknown>
    : null

  return [
    {
      label: 'browser proxy falls back to env when stored pool is empty',
      ok: Boolean(envProxy?.host === 'proxy.example.test' && envProxy.port === 8080 && envProxy.username === 'user'),
      detail: envProxy ? `${envProxy.host}:${envProxy.port}` : 'missing env proxy'
    },
    {
      label: 'yt-dlp proxy uses normalized authenticated URL',
      ok: ytDlpProxyUrl === 'http://user:pass@proxy.example.test:8080',
      detail: ytDlpProxyUrl ? ytDlpProxyUrl.replace('user:pass@', '[redacted]@') : 'missing yt-dlp proxy'
    },
    {
      label: 'commercial loop selects affiliate fixture',
      ok: result.selected.some((candidate) => candidate.affiliateProductId === fixture.affiliateProductId),
      detail: `selected=${result.selected.length}, skipped=${result.skipped.length}`
    },
    {
      label: 'commercial loop emits commission-blind ranking audit',
      ok: Boolean(
        result.commissionBlindAudit.items.length &&
          result.commissionBlindAudit.items.some((item) => item.affiliateProductId === fixture.affiliateProductId) &&
          result.selected.every((candidate) => Number.isFinite(candidate.commissionBlindReviewScore))
      ),
      detail: `flagged=${result.commissionBlindAudit.flaggedCount}`
    },
    {
      label: 'commercial loop blocks high-score products without affiliate promotion links',
      ok: Boolean(
        !result.selected.some((candidate) => candidate.affiliateProductId === fixture.nonMonetizableAffiliateProductId) &&
          result.skipped.some((item) => item.scope === `candidate:${fixture.nonMonetizableAffiliateProductId}` && item.reason === 'missing_affiliate_promotion_link')
      ),
      detail: `blocked=${fixture.nonMonetizableAffiliateProductId}`
    },
    {
      label: 'commercial loop publishes unique evidence review article',
      ok: Boolean(
        article?.status === 'published' &&
          article.content_html.includes('Evidence Verdict') &&
          article.content_html.includes('YouTube Evidence Matrix') &&
          article.content_html.includes('It climbed tile walls reliably') &&
          article.content_html.includes('Review by Pool Gear Lab')
      ),
      detail: article ? `${article.title} / ${article.slug}` : 'missing article'
    },
    {
      label: 'commercial loop creates pSEO review page',
      ok: Boolean(
        seoPage?.status === 'published' &&
          seoPage.pathname === `/reviews/${article?.slug}` &&
          seoPage.schema_json?.includes('"@type":"Review"') &&
          article?.keyword?.includes('review after YouTube tests')
      ),
      detail: seoPage ? seoPage.pathname : 'missing seo page'
    },
    {
      label: 'commercial loop review is publicly readable by long-tail slug',
      ok: Boolean(
        publicArticle?.type === 'review' &&
          publicArticle.slug === article?.slug &&
          publicArticle.keyword?.includes('review after YouTube tests') &&
          publicArticle.contentHtml.includes('YouTube Evidence Matrix')
      ),
      detail: publicArticle ? `/reviews/${publicArticle.slug}` : 'missing public article'
    },
    {
      label: 'commercial loop review is included in sitemap source',
      ok: sitemapSourceArticles.some((item) => item.type === 'review' && item.slug === article?.slug),
      detail: `${sitemapSourceArticles.length} published article(s)`
    },
    {
      label: 'public product layer blocks no-commission/no-video products',
      ok: Boolean(
        !openCommerceProducts.some((item) => item.id === fixture.hiddenProductId) &&
          hiddenOpenProduct === null
      ),
      detail: hiddenOpenProduct ? `leaked=${hiddenOpenProduct.slug}` : `blocked=${fixture.hiddenProductId}`
    },
    {
      label: 'public review layer blocks review articles without video evidence',
      ok: Boolean(
        hiddenPublicArticle === null &&
          !sitemapSourceArticles.some((item) => item.id === fixture.hiddenArticleId)
      ),
      detail: hiddenPublicArticle ? `leaked=${hiddenPublicArticle.slug}` : `blocked=${fixture.hiddenArticleId}`
    },
    {
      label: 'public category semantics correct obvious apparel products',
      ok: lomonCategory.category === 'Apparel' && lomonCategory.categorySlug === 'apparel',
      detail: `${lomonCategory.category || 'null'} / ${lomonCategory.categorySlug || 'null'}`
    },
    {
      label: 'hardcore evidence layer blocks no-commission/no-video products',
      ok: Boolean(
        hiddenHardcoreProduct === null &&
          !hardcoreProducts.some((item) => item.id === fixture.hiddenProductId)
      ),
      detail: hiddenHardcoreProduct ? `leaked=${hiddenHardcoreProduct.slug}` : `blocked=${fixture.hiddenProductId}`
    },
    {
      label: 'commercial loop records publish event',
      ok: Boolean(publishEvent?.id),
      detail: publishEvent ? `event=${publishEvent.id}` : 'missing publish event'
    },
    {
      label: 'commercial loop keeps affiliate promotion path active',
      ok: Boolean(
        affiliateLink?.status === 'active' &&
          article?.content_html.includes(`/go/${fixture.productId}?source=evidence-review`) &&
          article?.content_html.includes('rel="nofollow sponsored"')
      ),
      detail: affiliateLink ? affiliateLink.affiliate_url : 'missing affiliate link'
    },
    {
      label: 'commercial loop merchant CTA redirects and records attribution',
      ok: Boolean(
        merchantResponse.status === 307 &&
          merchantResponse.headers.get('location') === 'https://pboost.me/commercial-loop-test' &&
          merchantClick?.source === 'evidence-review' &&
          merchantClick.visitor_id === 'commercial-loop-visitor' &&
          merchantClick.target_url === 'https://pboost.me/commercial-loop-test'
      ),
      detail: merchantClick ? `${merchantClick.source} -> ${merchantClick.target_url}` : 'missing merchant click'
    },
    {
      label: 'purchase decision metadata reaches merchant click attribution',
      ok: Boolean(
        decisionMetadataResponse.status === 307 &&
          decisionMetadataClick?.source === 'product-decision-card' &&
          decisionMetadataClick.visitor_id === 'commercial-loop-pd-visitor' &&
          metadata?.pageType === 'product' &&
          metadata?.purchaseDecisionState === 'buy_now' &&
          metadata?.priceStatus === 'great-value' &&
          metadata?.evidenceCount === 7 &&
          metadata?.ctaVariant === 'buy-now-product'
      ),
      detail: decisionMetadataClick?.metadata_json || 'missing purchase decision metadata'
    }
  ]
}

async function main() {
  const checks: CheckResult[] = [
    staticCheck('PartnerBoost tokens are loaded from env/settings', 'src/lib/partnerboost.ts', [
      'PARTNERBOOST_AMAZON_TOKEN',
      'PARTNERBOOST_DTC_TOKEN',
      'syncPartnerboostAmazonProducts',
      'syncPartnerboostDtcProducts'
    ]),
    staticCheck('Commercial loop discovers valuable YouTube reviews', 'src/lib/commercial-loop.ts', [
      'https://www.youtube.com/results',
      'review test teardown',
      'fetchWithBrowserProxy',
      'upsertReviewVideo'
    ]),
    staticCheck('Commercial loop fetches transcript safely', 'src/lib/commercial-loop.ts', [
      'yt-dlp',
      'getBrowserProxyUrl',
      "result = runYtDlp('')",
      '--skip-download',
      '--write-auto-sub',
      '--write-sub',
      '--sleep-interval',
      '--max-sleep-interval'
    ]),
    staticCheck('Commercial loop extracts evidence with hard validations', 'src/lib/commercial-loop.ts', [
      'buildVideoEvidencePrompt',
      'parseVideoEvidenceWithRetry',
      'shouldKeepPositiveEvidence',
      'analysis_reports'
    ]),
    staticCheck('Commercial loop exposes CLI runbook', 'scripts/run-commercial-loop.ts', [
      "hasFlag('execute')",
      "readFlag('sync')",
      'fetchTranscripts:',
      "hasFlag('push-index')",
      'runCommercialLoop'
    ]),
    staticCheck('Commercial loop package script exists', 'package.json', ['commercial-loop:run']),
    staticCheck('Commercial loop enforces conversion eligibility', 'src/lib/commercial-loop.ts', [
      'hasAffiliatePromotionLink',
      'getCommissionableMerchantUrl',
      'missing_affiliate_promotion_link',
      'qualified.filter(hasAffiliatePromotionLink)'
    ]),
    staticCheck('Public data layer blocks products without commission or video evidence', 'src/lib/site-data.ts', [
      'isPublicProduct',
      'publicEvidenceCount > 0',
      'isPublicArticle',
      'getCommissionableMerchantUrl'
    ]),
    staticCheck('Evidence product layer blocks products without commission or evidence', 'src/lib/hardcore.ts', [
      'Boolean(product.affiliateUrl) || product.consensus.evidenceCount > 0'
    ]),
    staticCheck('Commercial loop audits commission influence separately from evidence fit', 'src/lib/commercial-loop.ts', [
      'auditCommissionBlindCandidateOrder',
      'commissionBlindAudit',
      'commissionBlindReviewScore'
    ]),
    staticCheck('Commercial loop live readiness runbook exists', 'scripts/check-commercial-loop-live-readiness.ts', [
      'recommendedSampleSize',
      '--execute',
      'runCommercialLoop'
    ]),
    staticCheck('Commercial loop live readiness package script exists', 'package.json', ['commercial-loop:check-live-readiness']),
    staticCheck('Published reviews are publicly routable', 'src/app/reviews/[slug]/page.tsx', [
      'getArticleBySlug',
      'EditorialArticlePage',
      'article.type !==',
      'review'
    ]),
    staticCheck('Editorial sitemap includes generated reviews', 'src/app/editorial/sitemap.ts', [
      'listPublishedArticles',
      'getArticlePath',
      'article.type ===',
      'review'
    ]),
    staticCheck('Affiliate redirect records click attribution', 'src/app/go/[productId]/route.ts', [
      'recordMerchantClick',
      'getCommissionableMerchantUrl',
      'normalizeMerchantSource',
      'NextResponse.redirect',
      'source_affiliate_link'
    ]),
    staticCheck('FTC disclosure and cookie compliance are visible', 'src/components/layout/PublicShell.tsx', [
      'CookieConsentBanner',
      'we may earn a commission'
    ])
  ]

  checks.push(...await runDatabaseIntegrationCheck())

  const failures = checks.filter((check) => !check.ok)
  if (failures.length) {
    console.error('Commercial loop integration check failed:')
    for (const failure of failures) {
      console.error(`- ${failure.label}: ${failure.detail || 'failed'}`)
    }
    process.exit(1)
  }

  for (const check of checks) {
    console.log(`✓ ${check.label}${check.detail ? ` (${check.detail})` : ''}`)
  }
  console.log(`Commercial loop integration check passed with ${checks.length} checks`)
}

main().finally(() => {
  fs.rmSync(tempDir, { recursive: true, force: true })
}).catch((error) => {
  console.error(error)
  process.exit(1)
})
