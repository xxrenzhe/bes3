#!/usr/bin/env tsx

import './load-env'
import fs from 'node:fs'
import path from 'node:path'
import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process'
import { chromium, type BrowserContext, type Page } from 'playwright'
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
    await assertText(page, 'Buying Decisions', 'desktop home')
    await assertText(page, 'Find Best Picks', 'desktop home')
    await assertText(page, 'See Deals', 'desktop home')
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
    await page.goto(loginBody.mustChangePassword ? '/change-password' : '/admin', { waitUntil: 'networkidle' })
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
    await mobilePage.goto('/', { waitUntil: 'networkidle' })
    await assertText(mobilePage, 'Buying Decisions', 'mobile home')
    await assertText(mobilePage, 'Find Best Picks', 'mobile home')
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
