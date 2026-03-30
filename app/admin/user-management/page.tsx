"use client"

import { useState, useEffect, useCallback } from "react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { useRouter } from "next/navigation"
import { AdminDashboardLayout } from "@/components/admin/dashboard-layout"
import { useAdminPermissions, type UserRole } from "@/hooks/use-admin-permissions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { Plus, Trash2, Edit2, Loader2, Shield, ShieldCheck, UserCog } from "lucide-react"
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

const DEFAULT_ADMIN_PERMISSIONS: Record<string, boolean> = {
  dashboard: true, jobs: true, applications: true,
  submissions: false, news: false, newsletters: false,
  settings: false, customer_care: false, management_profiles: false, team_members: false,
}

function getRoleLabel(user: AdminUserRow): string {
  if (user.role === "super_admin") {
    if (user.permissions?.submissions !== true && user.permissions?.news !== true) return "HR Admin"
    return "Super Admin"
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
  const [createRole, setCreateRole] = useState<"admin" | "super_admin">("admin")
  const [createPermissions, setCreatePermissions] = useState<Record<string, boolean>>({ ...DEFAULT_ADMIN_PERMISSIONS })
  const [isCreating, setIsCreating] = useState(false)

  // Edit dialog
  const [editUser, setEditUser] = useState<AdminUserRow | null>(null)
  const [editRole, setEditRole] = useState<"admin" | "super_admin">("admin")
  const [editPermissions, setEditPermissions] = useState<Record<string, boolean>>({})
  const [isSaving, setIsSaving] = useState(false)

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
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: createEmail.trim(),
          password: createPassword.trim(),
          role: createRole,
          permissions: createPermissions,
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
    setCreateRole("admin")
    setCreatePermissions({ ...DEFAULT_ADMIN_PERMISSIONS })
  }

  const openEdit = (user: AdminUserRow) => {
    setEditUser(user)
    setEditRole(user.role)
    setEditPermissions({ ...DEFAULT_ADMIN_PERMISSIONS, ...user.permissions })
  }

  const handleSave = async () => {
    if (!editUser) return
    setIsSaving(true)
    try {
      const res = await fetch(`/api/admin/users/${editUser.user_id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: editRole, permissions: editPermissions }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to update user")
      toast.success(`Updated ${editUser.email}`)
      setEditUser(null)
      fetchUsers()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setIsSaving(false)
    }
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
                  <TableHead className="w-[120px]">Actions</TableHead>
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
                              : "bg-blue-100 text-blue-700"
                        }`}>
                          {label === "Super Admin" ? <ShieldCheck className="h-3 w-3" /> : label === "HR Admin" ? <UserCog className="h-3 w-3" /> : <Shield className="h-3 w-3" />}
                          {label}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {PERMISSION_LABELS.filter(p => user.permissions?.[p.key] === true).map(p => (
                            <span key={p.key} className="text-[10px] px-1.5 py-0.5 rounded bg-green-50 text-green-700 border border-green-200">
                              {p.label}
                            </span>
                          ))}
                          {user.role === "super_admin" && !PERMISSION_LABELS.some(p => user.permissions?.[p.key] === false) && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200">
                              All Access
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(user.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openEdit(user)} title="Edit permissions">
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          {!isCurrentUser && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-red-500 hover:text-red-700"
                              onClick={() => setDeleteUser(user)}
                              title="Delete user"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
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
              <Label htmlFor="create-role">Role</Label>
              <select
                id="create-role"
                value={createRole}
                onChange={e => setCreateRole(e.target.value as "admin" | "super_admin")}
                className="w-full px-3 py-2 border rounded-md bg-white text-sm"
              >
                <option value="admin">Admin</option>
                <option value="super_admin">Super Admin</option>
              </select>
            </div>
            <div>
              <Label className="mb-2 block">Permissions</Label>
              <div className="grid grid-cols-2 gap-3">
                {PERMISSION_LABELS.map(p => (
                  <label key={p.key} className="flex items-center gap-2 text-sm cursor-pointer">
                    <Switch
                      checked={createPermissions[p.key] ?? false}
                      onCheckedChange={v => setCreatePermissions(prev => ({ ...prev, [p.key]: v }))}
                    />
                    <span>{p.label}</span>
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

      {/* Edit Permissions Dialog */}
      <Dialog open={!!editUser} onOpenChange={open => { if (!isSaving) { if (!open) setEditUser(null) } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>Update role and permissions for <strong>{editUser?.email}</strong></DialogDescription>
          </DialogHeader>
          {editUser && (
            <div className="space-y-4 py-2">
              <div>
                <Label htmlFor="edit-role">Role</Label>
                <select
                  id="edit-role"
                  value={editRole}
                  onChange={e => setEditRole(e.target.value as "admin" | "super_admin")}
                  className="w-full px-3 py-2 border rounded-md bg-white text-sm"
                >
                  <option value="admin">Admin</option>
                  <option value="super_admin">Super Admin</option>
                </select>
              </div>
              <div>
                <Label className="mb-2 block">Permissions</Label>
                <div className="grid grid-cols-2 gap-3">
                  {PERMISSION_LABELS.map(p => (
                    <label key={p.key} className="flex items-center gap-2 text-sm cursor-pointer">
                      <Switch
                        checked={editPermissions[p.key] ?? false}
                        onCheckedChange={v => setEditPermissions(prev => ({ ...prev, [p.key]: v }))}
                      />
                      <span>{p.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditUser(null)} disabled={isSaving}>Cancel</Button>
            <Button onClick={handleSave} disabled={isSaving} className="bg-[#5E366D] hover:bg-[#5E366D]/90">
              {isSaving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</> : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteUser} onOpenChange={open => { if (!isDeleting && !open) setDeleteUser(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete User</DialogTitle>
            <DialogDescription>
              Are you sure you want to permanently delete <strong>{deleteUser?.email}</strong>? This will remove them from authentication and they will no longer be able to log in. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteUser(null)} disabled={isDeleting}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Deleting...</> : "Delete User"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminDashboardLayout>
  )
}
