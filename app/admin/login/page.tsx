'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Lock, Mail, Loader2 } from 'lucide-react'

export default function AdminLogin() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [isRedirecting, setIsRedirecting] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    let didSucceed = false

    try {
      const res = await fetch('/api/admin/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data?.error || 'Invalid email or password')
        return
      }

      if (data?.user) {
        didSucceed = true
        setIsRedirecting(true)
        // Keep loading visible until we navigate away
        router.refresh()
        // Business-cards-only admin goes straight to management profiles
        const isBusinessCardsOnly = data.user.email === 'admin@legendholding.com'
        router.push(isBusinessCardsOnly ? '/admin/management-profiles' : '/admin/dashboard')
      }
    } catch (error: any) {
      console.error('Login error:', error)
      setError('An unexpected error occurred. Please try again.')
    } finally {
      if (!didSucceed) {
        setLoading(false)
        setIsRedirecting(false)
      }
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-[#2B1C48] to-[#5D376E] py-12 px-4 sm:px-6 lg:px-8">
      <div className="absolute top-0 left-0 w-full h-full bg-[url('/images/pattern.svg')] opacity-5" />
      
      <div className="relative w-full max-w-md">
        <div className={`bg-white rounded-2xl shadow-xl p-8 space-y-8 relative ${loading ? 'pointer-events-none' : ''}`}>
          {/* Loading Overlay */}
          {loading && (
            <div className="absolute inset-0 bg-white/80 backdrop-blur-sm rounded-2xl flex items-center justify-center z-10">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-[#2B1C48]" />
                <p className="text-sm text-gray-600 font-medium">
                  {isRedirecting ? 'Redirecting to dashboard...' : 'Signing you in...'}
                </p>
              </div>
            </div>
          )}
          
          {/* Logo and Title */}
          <div className="text-center">
            <div className="flex justify-center mb-4">
              <Image
                src="/images/legend-logo.png"
                alt="Legend Holding Group"
                width={200}
                height={70}
                priority
                className="h-16 w-auto"
              />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">
              Admin Portal
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              Sign in to access your dashboard
            </p>
          </div>

          <form className="space-y-6" onSubmit={handleLogin}>
            {/* Email Input */}
            <div className="space-y-2">
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  disabled={loading}
                  className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#2B1C48]/20 focus:border-[#2B1C48] transition-colors duration-200 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value)
                    if (error) setError('') // Clear error when user starts typing
                  }}
                />
              </div>
            </div>

            {/* Password Input */}
            <div className="space-y-2">
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  disabled={loading}
                  className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#2B1C48]/20 focus:border-[#2B1C48] transition-colors duration-200 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value)
                    if (error) setError('') // Clear error when user starts typing
                  }}
                />
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-4 rounded-lg bg-red-50 border border-red-200">
                <p className="text-sm text-red-600 text-center">
                  {error}
                </p>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center px-4 py-2.5 border border-transparent rounded-lg shadow-sm text-base font-medium text-white bg-[#2B1C48] hover:bg-[#2B1C48]/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#2B1C48] disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin -ml-1 mr-2 h-5 w-5" />
                  Signing in...
                </>
              ) : (
                'Sign in'
              )}
            </button>
          </form>

          {/* Footer */}
          <div className="text-center">
            <p className="text-xs text-gray-500">
              © {new Date().getFullYear()} Legend Holding Group. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
} 