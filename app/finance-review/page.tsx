"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { 
  Eye, 
  CheckCircle, 
  XCircle,
  FileText,
  Calendar,
  ChevronLeft
} from "lucide-react"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { motion } from "framer-motion"

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
  status: 'pending' | 'finance_approved' | 'finance_rejected' | 'approved' | 'cofounder_approved' | 'cofounder_rejected'
  finance_reviewed_at: string | null
  cofounder_reviewed_at: string | null
  finance_comment: string | null
  cofounder_comment: string | null
  founder_comment: string | null
}

export default function FinanceReviewPage() {
  const [submissions, setSubmissions] = useState<WorkflowSubmission[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedSubmission, setSelectedSubmission] = useState<WorkflowSubmission | null>(null)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [reviewComment, setReviewComment] = useState("")

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
    setReviewComment("")
    setIsViewDialogOpen(true)
  }

  const handleUpdateStatus = async (id: string, action: 'approve' | 'reject') => {
    if (!reviewComment.trim()) {
      toast.error('Please add a comment before ' + (action === 'approve' ? 'approving' : 'rejecting'))
      return
    }

    try {
      const status = action === 'approve' ? 'finance_approved' : 'finance_rejected'
      
      const response = await fetch('/api/workflow', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          id, 
          status, 
          reviewer: 'finance',
          comment: reviewComment 
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update status')
      }

      setSubmissions(prev =>
        prev.map(submission =>
          submission.id === id ? { ...submission, status } : submission
        )
      )

      const message = action === 'approve' 
        ? 'Submission approved and sent to co-founder for final approval'
        : 'Submission rejected'
      
      toast.success(message)
      setIsViewDialogOpen(false)
      setReviewComment("")
      
      // Refresh to show updated list
      fetchSubmissions()
    } catch (error: any) {
      console.error("Error updating status:", error)
      toast.error(error.message || "Failed to update status")
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
        return <Badge className="bg-green-500 hover:bg-green-600">Fully Approved</Badge>
      case 'cofounder_approved':
        return <Badge className="bg-green-500 hover:bg-green-600">Mrs. Mira approved</Badge>
      case 'finance_approved':
        return <Badge className="bg-blue-500 hover:bg-blue-600">Approved to Mrs. Mira</Badge>
      case 'finance_rejected':
        return <Badge className="bg-red-500 hover:bg-red-600">Rejected by Finance</Badge>
      case 'cofounder_rejected':
        return <Badge className="bg-red-500 hover:bg-red-600">Rejected by Co-Founder</Badge>
      case 'pending':
        return <Badge className="bg-yellow-500 hover:bg-yellow-600">Pending Review</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const pendingSubmissions = submissions.filter(s => s.status === 'pending')
  const reviewedSubmissions = submissions.filter(s => s.status !== 'pending')

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
            <h1 className="text-4xl sm:text-5xl font-bold mb-4 text-[#EE8900]">Finance Review</h1>
            <p className="text-lg sm:text-xl text-white/95">
              Review and approve workflow document submissions
            </p>
          </div>
        </div>
      </div>

      <section className="py-16 px-4 sm:px-6">
          <div className="max-w-7xl mx-auto">

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              <Card className="bg-white">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Total Submissions</p>
                      <p className="text-3xl font-bold text-[#2B1C48]">{submissions.length}</p>
                    </div>
                    <FileText className="h-12 w-12 text-gray-400" />
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-white">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Pending Review</p>
                      <p className="text-3xl font-bold text-yellow-600">{pendingSubmissions.length}</p>
                    </div>
                    <FileText className="h-12 w-12 text-yellow-400" />
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-white">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Reviewed</p>
                      <p className="text-3xl font-bold text-green-600">{reviewedSubmissions.length}</p>
                    </div>
                    <CheckCircle className="h-12 w-12 text-green-400" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#5D376E] mx-auto mb-4"></div>
                <p className="text-gray-600">Loading submissions...</p>
              </div>
            ) : (
              <>
                {/* Pending Submissions */}
                {pendingSubmissions.length > 0 && (
                  <div className="mb-12">
                    <h2 className="text-2xl font-bold text-[#5D376E] mb-4">Pending Review</h2>
                    <div className="grid grid-cols-1 gap-4">
                      {pendingSubmissions.map((submission, index) => (
                        <motion.div
                          key={submission.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.1 }}
                        >
                          <Card className="bg-white hover:shadow-lg transition-shadow">
                            <CardContent className="p-6">
                              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                                <div className="flex-1">
                                  <div className="mb-2">
                                    <h3 className="text-xl font-semibold text-[#2B1C48] mb-1">
                                      {submission.subject}
                                    </h3>
                                    <div className="flex items-center gap-4 text-sm text-gray-500">
                                      <span className="font-medium text-[#2B1C48]">{submission.name}</span>
                                      <div className="flex items-center gap-2">
                                        <Calendar className="h-4 w-4" />
                                        <span>{new Date(submission.created_at).toLocaleDateString()}</span>
                                      </div>
                                    </div>
                                  </div>
                                  {submission.files && submission.files.length > 0 && (
                                    <div className="flex items-center gap-2 text-sm text-gray-500">
                                      <FileText className="h-4 w-4" />
                                      <span>{submission.files.length} file{submission.files.length > 1 ? 's' : ''} attached</span>
                                    </div>
                                  )}
                                </div>
                                <div className="flex items-center gap-3">
                                  {getStatusBadge(submission.status)}
                                  <Button
                                    onClick={() => handleViewSubmission(submission)}
                                    variant="outline"
                                  >
                                    <Eye className="h-4 w-4 mr-2" />
                                    View Details
                                  </Button>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Reviewed Submissions */}
                {reviewedSubmissions.length > 0 && (
                  <div>
                    <h2 className="text-2xl font-bold text-[#5D376E] mb-4">Reviewed Submissions</h2>
                    <div className="grid grid-cols-1 gap-4">
                      {reviewedSubmissions.map((submission, index) => (
                        <motion.div
                          key={submission.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.1 }}
                        >
                          <Card className="bg-white hover:shadow-md transition-shadow opacity-75">
                            <CardContent className="p-6">
                              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                                <div className="flex-1">
                                  <div className="mb-2">
                                    <h3 className="text-lg font-semibold text-[#2B1C48] mb-1">
                                      {submission.subject}
                                    </h3>
                                    <div className="flex items-center gap-4 text-sm text-gray-500">
                                      <span className="font-medium text-[#2B1C48]">{submission.name}</span>
                                      <div className="flex items-center gap-2">
                                        <Calendar className="h-4 w-4" />
                                        <span>{new Date(submission.created_at).toLocaleDateString()}</span>
                                      </div>
                                    </div>
                                  </div>
                                  {submission.files && submission.files.length > 0 && (
                                    <div className="flex items-center gap-2 text-sm text-gray-500">
                                      <FileText className="h-4 w-4" />
                                      <span>{submission.files.length} file{submission.files.length > 1 ? 's' : ''} attached</span>
                                    </div>
                                  )}
                                </div>
                                <div className="flex items-center gap-3">
                                  {getStatusBadge(submission.status)}
                                  <Button
                                    onClick={() => handleViewSubmission(submission)}
                                    variant="outline"
                                    size="sm"
                                  >
                                    <Eye className="h-4 w-4 mr-2" />
                                    View
                                  </Button>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                )}

                {/* No Submissions */}
                {submissions.length === 0 && (
                  <Card className="bg-white">
                    <CardContent className="py-12">
                      <div className="text-center">
                        <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-xl font-semibold text-[#2B1C48] mb-2">No Submissions Yet</h3>
                        <p className="text-gray-600">There are no workflow submissions to review at this time.</p>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </div>
        </section>
      </main>

      {/* View Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl">Submission Details</DialogTitle>
            <DialogDescription>
              Submitted on {selectedSubmission && new Date(selectedSubmission.created_at).toLocaleString()}
            </DialogDescription>
          </DialogHeader>
          {selectedSubmission && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-[#5D376E] mb-2">Name</label>
                  <p className="text-[#2B1C48] text-lg">{selectedSubmission.name}</p>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[#5D376E] mb-2">Email</label>
                  <p className="text-[#2B1C48] text-lg">{selectedSubmission.email}</p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-[#5D376E] mb-2">Subject</label>
                <p className="text-[#2B1C48] text-lg">{selectedSubmission.subject}</p>
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-[#5D376E] mb-2">Message</label>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-[#2B1C48] whitespace-pre-wrap">{selectedSubmission.message}</p>
                </div>
              </div>
              
              {selectedSubmission.files && selectedSubmission.files.length > 0 && (
                <div>
                  <label className="block text-sm font-semibold text-[#5D376E] mb-2">
                    Attached Documents ({selectedSubmission.files.length})
                  </label>
                  <div className="space-y-3">
                    {selectedSubmission.files.map((file, index) => (
                      <div key={index} className="flex items-center justify-between p-4 border-2 border-gray-200 rounded-lg bg-gray-50">
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div className="w-12 h-12 bg-[#EE8900] bg-opacity-10 rounded-lg flex items-center justify-center flex-shrink-0">
                            <FileText className="h-6 w-6 text-[#EE8900]" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-[#2B1C48] truncate">{file.fileName}</p>
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
                <label className="block text-sm font-semibold text-[#5D376E] mb-2">Status</label>
                <div>{getStatusBadge(selectedSubmission.status)}</div>
              </div>
              
              {selectedSubmission.status === 'pending' && (
                <div className="space-y-4 pt-4 border-t">
                  <div>
                    <label htmlFor="reviewComment" className="block text-sm font-semibold text-[#5D376E] mb-2">
                      Review Comment <span className="text-red-600">*</span>
                    </label>
                    <textarea
                      id="reviewComment"
                      value={reviewComment}
                      onChange={(e) => setReviewComment(e.target.value)}
                      placeholder="Add your review comments here..."
                      rows={4}
                      className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#EE8900] focus:border-transparent transition-all duration-200 resize-none"
                    />
                  </div>
                  <div className="flex gap-3">
                    <Button
                      onClick={() => handleUpdateStatus(selectedSubmission.id, 'approve')}
                      className="flex-1 bg-green-600 hover:bg-green-700 text-lg py-6"
                    >
                      <CheckCircle className="h-5 w-5 mr-2" />
                      Approved & Send to Mrs. Mira
                    </Button>
                    <Button
                      onClick={() => handleUpdateStatus(selectedSubmission.id, 'reject')}
                      variant="destructive"
                      className="flex-1 text-lg py-6"
                    >
                      <XCircle className="h-5 w-5 mr-2" />
                      Rejected
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}

