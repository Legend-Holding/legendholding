import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  // Block .html extension requests from spam/malware bots.
  // These never correspond to real pages and only pollute analytics.
  if (req.nextUrl.pathname.endsWith('.html')) {
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
    '/admin/dashboard', 
    '/admin/submissions', 
    '/admin/news', 
    '/admin/jobs', 
    '/admin/applications', 
    '/admin/newsletters', 
    '/admin/settings',
    '/admin/customer-care',
    '/admin/management-profiles',
    '/admin/team-members',
    '/company/dashboard',
    // Intercept all .html requests (spam/bot traffic) before GA fires
    '/((?!_next/static|_next/image|favicon\\.ico).+\\.html)',
  ],
} 