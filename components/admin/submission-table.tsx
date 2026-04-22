import * as React from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Eye, Trash2, Edit2, ChevronLeft, ChevronRight } from "lucide-react"
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

interface SubmissionsTableProps {
  submissions: ContactSubmission[]
  loading: boolean
  onDelete: (id: string) => Promise<void>
  onUpdate: (id: string, data: Partial<ContactSubmission>) => Promise<void>
}

// Error boundary component
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 text-red-500">
          Something went wrong. Please try refreshing the page.
        </div>
      )
    }

    return this.props.children
  }
}

export function SubmissionsTable({ submissions = [], loading, onDelete, onUpdate }: SubmissionsTableProps) {
  const [currentPage, setCurrentPage] = useState(1)
  const [editingSubmission, setEditingSubmission] = useState<ContactSubmission | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const itemsPerPage = 10
  const totalPages = Math.ceil((submissions?.length || 0) / itemsPerPage)
  
  const startIndex = (currentPage - 1) * itemsPerPage
  const paginatedSubmissions = submissions?.slice(startIndex, startIndex + itemsPerPage) || []

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  const handleEdit = (submission: ContactSubmission) => {
    setEditingSubmission(submission)
  }

  const handleUpdate = async () => {
    if (!editingSubmission) return
    try {
      await onUpdate(editingSubmission.id, editingSubmission)
      setEditingSubmission(null)
      toast.success("Submission updated successfully")
    } catch (error) {
      console.error('[SubmissionsTable] Error updating submission:', error)
      toast.error("Failed to update submission")
    }
  }

  const handleDelete = async (id: string) => {
    try {
      console.log("[SubmissionsTable] Starting delete operation for ID:", id)
      setIsDeleting(true)
      await onDelete(id)
      console.log("[SubmissionsTable] Delete operation completed successfully")
      setDeleteConfirmId(null)
    } catch (error) {
      console.error('[SubmissionsTable] Error deleting submission:', error)
      toast.error("Failed to delete submission")
    } finally {
      setIsDeleting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="flex flex-col items-center gap-2">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          <p className="text-sm text-muted-foreground">Loading submissions...</p>
        </div>
      </div>
    )
  }

  if (!Array.isArray(submissions) || submissions.length === 0) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-muted-foreground">No submissions yet</p>
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
              <TableHead>Date</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Subject</TableHead>
              <TableHead>Message</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[120px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedSubmissions.map((submission, index) => (
              <TableRow key={`${submission?.id || 'submission'}-${startIndex + index}`}>
                <TableCell>{startIndex + index + 1}</TableCell>
                <TableCell className="font-medium">
                  {submission?.created_at ? new Date(submission.created_at).toLocaleDateString() : 'N/A'}
                </TableCell>
                <TableCell>{submission?.name || 'N/A'}</TableCell>
                <TableCell>{submission?.email || 'N/A'}</TableCell>
                <TableCell>{submission?.phone || '-'}</TableCell>
                <TableCell className="max-w-[200px] truncate">{submission?.subject || 'N/A'}</TableCell>
                <TableCell className="max-w-[300px] truncate">{submission?.message || 'N/A'}</TableCell>
                <TableCell>
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    submission?.resolved 
                    ? "bg-green-100 text-green-700" 
                    : "bg-yellow-100 text-yellow-700"
                  }`}>
                    {submission?.resolved ? "Resolved" : "Pending"}
                  </span>
                </TableCell>
                <TableCell>
                  <div className="flex space-x-2">
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => submission && handleEdit(submission)}
                      title="Edit"
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => submission?.id && setDeleteConfirmId(submission.id)}
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
        <div className="flex items-center justify-between px-2 mt-4">
          <p className="text-sm text-gray-500">
            Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, submissions.length)} of {submissions.length} entries
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

      {editingSubmission && (
        <Dialog open={!!editingSubmission} onOpenChange={() => setEditingSubmission(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Submission</DialogTitle>
              <DialogDescription>
                Make changes to the contact submission here.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={editingSubmission.name || ''}
                  onChange={(e) => setEditingSubmission({
                    ...editingSubmission,
                    name: e.target.value
                  })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={editingSubmission.email || ''}
                  onChange={(e) => setEditingSubmission({
                    ...editingSubmission,
                    email: e.target.value
                  })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={editingSubmission.phone || ''}
                  onChange={(e) => setEditingSubmission({
                    ...editingSubmission,
                    phone: e.target.value
                  })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="subject">Subject</Label>
                <Input
                  id="subject"
                  value={editingSubmission.subject || ''}
                  onChange={(e) => setEditingSubmission({
                    ...editingSubmission,
                    subject: e.target.value
                  })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="message">Message</Label>
                <Textarea
                  id="message"
                  value={editingSubmission.message || ''}
                  onChange={(e) => setEditingSubmission({
                    ...editingSubmission,
                    message: e.target.value
                  })}
                />
              </div>
              <div className="flex items-center space-x-2">
                <Label htmlFor="status">Status</Label>
                <input
                  type="checkbox"
                  id="status"
                  checked={editingSubmission.resolved || false}
                  onChange={(e) => setEditingSubmission({
                    ...editingSubmission,
                    resolved: e.target.checked
                  })}
                  className="ml-2"
                />
                <span className="text-sm text-gray-500">Mark as resolved</span>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingSubmission(null)}>
                Cancel
              </Button>
              <Button onClick={handleUpdate}>Save changes</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {deleteConfirmId && (
        <Dialog 
          open={!!deleteConfirmId} 
          onOpenChange={(open) => {
            console.log("[SubmissionsTable] Delete dialog state change:", { open, deleteConfirmId })
            if (!open) setDeleteConfirmId(null)
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirm Deletion</DialogTitle>
              <DialogDescription asChild>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Are you sure you want to delete this submission? This action cannot be undone.
                  </p>
                  <p className="text-sm text-gray-500">
                    ID: {deleteConfirmId}
                  </p>
                </div>
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => {
                  console.log("[SubmissionsTable] Delete operation cancelled")
                  setDeleteConfirmId(null)
                }}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  console.log("[SubmissionsTable] Delete button clicked for ID:", deleteConfirmId)
                  handleDelete(deleteConfirmId)
                }}
                disabled={isDeleting || loading}
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
