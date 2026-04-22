"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { AdminDashboardLayout } from "@/components/admin/dashboard-layout"
import { CustomerCareTable } from "@/components/admin/customer-care-table"
import { Button } from "@/components/ui/button"
import { Download } from "lucide-react"
import * as XLSX from 'xlsx'
import { toast } from "sonner"
import { ErrorBoundary, FallbackProps } from "react-error-boundary"

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

function ErrorFallback({ error, resetErrorBoundary }: FallbackProps) {
  return (
    <div className="p-4 bg-red-50 rounded-lg">
      <h2 className="text-lg font-semibold text-red-800 mb-2">Something went wrong:</h2>
      <pre className="text-sm text-red-600 whitespace-pre-wrap mb-4">{error.message}</pre>
      <Button onClick={resetErrorBoundary} variant="outline" className="text-red-600 border-red-600 hover:bg-red-50">
        Try again
      </Button>
    </div>
  )
}

export default function CustomerCareManagement() {
  const router = useRouter()
  const [complaints, setComplaints] = useState<CustomerCareComplaint[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      
      const res = await fetch('/api/admin/customer-care', { cache: 'no-store' })
      const data = await res.json().catch(() => [])
      if (!res.ok) throw new Error(data?.error || 'Failed to fetch complaints')
      setComplaints(Array.isArray(data) ? data : [])

    } catch (error) {
      console.error("Error in fetchData:", error)
      toast.error("An error occurred while fetching data")
      setComplaints([])
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteComplaint = async (id: string) => {
    try {
      setLoading(true)
      const res = await fetch(`/api/admin/customer-care/${id}`, { method: 'DELETE' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || 'Failed to delete complaint')

      setComplaints(prev => prev.filter(complaint => complaint.id !== id))
      toast.success("Complaint deleted successfully")
    } catch (error) {
      console.error("Error deleting complaint:", error)
      toast.error("Failed to delete complaint")
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateComplaint = async (id: string, data: Partial<CustomerCareComplaint>) => {
    try {
      setLoading(true)
      const res = await fetch(`/api/admin/customer-care/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body?.error || 'Failed to update complaint')

      setComplaints(prev => 
        prev.map(complaint => 
          complaint.id === id ? { ...complaint, ...data } : complaint
        )
      )
      
      // Only show toast if it's not an automatic status update to 'reviewed'
      if (data.status !== 'reviewed') {
        toast.success("Complaint updated successfully")
      }
    } catch (error) {
      console.error("Error updating complaint:", error)
      toast.error("Failed to update complaint")
    } finally {
      setLoading(false)
    }
  }

  const handleSignOut = async () => {
    await fetch('/api/admin/auth/logout', { method: 'POST' })
    router.refresh()
    router.push("/admin/login")
  }

  const exportToExcel = () => {
    try {
      const exportData = complaints.map(item => ({
        Date: new Date(item.created_at).toLocaleDateString(),
        Name: item.name,
        Email: item.email,
        Phone: item.phone,
        Company: item.company,
        Subject: item.subject,
        Message: item.message,
        Status: item.resolved ? 'Resolved' : 'Pending'
      }))

      const ws = XLSX.utils.json_to_sheet(exportData)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Customer Care Complaints')
      XLSX.writeFile(wb, 'customer_care_complaints.xlsx')
      toast.success("Data exported successfully")
    } catch (error) {
      console.error("Error exporting data:", error)
      toast.error("Failed to export data")
    }
  }

  return (
    <AdminDashboardLayout onSignOut={handleSignOut}>
      <ErrorBoundary FallbackComponent={ErrorFallback}>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-semibold">Customer Care Complaints</h1>
            <Button onClick={exportToExcel} variant="outline" className="flex items-center gap-2">
              <Download className="h-4 w-4" />
              Export to Excel
            </Button>
          </div>

          <CustomerCareTable
            complaints={complaints}
            loading={loading}
            onDelete={handleDeleteComplaint}
            onUpdate={handleUpdateComplaint}
          />
        </div>
      </ErrorBoundary>
    </AdminDashboardLayout>
  )
}


