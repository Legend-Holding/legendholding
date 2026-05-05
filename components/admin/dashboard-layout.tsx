"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { 
  LayoutDashboard, 
  MessageSquare, 
  Newspaper, 
  FileText, 
  LogOut,
  Menu,
  Mail,
  PanelLeftClose,
  PanelLeftOpen,
  ClipboardList,
  Shield,
  Headphones,
  Contact,
  Users,
  UserCog,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { DashboardHeader } from "@/components/admin/dashboard-header"
import { useAdminPermissions } from "@/hooks/use-admin-permissions"
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarProvider,
  SidebarSeparator,
  SidebarFooter,
  useSidebar
} from "@/components/ui/sidebar"

interface AdminDashboardLayoutProps {
  children: React.ReactNode
  onSignOut: () => void
}

const menuItems = [
  {
    title: "Dashboard",
    icon: LayoutDashboard,
    href: "/admin/dashboard",
    permission: "dashboard" as const,
    superAdminOnly: false
  },
  {
    title: "Contact Management",
    icon: MessageSquare,
    href: "/admin/submissions",
    permission: "submissions" as const,
    superAdminOnly: true
  },
  {
    title: "News & Media",
    icon: Newspaper,
    href: "/admin/news",
    permission: "news" as const,
    superAdminOnly: true
  },
  {
    title: "Jobs Management",
    icon: FileText,
    href: "/admin/jobs",
    permission: "jobs" as const,
    superAdminOnly: false
  },
  {
    title: "Job Applications",
    icon: ClipboardList,
    href: "/admin/applications",
    permission: "applications" as const,
    superAdminOnly: false
  },
  {
    title: "Newsletter",
    icon: Mail,
    href: "/admin/newsletters",
    permission: "newsletters" as const,
    superAdminOnly: true
  },
  {
    title: "Customer Care",
    icon: Headphones,
    href: "/admin/customer-care",
    permission: "customer_care" as const,
    superAdminOnly: true
  },
  {
    title: "Digital Business Cards",
    icon: Contact,
    href: "/admin/management-profiles",
    permission: "management_profiles" as const,
    superAdminOnly: false
  },
  {
    title: "Team Members",
    icon: Users,
    href: "/admin/team-members",
    permission: "team_members" as const,
    superAdminOnly: true
  },
  {
    title: "User Management",
    icon: UserCog,
    href: "/admin/user-management",
    permission: "dashboard" as const,
    superAdminOnly: true
  }
]

const systemMenuItems: typeof menuItems = [
  // Settings option removed as requested
]

/** Sidebar highlight for Digital Business Cards when on profiles or management admin pages */
function isDigitalBusinessCardsNavActive(path: string) {
  return (
    path === "/admin/management-profiles" ||
    path.startsWith("/admin/management-profiles/") ||
    path === "/admin/companies" ||
    path.startsWith("/admin/companies/")
  )
}

export function AdminDashboardLayout({ children, onSignOut }: AdminDashboardLayoutProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const pathname = usePathname()
  const router = useRouter()
  const { userRole, isLoading, isSuperAdmin, isBusinessCardsOnlyAdmin, hasPermission, roleLabel } = useAdminPermissions()

  // Business-cards-only admin: only allow management-profiles + management (company defaults) pages
  useEffect(() => {
    if (isLoading || !isBusinessCardsOnlyAdmin) return
    const allowedPaths = ["/admin/management-profiles", "/admin/companies"]
    if (!allowedPaths.includes(pathname)) {
      router.replace("/admin/management-profiles")
    }
  }, [isLoading, isBusinessCardsOnlyAdmin, pathname, router])

  const dashboardHref = isBusinessCardsOnlyAdmin ? "/admin/management-profiles" : "/admin/dashboard"

  return (
    <SidebarProvider defaultOpen>
      <div className="flex min-h-screen w-full">
        {/* Mobile Menu Button */}
        <div className="lg:hidden fixed top-4 left-4 z-50">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="bg-white"
          >
            <Menu className="h-5 w-5" />
          </Button>
        </div>

        {/* Sidebar */}
        <Sidebar className="border-r border-border shrink-0">
          <SidebarHeader className="border-b border-border py-6 px-4">
            <div className="flex flex-col items-center">
              <Link href={dashboardHref} className="flex items-center justify-center w-full focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-lg">
                <Image
                  src="/images/legend-logo.png"
                  alt="Legend Holding"
                  width={200}
                  height={70}
                  className="h-11 w-auto object-contain"
                />
              </Link>
            </div>
            {isLoading ? (
              <Skeleton className="mt-4 h-7 w-24 mx-auto rounded-lg" />
            ) : isSuperAdmin ? (
              <div className="mt-4 flex items-center justify-center gap-2 text-xs text-blue-600 dark:text-blue-400 bg-blue-500/10 dark:bg-blue-500/20 px-3 py-1.5 rounded-lg">
                <Shield className="h-3.5 w-3.5 shrink-0" />
                <span>{roleLabel}</span>
              </div>
            ) : null}
          </SidebarHeader>
          
          <SidebarContent className="px-3 py-5">
            {/* Main Menu */}
            <div className="space-y-5">
              <div>
                <h2 className="mb-3 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Menu
                </h2>
                {isLoading ? (
                  <div className="space-y-0.5">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                      <Skeleton key={i} className="mx-3 h-10 rounded-lg" />
                    ))}
                  </div>
                ) : (
                  <SidebarMenu className="space-y-0.5">
                    {menuItems.map((item) => {
                      const isActive =
                        item.href === "/admin/management-profiles"
                          ? isDigitalBusinessCardsNavActive(pathname)
                          : pathname === item.href
                      const hasAccess = hasPermission(item.permission)
                      const isSuperAdminOnly = item.superAdminOnly && !isSuperAdmin
                      
                      if (!hasAccess || isSuperAdminOnly) return null
                      
                      return (
                        <SidebarMenuItem key={item.href}>
                          <SidebarMenuButton
                            asChild
                            data-active={isActive}
                            className="w-full px-3 py-2.5 justify-start gap-3 rounded-lg hover:bg-primary/5 hover:text-primary data-[active=true]:bg-primary/10 data-[active=true]:text-primary group transition-colors"
                          >
                            <Link href={item.href}>
                              <item.icon className="h-5 w-5 transition-colors group-hover:text-primary shrink-0" />
                              <span className="font-medium">{item.title}</span>
                            </Link>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      )
                    })}
                  </SidebarMenu>
                )}
              </div>

              <SidebarSeparator className="mx-3" />

              {/* System Menu */}
              <div>
                <SidebarMenu className="space-y-0.5">
                  {systemMenuItems.map((item) => {
                    const isActive = pathname === item.href
                    const hasAccess = hasPermission(item.permission)
                    const isSuperAdminOnly = item.superAdminOnly && !isSuperAdmin
                    
                    if (!hasAccess || isSuperAdminOnly) return null
                    
                    return (
                      <SidebarMenuItem key={item.href}>
                        <SidebarMenuButton
                          asChild
                          data-active={isActive}
                          className="w-full px-3 py-2.5 justify-start gap-3 rounded-lg hover:bg-muted group transition-colors data-[active=true]:bg-muted data-[active=true]:text-foreground"
                        >
                          <Link href={item.href}>
                            <item.icon className="h-5 w-5 text-muted-foreground transition-colors group-hover:text-foreground shrink-0" />
                            <span>{item.title}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    )
                  })}
                </SidebarMenu>
              </div>
            </div>
          </SidebarContent>

          <SidebarFooter className="border-t border-border px-4 py-4">
            <SidebarMenuButton
              onClick={onSignOut}
              className="w-full px-3 py-2.5 justify-start gap-3 rounded-lg text-destructive hover:bg-destructive/10 hover:text-destructive transition-colors"
            >
              <LogOut className="h-5 w-5 shrink-0" />
              <span>Sign Out</span>
            </SidebarMenuButton>
          </SidebarFooter>
        </Sidebar>

        {/* Main Content */}
        <div className="flex-1 min-w-0 relative">
          {/* Persistent Sidebar Toggle */}
          <SidebarToggleButton />
          <div className="h-full">
            <DashboardHeader />
            <div className="p-6">
              {children}
            </div>
          </div>
        </div>
      </div>
    </SidebarProvider>
  )
}

function SidebarToggleButton() {
  const { toggleSidebar, state } = useSidebar()
  const isCollapsed = state === "collapsed"

  return (
    <Button
      variant="outline"
      size="icon"
      onClick={toggleSidebar}
      className={cn(
        "fixed top-4 z-50 h-9 w-9 rounded-lg bg-background border-border shadow-sm hover:bg-muted transition-all duration-200",
        isCollapsed ? "left-4 lg:left-4" : "left-4 lg:left-[calc(var(--sidebar-width)-2.5rem)]"
      )}
      aria-label={isCollapsed ? "Show sidebar" : "Hide sidebar"}
    >
      {isCollapsed ? (
        <PanelLeftOpen className="h-4 w-4" />
      ) : (
        <PanelLeftClose className="h-4 w-4" />
      )}
    </Button>
  )
}
