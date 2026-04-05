import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify } from 'jose'
import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE_NAME,
  REQUEST_DISPLAY_PATH_HEADER,
  REQUEST_LOCALE_HEADER,
  SUPPORTED_LOCALES,
  addLocaleToPath,
  getLocaleFromPathname,
  isSupportedLocale,
  normalizeLocale,
  stripLocaleFromPath
} from '@/lib/i18n'

const PUBLIC_PATHS = [
  '/',
  '/about',
  '/brands',
  '/contact',
  '/deals',
  '/search',
  '/site-map',
  '/directory',
  '/newsletter',
  '/privacy',
  '/shortlist',
  '/start',
  '/terms',
  '/tools',
  '/login',
  '/thank-you',
  '/api/auth/login',
  '/api/newsletter',
  '/api/open/buying-feed',
  '/api/health',
  '/sitemap.xml',
  '/robots.txt'
]

function isPublic(pathname: string): boolean {
  if (PUBLIC_PATHS.includes(pathname)) return true
  return (
    pathname.startsWith('/brands/') ||
    pathname.startsWith('/categories/') ||
    pathname.startsWith('/compare/') ||
    pathname.startsWith('/go/') ||
    pathname.startsWith('/guides/') ||
    pathname.startsWith('/media/') ||
    pathname.startsWith('/tools/') ||
    pathname.startsWith('/products/') ||
    pathname.startsWith('/reviews/')
  )
}

function isLocaleRedirectCandidate(pathname: string) {
  return !pathname.startsWith('/api/') && pathname !== '/robots.txt' && pathname !== '/sitemap.xml'
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
  const localeInPath = getLocaleFromPathname(pathname)
  const basePath = stripLocaleFromPath(pathname)
  const activeLocale = localeInPath || pickPreferredLocale(request)
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set(REQUEST_LOCALE_HEADER, activeLocale)
  requestHeaders.set(REQUEST_DISPLAY_PATH_HEADER, localeInPath ? pathname : addLocaleToPath(basePath, activeLocale))

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

  const token = request.cookies.get('auth_token')?.value
  if (!token) {
    if (pathname.startsWith('/api/admin')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.redirect(new URL('/login', request.url))
  }

  try {
    await jwtVerify(token, new TextEncoder().encode(process.env.JWT_SECRET || 'dev-only-jwt-secret-change-me'))
    return NextResponse.next({ request: { headers: requestHeaders } })
  } catch {
    if (pathname.startsWith('/api/admin')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.redirect(new URL('/login', request.url))
  }
}

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*', '/((?!_next/static|_next/image|favicon.ico).*)']
}
