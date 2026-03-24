"use client"

import { useState, useEffect, useRef } from "react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { format } from "date-fns"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Eye, Trash2, Download, Search, ChevronLeft, ChevronRight } from "lucide-react"
import { toast } from "sonner"
import Link from "next/link"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useRouter } from "next/navigation"
import { AdminDashboardLayout } from "@/components/admin/dashboard-layout"
import { UnauthorizedAccess } from "@/components/admin/unauthorized-access"
import { useAdminPermissions, clearPermissionsCache } from "@/hooks/use-admin-permissions"
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
  status?: 'active' | 'inactive'
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

export default function ApplicationsPage() {
  const router = useRouter()
  const { userRole, isLoading: permissionsLoading, hasPermission } = useAdminPermissions()
  const [applications, setApplications] = useState<JobApplication[]>([])
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [filtering, setFiltering] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [jobFilter, setJobFilter] = useState<string>("active")
  const [viewMode, setViewMode] = useState<"table" | "grouped">("table")
  const PAGE_SIZE = 10
  const [currentPage, setCurrentPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [filteredCount, setFilteredCount] = useState(0)
  const [statusCounts, setStatusCounts] = useState({
    pending: 0,
    reviewed: 0,
    shortlisted: 0,
    rejected: 0,
    hired: 0
  }) // Status counts from database
  const [statusCountsLoading, setStatusCountsLoading] = useState(true) // Track if status counts are being loaded
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false)
  const [rejectDialogPayload, setRejectDialogPayload] = useState<{
    applicationId: string
    newStatus: string
    previousStatus: string
  } | null>(null)
  const userRoleCache = useRef<{ userId: string; role: string } | null>(null)
  const jobIdsCache = useRef<{ filter: string; ids: string[] } | null>(null)
  const jobMapCache = useRef<Map<string, Job>>(new Map())
  const fetchIdRef = useRef(0)
  const supabase = createClientComponentClient()

  useEffect(() => {
    fetchApplications(1)
    fetchJobs()
  }, [])

  // Refetch when filters change (skip initial mount)
  const isInitialMount = useRef(true)
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false
      return
    }
    setApplications([])
    setFilteredCount(0)
    setStatusCounts({ pending: 0, reviewed: 0, shortlisted: 0, rejected: 0, hired: 0 })
    setStatusCountsLoading(true)
    setFiltering(true)
    setCurrentPage(1)
    jobIdsCache.current = null
    fetchApplications(1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobFilter, statusFilter])

  const fetchApplications = async (page: number = 1) => {
    const currentFetchId = ++fetchIdRef.current
    const offset = (page - 1) * PAGE_SIZE

    try {
      // --- Auth + role (cached after first call) ---
      let userId: string
      let role: string
      if (userRoleCache.current) {
        userId = userRoleCache.current.userId
        role = userRoleCache.current.role
      } else {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { toast.error('User not authenticated'); setLoading(false); setFiltering(false); return }
        userId = user.id
        const { data: roleData, error: roleError } = await supabase
          .from('user_roles').select('role').eq('user_id', user.id).single()
        if (roleError || !roleData) { toast.error('Unable to determine user role'); setLoading(false); setFiltering(false); return }
        role = roleData.role
        userRoleCache.current = { userId: user.id, role: role }
      }

      // --- Job IDs for filtering (cached per filter value) ---
      const isSpecificJob = jobFilter !== 'active' && jobFilter !== 'inactive'
      let userJobIds: string[] | null = null

      if (isSpecificJob) {
        userJobIds = [jobFilter]
      } else if (jobIdsCache.current?.filter === jobFilter) {
        userJobIds = jobIdsCache.current.ids
      } else if (role === 'super_admin') {
        const { data: jobsByStatus } = await supabase.from('jobs').select('id').eq('status', jobFilter)
        userJobIds = jobsByStatus?.map(j => j.id) || []
        jobIdsCache.current = { filter: jobFilter, ids: userJobIds }
      } else {
        const [{ data: created }, { data: assigned }] = await Promise.all([
          supabase.from('jobs').select('id').eq('created_by', userId).eq('status', jobFilter),
          supabase.from('jobs').select('id').eq('assigned_to', userId).eq('status', jobFilter)
        ])
        userJobIds = [...new Set([...(created?.map(j => j.id) || []), ...(assigned?.map(j => j.id) || [])])]
        jobIdsCache.current = { filter: jobFilter, ids: userJobIds }
      }

      if (userJobIds && userJobIds.length === 0) {
        setApplications([]); setTotalCount(0); setFilteredCount(0)
        setStatusCounts({ pending: 0, reviewed: 0, shortlisted: 0, rejected: 0, hired: 0 })
        setCurrentPage(1); setLoading(false); setFiltering(false); setStatusCountsLoading(false)
        return
      }

      // --- Data query: NO JOIN, plain columns only (fastest possible) ---
      const isFiltered = isSpecificJob || statusFilter !== "all"

      let dataQuery = supabase
        .from('job_applications')
        .select('id, job_id, full_name, email, phone, resume_url, cover_letter, status, created_at')
        .order('created_at', { ascending: false })
        .range(offset, offset + PAGE_SIZE - 1)

      if (userJobIds && userJobIds.length > 0) dataQuery = dataQuery.in('job_id', userJobIds)
      if (isSpecificJob) dataQuery = dataQuery.eq('job_id', jobFilter)
      if (statusFilter === "all") { dataQuery = dataQuery.neq('status', 'rejected') }
      else { dataQuery = dataQuery.eq('status', statusFilter) }

      const { data: applicationsData, error: applicationsError } = await dataQuery
      if (applicationsError) throw applicationsError
      if (currentFetchId !== fetchIdRef.current) return

      // --- Enrich with job info from cache or quick batch fetch ---
      if (applicationsData) {
        const missingJobIds = [...new Set(applicationsData.map(a => a.job_id))]
          .filter(id => !jobMapCache.current.has(id))

        if (missingJobIds.length > 0) {
          const { data: jobsData } = await supabase
            .from('jobs').select('id, title, department').in('id', missingJobIds)
          jobsData?.forEach(j => jobMapCache.current.set(j.id, j))
        }

        const transformedData: JobApplication[] = applicationsData.map(app => ({
          ...app,
          job: jobMapCache.current.get(app.job_id) || undefined
        }))

        setApplications(transformedData)
        setCurrentPage(page)
        setFiltering(false)

        if (page > 1) { setStatusCountsLoading(false); setLoading(false); return }
      }

      // --- Background counts (page 1 only, non-blocking) ---
      if (page === 1) {
        const fetchCounts = async () => {
          try {
            const applyFilters = (q: any) => {
              if (userJobIds && userJobIds.length > 0) q = q.in('job_id', userJobIds)
              if (isSpecificJob) q = q.eq('job_id', jobFilter)
              return q
            }

            let countQ = applyFilters(supabase.from('job_applications').select('id', { count: 'exact', head: true }))
            if (statusFilter === "all") countQ = countQ.neq('status', 'rejected')
            else countQ = countQ.eq('status', statusFilter)

            const statusNames = ['pending', 'reviewed', 'shortlisted', 'rejected', 'hired'] as const
            const statusQs = statusNames.map(s =>
              applyFilters(supabase.from('job_applications').select('id', { count: 'exact', head: true }).eq('status', s))
            )

            const [countRes, ...statusRes] = await Promise.all([countQ, ...statusQs])
            const cnt = countRes?.count || 0
            if (isFiltered) { setFilteredCount(cnt) } else { setTotalCount(cnt); setFilteredCount(cnt) }
            setStatusCounts({
              pending: statusRes[0]?.count || 0, reviewed: statusRes[1]?.count || 0,
              shortlisted: statusRes[2]?.count || 0, rejected: statusRes[3]?.count || 0,
              hired: statusRes[4]?.count || 0
            })
            setStatusCountsLoading(false)
          } catch (err) { console.error('Error fetching counts:', err); setStatusCountsLoading(false) }
        }
        fetchCounts()

        if (isFiltered && totalCount === 0) {
          const fetchTotal = async () => {
            try {
              let tq = supabase.from('job_applications').select('id', { count: 'exact', head: true }).neq('status', 'rejected')
              if (userJobIds && userJobIds.length > 0) tq = tq.in('job_id', userJobIds)
              const { count } = await tq
              setTotalCount(count || 0)
            } catch (err) { console.error('Error fetching total count:', err) }
          }
          fetchTotal()
        }
      }
    } catch (error: any) {
      const errorMessage = error?.message || error?.code || 'Unknown error'
      console.error('Error fetching applications:', errorMessage, error)
      
      // Handle specific timeout error
      if (error?.code === '57014' || errorMessage?.includes('timeout') || errorMessage?.includes('canceling statement')) {
        toast.error('Query timeout - Loading most recent applications only')
        // Fallback: simple query without join, then enrich with job data
        try {
          const { data: limitedData, error: fallbackError } = await supabase
            .from('job_applications')
            .select('id, job_id, full_name, email, phone, resume_url, cover_letter, status, created_at')
            .neq('status', 'rejected')
            .order('created_at', { ascending: false })
            .limit(25)
          
          if (fallbackError) {
            console.error('Fallback query error:', fallbackError)
            throw fallbackError
          }
          
          if (limitedData) {
            // Enrich with job info from already-loaded jobs or fetch minimal job data
            const jobIds = [...new Set(limitedData.map(a => a.job_id))]
            const { data: jobsData } = await supabase
              .from('jobs')
              .select('id, title, department')
              .in('id', jobIds)
            const jobMap = new Map((jobsData || []).map(j => [j.id, j]))
            const transformedLimitedData: JobApplication[] = limitedData.map((app: any) => ({
              ...app,
              job: jobMap.get(app.job_id) || undefined
            }))
            setApplications(transformedLimitedData)
            setStatusCounts({
              pending: transformedLimitedData.filter(app => app.status === 'pending').length,
              reviewed: transformedLimitedData.filter(app => app.status === 'reviewed').length,
              shortlisted: transformedLimitedData.filter(app => app.status === 'shortlisted').length,
              rejected: 0,
              hired: transformedLimitedData.filter(app => app.status === 'hired').length
            })
            setTotalCount(transformedLimitedData.length)
            setFilteredCount(transformedLimitedData.length)
            setCurrentPage(1)
            setStatusCountsLoading(false)
            toast.success('Loaded recent applications')
            return
          }
        } catch (fallbackError: any) {
          console.error('Fallback query also failed:', fallbackError?.message || fallbackError)
        }
      }
      
      // Show user-friendly error message
      const displayMessage = errorMessage === 'Unknown error' 
        ? 'Failed to load applications. Please try again.'
        : `Failed to load applications: ${errorMessage}`
      toast.error(displayMessage)
    } finally {
      setLoading(false)
      setFiltering(false)
    }
  }

  const goToPage = (page: number) => {
    const totalPages = Math.ceil(filteredCount / PAGE_SIZE) || 1
    if (page < 1 || page > totalPages) return
    setFiltering(true)
    setApplications([])
    fetchApplications(page)
  }

  const fetchJobs = async () => {
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Use cached role if available, otherwise fetch
      let userRole: string | null = null
      if (userRoleCache.current && userRoleCache.current.userId === user.id) {
        userRole = userRoleCache.current.role
      } else {
        const { data: roleData } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .single()
        userRole = roleData?.role || null
        if (roleData) {
          userRoleCache.current = { userId: user.id, role: roleData.role }
        }
      }

      // Fetch both active and inactive jobs (for dropdown)
      if (userRole === 'super_admin') {
        const { data: jobsData, error: jobsError } = await supabase
          .from('jobs')
          .select('id, title, department, status')
          .order('title', { ascending: true })
        
        if (jobsError) throw jobsError
        if (jobsData) {
          setJobs(jobsData)
          jobsData.forEach(j => jobMapCache.current.set(j.id, j))
        }
      } else {
        const { data: createdJobs } = await supabase
          .from('jobs')
          .select('id, title, department, status')
          .eq('created_by', user.id)
          .order('title', { ascending: true })
        
        const { data: assignedJobs } = await supabase
          .from('jobs')
          .select('id, title, department, status')
          .eq('assigned_to', user.id)
          .order('title', { ascending: true })
        
        const allJobs = [...(createdJobs || []), ...(assignedJobs || [])]
        const uniqueJobs = allJobs.filter((job, index, self) =>
          index === self.findIndex((j) => j.id === job.id)
        )
        const sorted = uniqueJobs.sort((a, b) => a.title.localeCompare(b.title))
        setJobs(sorted)
        sorted.forEach(j => jobMapCache.current.set(j.id, j))
      }
    } catch (error) {
      console.error('Error fetching jobs:', error)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this application? This action cannot be undone.')) return

    try {
      // First find the application to get the resume URL
      const application = applications.find(app => app.id === id)
      if (application) {
        // Delete the resume file from storage
        const resumeFileName = application.resume_url.split('/').pop()
        if (resumeFileName) {
          const { error: storageError } = await supabase
            .storage
            .from('resumes')
            .remove([`public/${resumeFileName}`])

          if (storageError) {
            console.error('Error deleting resume file:', storageError)
          }
        }
      }

      // Then delete the application record
      const { error } = await supabase
        .from('job_applications')
        .delete()
        .eq('id', id)

      if (error) throw error

      // Update local state
      const deletedApp = applications.find(app => app.id === id)
      setApplications(applications.filter(app => app.id !== id))
      
      // Update counts
      setTotalCount(prev => Math.max(0, prev - 1))
      setFilteredCount(prev => Math.max(0, prev - 1))
      
      // Update status counts if we know the deleted app's status
      if (deletedApp) {
        const status = deletedApp.status as keyof typeof statusCounts
        if (status in statusCounts) {
          setStatusCounts(prev => ({
            ...prev,
            [status]: Math.max(0, prev[status] - 1)
          }))
        }
      }
      
      toast.success('Application deleted successfully')
    } catch (error) {
      console.error('Error deleting application:', error)
      toast.error('Failed to delete application')
    }
  }

  const applyStatusChange = async (
    applicationId: string,
    newStatus: string,
    previousStatus: keyof typeof statusCounts
  ) => {
    try {
      const res = await fetch(`/api/admin/applications/${applicationId}/status`, {
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

      // When rejected, remove from list (default view excludes rejected) and update counts
      if (newStatus === 'rejected') {
        setApplications(prev => prev.filter(a => a.id !== applicationId))
        setStatusCounts(prev => ({
          ...prev,
          ...(previousStatus in prev && { [previousStatus]: Math.max(0, prev[previousStatus] - 1) }),
          rejected: (prev.rejected || 0) + 1
        }))
        setTotalCount(prev => Math.max(0, prev - 1))
        setFilteredCount(prev => Math.max(0, prev - 1))
      } else {
        setApplications(prev =>
          prev.map(a => (a.id === applicationId ? { ...a, status: newStatus } : a))
        )
        setStatusCounts(prev => ({
          ...prev,
          ...(previousStatus in prev && { [previousStatus]: Math.max(0, prev[previousStatus] - 1) }),
          ...(newStatus in prev && { [newStatus]: prev[newStatus as keyof typeof prev] + 1 })
        }))
      }
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

  const handleStatusChange = async (applicationId: string, newStatus: string) => {
    const app = applications.find(a => a.id === applicationId)
    if (!app) return
    const previousStatus = app.status as keyof typeof statusCounts

    if (newStatus === 'rejected') {
      setRejectDialogPayload({ applicationId, newStatus, previousStatus })
      setRejectDialogOpen(true)
      return
    }

    await applyStatusChange(applicationId, newStatus, previousStatus)
  }

  const handleRejectConfirm = async () => {
    if (!rejectDialogPayload) return
    const { applicationId, newStatus, previousStatus } = rejectDialogPayload
    setRejectDialogOpen(false)
    setRejectDialogPayload(null)
    await applyStatusChange(applicationId, newStatus, previousStatus as keyof typeof statusCounts)
  }

  const handleDownloadResume = async (url: string, fullName: string) => {
    try {
      let fileExt = 'pdf';
      let fileName = fullName.replace(/\s+/g, '_') + '_resume';
      let downloadUrl: string;
      let blob: Blob;

      if (url.startsWith('data:')) {
        // Base64 file
        const match = url.match(/^data:(.*?);/);
        if (match) {
          const mime = match[1];
          if (mime === 'application/pdf') fileExt = 'pdf';
          else if (mime === 'application/msword') fileExt = 'doc';
          else if (mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') fileExt = 'docx';
          else fileExt = 'bin';
        }
        downloadUrl = url;
      } else {
        // Storage file
        const path = url;
        const extMatch = path.match(/\.([a-zA-Z0-9]+)$/);
        if (extMatch) fileExt = extMatch[1];
        // Fetch the file as blob
        const response = await fetch(url);
        blob = await response.blob();
        downloadUrl = window.URL.createObjectURL(blob);
      }
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `${fileName}.${fileExt}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      if (!url.startsWith('data:')) {
        window.URL.revokeObjectURL(downloadUrl);
      }
      toast.success('Resume download started');
    } catch (error) {
      console.error('Error downloading resume:', error);
      toast.error('Failed to download resume');
    }
  }

    const handlePreviewResume = async (url: string, fullName: string) => {
    try {
      console.log('Original resume URL:', url);
      
      // Handle base64 encoded files
      if (url.startsWith('data:')) {
        console.log('Processing base64 file...');
        try {
          // Extract the base64 data and MIME type
          const [mimepart, base64Data] = url.split(',');
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
            const fileName = `${fullName.replace(/\s+/g, '_')}_resume.${fileExt}`;
            
            // Create HTML preview page
            const htmlContent = `
              <!DOCTYPE html>
              <html>
                <head>
                  <title>Resume Preview - ${fullName}</title>
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
                      <h2>${fullName}</h2>
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
            // Other file types - try direct view
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
      
      if (url.startsWith('http')) {
        // Full URL - open directly
        window.open(url, '_blank');
        toast.success('Resume opened in new tab');
        return;
      }
      
      // For storage paths, try public URL approach
      let filePath = url;
      if (filePath.startsWith('/')) {
        filePath = filePath.substring(1);
      }
      
      console.log('Processed file path:', filePath);
      
      // Try getting public URL from resumes bucket
      const { data: publicUrlData } = supabase.storage
        .from('resumes')
        .getPublicUrl(filePath);
      
      if (publicUrlData?.publicUrl) {
        console.log('Public URL:', publicUrlData.publicUrl);
        window.open(publicUrlData.publicUrl, '_blank');
        toast.success('Resume opened in new tab');
        return;
      }
      
      // Try getting public URL from applications bucket
      const { data: publicUrlData2 } = supabase.storage
        .from('applications')
        .getPublicUrl(filePath);
      
      if (publicUrlData2?.publicUrl) {
        console.log('Public URL from applications:', publicUrlData2.publicUrl);
        window.open(publicUrlData2.publicUrl, '_blank');
        toast.success('Resume opened in new tab');
        return;
      }
      
      throw new Error('Unable to generate preview URL');
      
    } catch (error) {
      console.error('Error previewing resume:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast.error(`Failed to preview resume: ${errorMessage}`);
    }
  }

  const getStatusBadgeVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (status.toLowerCase()) {
      case 'pending':
        return 'outline'
      case 'reviewed':
        return 'secondary'
      case 'shortlisted':
        return 'default'
      case 'rejected':
        return 'destructive'
      case 'hired':
        return 'default'
      default:
        return 'default'
    }
  }

  const filteredApplications = applications.filter(application => {
    const matchesSearch = 
      application.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      application.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      application.job?.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      application.job?.department?.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesStatus = statusFilter === "all" || application.status === statusFilter
    const matchesJob = jobFilter === "active" || jobFilter === "inactive" || application.job_id === jobFilter

    return matchesSearch && matchesStatus && matchesJob
  })

  // Group applications by job
  const groupedApplications = filteredApplications.reduce((acc, application) => {
    const jobTitle = application.job?.title || 'Unknown Position'
    const jobId = application.job_id
    
    if (!acc[jobId]) {
      acc[jobId] = {
        job: application.job || { id: jobId, title: jobTitle, department: 'Unknown' },
        applications: []
      }
    }
    
    acc[jobId].applications.push(application)
    return acc
  }, {} as Record<string, { job: Job, applications: JobApplication[] }>)

  const getApplicationStats = () => {
    const isFiltered = (jobFilter !== "active" && jobFilter !== "inactive") || statusFilter !== "all"
    return {
      total: isFiltered ? filteredCount : totalCount,
      pending: statusCounts.pending,
      reviewed: statusCounts.reviewed,
      shortlisted: statusCounts.shortlisted,
      rejected: statusCounts.rejected,
      hired: statusCounts.hired,
    }
  }

  const totalPages = Math.ceil(filteredCount / PAGE_SIZE) || 1

  const handleSignOut = async () => {
    try {
      clearPermissionsCache()
      const { error } = await supabase.auth.signOut()
      if (error) {
        console.error('Sign out error:', error)
      }
      
      // Clear any local storage
      localStorage.removeItem('supabase.auth.token')
      
      // Force redirect to login page
      window.location.href = '/admin/login'
    } catch (error) {
      console.error("Error signing out:", error)
      // Force redirect anyway
      window.location.href = '/admin/login'
    }
  }

  const renderApplicationRow = (application: JobApplication) => (
    <TableRow key={application.id}>
      <TableCell>
        {format(new Date(application.created_at), 'MMM d, yyyy')}
      </TableCell>
      <TableCell className="font-medium">{application.full_name}</TableCell>
      <TableCell>
        <div>
          <div className="font-medium">{application.job?.title || 'N/A'}</div>
          {application.job?.department && (
            <div className="text-sm text-gray-500">{application.job.department}</div>
          )}
        </div>
      </TableCell>
      <TableCell>{application.email}</TableCell>
      <TableCell>
        <Badge variant={getStatusBadgeVariant(application.status)}>
          {application.status}
        </Badge>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePreviewResume(application.resume_url, application.full_name)}
          >
            <Eye className="h-4 w-4 mr-1" />
            Preview
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleDownloadResume(application.resume_url, application.full_name)}
          >
            <Download className="h-4 w-4 mr-1" />
            Download
          </Button>
        </div>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <Select
            value={application.status}
            onValueChange={(value) => handleStatusChange(application.id, value)}
            disabled={application.status === 'rejected'}
          >
            <SelectTrigger className="w-[120px] h-8">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="reviewed">Reviewed</SelectItem>
              <SelectItem value="shortlisted">Shortlisted</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
              <SelectItem value="hired">Hired</SelectItem>
            </SelectContent>
          </Select>
          <Link href={`/admin/applications/${application.id}`}>
            <Button variant="outline" size="sm">
              <Eye className="h-4 w-4" />
            </Button>
          </Link>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleDelete(application.id)}
          >
            <Trash2 className="h-4 w-4 text-red-500" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  )

  // Check if user has applications permission
  if (permissionsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2 text-sm text-gray-600">Loading permissions...</p>
        </div>
      </div>
    )
  }

  if (!hasPermission('applications')) {
    return (
      <UnauthorizedAccess 
        requiredPermission="applications"
        currentUserRole={userRole?.role}
      />
    )
  }

  if (loading) {
    return (
      <AdminDashboardLayout onSignOut={handleSignOut}>
        <div className="flex items-center justify-center min-h-screen">
          <div className="flex flex-col items-center gap-2">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#2B1C48] border-t-transparent"></div>
            <p className="text-sm text-gray-600">Loading applications...</p>
          </div>
        </div>
      </AdminDashboardLayout>
    )
  }

  const stats = getApplicationStats()

  return (
    <AdminDashboardLayout onSignOut={handleSignOut}>
      <div className="p-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold">Job Applications</h1>
            <p className="text-sm text-gray-500">
              {userRole?.role === 'super_admin' 
                ? 'You can view applications for all job posts from all admins'
                : 'You can only view applications for job posts you have created'
              }
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
              <Input
                placeholder="Search applications..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
            <Select
              value={jobFilter === "active" || jobs.some(j => j.status === "active" && j.id === jobFilter) ? jobFilter : "active"}
              onValueChange={(v) => setJobFilter(v)}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="All Active Jobs" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">All Active Jobs</SelectItem>
                {jobs.filter(j => j.status === "active").map((job) => (
                  <SelectItem key={job.id} value={job.id}>
                    {job.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={jobFilter === "inactive" || jobs.some(j => j.status === "inactive" && j.id === jobFilter) ? jobFilter : "inactive"}
              onValueChange={(v) => setJobFilter(v)}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="All Inactive Jobs" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="inactive">All Inactive Jobs</SelectItem>
                {jobs.filter(j => j.status === "inactive").map((job) => (
                  <SelectItem key={job.id} value={job.id}>
                    {job.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="reviewed">Reviewed</SelectItem>
                <SelectItem value="shortlisted">Shortlisted</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="hired">Hired</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant={viewMode === "table" ? "default" : "outline"}
              onClick={() => setViewMode("table")}
            >
              Table View
            </Button>
            <Button
              variant={viewMode === "grouped" ? "default" : "outline"}
              onClick={() => setViewMode("grouped")}
            >
              Grouped by Job
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total</CardTitle>
            </CardHeader>
            <CardContent>
              {filtering ? (
                <div className="flex items-center gap-1 h-8">
                  <div className="w-2 h-2 rounded-full bg-gray-900 animate-bounce" style={{ animationDelay: '0ms', animationDuration: '1.4s' }}></div>
                  <div className="w-2 h-2 rounded-full bg-gray-900 animate-bounce" style={{ animationDelay: '200ms', animationDuration: '1.4s' }}></div>
                  <div className="w-2 h-2 rounded-full bg-gray-900 animate-bounce" style={{ animationDelay: '400ms', animationDuration: '1.4s' }}></div>
                </div>
              ) : (
                <div className="text-2xl font-bold">{stats.total}</div>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Pending</CardTitle>
            </CardHeader>
            <CardContent>
              {filtering || (statusCountsLoading && stats.pending === 0) ? (
                <div className="flex items-center gap-1 h-8">
                  <div className="w-2 h-2 rounded-full bg-yellow-600 animate-bounce" style={{ animationDelay: '0ms', animationDuration: '1.4s' }}></div>
                  <div className="w-2 h-2 rounded-full bg-yellow-600 animate-bounce" style={{ animationDelay: '200ms', animationDuration: '1.4s' }}></div>
                  <div className="w-2 h-2 rounded-full bg-yellow-600 animate-bounce" style={{ animationDelay: '400ms', animationDuration: '1.4s' }}></div>
                </div>
              ) : (
                <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Reviewed</CardTitle>
            </CardHeader>
            <CardContent>
              {filtering || (statusCountsLoading && stats.reviewed === 0) ? (
                <div className="flex items-center gap-1 h-8">
                  <div className="w-2 h-2 rounded-full bg-blue-600 animate-bounce" style={{ animationDelay: '0ms', animationDuration: '1.4s' }}></div>
                  <div className="w-2 h-2 rounded-full bg-blue-600 animate-bounce" style={{ animationDelay: '200ms', animationDuration: '1.4s' }}></div>
                  <div className="w-2 h-2 rounded-full bg-blue-600 animate-bounce" style={{ animationDelay: '400ms', animationDuration: '1.4s' }}></div>
                </div>
              ) : (
                <div className="text-2xl font-bold text-blue-600">{stats.reviewed}</div>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Shortlisted</CardTitle>
            </CardHeader>
            <CardContent>
              {filtering || (statusCountsLoading && stats.shortlisted === 0) ? (
                <div className="flex items-center gap-1 h-8">
                  <div className="w-2 h-2 rounded-full bg-green-600 animate-bounce" style={{ animationDelay: '0ms', animationDuration: '1.4s' }}></div>
                  <div className="w-2 h-2 rounded-full bg-green-600 animate-bounce" style={{ animationDelay: '200ms', animationDuration: '1.4s' }}></div>
                  <div className="w-2 h-2 rounded-full bg-green-600 animate-bounce" style={{ animationDelay: '400ms', animationDuration: '1.4s' }}></div>
                </div>
              ) : (
                <div className="text-2xl font-bold text-green-600">{stats.shortlisted}</div>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Rejected</CardTitle>
            </CardHeader>
            <CardContent>
              {filtering || (statusCountsLoading && stats.rejected === 0) ? (
                <div className="flex items-center gap-1 h-8">
                  <div className="w-2 h-2 rounded-full bg-red-600 animate-bounce" style={{ animationDelay: '0ms', animationDuration: '1.4s' }}></div>
                  <div className="w-2 h-2 rounded-full bg-red-600 animate-bounce" style={{ animationDelay: '200ms', animationDuration: '1.4s' }}></div>
                  <div className="w-2 h-2 rounded-full bg-red-600 animate-bounce" style={{ animationDelay: '400ms', animationDuration: '1.4s' }}></div>
                </div>
              ) : (
                <div className="text-2xl font-bold text-red-600">{stats.rejected}</div>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Hired</CardTitle>
            </CardHeader>
            <CardContent>
              {filtering || (statusCountsLoading && stats.hired === 0) ? (
                <div className="flex items-center gap-1 h-8">
                  <div className="w-2 h-2 rounded-full bg-purple-600 animate-bounce" style={{ animationDelay: '0ms', animationDuration: '1.4s' }}></div>
                  <div className="w-2 h-2 rounded-full bg-purple-600 animate-bounce" style={{ animationDelay: '200ms', animationDuration: '1.4s' }}></div>
                  <div className="w-2 h-2 rounded-full bg-purple-600 animate-bounce" style={{ animationDelay: '400ms', animationDuration: '1.4s' }}></div>
                </div>
              ) : (
                <div className="text-2xl font-bold text-purple-600">{stats.hired}</div>
              )}
            </CardContent>
          </Card>
        </div>

        {viewMode === "table" ? (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Position</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Resume</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredApplications.map(renderApplicationRow)}
                {filteredApplications.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      {loading || filtering ? (
                        <div className="flex flex-col items-center justify-center gap-2">
                          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#2B1C48] border-t-transparent"></div>
                          <p className="text-sm text-gray-500">Loading applications...</p>
                        </div>
                      ) : (
                        <div className="text-gray-500">
                          <p>No applications found</p>
                          {userRole?.role === 'admin' && jobs.length === 0 && (
                            <p className="text-sm mt-2">You haven't created any jobs yet. Create a job post to start receiving applications.</p>
                          )}
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
            
            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t px-4 py-3">
                <p className="text-sm text-muted-foreground">
                  Showing {((currentPage - 1) * PAGE_SIZE) + 1}–{Math.min(currentPage * PAGE_SIZE, filteredCount)} of {filteredCount}
                </p>
                <div className="flex items-center gap-1">
                  <Button variant="outline" size="sm" disabled={currentPage === 1 || filtering} onClick={() => goToPage(currentPage - 1)}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 2)
                    .reduce<(number | 'ellipsis')[]>((acc, p, i, arr) => {
                      if (i > 0 && p - (arr[i - 1] as number) > 1) acc.push('ellipsis')
                      acc.push(p)
                      return acc
                    }, [])
                    .map((item, i) =>
                      item === 'ellipsis' ? (
                        <span key={`e${i}`} className="px-2 text-muted-foreground">…</span>
                      ) : (
                        <Button
                          key={item}
                          variant={currentPage === item ? "default" : "outline"}
                          size="sm"
                          className="min-w-[36px]"
                          disabled={filtering}
                          onClick={() => goToPage(item as number)}
                        >
                          {item}
                        </Button>
                      )
                    )}
                  <Button variant="outline" size="sm" disabled={currentPage === totalPages || filtering} onClick={() => goToPage(currentPage + 1)}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedApplications).map(([jobId, { job, applications }]) => (
              <Card key={jobId}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div>
                      <div className="text-lg font-semibold">{job.title}</div>
                      <div className="text-sm text-gray-500">{job.department}</div>
                    </div>
                    <Badge variant="outline" className="ml-2">
                      {applications.length} application{applications.length !== 1 ? 's' : ''}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Resume</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {applications.map((application) => (
                        <TableRow key={application.id}>
                          <TableCell>
                            {format(new Date(application.created_at), 'MMM d, yyyy')}
                          </TableCell>
                          <TableCell className="font-medium">{application.full_name}</TableCell>
                          <TableCell>{application.email}</TableCell>
                          <TableCell>
                            <Badge variant={getStatusBadgeVariant(application.status)}>
                              {application.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handlePreviewResume(application.resume_url, application.full_name)}
                              >
                                <Eye className="h-4 w-4 mr-1" />
                                Preview
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDownloadResume(application.resume_url, application.full_name)}
                              >
                                <Download className="h-4 w-4 mr-1" />
                                Download
                              </Button>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Select
                                value={application.status}
                                onValueChange={(value) => handleStatusChange(application.id, value)}
                                disabled={application.status === 'rejected'}
                              >
                                <SelectTrigger className="w-[120px] h-8">
                                  <SelectValue placeholder="Status" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="pending">Pending</SelectItem>
                                  <SelectItem value="reviewed">Reviewed</SelectItem>
                                  <SelectItem value="shortlisted">Shortlisted</SelectItem>
                                  <SelectItem value="rejected">Rejected</SelectItem>
                                  <SelectItem value="hired">Hired</SelectItem>
                                </SelectContent>
                              </Select>
                              <Link href={`/admin/applications/${application.id}`}>
                                <Button variant="outline" size="sm">
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </Link>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDelete(application.id)}
                              >
                                <Trash2 className="h-4 w-4 text-red-500" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            ))}
            {Object.keys(groupedApplications).length === 0 && (
              <Card>
                <CardContent className="text-center py-8">
                  {loading || filtering ? (
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#2B1C48] border-t-transparent"></div>
                      <p className="text-sm text-gray-500">Loading applications...</p>
                    </div>
                  ) : (
                    <div className="text-gray-500">
                      <p>No applications found</p>
                      {userRole?.role === 'admin' && jobs.length === 0 && (
                        <p className="text-sm mt-2">You haven't created any jobs yet. Create a job post to start receiving applications.</p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
            
            {/* Pagination for Grouped View */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between bg-white rounded-lg shadow px-4 py-3">
                <p className="text-sm text-muted-foreground">
                  Showing {((currentPage - 1) * PAGE_SIZE) + 1}–{Math.min(currentPage * PAGE_SIZE, filteredCount)} of {filteredCount}
                </p>
                <div className="flex items-center gap-1">
                  <Button variant="outline" size="sm" disabled={currentPage === 1 || filtering} onClick={() => goToPage(currentPage - 1)}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 2)
                    .reduce<(number | 'ellipsis')[]>((acc, p, i, arr) => {
                      if (i > 0 && p - (arr[i - 1] as number) > 1) acc.push('ellipsis')
                      acc.push(p)
                      return acc
                    }, [])
                    .map((item, i) =>
                      item === 'ellipsis' ? (
                        <span key={`e${i}`} className="px-2 text-muted-foreground">…</span>
                      ) : (
                        <Button
                          key={item}
                          variant={currentPage === item ? "default" : "outline"}
                          size="sm"
                          className="min-w-[36px]"
                          disabled={filtering}
                          onClick={() => goToPage(item as number)}
                        >
                          {item}
                        </Button>
                      )
                    )}
                  <Button variant="outline" size="sm" disabled={currentPage === totalPages || filtering} onClick={() => goToPage(currentPage + 1)}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <AlertDialog
        open={rejectDialogOpen}
        onOpenChange={(open) => {
          setRejectDialogOpen(open)
          if (!open) setRejectDialogPayload(null)
        }}
      >
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