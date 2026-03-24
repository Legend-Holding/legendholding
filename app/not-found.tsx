'use client'

import Link from 'next/link'
import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { Button } from "@/components/ui/button"

export default function NotFound() {
  const pathname = usePathname()

  useEffect(() => {
    // Push a 404 event to GA4 so these pages can be filtered
    // in the Google Analytics dashboard under Events > 404_not_found
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', '404_not_found', {
        page_path: pathname || window.location.pathname,
        page_location: window.location.href,
      })
    }
  }, [pathname])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-white to-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <h1 className="text-9xl font-bold text-[#5D376E] mb-4">404</h1>
        <h2 className="text-3xl font-semibold text-gray-800 mb-6">Page Not Found</h2>
        <p className="text-gray-600 mb-8">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button asChild variant="default" className="bg-[#5D376E] hover:bg-[#4A2B5A]">
            <Link href="/">
              Return Home
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/contact">
              Contact Support
            </Link>
          </Button>
        </div>
      </div>
    </div>
  )
} 