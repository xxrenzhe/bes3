#!/usr/bin/env tsx

import './load-env'
import fs from 'node:fs/promises'
import path from 'node:path'
import { chromium, type Page } from 'playwright'
import { isCommissionableMerchantUrl } from '@/lib/merchant-links'

type AuditStatus = 'passed' | 'failed'

type AuditResult = {
  area: string
  name: string
  status: AuditStatus
  detail?: string
  evidence?: Record<string, unknown>
}

type RuntimeIssue = {
  viewport?: string
  type: string
  text: string
  url?: string
  status?: number
  resourceType?: string
}

type ViewportSpec = {
  label: string
  width: number
  height: number
}

type RectSnapshot = {
  x: number
  y: number
  width: number
  height: number
  bottom: number
}

type LinkSnapshot = {
  text: string
  href: string
  visible: boolean
  rect: RectSnapshot
}

const defaultProductSlug = 'lomon-womens-fuzzy-sherpa-fleece-jacket-lightweight-vest-cozy-sleeveless-cardigan-zipper-waistcoat-outerwear-with-pocket'
const baseUrl = normalizeBaseUrl(process.env.PRODUCT_UX_AUDIT_BASE_URL || process.env.PRODUCTION_POST_DEPLOY_BASE_URL || process.env.PRODUCTION_E2E_BASE_URL || 'https://www.bes3.com')
const productSlug = process.env.PRODUCT_UX_AUDIT_PRODUCT_SLUG || process.env.PRODUCTION_POST_DEPLOY_PRODUCT_SLUG || defaultProductSlug
const outputDir = process.env.PRODUCT_UX_AUDIT_OUTPUT_DIR || 'qa-results'
const navigationTimeoutMs = readIntegerEnv('PRODUCT_UX_AUDIT_NAV_TIMEOUT_MS', 30000)
const requestTimeoutMs = readIntegerEnv('PRODUCT_UX_AUDIT_REQUEST_TIMEOUT_MS', 30000)
const failOnWarning = process.env.PRODUCT_UX_AUDIT_FAIL_ON_WARNING !== 'false'
const verifyGoRedirect = process.env.PRODUCT_UX_AUDIT_VERIFY_GO !== 'false'
const headless = process.env.PRODUCT_UX_AUDIT_HEADLESS !== 'false'
const runId = new Date().toISOString().replace(/[:.]/g, '-')
const cacheBust = `ux_audit=${encodeURIComponent(runId)}`

const viewports: ViewportSpec[] = [
  { label: 'mobile', width: 390, height: 844 },
  { label: 'tablet-portrait', width: 768, height: 1024 },
  { label: 'web-tablet-breakpoint', width: 1024, height: 768 },
  { label: 'web-narrow', width: 1100, height: 900 },
  { label: 'web-before-xl', width: 1279, height: 900 },
  { label: 'laptop', width: 1280, height: 900 },
  { label: 'desktop', width: 1440, height: 1000 }
]

const results: AuditResult[] = []
const consoleMessages: RuntimeIssue[] = []

function normalizeBaseUrl(value: string) {
  return value.replace(/\/+$/, '')
}

function readIntegerEnv(key: string, fallback: number) {
  const parsed = Number.parseInt(process.env[key] || '', 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

function absoluteUrl(routePath: string) {
  return `${baseUrl}${routePath.startsWith('/') ? routePath : `/${routePath}`}`
}

function withCacheBust(routePath: string) {
  const separator = routePath.includes('?') ? '&' : '?'
  return `${routePath}${separator}${cacheBust}`
}

function addResult(result: AuditResult) {
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

function isVisible(rect: RectSnapshot | null | undefined) {
  return Boolean(rect && rect.width > 0 && rect.height > 0)
}

function isInFirstViewport(rect: RectSnapshot, height: number, maxViewportRatio = 0.78) {
  return rect.y >= -4 && rect.y <= Math.round(height * maxViewportRatio)
}

async function collectViewportEvidence(page: Page) {
  return page.evaluate(`(() => {
    function rectFromElement(element) {
      if (!element) return null
      const rect = element.getBoundingClientRect()
      return {
        x: Math.round(rect.x),
        y: Math.round(rect.y),
        width: Math.round(rect.width),
        height: Math.round(rect.height),
        bottom: Math.round(rect.bottom)
      }
    }

    const links = Array.from(document.querySelectorAll('a[href]')).map((anchor) => {
      const rect = rectFromElement(anchor)
      return {
        text: (anchor.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 120),
        href: anchor.getAttribute('href') || '',
        visible: Boolean(rect && rect.width > 0 && rect.height > 0),
        rect: rect || { x: 0, y: 0, width: 0, height: 0, bottom: 0 }
      }
    })

    const mainCtas = links.filter((link) => link.visible && /check current price|check price|merchant|buy/i.test(link.text) && link.href.startsWith('/go/'))
    const evidenceLinks = links.filter((link) => link.visible && (link.href === '#decision-notes' || /view evidence|review proof|read evidence/i.test(link.text)))
    const h1 = rectFromElement(document.querySelector('h1'))
    const productImage = rectFromElement(document.querySelector('img[alt^="Product image"]'))
    const decisionNotes = rectFromElement(document.querySelector('#decision-notes'))
    const buyDecision = rectFromElement(document.querySelector('#buy-decision'))
    const currentOffer = rectFromElement(document.querySelector('#current-offer'))
    const decisionShortcuts = rectFromElement(document.querySelector('[data-product-ux="decision-shortcuts"]'))
    const decisionPath = rectFromElement(document.querySelector('[data-product-ux="decision-path"]'))
    const decisionNotesCta = rectFromElement(document.querySelector('[data-product-ux="decision-notes-cta"]'))
    const productFacts = rectFromElement(document.querySelector('#product-facts'))
    const finalDecisionRecovery = rectFromElement(document.querySelector('[data-product-ux="final-decision-recovery"]'))
    const decisionHeading = Array.from(document.querySelectorAll('h2')).find((heading) => /buy|compare|watch|skip|research|purchase-ready/i.test(heading.textContent || ''))
    const decisionHeadingRect = rectFromElement(decisionHeading || null)
    const bodyText = document.body.innerText
    const openLinks = Array.from(document.querySelectorAll('a[href^="/api/open/commerce/products/"]')).map((anchor) => ({
      text: (anchor.textContent || '').trim().replace(/\s+/g, ' '),
      href: anchor.getAttribute('href') || ''
    }))
    const structuredDataCount = document.querySelectorAll('script[type="application/ld+json"]').length
    const overflow = {
      innerWidth: window.innerWidth,
      scrollWidth: document.documentElement.scrollWidth,
      bodyScrollWidth: document.body.scrollWidth
    }

    return {
      url: window.location.href,
      title: document.title,
      bodyTextSample: bodyText.slice(0, 2000),
      structuredDataCount,
      h1,
      productImage,
      decisionNotes,
      buyDecision,
      currentOffer,
      decisionShortcuts,
      decisionPath,
      decisionNotesCta,
      productFacts,
      finalDecisionRecovery,
      decisionHeading: decisionHeading ? {
        text: (decisionHeading.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 180),
        rect: decisionHeadingRect
      } : null,
      mainCtas,
      evidenceLinks,
      overflow,
      htmlHasOpenProductJson: openLinks.some((link) => link.text.includes('Open product JSON') && !link.href.endsWith('/offers')),
      htmlHasOpenOfferJson: openLinks.some((link) => link.text.includes('Open offer JSON') && link.href.endsWith('/offers')),
      htmlHasDecisionNotes: Boolean(document.querySelector('#decision-notes')),
      htmlHasBuyDecisionAnchor: Boolean(document.querySelector('#buy-decision')),
      htmlHasCurrentOfferAnchor: Boolean(document.querySelector('#current-offer')),
      htmlHasDecisionShortcuts: Boolean(document.querySelector('[data-product-ux="decision-shortcuts"]')),
      htmlHasDecisionPath: Boolean(document.querySelector('[data-product-ux="decision-path"]')),
      htmlHasDecisionNotesCta: Boolean(document.querySelector('[data-product-ux="decision-notes-cta"]')),
      htmlHasFinalDecisionRecovery: Boolean(document.querySelector('[data-product-ux="final-decision-recovery"]')),
      htmlHasMobileStickyReserve: Boolean(document.querySelector('#product-facts.pb-36')),
      htmlHasDisclosure: /affiliate disclosure|may earn/i.test(bodyText)
    }
  })()`)
}

function assertViewportEvidence(viewport: ViewportSpec, evidence: Awaited<ReturnType<typeof collectViewportEvidence>>) {
  const cta = evidence.mainCtas[0] as LinkSnapshot | undefined
  const evidenceLink = evidence.evidenceLinks[0] as LinkSnapshot | undefined
  const h1 = evidence.h1 as RectSnapshot | null
  const image = evidence.productImage as RectSnapshot | null
  const decisionNotes = evidence.decisionNotes as RectSnapshot | null
  const buyDecision = evidence.buyDecision as RectSnapshot | null
  const currentOffer = evidence.currentOffer as RectSnapshot | null
  const decisionShortcuts = evidence.decisionShortcuts as RectSnapshot | null
  const decisionPath = evidence.decisionPath as RectSnapshot | null
  const decisionNotesCta = evidence.decisionNotesCta as RectSnapshot | null
  const productFacts = evidence.productFacts as RectSnapshot | null
  const finalDecisionRecovery = evidence.finalDecisionRecovery as RectSnapshot | null
  const overflowWidth = Math.max(evidence.overflow.scrollWidth, evidence.overflow.bodyScrollWidth)

  if (!isVisible(h1)) throw new Error(`${viewport.label}: h1 is not visible`)
  if (!cta) throw new Error(`${viewport.label}: visible /go CTA is missing`)
  if (!evidenceLink) throw new Error(`${viewport.label}: visible evidence link is missing`)
  if (!isInFirstViewport(h1, viewport.height, 0.55)) throw new Error(`${viewport.label}: h1 is too low (${h1.y}px)`)
  if (!isInFirstViewport(cta.rect, viewport.height, 0.78)) throw new Error(`${viewport.label}: /go CTA is too low (${cta.rect.y}px)`)
  if (!isInFirstViewport(evidenceLink.rect, viewport.height, 0.9)) throw new Error(`${viewport.label}: evidence link is too low (${evidenceLink.rect.y}px)`)
  if (overflowWidth > viewport.width + 2) throw new Error(`${viewport.label}: horizontal overflow ${overflowWidth}px > ${viewport.width}px`)
  if (viewport.width < 1024 && image && image.y < cta.rect.y) {
    throw new Error(`${viewport.label}: product image appears before CTA (${image.y}px < ${cta.rect.y}px)`)
  }
  if (viewport.width >= 1024 && image && cta.rect.y - image.y > 340) {
    throw new Error(`${viewport.label}: image and CTA are not in a responsive Web layout (image y=${image.y}px, CTA y=${cta.rect.y}px)`)
  }
  if (viewport.width >= 1024 && decisionNotes && decisionNotes.width < Math.round(viewport.width * 0.72)) {
    throw new Error(`${viewport.label}: decision notes does not span the content grid (${decisionNotes.width}px)`)
  }
  if (!evidence.htmlHasDisclosure) throw new Error(`${viewport.label}: affiliate disclosure is missing`)
  if (!evidence.htmlHasDecisionNotes) throw new Error(`${viewport.label}: decision notes anchor is missing`)
  if (!evidence.htmlHasBuyDecisionAnchor) throw new Error(`${viewport.label}: buy decision anchor is missing`)
  if (!evidence.htmlHasCurrentOfferAnchor) throw new Error(`${viewport.label}: current offer anchor is missing`)
  if (!isVisible(decisionShortcuts)) throw new Error(`${viewport.label}: decision shortcuts are missing`)
  if (!isVisible(decisionPath)) throw new Error(`${viewport.label}: decision path is missing`)
  if (!isVisible(decisionNotesCta)) throw new Error(`${viewport.label}: decision notes CTA is missing`)
  if (!isVisible(finalDecisionRecovery) || !evidence.htmlHasFinalDecisionRecovery) throw new Error(`${viewport.label}: final decision recovery is missing`)
  if (viewport.width < 640 && !evidence.htmlHasMobileStickyReserve) throw new Error(`${viewport.label}: sticky mobile CTA is not reserved above the final content`)

  return {
    ctaHref: cta.href,
    ctaRect: cta.rect,
    h1Rect: h1,
    evidenceRect: evidenceLink.rect,
    imageRect: image,
    buyDecisionRect: buyDecision,
    currentOfferRect: currentOffer,
    decisionShortcutsRect: decisionShortcuts,
    decisionPathRect: decisionPath,
    decisionNotesRect: decisionNotes,
    decisionNotesCtaRect: decisionNotesCta,
    productFactsRect: productFacts,
    finalDecisionRecoveryRect: finalDecisionRecovery,
    structuredDataCount: evidence.structuredDataCount,
    overflowWidth
  }
}

function buildAuditGoPath(rawHref: string) {
  const url = new URL(rawHref, baseUrl)
  url.searchParams.set('source', 'product-ux-audit')
  url.searchParams.set('visitor', `ux-audit-${runId}`)
  return `${url.pathname}?${url.searchParams.toString()}`
}

async function verifyMerchantHandoff(page: Page, rawHref: string) {
  const goPath = buildAuditGoPath(rawHref)
  const response = await page.request.get(absoluteUrl(goPath), {
    maxRedirects: 0,
    timeout: requestTimeoutMs
  })
  const location = response.headers().location || ''
  if (![301, 302, 303, 307, 308].includes(response.status())) {
    throw new Error(`${goPath} expected redirect, got HTTP ${response.status()}`)
  }
  if (!isCommissionableMerchantUrl(location)) {
    throw new Error(`${goPath} redirected without commissionable attribution: ${location || 'empty location'}`)
  }
  return {
    goPath,
    status: response.status(),
    locationHost: new URL(location).host
  }
}

async function verifySeoGeoSignals(page: Page, routePath: string) {
  const response = await page.request.get(absoluteUrl(routePath), {
    timeout: requestTimeoutMs
  })
  if (response.status() !== 200) throw new Error(`${routePath} expected 200, got ${response.status()}`)
  const html = await response.text()
  await page.goto(routePath, { waitUntil: 'networkidle', timeout: navigationTimeoutMs })
  const domSignals = await page.evaluate(`(() => ({
    hasDecisionNotes: Boolean(document.querySelector('#decision-notes')),
    hasOpenProductJson: Array.from(document.querySelectorAll('a[href^="/api/open/commerce/products/"]')).some((anchor) => (anchor.textContent || '').includes('Open product JSON') && !(anchor.getAttribute('href') || '').endsWith('/offers')),
    hasOpenOfferJson: Array.from(document.querySelectorAll('a[href^="/api/open/commerce/products/"]')).some((anchor) => (anchor.textContent || '').includes('Open offer JSON') && (anchor.getAttribute('href') || '').endsWith('/offers')),
    hasStructuredData: document.querySelectorAll('script[type="application/ld+json"]').length > 0
  }))()`)
  const required = [
    'Should you buy it?',
    'application/ld+json'
  ]
  const missing = required.filter((needle) => !html.includes(needle))
  if (missing.length) throw new Error(`${routePath} missing SEO/GEO signals: ${missing.join(', ')}`)
  if (!domSignals.hasDecisionNotes) throw new Error(`${routePath} DOM missing decision-notes anchor`)
  if (!domSignals.hasOpenProductJson) throw new Error(`${routePath} DOM missing Open product JSON link`)
  if (!domSignals.hasOpenOfferJson) throw new Error(`${routePath} DOM missing Open offer JSON link`)
  if (!domSignals.hasStructuredData) throw new Error(`${routePath} DOM missing structured data`)
  return {
    htmlBytes: html.length,
    structuredDataBlocks: (html.match(/application\/ld\+json/g) || []).length,
    domSignals
  }
}

async function main() {
  const productPath = withCacheBust(`/products/${productSlug}`)
  const browser = await chromium.launch({ headless })
  let firstCtaHref: string | null = null

  try {
    for (const viewport of viewports) {
      await check('Viewport UX', `${viewport.label} first-screen conversion path`, async () => {
        const context = await browser.newContext({
          baseURL: baseUrl,
          viewport: { width: viewport.width, height: viewport.height },
          isMobile: viewport.width <= 480
        })
        const page = await context.newPage()
        const viewportMessages: RuntimeIssue[] = []
        page.on('console', (message) => {
          if (message.type() === 'error' || message.type() === 'warning') {
            const location = message.location()
            const entry = { viewport: viewport.label, type: message.type(), text: message.text(), url: location.url }
            consoleMessages.push(entry)
            viewportMessages.push(entry)
          }
        })
        page.on('pageerror', (error) => {
          const entry = { viewport: viewport.label, type: 'pageerror', text: error.message }
          consoleMessages.push(entry)
          viewportMessages.push(entry)
        })
        page.on('response', (response) => {
          const status = response.status()
          if (status < 400) return
          const request = response.request()
          const resourceType = request.resourceType()
          if (!['image', 'script', 'stylesheet', 'font'].includes(resourceType)) return
          const entry = {
            viewport: viewport.label,
            type: 'resource',
            text: `${resourceType} returned HTTP ${status}`,
            url: response.url(),
            status,
            resourceType
          }
          consoleMessages.push(entry)
          viewportMessages.push(entry)
        })

        try {
          await page.goto(productPath, { waitUntil: 'networkidle', timeout: navigationTimeoutMs })
          const evidence = await collectViewportEvidence(page)
          const viewportResult = assertViewportEvidence(viewport, evidence)
          if (!firstCtaHref) firstCtaHref = viewportResult.ctaHref
          const blockingMessages = failOnWarning
            ? viewportMessages
            : viewportMessages.filter((message) => message.type !== 'warning')
          if (blockingMessages.length) {
            throw new Error(`${viewport.label}: console issues: ${blockingMessages.map((message) => `${message.type}: ${message.text}`).slice(0, 3).join(' | ')}`)
          }
          return {
            path: productPath,
            title: evidence.title,
            ...viewportResult
          }
        } finally {
          await context.close()
        }
      })
    }

    await check('SEO/GEO', 'Product page exposes crawler-readable decision signals', async () => {
      const context = await browser.newContext({ baseURL: baseUrl })
      const page = await context.newPage()
      try {
        return await verifySeoGeoSignals(page, productPath)
      } finally {
        await context.close()
      }
    })

    if (verifyGoRedirect) {
      await check('Affiliate handoff', 'Visible /go CTA redirects to a commissionable merchant URL', async () => {
        if (!firstCtaHref) throw new Error('No first CTA href captured from viewport audits')
        const context = await browser.newContext({ baseURL: baseUrl })
        const page = await context.newPage()
        try {
          return await verifyMerchantHandoff(page, firstCtaHref)
        } finally {
          await context.close()
        }
      })
    }
  } finally {
    await browser.close()
  }

  await fs.mkdir(outputDir, { recursive: true })
  const report = {
    baseUrl,
    productSlug,
    generatedAt: new Date().toISOString(),
    failOnWarning,
    verifyGoRedirect,
    totals: {
      passed: results.filter((result) => result.status === 'passed').length,
      failed: results.filter((result) => result.status === 'failed').length
    },
    consoleMessages,
    results
  }
  const outputPath = path.join(outputDir, `product-conversion-ux-audit-${runId}.json`)
  await fs.writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`)
  console.log(`REPORT ${outputPath}`)

  if (report.totals.failed > 0) {
    throw new Error(`Product conversion UX audit failed: ${report.totals.failed} failed`)
  }
}

main().catch((error) => {
  console.error(error?.message || error)
  process.exit(1)
})
