#!/usr/bin/env tsx

import './load-env'
import fs from 'node:fs/promises'
import path from 'node:path'
import { DEFAULT_ADMIN_USERNAME } from '@/lib/constants'

type AuditStatus = 'passed' | 'failed'

type AuditResult = {
  area: string
  name: string
  status: AuditStatus
  detail?: string
  evidence?: Record<string, unknown>
}

type FetchOptions = {
  method?: 'GET' | 'POST'
  body?: unknown
  authenticated?: boolean
  expectedStatus?: number | number[]
}

const baseUrl = normalizeBaseUrl(process.env.PRODUCTION_BUSINESS_AUDIT_BASE_URL || process.env.PRODUCTION_E2E_BASE_URL || 'https://www.bes3.com')
const adminUsername = process.env.PRODUCTION_BUSINESS_AUDIT_ADMIN_USERNAME || process.env.PRODUCTION_E2E_ADMIN_USERNAME || process.env.DEFAULT_ADMIN_USERNAME || DEFAULT_ADMIN_USERNAME
const adminPassword = process.env.PRODUCTION_BUSINESS_AUDIT_ADMIN_PASSWORD || process.env.PRODUCTION_E2E_ADMIN_PASSWORD || process.env.DEFAULT_ADMIN_PASSWORD || ''
const outputDir = process.env.PRODUCTION_BUSINESS_AUDIT_OUTPUT_DIR || 'qa-results'
const minQualifiedProducts = readIntegerEnv('PRODUCTION_BUSINESS_AUDIT_MIN_PRODUCTS', 1)
const minQualifiedReviews = readIntegerEnv('PRODUCTION_BUSINESS_AUDIT_MIN_REVIEWS', 1)
const minQualifiedEvidenceReports = readIntegerEnv('PRODUCTION_BUSINESS_AUDIT_MIN_EVIDENCE_REPORTS', 1)
const minLongTailIntentSources = readIntegerEnv('PRODUCTION_BUSINESS_AUDIT_MIN_LONG_TAIL_INTENTS', 1)
const requestTimeoutMs = readIntegerEnv('PRODUCTION_BUSINESS_AUDIT_REQUEST_TIMEOUT_MS', 30000)

const results: AuditResult[] = []
let authCookie = ''

function normalizeBaseUrl(value: string) {
  return value.replace(/\/+$/, '')
}

function readIntegerEnv(key: string, fallback: number) {
  const parsed = Number.parseInt(process.env[key] || '', 10)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback
}

function absoluteUrl(routePath: string) {
  return `${baseUrl}${routePath.startsWith('/') ? routePath : `/${routePath}`}`
}

function statusMatches(actual: number, expected: number | number[] | undefined) {
  if (expected == null) return actual >= 200 && actual < 300
  return Array.isArray(expected) ? expected.includes(actual) : actual === expected
}

function addResult(result: AuditResult) {
  results.push(result)
  const prefix = result.status === 'passed' ? 'PASS' : 'FAIL'
  const suffix = result.detail ? ` - ${result.detail}` : ''
  console.log(`${prefix} [${result.area}] ${result.name}${suffix}`)
}

async function auditStep(area: string, name: string, action: () => Promise<Record<string, unknown> | void>) {
  try {
    const evidence = await action()
    addResult({ area, name, status: 'passed', evidence: evidence || undefined })
  } catch (error: any) {
    addResult({ area, name, status: 'failed', detail: error?.message || String(error) })
  }
}

async function requestJson<T = any>(routePath: string, options: FetchOptions = {}): Promise<T> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), requestTimeoutMs)
  try {
    const headers: Record<string, string> = {
      Accept: 'application/json'
    }
    if (options.body !== undefined) headers['Content-Type'] = 'application/json'
    if (options.authenticated && authCookie) headers.Cookie = authCookie

    const response = await fetch(absoluteUrl(routePath), {
      method: options.method || 'GET',
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
      signal: controller.signal,
      redirect: 'manual'
    })

    const contentType = response.headers.get('content-type') || ''
    const text = await response.text()
    const json = contentType.includes('application/json') && text ? JSON.parse(text) : null
    if (!statusMatches(response.status, options.expectedStatus)) {
      throw new Error(`${routePath} expected ${options.expectedStatus || '2xx'}, got ${response.status}: ${text.slice(0, 240)}`)
    }
    return json as T
  } finally {
    clearTimeout(timeout)
  }
}

async function login() {
  if (!adminPassword) {
    throw new Error('PRODUCTION_BUSINESS_AUDIT_ADMIN_PASSWORD or PRODUCTION_E2E_ADMIN_PASSWORD is required')
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), requestTimeoutMs)
  try {
    const response = await fetch(absoluteUrl('/api/auth/login'), {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        username: adminUsername,
        password: adminPassword
      }),
      signal: controller.signal,
      redirect: 'manual'
    })
    const body = await response.json().catch(() => ({}))
    if (response.status !== 200 || !body?.success) {
      throw new Error(`/api/auth/login returned ${response.status}`)
    }

    const setCookies = typeof (response.headers as any).getSetCookie === 'function'
      ? (response.headers as any).getSetCookie() as string[]
      : [response.headers.get('set-cookie') || '']
    authCookie = setCookies
      .map((cookie) => cookie.split(';')[0])
      .filter(Boolean)
      .join('; ')
    if (!authCookie) throw new Error('login response did not set an auth cookie')
    if (body?.user?.role !== 'admin') throw new Error('logged in user is not admin')
    return {
      username: adminUsername,
      role: body.user.role
    }
  } finally {
    clearTimeout(timeout)
  }
}

function asArray<T = any>(value: unknown): T[] {
  return Array.isArray(value) ? value as T[] : []
}

function cleanText(value: unknown) {
  return String(value || '').replace(/\s+/g, ' ').trim()
}

function hasHttpUrl(value: unknown) {
  return /^https?:\/\//i.test(cleanText(value))
}

function hasMerchantAction(productResult: any) {
  return asArray(productResult?.actions).some((action: any) =>
    action?.type === 'merchant_handoff' &&
    hasHttpUrl(action?.href) &&
    cleanText(action?.description).length >= 20
  )
}

function hasCommerceValue(productResult: any) {
  return Boolean(productResult?.bestOffer) ||
    Number(productResult?.entity?.priceAmount || productResult?.product?.priceAmount || 0) > 0 ||
    Number(productResult?.evidence?.dataConfidenceScore || 0) > 0
}

function hasDecisionContent(productResult: any) {
  const modules = [
    ...asArray(productResult?.contentModules),
    ...asArray(productResult?.contentModules?.sections),
    productResult?.fitSummary,
    productResult?.notForSummary
  ]
  return modules.some((item: any) => cleanText(typeof item === 'string' ? item : JSON.stringify(item || '')).length >= 80)
}

function isLongTail(value: unknown) {
  const text = cleanText(value).toLowerCase()
  const tokens = text.split(/[^a-z0-9]+/).filter(Boolean)
  return tokens.length >= 3 && !['test', 'qa', 'sample', 'fixture'].some((word) => text.includes(word))
}

function getProductName(product: any) {
  return cleanText(product?.product_name || product?.productName || product?.name || product?.entity?.productName)
}

function getProductId(product: any) {
  return Number(product?.id || product?.product_id || product?.entity?.id || product?.productId)
}

function getArticlePath(article: any) {
  const slug = cleanText(article?.slug || article?.entity?.slug)
  const type = cleanText(article?.article_type || article?.type || article?.entity?.type || 'guide')
  if (!slug) return ''
  if (type === 'review') return `/reviews/${slug}`
  if (type === 'comparison') return `/compare/${slug}`
  return `/guides/${slug}`
}

function requireCount(label: string, count: number, minimum: number) {
  if (count < minimum) throw new Error(`${label} ${count} is below required minimum ${minimum}`)
}

async function fetchAuditPayloads() {
  const [
    coverage,
    buyingFeed,
    evidenceFeed,
    productsAdmin,
    articlesAdmin,
    evidenceAdmin,
    taxonomyAdmin,
    seoAdmin,
    priceValueAdmin
  ] = await Promise.all([
    requestJson('/api/open/coverage', { expectedStatus: 200 }),
    requestJson('/api/open/buying-feed', { expectedStatus: 200 }),
    requestJson('/api/open/evidence', { expectedStatus: 200 }),
    requestJson('/api/admin/products', { authenticated: true, expectedStatus: 200 }),
    requestJson('/api/admin/articles', { authenticated: true, expectedStatus: 200 }),
    requestJson('/api/admin/evidence', { authenticated: true, expectedStatus: 200 }),
    requestJson('/api/admin/taxonomy', { authenticated: true, expectedStatus: 200 }),
    requestJson('/api/admin/seo-ops', { authenticated: true, expectedStatus: 200 }),
    requestJson('/api/admin/price-value', { authenticated: true, expectedStatus: 200 })
  ])

  return {
    coverage,
    buyingFeed,
    evidenceFeed,
    productsAdmin,
    articlesAdmin,
    evidenceAdmin,
    taxonomyAdmin,
    seoAdmin,
    priceValueAdmin
  }
}

async function auditRealProductData(productsAdmin: any, buyingFeed: any) {
  await auditStep('Real data', 'Affiliate inventory is monetizable and linked', async () => {
    const summary = productsAdmin?.summary || {}
    requireCount('total affiliate products', Number(summary.totalAffiliateProducts || 0), minQualifiedProducts)
    requireCount('linked products', Number(summary.linkedProducts || 0), minQualifiedProducts)
    requireCount('products with promo links', Number(summary.withPromoLink || 0), minQualifiedProducts)
    return {
      totalAffiliateProducts: summary.totalAffiliateProducts,
      linkedProducts: summary.linkedProducts,
      withPromoLink: summary.withPromoLink
    }
  })

  await auditStep('Real data', 'Published products contain decision-grade commerce fields', async () => {
    const products = asArray(productsAdmin?.products)
    const qualified = products.filter((product: any) =>
      getProductName(product) &&
      cleanText(product?.slug) &&
      (hasHttpUrl(product?.source_affiliate_link) || hasHttpUrl(product?.resolved_url) || hasHttpUrl(product?.canonical_url)) &&
      Number(product?.price_amount || product?.current_price || 0) > 0 &&
      Number(product?.review_count || 0) > 0 &&
      cleanText(product?.category || product?.category_slug)
    )
    requireCount('qualified products', qualified.length, minQualifiedProducts)
    return {
      qualifiedProducts: qualified.length,
      examples: qualified.slice(0, 5).map((product: any) => ({
        id: product.id,
        slug: product.slug,
        name: product.product_name,
        price: product.price_amount || product.current_price,
        reviews: product.review_count
      }))
    }
  })

  await auditStep('Real data', 'Open buying feed exposes AI-ready product payloads', async () => {
    const products = asArray(buyingFeed?.products)
    const qualified = products.filter((entry: any) =>
      entry?.entity?.id &&
      cleanText(entry?.entity?.productName) &&
      hasCommerceValue(entry) &&
      Number(entry?.evidence?.dataConfidenceScore || 0) > 0 &&
      asArray(entry?.disclaimers).length >= 2 &&
      hasDecisionContent(entry) &&
      hasMerchantAction(entry)
    )
    requireCount('AI-ready buying-feed products', qualified.length, minQualifiedProducts)
    return {
      totalProducts: buyingFeed?.totalProducts,
      qualifiedProducts: qualified.length,
      examples: qualified.slice(0, 5).map((entry: any) => ({
        id: entry.entity.id,
        name: entry.entity.productName,
        confidence: entry.evidence.dataConfidenceScore,
        actionTypes: asArray(entry.actions).map((action: any) => action.type)
      }))
    }
  })
}

async function auditYoutubeEvidence(evidenceAdmin: any, evidenceFeed: any) {
  await auditStep('YouTube evidence', 'Videos and analysis reports exist in production', async () => {
    const summary = evidenceAdmin?.summary || {}
    requireCount('review videos', Number(summary.videos || 0), minQualifiedEvidenceReports)
    requireCount('analysis reports', Number(summary.reports || 0), minQualifiedEvidenceReports)
    return {
      videos: summary.videos,
      reports: summary.reports,
      lowConfidenceReports: summary.low_confidence_reports,
      advertorialReports: summary.advertorial_reports
    }
  })

  await auditStep('YouTube evidence', 'Matched reports have quotes, timestamps, context, and non-advertorial confidence', async () => {
    const reports = asArray(evidenceAdmin?.reports)
    const qualified = reports.filter((report: any) =>
      cleanText(report?.product_name) &&
      cleanText(report?.youtube_id) &&
      cleanText(report?.channel_name) &&
      cleanText(report?.tag_name) &&
      cleanText(report?.evidence_quote).length >= 40 &&
      cleanText(report?.context_snippet).length >= 20 &&
      Number.isFinite(Number(report?.timestamp_seconds)) &&
      Number(report?.evidence_confidence || 0) >= 0.65 &&
      Number(report?.is_advertorial || 0) === 0
    )
    requireCount('qualified YouTube evidence reports', qualified.length, minQualifiedEvidenceReports)
    return {
      qualifiedReports: qualified.length,
      examples: qualified.slice(0, 5).map((report: any) => ({
        id: report.id,
        product: report.product_name,
        youtubeId: report.youtube_id,
        channel: report.channel_name,
        tag: report.tag_name,
        confidence: report.evidence_confidence,
        timestampSeconds: report.timestamp_seconds
      }))
    }
  })

  await auditStep('YouTube evidence', 'Public evidence feed publishes consensus-ready product evidence', async () => {
    const products = asArray(evidenceFeed?.products)
    const qualified = products.filter((product: any) =>
      product?.id &&
      cleanText(product?.slug) &&
      Number(product?.consensus?.evidenceCount || 0) >= minQualifiedEvidenceReports &&
      cleanText(product?.consensus?.verdict || product?.consensus?.summary || JSON.stringify(product?.consensus || '')).length >= 20
    )
    requireCount('public evidence products', qualified.length, minQualifiedProducts)
    return {
      evidenceProducts: products.length,
      qualifiedProducts: qualified.length,
      examples: qualified.slice(0, 5).map((product: any) => ({
        id: product.id,
        slug: product.slug,
        evidenceCount: product.consensus?.evidenceCount
      }))
    }
  })
}

async function auditIntentAndPseo(taxonomyAdmin: any, coverage: any, articlesAdmin: any, seoAdmin: any) {
  await auditStep('Intent mining', 'Long-tail taxonomy intents and tags are populated', async () => {
    const tags = asArray(taxonomyAdmin?.tags).filter((tag: any) => isLongTail(tag?.canonical_name || tag?.slug))
    const intentSources = asArray(taxonomyAdmin?.intentSources).filter((source: any) => isLongTail(source?.normalized_query || source?.raw_query))
    const pendingTags = asArray(taxonomyAdmin?.pendingTags).filter((tag: any) => isLongTail(tag?.canonical_name || tag?.trigger_query))
    requireCount('long-tail tags/intents', tags.length + intentSources.length + pendingTags.length, minLongTailIntentSources)
    return {
      longTailTags: tags.length,
      longTailIntentSources: intentSources.length,
      longTailPendingTags: pendingTags.length,
      examples: [...tags, ...intentSources, ...pendingTags].slice(0, 6).map((item: any) => item.canonical_name || item.normalized_query || item.raw_query || item.trigger_query || item.slug)
    }
  })

  await auditStep('pSEO', 'Coverage manifest exposes crawlable product and editorial surfaces', async () => {
    const counts = coverage?.counts || {}
    requireCount('coverage products', Number(counts.products || 0), minQualifiedProducts)
    requireCount('coverage articles', Number(counts.articles || 0), minQualifiedReviews)
    requireCount('coverage reviews', Number(counts.reviews || 0), minQualifiedReviews)
    const machineEntries = asArray(coverage?.crawlSurfaces?.machineEntry)
    for (const required of ['/api/open/buying-feed', '/api/open/coverage', '/api/open/evidence', '/llms.txt']) {
      if (!machineEntries.includes(required)) throw new Error(`coverage manifest missing ${required}`)
    }
    return {
      counts,
      machineEntries
    }
  })

  await auditStep('pSEO', 'Published review pages are high-quality commercial pages', async () => {
    const reviews = asArray(articlesAdmin).filter((article: any) =>
      article?.article_type === 'review' &&
      article?.status === 'published' &&
      cleanText(article?.slug) &&
      cleanText(article?.title).length >= 20 &&
      cleanText(article?.summary).length >= 60 &&
      isLongTail(article?.keyword || article?.title)
    )
    requireCount('published review pages', reviews.length, minQualifiedReviews)
    return {
      reviews: reviews.length,
      examples: reviews.slice(0, 5).map((article: any) => ({
        id: article.id,
        path: getArticlePath(article),
        keyword: article.keyword,
        product: article.product_name
      }))
    }
  })

  await auditStep('pSEO', 'SEO ops reports no high-severity remediation backlog', async () => {
    const queue = asArray(seoAdmin?.seoRemediationQueue)
    const highSeverity = queue.filter((item: any) => item?.severity === 'high')
    if (highSeverity.length > 0) {
      throw new Error(`high-severity SEO findings: ${highSeverity.slice(0, 3).map((item: any) => `${item.issueType}:${item.pathname}`).join(', ')}`)
    }
    return {
      remediationItems: queue.length,
      highSeverity: highSeverity.length,
      scannedPages: seoAdmin?.seoAlignmentAudit?.scannedPages,
      renderedIssues: seoAdmin?.renderedPageAudit?.issuesFound,
      trustIssues: seoAdmin?.trustSurfaceAudit?.issuesFound
    }
  })
}

async function auditConversionAndAiReadiness(productsAdmin: any, buyingFeed: any, priceValueAdmin: any) {
  const buyingProducts = asArray(buyingFeed?.products)
  const qualifiedProductIds = buyingProducts
    .filter((entry: any) => hasMerchantAction(entry) && entry?.entity?.id)
    .map((entry: any) => Number(entry.entity.id))
    .filter((id: number) => Number.isInteger(id) && id > 0)

  await auditStep('Conversion', 'Merchant handoff links are public and attributable', async () => {
    requireCount('merchant-action products', qualifiedProductIds.length, minQualifiedProducts)
    const productId = qualifiedProductIds[0]
    const response = await fetch(absoluteUrl(`/go/${productId}?source=business-audit&visitor=business-audit-${Date.now()}`), {
      method: 'GET',
      redirect: 'manual',
      signal: AbortSignal.timeout(requestTimeoutMs)
    })
    const location = response.headers.get('location') || ''
    if (![301, 302, 303, 307, 308].includes(response.status)) {
      throw new Error(`/go/${productId} expected redirect, got ${response.status}`)
    }
    if (!hasHttpUrl(location)) {
      throw new Error(`/go/${productId} redirect location is not an absolute merchant URL`)
    }
    return {
      productId,
      redirectStatus: response.status,
      locationHost: new URL(location).host
    }
  })

  await auditStep('Conversion', 'Price-value and alert readiness are populated', async () => {
    const summary = priceValueAdmin?.summary || {}
    const snapshots = asArray(priceValueAdmin?.latestSnapshots)
    const qualifiedSnapshots = snapshots.filter((snapshot: any) =>
      Number(snapshot?.product_id || 0) > 0 &&
      Number(snapshot?.current_price || 0) > 0 &&
      Number.isFinite(Number(snapshot?.value_score)) &&
      cleanText(snapshot?.entry_status)
    )
    requireCount('priced products', Number(summary.priced_products || 0), minQualifiedProducts)
    requireCount('price-value snapshots', qualifiedSnapshots.length, minQualifiedProducts)
    return {
      pricedProducts: summary.priced_products,
      snapshots: summary.snapshots,
      activeAlerts: summary.active_alerts,
      examples: qualifiedSnapshots.slice(0, 5).map((snapshot: any) => ({
        productId: snapshot.product_id,
        product: snapshot.product_name,
        valueScore: snapshot.value_score,
        entryStatus: snapshot.entry_status
      }))
    }
  })

  await auditStep('AI recommendation', 'Open commerce search, product, offer, intent, and compare endpoints return decision objects', async () => {
    requireCount('comparison-ready products', qualifiedProductIds.length, 2)
    const firstProductId = qualifiedProductIds[0]
    const secondProductId = qualifiedProductIds[1]
    const firstProductName = getProductName(productsAdmin?.products?.find((product: any) => getProductId(product) === firstProductId)) ||
      cleanText(buyingProducts.find((entry: any) => Number(entry?.entity?.id) === firstProductId)?.entity?.productName)
    const searchQuery = encodeURIComponent(firstProductName.split(/\s+/).slice(0, 3).join(' ') || 'pool robot')
    const [search, product, offers, intent, compare] = await Promise.all([
      requestJson(`/api/open/commerce/search?q=${searchQuery}&limit=5`, { expectedStatus: 200 }),
      requestJson(`/api/open/commerce/products/${firstProductId}`, { expectedStatus: 200 }),
      requestJson(`/api/open/commerce/products/${firstProductId}/offers`, { expectedStatus: 200 }),
      requestJson(`/api/open/commerce/intent?intent=${searchQuery}`, { expectedStatus: 200 }),
      requestJson(`/api/open/commerce/compare?productIds=${firstProductId},${secondProductId}`, { expectedStatus: [200, 400] })
    ])

    if (!asArray(search?.results).some((entry: any) => entry?.entity?.id)) throw new Error('search returned no decision results')
    if (!product?.result?.entity?.id || !hasDecisionContent(product.result)) throw new Error('product endpoint missing decision payload')
    if (!offers?.result?.entity?.id || !asArray(offers?.actions).length) throw new Error('offers endpoint missing actions')
    if (!intent?.result || cleanText(JSON.stringify(intent.result)).length < 100) throw new Error('intent endpoint returned a thin result')
    if (compare?.error && compare.error !== 'Compared products must stay in the same category') throw new Error(`compare endpoint returned unexpected error: ${compare.error}`)

    return {
      productId: firstProductId,
      secondProductId,
      searchResults: asArray(search?.results).length,
      offerCount: offers?.total,
      compareStatus: compare?.error ? 'category-mismatch-covered' : 'compared'
    }
  })
}

async function writeReport() {
  const summary = {
    baseUrl,
    generatedAt: new Date().toISOString(),
    thresholds: {
      minQualifiedProducts,
      minQualifiedReviews,
      minQualifiedEvidenceReports,
      minLongTailIntentSources
    },
    totals: {
      passed: results.filter((result) => result.status === 'passed').length,
      failed: results.filter((result) => result.status === 'failed').length
    },
    results
  }
  await fs.mkdir(outputDir, { recursive: true })
  const reportPath = path.join(outputDir, `production-business-loop-audit-${new Date().toISOString().replace(/[:.]/g, '-')}.json`)
  await fs.writeFile(reportPath, `${JSON.stringify(summary, null, 2)}\n`)
  console.log(`REPORT ${reportPath}`)
  return summary
}

async function main() {
  await auditStep('Authentication', 'Admin API login works', login)
  if (!authCookie) {
    const summary = await writeReport()
    throw new Error(`Production business loop audit failed: ${summary.totals.failed} failed`)
  }

  const payloads = await fetchAuditPayloads()
  await auditRealProductData(payloads.productsAdmin, payloads.buyingFeed)
  await auditYoutubeEvidence(payloads.evidenceAdmin, payloads.evidenceFeed)
  await auditIntentAndPseo(payloads.taxonomyAdmin, payloads.coverage, payloads.articlesAdmin, payloads.seoAdmin)
  await auditConversionAndAiReadiness(payloads.productsAdmin, payloads.buyingFeed, payloads.priceValueAdmin)

  const summary = await writeReport()
  if (summary.totals.failed > 0) {
    throw new Error(`Production business loop audit failed: ${summary.totals.failed} failed, ${summary.totals.passed} passed`)
  }
  console.log(`Production business loop audit passed: ${summary.totals.passed} passed`)
}

main().catch((error) => {
  console.log(error?.message || String(error))
  process.exit(1)
})
