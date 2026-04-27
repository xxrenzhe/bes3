import { chromium, type Browser, type BrowserContext, type Page, type Response } from 'playwright'
import { getPlaywrightProxy, resolveBrowserProxy } from '@/lib/browser-proxy'
import { getDatabase } from '@/lib/db'
import { buildProductIdentityEnrichment } from '@/lib/product-acquisition'
import { scrapeProductPage, type ScrapedProduct } from '@/lib/scraper'
import { getSettingValueOrEnv } from '@/lib/settings'
import { resolveAffiliateLinkWithOptions } from '@/lib/url-resolver'

type DeepScrapeStatus = 'queued' | 'running' | 'completed' | 'failed' | 'fallback'

type BrowserSignals = {
  title: string | null
  metaDescription: string | null
  canonicalUrl: string | null
  imageUrls: string[]
  bulletTexts: string[]
  reviewTexts: string[]
  specs: Record<string, string>
  priceText: string | null
  availabilityText: string | null
  schemaCount: number
  textLength: number
}

export type DeepProductScrapeResult = {
  taskId: string
  finalUrl: string
  landingHtml: string
  redirectTrail: string[]
  scraped: ScrapedProduct
  browserSignals: BrowserSignals | null
  browserUsed: boolean
  fallbackUsed: boolean
  httpStatus: number | null
}

export type DeepProductScrapeInput = {
  runId: number
  sourceLink: string
  affiliateProductId?: number | null
  productId?: number | null
  countryCode?: string | null
}

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:133.0) Gecko/20100101 Firefox/133.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.2 Safari/605.1.15',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36 Edg/130.0.0.0'
]

const COUNTRY_CONTEXT: Record<string, { locale: string; timezoneId: string; languages: string[] }> = {
  US: { locale: 'en-US', timezoneId: 'America/New_York', languages: ['en-US', 'en'] },
  GB: { locale: 'en-GB', timezoneId: 'Europe/London', languages: ['en-GB', 'en'] },
  UK: { locale: 'en-GB', timezoneId: 'Europe/London', languages: ['en-GB', 'en'] },
  DE: { locale: 'de-DE', timezoneId: 'Europe/Berlin', languages: ['de-DE', 'de', 'en'] },
  FR: { locale: 'fr-FR', timezoneId: 'Europe/Paris', languages: ['fr-FR', 'fr', 'en'] },
  IT: { locale: 'it-IT', timezoneId: 'Europe/Rome', languages: ['it-IT', 'it', 'en'] },
  ES: { locale: 'es-ES', timezoneId: 'Europe/Madrid', languages: ['es-ES', 'es', 'en'] },
  JP: { locale: 'ja-JP', timezoneId: 'Asia/Tokyo', languages: ['ja-JP', 'ja', 'en'] },
  CA: { locale: 'en-CA', timezoneId: 'America/Toronto', languages: ['en-CA', 'en', 'fr'] },
  AU: { locale: 'en-AU', timezoneId: 'Australia/Sydney', languages: ['en-AU', 'en'] }
}

function normalizeCountryCode(value: string | null | undefined): string {
  return String(value || 'US').trim().toUpperCase() || 'US'
}

function pickUserAgent(): string {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)] || USER_AGENTS[0]
}

function parsePositiveInteger(value: string, fallback: number, max?: number): number {
  const parsed = Number.parseInt(value, 10)
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback
  return typeof max === 'number' ? Math.min(parsed, max) : parsed
}

function uniqueStrings(values: Array<string | null | undefined>, limit: number): string[] {
  const seen = new Set<string>()
  const result: string[] = []
  for (const value of values) {
    const text = String(value || '').replace(/\s+/g, ' ').trim()
    if (!text) continue
    const key = text.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    result.push(text)
    if (result.length >= limit) break
  }
  return result
}

function parsePriceText(raw: string | null | undefined): number | null {
  const match = String(raw || '').replace(/,/g, '').match(/(\d+(?:\.\d+)?)/)
  return match ? Number(match[1]) : null
}

function normalizeAvailability(raw: string | null | undefined): string | null {
  const value = String(raw || '').trim().toLowerCase()
  if (!value) return null
  if (value.includes('in stock') || value.includes('available')) return 'in_stock'
  if (value.includes('limited')) return 'limited'
  if (value.includes('preorder') || value.includes('pre-order')) return 'preorder'
  if (value.includes('out of stock') || value.includes('unavailable')) return 'out_of_stock'
  return value.replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') || null
}

async function getDeepScrapeRuntimeConfig() {
  const [enabled, timeoutMs, waitAfterLoadMs, maxAttempts, requireProxy] = await Promise.all([
    getSettingValueOrEnv('deepScrape', 'enabled', 'DEEP_PRODUCT_SCRAPE_ENABLED', 'true'),
    getSettingValueOrEnv('deepScrape', 'timeoutMs', 'DEEP_PRODUCT_SCRAPE_TIMEOUT_MS', '60000'),
    getSettingValueOrEnv('deepScrape', 'waitAfterLoadMs', 'DEEP_PRODUCT_SCRAPE_WAIT_AFTER_LOAD_MS', '1500'),
    getSettingValueOrEnv('deepScrape', 'maxAttempts', 'DEEP_PRODUCT_SCRAPE_MAX_ATTEMPTS', '2'),
    getSettingValueOrEnv('deepScrape', 'requireProxy', 'DEEP_PRODUCT_SCRAPE_REQUIRE_PROXY', 'false')
  ])

  return {
    enabled: enabled !== 'false',
    timeoutMs: parsePositiveInteger(timeoutMs, 60000, 180000),
    waitAfterLoadMs: parsePositiveInteger(waitAfterLoadMs, 1500, 10000),
    maxAttempts: parsePositiveInteger(maxAttempts, 2, 5),
    requireProxy: requireProxy === 'true'
  }
}

async function ensureScrapeTask(input: DeepProductScrapeInput, maxAttempts: number): Promise<string> {
  const db = await getDatabase()
  const existing = await db.queryOne<{ id: string }>('SELECT id FROM product_scrape_tasks WHERE run_id = ? LIMIT 1', [input.runId])
  if (existing?.id) {
    await db.exec(
      `
        UPDATE product_scrape_tasks
        SET affiliate_product_id = ?, product_id = ?, source_link = ?, country_code = ?, max_attempts = ?,
            status = CASE WHEN status IN ('completed', 'running') THEN status ELSE 'queued' END,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
      [
        input.affiliateProductId || null,
        input.productId || null,
        input.sourceLink,
        normalizeCountryCode(input.countryCode),
        maxAttempts,
        existing.id
      ]
    )
    return existing.id
  }

  const taskId = crypto.randomUUID()
  await db.exec(
    `
      INSERT INTO product_scrape_tasks (
        id, run_id, affiliate_product_id, product_id, source_link, country_code, status, stage, progress, max_attempts
      ) VALUES (?, ?, ?, ?, ?, ?, 'queued', NULL, 0, ?)
    `,
    [
      taskId,
      input.runId,
      input.affiliateProductId || null,
      input.productId || null,
      input.sourceLink,
      normalizeCountryCode(input.countryCode),
      maxAttempts
    ]
  )
  return taskId
}

async function updateScrapeTask(taskId: string, input: {
  status?: DeepScrapeStatus
  stage?: string | null
  progress?: number
  finalUrl?: string | null
  proxyCountry?: string | null
  proxyUsed?: string | null
  browserEngine?: string | null
  httpStatus?: number | null
  requestHeaders?: Record<string, string> | null
  redirectChain?: string[] | null
  browserSignals?: BrowserSignals | null
  result?: unknown
  errorMessage?: string | null
  started?: boolean
  completed?: boolean
  incrementAttempt?: boolean
}) {
  const db = await getDatabase()
  await db.exec(
    `
      UPDATE product_scrape_tasks
      SET status = COALESCE(?, status),
          stage = CASE WHEN ? = 1 THEN ? ELSE stage END,
          progress = COALESCE(?, progress),
          final_url = COALESCE(?, final_url),
          proxy_country = COALESCE(?, proxy_country),
          proxy_used = COALESCE(?, proxy_used),
          browser_engine = COALESCE(?, browser_engine),
          http_status = COALESCE(?, http_status),
          request_headers_json = CASE WHEN ? = 1 THEN ? ELSE request_headers_json END,
          redirect_chain_json = CASE WHEN ? = 1 THEN ? ELSE redirect_chain_json END,
          browser_signals_json = CASE WHEN ? = 1 THEN ? ELSE browser_signals_json END,
          result_json = CASE WHEN ? = 1 THEN ? ELSE result_json END,
          error_message = CASE WHEN ? = 1 THEN ? ELSE error_message END,
          started_at = CASE WHEN ? = 1 THEN COALESCE(started_at, CURRENT_TIMESTAMP) ELSE started_at END,
          completed_at = CASE WHEN ? = 1 THEN CURRENT_TIMESTAMP ELSE completed_at END,
          attempt_count = CASE WHEN ? = 1 THEN attempt_count + 1 ELSE attempt_count END,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `,
    [
      input.status || null,
      Object.prototype.hasOwnProperty.call(input, 'stage') ? 1 : 0,
      input.stage || null,
      typeof input.progress === 'number' ? input.progress : null,
      input.finalUrl || null,
      input.proxyCountry || null,
      input.proxyUsed || null,
      input.browserEngine || null,
      typeof input.httpStatus === 'number' ? input.httpStatus : null,
      Object.prototype.hasOwnProperty.call(input, 'requestHeaders') ? 1 : 0,
      input.requestHeaders ? JSON.stringify(input.requestHeaders) : null,
      Object.prototype.hasOwnProperty.call(input, 'redirectChain') ? 1 : 0,
      input.redirectChain ? JSON.stringify(input.redirectChain) : null,
      Object.prototype.hasOwnProperty.call(input, 'browserSignals') ? 1 : 0,
      input.browserSignals ? JSON.stringify(input.browserSignals) : null,
      Object.prototype.hasOwnProperty.call(input, 'result') ? 1 : 0,
      input.result ? JSON.stringify(input.result) : null,
      Object.prototype.hasOwnProperty.call(input, 'errorMessage') ? 1 : 0,
      input.errorMessage || null,
      input.started ? 1 : 0,
      input.completed ? 1 : 0,
      input.incrementAttempt ? 1 : 0,
      taskId
    ]
  )
}

async function configureStealthContext(context: BrowserContext, countryCode: string, userAgent: string) {
  const countryContext = COUNTRY_CONTEXT[countryCode] || COUNTRY_CONTEXT.US
  const languages = countryContext.languages
  await context.setExtraHTTPHeaders({
    'User-Agent': userAgent,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    'Accept-Language': languages.join(',') + ';q=0.9',
    'Cache-Control': 'max-age=0',
    DNT: '1',
    'Upgrade-Insecure-Requests': '1'
  })
  await context.addInitScript(({ navigatorLanguages }: { navigatorLanguages: string[] }) => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined })
    Object.defineProperty(navigator, 'languages', { get: () => navigatorLanguages })
    Object.defineProperty(navigator, 'plugins', {
      get: () => [
        { name: 'Chrome PDF Plugin', filename: 'internal-pdf-viewer', description: 'Portable Document Format' },
        { name: 'Chrome PDF Viewer', filename: 'mhjfbmdgcfjbbpaeojofohoefgiehjai', description: 'Portable Document Format' }
      ]
    })
    const windowRef = window as typeof window & { chrome?: unknown }
    windowRef.chrome = windowRef.chrome || { runtime: {} }
  }, { navigatorLanguages: languages })
}

async function extractBrowserSignals(page: Page): Promise<BrowserSignals> {
  return page.evaluate(`
    (() => {
    const clean = (value) => String(value || '').replace(/\\s+/g, ' ').trim()
    const readMeta = (selector) => clean(document.querySelector(selector)?.getAttribute('content')) || null
    const absoluteUrl = (value) => {
      const text = clean(value)
      if (!text || text.startsWith('data:')) return null
      try {
        return new URL(text, location.href).toString()
      } catch {
        return null
      }
    }
    const imageUrls = Array.from(document.querySelectorAll('img'))
      .map((image) => absoluteUrl(image.currentSrc || image.src || image.getAttribute('data-src')))
      .filter((value) => Boolean(value))
      .slice(0, 80)
    const bulletTexts = Array.from(document.querySelectorAll('li, [data-hook="feature-bullets"] span, #feature-bullets span, .product__description li'))
      .map((node) => clean(node.textContent))
      .filter((text) => text.length >= 12 && text.length <= 240)
      .slice(0, 80)
    const reviewTexts = Array.from(document.querySelectorAll('[data-hook="review-body"], [data-testid*="review"], .review, .spr-review-content, .jdgm-rev__body'))
      .map((node) => clean(node.textContent))
      .filter((text) => text.length >= 20 && text.length <= 600)
      .slice(0, 40)
    const specs = {}
    for (const row of Array.from(document.querySelectorAll('tr'))) {
      const cells = Array.from(row.querySelectorAll('th,td')).map((cell) => clean(cell.textContent))
      if (cells.length >= 2 && cells[0] && cells[1] && cells[0].length <= 80 && cells[1].length <= 220) {
        specs[cells[0]] = specs[cells[0]] || cells.slice(1).join(' ')
      }
    }
    for (const detailList of Array.from(document.querySelectorAll('dl'))) {
      const children = Array.from(detailList.children)
      for (let index = 0; index < children.length - 1; index += 1) {
        if (children[index].tagName.toLowerCase() !== 'dt') continue
        const label = clean(children[index].textContent)
        const value = clean(children[index + 1]?.textContent)
        if (label && value && label.length <= 80 && value.length <= 220) {
          specs[label] = specs[label] || value
        }
      }
    }
    const priceText = clean(document.querySelector('[itemprop="price"], .a-price .a-offscreen, .price, [class*="price"]')?.textContent) || null
    const availabilityText = clean(document.querySelector('#availability, [data-testid*="availability"], [class*="availability"], [class*="stock"]')?.textContent) || null

    return {
      title: clean(document.title) || readMeta('meta[property="og:title"]'),
      metaDescription: readMeta('meta[name="description"]') || readMeta('meta[property="og:description"]'),
      canonicalUrl: absoluteUrl(document.querySelector('link[rel="canonical"]')?.getAttribute('href') || null),
      imageUrls,
      bulletTexts,
      reviewTexts,
      specs,
      priceText,
      availabilityText,
      schemaCount: document.querySelectorAll('script[type="application/ld+json"]').length,
      textLength: clean(document.body?.innerText).length
    }
    })()
  `)
}

async function prepareBrowser(countryCode: string): Promise<{
  browser: Browser
  context: BrowserContext
  page: Page
  userAgent: string
  proxyUsed: string | null
}> {
  const userAgent = pickUserAgent()
  const countryContext = COUNTRY_CONTEXT[countryCode] || COUNTRY_CONTEXT.US
  const proxy = await getPlaywrightProxy(countryCode)
  const browser = await chromium.launch({
    headless: process.env.PLAYWRIGHT_HEADLESS !== 'false',
    proxy,
    args: [
      '--disable-blink-features=AutomationControlled',
      '--disable-dev-shm-usage',
      '--disable-setuid-sandbox',
      '--no-sandbox',
      '--disable-web-security',
      '--disable-features=IsolateOrigins,site-per-process',
      '--disable-site-isolation-trials',
      '--disable-http2',
      '--disable-quic'
    ]
  })
  const context = await browser.newContext({
    userAgent,
    viewport: { width: 1440, height: 1100 },
    locale: countryContext.locale,
    timezoneId: countryContext.timezoneId,
    ignoreHTTPSErrors: true
  })
  await configureStealthContext(context, countryCode, userAgent)
  const page = await context.newPage()
  await page.route('**/*', async (route) => {
    const resourceType = route.request().resourceType()
    if (resourceType === 'font' || resourceType === 'media') {
      await route.abort().catch(() => undefined)
      return
    }
    await route.continue().catch(() => undefined)
  })
  return {
    browser,
    context,
    page,
    userAgent,
    proxyUsed: proxy?.server || null
  }
}

async function runBrowserScrape(input: DeepProductScrapeInput, taskId: string): Promise<Omit<DeepProductScrapeResult, 'taskId' | 'scraped' | 'fallbackUsed'>> {
  const countryCode = normalizeCountryCode(input.countryCode)
  const runtime = await getDeepScrapeRuntimeConfig()
  const browserRuntime = await prepareBrowser(countryCode)
  const redirectTrail: string[] = []
  let mainResponse: Response | null = null

  try {
    await updateScrapeTask(taskId, {
      status: 'running',
      stage: 'deepBrowserResolve',
      progress: 20,
      proxyCountry: countryCode,
      proxyUsed: browserRuntime.proxyUsed,
      browserEngine: 'chromium',
      requestHeaders: { 'user-agent': browserRuntime.userAgent },
      started: true,
      incrementAttempt: true
    })
    browserRuntime.page.on('framenavigated', (frame) => {
      if (frame === browserRuntime.page.mainFrame()) {
        const frameUrl = frame.url()
        if (frameUrl && redirectTrail[redirectTrail.length - 1] !== frameUrl) {
          redirectTrail.push(frameUrl)
        }
      }
    })
    mainResponse = await browserRuntime.page.goto(input.sourceLink, {
      waitUntil: 'domcontentloaded',
      timeout: runtime.timeoutMs
    })
    await browserRuntime.page.waitForLoadState('networkidle', { timeout: Math.min(20000, runtime.timeoutMs) }).catch(() => undefined)
    await browserRuntime.page.waitForTimeout(runtime.waitAfterLoadMs)
    await browserRuntime.page.evaluate(() => window.scrollTo(0, Math.min(document.body.scrollHeight, 1600))).catch(() => undefined)
    await browserRuntime.page.waitForTimeout(Math.min(1000, runtime.waitAfterLoadMs))

    await updateScrapeTask(taskId, { stage: 'extractBrowserSignals', progress: 65 })
    const finalUrl = browserRuntime.page.url()
    const landingHtml = await browserRuntime.page.content()
    const browserSignals = await extractBrowserSignals(browserRuntime.page)
    const finalRedirectTrail = uniqueStrings([input.sourceLink, ...redirectTrail, finalUrl], 25)
    await updateScrapeTask(taskId, {
      stage: 'deepBrowserScrape',
      progress: 80,
      finalUrl,
      httpStatus: mainResponse?.status() || null,
      redirectChain: finalRedirectTrail,
      browserSignals
    })
    return {
      finalUrl,
      landingHtml,
      redirectTrail: finalRedirectTrail,
      browserSignals,
      browserUsed: true,
      httpStatus: mainResponse?.status() || null
    }
  } finally {
    await browserRuntime.context.close().catch(() => undefined)
    await browserRuntime.browser.close().catch(() => undefined)
  }
}

function mergeBrowserSignals(scraped: ScrapedProduct, signals: BrowserSignals | null): ScrapedProduct {
  if (!signals) return scraped
  const specs = { ...scraped.specs }
  for (const [label, value] of Object.entries(signals.specs)) {
    if (!specs[label] && value) specs[label] = value
  }

  const priceAmount = scraped.priceAmount ?? parsePriceText(signals.priceText)
  const availabilityStatus = normalizeAvailability(signals.availabilityText)
  const imageUrls = uniqueStrings([...scraped.imageUrls, ...signals.imageUrls], 18)
  const reviewHighlights = uniqueStrings([...scraped.reviewHighlights, ...signals.reviewTexts, ...signals.bulletTexts], 16)
  const description = scraped.description || signals.metaDescription || signals.bulletTexts.slice(0, 3).join(' ') || null
  const productName =
    scraped.productName && !/^unknown\b/i.test(scraped.productName)
      ? scraped.productName
      : signals.title || scraped.productName
  const identity = buildProductIdentityEnrichment({
    productName,
    brand: scraped.brand,
    category: scraped.category,
    specs,
    rawPayload: { browserSignals: signals }
  })
  const offers = scraped.offers.length > 0 || priceAmount == null
    ? scraped.offers
    : [{
        merchantName: new URL(scraped.finalUrl).hostname.replace(/^www\./, ''),
        websiteUrl: new URL(scraped.finalUrl).origin,
        offerUrl: scraped.finalUrl,
        availabilityStatus,
        priceAmount,
        priceCurrency: scraped.priceCurrency || 'USD',
        shippingCost: null,
        couponText: null,
        couponType: null,
        referencePriceAmount: null,
        referencePriceCurrency: null,
        referencePriceType: null,
        referencePriceSource: null,
        referencePriceLastCheckedAt: null,
        conditionLabel: null,
        sourceType: 'dom' as const,
        sourceUrl: scraped.finalUrl,
        confidenceScore: 0.74,
        rawPayload: { source: 'deep_browser_signals' }
      }]
  const existingFactKeys = new Set(scraped.attributeFacts.map((fact) => fact.key))
  const browserAttributeFacts = Object.entries(specs)
    .map(([label, value]) => ({
      key: label.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, ''),
      label,
      value,
      sourceUrl: scraped.finalUrl,
      sourceType: 'dom' as const,
      confidenceScore: 0.78,
      isVerified: false
    }))
    .filter((fact) => fact.key && !existingFactKeys.has(fact.key))

  return {
    ...scraped,
    productName,
    productModel: scraped.productModel || identity.productModel,
    modelNumber: scraped.modelNumber || identity.modelNumber,
    productType: scraped.productType || identity.productType,
    category: scraped.category || identity.category,
    categorySlug: scraped.categorySlug || identity.categorySlug,
    youtubeMatchTerms: scraped.youtubeMatchTerms.length ? scraped.youtubeMatchTerms : identity.youtubeMatchTerms,
    description,
    priceAmount,
    imageUrls,
    specs,
    reviewHighlights,
    offers,
    attributeFacts: [...scraped.attributeFacts, ...browserAttributeFacts],
    attributeCompletenessScore: Math.max(scraped.attributeCompletenessScore, Object.keys(specs).length >= 5 ? 0.82 : scraped.attributeCompletenessScore),
    dataConfidenceScore: Number(Math.min(0.98, scraped.dataConfidenceScore + (signals.schemaCount > 0 ? 0.12 : 0.08)).toFixed(2)),
    sourceCount: Math.max(scraped.sourceCount + 1, 2)
  }
}

async function runFetchFallback(
  input: DeepProductScrapeInput,
  taskId: string,
  strictProxy: boolean
): Promise<Omit<DeepProductScrapeResult, 'taskId' | 'scraped' | 'fallbackUsed'>> {
  await updateScrapeTask(taskId, { status: 'fallback', stage: 'resolveAffiliateLink', progress: 35 })
  const resolved = await resolveAffiliateLinkWithOptions(input.sourceLink, input.countryCode, { strictProxy })
  return {
    finalUrl: resolved.finalUrl,
    landingHtml: resolved.landingHtml,
    redirectTrail: resolved.redirectTrail,
    browserSignals: null,
    browserUsed: false,
    httpStatus: null
  }
}

export async function runDeepProductScrapeTask(input: DeepProductScrapeInput): Promise<DeepProductScrapeResult> {
  const countryCode = normalizeCountryCode(input.countryCode)
  const runtime = await getDeepScrapeRuntimeConfig()
  const taskId = await ensureScrapeTask({ ...input, countryCode }, runtime.maxAttempts)
  const proxy = await resolveBrowserProxy(countryCode)

  if (runtime.requireProxy && !proxy) {
    const message = `Deep product scrape requires proxy, but no proxy is configured for ${countryCode}`
    await updateScrapeTask(taskId, { status: 'failed', stage: 'proxyWarmup', progress: 0, errorMessage: message, completed: true })
    throw new Error(message)
  }

  await updateScrapeTask(taskId, {
    status: 'running',
    stage: 'proxyWarmup',
    progress: 10,
    proxyCountry: countryCode,
    proxyUsed: proxy ? `${proxy.protocol}://${proxy.host}:${proxy.port}` : null,
    started: true
  })

  let scrapeResult: Omit<DeepProductScrapeResult, 'taskId' | 'scraped' | 'fallbackUsed'>
  let fallbackUsed = false
  try {
    if (!runtime.enabled) {
      throw new Error('Deep browser scraping disabled')
    }
    scrapeResult = await runBrowserScrape({ ...input, countryCode }, taskId)
  } catch (error: any) {
    await updateScrapeTask(taskId, {
      status: 'fallback',
      stage: 'deepBrowserScrape',
      progress: 30,
      errorMessage: error?.message || String(error)
    })
    fallbackUsed = true
    scrapeResult = await runFetchFallback({ ...input, countryCode }, taskId, Boolean(proxy))
  }

  const scraped = mergeBrowserSignals(scrapeProductPage(scrapeResult.finalUrl, scrapeResult.landingHtml), scrapeResult.browserSignals)
  const result: DeepProductScrapeResult = {
    taskId,
    ...scrapeResult,
    scraped,
    fallbackUsed
  }
  await updateScrapeTask(taskId, {
    status: fallbackUsed ? 'fallback' : 'completed',
    stage: 'completed',
    progress: 100,
    finalUrl: result.finalUrl,
    httpStatus: result.httpStatus,
    redirectChain: result.redirectTrail,
    browserSignals: result.browserSignals,
    result: {
      productName: result.scraped.productName,
      brand: result.scraped.brand,
      productModel: result.scraped.productModel,
      modelNumber: result.scraped.modelNumber,
      productType: result.scraped.productType,
      category: result.scraped.category,
      imageCount: result.scraped.imageUrls.length,
      offerCount: result.scraped.offers.length,
      attributeFactCount: result.scraped.attributeFacts.length,
      dataConfidenceScore: result.scraped.dataConfidenceScore,
      fallbackUsed
    },
    completed: true
  })

  return result
}
