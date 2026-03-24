"use client"

import { Button } from "@/components/ui/button"
import { CircleUserRound, LogOut } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useAdminPermissions, clearPermissionsCache } from "@/hooks/use-admin-permissions"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { useRouter } from "next/navigation"

export function DashboardHeader() {
  const { userRole, roleLabel } = useAdminPermissions()
  const supabase = createClientComponentClient()
  const router = useRouter()

  const handleSignOut = async () => {
    try {
      clearPermissionsCache()
      await supabase.auth.signOut()
      router.push("/admin/login")
      router.refresh()
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  const title = `${roleLabel} Dashboard`

  return (
    <header className="flex items-center justify-between p-4 pl-14 lg:pl-14 bg-background border-b border-border">
      <h1 className="text-2xl font-bold text-foreground">{title}</h1>
      <div className="flex items-center gap-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative">
              <CircleUserRound className="h-5 w-5 text-gray-700 hover:text-primary transition-colors" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>My Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <div className="px-2 py-1.5 text-sm text-gray-600">
              {userRole?.email || 'Loading...'}
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={handleSignOut}
              className="cursor-pointer text-red-600 focus:text-red-600"
            >
              <LogOut className="mr-2 h-4 w-4" />
              <span>Sign Out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
