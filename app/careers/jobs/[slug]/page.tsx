"use client"

import { useState, useEffect } from "react"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Briefcase, MapPin, Clock, ChevronLeft, Share2, Calendar, Building2, Users2 } from "lucide-react"
import { toast } from "sonner"
import Link from "next/link"
import { useParams } from "next/navigation"
import { JobApplicationForm } from "@/app/components/careers/JobApplicationForm"
import { format } from "date-fns"
import { parseJobSlug, toJobSlug } from "@/lib/job-slug"

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
  benefits?: string[]
  experience_level?: string
  team_size?: number | null
}

// Helper function to convert description text to bullet points for display
const convertDescriptionToBulletPoints = (description: string | null | undefined): string[] => {
  if (!description || typeof description !== 'string') return []
  return description.split('\n').map(line => line.trim()).filter(line => line !== '')
}

export default function JobDetails() {
  const params = useParams()
  const slug = params?.slug as string
  const jobId = slug ? parseJobSlug(slug) : ''
  const [job, setJob] = useState<Job | null>(null)
  const [loading, setLoading] = useState(true)
  const [isApplicationModalOpen, setIsApplicationModalOpen] = useState(false)
  const [similarJobs, setSimilarJobs] = useState<Job[]>([])

  useEffect(() => {
    if (!jobId) return
    fetchJobDetails()
  }, [jobId])

  const fetchJobDetails = async () => {
    try {
      setLoading(true)
      
      console.log('Fetching job with ID:', jobId)
      
      // Check if we have a valid jobId
      if (!jobId || jobId === 'undefined' || jobId === 'null') {
        console.error('Invalid job ID:', jobId)
        toast.error("Invalid job ID")
        return
      }

      // Fetch job details using API endpoint
      const response = await fetch(`/api/careers/jobs/${jobId}`)
      
      if (!response.ok) {
        const errorData = await response.json()
        console.error('API error response:', errorData)
        throw new Error(errorData.error || 'Failed to fetch job details')
      }

      const jobData = await response.json()
      
      console.log('API response - data:', jobData)

      if (!jobData) {
        console.warn('No job data returned for ID:', jobId)
        toast.error("Job not found")
        return
      }

      console.log('Raw job data:', jobData)

      const job = {
        ...jobData,
        job_type: jobData.job_type || 'Full-time',
        company: jobData.company || 'Legend Holding Group',
        requirements: Array.isArray(jobData.requirements) ? jobData.requirements : [],
        responsibilities: Array.isArray(jobData.responsibilities) ? jobData.responsibilities : [],
        benefits: Array.isArray(jobData.benefits) ? jobData.benefits : [],
        experience_level: jobData.experience_level || '',
        team_size: jobData.team_size || null
      }

      console.log('Processed job data:', job)
      setJob(job)

      // Fetch similar jobs using API endpoint
      const similarResponse = await fetch('/api/careers/jobs')
      
      if (similarResponse.ok) {
        const allJobs = await similarResponse.json()
        const similarJobsData = allJobs
          .filter((j: any) => j.department === job.department && j.id !== job.id)
          .slice(0, 3)
        
        setSimilarJobs(similarJobsData)
      } else {
        console.error('Error fetching similar jobs:', await similarResponse.text())
      }

    } catch (error) {
      console.error('Error in fetchJobDetails:', error)
      console.error('Error type:', typeof error)
      console.error('Error constructor:', error?.constructor?.name)
      
      // Try to get more specific error information
      if (error && typeof error === 'object') {
        console.error('Error keys:', Object.keys(error))
        console.error('Error stringified:', JSON.stringify(error, null, 2))
      }
      
      toast.error("Failed to fetch job details")
    } finally {
      setLoading(false)
    }
  }

  const handleShare = async () => {
    try {
      await navigator.share({
        title: `Job Opening: ${job?.title}`,
        text: `Check out this job opportunity: ${job?.title} at Legend`,
        url: window.location.href
      })
    } catch (error) {
      // Fallback to copying to clipboard
      navigator.clipboard.writeText(window.location.href)
      toast.success("Link copied to clipboard!")
    }
  }

  if (loading) {
    return (
      <>
        <Header hideHeader={isApplicationModalOpen} />
        <main className="pt-20 min-h-screen bg-gray-50">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="flex flex-col items-center gap-2">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#5E366D] border-t-transparent"></div>
              <p className="text-sm text-gray-600">Loading job details...</p>
            </div>
          </div>
        </main>
        <Footer />
      </>
    )
  }

  if (!job) {
    return (
      <>
        <Header hideHeader={isApplicationModalOpen} />
        <main className="pt-20 min-h-screen bg-gray-50">
          <div className="container mx-auto px-4 py-12">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-gray-900 mb-4">Job Not Found</h1>
              <p className="text-gray-600 mb-8">The job posting you're looking for doesn't exist or has been removed.</p>
              <Link href="/careers/jobs">
                <Button className="bg-[#5E366D] hover:bg-[#5E366D]/90 text-white">
                  View All Jobs
                </Button>
              </Link>
            </div>
          </div>
        </main>
        <Footer />
      </>
    )
  }

  return (
    <>
      <Header hideHeader={isApplicationModalOpen} />
      <main className="pt-20 bg-gray-50">
        {/* Hero Section */}
        <div className="bg-[#5E366D] text-white py-12 sm:py-16 relative overflow-hidden">
          {/* Background Pattern */}
          
          
          <div className="container mx-auto px-4 relative z-10">
            <Link 
              href="/careers/jobs"
              className="inline-flex items-center text-white/80 hover:text-white mb-4 sm:mb-6 transition-colors text-sm sm:text-base"
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Back to Jobs
            </Link>
            
            <div className="max-w-4xl">
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3 sm:mb-4 leading-tight">{job.title}</h1>
              <p className="text-lg sm:text-xl md:text-2xl text-white/90 mb-4 sm:mb-6">{job.company}</p>
              <div className="flex flex-wrap gap-3 sm:gap-6 text-white/90 mb-6 sm:mb-8 text-sm sm:text-base">
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 sm:h-5 sm:w-5" />
                  <span>{job.department}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 sm:h-5 sm:w-5" />
                  <span>{job.location}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 sm:h-5 sm:w-5" />
                  <span>{job.job_type}</span>
                </div>
                {job.experience_level && (
                  <div className="flex items-center gap-2">
                    <Briefcase className="h-4 w-4 sm:h-5 sm:w-5" />
                    <span>{job.experience_level}</span>
                  </div>
                )}
                {job.team_size && (
                  <div className="flex items-center gap-2">
                    <Users2 className="h-4 w-4 sm:h-5 sm:w-5" />
                    <span>Team Size: {job.team_size}</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 sm:h-5 sm:w-5" />
                  <span>Posted {format(new Date(job.created_at), 'MMMM d, yyyy')}</span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                <Button
                  onClick={() => setIsApplicationModalOpen(true)}
                  className="bg-[#EE8900] hover:bg-[#EE8900]/90 text-white px-6 sm:px-8 py-2.5 text-sm sm:text-base"
                  size="lg"
                >
                  Apply Now
                </Button>
                <Button
                  variant="outline"
                  onClick={handleShare}
                  className="bg-white/10 hover:bg-white/20 text-white border-white/20 text-sm sm:text-base"
                >
                  <Share2 className="w-4 h-4 mr-2" />
                  Share
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="container mx-auto px-4 py-8 sm:py-12">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
            {/* Left Column - Job Details */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 md:p-8 space-y-6 sm:space-y-8">
                {/* Job Description */}
                {Array.isArray(job.description) && job.description.length > 0 && (
                  <section>
                    <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 mb-3 sm:mb-4">Job Description</h2>
                    <div className="space-y-2 sm:space-y-3">
                      {job.description.map((description, index) => (
                        <div key={index} className="flex gap-2 sm:gap-3 text-gray-600 text-sm sm:text-base">
                          <span className="break-words">{description}</span>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {/* Responsibilities */}
                {Array.isArray(job.responsibilities) && job.responsibilities.length > 0 && (
                  <section>
                    <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 mb-3 sm:mb-4">Responsibilities</h2>
                    <ul className="space-y-2 sm:space-y-3">
                      {job.responsibilities.map((responsibility, index) => (
                        <li key={index} className="flex gap-2 sm:gap-3 text-gray-600 text-sm sm:text-base">
                          <span className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-[#EE8900] mt-2"></span>
                          <span className="break-words">{responsibility}</span>
                        </li>
                      ))}
                    </ul>
                  </section>
                )}

                {/* Requirements */}
                {Array.isArray(job.requirements) && job.requirements.length > 0 && (
                  <section>
                    <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 mb-3 sm:mb-4">Preferred Skills</h2>
                    <ul className="space-y-2 sm:space-y-3">
                      {job.requirements.map((requirement, index) => (
                        <li key={index} className="flex gap-2 sm:gap-3 text-gray-600 text-sm sm:text-base">
                          <span className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-[#EE8900] mt-2"></span>
                          <span className="break-words">{requirement}</span>
                        </li>
                      ))}
                    </ul>
                  </section>
                )}

                {/* Benefits */}
                {job.benefits && job.benefits.length > 0 && (
                  <section>
                    <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 mb-3 sm:mb-4">Benefits</h2>
                    <ul className="space-y-2 sm:space-y-3">
                      {job.benefits.map((benefit, index) => (
                        <li key={index} className="flex gap-2 sm:gap-3 text-gray-600 text-sm sm:text-base">
                          <span className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-[#EE8900] mt-2"></span>
                          <span className="break-words">{benefit}</span>
                        </li>
                      ))}
                    </ul>
                  </section>
                )}

                {/* Bottom Apply Button */}
                <section className="pt-6 sm:pt-8 border-t border-gray-200">
                  <div className="flex justify-center">
                    <Button
                      onClick={() => setIsApplicationModalOpen(true)}
                      className="bg-[#EE8900] hover:bg-[#EE8900]/90 text-white px-6 sm:px-8 py-2.5 sm:py-3 text-sm sm:text-lg font-medium w-full sm:w-auto"
                      size="lg"
                    >
                      Apply for this Position
                    </Button>
                  </div>
                </section>
              </div>
            </div>

            {/* Right Column - Similar Jobs */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6">
                <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4 sm:mb-6">Similar Jobs</h2>
                {similarJobs.length > 0 ? (
                  <div className="space-y-4 sm:space-y-6">
                    {similarJobs.map((similarJob) => (
                      <Link 
                        key={similarJob.id}
                        href={`/careers/jobs/${toJobSlug(similarJob.title, similarJob.id)}`}
                        className="block p-3 sm:p-4 rounded-lg border border-gray-100 hover:border-[#5E366D] transition-colors"
                      >
                        <h3 className="font-medium text-gray-900 mb-2 text-sm sm:text-base">{similarJob.title}</h3>
                        <div className="space-y-1 sm:space-y-2 text-xs sm:text-sm text-gray-600">
                          <div className="flex items-center gap-2">
                            <Building2 className="h-3 w-3 sm:h-4 sm:w-4" />
                            <span>{similarJob.department}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <MapPin className="h-3 w-3 sm:h-4 sm:w-4" />
                            <span>{similarJob.location}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Clock className="h-3 w-3 sm:h-4 sm:w-4" />
                            <span>{similarJob.job_type}</span>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-600 text-center py-4 text-sm sm:text-base">No similar jobs found</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
      
      {job && (
        <JobApplicationForm
          jobId={job.id}
          jobTitle={job.title}
          company={job.company}
          isOpen={isApplicationModalOpen}
          onClose={() => setIsApplicationModalOpen(false)}
        />
      )}
    </>
  )
}
