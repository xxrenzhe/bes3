import { chromium } from 'playwright'

function extractMetaRefresh(html: string): string | null {
  const match = html.match(/http-equiv=["']refresh["'][^>]*content=["'][^;]+;\s*url=([^"'>]+)["']/i)
  return match?.[1] ? decodeURIComponent(match[1]) : null
}

function extractWindowLocation(html: string): string | null {
  const patterns = [
    /window\.location\.href\s*=\s*['"]([^'"]+)['"]/i,
    /window\.location\s*=\s*['"]([^'"]+)['"]/i,
    /location\.replace\(['"]([^'"]+)['"]\)/i
  ]

  for (const pattern of patterns) {
    const match = html.match(pattern)
    if (match?.[1]) {
      return match[1]
    }
  }

  return null
}

export async function resolveAffiliateLink(url: string): Promise<{
  finalUrl: string
  landingHtml: string
  redirectTrail: string[]
}> {
  const redirectTrail: string[] = [url]
  const response = await fetch(url, {
    redirect: 'follow',
    headers: {
      'user-agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0 Safari/537.36'
    }
  })
  const landingHtml = await response.text()
  let finalUrl = response.url || url

  const refreshUrl = extractMetaRefresh(landingHtml) || extractWindowLocation(landingHtml)
  if (refreshUrl) {
    const absolute = new URL(refreshUrl, finalUrl).toString()
    redirectTrail.push(absolute)
    const nextResponse = await fetch(absolute, {
      redirect: 'follow',
      headers: {
        'user-agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0 Safari/537.36'
      }
    })
    return {
      finalUrl: nextResponse.url || absolute,
      landingHtml: await nextResponse.text(),
      redirectTrail
    }
  }

  if (finalUrl === url && process.env.PLAYWRIGHT_HEADLESS !== 'false') {
    try {
      const browser = await chromium.launch({ headless: true })
      const page = await browser.newPage()
      await page.goto(url, { waitUntil: 'networkidle', timeout: 45000 })
      finalUrl = page.url()
      const html = await page.content()
      await browser.close()
      redirectTrail.push(finalUrl)
      return {
        finalUrl,
        landingHtml: html,
        redirectTrail
      }
    } catch {
      return {
        finalUrl,
        landingHtml,
        redirectTrail
      }
    }
  }

  redirectTrail.push(finalUrl)
  return { finalUrl, landingHtml, redirectTrail }
}
