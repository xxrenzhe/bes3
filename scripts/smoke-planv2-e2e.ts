#!/usr/bin/env tsx

import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process'
import fs from 'node:fs'

type SmokeCheck = {
  label: string
  path: string
  expectStatus?: number | number[]
  expectRedirectTo?: string
  requiredText?: string[]
  requiredHeaders?: Record<string, string>
  jsonCheck?: (value: any) => string | null
}

const port = Number.parseInt(process.env.SMOKE_E2E_PORT || '3210', 10)
const baseUrl = `http://127.0.0.1:${Number.isFinite(port) ? port : 3210}`
const startupTimeoutMs = Number.parseInt(process.env.SMOKE_E2E_STARTUP_TIMEOUT_MS || '45000', 10)
const requestTimeoutMs = Number.parseInt(process.env.SMOKE_E2E_REQUEST_TIMEOUT_MS || '8000', 10)
const serverOutputLimit = Number.parseInt(process.env.SMOKE_E2E_SERVER_OUTPUT_LIMIT || '12000', 10)
const responseBodyLimit = Number.parseInt(process.env.SMOKE_E2E_RESPONSE_BODY_LIMIT || '1200', 10)

const checks: SmokeCheck[] = [
  {
    label: 'public home routes buyers to purchase tasks',
    path: '/',
    expectStatus: 200,
    requiredText: ['Tech deals checked by Alex', 'Find Best Picks', 'Check Current Price', 'buy, compare, wait, or skip']
  },
  {
    label: 'public product directory is accessible',
    path: '/products',
    expectStatus: 200,
    requiredText: ['Products']
  },
  {
    label: 'admin page redirects anonymous users',
    path: '/admin',
    expectStatus: [307, 308],
    expectRedirectTo: '/login'
  },
  {
    label: 'admin API rejects anonymous users with request id',
    path: '/api/admin/dashboard',
    expectStatus: 401,
    jsonCheck: (value) => {
      if (value?.error !== 'Unauthorized') return 'missing Unauthorized error'
      if (!value?.requestId) return 'missing requestId'
      return null
    }
  },
  {
    label: 'scanner paths are blocked',
    path: '/.env',
    expectStatus: 404,
    requiredHeaders: {
      'x-bes3-blocked-reason': 'scan-path'
    }
  },
  {
    label: 'robots excludes admin and allows open APIs',
    path: '/robots.txt',
    expectStatus: 200,
    requiredText: ['Disallow: /admin', 'Allow: /api/open/']
  },
  {
    label: 'coverage manifest exposes PlanV2 readiness',
    path: '/api/open/coverage',
    expectStatus: 200,
    jsonCheck: (value) => {
      if (value?.feedType !== 'coverage-manifest-v1') return 'feedType mismatch'
      if (value?.planv2Readiness?.publicLoginEntryExposed !== false) return 'public login readiness mismatch'
      if (!String(value?.planv2Readiness?.verificationCommand || '').includes('hardcore:check-planv2-seo')) {
        return 'missing SEO verification command'
      }
      return null
    }
  },
  {
    label: 'public commercial redirect family safely handles missing product',
    path: '/go/999999999?source=evidence-review',
    expectStatus: [307, 308],
    expectRedirectTo: '/directory'
  },
  {
    label: 'review dynamic route has safe missing-state behavior',
    path: '/reviews/non-existent-commercial-loop-smoke',
    expectStatus: 404
  },
  {
    label: 'editorial sitemap is reachable',
    path: '/editorial/sitemap.xml',
    expectStatus: 200,
    requiredText: ['urlset']
  }
]

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function expectedStatusLabel(expected: number | number[] | undefined) {
  if (expected == null) return '2xx/3xx'
  return Array.isArray(expected) ? expected.join('/') : String(expected)
}

function truncate(value: string, maxLength: number) {
  if (value.length <= maxLength) return value
  return `${value.slice(0, maxLength)}... [truncated ${value.length - maxLength} chars]`
}

function appendBounded(buffer: string[], chunk: Buffer | string, maxLength: number) {
  const value = String(chunk)
  buffer.push(value)
  let totalLength = buffer.reduce((length, item) => length + item.length, 0)
  while (totalLength > maxLength && buffer.length > 0) {
    const first = buffer[0]
    const overflow = totalLength - maxLength
    if (first.length <= overflow) {
      buffer.shift()
      totalLength -= first.length
    } else {
      buffer[0] = first.slice(overflow)
      totalLength -= overflow
    }
  }
}

async function fetchWithTimeout(url: string, init: RequestInit = {}) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), Number.isFinite(requestTimeoutMs) ? requestTimeoutMs : 8000)

  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal
    })
  } catch (error: any) {
    if (error?.name === 'AbortError') {
      throw new Error(`request timed out after ${requestTimeoutMs}ms`)
    }
    throw error
  } finally {
    clearTimeout(timeout)
  }
}

function startServer() {
  const recentOutput: string[] = []
  const standaloneServerPath = '.next/standalone/server.js'
  const command = fs.existsSync(standaloneServerPath) ? process.execPath : 'npm'
  const args = fs.existsSync(standaloneServerPath)
    ? [standaloneServerPath]
    : ['run', 'start', '--', '-p', String(port)]
  const child = spawn(command, args, {
    cwd: process.cwd(),
    env: {
      ...process.env,
      NODE_ENV: 'production',
      PORT: String(port),
      NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || baseUrl
    },
    stdio: ['ignore', 'pipe', 'pipe']
  })
  const recordOutput = (chunk: Buffer) => {
    appendBounded(recentOutput, chunk, Number.isFinite(serverOutputLimit) ? serverOutputLimit : 12000)
    process.stdout.write(`[smoke-server] ${chunk}`)
  }
  child.stdout.on('data', recordOutput)
  child.stderr.on('data', recordOutput)
  return { child, recentOutput }
}

async function waitForServer(child: ChildProcessWithoutNullStreams, recentOutput: string[]) {
  const startedAt = Date.now()
  let lastError = ''

  while (Date.now() - startedAt < startupTimeoutMs) {
    if (child.exitCode != null) {
      throw new Error(
        [
          `Smoke server exited before becoming ready (code=${child.exitCode}, signal=${child.signalCode || 'none'})`,
          `Last startup error: ${lastError || 'none'}`,
          'Recent server output:',
          recentOutput.join('').trim() || '(none)'
        ].join('\n')
      )
    }

    try {
      const response = await fetchWithTimeout(`${baseUrl}/api/health`, { redirect: 'manual' })
      if (response.status === 200) return
      lastError = `HTTP ${response.status}`
    } catch (error: any) {
      lastError = error?.message || String(error)
    }
    await wait(500)
  }

  throw new Error(
    [
      `Timed out waiting for ${baseUrl} after ${startupTimeoutMs}ms: ${lastError || 'no response'}`,
      'Recent server output:',
      recentOutput.join('').trim() || '(none)'
    ].join('\n')
  )
}

function statusMatches(actual: number, expected: number | number[] | undefined) {
  if (expected == null) return actual >= 200 && actual < 400
  return Array.isArray(expected) ? expected.includes(actual) : actual === expected
}

async function runCheck(check: SmokeCheck) {
  const url = `${baseUrl}${check.path}`
  const response = await fetchWithTimeout(url, { redirect: 'manual' })
  const contentType = response.headers.get('content-type') || ''
  let cachedText: string | undefined
  const readText = async () => {
    cachedText = cachedText ?? await response.text()
    return cachedText
  }

  if (!statusMatches(response.status, check.expectStatus)) {
    const body = await readText().catch((error: any) => `failed to read response body: ${error?.message || error}`)
    throw new Error(
      [
        `${check.label}: expected status ${expectedStatusLabel(check.expectStatus)}, got ${response.status}`,
        `url=${url}`,
        `content-type=${contentType || 'none'}`,
        `location=${response.headers.get('location') || 'none'}`,
        `body=${truncate(body.replace(/\s+/g, ' ').trim(), Number.isFinite(responseBodyLimit) ? responseBodyLimit : 1200) || '(empty)'}`
      ].join('\n')
    )
  }

  if (check.expectRedirectTo) {
    const location = response.headers.get('location') || ''
    const redirectUrl = location.startsWith('http') ? new URL(location).pathname : location
    if (redirectUrl !== check.expectRedirectTo) {
      throw new Error(
        [
          `${check.label}: expected redirect to ${check.expectRedirectTo}, got ${location || 'none'}`,
          `url=${url}`,
          `status=${response.status}`
        ].join('\n')
      )
    }
  }

  for (const [name, expected] of Object.entries(check.requiredHeaders || {})) {
    const actual = response.headers.get(name)
    if (expected ? actual !== expected : !actual) {
      throw new Error(
        [
          `${check.label}: missing/invalid header ${name}`,
          `url=${url}`,
          `status=${response.status}`,
          `expected=${expected || '(present)'}`,
          `actual=${actual || 'none'}`
        ].join('\n')
      )
    }
  }

  if (check.jsonCheck) {
    let value: any
    try {
      const text = await readText()
      value = JSON.parse(text)
    } catch (error: any) {
      throw new Error(
        [
          `${check.label}: failed to parse JSON response`,
          `url=${url}`,
          `status=${response.status}`,
          `content-type=${contentType || 'none'}`,
          `error=${error?.message || error}`,
          `body=${truncate((cachedText || '').replace(/\s+/g, ' ').trim(), Number.isFinite(responseBodyLimit) ? responseBodyLimit : 1200) || '(empty)'}`
        ].join('\n')
      )
    }
    const issue = check.jsonCheck(value)
    if (issue) {
      throw new Error(
        [
          `${check.label}: ${issue}`,
          `url=${url}`,
          `status=${response.status}`,
          `body=${truncate(JSON.stringify(value), Number.isFinite(responseBodyLimit) ? responseBodyLimit : 1200)}`
        ].join('\n')
      )
    }
  } else if (check.requiredText?.length) {
    const text = await readText()
    const missing = check.requiredText.filter((needle) => !text.includes(needle))
    if (missing.length) {
      throw new Error(
        [
          `${check.label}: missing text ${missing.join(', ')}`,
          `url=${url}`,
          `status=${response.status}`,
          `content-type=${contentType || 'none'}`,
          `body=${truncate(text.replace(/\s+/g, ' ').trim(), Number.isFinite(responseBodyLimit) ? responseBodyLimit : 1200) || '(empty)'}`
        ].join('\n')
      )
    }
  }

  console.log(`✓ ${check.label} (${check.path}, ${response.status})`)
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

async function main() {
  console.log(`PlanV2 runtime E2E smoke check starting at ${baseUrl}`)
  console.log(`Startup timeout: ${startupTimeoutMs}ms`)
  console.log(`Request timeout: ${requestTimeoutMs}ms`)
  console.log(`NEXT_PUBLIC_APP_URL=${process.env.NEXT_PUBLIC_APP_URL || baseUrl}`)
  console.log(`DATABASE_URL=${process.env.DATABASE_URL ? 'set' : 'unset'}`)
  console.log(`DATABASE_PATH=${process.env.DATABASE_PATH || '(default)'}`)

  const { child, recentOutput } = startServer()
  try {
    await waitForServer(child, recentOutput)
    for (const check of checks) {
      await runCheck(check)
    }
    console.log(`PlanV2 runtime E2E smoke check passed with ${checks.length} checks`)
  } finally {
    await stopServer(child)
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
