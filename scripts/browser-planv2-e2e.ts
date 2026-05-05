#!/usr/bin/env tsx

import './load-env'
import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process'
import { chromium, type Page } from 'playwright'
import { DEFAULT_ADMIN_USERNAME } from '@/lib/constants'
import { bootstrapApplication } from '@/lib/bootstrap'

const port = Number.parseInt(process.env.BROWSER_E2E_PORT || '3220', 10)
const baseUrl = `http://localhost:${Number.isFinite(port) ? port : 3220}`
const startupTimeoutMs = Number.parseInt(process.env.BROWSER_E2E_STARTUP_TIMEOUT_MS || '45000', 10)

function requireEnv(name: string) {
  const value = process.env[name]?.trim()
  if (!value) throw new Error(`${name} is required for browser e2e`)
  return value
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function startServer() {
  const child = spawn('npm', ['run', 'start', '--', '-p', String(port)], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      NODE_ENV: 'production',
      PORT: String(port),
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
    throw new Error(`${label}: missing visible text "${text}"`)
  }
}

async function runBrowserChecks() {
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

    await page.goto('/', { waitUntil: 'networkidle' })
    await assertText(page, 'Buyer-First Ratings', 'desktop home')
    await assertText(page, 'Real testing insights', 'desktop home')
    await assertNoHorizontalOverflow(page, 'desktop home')
    console.log('✓ browser home page renders without overflow')

    await page.goto('/products', { waitUntil: 'networkidle' })
    await assertText(page, 'Products', 'desktop products')
    await assertNoHorizontalOverflow(page, 'desktop products')
    console.log('✓ browser product directory renders')

    const coverageResponse = await page.request.get('/api/open/coverage')
    if (coverageResponse.status() !== 200) throw new Error(`coverage manifest status ${coverageResponse.status()}`)
    const coverage = await coverageResponse.json()
    if (coverage.feedType !== 'coverage-manifest-v1') throw new Error('coverage manifest feedType mismatch')
    if (coverage.planv2Readiness?.publicLoginEntryExposed !== false) throw new Error('coverage manifest readiness mismatch')
    console.log('✓ browser context can read open coverage manifest')

    await page.goto('/go/999999999?source=evidence-review', { waitUntil: 'domcontentloaded' })
    if (!['/directory', '/categories', '/products'].some((suffix) => page.url().endsWith(suffix))) {
      throw new Error(`commercial redirect fallback failed: url=${page.url()}`)
    }
    console.log('✓ browser commercial redirect family safely degrades')

    await page.goto('/admin', { waitUntil: 'networkidle' })
    if (!page.url().includes('/login')) throw new Error(`anonymous admin did not redirect to login: ${page.url()}`)
    await page.locator('input[name="username"]').fill(process.env.DEFAULT_ADMIN_USERNAME || DEFAULT_ADMIN_USERNAME)
    await page.locator('input[name="password"]').fill(adminPassword)
    await Promise.all([
      page.waitForURL((url) => url.pathname === '/admin' || url.pathname === '/change-password', { timeout: 15000 }),
      page.locator('button[type="submit"]').click()
    ])
    const meResponse = await page.request.get('/api/auth/me')
    if (meResponse.status() !== 200) throw new Error(`authenticated /api/auth/me failed with ${meResponse.status()}`)
    const me = await meResponse.json()
    if (!me?.user?.role || me.user.role !== 'admin') throw new Error('authenticated user is not admin')
    console.log(`✓ browser admin login works (${page.url().includes('/change-password') ? 'password-change-required' : 'admin-console'})`)

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
    await mobilePage.goto('/', { waitUntil: 'networkidle' })
    await assertText(mobilePage, 'Buyer-First Ratings', 'mobile home')
    await assertNoHorizontalOverflow(mobilePage, 'mobile home')
    await mobilePage.goto('/products', { waitUntil: 'networkidle' })
    await assertNoHorizontalOverflow(mobilePage, 'mobile products')
    await mobilePage.close()
    await mobileContext.close()
    console.log('✓ mobile browser surfaces render without horizontal overflow')

    if (pageErrors.length > 0) {
      throw new Error(`browser console/page errors: ${pageErrors.slice(0, 5).join(' | ')}`)
    }

    console.log('PlanV2 browser E2E check passed with 6 browser checks')
  } finally {
    await browser.close()
  }
}

async function main() {
  await bootstrapApplication()
  const child = startServer()
  try {
    await waitForServer()
    await runBrowserChecks()
  } finally {
    await stopServer(child)
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
