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
  method?: 'GET' | 'POST'
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

const baseUrl = normalizeBaseUrl(process.env.PRODUCTION_E2E_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://www.bes3.com')
const adminUsername = process.env.PRODUCTION_E2E_ADMIN_USERNAME || process.env.DEFAULT_ADMIN_USERNAME || DEFAULT_ADMIN_USERNAME
const adminPassword = process.env.PRODUCTION_E2E_ADMIN_PASSWORD || process.env.DEFAULT_ADMIN_PASSWORD || ''
const outputDir = process.env.PRODUCTION_E2E_OUTPUT_DIR || 'qa-results'
const allowMutations = process.env.PRODUCTION_E2E_ALLOW_MUTATIONS === 'true'
const headless = process.env.PRODUCTION_E2E_HEADLESS !== 'false'
const navigationTimeoutMs = Number.parseInt(process.env.PRODUCTION_E2E_NAV_TIMEOUT_MS || '30000', 10)
const requestTimeoutMs = Number.parseInt(process.env.PRODUCTION_E2E_REQUEST_TIMEOUT_MS || '20000', 10)

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

const destructiveAdminActions: ApiCheck[] = [
  { area: 'Skipped destructive action', name: 'Product sync', method: 'POST', path: '/api/admin/products/sync/partnerboost', authenticated: true, destructive: true },
  { area: 'Skipped destructive action', name: 'Batch run pipeline', method: 'POST', path: '/api/admin/products/batch-run-pipeline', authenticated: true, destructive: true },
  { area: 'Skipped destructive action', name: 'Deep scrape', method: 'POST', path: '/api/admin/products/deep-scrape', authenticated: true, destructive: true },
  { area: 'Skipped destructive action', name: 'SEO automation apply', method: 'POST', path: '/api/admin/seo-ops', authenticated: true, destructive: true },
  { area: 'Skipped destructive action', name: 'Article regenerate', method: 'POST', path: '/api/admin/articles/:id/regenerate', authenticated: true, destructive: true },
  { area: 'Skipped destructive action', name: 'Pipeline cancel/retry', method: 'POST', path: '/api/admin/pipeline-runs/:id/(cancel|retry)', authenticated: true, destructive: true }
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

async function login(page: Page) {
  await page.goto(absoluteUrl('/admin'), { waitUntil: 'domcontentloaded' })
  if (!page.url().includes('/login')) {
    const me = await page.request.get(absoluteUrl('/api/auth/me'), { timeout: requestTimeoutMs })
    if (me.status() === 200) return
  }
  if (!adminPassword) throw new Error('DEFAULT_ADMIN_PASSWORD or PRODUCTION_E2E_ADMIN_PASSWORD is required')
  await page.goto(absoluteUrl('/login'), { waitUntil: 'domcontentloaded' })
  await page.locator('input[name="username"]').fill(adminUsername)
  await page.locator('input[name="password"]').fill(adminPassword)
  await Promise.all([
    page.waitForURL((url) => url.pathname === '/admin' || url.pathname === '/change-password', { timeout: 20000 }),
    page.locator('button[type="submit"]').click()
  ])
  const me = await page.request.get(absoluteUrl('/api/auth/me'), { timeout: requestTimeoutMs })
  if (me.status() !== 200) throw new Error(`/api/auth/me returned ${me.status()}`)
  const body = await me.json().catch(() => ({}))
  if (body?.user?.role !== 'admin') throw new Error('logged in user is not admin')
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
    if (pageErrors.length > 0) throw new Error(`browser errors: ${pageErrors.slice(0, 3).join(' | ')}`)
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
    addResult({
      area: check.area,
      name: check.name,
      status: 'skipped',
      detail: 'production-safe mode; set PRODUCTION_E2E_ALLOW_MUTATIONS=true to execute',
      evidence: { method: check.method || 'GET', path: check.path }
    })
    return
  }
  await safeStep(check.area, check.name, async () => {
    const response = await context.request.fetch(absoluteUrl(check.path), {
      method: check.method || 'GET',
      timeout: requestTimeoutMs,
      headers: check.body ? { 'Content-Type': 'application/json' } : undefined,
      data: check.body
    })
    const status = response.status()
    if (!statusMatches(status, check.expectedStatus)) {
      const text = await response.text().catch(() => '')
      throw new Error(`expected ${check.expectedStatus || '2xx/3xx'}, got ${status}: ${text.slice(0, 240)}`)
    }
    const contentType = response.headers()['content-type'] || ''
    let json: any = null
    if (contentType.includes('application/json')) json = await response.json().catch(() => null)
    if (check.validate) {
      const issue = check.validate(json)
      if (issue) throw new Error(issue)
    }
    return {
      method: check.method || 'GET',
      path: check.path,
      status,
      contentType,
      jsonKeys: json && typeof json === 'object' ? Object.keys(json).slice(0, 20) : []
    }
  })
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
    for (const check of destructiveAdminActions) await checkApi(adminContext, check)
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
  console.error(error)
  process.exit(1)
})
