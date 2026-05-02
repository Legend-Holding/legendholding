"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { 
  Download, 
  Eye, 
  Trash2,
  FileText,
  Calendar,
  Filter
} from "lucide-react"
import * as XLSX from 'xlsx'
import { toast } from "sonner"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"

interface FileData {
  fileName: string
  fileUrl: string
  fileType: string
  fileSize: number
}

interface WorkflowSubmission {
  id: string
  created_at: string
  name: string
  email: string
  subject: string
  message: string
  files: FileData[] | null
  status: 'pending' | 'finance_approved' | 'finance_rejected' | 'cofounder_approved' | 'cofounder_rejected' | 'approved' | 'founder_rejected'
  finance_reviewed_at: string | null
  cofounder_reviewed_at: string | null
  founder_reviewed_at: string | null
  finance_comment: string | null
  cofounder_comment: string | null
  founder_comment: string | null
}

export default function WorkflowSubmissionsPage() {
  const [submissions, setSubmissions] = useState<WorkflowSubmission[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedSubmission, setSelectedSubmission] = useState<WorkflowSubmission | null>(null)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [submissionToDelete, setSubmissionToDelete] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<string>("all")

  useEffect(() => {
    fetchSubmissions()
  }, [])

  const fetchSubmissions = async () => {
    try {
      setLoading(true)
      
      const response = await fetch('/api/workflow')
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch submissions')
      }

      setSubmissions(result.data || [])
    } catch (error) {
      console.error("Error fetching submissions:", error)
      toast.error("Failed to fetch submissions")
      setSubmissions([])
    } finally {
      setLoading(false)
    }
  }

  const handleViewSubmission = (submission: WorkflowSubmission) => {
    setSelectedSubmission(submission)
    setIsViewDialogOpen(true)
  }

  const handleDeleteSubmission = async () => {
    if (!submissionToDelete) return

    try {
      setLoading(true)
      
      const response = await fetch(`/api/workflow?id=${submissionToDelete}`, {
        method: 'DELETE',
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to delete submission')
      }

      setSubmissions(prev => prev.filter(submission => submission.id !== submissionToDelete))
      toast.success("Submission deleted successfully")
      setIsDeleteDialogOpen(false)
      setSubmissionToDelete(null)
      setIsViewDialogOpen(false)
    } catch (error: any) {
      console.error("Error deleting submission:", error)
      toast.error(error.message || "Failed to delete submission")
    } finally {
      setLoading(false)
    }
  }


  const exportToExcel = () => {
    try {
      const exportData = submissions.map(item => ({
        Date: new Date(item.created_at).toLocaleDateString(),
        Subject: item.subject,
        Message: item.message,
        'File Name': item.file_name || 'N/A',
        'File Size': item.file_size ? `${(item.file_size / 1024).toFixed(2)} KB` : 'N/A',
        Status: item.status.charAt(0).toUpperCase() + item.status.slice(1),
      }))

      const ws = XLSX.utils.json_to_sheet(exportData)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Workflow Submissions')
      XLSX.writeFile(wb, 'workflow_submissions.xlsx')
      toast.success("Data exported successfully")
    } catch (error) {
      console.error("Error exporting data:", error)
      toast.error("Failed to export data")
    }
  }

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return 'N/A'
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-500 hover:bg-green-600">✓ Fully Approved</Badge>
      case 'cofounder_approved':
        return <Badge className="bg-blue-500 hover:bg-blue-600">Awaiting Founder</Badge>
      case 'finance_approved':
        return <Badge className="bg-blue-500 hover:bg-blue-600">Awaiting Co-Founder</Badge>
      case 'finance_rejected':
        return <Badge className="bg-red-500 hover:bg-red-600">Rejected by Finance</Badge>
      case 'cofounder_rejected':
        return <Badge className="bg-red-500 hover:bg-red-600">Rejected by Co-Founder</Badge>
      case 'founder_rejected':
        return <Badge className="bg-red-500 hover:bg-red-600">Rejected by Founder</Badge>
      case 'pending':
        return <Badge className="bg-yellow-500 hover:bg-yellow-600">Pending Finance</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const filteredSubmissions = submissions.filter(submission => {
    if (activeTab === 'all') return true
    if (activeTab === 'rejected') return submission.status === 'finance_rejected' || submission.status === 'cofounder_rejected' || submission.status === 'founder_rejected'
    return submission.status === activeTab
  })

  const stats = {
    total: submissions.length,
    pending: submissions.filter(s => s.status === 'pending').length,
    finance_approved: submissions.filter(s => s.status === 'finance_approved').length,
    cofounder_approved: submissions.filter(s => s.status === 'cofounder_approved').length,
    approved: submissions.filter(s => s.status === 'approved').length,
    rejected: submissions.filter(s => s.status === 'finance_rejected' || s.status === 'cofounder_rejected' || s.status === 'founder_rejected').length,
  }

  return (
    <>
      <main className="min-h-screen bg-slate-50">
      {/* Hero Banner */}
      <div className="relative h-[300px] sm:h-[400px] w-full">
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: "url('https://res.cloudinary.com/dzfhqvxnf/image/upload/v1761119956/cdn_684c1882b54a16.04269006_20250613_122434_vwphxo.jpg')"
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-[#5D376E]/70 to-[#5D376E]/60" />
        </div>
        <div className="relative h-full flex items-center justify-center px-4 sm:px-6">
          <div className="max-w-7xl mx-auto text-white text-center">
            <h1 className="text-4xl sm:text-5xl font-bold mb-4 text-[#EE8900]">Workflow Submissions</h1>
            <p className="text-lg sm:text-xl text-white/95">
              View and manage all workflow document submissions
            </p>
          </div>
        </div>
      </div>

      <section className="py-16 px-4 sm:px-6">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-end mb-8">
              <Button onClick={exportToExcel} variant="outline" className="flex items-center gap-2">
                <Download className="h-4 w-4" />
                Export to Excel
              </Button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
              <Card>
                <CardHeader className="pb-3">
                  <CardDescription>Total</CardDescription>
                  <CardTitle className="text-3xl">{stats.total}</CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardDescription>Pending Finance</CardDescription>
                  <CardTitle className="text-3xl text-yellow-600">{stats.pending}</CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardDescription>Awaiting Co-Founder</CardDescription>
                  <CardTitle className="text-3xl text-blue-600">{stats.finance_approved}</CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardDescription>Awaiting Founder</CardDescription>
                  <CardTitle className="text-3xl text-purple-600">{stats.cofounder_approved}</CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardDescription>Approved</CardDescription>
                  <CardTitle className="text-3xl text-green-600">{stats.approved}</CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardDescription>Rejected</CardDescription>
                  <CardTitle className="text-3xl text-red-600">{stats.rejected}</CardTitle>
                </CardHeader>
              </Card>
            </div>

            {/* Submissions Table */}
            <Card>
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="w-full justify-start border-b rounded-none px-6 flex-wrap h-auto">
                  <TabsTrigger value="all">All ({stats.total})</TabsTrigger>
                  <TabsTrigger value="pending">Pending Finance ({stats.pending})</TabsTrigger>
                  <TabsTrigger value="finance_approved">Awaiting Co-Founder ({stats.finance_approved})</TabsTrigger>
                  <TabsTrigger value="cofounder_approved">Awaiting Founder ({stats.cofounder_approved})</TabsTrigger>
                  <TabsTrigger value="approved">Approved ({stats.approved})</TabsTrigger>
                  <TabsTrigger value="rejected">Rejected ({stats.rejected})</TabsTrigger>
                </TabsList>
                
                <TabsContent value={activeTab} className="p-6">
                  {loading ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
                      <p className="mt-2 text-sm text-gray-600">Loading submissions...</p>
                    </div>
                  ) : filteredSubmissions.length === 0 ? (
                    <div className="text-center py-8">
                      <FileText className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                      <p className="text-gray-500">No submissions found</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Submitter</TableHead>
                            <TableHead>Subject</TableHead>
                            <TableHead>File</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredSubmissions.map((submission) => (
                            <TableRow key={submission.id}>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <Calendar className="h-4 w-4 text-gray-400" />
                                  <span className="text-sm">
                                    {new Date(submission.created_at).toLocaleDateString()}
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="max-w-xs">
                                  <p className="font-medium truncate">{submission.name}</p>
                                  <p className="text-sm text-gray-500 truncate">{submission.email}</p>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="max-w-xs">
                                  <p className="font-medium truncate">{submission.subject}</p>
                                  <p className="text-sm text-gray-500 truncate">{submission.message}</p>
                                </div>
                              </TableCell>
                              <TableCell>
                                {submission.files && submission.files.length > 0 ? (
                                  <div className="flex items-center gap-2">
                                    <FileText className="h-4 w-4 text-gray-400" />
                                    <span className="text-sm font-medium">
                                      {submission.files.length} file{submission.files.length > 1 ? 's' : ''}
                                    </span>
                                  </div>
                                ) : (
                                  <span className="text-sm text-gray-400">No files</span>
                                )}
                              </TableCell>
                              <TableCell>{getStatusBadge(submission.status)}</TableCell>
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleViewSubmission(submission)}
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      setSubmissionToDelete(submission.id)
                                      setIsDeleteDialogOpen(true)
                                    }}
                                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
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
                  )}
                </TabsContent>
              </Tabs>
            </Card>
          </div>
        </section>
      </main>

      {/* View Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Workflow Submission Details</DialogTitle>
            <DialogDescription>
              Submitted on {selectedSubmission && new Date(selectedSubmission.created_at).toLocaleString()}
            </DialogDescription>
          </DialogHeader>
          {selectedSubmission && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-semibold text-[#2B1C48]">Name</label>
                  <p className="mt-1 text-[#2B1C48]">{selectedSubmission.name}</p>
                </div>
                <div>
                  <label className="text-sm font-semibold text-[#2B1C48]">Email</label>
                  <p className="mt-1 text-[#2B1C48]">{selectedSubmission.email}</p>
                </div>
              </div>
              
              <div>
                <label className="text-sm font-semibold text-[#2B1C48]">Subject</label>
                <p className="mt-1 text-[#2B1C48]">{selectedSubmission.subject}</p>
              </div>
              <div>
                <label className="text-sm font-semibold text-[#2B1C48]">Message</label>
                <p className="mt-1 text-[#2B1C48] whitespace-pre-wrap">{selectedSubmission.message}</p>
              </div>
              {selectedSubmission.files && selectedSubmission.files.length > 0 && (
                <div>
                  <label className="text-sm font-semibold text-[#2B1C48]">
                    Attached Files ({selectedSubmission.files.length})
                  </label>
                  <div className="mt-2 space-y-2">
                    {selectedSubmission.files.map((file, index) => (
                      <div key={index} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <FileText className="h-8 w-8 text-gray-400 flex-shrink-0" />
                          <div className="min-w-0 flex-1">
                            <p className="font-medium truncate">{file.fileName}</p>
                            <p className="text-sm text-gray-500">
                              {formatFileSize(file.fileSize)}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div>
                <label className="text-sm font-semibold text-[#2B1C48]">Status</label>
                <div className="mt-1 space-y-2">
                  {getStatusBadge(selectedSubmission.status)}
                  {selectedSubmission.finance_reviewed_at && (
                    <p className="text-sm text-gray-600">
                      Rejeesh reviewed: {new Date(selectedSubmission.finance_reviewed_at).toLocaleString()}
                    </p>
                  )}
                  {selectedSubmission.cofounder_reviewed_at && (
                    <p className="text-sm text-gray-600">
                      Mrs. Mira reviewed: {new Date(selectedSubmission.cofounder_reviewed_at).toLocaleString()}
                    </p>
                  )}
                  {selectedSubmission.founder_reviewed_at && (
                    <p className="text-sm text-gray-600">
                      Mr. Kai reviewed: {new Date(selectedSubmission.founder_reviewed_at).toLocaleString()}
                    </p>
                  )}
                </div>
              </div>

              {/* Review Comments */}
              {selectedSubmission.finance_comment && (
                <div className="bg-blue-50 border-l-4 border-blue-500 p-3 rounded">
                  <p className="text-sm font-semibold text-blue-900 mb-1">💼 Rejeesh Comment</p>
                  <p className="text-sm text-blue-800 whitespace-pre-wrap">{selectedSubmission.finance_comment}</p>
                </div>
              )}
              {selectedSubmission.cofounder_comment && (
                <div className="bg-purple-50 border-l-4 border-purple-500 p-3 rounded">
                  <p className="text-sm font-semibold text-purple-900 mb-1">🛡️ Mrs. Mira Comment</p>
                  <p className="text-sm text-purple-800 whitespace-pre-wrap">{selectedSubmission.cofounder_comment}</p>
                </div>
              )}
              {selectedSubmission.founder_comment && (
                <div className="bg-amber-50 border-l-4 border-amber-500 p-3 rounded">
                  <p className="text-sm font-semibold text-amber-900 mb-1">👑 Mr. Kai Comment</p>
                  <p className="text-sm text-amber-800 whitespace-pre-wrap">{selectedSubmission.founder_comment}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the submission and its associated file.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteSubmission}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

