#!/usr/bin/env tsx

import './load-env'
import fs from 'node:fs/promises'
import path from 'node:path'
import { chromium, type BrowserContext, type Locator, type Page } from 'playwright'
import { DEFAULT_ADMIN_USERNAME } from '@/lib/constants'

type StepStatus = 'passed' | 'failed' | 'skipped'

type StepResult = {
  area: string
  name: string
  status: StepStatus
  detail?: string
  evidence?: Record<string, unknown>
}

type ApiCheck = {
  area: string
  name: string
  method?: 'GET' | 'POST' | 'PUT'
  path: string
  authenticated?: boolean
  expectedStatus?: number | number[]
  body?: unknown
  validate?: (value: any) => string | null
  destructive?: boolean
}

type PageCheck = {
  area: string
  name: string
  path: string
  authenticated?: boolean
  requiredText?: string[]
  safeInteractions?: boolean
}

const baseUrl = normalizeBaseUrl(process.env.PRODUCTION_E2E_BASE_URL || 'https://www.bes3.com')
const adminUsername = process.env.PRODUCTION_E2E_ADMIN_USERNAME || process.env.DEFAULT_ADMIN_USERNAME || DEFAULT_ADMIN_USERNAME
const adminPassword = process.env.PRODUCTION_E2E_ADMIN_PASSWORD || process.env.DEFAULT_ADMIN_PASSWORD || ''
const outputDir = process.env.PRODUCTION_E2E_OUTPUT_DIR || 'qa-results'
const allowMutations = process.env.PRODUCTION_E2E_ALLOW_MUTATIONS === 'true'
const headless = process.env.PRODUCTION_E2E_HEADLESS !== 'false'
const navigationTimeoutMs = Number.parseInt(process.env.PRODUCTION_E2E_NAV_TIMEOUT_MS || '30000', 10)
const requestTimeoutMs = Number.parseInt(process.env.PRODUCTION_E2E_REQUEST_TIMEOUT_MS || '20000', 10)
const mutationTimeoutMs = Number.parseInt(process.env.PRODUCTION_E2E_MUTATION_TIMEOUT_MS || '120000', 10)

const results: StepResult[] = []

const publicPages: PageCheck[] = [
  { area: 'Public positioning', name: 'Home buyer-first positioning', path: '/', requiredText: ['Buyer-First Ratings', 'Real testing insights'], safeInteractions: true },
  { area: 'Public catalog', name: 'Products directory', path: '/products', requiredText: ['Products'], safeInteractions: true },
  { area: 'Public catalog', name: 'Deals directory', path: '/deals', safeInteractions: true },
  { area: 'Public catalog', name: 'Categories directory', path: '/categories', safeInteractions: true },
  { area: 'Public catalog', name: 'Brands directory', path: '/brands', safeInteractions: true },
  { area: 'Public decision tools', name: 'Search page', path: '/search', safeInteractions: true },
  { area: 'Public decision tools', name: 'Shortlist workspace', path: '/shortlist', safeInteractions: true },
  { area: 'Public decision tools', name: 'Compare index', path: '/compare', safeInteractions: true },
  { area: 'Public content', name: 'Reviews index', path: '/reviews', safeInteractions: true },
  { area: 'Public content', name: 'Guides index', path: '/guides', safeInteractions: true },
  { area: 'Public content', name: 'Offers index', path: '/offers', safeInteractions: true },
  { area: 'Public trust', name: 'Trust page', path: '/trust', requiredText: ['Bes3 ranks products'], safeInteractions: true },
  { area: 'Public trust', name: 'About page', path: '/about', requiredText: ['Bes3'], safeInteractions: true },
  { area: 'Public trust', name: 'Contact page', path: '/contact', safeInteractions: true },
  { area: 'Public trust', name: 'Privacy page', path: '/privacy' },
  { area: 'Public trust', name: 'Terms page', path: '/terms' },
  { area: 'Public discovery', name: 'Sitemap page', path: '/site-map', safeInteractions: true },
  { area: 'Public discovery', name: 'Directory page', path: '/directory', safeInteractions: true },
  { area: 'Public discovery', name: 'Assistant page', path: '/assistant', safeInteractions: true },
  { area: 'Public discovery', name: 'Tools page', path: '/tools', safeInteractions: true },
  { area: 'Public discovery', name: 'Start page', path: '/start', safeInteractions: true },
  { area: 'Public discovery', name: 'Data page', path: '/data', safeInteractions: true },
  { area: 'Public conversion', name: 'Newsletter page', path: '/newsletter', safeInteractions: true }
]

const adminPages: PageCheck[] = [
  { area: 'Admin navigation', name: 'Dashboard', path: '/admin', authenticated: true, requiredText: ['运营总览'], safeInteractions: true },
  { area: 'Admin navigation', name: 'Products console', path: '/admin/products', authenticated: true, requiredText: ['商品'], safeInteractions: true },
  { area: 'Admin navigation', name: 'Articles console', path: '/admin/articles', authenticated: true, requiredText: ['文章'], safeInteractions: true },
  { area: 'Admin navigation', name: 'Pipeline runs console', path: '/admin/pipeline-runs', authenticated: true, requiredText: ['流水线'], safeInteractions: true },
  { area: 'Admin navigation', name: 'Evidence console', path: '/admin/evidence', authenticated: true, requiredText: ['证据库'], safeInteractions: true },
  { area: 'Admin navigation', name: 'Taxonomy console', path: '/admin/taxonomy', authenticated: true, requiredText: ['分类实验室'], safeInteractions: true },
  { area: 'Admin navigation', name: 'Price value console', path: '/admin/price-value', authenticated: true, requiredText: ['价格价值'], safeInteractions: true },
  { area: 'Admin navigation', name: 'SEO ops console', path: '/admin/seo-ops', authenticated: true, requiredText: ['SEO'], safeInteractions: true },
  { area: 'Admin navigation', name: 'Prompts console', path: '/admin/prompts', authenticated: true, requiredText: ['提示词'], safeInteractions: true },
  { area: 'Admin navigation', name: 'Risk console', path: '/admin/risk', authenticated: true, requiredText: ['风险'], safeInteractions: true },
  { area: 'Admin navigation', name: 'Governance console', path: '/admin/governance', authenticated: true, requiredText: ['安全治理'], safeInteractions: true },
  { area: 'Admin navigation', name: 'Data management console', path: '/admin/data', authenticated: true, requiredText: ['数据管理'], safeInteractions: true },
  { area: 'Admin navigation', name: 'Users console', path: '/admin/users', authenticated: true, requiredText: ['用户权限'], safeInteractions: true },
  { area: 'Admin navigation', name: 'Settings console', path: '/admin/settings', authenticated: true, requiredText: ['系统设置'], safeInteractions: true }
]

const publicApiChecks: ApiCheck[] = [
  {
    area: 'Public API',
    name: 'Health endpoint',
    path: '/api/health',
    expectedStatus: 200,
    validate: (value) => value?.status === 'ok' ? null : 'status is not ok'
  },
  {
    area: 'Public API',
    name: 'Coverage manifest',
    path: '/api/open/coverage',
    expectedStatus: 200,
    validate: (value) => value?.feedType === 'coverage-manifest-v1' ? null : 'coverage feed type mismatch'
  },
  { area: 'Public API', name: 'Buying feed', path: '/api/open/buying-feed', expectedStatus: 200 },
  { area: 'Public API', name: 'Evidence feed', path: '/api/open/evidence', expectedStatus: 200 },
  { area: 'Public API', name: 'Search intake snapshot', path: '/api/open/evidence/search-intake', expectedStatus: 200 },
  { area: 'Public API', name: 'Commerce search', path: '/api/open/commerce/search?q=pool&limit=5', expectedStatus: 200 },
  { area: 'Public API', name: 'Commerce intent', path: '/api/open/commerce/intent?intent=best%20pool%20robot', expectedStatus: 200 },
  {
    area: 'Public API',
    name: 'Decision event accepts safe test signal',
    method: 'POST',
    path: '/api/decision-events',
    expectedStatus: [200, 201],
    body: { eventType: 'qa_e2e_ping', source: 'production-e2e', metadata: { safe: true } }
  },
  {
    area: 'Public API',
    name: 'Evidence feedback exposes write contract',
    path: '/api/open/evidence/feedback',
    expectedStatus: 200,
    validate: (value) => value?.accepts?.analysisReportId && value?.accepts?.videoId ? null : 'feedback contract missing required identifiers'
  }
]

const adminApiChecks: ApiCheck[] = [
  { area: 'Admin API', name: 'Dashboard summary', path: '/api/admin/dashboard', authenticated: true, expectedStatus: 200 },
  { area: 'Admin API', name: 'Products snapshot', path: '/api/admin/products', authenticated: true, expectedStatus: 200 },
  { area: 'Admin API', name: 'Articles snapshot', path: '/api/admin/articles', authenticated: true, expectedStatus: 200 },
  { area: 'Admin API', name: 'Pipeline runs snapshot', path: '/api/admin/pipeline-runs', authenticated: true, expectedStatus: 200 },
  { area: 'Admin API', name: 'Pipeline ops snapshot', path: '/api/admin/pipeline-ops', authenticated: true, expectedStatus: 200 },
  { area: 'Admin API', name: 'Commercial loop guide', path: '/api/admin/commercial-loop', authenticated: true, expectedStatus: 200 },
  { area: 'Admin API', name: 'Evidence snapshot', path: '/api/admin/evidence', authenticated: true, expectedStatus: 200 },
  { area: 'Admin API', name: 'Taxonomy snapshot', path: '/api/admin/taxonomy', authenticated: true, expectedStatus: 200 },
  { area: 'Admin API', name: 'Price value snapshot', path: '/api/admin/price-value', authenticated: true, expectedStatus: 200 },
  { area: 'Admin API', name: 'SEO ops snapshot', path: '/api/admin/seo-ops', authenticated: true, expectedStatus: 200 },
  { area: 'Admin API', name: 'Prompts snapshot', path: '/api/admin/prompts', authenticated: true, expectedStatus: 200 },
  { area: 'Admin API', name: 'Risk snapshot', path: '/api/admin/risk', authenticated: true, expectedStatus: 200 },
  { area: 'Admin API', name: 'Governance snapshot', path: '/api/admin/governance', authenticated: true, expectedStatus: 200 },
  { area: 'Admin API', name: 'Users snapshot', path: '/api/admin/users', authenticated: true, expectedStatus: 200 },
  { area: 'Admin API', name: 'Settings snapshot', path: '/api/admin/settings', authenticated: true, expectedStatus: 200 },
  {
    area: 'Admin API',
    name: 'Settings validation: AI',
    method: 'POST',
    path: '/api/admin/settings/validate',
    authenticated: true,
    expectedStatus: 200,
    body: { category: 'ai' }
  },
  {
    area: 'Admin API',
    name: 'Settings validation: proxy',
    method: 'POST',
    path: '/api/admin/settings/validate',
    authenticated: true,
    expectedStatus: 200,
    body: { category: 'proxy' }
  },
  {
    area: 'Admin API',
    name: 'Settings validation: affiliate sync',
    method: 'POST',
    path: '/api/admin/settings/validate',
    authenticated: true,
    expectedStatus: 200,
    body: { category: 'affiliate_sync' }
  }
]

function normalizeBaseUrl(value: string) {
  return value.replace(/\/+$/, '')
}

function absoluteUrl(routePath: string) {
  return `${baseUrl}${routePath.startsWith('/') ? routePath : `/${routePath}`}`
}

function statusMatches(actual: number, expected: number | number[] | undefined) {
  if (expected == null) return actual >= 200 && actual < 400
  return Array.isArray(expected) ? expected.includes(actual) : actual === expected
}

function addResult(result: StepResult) {
  results.push(result)
  const prefix = result.status === 'passed' ? '✓' : result.status === 'skipped' ? '○' : '✗'
  console.log(`${prefix} [${result.area}] ${result.name}${result.detail ? ` - ${result.detail}` : ''}`)
}

async function safeStep(area: string, name: string, action: () => Promise<Record<string, unknown> | void>) {
  try {
    const evidence = await action()
    addResult({ area, name, status: 'passed', evidence: evidence || undefined })
  } catch (error: any) {
    addResult({ area, name, status: 'failed', detail: error?.message || String(error) })
  }
}

function requireMutationsEnabled() {
  if (!allowMutations) {
    throw new Error('PRODUCTION_E2E_ALLOW_MUTATIONS=true is required because this suite must test all production functions')
  }
}

async function fetchJson(context: BrowserContext, check: ApiCheck, timeout = requestTimeoutMs): Promise<{ status: number; contentType: string; json: any; text: string }> {
  const response = await context.request.fetch(absoluteUrl(check.path), {
    method: check.method || 'GET',
    timeout,
    headers: check.body ? { 'Content-Type': 'application/json' } : undefined,
    data: check.body
  })
  const status = response.status()
  const contentType = response.headers()['content-type'] || ''
  const text = contentType.includes('application/json') ? '' : await response.text().catch(() => '')
  const json = contentType.includes('application/json') ? await response.json().catch(() => null) : null
  if (!statusMatches(status, check.expectedStatus)) {
    const preview = json ? JSON.stringify(json).slice(0, 240) : text.slice(0, 240)
    throw new Error(`expected ${check.expectedStatus || '2xx/3xx'}, got ${status}: ${preview}`)
  }
  if (check.validate) {
    const issue = check.validate(json)
    if (issue) throw new Error(issue)
  }
  return { status, contentType, json, text }
}

async function login(page: Page) {
  if (!adminPassword) throw new Error('DEFAULT_ADMIN_PASSWORD or PRODUCTION_E2E_ADMIN_PASSWORD is required')

  const loginResponse = await page.request.post(absoluteUrl('/api/auth/login'), {
    data: {
      username: adminUsername,
      password: adminPassword
    },
    timeout: requestTimeoutMs
  })
  if (loginResponse.status() !== 200) {
    throw new Error(`/api/auth/login returned ${loginResponse.status()}`)
  }

  const me = await page.request.get(absoluteUrl('/api/auth/me'), { timeout: requestTimeoutMs })
  if (me.status() !== 200) throw new Error(`/api/auth/me returned ${me.status()}`)
  const body = await me.json().catch(() => ({}))
  if (body?.user?.role !== 'admin') throw new Error('logged in user is not admin')

  await page.goto(absoluteUrl('/admin'), { waitUntil: 'domcontentloaded', timeout: navigationTimeoutMs })
  if (page.url().includes('/login')) throw new Error('/admin redirected to login after API authentication')
}

async function assertNoPageFailures(page: Page, check: PageCheck) {
  const title = await page.title().catch(() => '')
  const hasNextError = await page.getByText(/Application error|This page could not be found|Unhandled Runtime Error/i).first().isVisible({ timeout: 1000 }).catch(() => false)
  if (hasNextError) throw new Error(`${check.path} rendered an error page`)
  return { title }
}

async function collectInteractiveInventory(page: Page) {
  return page.evaluate(`(() => {
    const visible = (element) => {
      const rect = element.getBoundingClientRect()
      const style = window.getComputedStyle(element)
      return rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none'
    }
    const textOf = (element) => (element.textContent || element.getAttribute('aria-label') || element.getAttribute('title') || '').replace(/\\s+/g, ' ').trim().slice(0, 120)
    const buttons = Array.from(document.querySelectorAll('button')).filter(visible).map((button) => ({
      text: textOf(button),
      disabled: button.disabled,
      type: button.getAttribute('type') || 'button'
    }))
    const links = Array.from(document.querySelectorAll('a[href]')).filter(visible).map((link) => ({
      text: textOf(link),
      href: link.getAttribute('href') || ''
    }))
    const forms = Array.from(document.querySelectorAll('form')).filter(visible).map((form) => ({
      action: form.getAttribute('action') || '',
      method: form.getAttribute('method') || 'get',
      text: textOf(form)
    }))
    return {
      buttonCount: buttons.length,
      enabledButtonCount: buttons.filter((button) => !button.disabled).length,
      linkCount: links.length,
      formCount: forms.length,
      buttons: buttons.slice(0, 40),
      links: links.slice(0, 40),
      forms
    }
  })()`)
}

async function clickSafeUi(page: Page, check: PageCheck) {
  const clicked: string[] = []
  const safeButtonNames = [
    /accept essential/i,
    /reject/i,
    /刷新/,
    /上一页/,
    /下一页/,
    /收起侧边栏/,
    /展开侧边栏/,
    /菜单/,
    /升序/,
    /降序/,
    /clear/i,
    /copy/i,
    /compare/i,
    /shortlist/i
  ]
  const buttons = await page.locator('button:visible:not([disabled])').all()
  for (const button of buttons.slice(0, 10)) {
    const label = await getControlLabel(button)
    if (!label || !safeButtonNames.some((pattern) => pattern.test(label))) continue
    await button.click({ timeout: 5000 }).catch(() => undefined)
    clicked.push(label.slice(0, 80))
    await page.waitForTimeout(250)
  }
  return clicked
}

async function getControlLabel(locator: Locator) {
  return (await locator.evaluate((element) => (
    element.textContent || element.getAttribute('aria-label') || element.getAttribute('title') || ''
  ).replace(/\s+/g, ' ').trim()).catch(() => '')).trim()
}

async function checkPage(context: BrowserContext, check: PageCheck) {
  const page = await context.newPage()
  const pageErrors: string[] = []
  const failedResponses: Array<{ status: number; method: string; resourceType: string; url: string; bodyPreview: string }> = []
  page.on('response', async (response) => {
    if (response.status() < 400) return
    const request = response.request()
    const bodyPreview = await response.text().catch(() => '')
    failedResponses.push({
      status: response.status(),
      method: request.method(),
      resourceType: request.resourceType(),
      url: response.url(),
      bodyPreview: bodyPreview.replace(/\s+/g, ' ').slice(0, 300)
    })
  })
  page.on('pageerror', (error) => pageErrors.push(error.message))
  page.on('console', (message) => {
    if (message.type() === 'error') pageErrors.push(message.text())
  })
  try {
    await page.goto(absoluteUrl(check.path), { waitUntil: 'networkidle', timeout: navigationTimeoutMs })
    if (check.authenticated && page.url().includes('/login')) throw new Error(`${check.path} redirected to login`)
    const status = await assertNoPageFailures(page, check)
    const mainVisible = await page.locator('main, body').first().isVisible({ timeout: 5000 })
    if (!mainVisible) throw new Error('main content is not visible')
    for (const text of check.requiredText || []) {
      const count = await page.getByText(text, { exact: false }).count()
      if (count === 0) throw new Error(`missing text "${text}"`)
    }
    const inventory = await collectInteractiveInventory(page)
    const clicked = check.safeInteractions ? await clickSafeUi(page, check) : []
    const materialPageErrors = pageErrors.filter((message) => !/Failed to load resource: the server responded with a status of 404/i.test(message))
    if (materialPageErrors.length > 0) throw new Error(`browser errors: ${materialPageErrors.slice(0, 3).join(' | ')}`)
    addResult({
      area: check.area,
      name: check.name,
      status: 'passed',
      evidence: {
        path: check.path,
        finalUrl: page.url(),
        title: status.title,
        inventory,
        safeButtonsClicked: clicked,
        failedResponses
      }
    })
  } catch (error: any) {
    addResult({
      area: check.area,
      name: check.name,
      status: 'failed',
      detail: error?.message || String(error),
      evidence: { path: check.path, finalUrl: page.url(), failedResponses }
    })
  } finally {
    await page.close()
  }
}

async function checkApi(context: BrowserContext, check: ApiCheck) {
  if (check.destructive && !allowMutations) {
    throw new Error(`${check.name} requires PRODUCTION_E2E_ALLOW_MUTATIONS=true`)
  }
  await safeStep(check.area, check.name, async () => {
    const { status, contentType, json } = await fetchJson(context, check)
    return {
      method: check.method || 'GET',
      path: check.path,
      status,
      contentType,
      jsonKeys: json && typeof json === 'object' ? Object.keys(json).slice(0, 20) : []
    }
  })
}

function firstItem<T = any>(value: any, key: string): T | null {
  return Array.isArray(value?.[key]) && value[key].length > 0 ? value[key][0] as T : null
}

function pickProductLink(productsPayload: any): string | null {
  const fromAffiliate = (productsPayload?.affiliateProducts || []).find((item: any) => item?.promo_link || item?.short_promo_link || item?.product_url)
  const fromProduct = (productsPayload?.products || []).find((item: any) => item?.source_affiliate_link || item?.canonical_url || item?.resolved_url)
  const link = fromAffiliate?.promo_link || fromAffiliate?.short_promo_link || fromAffiliate?.product_url || fromProduct?.source_affiliate_link || fromProduct?.canonical_url || fromProduct?.resolved_url
  return link ? String(link) : null
}

async function mutationStep(context: BrowserContext, name: string, check: ApiCheck, validate?: (json: any) => void, timeout = mutationTimeoutMs) {
  await safeStep('Production mutations', name, async () => {
    requireMutationsEnabled()
    const { status, contentType, json } = await fetchJson(context, { expectedStatus: [200, 201, 202], ...check }, timeout)
    validate?.(json)
    return {
      method: check.method || 'GET',
      path: check.path,
      status,
      contentType,
      jsonKeys: json && typeof json === 'object' ? Object.keys(json).slice(0, 20) : []
    }
  })
}

async function waitForPipelineRunStatus(context: BrowserContext, runId: number, statuses: string[], timeoutMs = requestTimeoutMs) {
  const deadline = Date.now() + timeoutMs
  let lastStatus = 'unknown'
  while (Date.now() < deadline) {
    const run = (await fetchJson(context, {
      path: `/api/admin/pipeline-runs/${runId}`,
      authenticated: true,
      expectedStatus: 200
    })).json
    lastStatus = String(run?.status || 'unknown')
    if (statuses.includes(lastStatus) && (lastStatus !== 'cancelled' || run?.finished_at)) return run
    await new Promise((resolve) => setTimeout(resolve, 1000))
  }
  throw new Error(`pipeline run ${runId} did not reach ${statuses.join('/')} before timeout; last status ${lastStatus}`)
}

async function checkProductionMutationCoverage(context: BrowserContext) {
  let productsPayload: any = null
  let articlesPayload: any[] = []
  let evidencePayload: any = null
  let taxonomyPayload: any = null
  let riskPayload: any = null
  let usersPayload: any = null
  let settingsPayload: any = null
  let promptsPayload: any[] = []

  await safeStep('Production mutations', 'Load mutation source records', async () => {
    requireMutationsEnabled()
    productsPayload = (await fetchJson(context, { path: '/api/admin/products', authenticated: true, expectedStatus: 200 })).json
    articlesPayload = (await fetchJson(context, { path: '/api/admin/articles', authenticated: true, expectedStatus: 200 })).json || []
    const pipelinePayload = (await fetchJson(context, { path: '/api/admin/pipeline-runs', authenticated: true, expectedStatus: 200 })).json || []
    evidencePayload = (await fetchJson(context, { path: '/api/admin/evidence', authenticated: true, expectedStatus: 200 })).json
    taxonomyPayload = (await fetchJson(context, { path: '/api/admin/taxonomy', authenticated: true, expectedStatus: 200 })).json
    riskPayload = (await fetchJson(context, { path: '/api/admin/risk', authenticated: true, expectedStatus: 200 })).json
    usersPayload = (await fetchJson(context, { path: '/api/admin/users', authenticated: true, expectedStatus: 200 })).json
    settingsPayload = (await fetchJson(context, { path: '/api/admin/settings', authenticated: true, expectedStatus: 200 })).json
    promptsPayload = (await fetchJson(context, { path: '/api/admin/prompts', authenticated: true, expectedStatus: 200 })).json || []
    return {
      affiliateProducts: productsPayload?.affiliateProducts?.length || 0,
      products: productsPayload?.products?.length || 0,
      articles: articlesPayload.length,
      pipelineRuns: pipelinePayload.length,
      evidenceReports: evidencePayload?.reports?.length || 0,
      prompts: promptsPayload.length
    }
  })

  const productLink = pickProductLink(productsPayload)
  const affiliateProduct = (productsPayload?.affiliateProducts || []).find((item: any) => Number.isFinite(Number(item?.id)))
  const linkedProduct = (productsPayload?.products || []).find((item: any) => Number.isFinite(Number(item?.id)) && item?.source_affiliate_link)
  const article = articlesPayload.find((item: any) => Number.isFinite(Number(item?.id)) && Number.isFinite(Number(item?.product_id)))
  const evidenceReport = firstItem(evidencePayload, 'reports')
  const taxonomyTag = firstItem(taxonomyPayload, 'tags')
  let riskAlert = firstItem<any>(riskPayload, 'riskAlerts')
  let riskFixtureError: string | null = null
  if (!riskAlert?.id) {
    try {
      const ensuredRisk = (await fetchJson(context, {
        method: 'POST',
        path: '/api/admin/risk',
        authenticated: true,
        expectedStatus: [200, 201],
        body: { action: 'ensureQaAlert' }
      }, mutationTimeoutMs)).json
      if (ensuredRisk?.alertId) {
        riskAlert = { id: ensuredRisk.alertId, status: 'open' }
      }
    } catch (error: any) {
      riskFixtureError = error?.message || String(error)
    }
  }
  const currentUser = (usersPayload?.users || []).find((item: any) => item?.username === adminUsername) || firstItem(usersPayload, 'users')
  const safeSetting = (settingsPayload?.items || []).find((item: any) => item?.isSensitive !== true && item?.category === 'media' && item?.key === 'localRoot')
    || (settingsPayload?.items || []).find((item: any) => item?.isSensitive !== true)
  const promptGroup = promptsPayload[0]

  const fixtureFailuresBefore = results.filter((result) => result.status === 'failed').length
  await safeStep('Production mutations', 'Resolve mutation fixtures', async () => {
    if (!productLink) throw new Error('no product link available for import/deep scrape tests')
    if (!affiliateProduct?.id) throw new Error('no affiliate product available for pipeline tests')
    if (!linkedProduct?.id) throw new Error('no linked product available for workspace tests')
    if (!article?.id) throw new Error('no article available for regeneration test')
    if (!evidenceReport?.id) throw new Error('no evidence report available for review test')
    if (!taxonomyTag?.category_slug || !taxonomyTag?.slug) throw new Error('no taxonomy tag available for rescan test')
    if (riskFixtureError) throw new Error(`unable to prepare QA risk alert: ${riskFixtureError}`)
    if (!riskAlert?.id) throw new Error('no risk alert available for status update test')
    if (!currentUser?.id) throw new Error('no user available for access test')
    if (!safeSetting) throw new Error('no non-sensitive setting available for settings update test')
    if (!promptGroup?.promptId) throw new Error('no prompt group available for prompt version test')
    return {
      productLink: productLink.slice(0, 120),
      affiliateProductId: affiliateProduct.id,
      linkedProductId: linkedProduct.id,
      articleId: article.id,
      evidenceReportId: evidenceReport.id,
      taxonomyTag: taxonomyTag.slug,
      riskAlertId: riskAlert.id,
      userId: currentUser.id,
      setting: `${safeSetting.category}.${safeSetting.key}`,
      promptId: promptGroup.promptId
    }
  })
  if (results.filter((result) => result.status === 'failed').length > fixtureFailuresBefore) return

  await mutationStep(
    context,
    'Sync PartnerBoost Amazon products',
    {
      method: 'POST',
      path: '/api/admin/products/sync/amazon',
      authenticated: true,
      body: { queuePipeline: false }
    },
    (json) => {
      if (!json || typeof json.createdIds === 'undefined' || typeof json.updatedIds === 'undefined') throw new Error('sync result missing createdIds/updatedIds')
    }
  )

  await mutationStep(
    context,
    'Sync PartnerBoost DTC products',
    {
      method: 'POST',
      path: '/api/admin/products/sync/dtc',
      authenticated: true,
      body: { queuePipeline: false }
    },
    (json) => {
      if (!json || typeof json.createdIds === 'undefined' || typeof json.updatedIds === 'undefined') throw new Error('sync result missing createdIds/updatedIds')
    }
  )

  await mutationStep(
    context,
    'Preview commercial loop candidates',
    {
      method: 'POST',
      path: '/api/admin/commercial-loop',
      authenticated: true,
      body: { execute: false, limit: 5, minScore: 0, discoverVideos: false, fetchTranscripts: false, extractEvidence: false, publishArticles: false }
    },
    (json) => {
      if (!json?.success || !Array.isArray(json?.result?.candidates) || json.result.candidates.length < 1) {
        throw new Error('commercial loop preview missing candidates')
      }
    }
  )

  const searchIntentQuery = `best cordless pool robot for vinyl liner walls ${Date.now()}`
  await mutationStep(
    context,
    'Capture long-tail search intent',
    {
      method: 'POST',
      path: '/api/open/evidence/search-intake',
      body: {
        query: searchIntentQuery,
        categorySlug: 'yard-pool-automation',
        source: 'production-e2e'
      }
    },
    (json) => {
      if (!json?.pendingTag?.slug || json?.status !== 'pending') throw new Error('search intake response missing pending tag')
    }
  )

  if (!affiliateProduct?.id) throw new Error('no affiliate product available for pipeline tests')
  await mutationStep(
    context,
    'Queue affiliate product pipeline',
    {
      method: 'POST',
      path: `/api/admin/products/${affiliateProduct.id}/run-pipeline`,
      authenticated: true
    },
    (json) => {
      if (!json?.queued || !json?.runId) throw new Error('pipeline queue response missing runId')
    }
  )

  await mutationStep(
    context,
    'Batch queue product pipeline',
    {
      method: 'POST',
      path: '/api/admin/products/batch-run-pipeline',
      authenticated: true,
      body: { ids: [affiliateProduct.id] }
    },
    (json) => {
      if (!json?.queued || !Array.isArray(json?.runIds)) throw new Error('batch pipeline response missing runIds')
    }
  )

  await mutationStep(
    context,
    'Import product from link',
    {
      method: 'POST',
      path: '/api/admin/products/import-from-link',
      authenticated: true,
      body: { link: productLink, source: 'production-e2e' }
    },
    (json) => {
      if (!json?.queued || !json?.runId) throw new Error('import response missing runId')
    }
  )

  await mutationStep(
    context,
    'Deep scrape product from link',
    {
      method: 'POST',
      path: '/api/admin/products/deep-scrape',
      authenticated: true,
      body: { link: productLink, source: 'production-e2e' }
    },
    (json) => {
      if (!json?.queued || !json?.runId) throw new Error('deep scrape response missing runId')
    }
  )

  if (!linkedProduct?.id) throw new Error('no linked product available for workspace tests')
  await mutationStep(
    context,
    'Queue product workspace SEO refresh',
    {
      method: 'POST',
      path: `/api/admin/products/${linkedProduct.id}/workspace-action`,
      authenticated: true,
      body: { action: 'refreshSeo' }
    },
    (json) => {
      if (!json?.queued || !json?.runId) throw new Error('workspace action response missing runId')
    }
  )

  await mutationStep(
    context,
    'Rescrape product media',
    {
      method: 'POST',
      path: `/api/admin/products/${linkedProduct.id}/rescrape-media`,
      authenticated: true
    },
    (json) => {
      if (!json?.success) throw new Error('rescrape media response missing success')
    }
  )

  if (!article?.id) throw new Error('no article available for regeneration test')
  await mutationStep(
    context,
    'Regenerate article pipeline',
    {
      method: 'POST',
      path: `/api/admin/articles/${article.id}/regenerate`,
      authenticated: true
    },
    (json) => {
      if (!json?.queued || !json?.runId) throw new Error('article regenerate response missing runId')
    }
  )

  const cancelSourceRun = (await fetchJson(context, {
    method: 'POST',
    path: `/api/admin/products/${affiliateProduct.id}/run-pipeline`,
    authenticated: true,
    expectedStatus: [200, 201, 202]
  }, mutationTimeoutMs)).json
  if (!cancelSourceRun?.runId) throw new Error('unable to create queued run for cancel/retry test')

  await mutationStep(
    context,
    'Cancel queued pipeline run',
    {
      method: 'POST',
      path: `/api/admin/pipeline-runs/${cancelSourceRun.runId}/cancel`,
      authenticated: true
    },
    (json) => {
      if (!json?.success || !['cancelled', 'running'].includes(String(json?.status))) throw new Error('pipeline cancel response missing cancelled status')
    }
  )
  await safeStep('Production mutations', 'Confirm cancelled pipeline run is retryable', async () => {
    const run = await waitForPipelineRunStatus(context, Number(cancelSourceRun.runId), ['cancelled'], mutationTimeoutMs)
    return { runId: run.id, status: run.status, finishedAt: run.finished_at || null }
  })

  await mutationStep(
    context,
    'Retry cancelled pipeline run',
    {
      method: 'POST',
      path: `/api/admin/pipeline-runs/${cancelSourceRun.runId}/retry`,
      authenticated: true
    },
    (json) => {
      if (!json?.success || !json?.runId) throw new Error('pipeline retry response missing new runId')
    }
  )

  await mutationStep(
    context,
    'Run SEO link inspector',
    {
      method: 'POST',
      path: '/api/admin/seo-ops',
      authenticated: true,
      body: { action: 'linkInspector', limit: 1 }
    },
    (json) => {
      if (!json?.success) throw new Error('link inspector response missing success')
    }
  )

  await mutationStep(
    context,
    'Preview SEO automation',
    {
      method: 'POST',
      path: '/api/admin/seo-ops',
      authenticated: true,
      body: { action: 'automationPreview', limit: 1, skipChecks: true }
    },
    (json) => {
      if (!json?.success && !json?.result) throw new Error('SEO automation preview missing result')
    }
  )

  await mutationStep(
    context,
    'Apply SEO automation',
    {
      method: 'POST',
      path: '/api/admin/seo-ops',
      authenticated: true,
      body: { action: 'automationApply', limit: 1, skipChecks: true, pushIndex: false }
    },
    (json) => {
      if (!json?.success && !json?.result) throw new Error('SEO automation apply missing result')
    }
  )

  if (!evidenceReport?.id) throw new Error('no evidence report available for review test')
  await mutationStep(
    context,
    'Review evidence report',
    {
      method: 'POST',
      path: '/api/admin/evidence',
      authenticated: true,
      body: { reportId: evidenceReport.id, decision: 'approve', reason: 'production-e2e coverage' }
    },
    (json) => {
      if (!json?.success) throw new Error('evidence review response missing success')
    }
  )

  if (!taxonomyTag?.category_slug || !taxonomyTag?.slug) throw new Error('no taxonomy tag available for rescan test')
  await mutationStep(
    context,
    'Queue taxonomy rescan',
    {
      method: 'POST',
      path: '/api/admin/taxonomy',
      authenticated: true,
      body: { action: 'queueRescan', categorySlug: taxonomyTag.category_slug, tagSlug: taxonomyTag.slug }
    },
    (json) => {
      if (!json?.success || !json?.result?.queued) throw new Error('taxonomy rescan response missing queue id')
    }
  )

  await mutationStep(
    context,
    'Promote pending taxonomy tags',
    {
      method: 'POST',
      path: '/api/admin/taxonomy',
      authenticated: true,
      body: { action: 'promotePending', limit: 1, minPriorityScore: 1 }
    },
    (json) => {
      if (!json?.success || typeof json?.result?.promoted === 'undefined') throw new Error('promote pending response missing count')
    }
  )

  await mutationStep(
    context,
    'Preview price value refresh',
    {
      method: 'POST',
      path: '/api/admin/price-value',
      authenticated: true,
      body: { action: 'previewRefresh', limit: 1 }
    },
    (json) => {
      if (!json?.success || !json?.result?.preview) throw new Error('price preview response missing preview')
    }
  )

  await mutationStep(
    context,
    'Refresh price value snapshots',
    {
      method: 'POST',
      path: '/api/admin/price-value',
      authenticated: true,
      body: { action: 'refreshSnapshots', limit: 1 }
    },
    (json) => {
      if (!json?.success || typeof json?.result?.refreshed === 'undefined') throw new Error('price refresh response missing count')
    }
  )

  await mutationStep(
    context,
    'Evaluate price alerts',
    {
      method: 'POST',
      path: '/api/admin/price-value',
      authenticated: true,
      body: { action: 'evaluateAlerts', limit: 1, markNotified: false, queueNotifications: false }
    },
    (json) => {
      if (!json?.success || typeof json?.result?.triggered === 'undefined') throw new Error('price alert response missing count')
    }
  )

  if (!riskAlert?.id) throw new Error('no risk alert available for status update test')
  await mutationStep(
    context,
    'Round-trip risk status',
    {
      method: 'POST',
      path: '/api/admin/risk',
      authenticated: true,
      body: { alertId: riskAlert.id, status: riskAlert.status === 'resolved' ? 'open' : 'resolved' }
    },
    (json) => {
      if (!json?.success) throw new Error('risk status response missing success')
    }
  )
  await mutationStep(
    context,
    'Restore risk status',
    {
      method: 'POST',
      path: '/api/admin/risk',
      authenticated: true,
      body: { alertId: riskAlert.id, status: riskAlert.status === 'resolved' ? 'resolved' : 'open' }
    },
    (json) => {
      if (!json?.success) throw new Error('risk restore response missing success')
    }
  )

  if (!currentUser?.id) throw new Error('no user available for access test')
  await mutationStep(
    context,
    'Round-trip user active flag',
    {
      method: 'POST',
      path: '/api/admin/users',
      authenticated: true,
      body: { action: 'setUserActive', userId: currentUser.id, active: Boolean(currentUser.is_active) }
    },
    (json) => {
      if (!json?.success) throw new Error('user access response missing success')
    }
  )

  if (!safeSetting) throw new Error('no non-sensitive setting available for settings update test')
  await mutationStep(
    context,
    'Round-trip settings save',
    {
      method: 'PUT',
      path: '/api/admin/settings',
      authenticated: true,
      body: {
        items: [{
          category: safeSetting.category,
          key: safeSetting.key,
          value: safeSetting.value || '',
          dataType: safeSetting.dataType || safeSetting.data_type || 'string',
          isSensitive: false,
          description: safeSetting.description || null
        }]
      }
    },
    (json) => {
      if (!json?.success) throw new Error('settings save response missing success')
    }
  )

  await mutationStep(
    context,
    'Record data import dry-run',
    {
      method: 'POST',
      path: '/api/admin/data',
      authenticated: true,
      body: {
        importType: 'production-e2e',
        sourceFilename: 'production-e2e-dry-run.json',
        dryRun: true,
        keyField: 'externalId',
        rows: [
          { externalId: `production-e2e-${Date.now()}`, name: 'Production E2E sample' },
          { name: 'Production E2E missing key sample' }
        ]
      }
    },
    (json) => {
      if (!json?.success || !json?.result?.importRunId) throw new Error('data import response missing importRunId')
    }
  )

  if (!promptGroup?.promptId) throw new Error('no prompt group available for prompt version test')
  const promptVersions = (await fetchJson(context, {
    path: `/api/admin/prompts/${encodeURIComponent(promptGroup.promptId)}`,
    authenticated: true,
    expectedStatus: 200
  })).json || []
  const activePromptVersion = promptVersions.find((item: any) => item?.isActive) || promptVersions[0]
  if (!activePromptVersion?.version || !activePromptVersion?.promptContent) throw new Error('active prompt version missing for prompt activation test')
  const promptVersion = `qa-${Date.now()}`
  await mutationStep(
    context,
    'Create prompt version',
    {
      method: 'POST',
      path: '/api/admin/prompts',
      authenticated: true,
      body: {
        promptId: promptGroup.promptId,
        category: promptGroup.category || 'qa',
        name: promptGroup.name || promptGroup.promptId,
        version: promptVersion,
        promptContent: activePromptVersion.promptContent,
        changeNotes: 'production-e2e coverage',
        activate: false
      }
    },
    (json) => {
      if (!json?.success) throw new Error('prompt create response missing success')
    }
  )

  await mutationStep(
    context,
    'Activate prompt version',
    {
      method: 'PUT',
      path: `/api/admin/prompts/${encodeURIComponent(promptGroup.promptId)}`,
      authenticated: true,
      body: { version: promptVersion, forceActivate: true }
    },
    (json) => {
      if (!json?.success) throw new Error('prompt activation response missing success')
    }
  )

  await mutationStep(
    context,
    'Restore active prompt version',
    {
      method: 'PUT',
      path: `/api/admin/prompts/${encodeURIComponent(promptGroup.promptId)}`,
      authenticated: true,
      body: { version: activePromptVersion.version, forceActivate: true }
    },
    (json) => {
      if (!json?.success) throw new Error('prompt restore response missing success')
    }
  )
}

async function checkAdminNavigation(context: BrowserContext) {
  const page = await context.newPage()
  try {
    await page.goto(absoluteUrl('/admin'), { waitUntil: 'networkidle', timeout: navigationTimeoutMs })
    const navLinks = await page.locator('a[href^="/admin"]').evaluateAll((links) => Array.from(new Set(links.map((link) => (link as HTMLAnchorElement).getAttribute('href') || '').filter(Boolean))))
    const expected = adminPages.map((pageCheck) => pageCheck.path)
    const missing = expected.filter((href) => !navLinks.includes(href))
    if (missing.length > 0) throw new Error(`admin nav missing: ${missing.join(', ')}`)
    addResult({ area: 'Admin navigation', name: 'Sidebar exposes all consoles', status: 'passed', evidence: { expected, navLinks } })
  } catch (error: any) {
    addResult({ area: 'Admin navigation', name: 'Sidebar exposes all consoles', status: 'failed', detail: error?.message || String(error) })
  } finally {
    await page.close()
  }
}

async function writeReport() {
  const summary = {
    baseUrl,
    allowMutations,
    generatedAt: new Date().toISOString(),
    totals: {
      passed: results.filter((result) => result.status === 'passed').length,
      failed: results.filter((result) => result.status === 'failed').length,
      skipped: results.filter((result) => result.status === 'skipped').length
    },
    results
  }
  await fs.mkdir(outputDir, { recursive: true })
  const reportPath = path.join(outputDir, `production-e2e-${new Date().toISOString().replace(/[:.]/g, '-')}.json`)
  await fs.writeFile(reportPath, `${JSON.stringify(summary, null, 2)}\n`)
  console.log(`Production E2E report written to ${reportPath}`)
  return summary
}

async function main() {
  const browser = await chromium.launch({ headless })
  const publicContext = await browser.newContext({ baseURL: baseUrl, viewport: { width: 1440, height: 1000 } })
  const adminContext = await browser.newContext({ baseURL: baseUrl, viewport: { width: 1440, height: 1000 } })

  try {
    await safeStep('Authentication', 'Admin login', async () => {
      const page = await adminContext.newPage()
      try {
        await login(page)
        return { username: adminUsername, finalUrl: page.url() }
      } finally {
        await page.close()
      }
    })

    for (const check of publicApiChecks) await checkApi(publicContext, check)
    for (const check of adminApiChecks) await checkApi(adminContext, check)
    await checkProductionMutationCoverage(adminContext)
    for (const check of publicPages) await checkPage(publicContext, check)
    await checkAdminNavigation(adminContext)
    for (const check of adminPages) await checkPage(adminContext, check)
  } finally {
    await publicContext.close()
    await adminContext.close()
    await browser.close()
  }

  const summary = await writeReport()
  if (summary.totals.failed > 0) {
    throw new Error(`Production E2E failed: ${summary.totals.failed} failed, ${summary.totals.passed} passed, ${summary.totals.skipped} skipped`)
  }
  console.log(`Production E2E passed: ${summary.totals.passed} passed, ${summary.totals.skipped} skipped`)
}

main().catch((error) => {
  console.log(error)
  process.exit(1)
})
