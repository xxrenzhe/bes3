import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify } from 'jose'

const PUBLIC_PATHS = [
  '/',
  '/about',
  '/contact',
  '/privacy',
  '/terms',
  '/newsletter',
  '/deals',
  '/search',
  '/directory',
  '/login',
  '/thank-you',
  '/api/auth/login',
  '/api/newsletter',
  '/api/health',
  '/sitemap.xml',
  '/robots.txt'
]

function isPublic(pathname: string): boolean {
  if (PUBLIC_PATHS.includes(pathname)) return true
  return pathname.startsWith('/reviews/') || pathname.startsWith('/compare/') || pathname.startsWith('/categories/') || pathname.startsWith('/guides/') || pathname.startsWith('/media/')
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  if (isPublic(pathname)) return NextResponse.next()

  const token = request.cookies.get('auth_token')?.value
  if (!token) {
    if (pathname.startsWith('/api/admin')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.redirect(new URL('/login', request.url))
  }

  try {
    await jwtVerify(token, new TextEncoder().encode(process.env.JWT_SECRET || 'dev-only-jwt-secret-change-me'))
    return NextResponse.next()
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
