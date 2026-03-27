import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

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
    const res = NextResponse.next()
    const supabase = createMiddlewareClient({ req, res })

    // Try to get the session
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession()

    // If there's an error getting the session, redirect to login
    if (error) {
      console.error('Auth error in middleware:', error)
      if (req.nextUrl.pathname.startsWith('/admin/dashboard')) {
        const redirectUrl = new URL('/admin/login', req.url)
        return NextResponse.redirect(redirectUrl)
      }
      return res
    }

    // If there's no session and the user is trying to access admin routes
    if (!session && req.nextUrl.pathname.startsWith('/admin/')) {
      const redirectUrl = new URL('/admin/login', req.url)
      return NextResponse.redirect(redirectUrl)
    }

    // If there's a session and the user is trying to access login, redirect to dashboard
    if (session && req.nextUrl.pathname.startsWith('/admin/login')) {
      const redirectUrl = new URL('/admin/dashboard', req.url)
      return NextResponse.redirect(redirectUrl)
    }

    return res
  } catch (error) {
    console.error('Middleware error:', error)
    // In case of any error, redirect to login if trying to access protected routes
    if (req.nextUrl.pathname.startsWith('/admin/')) {
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