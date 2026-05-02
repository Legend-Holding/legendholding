"use client"

import { useState, useEffect } from "react"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Search, Briefcase, MapPin, Clock, Building2, ChevronDown, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { toJobSlug } from "@/lib/job-slug"

interface Job {
  id: string
  title: string
  department: string
  location: string
  job_type: string
  description: string
  requirements: string[]
  responsibilities: string[]
  created_at: string
  status: 'active' | 'inactive'
  company: string
}

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedDepartment, setSelectedDepartment] = useState<string>("all")
  const [selectedLocation, setSelectedLocation] = useState<string>("all")
  const [isDepartmentOpen, setIsDepartmentOpen] = useState(false)
  const [isLocationOpen, setIsLocationOpen] = useState(false)
  const router = useRouter()

  useEffect(() => {
    fetchJobs()
  }, [])

  const fetchJobs = async () => {
    try {
      setLoading(true)
      
      // Try to use the new API endpoint first (bypasses RLS)
      const response = await fetch('/api/careers/jobs')
      const jobsData = response.ok ? await response.json() : null
      if (!response.ok) {
        toast.error("Failed to fetch jobs")
        return
      }

      if (!jobsData) {
        console.warn('No jobs data returned from API')
        setJobs([])
        return
      }

      const validJobs = jobsData.map(job => ({
        ...job,
        requirements: Array.isArray(job.requirements) ? job.requirements : [],
        responsibilities: Array.isArray(job.responsibilities) ? job.responsibilities : [],
        status: job.status || 'active',
        company: job.company || ''
      }))

      setJobs(validJobs)
      
    } catch (error) {
      console.error('Error in fetchJobs:', error)
      toast.error("An unexpected error occurred while fetching jobs")
    } finally {
      setLoading(false)
    }
  }

  const departments = [...new Set(jobs.map(job => job.department))]
  const locations = [...new Set(jobs.map(job => job.location))]

  const filteredJobs = jobs.filter(job => {
    const matchesSearch = job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         job.description.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesDepartment = selectedDepartment === "all" || job.department === selectedDepartment
    const matchesLocation = selectedLocation === "all" || job.location === selectedLocation
    return matchesSearch && matchesDepartment && matchesLocation
  })

  return (
    <>
      <Header />
      <main className="pt-20 bg-gray-50">
        {/* Hero Section */}
        <div className="bg-[#2B1C48] text-white py-16">
          <div className="container mx-auto px-4">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">Open Positions</h1>
            <p className="text-lg text-white/90 max-w-2xl">
              Join our team and be part of something extraordinary. Explore opportunities across our diverse portfolio of businesses.
            </p>
          </div>
        </div>

        <div className="container mx-auto px-4 py-12">
          {/* Search and Filters - Only show if loading is false AND there are jobs */}
          {!loading && jobs.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm p-6 mb-8 border border-[#5D376E]/10">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* Search Input */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#5D376E] h-5 w-5" />
                  <input
                    type="text"
                    placeholder="Search jobs..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5D376E]/20 focus:border-[#5D376E]"
                  />
                </div>

                {/* Department Filter */}
                <div className="relative">
                  <button
                    onClick={() => {
                      setIsDepartmentOpen(!isDepartmentOpen)
                      setIsLocationOpen(false)
                    }}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5D376E]/20 focus:border-[#5D376E] text-gray-700 flex items-center justify-between"
                  >
                    <span>{selectedDepartment === "all" ? "All Departments" : selectedDepartment}</span>
                    <ChevronDown className={`h-4 w-4 transition-transform ${isDepartmentOpen ? "rotate-180" : ""}`} />
                  </button>
                  {isDepartmentOpen && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-[300px] overflow-y-auto">
                      <div className="p-2">
                        <button
                          onClick={() => {
                            setSelectedDepartment("all")
                            setIsDepartmentOpen(false)
                          }}
                          className={`w-full text-left px-3 py-2 rounded-md hover:bg-gray-100 ${
                            selectedDepartment === "all" ? "bg-[#5D376E]/10 text-[#5D376E]" : ""
                          }`}
                        >
                          All Departments
                        </button>
                        {departments.map((dept) => (
                          <button
                            key={dept}
                            onClick={() => {
                              setSelectedDepartment(dept)
                              setIsDepartmentOpen(false)
                            }}
                            className={`w-full text-left px-3 py-2 rounded-md hover:bg-gray-100 ${
                              selectedDepartment === dept ? "bg-[#5D376E]/10 text-[#5D376E]" : ""
                            }`}
                          >
                            {dept}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Location Filter */}
                <div className="relative">
                  <button
                    onClick={() => {
                      setIsLocationOpen(!isLocationOpen)
                      setIsDepartmentOpen(false)
                    }}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5D376E]/20 focus:border-[#5D376E] text-gray-700 flex items-center justify-between"
                  >
                    <span>{selectedLocation === "all" ? "All Locations" : selectedLocation}</span>
                    <ChevronDown className={`h-4 w-4 transition-transform ${isLocationOpen ? "rotate-180" : ""}`} />
                  </button>
                  {isLocationOpen && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-[300px] overflow-y-auto">
                      <div className="p-2">
                        <button
                          onClick={() => {
                            setSelectedLocation("all")
                            setIsLocationOpen(false)
                          }}
                          className={`w-full text-left px-3 py-2 rounded-md hover:bg-gray-100 ${
                            selectedLocation === "all" ? "bg-[#5D376E]/10 text-[#5D376E]" : ""
                          }`}
                        >
                          All Locations
                        </button>
                        {locations.map((loc) => (
                          <button
                            key={loc}
                            onClick={() => {
                              setSelectedLocation(loc)
                              setIsLocationOpen(false)
                            }}
                            className={`w-full text-left px-3 py-2 rounded-md hover:bg-gray-100 ${
                              selectedLocation === loc ? "bg-[#5D376E]/10 text-[#5D376E]" : ""
                            }`}
                          >
                            {loc}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Clear Filters */}
                <div>
                  <Button
                    onClick={() => {
                      setSearchQuery("")
                      setSelectedDepartment("all")
                      setSelectedLocation("all")
                    }}
                    variant="outline"
                    className="w-full border-[#5D376E] text-[#5D376E] hover:bg-[#5D376E]/5"
                  >
                    Clear Filters
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Jobs List */}
          {loading ? (
            <div className="flex items-center justify-center min-h-[400px]">
              <div className="flex flex-col items-center gap-2">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#5D376E] border-t-transparent"></div>
                <p className="text-sm text-gray-600">Loading jobs...</p>
              </div>
            </div>
          ) : filteredJobs.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-[#5D376E] mb-4">
                <Briefcase className="h-12 w-12 mx-auto" />
              </div>
              {/* Check if the original jobs array is empty or if filters are just not matching */}
              {jobs.length === 0 ? (
                <>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No open positions</h3>
                  <p className="text-gray-600">Please check back later for new opportunities.</p>
                </>
              ) : (
                <>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No jobs found</h3>
                  <p className="text-gray-600">Try adjusting your search or filters</p>
                </>
              )}
            </div>
          ) : (
            <div className="grid gap-6">
              {filteredJobs.map((job) => (
                <div 
                  key={job.id} 
                  className="bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-200 p-6 border border-transparent hover:border-[#5D376E]/20"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <h2 className="text-xl font-semibold text-[#2B1C48] mb-2 group-hover:text-[#5D376E]">{job.title}</h2>
                      <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <Building2 className="h-4 w-4 text-[#5D376E]" />
                          <span>{job.company}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Briefcase className="h-4 w-4 text-[#5D376E]" />
                          <span>{job.department}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <MapPin className="h-4 w-4 text-[#5D376E]" />
                          <span>{job.location}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4 text-[#5D376E]" />
                          <span>{job.job_type}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <Button
                        onClick={() => router.push(`/careers/jobs/${toJobSlug(job.title, job.id)}`)}
                        className="bg-[#EE8900] hover:bg-[#EE8900]/90 text-white"
                      >
                        View Details
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  )
} 