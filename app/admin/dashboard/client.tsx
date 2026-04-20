"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
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
  const supabase = createClientComponentClient()
  const { userRole, isLoading: permissionsLoading, isSuperAdmin, hasPermission } = useAdminPermissions()
  const [submissions, setSubmissions] = useState<ContactSubmission[]>([])
  const [jobApplicationsCount, setJobApplicationsCount] = useState<number>(0)
  const [newsArticlesCount, setNewsArticlesCount] = useState<number>(0)

  useEffect(() => {
    if (permissionsLoading) return
    fetchJobApplicationsCount()
    if (hasPermission("submissions")) fetchSubmissions()
    if (hasPermission("news")) fetchNewsArticlesCount()
  }, [permissionsLoading, userRole?.id])



  const fetchSubmissions = async () => {
    try {
      const { data, error } = await supabase
        .from("contact_submissions")
        .select("*")
        .order("created_at", { ascending: false })

      if (error) throw error

      setSubmissions(data || [])
    } catch (error) {
      console.error("Error fetching submissions:", error)
      toast.error("Failed to fetch submissions")
    }
  }

  const fetchJobApplicationsCount = async () => {
    try {
      const { count, error } = await supabase
        .from('job_applications')
        .select('id', { count: 'exact', head: true })

      if (error) throw error
      setJobApplicationsCount(count || 0)
    } catch (error) {
      console.error('Error fetching job applications count:', error)
    }
  }

  const fetchNewsArticlesCount = async () => {
    try {
      const { count, error } = await supabase
        .from('news_articles')
        .select('id', { count: 'exact', head: true })

      if (error) throw error
      setNewsArticlesCount(count || 0)
    } catch (error) {
      console.error('Error fetching news articles count:', error)
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