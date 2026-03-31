"use client"

import { useState, useEffect, useCallback } from "react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { useRouter } from "next/navigation"
import { AdminDashboardLayout } from "@/components/admin/dashboard-layout"
import { useAdminPermissions, type UserRole } from "@/hooks/use-admin-permissions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { Plus, Trash2, Loader2, Shield, ShieldCheck, UserCog } from "lucide-react"
import { toast } from "sonner"

interface AdminUserRow {
  id: string
  user_id: string
  email: string
  role: "super_admin" | "admin"
  permissions: Record<string, boolean>
  created_at: string
  updated_at: string
}

const PERMISSION_LABELS: { key: string; label: string }[] = [
  { key: "dashboard", label: "Dashboard" },
  { key: "jobs", label: "Jobs Management" },
  { key: "applications", label: "Job Applications" },
  { key: "submissions", label: "Contact Management" },
  { key: "news", label: "News & Media" },
  { key: "newsletters", label: "Newsletter" },
  { key: "customer_care", label: "Customer Care" },
  { key: "management_profiles", label: "Digital Business Cards" },
  { key: "team_members", label: "Team Members" },
]

type RolePreset = "super_admin" | "admin" | "hr_admin"

const ROLE_PRESETS: { value: RolePreset; label: string; description: string }[] = [
  { value: "super_admin", label: "Super Admin", description: "Full access to all features" },
  { value: "admin", label: "Admin", description: "Jobs Management & Job Applications only" },
  { value: "hr_admin", label: "HR Admin", description: "All jobs across admins, assign jobs, manage applications" },
]

function presetToRoleAndPermissions(preset: RolePreset): { role: "super_admin" | "admin"; permissions: Record<string, boolean> } {
  const allTrue: Record<string, boolean> = Object.fromEntries(PERMISSION_LABELS.map(p => [p.key, true]))
  allTrue.settings = true

  switch (preset) {
    case "super_admin":
      return { role: "super_admin", permissions: allTrue }
    case "hr_admin":
      return {
        role: "super_admin",
        permissions: {
          dashboard: true, jobs: true, applications: true,
          submissions: false, news: false, newsletters: false,
          settings: false, customer_care: false, management_profiles: false, team_members: false,
        },
      }
    case "admin":
    default:
      return {
        role: "admin",
        permissions: {
          dashboard: true, jobs: true, applications: true,
          submissions: false, news: false, newsletters: false,
          settings: false, customer_care: false, management_profiles: false, team_members: false,
        },
      }
  }
}

function detectPreset(user: AdminUserRow): RolePreset {
  if (user.role === "super_admin") {
    const hasExplicitFalse = PERMISSION_LABELS.some(p => user.permissions?.[p.key] === false)
    return hasExplicitFalse ? "hr_admin" : "super_admin"
  }
  return "admin"
}

function getRoleLabel(user: AdminUserRow): string {
  if (user.role === "super_admin") {
    if (user.permissions?.submissions !== true && user.permissions?.news !== true) return "HR Admin"
    return "Super Admin"
  }
  if (user.permissions?.management_profiles === true && user.permissions?.jobs !== true && user.permissions?.applications !== true) {
    return "Business Cards Admin"
  }
  return "Admin"
}

export default function UserManagementPage() {
  const supabase = createClientComponentClient()
  const router = useRouter()
  const { isSuperAdmin, isLoading: permLoading, userRole } = useAdminPermissions()

  const [users, setUsers] = useState<AdminUserRow[]>([])
  const [loading, setLoading] = useState(true)

  // Create dialog
  const [showCreate, setShowCreate] = useState(false)
  const [createEmail, setCreateEmail] = useState("")
  const [createPassword, setCreatePassword] = useState("")
  const [createPreset, setCreatePreset] = useState<RolePreset>("admin")
  const [isCreating, setIsCreating] = useState(false)


  // Delete dialog
  const [deleteUser, setDeleteUser] = useState<AdminUserRow | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch("/api/admin/users")
      if (!res.ok) throw new Error("Failed to fetch users")
      const data = await res.json()
      setUsers(data)
    } catch (err) {
      toast.error("Failed to load users")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!permLoading && isSuperAdmin) fetchUsers()
  }, [permLoading, isSuperAdmin, fetchUsers])

  const handleCreate = async () => {
    if (!createEmail.trim() || !createPassword.trim()) {
      toast.error("Email and password are required")
      return
    }
    setIsCreating(true)
    try {
      const { role, permissions } = presetToRoleAndPermissions(createPreset)
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: createEmail.trim(),
          password: createPassword.trim(),
          role,
          permissions,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to create user")
      toast.success(`Admin user ${createEmail} created`)
      setShowCreate(false)
      resetCreateForm()
      fetchUsers()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setIsCreating(false)
    }
  }

  const resetCreateForm = () => {
    setCreateEmail("")
    setCreatePassword("")
    setCreatePreset("admin")
  }

  const handleDelete = async () => {
    if (!deleteUser) return
    setIsDeleting(true)
    try {
      const res = await fetch(`/api/admin/users/${deleteUser.user_id}`, { method: "DELETE" })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to delete user")
      toast.success(`Deleted ${deleteUser.email}`)
      setDeleteUser(null)
      fetchUsers()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setIsDeleting(false)
    }
  }

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut()
      localStorage.removeItem("supabase.auth.token")
      window.location.href = "/admin/login"
    } catch {
      window.location.href = "/admin/login"
    }
  }

  if (permLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!isSuperAdmin) {
    return (
      <AdminDashboardLayout onSignOut={handleSignOut}>
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
          <Shield className="h-16 w-16 text-muted-foreground/40" />
          <h2 className="text-xl font-semibold">Access Denied</h2>
          <p className="text-muted-foreground">Only Super Admins can manage users.</p>
        </div>
      </AdminDashboardLayout>
    )
  }

  return (
    <AdminDashboardLayout onSignOut={handleSignOut}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">User Management</h1>
            <p className="text-sm text-muted-foreground">
              Create, edit permissions, and remove admin users
            </p>
          </div>
          <Button onClick={() => setShowCreate(true)} className="bg-[#5E366D] hover:bg-[#5E366D]/90">
            <Plus className="w-4 h-4 mr-2" />
            Add Admin User
          </Button>
        </div>

        {/* Users table */}
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-14 w-full rounded-lg" />)}
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[60px]">#</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Permissions</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="w-[120px]">Access</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user, idx) => {
                  const isCurrentUser = user.user_id === userRole?.user_id
                  const label = getRoleLabel(user)
                  return (
                    <TableRow key={user.id}>
                      <TableCell>{idx + 1}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{user.email}</span>
                          {isCurrentUser && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 font-medium">You</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${
                          label === "Super Admin"
                            ? "bg-purple-100 text-purple-700"
                            : label === "HR Admin"
                              ? "bg-amber-100 text-amber-700"
                              : label === "Business Cards Admin"
                                ? "bg-teal-100 text-teal-700"
                                : "bg-blue-100 text-blue-700"
                        }`}>
                          {label === "Super Admin" ? <ShieldCheck className="h-3 w-3" /> : label === "HR Admin" || label === "Business Cards Admin" ? <UserCog className="h-3 w-3" /> : <Shield className="h-3 w-3" />}
                          {label}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {(() => {
                            const hasExplicitFalse = PERMISSION_LABELS.some(p => user.permissions?.[p.key] === false)
                            const isFullSuperAdmin = user.role === "super_admin" && !hasExplicitFalse
                            if (isFullSuperAdmin) {
                              return (
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200">
                                  All Access
                                </span>
                              )
                            }
                            return PERMISSION_LABELS.filter(p => {
                              if (user.role === "super_admin") return user.permissions?.[p.key] !== false
                              return user.permissions?.[p.key] === true
                            }).map(p => (
                              <span key={p.key} className="text-[10px] px-1.5 py-0.5 rounded bg-green-50 text-green-700 border border-green-200">
                                {p.label}
                              </span>
                            ))
                          })()}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(user.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        {!isCurrentUser && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-500 hover:text-red-700 hover:bg-red-50 gap-1.5"
                            onClick={() => setDeleteUser(user)}
                            title="Revoke access"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            <span className="text-xs">Revoke</span>
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Create User Dialog */}
      <Dialog open={showCreate} onOpenChange={(open) => { if (!isCreating) setShowCreate(open) }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Admin User</DialogTitle>
            <DialogDescription>Create a new admin account with specific permissions.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label htmlFor="create-email">Email *</Label>
              <Input id="create-email" type="email" placeholder="user@legendholding.com" value={createEmail} onChange={e => setCreateEmail(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="create-password">Password *</Label>
              <Input id="create-password" type="text" placeholder="Strong password" value={createPassword} onChange={e => setCreatePassword(e.target.value)} />
            </div>
            <div>
              <Label className="mb-3 block">Role</Label>
              <div className="space-y-2">
                {ROLE_PRESETS.map(preset => (
                  <label
                    key={preset.value}
                    className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      createPreset === preset.value
                        ? "border-[#5E366D] bg-[#5E366D]/5"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <input
                      type="radio"
                      name="create-preset"
                      value={preset.value}
                      checked={createPreset === preset.value}
                      onChange={() => setCreatePreset(preset.value)}
                      className="mt-0.5 accent-[#5E366D]"
                    />
                    <div>
                      <div className="text-sm font-medium">{preset.label}</div>
                      <div className="text-xs text-muted-foreground">{preset.description}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)} disabled={isCreating}>Cancel</Button>
            <Button onClick={handleCreate} disabled={isCreating} className="bg-[#5E366D] hover:bg-[#5E366D]/90">
              {isCreating ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Creating...</> : "Create User"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Revoke Access Confirmation Dialog */}
      <Dialog open={!!deleteUser} onOpenChange={open => { if (!isDeleting && !open) setDeleteUser(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Revoke Access</DialogTitle>
            <DialogDescription>
              Are you sure you want to revoke access for <strong>{deleteUser?.email}</strong>? This will permanently remove them from the system and they will no longer be able to log in. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteUser(null)} disabled={isDeleting}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Revoking...</> : "Revoke Access"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminDashboardLayout>
  )
}
