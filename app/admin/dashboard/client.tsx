"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import { AdminDashboardLayout } from "@/components/admin/dashboard-layout"
import { DashboardCards } from "@/components/admin/dashboard-card"
import { UnauthorizedAccess } from "@/components/admin/unauthorized-access"
import { useAdminPermissions, clearPermissionsCache } from "@/hooks/use-admin-permissions"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"

interface ContactSubmission {
  id: string
  created_at: string
  name: string
  email: string
  phone: string | null
  subject: string
  message: string
  resolved?: boolean
  status?: string
}

export function DashboardClient() {
  const { userRole, isLoading: permissionsLoading, isSuperAdmin, hasPermission } = useAdminPermissions()
  const [submissions, setSubmissions] = useState<ContactSubmission[]>([])
  const [submissionsCount, setSubmissionsCount] = useState<number>(0)
  const [jobApplicationsCount, setJobApplicationsCount] = useState<number>(0)
  const [newsArticlesCount, setNewsArticlesCount] = useState<number>(0)

  useEffect(() => {
    if (permissionsLoading) return
    fetchDashboardStats()
    if (hasPermission("submissions")) fetchSubmissions()
  }, [permissionsLoading, userRole?.id])



  const fetchSubmissions = async () => {
    try {
      const res = await fetch('/api/admin/submissions', { cache: 'no-store' })
      const data = await res.json().catch(() => [])
      if (!res.ok) throw new Error(data?.error || 'Failed to fetch submissions')
      setSubmissions(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error("Error fetching submissions:", error)
      toast.error("Failed to fetch submissions")
    }
  }

  const fetchDashboardStats = async () => {
    try {
      const res = await fetch('/api/admin/dashboard/stats', { cache: 'no-store' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || 'Failed to fetch dashboard stats')
      setSubmissionsCount(data.submissionsCount ?? 0)
      setJobApplicationsCount(data.jobApplicationsCount ?? 0)
      setNewsArticlesCount(data.newsArticlesCount ?? 0)
    } catch (error) {
      console.error('Error fetching dashboard stats:', error)
    }
  }

  const handleSignOut = async () => {
    try {
      clearPermissionsCache()
      await fetch('/api/admin/auth/logout', { method: 'POST' })
      window.location.href = '/admin/login'
    } catch (error) {
      console.error("Error signing out:", error)
      toast.error("Failed to sign out")
      
      // Force redirect anyway
      window.location.href = '/admin/login'
    }
  }

  // Content area: same wrapper for loading, unauthorized, or dashboard to avoid layout shift
  const contentWrapper = (
    <div className="min-h-[calc(100vh-4rem)] p-6 md:p-8 lg:p-10 max-w-[1400px] mx-auto">
      {permissionsLoading ? (
        <DashboardSkeleton />
      ) : !hasPermission("dashboard") ? (
        <UnauthorizedAccess
          requiredPermission="dashboard"
          currentUserRole={userRole?.role}
        />
      ) : (
        <>
          {/* Welcome header with logo */}
          <header className="mb-10">
            <div className="rounded-2xl bg-gradient-to-br from-muted/60 to-muted/30 dark:from-muted/40 dark:to-muted/20 border border-border/50 px-6 py-8 md:px-8 md:py-10 flex items-center justify-center">
              <div className="flex flex-col sm:flex-row items-center justify-center gap-6 sm:gap-8 text-center sm:text-left">
                <div className="flex-shrink-0">
                  <Image
                    src="/images/legend-logo.png"
                    alt="Legend Holding Group"
                    width={180}
                    height={63}
                    priority
                    className="h-14 w-auto sm:h-16 object-contain"
                  />
                </div>
                <div className="min-w-0">
                  <h1 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight">
                    Welcome to Legend Holding Website Dashboard
                  </h1>
                  <p className="text-muted-foreground mt-2 max-w-xl">
                    {hasPermission("submissions") || hasPermission("news")
                      ? "Quick overview of contact submissions, job applications, and news articles. Use the sidebar to manage each area."
                      : "Quick overview of job applications. Use the sidebar to manage jobs and applications."}
                  </p>
                </div>
              </div>
            </div>
          </header>

          {/* Overview cards */}
          <section className="space-y-1">
            <h2 className="text-sm font-medium uppercase tracking-wider text-muted-foreground mb-5">Overview</h2>
            <DashboardCards
              submissions={submissions}
              submissionsCount={submissionsCount}
              jobApplicationsCount={jobApplicationsCount}
              newsArticlesCount={newsArticlesCount}
              isSuperAdmin={isSuperAdmin}
              hasPermission={hasPermission}
            />
          </section>
        </>
      )}
    </div>
  )

  return <AdminDashboardLayout onSignOut={handleSignOut}>{contentWrapper}</AdminDashboardLayout>
}

function DashboardSkeleton() {
  return (
    <>
      <header className="mb-10">
        <div className="rounded-2xl border border-border/50 px-6 py-8 md:px-8 md:py-10 flex flex-col sm:flex-row items-center gap-6 sm:gap-8">
          <Skeleton className="h-14 w-24 sm:h-16 sm:w-28 shrink-0 rounded-lg" />
          <div className="flex-1 min-w-0 space-y-2">
            <Skeleton className="h-8 w-full max-w-md" />
            <Skeleton className="h-4 w-full max-w-xl" />
            <Skeleton className="h-4 w-3/4 max-w-lg" />
          </div>
        </div>
      </header>
      <section className="space-y-1">
        <Skeleton className="h-4 w-20 mb-5" />
        <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-[180px] rounded-xl" />
          ))}
        </div>
      </section>
    </>
  )
} 