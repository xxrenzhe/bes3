import { load } from 'cheerio'
import { importPKCS8, SignJWT } from 'jose'
import { getDatabase } from '@/lib/db'
import { SUPPORTED_LOCALES } from '@/lib/i18n'
import { getSettingValueOrEnv } from '@/lib/settings'
import { toAbsoluteUrl } from '@/lib/site-url'

type PublishEventStatus = 'success' | 'warning' | 'error' | 'skipped'

type SyndicationTarget = {
  id: string
  platformName: string
  type: 'webhook'
  endpoint: string
  authToken?: string
  enabled?: boolean
  headers?: Record<string, string>
}

type SyndicationPagePayload = {
  seoPageId: number | null
  path: string
  title: string
  description: string
  canonicalUrl: string
  excerpt: string
  heroImageUrl: string | null
  publishedAt: string | null
  articleType: string | null
  productName: string | null
  brand: string | null
  category: string | null
  previewMarkdown: string
}

type LinkInspectionIssueType = 'http_error' | 'out_of_stock' | 'missing_destination' | 'timeout' | 'unknown'

export type PublishDispatchSummary = {
  pingomatic: PublishEventStatus
  googleIndexing: PublishEventStatus
  syndication: PublishEventStatus
}

export type LinkInspectorSummary = {
  runId: number
  status: string
  totalChecked: number
  issuesFound: number
  brokenCount: number
  outOfStockCount: number
  finishedAt: string | null
}

export type SeoOpsSummary = {
  supportedLocales: string[]
  seoRemediationQueue: Array<{
    severity: 'high' | 'medium' | 'low'
    issueType: string
    pathname: string
    title: string
    issueDetail: string
    articleId: number | null
    productId: number | null
    adminHref: string | null
    publicHref: string
    recommendedAction: string
    updatedAt: string | null
  }>
  seoAlignmentAudit: {
    scannedPages: number
    affectedPages: number
    issuesFound: number
    findings: Array<{
      pathname: string
      title: string
      pageType: string
      articleType: string | null
      issueType: string
      issueDetail: string
      updatedAt: string | null
    }>
  }
  renderedPageAudit: {
    scannedPages: number
    affectedPages: number
    issuesFound: number
    findings: Array<{
      pathname: string
      title: string
      issueType: string
      issueDetail: string
      checkedAt: string
    }>
  }
  trustSurfaceAudit: {
    scannedPages: number
    affectedPages: number
    issuesFound: number
    findings: Array<{
      pathname: string
      title: string
      issueType: string
      issueDetail: string
      checkedAt: string
    }>
  }
  lastLinkInspectorRun: LinkInspectorSummary | null
  latestLinkIssues: Array<{
    id: number
    productId: number | null
    productName: string | null
    sourceUrl: string
    finalUrl: string | null
    httpStatus: number | null
    issueType: string | null
    issueDetail: string | null
    checkedAt: string
  }>
  recentIndexingEvents: Array<{
    id: number
    status: string
    payloadJson: string | null
    createdAt: string
  }>
  recentSyndicationEvents: Array<{
    id: number
    status: string
    payloadJson: string | null
    createdAt: string
  }>
}

const GOOGLE_INDEXING_SCOPE = 'https://www.googleapis.com/auth/indexing'
const GOOGLE_TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token'
const GOOGLE_INDEXING_ENDPOINT = 'https://indexing.googleapis.com/v3/urlNotifications:publish'
const OUT_OF_STOCK_PATTERNS = [
  'currently unavailable',
  'out of stock',
  'sold out',
  'temporarily unavailable',
  'no longer available',
  'unavailable'
]

function sanitizeText(value: string | null | undefined) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim()
}

function normalizePath(value: string | null | undefined) {
  const normalized = sanitizeText(value)
    .replace(/^https?:\/\/[^/]+/i, '')
    .replace(/[?#].*$/, '')
    .replace(/\/+$/, '')
  return normalized || '/'
}

function tokenizeForAudit(value: string | null | undefined) {
  return Array.from(
    new Set(
      sanitizeText(value)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, ' ')
        .split(' ')
        .map((item) => item.trim())
        .filter((item) => item.length >= 2 && !['the', 'and', 'for', 'with', 'from', 'bes3'].includes(item))
    )
  )
}

function countOverlap(left: string[], right: string[]) {
  const rightSet = new Set(right)
  return left.reduce((total, item) => total + (rightSet.has(item) ? 1 : 0), 0)
}

function getSeverity(issueType: string): 'high' | 'medium' | 'low' {
  if ([
    'canonical_mismatch',
    'route_type_mismatch',
    'title_path_mismatch',
    'render_http_error',
    'canonical_tag_mismatch',
    'missing_json_ld',
    'missing_h1',
    'multiple_h1',
    'trust_http_error',
    'published_page_noindex'
  ].includes(issueType)) {
    return 'high'
  }

  if ([
    'canonical_missing',
    'thin_description',
    'missing_open_graph_json',
    'missing_schema_json',
    'heading_hierarchy_gap',
    'heading_depth_excess',
    'missing_h2_structure',
    'missing_canonical_tag',
    'missing_meta_description_tag',
    'missing_og_title',
    'missing_og_description',
    'render_origin_unreachable',
    'trust_missing_canonical_tag',
    'trust_missing_json_ld',
    'trust_missing_trust_links',
    'llms_missing_reference',
    'trust_origin_unreachable',
    'render_timeout',
    'render_audit_error'
  ].includes(issueType)) {
    return 'medium'
  }

  return 'low'
}

function getRecommendedAction(issueType: string) {
  switch (issueType) {
    case 'canonical_mismatch':
    case 'canonical_tag_mismatch':
    case 'canonical_missing':
    case 'missing_canonical_tag':
      return 'Fix canonical alignment between stored SEO record and rendered page.'
    case 'route_type_mismatch':
      return 'Correct the published pathname so the article type and route family stay aligned.'
    case 'thin_description':
    case 'missing_meta_description_tag':
      return 'Rewrite the page description so the intent is explicit and complete.'
    case 'missing_open_graph_json':
      return 'Persist the Open Graph payload in seo_pages so previews and audits stay aligned.'
    case 'missing_schema_json':
      return 'Persist the structured data payload in seo_pages so machine-readable markup stays publish-ready.'
    case 'title_path_mismatch':
      return 'Align the title with the URL slug and the underlying entity.'
    case 'missing_json_ld':
      return 'Restore the JSON-LD block so the page exposes machine-readable entities.'
    case 'missing_h1':
    case 'multiple_h1':
      return 'Fix H1 usage so the page exposes one clear primary topic.'
    case 'heading_hierarchy_gap':
    case 'heading_depth_excess':
    case 'missing_h2_structure':
      return 'Flatten the heading tree and restore parseable section structure.'
    case 'missing_og_title':
    case 'missing_og_description':
      return 'Restore Open Graph metadata for consistent page summaries.'
    case 'render_origin_unreachable':
      return 'Point the rendered SEO audit at a reachable app origin so runtime page checks can execute instead of failing at the network layer.'
    case 'trust_origin_unreachable':
      return 'Point the trust-surface audit at a reachable app origin so About, Contact, policy pages, and llms.txt can be checked end to end.'
    case 'trust_http_error':
      return 'Restore the trust or machine-entry route so the page can be fetched successfully.'
    case 'trust_missing_canonical_tag':
      return 'Add a canonical tag to the trust page so policy and methodology routes stay unambiguous.'
    case 'trust_missing_json_ld':
      return 'Restore machine-readable structured data on the trust page so the route contributes to the site trust graph.'
    case 'trust_missing_trust_links':
      return 'Reconnect the trust page to the rest of the trust surface with explicit internal links.'
    case 'llms_missing_reference':
      return 'Update llms.txt so it references the key trust and machine-entry routes.'
    case 'published_page_noindex':
      return 'Remove the unintended noindex directive from the published page.'
    case 'render_http_error':
      return 'Fix the rendered route before further indexing or syndication.'
    default:
      return 'Review the page in admin and correct the SEO field or rendered output causing the issue.'
  }
}

function truncate(value: string, maxLength: number) {
  if (value.length <= maxLength) return value
  return `${value.slice(0, maxLength - 1).trimEnd()}…`
}

async function recordPublishEvent(eventType: string, status: PublishEventStatus, payload: unknown, seoPageId?: number | null) {
  const db = await getDatabase()
  await db.exec(
    'INSERT INTO publish_events (seo_page_id, event_type, status, payload_json) VALUES (?, ?, ?, ?)',
    [seoPageId || null, eventType, status, JSON.stringify(payload)]
  )
}

async function getSiteIdentity() {
  const siteName = await getSettingValueOrEnv('seo', 'siteName', undefined, 'Bes3')
  const siteUrl = await getSettingValueOrEnv('seo', 'appUrl', 'NEXT_PUBLIC_APP_URL', 'http://localhost:3000')
  const renderAuditBaseUrl = await getSettingValueOrEnv('seo', 'renderAuditBaseUrl', 'SEO_RENDER_AUDIT_BASE_URL', '')
  return {
    siteName,
    siteUrl: siteUrl.replace(/\/+$/, ''),
    renderAuditBaseUrl: renderAuditBaseUrl.replace(/\/+$/, '')
  }
}

function buildPreviewMarkdown(payload: Omit<SyndicationPagePayload, 'previewMarkdown'>) {
  const header = `# ${payload.title}`
  const excerpt = payload.excerpt || payload.description
  const imageLine = payload.heroImageUrl ? `![${payload.title}](${payload.heroImageUrl})` : ''
  return [header, excerpt, imageLine, `Original: ${payload.canonicalUrl}`, 'Canonical tag: rel="canonical"'].filter(Boolean).join('\n\n')
}

function extractExcerpt(contentHtml: string | null | undefined, fallbackSummary: string, fallbackDescription: string) {
  if (contentHtml) {
    const $ = load(contentHtml)
    const paragraphs = $('p')
      .map((_, node) => sanitizeText($(node).text()))
      .get()
      .filter(Boolean)
      .slice(0, 2)
    if (paragraphs.length > 0) {
      return truncate(paragraphs.join(' '), 420)
    }
  }

  return truncate(sanitizeText(fallbackSummary || fallbackDescription), 420)
}

function inspectHeadingHierarchy(contentHtml: string | null | undefined) {
  if (!contentHtml) {
    return {
      h2Count: 0,
      h3Count: 0,
      deepHeadingCount: 0,
      bodyTextLength: 0
    }
  }

  const $ = load(contentHtml)
  return {
    h2Count: $('h2').length,
    h3Count: $('h3').length,
    deepHeadingCount: $('h4, h5, h6').length,
    bodyTextLength: sanitizeText($.text()).length
  }
}

function buildAbsolutePath(siteUrl: string, pathname: string) {
  return new URL(pathname, siteUrl).toString()
}

function normalizeOrigin(value: string | null | undefined) {
  const normalized = sanitizeText(value)
  if (!normalized) return ''

  try {
    return new URL(normalized).origin
  } catch {
    return ''
  }
}

function getAuditOriginCandidates(siteUrl: string, renderAuditBaseUrl: string) {
  const defaultPort = process.env.PORT || '3000'
  return Array.from(
    new Set(
      [
        normalizeOrigin(renderAuditBaseUrl),
        normalizeOrigin(siteUrl),
        normalizeOrigin(`http://127.0.0.1:${defaultPort}`),
        normalizeOrigin(`http://localhost:${defaultPort}`)
      ].filter(Boolean)
    )
  )
}

async function resolveRenderedAuditOrigin(siteUrl: string, renderAuditBaseUrl: string) {
  const candidates = getAuditOriginCandidates(siteUrl, renderAuditBaseUrl)
  const failures: string[] = []

  for (const origin of candidates) {
    try {
      const response = await fetch(buildAbsolutePath(origin, '/api/health'), {
        method: 'GET',
        redirect: 'follow',
        signal: AbortSignal.timeout(3000),
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; Bes3RenderedSeoAudit/1.0; +https://bes3.local)'
        }
      })

      if (response.ok) {
        return {
          origin,
          candidates,
          failures
        }
      }

      failures.push(`${origin} -> HTTP ${response.status}`)
    } catch (error: any) {
      failures.push(`${origin} -> ${error?.message || String(error)}`)
    }
  }

  return {
    origin: null,
    candidates,
    failures
  }
}

async function inspectRenderedPages(paths: string[]) {
  const uniquePaths = Array.from(new Set(paths.filter(Boolean))).slice(0, 8)
  if (!uniquePaths.length) {
    return {
      scannedPages: 0,
      affectedPages: 0,
      issuesFound: 0,
      findings: [] as Array<{
        pathname: string
        title: string
        issueType: string
        issueDetail: string
        checkedAt: string
      }>
    }
  }

  const { siteUrl, renderAuditBaseUrl } = await getSiteIdentity()
  const checkedAt = new Date().toISOString()
  const auditOrigin = await resolveRenderedAuditOrigin(siteUrl, renderAuditBaseUrl)

  if (!auditOrigin.origin) {
    const detail = [
      `Unable to reach any rendered-audit origin.`,
      auditOrigin.candidates.length ? `Candidates: ${auditOrigin.candidates.join(', ')}` : null,
      auditOrigin.failures.length ? `Failures: ${auditOrigin.failures.join(' | ')}` : null
    ]
      .filter(Boolean)
      .join(' ')

    return {
      scannedPages: uniquePaths.length,
      affectedPages: 1,
      issuesFound: 1,
      findings: [
        {
          pathname: uniquePaths[0],
          title: 'Rendered audit origin unavailable',
          issueType: 'render_origin_unreachable',
          issueDetail: detail,
          checkedAt
        }
      ]
    }
  }

  const allFindings = (
    await Promise.all(
      uniquePaths.map(async (pathname) => {
        try {
          const response = await fetch(buildAbsolutePath(auditOrigin.origin, pathname), {
            method: 'GET',
            redirect: 'follow',
            signal: AbortSignal.timeout(8000),
            headers: {
              'User-Agent': 'Mozilla/5.0 (compatible; Bes3RenderedSeoAudit/1.0; +https://bes3.local)',
              'Accept-Language': 'en-US,en;q=0.9'
            }
          })

          const html = await response.text()
          const $ = load(html)
          const findings: Array<{
            pathname: string
            title: string
            issueType: string
            issueDetail: string
            checkedAt: string
          }> = []
          const title = sanitizeText($('title').first().text()) || pathname
          const canonicalHref = sanitizeText($('link[rel="canonical"]').attr('href'))
          const description = sanitizeText($('meta[name="description"]').attr('content'))
          const ogTitle = sanitizeText($('meta[property="og:title"]').attr('content'))
          const ogDescription = sanitizeText($('meta[property="og:description"]').attr('content'))
          const robotsContent = sanitizeText($('meta[name="robots"]').attr('content')).toLowerCase()
          const h1Count = $('h1').length
          const jsonLdScripts = $('script[type="application/ld+json"]').length

          if (!response.ok) {
            findings.push({
              pathname,
              title,
              issueType: 'render_http_error',
              issueDetail: `Rendered page returned HTTP ${response.status}.`,
              checkedAt
            })
          }

          if (!canonicalHref) {
            findings.push({
              pathname,
              title,
              issueType: 'missing_canonical_tag',
              issueDetail: 'Rendered page is missing a canonical tag.',
              checkedAt
            })
          } else if (normalizePath(canonicalHref) !== normalizePath(pathname)) {
            findings.push({
              pathname,
              title,
              issueType: 'canonical_tag_mismatch',
              issueDetail: `Rendered canonical ${normalizePath(canonicalHref)} does not match pathname ${normalizePath(pathname)}.`,
              checkedAt
            })
          }

          if (!description) {
            findings.push({
              pathname,
              title,
              issueType: 'missing_meta_description_tag',
              issueDetail: 'Rendered page is missing a meta description tag.',
              checkedAt
            })
          }

          if (!ogTitle) {
            findings.push({
              pathname,
              title,
              issueType: 'missing_og_title',
              issueDetail: 'Rendered page is missing og:title.',
              checkedAt
            })
          }

          if (!ogDescription) {
            findings.push({
              pathname,
              title,
              issueType: 'missing_og_description',
              issueDetail: 'Rendered page is missing og:description.',
              checkedAt
            })
          }

          if (jsonLdScripts === 0) {
            findings.push({
              pathname,
              title,
              issueType: 'missing_json_ld',
              issueDetail: 'Rendered page has no JSON-LD script block.',
              checkedAt
            })
          }

          if (h1Count === 0) {
            findings.push({
              pathname,
              title,
              issueType: 'missing_h1',
              issueDetail: 'Rendered page has no H1 element.',
              checkedAt
            })
          } else if (h1Count > 1) {
            findings.push({
              pathname,
              title,
              issueType: 'multiple_h1',
              issueDetail: `Rendered page exposes ${h1Count} H1 elements.`,
              checkedAt
            })
          }

          if (robotsContent.includes('noindex')) {
            findings.push({
              pathname,
              title,
              issueType: 'published_page_noindex',
              issueDetail: 'Rendered page emits a noindex robots directive.',
              checkedAt
            })
          }

          return findings
        } catch (error: any) {
          return [
            {
              pathname,
              title: pathname,
              issueType: error?.name === 'TimeoutError' ? 'render_timeout' : 'render_audit_error',
              issueDetail: error?.message || String(error),
              checkedAt
            }
          ]
        }
      })
    )
  ).flat()

  return {
    scannedPages: uniquePaths.length,
    affectedPages: new Set(allFindings.map((item) => item.pathname)).size,
    issuesFound: allFindings.length,
    findings: allFindings.slice(0, 12)
  }
}

const TRUST_SURFACE_PATHS = ['/about', '/contact', '/privacy', '/terms', '/data', '/site-map'] as const
const TRUST_SURFACE_LINK_TARGETS = ['/about', '/contact', '/privacy', '/terms', '/data', '/site-map']

async function inspectTrustSurface() {
  const checkedAt = new Date().toISOString()
  const { siteUrl, renderAuditBaseUrl } = await getSiteIdentity()
  const auditOrigin = await resolveRenderedAuditOrigin(siteUrl, renderAuditBaseUrl)

  if (!auditOrigin.origin) {
    const detail = [
      'Unable to reach any trust-audit origin.',
      auditOrigin.candidates.length ? `Candidates: ${auditOrigin.candidates.join(', ')}` : null,
      auditOrigin.failures.length ? `Failures: ${auditOrigin.failures.join(' | ')}` : null
    ]
      .filter(Boolean)
      .join(' ')

    return {
      scannedPages: TRUST_SURFACE_PATHS.length + 1,
      affectedPages: 1,
      issuesFound: 1,
      findings: [
        {
          pathname: TRUST_SURFACE_PATHS[0],
          title: 'Trust audit origin unavailable',
          issueType: 'trust_origin_unreachable',
          issueDetail: detail,
          checkedAt
        }
      ]
    }
  }

  const htmlFindings = (
    await Promise.all(
      TRUST_SURFACE_PATHS.map(async (pathname) => {
        try {
          const response = await fetch(buildAbsolutePath(auditOrigin.origin!, pathname), {
            method: 'GET',
            redirect: 'follow',
            signal: AbortSignal.timeout(8000),
            headers: {
              'User-Agent': 'Mozilla/5.0 (compatible; Bes3TrustSurfaceAudit/1.0; +https://bes3.local)',
              'Accept-Language': 'en-US,en;q=0.9'
            }
          })

          const html = await response.text()
          const $ = load(html)
          const title = sanitizeText($('title').first().text()) || pathname
          const findings: Array<{
            pathname: string
            title: string
            issueType: string
            issueDetail: string
            checkedAt: string
          }> = []

          if (!response.ok) {
            findings.push({
              pathname,
              title,
              issueType: 'trust_http_error',
              issueDetail: `Trust page returned HTTP ${response.status}.`,
              checkedAt
            })
            return findings
          }

          const canonicalHref = sanitizeText($('link[rel="canonical"]').attr('href'))
          const jsonLdScripts = $('script[type="application/ld+json"]').length
          const linkedTrustTargets = new Set(
            $('a[href]')
              .map((_, node) => sanitizeText($(node).attr('href')))
              .get()
              .filter((href) => TRUST_SURFACE_LINK_TARGETS.some((target) => href === target || href.endsWith(target)))
          )

          if (!canonicalHref) {
            findings.push({
              pathname,
              title,
              issueType: 'trust_missing_canonical_tag',
              issueDetail: 'Trust page is missing a canonical tag.',
              checkedAt
            })
          }

          if (jsonLdScripts === 0) {
            findings.push({
              pathname,
              title,
              issueType: 'trust_missing_json_ld',
              issueDetail: 'Trust page has no JSON-LD script block.',
              checkedAt
            })
          }

          if (linkedTrustTargets.size < 2) {
            findings.push({
              pathname,
              title,
              issueType: 'trust_missing_trust_links',
              issueDetail: `Trust page links to only ${linkedTrustTargets.size} trust-route target(s); expected at least 2.`,
              checkedAt
            })
          }

          return findings
        } catch (error: any) {
          return [
            {
              pathname,
              title: pathname,
              issueType: 'trust_http_error',
              issueDetail: error?.message || String(error),
              checkedAt
            }
          ]
        }
      })
    )
  ).flat()

  let llmsFinding: Array<{
    pathname: string
    title: string
    issueType: string
    issueDetail: string
    checkedAt: string
  }> = []

  try {
    const response = await fetch(buildAbsolutePath(auditOrigin.origin, '/llms.txt'), {
      method: 'GET',
      redirect: 'follow',
      signal: AbortSignal.timeout(8000),
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Bes3TrustSurfaceAudit/1.0; +https://bes3.local)'
      }
    })

    const body = await response.text()
    if (!response.ok) {
      llmsFinding = [
        {
          pathname: '/llms.txt',
          title: 'llms.txt',
          issueType: 'trust_http_error',
          issueDetail: `llms.txt returned HTTP ${response.status}.`,
          checkedAt
        }
      ]
    } else {
      const requiredRefs = ['/data', '/site-map', '/about']
      const missing = requiredRefs.filter((ref) => !body.includes(ref))
      if (missing.length > 0) {
        llmsFinding = [
          {
            pathname: '/llms.txt',
            title: 'llms.txt',
            issueType: 'llms_missing_reference',
            issueDetail: `llms.txt is missing references to: ${missing.join(', ')}.`,
            checkedAt
          }
        ]
      }
    }
  } catch (error: any) {
    llmsFinding = [
      {
        pathname: '/llms.txt',
        title: 'llms.txt',
        issueType: 'trust_http_error',
        issueDetail: error?.message || String(error),
        checkedAt
      }
    ]
  }

  const findings = [...htmlFindings, ...llmsFinding]
  return {
    scannedPages: TRUST_SURFACE_PATHS.length + 1,
    affectedPages: new Set(findings.map((finding) => finding.pathname)).size,
    issuesFound: findings.length,
    findings: findings.slice(0, 12)
  }
}

function collectSeoAlignmentFindings(row: {
  article_id: number | null
  pathname: string
  page_type: string
  title: string
  meta_description: string
  canonical_url: string | null
  open_graph_json: string | null
  schema_json: string | null
  updated_at: string | null
  article_type: string | null
  article_title: string | null
  content_html: string | null
  product_name: string | null
  brand: string | null
  category: string | null
}) {
  const findings: Array<{
    articleId: number | null
    productId: number | null
    issueType: string
    issueDetail: string
  }> = []
  const normalizedPath = normalizePath(row.pathname)
  const normalizedCanonical = normalizePath(row.canonical_url || row.pathname)
  const title = sanitizeText(row.title)
  const description = sanitizeText(row.meta_description)
  const openGraphJson = sanitizeText(row.open_graph_json)
  const schemaJson = sanitizeText(row.schema_json)
  const titleTerms = tokenizeForAudit(title)
  const pathLeaf = normalizedPath.split('/').filter(Boolean).pop() || normalizedPath
  const pathTerms = tokenizeForAudit(pathLeaf)
  const entityTerms = tokenizeForAudit(
    [row.article_title, row.product_name, row.brand, row.category].filter(Boolean).join(' ')
  )

  if (!row.canonical_url) {
    findings.push({
      articleId: row.article_id,
      productId: null,
      issueType: 'canonical_missing',
      issueDetail: 'Published page has no canonical URL recorded in seo_pages.'
    })
  } else if (normalizedCanonical !== normalizedPath) {
    findings.push({
      articleId: row.article_id,
      productId: null,
      issueType: 'canonical_mismatch',
      issueDetail: `Canonical path ${normalizedCanonical} does not match pathname ${normalizedPath}.`
    })
  }

  if (row.article_type === 'review' && !normalizedPath.startsWith('/reviews/')) {
    findings.push({
      articleId: row.article_id,
      productId: null,
      issueType: 'route_type_mismatch',
      issueDetail: 'Review article is not published under /reviews/.'
    })
  }
  if (row.article_type === 'comparison' && !normalizedPath.startsWith('/compare/')) {
    findings.push({
      articleId: row.article_id,
      productId: null,
      issueType: 'route_type_mismatch',
      issueDetail: 'Comparison article is not published under /compare/.'
    })
  }
  if (row.article_type === 'guide' && !normalizedPath.startsWith('/guides/')) {
    findings.push({
      articleId: row.article_id,
      productId: null,
      issueType: 'route_type_mismatch',
      issueDetail: 'Guide article is not published under /guides/.'
    })
  }

  if (description.length < 110) {
    findings.push({
      articleId: row.article_id,
      productId: null,
      issueType: 'thin_description',
      issueDetail: `Meta description is only ${description.length} characters and may underspecify page intent.`
    })
  }

  if (!openGraphJson) {
    findings.push({
      articleId: row.article_id,
      productId: null,
      issueType: 'missing_open_graph_json',
      issueDetail: 'Published page has no Open Graph payload recorded in seo_pages.'
    })
  }

  if (!schemaJson) {
    findings.push({
      articleId: row.article_id,
      productId: null,
      issueType: 'missing_schema_json',
      issueDetail: 'Published page has no schema payload recorded in seo_pages.'
    })
  }

  if (/not found|unavailable|recovery/i.test(title) || /not found|unavailable/i.test(description)) {
    findings.push({
      articleId: row.article_id,
      productId: null,
      issueType: 'low_signal_copy',
      issueDetail: 'Published SEO title or description contains low-signal fallback language.'
    })
  }

  if (pathTerms.length > 0 && countOverlap(titleTerms, pathTerms) === 0 && countOverlap(titleTerms, entityTerms) === 0) {
    findings.push({
      articleId: row.article_id,
      productId: null,
      issueType: 'title_path_mismatch',
      issueDetail: 'Title tokens do not align with the path slug or the primary entity fields.'
    })
  }

  const headingStats = inspectHeadingHierarchy(row.content_html)
  if (headingStats.h3Count > 0 && headingStats.h2Count === 0) {
    findings.push({
      articleId: row.article_id,
      productId: null,
      issueType: 'heading_hierarchy_gap',
      issueDetail: `Body uses ${headingStats.h3Count} H3 headings without any H2 headings.`
    })
  }
  if (headingStats.deepHeadingCount > 0) {
    findings.push({
      articleId: row.article_id,
      productId: null,
      issueType: 'heading_depth_excess',
      issueDetail: `Body uses ${headingStats.deepHeadingCount} deep headings below H3, which weakens the flat heading tree.`
    })
  }
  if (row.article_type && headingStats.bodyTextLength >= 900 && headingStats.h2Count === 0) {
    findings.push({
      articleId: row.article_id,
      productId: null,
      issueType: 'missing_h2_structure',
      issueDetail: 'Long editorial body has no H2 headings, which weakens section parsing.'
    })
  }

  return findings
}

async function parseSyndicationTargets(): Promise<SyndicationTarget[]> {
  const raw = await getSettingValueOrEnv('seo', 'syndicationTargetsJson', 'SEO_SYNDICATION_TARGETS_JSON', '[]')
  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter((item): item is SyndicationTarget => {
        return Boolean(
          item &&
            typeof item === 'object' &&
            !Array.isArray(item) &&
            item.type === 'webhook' &&
            typeof item.endpoint === 'string' &&
            typeof item.platformName === 'string' &&
            typeof item.id === 'string'
        )
      })
      .filter((item) => item.enabled !== false)
  } catch {
    return []
  }
}

async function loadSyndicationPayloads(paths: string[]): Promise<SyndicationPagePayload[]> {
  const uniquePaths = Array.from(new Set(paths.filter(Boolean)))
  if (uniquePaths.length === 0) return []

  const db = await getDatabase()
  const placeholders = uniquePaths.map(() => '?').join(', ')
  const rows = await db.query<{
    seo_page_id: number | null
    pathname: string
    seo_title: string | null
    meta_description: string
    canonical_url: string | null
    seo_published_at: string | null
    article_type: string | null
    article_summary: string | null
    content_html: string | null
    article_hero_image_url: string | null
    article_published_at: string | null
    product_name: string | null
    brand: string | null
    category: string | null
    product_hero_image_url: string | null
  }>(
    `
      SELECT sp.id AS seo_page_id,
        sp.pathname,
        sp.title AS seo_title,
        sp.meta_description,
        sp.canonical_url,
        sp.published_at AS seo_published_at,
        a.article_type,
        a.summary AS article_summary,
        a.content_html,
        a.hero_image_url AS article_hero_image_url,
        a.published_at AS article_published_at,
        p.product_name,
        p.brand,
        p.category,
        (
          SELECT public_url
          FROM product_media_assets m
          WHERE m.product_id = p.id AND m.asset_role = 'hero'
          ORDER BY m.id ASC
          LIMIT 1
        ) AS product_hero_image_url
      FROM seo_pages sp
      LEFT JOIN articles a ON a.id = sp.article_id
      LEFT JOIN products p ON p.id = a.product_id
      WHERE sp.pathname IN (${placeholders})
      ORDER BY sp.updated_at DESC, sp.id DESC
    `,
    uniquePaths
  )

  return rows.map((row) => {
    const canonicalUrl = toAbsoluteUrl(row.canonical_url || row.pathname)
    const description = sanitizeText(row.meta_description)
    const excerpt = extractExcerpt(row.content_html, sanitizeText(row.article_summary), description)
    const payload = {
      seoPageId: row.seo_page_id,
      path: row.pathname,
      title: sanitizeText(row.seo_title) || description || row.pathname,
      description,
      canonicalUrl,
      excerpt,
      heroImageUrl: row.article_hero_image_url || row.product_hero_image_url || null,
      publishedAt: row.article_published_at || row.seo_published_at,
      articleType: row.article_type,
      productName: row.product_name,
      brand: row.brand,
      category: row.category,
      previewMarkdown: ''
    }

    return {
      ...payload,
      previewMarkdown: buildPreviewMarkdown(payload)
    }
  })
}

async function fetchGoogleAccessToken() {
  const rawServiceAccount = await getSettingValueOrEnv('seo', 'googleServiceAccountJson', 'GOOGLE_SERVICE_ACCOUNT_JSON', '')
  if (!rawServiceAccount.trim()) {
    throw new Error('Missing Google service account JSON')
  }

  const credentials = JSON.parse(rawServiceAccount) as {
    client_email?: string
    private_key?: string
  }
  const clientEmail = sanitizeText(credentials.client_email)
  const privateKey = String(credentials.private_key || '').replace(/\\n/g, '\n').trim()
  if (!clientEmail || !privateKey) {
    throw new Error('Google service account JSON is incomplete')
  }

  const key = await importPKCS8(privateKey, 'RS256')
  const now = Math.floor(Date.now() / 1000)
  const assertion = await new SignJWT({ scope: GOOGLE_INDEXING_SCOPE })
    .setProtectedHeader({ alg: 'RS256', typ: 'JWT' })
    .setIssuer(clientEmail)
    .setSubject(clientEmail)
    .setAudience(GOOGLE_TOKEN_ENDPOINT)
    .setIssuedAt(now)
    .setExpirationTime(now + 3600)
    .sign(key)

  const response = await fetch(GOOGLE_TOKEN_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion
    })
  })

  if (!response.ok) {
    throw new Error(`Google token request failed with ${response.status}`)
  }

  const body = await response.json()
  if (!body.access_token) {
    throw new Error('Google token response did not include access_token')
  }

  return String(body.access_token)
}

async function notifyPingOMatic(paths: string[], seoPageId?: number | null): Promise<PublishEventStatus> {
  const enabled = await getSettingValueOrEnv('seo', 'pingomaticEnabled', 'PINGOMATIC_ENABLED', 'false')
  if (enabled !== 'true') {
    await recordPublishEvent('seo.pingomatic', 'skipped', { reason: 'disabled', paths }, seoPageId)
    return 'skipped'
  }

  const { siteName, siteUrl } = await getSiteIdentity()
  try {
    await fetch(
      `https://rpc.pingomatic.com/ping/?title=${encodeURIComponent(siteName)}&blogurl=${encodeURIComponent(siteUrl)}&rssurl=${encodeURIComponent(`${siteUrl}/sitemap.xml`)}`,
      { method: 'GET' }
    )
    await recordPublishEvent('seo.pingomatic', 'success', { paths, siteUrl }, seoPageId)
    return 'success'
  } catch (error: any) {
    await recordPublishEvent('seo.pingomatic', 'error', { paths, error: error?.message || String(error) }, seoPageId)
    return 'error'
  }
}

async function notifyGoogleIndexing(paths: string[], seoPageId?: number | null): Promise<PublishEventStatus> {
  const enabled = await getSettingValueOrEnv('seo', 'googleIndexingEnabled', 'GOOGLE_INDEXING_ENABLED', 'false')
  if (enabled !== 'true') {
    await recordPublishEvent('seo.google_indexing', 'skipped', { reason: 'disabled', paths }, seoPageId)
    return 'skipped'
  }

  const accessToken = await fetchGoogleAccessToken().catch(async (error: any) => {
    await recordPublishEvent('seo.google_indexing', 'error', { paths, error: error?.message || String(error) }, seoPageId)
    throw error
  })

  const absoluteUrls = paths.map((path) => toAbsoluteUrl(path))
  const results: Array<{ url: string; status: string; body: unknown }> = []
  let hadError = false

  for (const url of absoluteUrls) {
    try {
      const response = await fetch(GOOGLE_INDEXING_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          url,
          type: 'URL_UPDATED'
        })
      })
      const body = await response.json().catch(() => null)
      if (!response.ok) {
        hadError = true
      }
      results.push({
        url,
        status: response.ok ? 'success' : 'error',
        body
      })
    } catch (error: any) {
      hadError = true
      results.push({
        url,
        status: 'error',
        body: { message: error?.message || String(error) }
      })
    }
  }

  const status: PublishEventStatus = hadError ? 'warning' : 'success'
  await recordPublishEvent('seo.google_indexing', status, { urls: results }, seoPageId)
  return status
}

async function dispatchSyndication(paths: string[], seoPageId?: number | null): Promise<PublishEventStatus> {
  const enabled = await getSettingValueOrEnv('seo', 'syndicationEnabled', 'SEO_SYNDICATION_ENABLED', 'false')
  if (enabled !== 'true') {
    await recordPublishEvent('seo.syndication', 'skipped', { reason: 'disabled', paths }, seoPageId)
    return 'skipped'
  }

  const [targets, payloads] = await Promise.all([parseSyndicationTargets(), loadSyndicationPayloads(paths)])
  if (targets.length === 0) {
    await recordPublishEvent('seo.syndication', 'warning', { reason: 'no-targets', paths }, seoPageId)
    return 'warning'
  }
  if (payloads.length === 0) {
    await recordPublishEvent('seo.syndication', 'skipped', { reason: 'no-pages', paths }, seoPageId)
    return 'skipped'
  }

  const results: Array<{ targetId: string; platformName: string; path: string; status: string; detail: string }> = []
  let hadError = false

  for (const target of targets) {
    for (const payload of payloads) {
      try {
        const response = await fetch(target.endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(target.authToken ? { Authorization: `Bearer ${target.authToken}` } : {}),
            ...(target.headers || {})
          },
          body: JSON.stringify({
            source: 'bes3',
            target: {
              id: target.id,
              platformName: target.platformName,
              type: target.type
            },
            page: {
              ...payload,
              suggestedCanonicalTag: `<link rel="canonical" href="${payload.canonicalUrl}" />`
            }
          })
        })

        if (!response.ok) {
          hadError = true
          results.push({
            targetId: target.id,
            platformName: target.platformName,
            path: payload.path,
            status: 'error',
            detail: `HTTP ${response.status}`
          })
          continue
        }

        results.push({
          targetId: target.id,
          platformName: target.platformName,
          path: payload.path,
          status: 'success',
          detail: 'dispatched'
        })
      } catch (error: any) {
        hadError = true
        results.push({
          targetId: target.id,
          platformName: target.platformName,
          path: payload.path,
          status: 'error',
          detail: error?.message || String(error)
        })
      }
    }
  }

  const status: PublishEventStatus = hadError ? 'warning' : 'success'
  await recordPublishEvent(
    'seo.syndication',
    status,
    {
      targets: targets.map((item) => ({ id: item.id, platformName: item.platformName })),
      results
    },
    seoPageId
  )
  return status
}

export async function dispatchSeoNotifications(paths: string[], seoPageId?: number | null): Promise<PublishDispatchSummary> {
  const uniquePaths = Array.from(new Set(paths.filter(Boolean)))
  if (uniquePaths.length === 0) {
    return {
      pingomatic: 'skipped',
      googleIndexing: 'skipped',
      syndication: 'skipped'
    }
  }

  const [pingomatic, googleIndexing, syndication] = await Promise.all([
    notifyPingOMatic(uniquePaths, seoPageId),
    notifyGoogleIndexing(uniquePaths, seoPageId).catch(() => 'error' as const),
    dispatchSyndication(uniquePaths, seoPageId).catch(() => 'error' as const)
  ])

  return {
    pingomatic,
    googleIndexing,
    syndication
  }
}

type InspectableProduct = {
  id: number
  product_name: string
  destination_url: string
}

async function createLinkInspectorRun(): Promise<number> {
  const db = await getDatabase()
  const result = await db.exec(
    `
      INSERT INTO link_inspector_runs (status, started_at)
      VALUES ('running', CURRENT_TIMESTAMP)
    `
  )
  return Number(result.lastInsertRowid)
}

async function finalizeLinkInspectorRun(input: {
  runId: number
  status: string
  totalChecked: number
  issuesFound: number
  brokenCount: number
  outOfStockCount: number
  payload: unknown
}) {
  const db = await getDatabase()
  await db.exec(
    `
      UPDATE link_inspector_runs
      SET status = ?, total_checked = ?, issues_found = ?, broken_count = ?, out_of_stock_count = ?,
          payload_json = ?, finished_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `,
    [
      input.status,
      input.totalChecked,
      input.issuesFound,
      input.brokenCount,
      input.outOfStockCount,
      JSON.stringify(input.payload),
      input.runId
    ]
  )
}

function classifyInspection(content: string, httpStatus: number | null): { status: string; issueType: LinkInspectionIssueType | null; issueDetail: string | null } {
  if (!httpStatus) {
    return {
      status: 'issue',
      issueType: 'unknown',
      issueDetail: 'No HTTP status recorded'
    }
  }

  if (httpStatus >= 400) {
    return {
      status: 'issue',
      issueType: 'http_error',
      issueDetail: `HTTP ${httpStatus}`
    }
  }

  const normalized = sanitizeText(content).toLowerCase()
  const matchedPattern = OUT_OF_STOCK_PATTERNS.find((pattern) => normalized.includes(pattern))
  if (matchedPattern) {
    return {
      status: 'issue',
      issueType: 'out_of_stock',
      issueDetail: `Matched inventory signal: ${matchedPattern}`
    }
  }

  return {
    status: 'ok',
    issueType: null,
    issueDetail: null
  }
}

async function inspectDestinationUrl(url: string) {
  const response = await fetch(url, {
    method: 'GET',
    redirect: 'follow',
    signal: AbortSignal.timeout(15000),
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; Bes3LinkInspector/1.0; +https://bes3.local)',
      'Accept-Language': 'en-US,en;q=0.9'
    }
  })
  const contentType = response.headers.get('content-type') || ''
  const text = contentType.includes('text/html') ? truncate(await response.text(), 4000) : ''
  const classification = classifyInspection(text, response.status)

  return {
    finalUrl: response.url || url,
    httpStatus: response.status,
    responseSnippet: text ? truncate(text, 800) : null,
    status: classification.status,
    issueType: classification.issueType,
    issueDetail: classification.issueDetail
  }
}

async function listInspectableProducts(limit: number): Promise<InspectableProduct[]> {
  const db = await getDatabase()
  return db.query<InspectableProduct>(
    `
      SELECT id, product_name, COALESCE(resolved_url, source_affiliate_link) AS destination_url
      FROM products
      WHERE COALESCE(resolved_url, source_affiliate_link) IS NOT NULL
      ORDER BY updated_at DESC, id DESC
      LIMIT ?
    `,
    [limit]
  )
}

async function saveLinkInspectionResult(input: {
  runId: number
  productId: number
  productName: string
  sourceUrl: string
  finalUrl: string | null
  httpStatus: number | null
  status: string
  issueType: string | null
  issueDetail: string | null
  responseSnippet: string | null
}) {
  const db = await getDatabase()
  await db.exec(
    `
      INSERT INTO link_inspector_results (
        run_id, product_id, product_name, source_url, final_url, http_status, status, issue_type, issue_detail, response_snippet
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      input.runId,
      input.productId,
      input.productName,
      input.sourceUrl,
      input.finalUrl,
      input.httpStatus,
      input.status,
      input.issueType,
      input.issueDetail,
      input.responseSnippet
    ]
  )
}

async function mapLimit() {
  const configured = Number(await getSettingValueOrEnv('seo', 'linkInspectorMaxUrls', 'LINK_INSPECTOR_MAX_URLS', '60'))
  if (!Number.isFinite(configured) || configured <= 0) return 60
  return Math.min(250, configured)
}

export async function runLinkInspector(limit?: number): Promise<LinkInspectorSummary> {
  const enabled = await getSettingValueOrEnv('seo', 'linkInspectorEnabled', 'LINK_INSPECTOR_ENABLED', 'true')
  const runId = await createLinkInspectorRun()

  if (enabled !== 'true') {
    await finalizeLinkInspectorRun({
      runId,
      status: 'skipped',
      totalChecked: 0,
      issuesFound: 0,
      brokenCount: 0,
      outOfStockCount: 0,
      payload: { reason: 'disabled' }
    })
    await recordPublishEvent('seo.link_inspector', 'skipped', { runId, reason: 'disabled' })
    return {
      runId,
      status: 'skipped',
      totalChecked: 0,
      issuesFound: 0,
      brokenCount: 0,
      outOfStockCount: 0,
      finishedAt: null
    }
  }

  const actualLimit = limit || (await mapLimit())
  const products = await listInspectableProducts(actualLimit)
  let issuesFound = 0
  let brokenCount = 0
  let outOfStockCount = 0

  for (const product of products) {
    try {
      const inspected = await inspectDestinationUrl(product.destination_url)
      if (inspected.status !== 'ok') {
        issuesFound += 1
        if (inspected.issueType === 'http_error') brokenCount += 1
        if (inspected.issueType === 'out_of_stock') outOfStockCount += 1
      }
      await saveLinkInspectionResult({
        runId,
        productId: product.id,
        productName: product.product_name,
        sourceUrl: product.destination_url,
        finalUrl: inspected.finalUrl,
        httpStatus: inspected.httpStatus,
        status: inspected.status,
        issueType: inspected.issueType,
        issueDetail: inspected.issueDetail,
        responseSnippet: inspected.responseSnippet
      })
    } catch (error: any) {
      issuesFound += 1
      brokenCount += 1
      await saveLinkInspectionResult({
        runId,
        productId: product.id,
        productName: product.product_name,
        sourceUrl: product.destination_url,
        finalUrl: null,
        httpStatus: null,
        status: 'issue',
        issueType: error?.name === 'TimeoutError' ? 'timeout' : 'unknown',
        issueDetail: error?.message || String(error),
        responseSnippet: null
      })
    }
  }

  await finalizeLinkInspectorRun({
    runId,
    status: issuesFound > 0 ? 'completed_with_issues' : 'completed',
    totalChecked: products.length,
    issuesFound,
    brokenCount,
    outOfStockCount,
    payload: {
      checkedProductIds: products.map((product) => product.id)
    }
  })
  await recordPublishEvent('seo.link_inspector', issuesFound > 0 ? 'warning' : 'success', {
    runId,
    totalChecked: products.length,
    issuesFound,
    brokenCount,
    outOfStockCount
  })

  return {
    runId,
    status: issuesFound > 0 ? 'completed_with_issues' : 'completed',
    totalChecked: products.length,
    issuesFound,
    brokenCount,
    outOfStockCount,
    finishedAt: new Date().toISOString()
  }
}

async function listRecentPublishedPaths(limit: number = 12): Promise<string[]> {
  const db = await getDatabase()
  const rows = await db.query<{ pathname: string }>(
    `
      SELECT pathname
      FROM seo_pages
      WHERE status = 'published'
      ORDER BY updated_at DESC, id DESC
      LIMIT ?
    `,
    [limit]
  )
  return rows.map((row) => row.pathname)
}

export async function rerunGoogleIndexing(paths?: string[]) {
  const selectedPaths = paths && paths.length > 0 ? paths : await listRecentPublishedPaths()
  return notifyGoogleIndexing(selectedPaths)
}

export async function rerunSyndication(paths?: string[]) {
  const selectedPaths = paths && paths.length > 0 ? paths : await listRecentPublishedPaths()
  return dispatchSyndication(selectedPaths)
}

export async function getSeoOperationsSummary(): Promise<SeoOpsSummary> {
  const db = await getDatabase()
  const [lastRun, latestIssues, recentIndexingEvents, recentSyndicationEvents, seoAuditRows, recentPublishedPaths] = await Promise.all([
    db.queryOne<{
      id: number
      status: string
      total_checked: number
      issues_found: number
      broken_count: number
      out_of_stock_count: number
      finished_at: string | null
    }>(
      `
        SELECT id, status, total_checked, issues_found, broken_count, out_of_stock_count, finished_at
        FROM link_inspector_runs
        ORDER BY id DESC
        LIMIT 1
      `
    ),
    db.query<{
      id: number
      product_id: number | null
      product_name: string | null
      source_url: string
      final_url: string | null
      http_status: number | null
      issue_type: string | null
      issue_detail: string | null
      checked_at: string
    }>(
      `
        SELECT id, product_id, product_name, source_url, final_url, http_status, issue_type, issue_detail, checked_at
        FROM link_inspector_results
        WHERE status <> 'ok'
        ORDER BY checked_at DESC, id DESC
        LIMIT 12
      `
    ),
    db.query<{ id: number; status: string; payload_json: string | null; created_at: string }>(
      `
        SELECT id, status, payload_json, created_at
        FROM publish_events
        WHERE event_type = 'seo.google_indexing'
        ORDER BY id DESC
        LIMIT 8
      `
    ),
    db.query<{ id: number; status: string; payload_json: string | null; created_at: string }>(
      `
        SELECT id, status, payload_json, created_at
        FROM publish_events
        WHERE event_type = 'seo.syndication'
        ORDER BY id DESC
        LIMIT 8
      `
    ),
    db.query<{
      article_id: number | null
      pathname: string
      page_type: string
      title: string
      meta_description: string
      canonical_url: string | null
      open_graph_json: string | null
      schema_json: string | null
      updated_at: string | null
      article_type: string | null
      article_title: string | null
      content_html: string | null
      product_id: number | null
      product_name: string | null
      brand: string | null
      category: string | null
    }>(
      `
        SELECT sp.article_id, sp.pathname, sp.page_type, sp.title, sp.meta_description, sp.canonical_url, sp.open_graph_json, sp.schema_json, sp.updated_at,
          a.article_type, a.title AS article_title, a.content_html, p.id AS product_id, p.product_name, p.brand, p.category
        FROM seo_pages sp
        LEFT JOIN articles a ON a.id = sp.article_id
        LEFT JOIN products p ON p.id = a.product_id
        WHERE sp.status = 'published'
        ORDER BY sp.updated_at DESC, sp.id DESC
        LIMIT 80
      `
    ),
    listRecentPublishedPaths(8)
  ])

  const seoAlignmentFindings = seoAuditRows.flatMap((row) =>
    collectSeoAlignmentFindings(row).map((finding) => ({
      pathname: row.pathname,
      title: row.title,
      pageType: row.page_type,
      articleType: row.article_type,
      articleId: finding.articleId,
      productId: row.product_id,
      issueType: finding.issueType,
      issueDetail: finding.issueDetail,
      updatedAt: row.updated_at
    }))
  )
  const affectedPages = new Set(seoAlignmentFindings.map((item) => item.pathname)).size
  const [renderedPageAudit, trustSurfaceAudit] = await Promise.all([inspectRenderedPages(recentPublishedPaths), inspectTrustSurface()])
  const auditRowByPath = new Map(
    seoAuditRows.map((row) => [
      row.pathname,
      row
    ])
  )
  const seoRemediationQueue = [
    ...seoAlignmentFindings.map((finding) => ({
      severity: getSeverity(finding.issueType),
      issueType: finding.issueType,
      pathname: finding.pathname,
      title: finding.title,
      issueDetail: finding.issueDetail,
      articleId: finding.articleId,
      productId: finding.productId,
      adminHref: finding.articleId ? `/admin/articles?article=${finding.articleId}` : null,
      publicHref: finding.pathname,
      recommendedAction: getRecommendedAction(finding.issueType),
      updatedAt: finding.updatedAt
    })),
    ...renderedPageAudit.findings.map((finding) => {
      const related = auditRowByPath.get(finding.pathname)
      return {
        severity: getSeverity(finding.issueType),
        issueType: finding.issueType,
        pathname: finding.pathname,
        title: finding.title,
        issueDetail: finding.issueDetail,
        articleId: related?.article_id || null,
        productId: related?.product_id || null,
        adminHref: related?.article_id ? `/admin/articles?article=${related.article_id}` : null,
        publicHref: finding.pathname,
        recommendedAction: getRecommendedAction(finding.issueType),
        updatedAt: finding.checkedAt
      }
    }),
    ...trustSurfaceAudit.findings.map((finding) => ({
      severity: getSeverity(finding.issueType),
      issueType: finding.issueType,
      pathname: finding.pathname,
      title: finding.title,
      issueDetail: finding.issueDetail,
      articleId: null,
      productId: null,
      adminHref: null,
      publicHref: finding.pathname,
      recommendedAction: getRecommendedAction(finding.issueType),
      updatedAt: finding.checkedAt
    }))
  ]
    .sort((left, right) => {
      const severityRank = { high: 3, medium: 2, low: 1 }
      const rankDelta = severityRank[right.severity] - severityRank[left.severity]
      if (rankDelta !== 0) return rankDelta
      return (Date.parse(right.updatedAt || '') || 0) - (Date.parse(left.updatedAt || '') || 0)
    })
    .slice(0, 16)

  return {
    supportedLocales: [...SUPPORTED_LOCALES],
    seoRemediationQueue,
    seoAlignmentAudit: {
      scannedPages: seoAuditRows.length,
      affectedPages,
      issuesFound: seoAlignmentFindings.length,
      findings: seoAlignmentFindings.slice(0, 12)
    },
    renderedPageAudit,
    trustSurfaceAudit,
    lastLinkInspectorRun: lastRun
      ? {
          runId: lastRun.id,
          status: lastRun.status,
          totalChecked: lastRun.total_checked,
          issuesFound: lastRun.issues_found,
          brokenCount: lastRun.broken_count,
          outOfStockCount: lastRun.out_of_stock_count,
          finishedAt: lastRun.finished_at
        }
      : null,
    latestLinkIssues: latestIssues.map((item) => ({
      id: item.id,
      productId: item.product_id,
      productName: item.product_name,
      sourceUrl: item.source_url,
      finalUrl: item.final_url,
      httpStatus: item.http_status,
      issueType: item.issue_type,
      issueDetail: item.issue_detail,
      checkedAt: item.checked_at
    })),
    recentIndexingEvents: recentIndexingEvents.map((item) => ({
      id: item.id,
      status: item.status,
      payloadJson: item.payload_json,
      createdAt: item.created_at
    })),
    recentSyndicationEvents: recentSyndicationEvents.map((item) => ({
      id: item.id,
      status: item.status,
      payloadJson: item.payload_json,
      createdAt: item.created_at
    }))
  }
}
