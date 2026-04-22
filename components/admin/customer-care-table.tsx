import * as React from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Eye, Trash2, ChevronLeft, ChevronRight, Bell, AlertTriangle, Building2 } from "lucide-react"
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

interface CustomerCareComplaint {
  id: string
  created_at: string
  name: string
  email: string
  phone: string
  company: string
  subject: string
  message: string
  resolved?: boolean
  status?: string
  admin_comment?: string | null
  company_comment?: string | null
  company_reply?: string | null
  last_reminder_sent_at?: string | null
  last_escalation_sent_at?: string | null
  holding_escalation_sent_at?: string | null
}

interface CustomerCareTableProps {
  complaints: CustomerCareComplaint[]
  loading: boolean
  onDelete: (id: string) => Promise<void>
  onUpdate: (id: string, data: Partial<CustomerCareComplaint>) => Promise<void>
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

export function CustomerCareTable({ complaints = [], loading, onDelete, onUpdate }: CustomerCareTableProps) {
  const [currentPage, setCurrentPage] = useState(1)
  const [editingComplaint, setEditingComplaint] = useState<CustomerCareComplaint | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const itemsPerPage = 10
  const totalPages = Math.ceil((complaints?.length || 0) / itemsPerPage)
  
  const startIndex = (currentPage - 1) * itemsPerPage
  const paginatedComplaints = complaints?.slice(startIndex, startIndex + itemsPerPage) || []

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  const handleView = async (complaint: CustomerCareComplaint) => {
    setEditingComplaint(complaint)
    // Note: Status should only change to 'reviewed' when COMPANY views it, not when super admin views it
    // The status flow will correctly display the current status
    // Emails are now sent automatically when customer submits complaint
  }

  const handleDelete = async (id: string) => {
    try {
      console.log("[CustomerCareTable] Starting delete operation for ID:", id)
      setIsDeleting(true)
      await onDelete(id)
      console.log("[CustomerCareTable] Delete operation completed successfully")
      setDeleteConfirmId(null)
    } catch (error) {
      console.error('[CustomerCareTable] Error deleting complaint:', error)
      toast.error("Failed to delete complaint")
    } finally {
      setIsDeleting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="flex flex-col items-center gap-2">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          <p className="text-sm text-muted-foreground">Loading complaints...</p>
        </div>
      </div>
    )
  }

  if (!Array.isArray(complaints) || complaints.length === 0) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-muted-foreground">No complaints yet</p>
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
              <TableHead>Company</TableHead>
              <TableHead>Subject</TableHead>
              <TableHead>Message</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[120px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedComplaints.map((complaint, index) => (
              <TableRow key={`${complaint?.id || 'complaint'}-${startIndex + index}`}>
                <TableCell>{startIndex + index + 1}</TableCell>
                <TableCell className="font-medium">
                  {complaint?.created_at ? new Date(complaint.created_at).toLocaleDateString() : 'N/A'}
                </TableCell>
                <TableCell>{complaint?.name || 'N/A'}</TableCell>
                <TableCell>{complaint?.email || 'N/A'}</TableCell>
                <TableCell>{complaint?.phone || '-'}</TableCell>
                <TableCell>{complaint?.company || '-'}</TableCell>
                <TableCell className="max-w-[200px] truncate">{complaint?.subject || 'N/A'}</TableCell>
                <TableCell className="max-w-[300px] truncate">{complaint?.message || 'N/A'}</TableCell>
                <TableCell>
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    complaint?.resolved 
                      ? "bg-green-100 text-green-700"
                      : complaint?.status === 'replied'
                      ? "bg-orange-100 text-orange-700"
                      : complaint?.status === 'reviewed'
                      ? "bg-blue-100 text-blue-700"
                      : complaint?.status === 'sent'
                      ? "bg-purple-100 text-purple-700"
                      : "bg-yellow-100 text-yellow-700"
                  }`}>
                    {complaint?.resolved ? "Resolved" : complaint?.status === 'replied' ? "Replied" : complaint?.status === 'reviewed' ? "Reviewed" : complaint?.status === 'sent' ? "Sent" : "Pending"}
                  </span>
                </TableCell>
                <TableCell>
                  <div className="flex space-x-2">
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => complaint && handleView(complaint)}
                      title="View"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => complaint?.id && setDeleteConfirmId(complaint.id)}
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
            Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, complaints.length)} of {complaints.length} entries
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

      {editingComplaint && (
        <Dialog open={!!editingComplaint} onOpenChange={() => {
          setEditingComplaint(null)
        }}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>View Complaint</DialogTitle>
              <DialogDescription>
                View customer care complaint details.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="status-display">Status Flow</Label>
                {/* Horizontal Status Timeline */}
                <div className="relative">
                  <div className="flex items-center justify-between">
                    {/* Step 1: Pending */}
                    <div className="flex flex-col items-center flex-1 relative">
                      <div className={`flex items-center justify-center w-10 h-10 rounded-full text-sm font-medium z-10 ${
                        (!editingComplaint.status || editingComplaint.status === 'pending')
                          ? 'bg-yellow-100 text-yellow-700 border-2 border-yellow-500'
                          : 'bg-green-100 text-green-700 border-2 border-green-500'
                      }`}>
                        1
                      </div>
                      <div className="mt-2 text-center">
                        <p className={`text-xs font-medium ${
                          (!editingComplaint.status || editingComplaint.status === 'pending')
                            ? 'text-gray-900'
                            : 'text-gray-900'
                        }`}>
                          Pending
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">Submitted</p>
                      </div>
                    </div>

                    {/* Connector Line 1 */}
                    <div className={`flex-1 h-0.5 mx-2 ${
                      editingComplaint.status === 'sent' || editingComplaint.status === 'reviewed' || editingComplaint.status === 'replied' || editingComplaint.resolved
                        ? 'bg-green-300'
                        : 'bg-gray-200'
                    }`}></div>

                    {/* Step 2: Sent to Company */}
                    <div className="flex flex-col items-center flex-1 relative">
                      <div className={`flex items-center justify-center w-10 h-10 rounded-full text-sm font-medium z-10 ${
                        editingComplaint.status === 'sent'
                          ? 'bg-purple-100 text-purple-700 border-2 border-purple-500'
                          : (editingComplaint.status === 'reviewed' || editingComplaint.status === 'replied' || editingComplaint.resolved)
                          ? 'bg-green-100 text-green-700 border-2 border-green-500'
                          : 'bg-gray-100 text-gray-400'
                      }`}>
                        2
                      </div>
                      <div className="mt-2 text-center">
                        <p className={`text-xs font-medium ${
                          editingComplaint.status === 'sent'
                            ? 'text-gray-900'
                            : (editingComplaint.status === 'reviewed' || editingComplaint.status === 'replied' || editingComplaint.resolved)
                            ? 'text-gray-900'
                            : 'text-gray-500'
                        }`}>
                          Sent
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">Email sent</p>
                      </div>
                    </div>

                    {/* Connector Line 2 */}
                    <div className={`flex-1 h-0.5 mx-2 ${
                      editingComplaint.status === 'reviewed' || editingComplaint.status === 'replied' || editingComplaint.resolved
                        ? 'bg-green-300'
                        : 'bg-gray-200'
                    }`}></div>

                    {/* Step 3: Reviewed by Company */}
                    <div className="flex flex-col items-center flex-1 relative">
                      <div className={`flex items-center justify-center w-10 h-10 rounded-full text-sm font-medium z-10 ${
                        editingComplaint.status === 'reviewed' && !editingComplaint.resolved && editingComplaint.status !== 'replied'
                          ? 'bg-blue-100 text-blue-700 border-2 border-blue-500'
                          : (editingComplaint.status === 'replied' || editingComplaint.resolved)
                          ? 'bg-green-100 text-green-700 border-2 border-green-500'
                          : (editingComplaint.status === 'sent')
                          ? 'bg-gray-100 text-gray-400'
                          : 'bg-gray-100 text-gray-400'
                      }`}>
                        3
                      </div>
                      <div className="mt-2 text-center">
                        <p className={`text-xs font-medium ${
                          editingComplaint.status === 'reviewed' && !editingComplaint.resolved && editingComplaint.status !== 'replied'
                            ? 'text-gray-900'
                            : (editingComplaint.status === 'replied' || editingComplaint.resolved)
                            ? 'text-gray-900'
                            : 'text-gray-500'
                        }`}>
                          Reviewed
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">Company viewed</p>
                      </div>
                    </div>

                    {/* Connector Line 3 */}
                    <div className={`flex-1 h-0.5 mx-2 ${
                      editingComplaint.status === 'replied' || editingComplaint.resolved
                        ? 'bg-green-300'
                        : 'bg-gray-200'
                    }`}></div>

                    {/* Step 4: Replied */}
                    <div className="flex flex-col items-center flex-1 relative">
                      <div className={`flex items-center justify-center w-10 h-10 rounded-full text-sm font-medium z-10 ${
                        editingComplaint.status === 'replied' && !editingComplaint.resolved
                          ? 'bg-orange-100 text-orange-700 border-2 border-orange-500'
                          : editingComplaint.resolved
                          ? 'bg-green-100 text-green-700 border-2 border-green-500'
                          : 'bg-gray-100 text-gray-400'
                      }`}>
                        4
                      </div>
                      <div className="mt-2 text-center">
                        <p className={`text-xs font-medium ${
                          editingComplaint.status === 'replied' && !editingComplaint.resolved
                            ? 'text-gray-900'
                            : editingComplaint.resolved
                            ? 'text-gray-900'
                            : 'text-gray-500'
                        }`}>
                          Replied
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">Reply sent</p>
                      </div>
                    </div>

                    {/* Connector Line 4 */}
                    <div className={`flex-1 h-0.5 mx-2 ${
                      editingComplaint.resolved
                        ? 'bg-green-300'
                        : 'bg-gray-200'
                    }`}></div>

                    {/* Step 5: Resolved */}
                    <div className="flex flex-col items-center flex-1 relative">
                      <div className={`flex items-center justify-center w-10 h-10 rounded-full text-sm font-medium z-10 ${
                        editingComplaint.resolved
                          ? 'bg-green-100 text-green-700 border-2 border-green-500'
                          : 'bg-gray-100 text-gray-400'
                      }`}>
                        5
                      </div>
                      <div className="mt-2 text-center">
                        <p className={`text-xs font-medium ${
                          editingComplaint.resolved
                            ? 'text-gray-900'
                            : 'text-gray-500'
                        }`}>
                          Resolved
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">Completed</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Escalation Tracker */}
              {(!editingComplaint.resolved) && (editingComplaint.last_reminder_sent_at || editingComplaint.last_escalation_sent_at || editingComplaint.holding_escalation_sent_at) ? (
                <div className="grid gap-2">
                  <Label>Escalation Tracker</Label>
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex items-center gap-4">
                      {/* Step: 48h Reminder */}
                      <div className="flex flex-col items-center flex-1">
                        <div className={`flex items-center justify-center w-10 h-10 rounded-full z-10 ${
                          editingComplaint.last_reminder_sent_at
                            ? 'bg-amber-100 border-2 border-amber-500'
                            : 'bg-gray-100 border border-gray-300'
                        }`}>
                          <Bell className={`w-5 h-5 ${editingComplaint.last_reminder_sent_at ? 'text-amber-600' : 'text-gray-400'}`} />
                        </div>
                        <p className={`text-xs font-medium mt-2 text-center ${editingComplaint.last_reminder_sent_at ? 'text-amber-700' : 'text-gray-400'}`}>
                          48h Reminder
                        </p>
                        {editingComplaint.last_reminder_sent_at && (
                          <p className="text-[10px] text-amber-600 mt-0.5 text-center">
                            {new Date(editingComplaint.last_reminder_sent_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </p>
                        )}
                      </div>

                      {/* Connector */}
                      <div className={`flex-1 h-0.5 ${editingComplaint.last_escalation_sent_at ? 'bg-orange-300' : 'bg-gray-200'}`}></div>

                      {/* Step: Business Head */}
                      <div className="flex flex-col items-center flex-1">
                        <div className={`flex items-center justify-center w-10 h-10 rounded-full z-10 ${
                          editingComplaint.last_escalation_sent_at
                            ? 'bg-orange-100 border-2 border-orange-500'
                            : 'bg-gray-100 border border-gray-300'
                        }`}>
                          <AlertTriangle className={`w-5 h-5 ${editingComplaint.last_escalation_sent_at ? 'text-orange-600' : 'text-gray-400'}`} />
                        </div>
                        <p className={`text-xs font-medium mt-2 text-center ${editingComplaint.last_escalation_sent_at ? 'text-orange-700' : 'text-gray-400'}`}>
                          Business Head
                        </p>
                        {editingComplaint.last_escalation_sent_at && (
                          <p className="text-[10px] text-orange-600 mt-0.5 text-center">
                            {new Date(editingComplaint.last_escalation_sent_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </p>
                        )}
                      </div>

                      {/* Connector */}
                      <div className={`flex-1 h-0.5 ${editingComplaint.holding_escalation_sent_at ? 'bg-red-300' : 'bg-gray-200'}`}></div>

                      {/* Step: Holding Escalation */}
                      <div className="flex flex-col items-center flex-1">
                        <div className={`flex items-center justify-center w-10 h-10 rounded-full z-10 ${
                          editingComplaint.holding_escalation_sent_at
                            ? 'bg-red-100 border-2 border-red-500'
                            : 'bg-gray-100 border border-gray-300'
                        }`}>
                          <Building2 className={`w-5 h-5 ${editingComplaint.holding_escalation_sent_at ? 'text-red-600' : 'text-gray-400'}`} />
                        </div>
                        <p className={`text-xs font-medium mt-2 text-center ${editingComplaint.holding_escalation_sent_at ? 'text-red-700' : 'text-gray-400'}`}>
                          Holding Escalation
                        </p>
                        {editingComplaint.holding_escalation_sent_at && (
                          <p className="text-[10px] text-red-600 mt-0.5 text-center">
                            {new Date(editingComplaint.holding_escalation_sent_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ) : editingComplaint.resolved && (editingComplaint.last_reminder_sent_at || editingComplaint.last_escalation_sent_at || editingComplaint.holding_escalation_sent_at) ? (
                <div className="grid gap-2">
                  <Label>Escalation History</Label>
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center gap-4">
                      {/* Step: 48h Reminder */}
                      <div className="flex flex-col items-center flex-1">
                        <div className={`flex items-center justify-center w-10 h-10 rounded-full z-10 ${
                          editingComplaint.last_reminder_sent_at
                            ? 'bg-amber-50 border border-amber-300'
                            : 'bg-gray-100 border border-gray-300'
                        }`}>
                          <Bell className={`w-5 h-5 ${editingComplaint.last_reminder_sent_at ? 'text-amber-500' : 'text-gray-400'}`} />
                        </div>
                        <p className={`text-xs font-medium mt-2 text-center ${editingComplaint.last_reminder_sent_at ? 'text-amber-600' : 'text-gray-400'}`}>
                          48h Reminder
                        </p>
                        {editingComplaint.last_reminder_sent_at && (
                          <p className="text-[10px] text-gray-500 mt-0.5 text-center">
                            {new Date(editingComplaint.last_reminder_sent_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </p>
                        )}
                      </div>

                      <div className={`flex-1 h-0.5 ${editingComplaint.last_escalation_sent_at ? 'bg-gray-300' : 'bg-gray-200'}`}></div>

                      {/* Step: Business Head */}
                      <div className="flex flex-col items-center flex-1">
                        <div className={`flex items-center justify-center w-10 h-10 rounded-full z-10 ${
                          editingComplaint.last_escalation_sent_at
                            ? 'bg-orange-50 border border-orange-300'
                            : 'bg-gray-100 border border-gray-300'
                        }`}>
                          <AlertTriangle className={`w-5 h-5 ${editingComplaint.last_escalation_sent_at ? 'text-orange-500' : 'text-gray-400'}`} />
                        </div>
                        <p className={`text-xs font-medium mt-2 text-center ${editingComplaint.last_escalation_sent_at ? 'text-orange-600' : 'text-gray-400'}`}>
                          Business Head
                        </p>
                        {editingComplaint.last_escalation_sent_at && (
                          <p className="text-[10px] text-gray-500 mt-0.5 text-center">
                            {new Date(editingComplaint.last_escalation_sent_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </p>
                        )}
                      </div>

                      <div className={`flex-1 h-0.5 ${editingComplaint.holding_escalation_sent_at ? 'bg-gray-300' : 'bg-gray-200'}`}></div>

                      {/* Step: Holding Escalation */}
                      <div className="flex flex-col items-center flex-1">
                        <div className={`flex items-center justify-center w-10 h-10 rounded-full z-10 ${
                          editingComplaint.holding_escalation_sent_at
                            ? 'bg-red-50 border border-red-300'
                            : 'bg-gray-100 border border-gray-300'
                        }`}>
                          <Building2 className={`w-5 h-5 ${editingComplaint.holding_escalation_sent_at ? 'text-red-500' : 'text-gray-400'}`} />
                        </div>
                        <p className={`text-xs font-medium mt-2 text-center ${editingComplaint.holding_escalation_sent_at ? 'text-red-600' : 'text-gray-400'}`}>
                          Holding Escalation
                        </p>
                        {editingComplaint.holding_escalation_sent_at && (
                          <p className="text-[10px] text-gray-500 mt-0.5 text-center">
                            {new Date(editingComplaint.holding_escalation_sent_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}

              <div className="grid gap-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={editingComplaint.name || ''}
                  readOnly
                  className="bg-gray-50 cursor-not-allowed"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={editingComplaint.email || ''}
                  readOnly
                  className="bg-gray-50 cursor-not-allowed"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={editingComplaint.phone || ''}
                  readOnly
                  className="bg-gray-50 cursor-not-allowed"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="company">Company</Label>
                <Input
                  id="company"
                  value={editingComplaint.company || ''}
                  readOnly
                  className="bg-gray-50 cursor-not-allowed"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="subject">Subject</Label>
                <Input
                  id="subject"
                  value={editingComplaint.subject || ''}
                  readOnly
                  className="bg-gray-50 cursor-not-allowed"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="message">Message</Label>
                <Textarea
                  id="message"
                  value={editingComplaint.message || ''}
                  readOnly
                  className="bg-gray-50 cursor-not-allowed resize-none"
                  rows={6}
                />
              </div>
              {/* Admin Comment - Show if exists */}
              {editingComplaint.admin_comment && (
                <div className="grid gap-2">
                  <Label htmlFor="admin-comment">Admin Comment</Label>
                  <div className="bg-orange-50 border-l-4 border-orange-400 rounded-lg p-4">
                    <p className="text-sm text-orange-700 leading-relaxed whitespace-pre-wrap">{editingComplaint.admin_comment}</p>
                  </div>
                </div>
              )}
              {/* Company Reply - Show when company has replied */}
              {editingComplaint.company_reply && (
                <div className="grid gap-2">
                  <Label>Company Reply to Customer</Label>
                  <div className="bg-blue-50 border-l-4 border-blue-400 rounded-lg p-4">
                    <p className="text-sm text-blue-700 leading-relaxed whitespace-pre-wrap">{editingComplaint.company_reply}</p>
                  </div>
                  <p className="text-xs text-gray-500">
                    This reply was sent to the customer by {editingComplaint.company}.
                  </p>
                </div>
              )}
              {/* Company Comment - Show when complaint is resolved */}
              {editingComplaint.resolved && editingComplaint.company_comment && (
                <div className="grid gap-2">
                  <Label htmlFor="company-comment">Company Resolution Comment</Label>
                  <div className="bg-green-50 border-l-4 border-green-400 rounded-lg p-4">
                    <p className="text-sm text-green-700 leading-relaxed whitespace-pre-wrap">{editingComplaint.company_comment}</p>
                  </div>
                  <p className="text-xs text-gray-500">
                    This comment was provided by {editingComplaint.company} when marking the complaint as resolved.
                  </p>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingComplaint(null)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {deleteConfirmId && (
        <Dialog 
          open={!!deleteConfirmId} 
          onOpenChange={(open) => {
            console.log("[CustomerCareTable] Delete dialog state change:", { open, deleteConfirmId })
            if (!open) setDeleteConfirmId(null)
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirm Deletion</DialogTitle>
              <DialogDescription asChild>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Are you sure you want to delete this complaint? This action cannot be undone.
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
                  console.log("[CustomerCareTable] Delete operation cancelled")
                  setDeleteConfirmId(null)
                }}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  console.log("[CustomerCareTable] Delete button clicked for ID:", deleteConfirmId)
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


