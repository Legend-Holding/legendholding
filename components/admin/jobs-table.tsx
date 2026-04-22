"use client"

import * as React from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Eye, Trash2, Edit2, ChevronLeft, ChevronRight, UserPlus } from "lucide-react"
import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"

interface Job {
  id: string
  title: string
  department: string
  location: string
  description: string[]
  requirements: string[]
  responsibilities: string[]
  job_type: string
  created_at: string
  status: 'active' | 'inactive'
  company: string
  created_by?: string
  assigned_to?: string
  created_by_user?: {
    email: string
    role: string
  }
  assigned_to_user?: {
    email: string
    role: string
  }
}

interface AdminUser {
  user_id: string
  email: string
  role: string
}

interface JobsTableProps {
  jobs: Job[]
  loading: boolean
  onDelete: (id: string) => Promise<void>
  onUpdate: (id: string, data: Partial<Job>) => Promise<void>
  onAssign?: (jobId: string, adminId: string | null) => Promise<void>
  isSuperAdmin?: boolean
  adminUsers?: AdminUser[]
  currentUserId?: string
}

export function JobsTable({ jobs = [], loading, onDelete, onUpdate, onAssign, isSuperAdmin = false, adminUsers = [], currentUserId }: JobsTableProps) {
  const [currentPage, setCurrentPage] = useState(1)
  const [editingJob, setEditingJob] = useState<Job | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [assigningJob, setAssigningJob] = useState<Job | null>(null)
  const [selectedAdmin, setSelectedAdmin] = useState<string>("")
  const [isAssigning, setIsAssigning] = useState(false)
  const itemsPerPage = 10
  const totalPages = Math.ceil((jobs?.length || 0) / itemsPerPage)
  
  const startIndex = (currentPage - 1) * itemsPerPage
  const paginatedJobs = jobs?.slice(startIndex, startIndex + itemsPerPage) || []

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  const handleEdit = (job: Job) => {
    setEditingJob(job)
  }

  const handleUpdate = async () => {
    if (!editingJob) return
    try {
      // Validate required fields
      if (!editingJob.title?.trim()) {
        toast.error("Job title is required")
        return
      }
      if (!editingJob.department?.trim()) {
        toast.error("Department is required")
        return
      }
      if (!editingJob.location?.trim()) {
        toast.error("Location is required")
        return
      }
      if (!editingJob.company?.trim()) {
        toast.error("Company is required")
        return
      }

      await onUpdate(editingJob.id, editingJob)
      setEditingJob(null)
    } catch (error) {
      // Don't log here since it's already logged in the parent function
      // The parent function will handle the error message
    }
  }

  const handleDelete = async (id: string) => {
    try {
      setIsDeleting(true)
      await onDelete(id)
      setDeleteConfirmId(null)
      toast.success("Job deleted successfully")
    } catch (error) {
      console.error('Error deleting job:', error)
      toast.error("Failed to delete job")
    } finally {
      setIsDeleting(false)
    }
  }

  const handleAssign = async () => {
    if (!assigningJob || !onAssign || !selectedAdmin) return
    try {
      setIsAssigning(true)
      const adminId = selectedAdmin === "unassign" ? null : selectedAdmin
      await onAssign(assigningJob.id, adminId)
      setAssigningJob(null)
      setSelectedAdmin("")
      toast.success(adminId ? "Job assigned successfully" : "Job unassigned successfully")
    } catch (error) {
      console.error('Error assigning job:', error)
      toast.error("Failed to assign job")
    } finally {
      setIsAssigning(false)
    }
  }

  const openAssignDialog = (job: Job) => {
    setAssigningJob(job)
    setSelectedAdmin(job.assigned_to || "")
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="flex flex-col items-center gap-2">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          <p className="text-sm text-muted-foreground">Loading jobs...</p>
        </div>
      </div>
    )
  }

  if (!Array.isArray(jobs) || jobs.length === 0) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-muted-foreground">No jobs posted yet</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[80px]">S.N.</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Company</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created By</TableHead>
              {isSuperAdmin && <TableHead>Assigned To</TableHead>}
              <TableHead className="w-[150px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedJobs.map((job, index) => (
              <TableRow key={`${job?.id || 'job'}-${startIndex + index}`} className="hover:bg-gray-50">
                <TableCell>{startIndex + index + 1}</TableCell>
                <TableCell className="font-medium">{job?.title || 'N/A'}</TableCell>
                <TableCell>{job?.company || 'N/A'}</TableCell>
                <TableCell>{job?.department || 'N/A'}</TableCell>
                <TableCell>{job?.location || 'N/A'}</TableCell>
                <TableCell>{job?.job_type || 'N/A'}</TableCell>
                <TableCell>
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    job?.status === 'active'
                    ? "bg-green-100 text-green-700"
                    : "bg-yellow-100 text-yellow-700"
                  }`}>
                    {job?.status === 'active' ? "Active" : "Inactive"}
                  </span>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">
                      {job?.created_by_user?.email || 'Unknown User'}
                    </span>
                    <span className={`text-xs px-2 py-1 rounded-full inline-block w-fit ${
                      job?.created_by_user?.role === 'super_admin'
                        ? 'bg-purple-100 text-purple-700'
                        : 'bg-blue-100 text-blue-700'
                    }`}>
                      {job?.created_by_user?.role === 'super_admin' ? 'Super Admin' : 'Admin'}
                    </span>
                  </div>
                </TableCell>
                {isSuperAdmin && (
                  <TableCell>
                    {job?.assigned_to_user ? (
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">
                          {job.assigned_to_user.email}
                        </span>
                        <span className="text-xs px-2 py-1 rounded-full inline-block w-fit bg-green-100 text-green-700">
                          Assigned
                        </span>
                      </div>
                    ) : (
                      <span className="text-sm text-gray-400">Not assigned</span>
                    )}
                  </TableCell>
                )}
                <TableCell>
                  <div className="flex space-x-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => job && handleEdit(job)}
                      title="Edit"
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    {isSuperAdmin && onAssign && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => job && openAssignDialog(job)}
                        title="Assign to Admin"
                        className="text-blue-500 hover:text-blue-700"
                      >
                        <UserPlus className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => job?.id && setDeleteConfirmId(job.id)}
                      className="text-red-500 hover:text-red-700"
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between px-2">
          <p className="text-sm text-gray-500">
            Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, jobs.length)} of {jobs.length} entries
          </p>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <Button
                key={page}
                variant={currentPage === page ? "default" : "outline"}
                size="sm"
                onClick={() => handlePageChange(page)}
              >
                {page}
              </Button>
            ))}
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Edit Job Dialog */}
      <Dialog open={!!editingJob} onOpenChange={(open) => !open && setEditingJob(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Job</DialogTitle>
            <DialogDescription>
              Make changes to the job posting.
            </DialogDescription>
          </DialogHeader>
          {editingJob && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-title">Job Title</Label>
                  <Input
                    id="edit-title"
                    value={editingJob.title}
                    onChange={(e) =>
                      setEditingJob((prev) =>
                        prev ? { ...prev, title: e.target.value } : null
                      )
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="edit-department">Department</Label>
                  <Input
                    id="edit-department"
                    value={editingJob.department}
                    onChange={(e) =>
                      setEditingJob((prev) =>
                        prev ? { ...prev, department: e.target.value } : null
                      )
                    }
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="edit-location">Location</Label>
                <Input
                  id="edit-location"
                  value={editingJob.location}
                  onChange={(e) =>
                    setEditingJob((prev) =>
                      prev ? { ...prev, location: e.target.value } : null
                    )
                  }
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-company">Company</Label>
                  <Input
                    id="edit-company"
                    value={editingJob.company}
                    onChange={(e) =>
                      setEditingJob((prev) =>
                        prev ? { ...prev, company: e.target.value } : null
                      )
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="edit-job-type">Job Type</Label>
                  <select
                    id="edit-job-type"
                    value={editingJob.job_type}
                    onChange={(e) =>
                      setEditingJob((prev) =>
                        prev ? { ...prev, job_type: e.target.value } : null
                      )
                    }
                    className="w-full px-3 py-2 border rounded-md"
                  >
                    <option value="Full-time">Full-time</option>
                    <option value="Part-time">Part-time</option>
                    <option value="Contract">Contract</option>
                    <option value="Temporary">Temporary</option>
                    <option value="Internship">Internship</option>
                  </select>
                </div>
              </div>
              <div>
                <Label htmlFor="edit-description">Job Description (each line will become a paragraph)</Label>
                <Textarea
                  id="edit-description"
                  value={Array.isArray(editingJob.description) ? editingJob.description.join('\n') : ''}
                  onChange={(e) =>
                    setEditingJob((prev) =>
                      prev
                        ? {
                            ...prev,
                            description: e.target.value.split('\n').map(desc => desc.trim()).filter(desc => desc !== ''),
                          }
                        : null
                    )
                  }
                  className="h-32"
                  placeholder="Enter each description paragraph on a new line"
                />
              </div>
              <div>
                <Label htmlFor="edit-responsibilities">Responsibilities (one per line)</Label>
                <Textarea
                  id="edit-responsibilities"
                  value={Array.isArray(editingJob.responsibilities) ? editingJob.responsibilities.join('\n') : ''}
                  onChange={(e) =>
                    setEditingJob((prev) =>
                      prev ? { 
                        ...prev, 
                        responsibilities: e.target.value.split('\n').map(resp => resp.trim()).filter(resp => resp !== '')
                      } : null
                    )
                  }
                  className="h-32"
                  placeholder="Enter each responsibility on a new line"
                />
              </div>
              <div>
                <Label htmlFor="edit-requirements">Preferred Skills (one per line)</Label>
                <Textarea
                  id="edit-requirements"
                  value={Array.isArray(editingJob.requirements) ? editingJob.requirements.join('\n') : ''}
                  onChange={(e) =>
                    setEditingJob((prev) =>
                      prev ? { 
                        ...prev, 
                        requirements: e.target.value.split('\n').map(req => req.trim()).filter(req => req !== '')
                      } : null
                    )
                  }
                  className="h-32"
                  placeholder="Enter each requirement on a new line"
                />
              </div>
              <div>
                <Label htmlFor="edit-status">Status</Label>
                <select
                  id="edit-status"
                  value={editingJob.status}
                  onChange={(e) =>
                    setEditingJob((prev) =>
                      prev
                        ? { ...prev, status: e.target.value as 'active' | 'inactive' }
                        : null
                    )
                  }
                  className="w-full px-3 py-2 border rounded-md"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingJob(null)}>
              Cancel
            </Button>
            <Button onClick={handleUpdate} className="bg-secondary hover:bg-secondary/90">
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteConfirmId} onOpenChange={(open) => !open && setDeleteConfirmId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Delete</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this job posting? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Job Dialog */}
      <Dialog open={!!assigningJob} onOpenChange={(open) => !open && setAssigningJob(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Job to Admin</DialogTitle>
            <DialogDescription>
              Select an admin user to assign this job to. The assigned admin will be able to manage this job and view its applications.
            </DialogDescription>
          </DialogHeader>
          {assigningJob && (
            <div className="py-4">
              <div className="mb-4 p-3 bg-gray-50 rounded-md">
                <p className="text-sm font-medium text-gray-700">Job: {assigningJob.title}</p>
                <p className="text-xs text-gray-500">Company: {assigningJob.company}</p>
              </div>
              <Label htmlFor="admin-select" className="mb-2 block">Select Admin</Label>
              <select
                id="admin-select"
                value={selectedAdmin}
                onChange={(e) => setSelectedAdmin(e.target.value)}
                className="w-full px-3 py-2 border rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                <option value="">-- Select an admin to assign --</option>
                {assigningJob.assigned_to && (
                  <option value="unassign">-- Unassign (remove assignment) --</option>
                )}
                {currentUserId && currentUserId !== assigningJob.created_by && adminUsers.some(a => a.user_id === currentUserId) && (
                  <option value={currentUserId}>
                    Assign to Myself ({adminUsers.find(a => a.user_id === currentUserId)?.email})
                  </option>
                )}
                {adminUsers
                  .filter(admin =>
                    admin.email.toLowerCase() !== 'admin@legendx.com' &&
                    admin.user_id !== currentUserId &&
                    admin.user_id !== assigningJob.created_by
                  )
                  .map((admin) => (
                    <option key={admin.user_id} value={admin.user_id}>
                      {admin.email}
                    </option>
                  ))}
              </select>
              {assigningJob.assigned_to_user && (
                <p className="mt-2 text-xs text-gray-500">
                  Currently assigned to: {assigningJob.assigned_to_user.email}
                </p>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssigningJob(null)}>
              Cancel
            </Button>
            <Button
              onClick={handleAssign}
              disabled={isAssigning || !selectedAdmin}
              className="bg-secondary hover:bg-secondary/90"
            >
              {isAssigning ? "Assigning..." : "Assign Job"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
} 