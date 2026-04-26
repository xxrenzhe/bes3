import './load-env'
import path from 'node:path'
import { mkdir } from 'node:fs/promises'
import { chromium, type Page } from 'playwright'
import { bootstrapApplication } from '@/lib/bootstrap'
import { HARDCORE_CATEGORIES } from '@/lib/hardcore-catalog'
import { listHardcoreProducts, listHardcoreTags } from '@/lib/hardcore'
import { getSiteUrl } from '@/lib/site-url'

type RedditScreenshotTarget = {
  categorySlug: string
  tagSlug: string
  targetUrl: string
  screenshotTarget: string
  screenshotPath: string
  evidenceCount: number
  productsCovered: number
}

function readStringFlag(name: string, fallback: string) {
  const prefix = `--${name}=`
  return process.argv.find((item) => item.startsWith(prefix))?.slice(prefix.length) || fallback
}

function readNumberFlag(name: string, fallback: number) {
  const parsed = Number(readStringFlag(name, String(fallback)))
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

function readBooleanFlag(name: string) {
  return process.argv.includes(`--${name}`)
}

function normalizeBaseUrl(value: string) {
  return value.trim().replace(/\/+$/, '')
}

function safeFilename(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

async function buildTargets(outputDir: string, baseUrl: string, limit: number): Promise<RedditScreenshotTarget[]> {
  const [products, tags] = await Promise.all([listHardcoreProducts(), listHardcoreTags()])
  const targets: RedditScreenshotTarget[] = []

  for (const category of HARDCORE_CATEGORIES) {
    const categoryProducts = products.filter((product) => product.categorySlug === category.slug)
    const categoryTags = tags.filter((tag) => tag.categorySlug === category.slug && tag.isCorePainpoint)

    for (const tag of categoryTags.slice(0, 4)) {
      const evidenceCount = categoryProducts.reduce(
        (total, product) => total + product.evidence.filter((report) => report.tagSlug === tag.slug).length,
        0
      )
      const targetUrl = `${baseUrl}/${category.slug}/best-${category.slug}-for-${tag.slug}`
      const filename = `${safeFilename(category.slug)}__${safeFilename(tag.slug)}__consensus-matrix.png`

      targets.push({
        categorySlug: category.slug,
        tagSlug: tag.slug,
        targetUrl,
        screenshotTarget: `${targetUrl}#consensus-matrix`,
        screenshotPath: path.join(outputDir, filename),
        evidenceCount,
        productsCovered: categoryProducts.length
      })
    }
  }

  return targets
    .sort((left, right) => right.evidenceCount - left.evidenceCount || right.productsCovered - left.productsCovered)
    .slice(0, limit)
}

async function addWatermark(page: Page, watermark: string) {
  await page.locator('#consensus-matrix').first().evaluate((element, text) => {
    element.querySelector('[data-reddit-kit-watermark]')?.remove()
    const container = element as HTMLElement
    const existingPosition = window.getComputedStyle(container).position

    if (existingPosition === 'static') {
      container.style.position = 'relative'
    }

    const badge = document.createElement('div')
    badge.dataset.redditKitWatermark = 'true'
    badge.textContent = text
    Object.assign(badge.style, {
      position: 'absolute',
      right: '16px',
      bottom: '12px',
      zIndex: '20',
      border: '1px solid rgba(15, 23, 42, 0.16)',
      borderRadius: '8px',
      background: 'rgba(255, 255, 255, 0.92)',
      color: '#0f172a',
      font: '600 12px/1.2 system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      padding: '8px 10px',
      boxShadow: '0 8px 24px rgba(15, 23, 42, 0.12)',
      pointerEvents: 'none'
    })
    container.appendChild(badge)
  }, watermark)
}

async function main() {
  await bootstrapApplication()

  const dryRun = readBooleanFlag('dry-run')
  const limit = readNumberFlag('limit', 20)
  const outputDir = readStringFlag('output-dir', 'storage/reddit-kit')
  const baseUrl = normalizeBaseUrl(readStringFlag('base-url', getSiteUrl()))
  const timeoutMs = readNumberFlag('timeout-ms', 30_000)
  const viewportWidth = readNumberFlag('viewport-width', 1440)
  const viewportHeight = readNumberFlag('viewport-height', 1100)
  const watermark = readStringFlag('watermark', 'BES3 Reddit evidence matrix')
  const targets = await buildTargets(outputDir, baseUrl, limit)

  if (dryRun) {
    console.log(JSON.stringify({
      dryRun: true,
      generated: targets.length,
      outputDir,
      targets
    }))
    return
  }

  await mkdir(outputDir, { recursive: true })
  const browser = await chromium.launch()
  const page = await browser.newPage({
    viewport: {
      width: viewportWidth,
      height: viewportHeight
    },
    deviceScaleFactor: 1
  })
  const captures = []

  for (const target of targets) {
    try {
      await page.goto(target.screenshotTarget, { waitUntil: 'networkidle', timeout: timeoutMs })
      const matrix = page.locator('#consensus-matrix').first()
      await matrix.waitFor({ state: 'visible', timeout: timeoutMs })
      await addWatermark(page, watermark)
      await matrix.screenshot({ path: target.screenshotPath })
      captures.push({ ...target, status: 'captured' })
    } catch (error) {
      captures.push({
        ...target,
        status: 'failed',
        error: error instanceof Error ? error.message : String(error)
      })
    }
  }

  await browser.close()

  const failed = captures.filter((capture) => capture.status === 'failed')
  console.log(JSON.stringify({
    generated: targets.length,
    captured: captures.length - failed.length,
    failed: failed.length,
    outputDir,
    captures
  }))

  if (failed.length) {
    process.exitCode = 1
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
