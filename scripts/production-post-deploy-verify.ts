#!/usr/bin/env tsx

import './load-env'
import fs from 'node:fs/promises'
import path from 'node:path'

type CheckStatus = 'passed' | 'failed'

type CheckResult = {
  area: string
  name: string
  status: CheckStatus
  detail?: string
  evidence?: Record<string, unknown>
}

const baseUrl = normalizeBaseUrl(process.env.PRODUCTION_POST_DEPLOY_BASE_URL || process.env.PRODUCTION_E2E_BASE_URL || 'https://www.bes3.com')
const outputDir = process.env.PRODUCTION_POST_DEPLOY_OUTPUT_DIR || 'docs/ProdTest'
const requestTimeoutMs = readIntegerEnv('PRODUCTION_POST_DEPLOY_REQUEST_TIMEOUT_MS', 30000)
const productSlug = process.env.PRODUCTION_POST_DEPLOY_PRODUCT_SLUG || 'lomon-womens-fuzzy-sherpa-fleece-jacket-lightweight-vest-cozy-sleeveless-cardigan-zipper-waistcoat-outerwear-with-pocket'
const pseoPath = process.env.PRODUCTION_POST_DEPLOY_PSEO_PATH || '/yard-pool-automation/best-yard-pool-automation-for-pool-wall-climbing'
const minProductSitemapUrls = readIntegerEnv('PRODUCTION_POST_DEPLOY_MIN_PRODUCT_SITEMAP_URLS', 215)
const minEditorialSitemapUrls = readIntegerEnv('PRODUCTION_POST_DEPLOY_MIN_EDITORIAL_SITEMAP_URLS', 20)
const runId = new Date().toISOString().replace(/[:.]/g, '-')
const cacheBust = `post_deploy=${encodeURIComponent(runId)}`

const results: CheckResult[] = []

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

function withCacheBust(routePath: string) {
  const separator = routePath.includes('?') ? '&' : '?'
  return `${routePath}${separator}${cacheBust}`
}

function addResult(result: CheckResult) {
  results.push(result)
  const prefix = result.status === 'passed' ? 'PASS' : 'FAIL'
  const suffix = result.detail ? ` - ${result.detail}` : ''
  console.log(`${prefix} [${result.area}] ${result.name}${suffix}`)
}

async function check(area: string, name: string, action: () => Promise<Record<string, unknown> | void>) {
  try {
    const evidence = await action()
    addResult({ area, name, status: 'passed', evidence: evidence || undefined })
  } catch (error: any) {
    addResult({ area, name, status: 'failed', detail: error?.message || String(error) })
  }
}

async function fetchText(routePath: string, expectedStatus = 200) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), requestTimeoutMs)
  try {
    const response = await fetch(absoluteUrl(routePath), {
      headers: {
        Accept: 'text/html,application/xml,application/json',
        'Cache-Control': 'no-cache',
        Pragma: 'no-cache'
      },
      redirect: 'manual',
      signal: controller.signal
    })
    const body = await response.text()
    if (response.status !== expectedStatus) {
      throw new Error(`${routePath} expected HTTP ${expectedStatus}, got ${response.status}`)
    }
    return { response, body }
  } finally {
    clearTimeout(timeout)
  }
}

async function fetchJson(routePath: string) {
  const { body } = await fetchText(routePath)
  return JSON.parse(body)
}

function countUrls(xml: string) {
  return (xml.match(/<url>/g) || []).length
}

function requireIncludes(body: string, labels: string[]) {
  const missing = labels.filter((label) => !body.includes(label))
  if (missing.length) throw new Error(`missing text: ${missing.join(', ')}`)
}

function requireExcludes(body: string, labels: string[]) {
  const found = labels.filter((label) => body.includes(label))
  if (found.length) throw new Error(`unexpected text: ${found.join(', ')}`)
}

async function main() {
  await check('Runtime', 'Health exposes deployed build metadata', async () => {
    const health = await fetchJson(withCacheBust('/api/health'))
    const sha = health?.build?.sha
    if (typeof sha !== 'string' || sha.length < 7) {
      throw new Error('/api/health does not expose build.sha')
    }
    return {
      status: health?.status,
      version: health?.version,
      database: health?.database,
      build: health?.build
    }
  })

  await check('Product detail', 'Open-commerce product 54 page renders', async () => {
    const routePath = withCacheBust(`/products/${productSlug}`)
    const { body } = await fetchText(routePath)
    requireExcludes(body, ['NEXT_HTTP_ERROR_FALLBACK;404'])
    requireIncludes(body, ['LOMON', 'Product Brief', 'Current offer', 'Open machine payload'])
    if (!/Check (current )?price|merchant|Merchant|Buy Signals|Open Commerce/i.test(body)) {
      throw new Error('product page is missing merchant or buying CTA copy')
    }
    return {
      path: routePath,
      productSlug,
      htmlBytes: body.length
    }
  })

  await check('pSEO', 'Scenario page serves corrected research copy', async () => {
    const routePath = withCacheBust(pseoPath)
    const { body } = await fetchText(routePath)
    requireIncludes(body, ['Evidence Check', 'Research Snapshot', 'Source Score', 'Source Proof'])
    requireExcludes(body, ['Reddit Consensus: The 1 Best'])
    return {
      path: routePath,
      htmlBytes: body.length,
      stillNoindex: body.includes('noindex')
    }
  })

  await check('Discovery', 'Product sitemap remains populated', async () => {
    const { body } = await fetchText(withCacheBust('/products/sitemap.xml'))
    const urls = countUrls(body)
    if (urls < minProductSitemapUrls) {
      throw new Error(`product sitemap has ${urls} URLs, expected at least ${minProductSitemapUrls}`)
    }
    if (!body.includes(`/products/${productSlug}`)) {
      throw new Error('product sitemap does not include product 54 slug')
    }
    return { urls, minimum: minProductSitemapUrls }
  })

  await check('Discovery', 'Editorial sitemap remains populated', async () => {
    const { body } = await fetchText(withCacheBust('/editorial/sitemap.xml'))
    const urls = countUrls(body)
    if (urls < minEditorialSitemapUrls) {
      throw new Error(`editorial sitemap has ${urls} URLs, expected at least ${minEditorialSitemapUrls}`)
    }
    return { urls, minimum: minEditorialSitemapUrls }
  })

  await check('Conversion', 'Product 54 merchant handoff redirects', async () => {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), requestTimeoutMs)
    try {
      const response = await fetch(absoluteUrl(`/go/54?source=post-deploy-verify&visitor=${encodeURIComponent(runId)}`), {
        redirect: 'manual',
        signal: controller.signal
      })
      const location = response.headers.get('location') || ''
      if (![301, 302, 303, 307, 308].includes(response.status)) {
        throw new Error(`/go/54 expected redirect, got HTTP ${response.status}`)
      }
      if (!/^https:\/\/www\.amazon\.com\//i.test(location)) {
        throw new Error(`/go/54 redirected to unexpected location: ${location}`)
      }
      return { status: response.status, locationHost: new URL(location).host }
    } finally {
      clearTimeout(timeout)
    }
  })

  await fs.mkdir(outputDir, { recursive: true })
  const report = {
    baseUrl,
    generatedAt: new Date().toISOString(),
    productSlug,
    pseoPath,
    totals: {
      passed: results.filter((result) => result.status === 'passed').length,
      failed: results.filter((result) => result.status === 'failed').length
    },
    results
  }
  const outputPath = path.join(outputDir, `production-post-deploy-verify-${runId}.json`)
  await fs.writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`)
  console.log(`REPORT ${outputPath}`)

  if (report.totals.failed > 0) {
    throw new Error(`Production post-deploy verification failed: ${report.totals.failed} failed`)
  }
}

main().catch((error) => {
  console.error(error?.message || error)
  process.exit(1)
})
