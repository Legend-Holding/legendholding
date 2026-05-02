"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ChevronLeft, Download, Trash2, Eye } from "lucide-react"
import { toast } from "sonner"
import Link from "next/link"
import { format } from "date-fns"
import { AdminDashboardLayout } from "@/components/admin/dashboard-layout"
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

interface Job {
  id: string
  title: string
  department: string
}

interface JobApplication {
  id: string
  job_id: string
  full_name: string
  email: string
  phone: string
  resume_url: string
  cover_letter: string | null
  status: string
  created_at: string
  job?: Job
}

export default function ApplicationDetails() {
  const params = useParams()
  const applicationId = params?.id as string
  const router = useRouter()
  const [application, setApplication] = useState<JobApplication | null>(null)
  const [loading, setLoading] = useState(true)
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false)

  useEffect(() => {
    if (!applicationId) return
    fetchApplicationDetails()
  }, [applicationId])

  const fetchApplicationDetails = async () => {
    try {
      const response = await fetch(`/api/admin/applications/${applicationId}`)
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || 'Failed to load application')

      const applicationData = data.application

      if (!applicationData) {
        setApplication(null)
        return
      }

      setApplication(applicationData)
    } catch (error) {
      console.error('Error fetching application details:', error)
      toast.error('Failed to load application details')
    } finally {
      setLoading(false)
    }
  }

  const applyStatusChange = async (newStatus: string) => {
    if (!application) return
    try {
      const res = await fetch(`/api/admin/applications/${application.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        if (data.emailLimitReached) {
          toast.warning('Daily rejection email limit reached (50/day). Please try again tomorrow.')
          return
        }
        throw new Error(data.error || 'Failed to update status')
      }

      setApplication({ ...application, status: newStatus })
      if (newStatus === 'rejected' && data.emailSent === false) {
        toast.success('Status updated to Rejected. Rejection email could not be sent.')
      } else {
        toast.success('Status updated successfully')
      }
    } catch (error) {
      console.error('Error updating status:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to update status')
    }
  }

  const handleStatusChange = async (newStatus: string) => {
    if (!application) return

    if (newStatus === 'rejected') {
      setRejectDialogOpen(true)
      return
    }

    await applyStatusChange(newStatus)
  }

  const handleRejectConfirm = async () => {
    setRejectDialogOpen(false)
    await applyStatusChange('rejected')
  }

  const handleDelete = async () => {
    if (!application || !confirm('Are you sure you want to delete this application? This action cannot be undone.')) return

    try {
      const response = await fetch(`/api/admin/applications/${application.id}`, { method: 'DELETE' })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || 'Failed to delete application')

      toast.success('Application deleted successfully')
      router.push('/admin/applications')
    } catch (error) {
      console.error('Error deleting application:', error)
      toast.error('Failed to delete application')
    }
  }

  const handleDownloadResume = async () => {
    if (!application) return

    try {
      let fileExt = 'pdf';
      let fileName = application.full_name.replace(/\s+/g, '_') + '_resume';
      let downloadUrl: string;
      let blob: Blob;

      if (application.resume_url.startsWith('data:')) {
        // Base64 file
        const match = application.resume_url.match(/^data:(.*?);/);
        if (match) {
          const mime = match[1];
          if (mime === 'application/pdf') fileExt = 'pdf';
          else if (mime === 'application/msword') fileExt = 'doc';
          else if (mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') fileExt = 'docx';
          else fileExt = 'bin';
        }
        downloadUrl = application.resume_url;
      } else {
        // Storage file
        const path = application.resume_url;
        const extMatch = path.match(/\.([a-zA-Z0-9]+)$/);
        if (extMatch) fileExt = extMatch[1];
        // Fetch the file as blob
        const response = await fetch(application.resume_url);
        blob = await response.blob();
        downloadUrl = window.URL.createObjectURL(blob);
      }
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `${fileName}.${fileExt}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      if (!application.resume_url.startsWith('data:')) {
        window.URL.revokeObjectURL(downloadUrl);
      }
      toast.success('Resume download started');
    } catch (error) {
      console.error('Error downloading resume:', error);
      toast.error('Failed to download resume');
    }
  }

    const handlePreviewResume = async () => {
    if (!application) return

    try {
      console.log('Original resume URL:', application.resume_url);
      
      // Handle base64 encoded files
      if (application.resume_url.startsWith('data:')) {
        console.log('Processing base64 file...');
        try {
          // Extract the base64 data and MIME type
          const [mimepart, base64Data] = application.resume_url.split(',');
          const mimeType = mimepart.split(':')[1].split(';')[0];
          
          console.log('Detected MIME type:', mimeType);
          
          // Convert base64 to binary
          const binaryString = atob(base64Data);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          
          // Handle different file types
          if (mimeType === 'application/pdf') {
            // PDF - can be previewed directly
            const blob = new Blob([bytes], { type: 'application/pdf' });
            const blobUrl = URL.createObjectURL(blob);
            
            console.log('Created blob URL for PDF');
            
            const newWindow = window.open(blobUrl, '_blank');
            if (newWindow) {
              toast.success('Resume opened in new tab');
              setTimeout(() => {
                URL.revokeObjectURL(blobUrl);
              }, 30000);
            } else {
              toast.error('Pop-up blocked. Please allow pop-ups for this site.');
              URL.revokeObjectURL(blobUrl);
            }
          } else if (mimeType.includes('word') || mimeType.includes('document') || mimeType.includes('officedocument')) {
            // Word document - create HTML preview page
            console.log('Word document detected - creating preview page');
            
            // Create the actual file blob
            const fileBlob = new Blob([bytes], { type: mimeType });
            const fileBlobUrl = URL.createObjectURL(fileBlob);
            
            // Determine file extension
            const fileExt = mimeType.includes('wordprocessingml') ? 'docx' : 'doc';
            const fileName = `${application.full_name.replace(/\s+/g, '_')}_resume.${fileExt}`;
            
            // Create HTML preview page
            const htmlContent = `
              <!DOCTYPE html>
              <html>
                <head>
                  <title>Resume Preview - ${application.full_name}</title>
                  <style>
                    body {
                      font-family: Arial, sans-serif;
                      max-width: 800px;
                      margin: 0 auto;
                      padding: 20px;
                      background-color: #f5f5f5;
                    }
                    .container {
                      background: white;
                      padding: 30px;
                      border-radius: 8px;
                      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                      text-align: center;
                    }
                    .document-icon {
                      font-size: 64px;
                      color: #2B579A;
                      margin-bottom: 20px;
                    }
                    .document-info {
                      margin-bottom: 30px;
                    }
                    .download-btn {
                      background: #2B579A;
                      color: white;
                      padding: 12px 24px;
                      border: none;
                      border-radius: 5px;
                      font-size: 16px;
                      cursor: pointer;
                      text-decoration: none;
                      display: inline-block;
                    }
                    .download-btn:hover {
                      background: #1e3f73;
                    }
                    .file-details {
                      background: #f8f9fa;
                      padding: 15px;
                      border-radius: 5px;
                      margin: 20px 0;
                      text-align: left;
                    }
                  </style>
                </head>
                <body>
                  <div class="container">
                    <div class="document-icon">📄</div>
                    <h1>Resume Preview</h1>
                    <div class="document-info">
                      <h2>${application.full_name}</h2>
                      <p>Word Document (${fileExt.toUpperCase()})</p>
                    </div>
                                         <div class="file-details">
                       <strong>Note:</strong> Browser can't read word files, Please download the resume.
                     </div>
                    <a href="${fileBlobUrl}" download="${fileName}" class="download-btn">
                      📥 Download Resume
                    </a>
                    <script>
                      // Auto cleanup after 5 minutes
                      setTimeout(() => {
                        document.body.innerHTML = '<div class="container"><h2>Session Expired</h2><p>This preview link has expired for security reasons.</p></div>';
                      }, 300000);
                    </script>
                  </div>
                </body>
              </html>
            `;
            
            // Create HTML blob and open it
            const htmlBlob = new Blob([htmlContent], { type: 'text/html' });
            const htmlBlobUrl = URL.createObjectURL(htmlBlob);
            
            const newWindow = window.open(htmlBlobUrl, '_blank');
            if (newWindow) {
              toast.success('Word document preview opened');
              // Clean up after a longer delay since the page contains the download link
              setTimeout(() => {
                URL.revokeObjectURL(fileBlobUrl);
                URL.revokeObjectURL(htmlBlobUrl);
              }, 300000); // 5 minutes
            } else {
              toast.error('Pop-up blocked. Please allow pop-ups for this site.');
              URL.revokeObjectURL(fileBlobUrl);
              URL.revokeObjectURL(htmlBlobUrl);
            }
          } else {
            // Other file types - try direct download approach
            console.log('Unknown file type, attempting direct view');
            const blob = new Blob([bytes], { type: mimeType });
            const blobUrl = URL.createObjectURL(blob);
            
            const newWindow = window.open(blobUrl, '_blank');
            if (newWindow) {
              toast.success('Resume opened in new tab');
              setTimeout(() => {
                URL.revokeObjectURL(blobUrl);
              }, 30000);
            } else {
              toast.error('Pop-up blocked. Please allow pop-ups for this site.');
              URL.revokeObjectURL(blobUrl);
            }
          }
          return;
        } catch (error) {
          console.error('Error processing base64 file:', error);
          toast.error('Failed to process resume file');
          return;
        }
      }
      
      if (application.resume_url.startsWith('http')) {
        // Full URL - open directly
        window.open(application.resume_url, '_blank');
        toast.success('Resume opened in new tab');
        return;
      }
      
      window.open(application.resume_url, '_blank');
      toast.success('Resume opened in new tab');
      return;
      
    } catch (error) {
      console.error('Error previewing resume:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast.error(`Failed to preview resume: ${errorMessage}`);
    }
  }



  const handleSignOut = async () => {
    await fetch('/api/admin/auth/logout', { method: 'POST' })
    router.refresh()
    router.push("/admin/login")
  }

  if (loading) {
    return (
      <AdminDashboardLayout onSignOut={handleSignOut}>
        <div className="flex items-center justify-center min-h-screen">
          <div className="flex flex-col items-center gap-2">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#2B1C48] border-t-transparent"></div>
            <p className="text-sm text-gray-600">Loading application details...</p>
          </div>
        </div>
      </AdminDashboardLayout>
    )
  }

  if (!application) {
    return (
      <AdminDashboardLayout onSignOut={handleSignOut}>
        <div className="p-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Application Not Found</h1>
            <p className="text-gray-600 mb-8">The application you're looking for doesn't exist or has been removed.</p>
            <Link href="/admin/applications">
              <Button>Back to Applications</Button>
            </Link>
          </div>
        </div>
      </AdminDashboardLayout>
    )
  }

  return (
    <AdminDashboardLayout onSignOut={handleSignOut}>
      <div className="p-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-6">
            <Link 
              href="/admin/applications"
              className="inline-flex items-center text-gray-600 hover:text-gray-900"
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Back to Applications
            </Link>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">
                  Application from {application.full_name}
                </h1>
                <p className="text-gray-600">
                  Applied for {application.job?.title || 'Unknown Position'}
                  {application.job?.department && ` in ${application.job.department}`}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  Submitted on {format(new Date(application.created_at), 'MMMM d, yyyy')}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Select
                  value={application.status}
                  onValueChange={handleStatusChange}
                  disabled={application.status === 'rejected'}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="reviewed">Reviewed</SelectItem>
                    <SelectItem value="shortlisted">Shortlisted</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                    <SelectItem value="hired">Hired</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleDelete}
                  className="text-red-500 hover:text-red-600"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6 mb-6">
              <div>
                <h2 className="text-sm font-medium text-gray-500 mb-1">Email</h2>
                <p className="text-gray-900">{application.email}</p>
              </div>
              <div>
                <h2 className="text-sm font-medium text-gray-500 mb-1">Phone</h2>
                <p className="text-gray-900">{application.phone}</p>
              </div>
            </div>

            {application.cover_letter && (
              <div className="mb-6">
                <h2 className="text-sm font-medium text-gray-500 mb-2">Cover Letter</h2>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-gray-900 whitespace-pre-wrap">{application.cover_letter}</p>
                </div>
              </div>
            )}

            <div>
              <h2 className="text-sm font-medium text-gray-500 mb-2">Resume</h2>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={handlePreviewResume}
                  className="inline-flex items-center"
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Preview Resume
                </Button>
                <Button
                  variant="outline"
                  onClick={handleDownloadResume}
                  className="inline-flex items-center"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download Resume
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <AlertDialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject application?</AlertDialogTitle>
            <AlertDialogDescription>
              This will set the status to Rejected and send a rejection email to the applicant. Do you want to continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRejectConfirm}>Yes, reject and send email</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminDashboardLayout>
  )
} 