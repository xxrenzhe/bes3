import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify } from 'jose/jwt/verify'
import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE_NAME,
  REQUEST_DISPLAY_PATH_HEADER,
  REQUEST_LOCALE_HEADER,
  addLocaleToPath,
  getLocaleFromPathname,
  isSupportedLocale,
  normalizeLocale,
  stripLocaleFromPath
} from '@/lib/i18n'
import { hasValidInternalServiceToken } from '@/lib/internal-service'

const PUBLIC_PATHS = [
  '/',
  '/about',
  '/assistant',
  '/brands',
  '/biggest-discounts',
  '/categories',
  '/compare',
  '/contact',
  '/data',
  '/deals',
  '/feed.xml',
  '/feed.json',
  '/guides',
  '/llms.txt',
  '/offers',
  '/search',
  '/site-map',
  '/directory',
  '/newsletter',
  '/privacy',
  '/products',
  '/reviews',
  '/shortlist',
  '/start',
  '/terms',
  '/trust',
  '/tools',
  '/login',
  '/change-password',
  '/thank-you',
  '/api/auth/login',
  '/api/auth/logout',
  '/api/auth/me',
  '/api/auth/change-password',
  '/api/newsletter',
  '/api/open/buying-feed',
  '/api/open/coverage',
  '/api/health',
  '/sitemap.xml',
  '/robots.txt',
  '/editorial/sitemap.xml',
  '/products/sitemap.xml',
  '/taxonomy/sitemap.xml',
  '/trust/sitemap.xml'
]

const EXACT_PUBLIC_ALIASES: Record<string, string> = {
  '/about-us': '/about',
  '/alerts': '/newsletter',
  '/brand': '/brands',
  '/brands-index': '/brands',
  '/category': '/categories',
  '/categories-index': '/categories',
  '/comparison': '/compare',
  '/comparisons': '/compare',
  '/compare-index': '/compare',
  '/deal': '/deals',
  '/discount': '/offers',
  '/discounts': '/offers',
  '/email-alerts': '/newsletter',
  '/guide': '/guides',
  '/guides-index': '/guides',
  '/newsletter-updates': '/newsletter',
  '/open-data': '/data',
  '/offer': '/offers',
  '/offers-index': '/offers',
  '/privacy-policy': '/privacy',
  '/product': '/products',
  '/products-index': '/products',
  '/biggest-deals': '/biggest-discounts',
  '/biggest-discount': '/biggest-discounts',
  '/best-discounts': '/biggest-discounts',
  '/review': '/reviews',
  '/reviews-index': '/reviews',
  '/sitemap': '/site-map',
  '/site-map.xml': '/sitemap.xml',
  '/start-here': '/start',
  '/wait-updates': '/newsletter',
  '/trust-center': '/trust'
}

const PUBLIC_FAMILY_ALIASES: Array<{
  pattern: RegExp
  build: (...matches: string[]) => string
}> = [
  {
    pattern: /^\/brand\/([^/]+)$/i,
    build: (slug) => `/brands/${slug}`
  },
  {
    pattern: /^\/category\/([^/]+)$/i,
    build: (slug) => `/categories/${slug}`
  },
  {
    pattern: /^\/product\/([^/]+)$/i,
    build: (slug) => `/products/${slug}`
  },
  {
    pattern: /^\/review\/([^/]+)$/i,
    build: (slug) => `/reviews/${slug}`
  },
  {
    pattern: /^\/guide\/([^/]+)$/i,
    build: (slug) => `/guides/${slug}`
  },
  {
    pattern: /^\/comparison\/([^/]+)$/i,
    build: (slug) => `/compare/${slug}`
  },
  {
    pattern: /^\/comparisons\/([^/]+)$/i,
    build: (slug) => `/compare/${slug}`
  },
  {
    pattern: /^\/brands\/([^/]+)\/category\/([^/]+)$/i,
    build: (brandSlug, categorySlug) => `/brands/${brandSlug}/categories/${categorySlug}`
  },
  {
    pattern: /^\/brand\/([^/]+)\/category\/([^/]+)$/i,
    build: (brandSlug, categorySlug) => `/brands/${brandSlug}/categories/${categorySlug}`
  },
  {
    pattern: /^\/brand\/([^/]+)\/categories\/([^/]+)$/i,
    build: (brandSlug, categorySlug) => `/brands/${brandSlug}/categories/${categorySlug}`
  },
  {
    pattern: /^\/deals\/([^/]+)$/i,
    build: (categorySlug) => `/offers/${categorySlug}`
  },
  {
    pattern: /^\/deals\/category\/([^/]+)$/i,
    build: (categorySlug) => `/offers/${categorySlug}`
  },
  {
    pattern: /^\/deals\/categories\/([^/]+)$/i,
    build: (categorySlug) => `/offers/${categorySlug}`
  },
  {
    pattern: /^\/offers\/category\/([^/]+)$/i,
    build: (categorySlug) => `/offers/${categorySlug}`
  },
  {
    pattern: /^\/offers\/categories\/([^/]+)$/i,
    build: (categorySlug) => `/offers/${categorySlug}`
  }
]

const PUBLIC_ROUTE_FAMILIES = ['/brands/', '/categories/', '/compare/', '/deals/', '/guides/', '/offers/', '/products/', '/reviews/']
const RESERVED_DYNAMIC_SEGMENTS = new Set([
  '_next',
  'admin',
  'api',
  'brands',
  'categories',
  'compare',
  'deals',
  'go',
  'guides',
  'login',
  'change-password',
  'media',
  'offers',
  'products',
  'reviews',
  'tools',
  'trust'
])

const MALICIOUS_SCAN_PATTERNS = [
  /^\/\.env(?:$|[./])/i,
  /^\/\.git(?:$|\/)/i,
  /^\/wp-admin(?:$|\/)/i,
  /^\/wp-login\.php$/i,
  /^\/xmlrpc\.php$/i,
  /^\/phpmyadmin(?:$|\/)/i,
  /^\/pma(?:$|\/)/i,
  /^\/adminer(?:\.php)?$/i,
  /^\/vendor\/phpunit(?:$|\/)/i,
  /^\/config(?:\.php|\.json|\.yml|\.yaml)$/i,
  /^\/backup(?:$|[./_-])/i,
  /^\/database(?:$|[./_-])/i
]

function stripCommonPublicPathArtifacts(pathname: string) {
  return (
    pathname
      .replace(/\/index(?:\.(?:html?|php|asp|aspx))?$/i, '')
      .replace(/\.(?:html?|php|asp|aspx)$/i, '') || '/'
  )
}

function isDynamicPublicLanding(pathname: string): boolean {
  const segments = pathname.split('/').filter(Boolean)
  if (segments.length !== 2) return false
  if (segments.some((segment) => segment.includes('.'))) return false
  return !RESERVED_DYNAMIC_SEGMENTS.has(segments[0] || '')
}

function isPublic(pathname: string): boolean {
  if (PUBLIC_PATHS.includes(pathname)) return true
  return (
    isDynamicPublicLanding(pathname) ||
    pathname.startsWith('/brands/') ||
    pathname.startsWith('/biggest-discounts') ||
    pathname.startsWith('/categories/') ||
    pathname.startsWith('/compare/') ||
    pathname.startsWith('/deals/') ||
    pathname.startsWith('/go/') ||
    pathname.startsWith('/guides/') ||
    pathname.startsWith('/media/') ||
    pathname.startsWith('/offers/') ||
    pathname.startsWith('/tools/') ||
    pathname.startsWith('/products/') ||
    pathname.startsWith('/reviews/') ||
    pathname.startsWith('/api/open/') ||
    pathname.startsWith('/trust/')
  )
}

function resolveCanonicalPublicPath(pathname: string) {
  const rawNormalized = pathname.replace(/\/+$/, '') || '/'
  let normalized = rawNormalized

  const artifactStripped = stripCommonPublicPathArtifacts(normalized)
  if (
    artifactStripped !== normalized &&
    (isPublic(artifactStripped) ||
      Boolean(EXACT_PUBLIC_ALIASES[artifactStripped]) ||
      PUBLIC_FAMILY_ALIASES.some(({ pattern }) => pattern.test(artifactStripped)) ||
      PUBLIC_ROUTE_FAMILIES.some((prefix) => artifactStripped.startsWith(prefix)))
  ) {
    normalized = artifactStripped
  }

  if (EXACT_PUBLIC_ALIASES[normalized]) {
    return EXACT_PUBLIC_ALIASES[normalized]
  }

  for (const alias of PUBLIC_FAMILY_ALIASES) {
    const match = normalized.match(alias.pattern)
    if (!match) continue
    return alias.build(...match.slice(1))
  }

  if (normalized !== rawNormalized && isPublic(normalized)) {
    return normalized
  }

  return null
}

function isLocaleRedirectCandidate(pathname: string) {
  return !pathname.startsWith('/api/') && pathname !== '/robots.txt' && pathname !== '/sitemap.xml'
}

function normalizeSecurityPath(pathname: string) {
  try {
    return decodeURIComponent(pathname).replace(/\/+/g, '/')
  } catch {
    return pathname.replace(/\/+/g, '/')
  }
}

function isMaliciousScanPath(pathname: string) {
  const normalized = normalizeSecurityPath(pathname)
  return MALICIOUS_SCAN_PATTERNS.some((pattern) => pattern.test(normalized))
}

function blockedScanResponse(requestId: string) {
  return new NextResponse('Not Found', {
    status: 404,
    headers: {
      'x-request-id': requestId,
      'x-bes3-blocked-reason': 'scan-path'
    }
  })
}

function pickPreferredLocale(request: NextRequest) {
  const cookieLocale = normalizeLocale(request.cookies.get(LOCALE_COOKIE_NAME)?.value)
  if (cookieLocale !== DEFAULT_LOCALE) return cookieLocale

  const acceptLanguage = request.headers.get('accept-language') || ''
  for (const part of acceptLanguage.split(',')) {
    const candidate = part.split(';')[0]?.trim().toLowerCase()
    if (!candidate) continue
    if (isSupportedLocale(candidate)) return candidate
    const baseLanguage = candidate.split('-')[0]
    if (isSupportedLocale(baseLanguage)) return baseLanguage
  }

  return DEFAULT_LOCALE
}

function withLocaleCookie(response: NextResponse, locale: string) {
  response.cookies.set(LOCALE_COOKIE_NAME, locale, {
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 365
  })
  return response
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const requestId = request.headers.get('x-request-id') || crypto.randomUUID()
  const localeInPath = getLocaleFromPathname(pathname)
  const basePath = stripLocaleFromPath(pathname)
  const activeLocale = localeInPath || pickPreferredLocale(request)
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-request-id', requestId)
  requestHeaders.set(REQUEST_LOCALE_HEADER, activeLocale)
  requestHeaders.set(REQUEST_DISPLAY_PATH_HEADER, localeInPath ? pathname : addLocaleToPath(basePath, activeLocale))
  const canonicalPublicPath = resolveCanonicalPublicPath(basePath)

  if (isMaliciousScanPath(basePath)) {
    return blockedScanResponse(requestId)
  }

  if (canonicalPublicPath && canonicalPublicPath !== basePath) {
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = localeInPath ? addLocaleToPath(canonicalPublicPath, activeLocale) : canonicalPublicPath
    return withLocaleCookie(NextResponse.redirect(redirectUrl, 308), activeLocale)
  }

  if (localeInPath && isPublic(basePath)) {
    const rewrittenUrl = request.nextUrl.clone()
    rewrittenUrl.pathname = basePath
    return withLocaleCookie(NextResponse.rewrite(rewrittenUrl, { request: { headers: requestHeaders } }), activeLocale)
  }

  if (!localeInPath && isPublic(basePath)) {
    if (activeLocale !== DEFAULT_LOCALE && isLocaleRedirectCandidate(basePath)) {
      const localizedUrl = request.nextUrl.clone()
      localizedUrl.pathname = addLocaleToPath(basePath, activeLocale)
      return withLocaleCookie(NextResponse.redirect(localizedUrl), activeLocale)
    }

    return withLocaleCookie(NextResponse.next({ request: { headers: requestHeaders } }), activeLocale)
  }

  if (basePath.startsWith('/api/internal/')) {
    if (hasValidInternalServiceToken(request.headers)) {
      return NextResponse.next({ request: { headers: requestHeaders } })
    }
    return NextResponse.json({ error: 'Unauthorized', requestId }, { status: 401 })
  }

  const token = request.cookies.get('auth_token')?.value
  if (!token) {
    if (pathname.startsWith('/api/admin')) {
      return NextResponse.json({ error: 'Unauthorized', requestId }, { status: 401 })
    }
    return NextResponse.redirect(new URL('/login', request.url))
  }

  try {
    const jwtSecret = process.env.JWT_SECRET
    if (!jwtSecret || (process.env.NODE_ENV === 'production' && jwtSecret === 'dev-only-jwt-secret-change-me')) {
      throw new Error('JWT_SECRET is not configured')
    }
    const result = await jwtVerify(token, new TextEncoder().encode(jwtSecret))
    const mustChangePassword = result.payload.mustChangePassword === true
    const isPasswordChangePath = basePath === '/change-password' || basePath.startsWith('/api/auth/')
    if (mustChangePassword && !isPasswordChangePath) {
      if (pathname.startsWith('/api/admin')) {
        return NextResponse.json({ error: 'Password change required', requestId }, { status: 403 })
      }
      return NextResponse.redirect(new URL('/change-password', request.url))
    }
    return NextResponse.next({ request: { headers: requestHeaders } })
  } catch {
    if (pathname.startsWith('/api/admin')) {
      return NextResponse.json({ error: 'Unauthorized', requestId }, { status: 401 })
    }
    return NextResponse.redirect(new URL('/login', request.url))
  }
}

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*', '/((?!_next/static|_next/image|favicon.ico).*)']
}
