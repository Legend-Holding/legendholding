"use client"

import { useState, useEffect } from "react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { useRouter } from "next/navigation"
import { AdminDashboardLayout } from "@/components/admin/dashboard-layout"
import { JobsTable } from "@/components/admin/jobs-table"
import { Button } from "@/components/ui/button"
import { Plus, Loader2 } from "lucide-react"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { UnauthorizedAccess } from "@/components/admin/unauthorized-access"
import { useAdminPermissions, clearPermissionsCache } from "@/hooks/use-admin-permissions"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

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

// Helper function to convert description text to bullet points for display
const convertDescriptionToBulletPoints = (description: string | null | undefined): string[] => {
  if (!description || typeof description !== 'string') return []
  return description.split('\n').map(line => line.trim()).filter(line => line !== '')
}

// Helper function to convert bullet points back to text for storage
const convertBulletPointsToText = (bulletPoints: string[]): string => {
  return bulletPoints.join('\n')
}

export default function JobsManagement() {
  const router = useRouter()
  const supabase = createClientComponentClient()
  const { userRole, isLoading: permissionsLoading, hasPermission, isSuperAdmin } = useAdminPermissions()
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [isAddingJob, setIsAddingJob] = useState(false)
  const [isSubmittingJob, setIsSubmittingJob] = useState(false)
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([])
  const [newJob, setNewJob] = useState<Omit<Job, 'id' | 'created_at'>>({
    title: "",
    department: "",
    location: "",
    description: [],
    requirements: [],
    responsibilities: [],
    job_type: "Full-time",
    status: 'active',
    company: ""
  })
  const [requirementsText, setRequirementsText] = useState("")
  const [responsibilitiesText, setResponsibilitiesText] = useState("")
  const [descriptionText, setDescriptionText] = useState("")
  const [jobStatusTab, setJobStatusTab] = useState<'active' | 'inactive'>('active')

  useEffect(() => {
    fetchJobs()
  }, [])

  useEffect(() => {
    // Fetch admin users only when we know the user is a super admin
    if (!permissionsLoading && isSuperAdmin) {
      fetchAdminUsers()
    }
  }, [permissionsLoading, isSuperAdmin])

  const EXCLUDED_FROM_ASSIGNMENT = [
    'info@legendx.com',
    'mufeed.rahman@legendholding.com',
    'admin@legendholding.com'
  ]

  const fetchAdminUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('user_id, email, role')
        .in('role', ['admin', 'super_admin'])
        .order('email')
      
      if (error) throw error
      const filtered = (data || []).filter(u => !EXCLUDED_FROM_ASSIGNMENT.includes(u.email))
      setAdminUsers(filtered)
    } catch (error) {
      console.error('Error fetching admin users:', error)
    }
  }

  const fetchJobs = async () => {
    try {
      setLoading(true)
      
      // Get current user and role
      const userId = userRole?.user_id
      const roleData = userRole?.role ? { role: userRole.role } : null
      if (!userId || !roleData?.role) {
        toast.error('Unable to determine current admin session')
        setLoading(false)
        return
      }
      
      // The RLS policies will automatically filter jobs based on user role
      // Super admins will see all jobs, regular admins will see only their own
      let query = supabase
        .from('jobs')
        .select('*')
        .order('created_at', { ascending: false })
      
      // WORKAROUND: Explicitly filter jobs based on user role since RLS is not working
      if (roleData?.role === 'admin') {
        // Regular admins can see jobs they created OR are assigned to
        // Need to make two queries and combine results
        const { data: createdJobs, error: createdError } = await supabase
          .from('jobs')
          .select('*')
          .eq('created_by', userId)
          .order('created_at', { ascending: false })
        
        const { data: assignedJobs, error: assignedError } = await supabase
          .from('jobs')
          .select('*')
          .eq('assigned_to', userId)
          .order('created_at', { ascending: false })
        
        if (createdError) throw createdError
        if (assignedError) throw assignedError
        
        // Combine and deduplicate
        const allJobs = [...(createdJobs || []), ...(assignedJobs || [])]
        const uniqueJobs = allJobs.filter((job, index, self) =>
          index === self.findIndex((j) => j.id === job.id)
        )
        
        // Fetch user info for each job
        const jobsWithUsers = await Promise.all(
          uniqueJobs.map(async (job) => {
            let jobWithUsers = { ...job }
            
            if (job.created_by) {
              try {
                const { data: userRoleData } = await supabase
                  .from('user_roles')
                  .select('email, role')
                  .eq('user_id', job.created_by)
                  .single()
                
                if (userRoleData) {
                  jobWithUsers.created_by_user = userRoleData
                } else {
                  jobWithUsers.created_by_user = {
                    email: `User ${job.created_by.substring(0, 8)}...`,
                    role: 'admin'
                  }
                }
              } catch (error) {
                jobWithUsers.created_by_user = {
                  email: `User ${job.created_by.substring(0, 8)}...`,
                  role: 'admin'
                }
              }
            }
            
            if (job.assigned_to) {
              try {
                const { data: assignedUserData } = await supabase
                  .from('user_roles')
                  .select('email, role')
                  .eq('user_id', job.assigned_to)
                  .single()
                
                if (assignedUserData) {
                  jobWithUsers.assigned_to_user = assignedUserData
                }
              } catch (error) {
                // Silently handle
              }
            }
            
            return jobWithUsers
          })
        )
        
        // Sort by created_at descending
        jobsWithUsers.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        setJobs(jobsWithUsers)
        setLoading(false)
        return
      }
      // Super admins see all jobs (no additional filter needed)
      
      const { data: jobsData, error } = await query

      if (error) throw error
      
      // Fetch user information for each job
      const jobsWithUsers = await Promise.all(
        (jobsData || []).map(async (job) => {
          let jobWithUsers = { ...job }
          
          // Fetch created_by user info
          if (job.created_by) {
            try {
              const { data: userRoleData } = await supabase
                .from('user_roles')
                .select('email, role')
                .eq('user_id', job.created_by)
                .single()
              
              if (userRoleData) {
                jobWithUsers.created_by_user = userRoleData
              } else {
                jobWithUsers.created_by_user = {
                  email: `User ${job.created_by.substring(0, 8)}...`,
                  role: 'admin'
                }
              }
            } catch (error) {
              jobWithUsers.created_by_user = {
                email: `User ${job.created_by.substring(0, 8)}...`,
                role: 'admin'
              }
            }
          }
          
          // Fetch assigned_to user info
          if (job.assigned_to) {
            try {
              const { data: assignedUserData } = await supabase
                .from('user_roles')
                .select('email, role')
                .eq('user_id', job.assigned_to)
                .single()
              
              if (assignedUserData) {
                jobWithUsers.assigned_to_user = assignedUserData
              }
            } catch (error) {
              // Silently handle - assigned_to_user will be undefined
            }
          }
          
          return jobWithUsers
        })
      )
      
      setJobs(jobsWithUsers)
    } catch (error) {
      console.error('Error fetching jobs:', error)
      console.error('Error details:', JSON.stringify(error, null, 2))
      toast.error(`Failed to fetch jobs: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setLoading(false)
    }
  }

  const validateJob = () => {
    if (!newJob.title.trim()) {
      toast.error("Job title is required")
      return false
    }
    if (!newJob.department.trim()) {
      toast.error("Department is required")
      return false
    }
    if (!newJob.location.trim()) {
      toast.error("Location is required")
      return false
    }
    if (!newJob.company.trim()) {
      toast.error("Company name is required")
      return false
    }
    return true
  }

  const handleAddJob = async () => {
    try {
      if (!validateJob()) return

      // Prevent multiple submissions
      setIsSubmittingJob(true)

      // Get current user to set as created_by
      const userId = userRole?.user_id
      if (!userId) {
        toast.error("You must be logged in to create a job")
        setIsSubmittingJob(false)
        return
      }

      const description = descriptionText
        .split("\n")
        .map((desc) => desc.trim())
        .filter((desc) => desc !== "");

      const requirements = requirementsText
        .split("\n")
        .map((req) => req.trim())
        .filter((req) => req !== "");

      const responsibilities = responsibilitiesText
        .split("\n")
        .map((resp) => resp.trim())
        .filter((resp) => resp !== "");

      // Create the job data object
      const jobData = {
        title: newJob.title ?? '',
        department: newJob.department ?? '',
        location: newJob.location ?? '',
        description: description,
        status: newJob.status ?? 'active',
        job_type: newJob.job_type ?? 'Full-time',
        requirements: requirements,
        responsibilities: responsibilities,
        company: newJob.company ?? '',
        created_by: userId
      }

      const { data, error } = await supabase
        .from('jobs')
        .insert([jobData])
        .select()



      if (error) {
        throw error
      }

      toast.success("Job posted successfully")
      setIsAddingJob(false)
      setNewJob({
        title: "",
        department: "",
        location: "",
        description: [],
        requirements: [],
        responsibilities: [],
        job_type: "Full-time",
        status: 'active',
        company: ""
      })
      setDescriptionText("")
      setRequirementsText("")
      setResponsibilitiesText("")
      fetchJobs()
    } catch (error: any) {
      toast.error(`Failed to post job: ${error.message || 'An unknown error occurred'}`)
    } finally {
      setIsSubmittingJob(false)
    }
  }

  const handleUpdateJob = async (id: string, data: Partial<Job>) => {
    try {
      // Format the data properly for database update
      const updateData: any = {
        title: data.title,
        department: data.department,
        location: data.location,
        status: data.status,
        job_type: data.job_type,
        company: data.company,
        // Convert arrays to JSON strings for database storage
        description: Array.isArray(data.description) ? data.description : [],
        requirements: Array.isArray(data.requirements) ? data.requirements : [],
        responsibilities: Array.isArray(data.responsibilities) ? data.responsibilities : [],
      }

      // Remove undefined/null values to avoid database errors
      Object.keys(updateData).forEach(key => {
        if (updateData[key] === undefined || updateData[key] === null) {
          delete updateData[key]
        }
      })

      const { error } = await supabase
        .from('jobs')
        .update(updateData)
        .eq('id', id)

      if (error) {
        throw error
      }

      setJobs(prev =>
        prev.map(job =>
          job.id === id ? { ...job, ...data } : job
        )
      )
      toast.success("Job updated successfully")
    } catch (error) {
      toast.error(`Failed to update job: ${error instanceof Error ? error.message : 'Unknown error'}`)
      throw error
    }
  }

  const handleDeleteJob = async (id: string) => {
    try {
      const { error } = await supabase
        .from('jobs')
        .delete()
        .eq('id', id)

      if (error) throw error

      setJobs(prev => prev.filter(job => job.id !== id))
      toast.success("Job deleted successfully")
    } catch (error) {
      toast.error("Failed to delete job")
      throw error
    }
  }

  const handleAssignJob = async (jobId: string, adminId: string | null) => {
    try {
      const { error } = await supabase
        .from('jobs')
        .update({ assigned_to: adminId })
        .eq('id', jobId)

      if (error) throw error

      // Update local state with assigned user info
      if (adminId) {
        const assignedUser = adminUsers.find(u => u.user_id === adminId)
        setJobs(prev =>
          prev.map(job =>
            job.id === jobId
              ? {
                  ...job,
                  assigned_to: adminId,
                  assigned_to_user: assignedUser
                    ? { email: assignedUser.email, role: assignedUser.role }
                    : undefined
                }
              : job
          )
        )
      } else {
        // Unassigning
        setJobs(prev =>
          prev.map(job =>
            job.id === jobId
              ? { ...job, assigned_to: undefined, assigned_to_user: undefined }
              : job
          )
        )
      }
    } catch (error) {
      console.error('Error assigning job:', error)
      throw error
    }
  }

  const handleSignOut = async () => {
    try {
      clearPermissionsCache()
      await fetch('/api/admin/auth/logout', { method: 'POST' })
      
      // Force redirect to login page
      window.location.href = '/admin/login'
    } catch (error) {
      // Force redirect anyway
      window.location.href = '/admin/login'
    }
  }

  // Check if user has jobs permission
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

  if (!hasPermission('jobs')) {
    return (
      <UnauthorizedAccess 
        requiredPermission="jobs"
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
            <p className="text-sm text-gray-600">Loading jobs...</p>
          </div>
        </div>
      </AdminDashboardLayout>
    )
  }

  return (
    <AdminDashboardLayout onSignOut={handleSignOut}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Jobs Management</h1>
            <p className="text-sm text-gray-500">
              {userRole?.role === 'super_admin' 
                ? 'You can view and manage all job posts from all admins'
                : 'You can only view and manage job posts you have created'
              }
            </p>
          </div>
          <Button onClick={() => setIsAddingJob(true)} className="bg-[#5E366D] hover:bg-[#5E366D]/90">
            <Plus className="w-4 h-4 mr-2" />
            Post New Job
          </Button>
        </div>

        <Tabs value={jobStatusTab} onValueChange={(v) => setJobStatusTab(v as 'active' | 'inactive')} className="space-y-4">
          <TabsList>
            <TabsTrigger value="active">
              Active ({jobs.filter(j => j.status === 'active').length})
            </TabsTrigger>
            <TabsTrigger value="inactive">
              Inactive ({jobs.filter(j => j.status === 'inactive').length})
            </TabsTrigger>
          </TabsList>
          <TabsContent value="active">
            <JobsTable
              jobs={jobs.filter(j => j.status === 'active')}
              loading={loading}
              onDelete={handleDeleteJob}
              onUpdate={handleUpdateJob}
              onAssign={isSuperAdmin ? handleAssignJob : undefined}
              isSuperAdmin={isSuperAdmin}
              adminUsers={adminUsers}
              currentUserId={userRole?.user_id}
            />
          </TabsContent>
          <TabsContent value="inactive">
            <JobsTable
              jobs={jobs.filter(j => j.status === 'inactive')}
              loading={loading}
              onDelete={handleDeleteJob}
              onUpdate={handleUpdateJob}
              onAssign={isSuperAdmin ? handleAssignJob : undefined}
              isSuperAdmin={isSuperAdmin}
              adminUsers={adminUsers}
              currentUserId={userRole?.user_id}
            />
          </TabsContent>
        </Tabs>
      </div>

      {/* Add Job Dialog */}
      <Dialog 
        open={isAddingJob} 
        onOpenChange={(open) => {
          // Prevent closing dialog while submitting
          if (!isSubmittingJob) {
            setIsAddingJob(open)
          }
        }}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Post New Job</DialogTitle>
            <DialogDescription>
              Fill in the required details for the new job posting. Description, responsibilities, and preferred skills are optional. If provided, enter each point on a new line - each line will become a bullet point.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="title">Job Title *</Label>
                <Input
                  id="title"
                  value={newJob.title}
                  onChange={(e) => setNewJob(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="e.g. Senior Software Engineer"
                  required
                />
              </div>
              <div>
                <Label htmlFor="company">Company *</Label>
                <Input
                  id="company"
                  value={newJob.company}
                  onChange={(e) => setNewJob(prev => ({ ...prev, company: e.target.value }))}
                  placeholder="e.g. Legend Motors"
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="department">Department *</Label>
                <Input
                  id="department"
                  value={newJob.department}
                  onChange={(e) => setNewJob(prev => ({ ...prev, department: e.target.value }))}
                  placeholder="e.g. Engineering"
                  required
                />
              </div>
              <div>
                <Label htmlFor="location">Location *</Label>
                <Input
                  id="location"
                  value={newJob.location}
                  onChange={(e) => setNewJob(prev => ({ ...prev, location: e.target.value }))}
                  placeholder="e.g. Dubai, UAE"
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="job_type">Job Type *</Label>
                <select
                  id="job_type"
                  value={newJob.job_type}
                  onChange={(e) => setNewJob(prev => ({ ...prev, job_type: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-md"
                  required
                >
                  <option value="Full-time">Full-time</option>
                  <option value="Part-time">Part-time</option>
                  <option value="Contract">Contract</option>
                </select>
              </div>
            </div>
            <div>
              <Label htmlFor="description">Job Description (optional - each line will become a paragraph)</Label>
              <Textarea
                id="description"
                value={descriptionText}
                onChange={(e) => setDescriptionText(e.target.value)}
                placeholder="Enter each description paragraph on a new line&#10;For example:&#10;Lead development of new features and innovative solutions.&#10;Collaborate with cross-functional teams to deliver high-quality products.&#10;Maintain code quality and standards throughout the development process."
                className="h-32"
              />
            </div>
            <div>
              <Label htmlFor="responsibilities">Responsibilities (optional - one per line)</Label>
              <Textarea
                id="responsibilities"
                value={responsibilitiesText}
                onChange={(e) => setResponsibilitiesText(e.target.value)}
                placeholder="Enter each responsibility on a new line"
                className="h-32"
              />
            </div>
            <div>
              <Label htmlFor="requirements">Preferred Skills (optional - one per line)</Label>
              <Textarea
                id="requirements"
                value={requirementsText}
                onChange={(e) => setRequirementsText(e.target.value)}
                placeholder="Enter each requirement on a new line"
                className="h-32"
              />
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsAddingJob(false)}
              disabled={isSubmittingJob}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleAddJob} 
              className="bg-secondary hover:bg-secondary/90"
              disabled={isSubmittingJob}
            >
              {isSubmittingJob ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Posting Job...
                </>
              ) : (
                'Post Job'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminDashboardLayout>
  )
} 