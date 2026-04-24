import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const ADMIN_SESSION_COOKIE = 'admin_session'

const VALID_ROUTE_PREFIXES = new Set([
  '/about',
  '/admin',
  '/api',
  '/careers',
  '/co-founder-approval',
  '/company',
  '/contact',
  '/cookie-policy',
  '/customer-care',
  '/finance-review',
  '/founder-approval',
  '/home',
  '/LHGvCard',
  '/news',
  '/our-businesses',
  '/privacy-policy',
  '/profile',
  '/robots.txt',
  '/sitemap',
  '/sitemap.xml',
  '/social-profile',
  '/who-we-are',
  '/workflow',
  '/workflow-submissions',
])

function isValidRoute(pathname: string): boolean {
  if (pathname === '/') return true
  // Allow direct static file requests from /public (e.g. /icon.png, /file.svg).
  // These have no additional "/" in the pathname.
  if (
    pathname.lastIndexOf('/') === 0 &&
    /\.[a-z0-9]+$/i.test(pathname)
  ) {
    return true
  }
  const firstSegment = '/' + pathname.split('/')[1]
  return VALID_ROUTE_PREFIXES.has(firstSegment)
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Block any request that doesn't match a known route prefix.
  // Spam bots hit random paths like /dublagem-de-hunter-x-hunter-76518
  // or *.html — these pollute Google Analytics with fake page views.
  if (!isValidRoute(pathname)) {
    return new NextResponse(null, { status: 404 })
  }

  try {
    const hasAdminSession = Boolean(req.cookies.get(ADMIN_SESSION_COOKIE)?.value)

    // If there's no session and the user is trying to access admin routes (except login itself)
    if (!hasAdminSession && req.nextUrl.pathname.startsWith('/admin/') && !req.nextUrl.pathname.startsWith('/admin/login')) {
      const redirectUrl = new URL('/admin/login', req.url)
      return NextResponse.redirect(redirectUrl)
    }

    // If there's a session and the user is trying to access login, redirect to dashboard
    if (hasAdminSession && req.nextUrl.pathname.startsWith('/admin/login')) {
      const redirectUrl = new URL('/admin/dashboard', req.url)
      return NextResponse.redirect(redirectUrl)
    }

    return NextResponse.next()
  } catch {
    if (req.nextUrl.pathname.startsWith('/admin/') && !req.nextUrl.pathname.startsWith('/admin/login')) {
      const redirectUrl = new URL('/admin/login', req.url)
      return NextResponse.redirect(redirectUrl)
    }
    return NextResponse.next()
  }
}

export const config = {
  matcher: [
    // Run on all routes except Next.js internals and static files
    '/((?!_next/static|_next/image|favicon\\.ico|fonts/|icons/|images/|logo/|tinymce/).*)',
  ],
} 