"use client"

import type React from "react"
import { useState, useRef, useEffect, Suspense } from "react"
import { motion } from "framer-motion"
import {
  FileText,
  Upload,
  CheckCircle,
  X,
  File,
  Eye,
  Calendar,
  Trash2,
  Loader2,
} from "lucide-react"
import { toast } from "sonner"
import { getUserById } from '@/lib/workflow-users'
import { Badge } from "@/components/ui/badge"
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

function WorkflowForm() {
  const [userInfo, setUserInfo] = useState({
    name: "",
    email: "",
    department: "",
  })
  const [formData, setFormData] = useState({
    subject: "",
    message: "",
  })

  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [uploadedFiles, setUploadedFiles] = useState<Array<{
    file: File
    fileName: string
    fileUrl: string
    fileType: string
    fileSize: number
    uploadProgress: number
    isUploading: boolean
    storagePath?: string
  }>>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formStep, setFormStep] = useState(0)
  const [errors, setErrors] = useState({
    subject: "",
    message: "",
  })
  const fileInputRef = useRef<HTMLInputElement>(null)

  // User submissions state
  const [userSubmissions, setUserSubmissions] = useState<any[]>([])
  const [loadingSubmissions, setLoadingSubmissions] = useState(false)
  const [selectedSubmission, setSelectedSubmission] = useState<any | null>(null)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [submissionToDelete, setSubmissionToDelete] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [hasValidId, setHasValidId] = useState(false)

  // Get user info from URL parameter (id)
  useEffect(() => {
    const userId = new URLSearchParams(window.location.search).get('id') || ''
    
    if (!userId) {
      setHasValidId(false)
      return
    }
    
    const user = getUserById(userId)
    
    if (!user) {
      setHasValidId(false)
      return
    }
    
    setUserInfo({
      name: user.name,
      email: user.email,
      department: user.department,
    })
    setHasValidId(true)
  }, [])

  // Fetch user submissions when email is available
  useEffect(() => {
    if (userInfo.email) {
      fetchUserSubmissions()
    }
  }, [userInfo.email])

  const fetchUserSubmissions = async () => {
    try {
      setLoadingSubmissions(true)
      const response = await fetch(`/api/workflow?email=${encodeURIComponent(userInfo.email)}`)
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch submissions')
      }

      setUserSubmissions(result.data || [])
    } catch (error) {
      console.error("Error fetching user submissions:", error)
      // Don't show error toast for user submissions, just log it
    } finally {
      setLoadingSubmissions(false)
    }
  }

  const allowedFileTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  ]

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

    // Validate and convert each file to base64 for DB storage
    for (const file of files) {
      // Validate file type
      if (!allowedFileTypes.includes(file.type)) {
        toast.error(`${file.name}: Invalid file type. Only PDF, DOC, DOCX, XLS, XLSX, PPT, and PPTX files are allowed.`)
        continue
      }

      // Base64 payloads should stay reasonably small
      const maxSize = 10 * 1024 * 1024 // 10MB
      if (file.size > maxSize) {
        toast.error(`${file.name}: File size must be less than 10MB`)
        continue
      }

      // Add file to state with uploading status
      const fileId = `${file.name}-${Date.now()}-${Math.random()}`
      setUploadedFiles(prev => [...prev, {
        file,
        fileName: file.name,
        fileUrl: '',
        fileType: file.type || '',
        fileSize: file.size,
        uploadProgress: 0,
        isUploading: true,
      }])

      try {
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = () => resolve(String(reader.result || ""))
          reader.onerror = () => reject(new Error("Failed to read file"))
          reader.readAsDataURL(file)
        })

        setUploadedFiles(prev => prev.map(f =>
          f.file === file
            ? {
                ...f,
                fileUrl: base64,
                uploadProgress: 100,
                isUploading: false,
              }
            : f
        ))

        toast.success(`${file.name} attached successfully`)
      } catch (error: any) {
        console.error(`Error processing ${file.name}:`, error)
        toast.error(`Failed to process ${file.name}: ${error.message}`)
        // Remove failed file from state
        setUploadedFiles(prev => prev.filter(f => f.file !== file))
      }
    }

    // Reset input to allow selecting the same file again
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleRemoveFile = async (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index))
    toast.success('File removed')
  }

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  const validateForm = () => {
    const newErrors = {
      subject: "",
      message: "",
    }

    // Validate user info from URL parameter
    if (!userInfo.name.trim() || !userInfo.email.trim()) {
      toast.error("Invalid form link. Please use a valid personalized link.")
      return false
    }

    if (!validateEmail(userInfo.email)) {
      toast.error("Invalid email address in the form link")
      return false
    }

    if (!formData.subject.trim()) {
      newErrors.subject = "Subject is required"
    }

    if (!formData.message.trim()) {
      newErrors.message = "Message is required"
    }

    setErrors(newErrors)
    return !Object.values(newErrors).some(error => error !== "")
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      toast.error("Please fill in all required fields correctly")
      return
    }

    // Check if all files are uploaded
    const filesStillUploading = uploadedFiles.some(f => f.isUploading)
    if (filesStillUploading) {
      toast.error("Please wait for all files to finish uploading")
      return
    }

    // Check if there are any files
    if (uploadedFiles.length === 0) {
      toast.error("Please upload at least one file")
      return
    }

    setIsSubmitting(true)

    try {
      // Prepare file data from already uploaded files
      const filesData = uploadedFiles.map(f => ({
        fileName: f.fileName,
        fileUrl: f.fileUrl,
        fileType: f.fileType,
        fileSize: f.fileSize,
      }))

      // Send form data with file URLs (files are already uploaded)
      const response = await fetch('/api/workflow', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: userInfo.name,
          email: userInfo.email,
          subject: formData.subject,
          message: formData.message,
          files: filesData,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit form')
      }

      // Clear form and show success message
      setFormData({
        subject: "",
        message: "",
      })
      setErrors({
        subject: "",
        message: "",
      })
      setUploadedFiles([])
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
      
      toast.success("Document submitted successfully!")
      setFormStep(1)
      // Refresh user submissions after successful submission
      if (userInfo.email) {
        fetchUserSubmissions()
      }
    } catch (error: any) {
      console.error("Error submitting form:", error)
      toast.error(error.message || "Failed to submit document. Please try again later.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const resetForm = () => {
    setFormData({
      subject: "",
      message: "",
    })
    setErrors({
      subject: "",
      message: "",
    })
    setSelectedFiles([])
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
    setFormStep(0)
    // Refresh submissions when resetting form
    if (userInfo.email) {
      fetchUserSubmissions()
    }
  }

  const formatFileSize = (bytes: number) => {
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

  const handleViewSubmission = (submission: any) => {
    setSelectedSubmission(submission)
    setIsViewDialogOpen(true)
  }

  const handleDeleteSubmission = async () => {
    if (!submissionToDelete || !userInfo.email) return

    try {
      setIsDeleting(true)
      
      const response = await fetch(`/api/workflow?id=${submissionToDelete}&email=${encodeURIComponent(userInfo.email)}`, {
        method: 'DELETE',
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to delete submission')
      }

      // Remove from local state
      setUserSubmissions(prev => prev.filter(submission => submission.id !== submissionToDelete))
      toast.success("Submission deleted successfully")
      setIsDeleteDialogOpen(false)
      setSubmissionToDelete(null)
      setIsViewDialogOpen(false)
    } catch (error: any) {
      console.error("Error deleting submission:", error)
      toast.error(error.message || "Failed to delete submission")
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <>
      <main className="min-h-screen bg-slate-100">
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
          <div className="max-w-4xl mx-auto text-white text-center">
            <h1 className="text-4xl sm:text-5xl font-bold mb-4 text-[#EE8900]">Annual Plan Approval</h1>
            <p className="text-lg sm:text-xl text-white/95">
              Please upload your annual plan and budget for the year 2026
            </p>
          </div>
        </div>
      </div>

      {/* Main Submission Section */}
      <section className="py-16 px-4 sm:px-6">
          <div className="max-w-4xl mx-auto">

            <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-lg">
              {!hasValidId ? (
                // Disabled state when no valid ID parameter
                <div className="text-center py-12 px-4">
                  <div className="max-w-md mx-auto">
                    <div className="w-20 h-20 mx-auto mb-6 bg-gray-100 rounded-full flex items-center justify-center">
                      <FileText className="w-10 h-10 text-gray-400" />
                    </div>
                    <h2 className="text-2xl font-bold text-[#2B1C48] mb-3">
                      Personalized Link Required
                    </h2>
                    <p className="text-gray-600 mb-6 leading-relaxed">
                      This form requires a personalized access link to submit your annual plan. 
                      Please use the unique link provided to you to access this form.
                    </p>
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-left">
                      <p className="text-sm font-semibold text-blue-900 mb-2">
                        <span className="inline-block w-5 h-5 bg-blue-500 text-white rounded-full text-xs flex items-center justify-center mr-2">!</span>
                        How to access this form:
                      </p>
                      <ul className="text-sm text-blue-800 space-y-2 ml-7">
                        <li className="flex items-start">
                          <span className="mr-2">•</span>
                          <span>Use the personalized link sent to you via email</span>
                        </li>
                        <li className="flex items-start">
                          <span className="mr-2">•</span>
                          <span>Contact your administrator if you haven't received your link</span>
                        </li>
                        <li className="flex items-start">
                          <span className="mr-2">•</span>
                          <span>The link should include your unique identifier (id parameter)</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              ) : formStep === 0 ? (
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* User Info Display (from URL parameters) */}
                  {userInfo.name && userInfo.email && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: 0, duration: 0.5 }}
                      className="bg-blue-50 border border-blue-200 rounded-lg p-4"
                    >
                      <p className="text-sm font-semibold text-[#5D376E] mb-2">Submitting as:</p>
                      <p className="text-[#2B1C48]"><strong>Name:</strong> {userInfo.name}</p>
                      {userInfo.department && (
                        <p className="text-[#2B1C48]"><strong>Department:</strong> {userInfo.department}</p>
                      )}
                      <p className="text-[#2B1C48]"><strong>Email:</strong> {userInfo.email}</p>
                    </motion.div>
                  )}

                  {/* Subject Field */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.05, duration: 0.5 }}
                  >
                    <label htmlFor="subject" className="block text-sm font-semibold text-[#5D376E] mb-2">
                      Submission <span className="text-red-600">*</span>
                    </label>
                    <input
                      type="text"
                      id="subject"
                      name="subject"
                      value={formData.subject}
                      onChange={handleChange}
                      placeholder="Enter document subject"
                      className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-[#EE8900] focus:border-transparent transition-all duration-200 ${
                        errors.subject ? 'border-red-500' : 'border-gray-200'
                      }`}
                    />
                    {errors.subject && (
                      <p className="mt-1 text-sm text-red-600">{errors.subject}</p>
                    )}
                  </motion.div>

                  {/* Message Field */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.1, duration: 0.5 }}
                  >
                    <label htmlFor="message" className="block text-sm font-semibold text-[#5D376E] mb-2">
                      Comments <span className="text-red-600">*</span>
                    </label>
                    <textarea
                      id="message"
                      name="message"
                      value={formData.message}
                      onChange={handleChange}
                      placeholder="Enter your message or description"
                      rows={6}
                      className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-[#EE8900] focus:border-transparent transition-all duration-200 resize-none ${
                        errors.message ? 'border-red-500' : 'border-gray-200'
                      }`}
                    />
                    {errors.message && (
                      <p className="mt-1 text-sm text-red-600">{errors.message}</p>
                    )}
                  </motion.div>

                  {/* File Upload Field */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.15, duration: 0.5 }}
                  >
                    <label className="block text-sm font-semibold text-[#5D376E] mb-2">
                      Upload Documents  {uploadedFiles.length > 0 && `(${uploadedFiles.length} file${uploadedFiles.length > 1 ? 's' : ''})`}
                    </label>
                    
                    <div className="space-y-3">
                      {/* Upload area - always shown */}
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-[#EE8900] transition-colors duration-200">
                        <input
                          ref={fileInputRef}
                          type="file"
                          onChange={handleFileSelect}
                          accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
                          className="hidden"
                          id="file-upload"
                          multiple
                          disabled={uploadedFiles.some(f => f.isUploading)}
                        />
                        <label
                          htmlFor="file-upload"
                          className={`cursor-pointer flex flex-col items-center ${uploadedFiles.some(f => f.isUploading) ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          <Upload className="w-10 h-10 text-[#EE8900] mb-2" />
                          <span className="text-[#2B1C48] font-medium mb-1">
                            {uploadedFiles.some(f => f.isUploading) ? 'Uploading files...' : 'Click to upload multiple files'}
                          </span>
                          <span className="text-sm text-gray-500">
                            PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX (max 100MB each)
                          </span>
                        </label>
                      </div>

                      {/* Uploaded files list */}
                      {uploadedFiles.length > 0 && (
                        <div className="space-y-2">
                          {uploadedFiles.map((fileData, index) => (
                            <div key={`${fileData.fileName}-${index}`} className="border border-gray-200 rounded-lg p-3 bg-gray-50">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3 min-w-0 flex-1">
                                  <div className={`w-10 h-10 ${fileData.isUploading ? 'bg-blue-100' : fileData.fileUrl ? 'bg-green-100' : 'bg-[#EE8900] bg-opacity-10'} rounded-lg flex items-center justify-center flex-shrink-0`}>
                                    {fileData.isUploading ? (
                                      <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                                    ) : fileData.fileUrl ? (
                                      <CheckCircle className="w-5 h-5 text-green-600" />
                                    ) : (
                                      <File className="w-5 h-5 text-[#EE8900]" />
                                    )}
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <p className="text-sm font-medium text-[#2B1C48] truncate">
                                      {fileData.fileName}
                                    </p>
                                    <div className="flex items-center gap-2">
                                      <p className="text-xs text-gray-500">
                                        {formatFileSize(fileData.fileSize)}
                                      </p>
                                      {fileData.isUploading && (
                                        <>
                                          <span className="text-xs text-blue-600">•</span>
                                          <span className="text-xs text-blue-600">{Math.round(fileData.uploadProgress)}%</span>
                                        </>
                                      )}
                                      {fileData.fileUrl && !fileData.isUploading && (
                                        <>
                                          <span className="text-xs text-green-600">•</span>
                                          <span className="text-xs text-green-600">Uploaded</span>
                                        </>
                                      )}
                                    </div>
                                    {fileData.isUploading && (
                                      <div className="mt-1 w-full bg-gray-200 rounded-full h-1.5">
                                        <div 
                                          className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
                                          style={{ width: `${fileData.uploadProgress}%` }}
                                        />
                                      </div>
                                    )}
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveFile(index)}
                                  disabled={fileData.isUploading}
                                  className="p-1 hover:bg-gray-200 rounded-full transition-colors flex-shrink-0 ml-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                  title={fileData.isUploading ? "Uploading..." : "Remove file"}
                                >
                                  <X className="w-5 h-5 text-gray-500 hover:text-red-600" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </motion.div>

                  {/* Submit Button */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.2, duration: 0.5 }}
                  >
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className={`
                        w-full bg-[#F08900] hover:bg-[#d67a00] text-white py-4 rounded-lg
                        transition-all duration-200 font-semibold text-lg flex items-center justify-center gap-2
                        ${isSubmitting ? "opacity-70 cursor-not-allowed" : ""}
                      `}
                    >
                      {isSubmitting ? (
                        <>
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          Submitting...
                        </>
                      ) : (
                        <>
                          <FileText className="w-5 h-5" />
                          Submit Documents
                        </>
                      )}
                    </button>
                  </motion.div>
                </form>
              ) : (
                <div className="text-center py-12">
                  <div className="flex justify-center mb-6">
                    <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center">
                      <CheckCircle className="w-10 h-10 text-green-600" />
                    </div>
                  </div>
                  <h3 className="text-3xl font-semibold text-[#2B1C48] mb-3">Document Submitted Successfully!</h3>
                  <p className="text-lg text-gray-600 mb-8">
                    Your document has been received and will be processed shortly.
                  </p>
                  <button
                    onClick={resetForm}
                    className="inline-flex items-center justify-center gap-2 px-8 py-3 bg-[#F08900] text-white font-semibold rounded-lg hover:bg-[#d67a00] transition-colors duration-300"
                  >
                    Submit Another Document
                  </button>
                </div>
              )}
            </div>

            {/* Information Section - Only show when valid ID */}
            {hasValidId && (
              <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-[#5D376E] mb-3">Important Information</h3>
                <ul className="space-y-2 text-[#2B1C48]">
                  <li className="flex items-start gap-2">
                    <span className="text-[#EE8900] mt-1">•</span>
                    <span>All submitted documents are securely stored and encrypted</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#EE8900] mt-1">•</span>
                    <span>Maximum file size is 100MB per file</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#EE8900] mt-1">•</span>
                    <span>Supported formats: PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX</span>
                  </li>
                </ul>
              </div>
            )}

            {/* User Submissions Section */}
            {hasValidId && userInfo.email && (
              <div className="mt-12 bg-white rounded-2xl p-6 sm:p-8 shadow-lg">
                <h2 className="text-2xl font-bold text-[#5D376E] mb-6">Your Submissions</h2>
                
                {loadingSubmissions ? (
                  <div className="text-center py-8">
                    <div className="w-8 h-8 border-4 border-[#EE8900] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading your submissions...</p>
                  </div>
                ) : userSubmissions.length === 0 ? (
                  <div className="text-center py-8">
                    <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">No submissions yet. Submit your first document above.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {userSubmissions.map((submission) => (
                      <div
                        key={submission.id}
                        className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="text-lg font-semibold text-[#2B1C48] truncate flex-1">
                                {submission.subject}
                              </h3>
                              <div className="flex-shrink-0">
                                {getStatusBadge(submission.status)}
                              </div>
                            </div>
                            <div className="flex items-center gap-4 text-xs text-gray-500">
                              <span className="flex items-center gap-1">
                                <Calendar className="w-4 h-4" />
                                {new Date(submission.created_at).toLocaleDateString()}
                              </span>
                              {submission.files && submission.files.length > 0 && (
                                <span className="flex items-center gap-1">
                                  <File className="w-4 h-4" />
                                  {submission.files.length} file{submission.files.length > 1 ? 's' : ''}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <button
                              onClick={() => handleViewSubmission(submission)}
                              className="flex items-center gap-2 px-4 py-2 bg-[#5D376E] text-white rounded-lg hover:bg-[#4a2c5a] transition-colors"
                            >
                              <Eye className="w-4 h-4" />
                              View
                            </button>
                            <button
                              onClick={() => {
                                setSubmissionToDelete(submission.id)
                                setIsDeleteDialogOpen(true)
                              }}
                              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </section>
      </main>

      {/* View Submission Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Submission Details</DialogTitle>
            <DialogDescription>
              Submitted on {selectedSubmission && new Date(selectedSubmission.created_at).toLocaleString()}
            </DialogDescription>
          </DialogHeader>
          {selectedSubmission && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-semibold text-[#2B1C48]">Subject</label>
                  <p className="mt-1 text-[#2B1C48]">{selectedSubmission.subject}</p>
                </div>
                <div>
                  <label className="text-sm font-semibold text-[#2B1C48]">Status</label>
                  <div className="mt-1">{getStatusBadge(selectedSubmission.status)}</div>
                </div>
              </div>
              
              <div>
                <label className="text-sm font-semibold text-[#2B1C48]">Comments</label>
                <p className="mt-1 text-[#2B1C48] whitespace-pre-wrap">{selectedSubmission.message}</p>
              </div>
              
              {selectedSubmission.files && selectedSubmission.files.length > 0 && (
                <div>
                  <label className="text-sm font-semibold text-[#2B1C48]">
                    Attached Files ({selectedSubmission.files.length})
                  </label>
                  <div className="mt-2 space-y-2">
                    {selectedSubmission.files.map((file: any, index: number) => (
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
              This action cannot be undone. This will permanently delete the submission and its associated files.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteSubmission}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

export default function WorkflowPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen bg-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-[#EE8900] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading form...</p>
        </div>
      </main>
    }>
      <WorkflowForm />
    </Suspense>
  )
}
