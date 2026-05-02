"use client"

import { useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { toJobSlug } from "@/lib/job-slug"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"

export default function LegacyCareerIdRedirectPage() {
  const params = useParams()
  const router = useRouter()
  const id = params?.id as string | undefined

  useEffect(() => {
    const redirect = async () => {
      if (!id) {
        router.replace("/careers/jobs")
        return
      }

      try {
        const response = await fetch(`/api/careers/jobs/${id}`)
        if (!response.ok) {
          router.replace("/careers/jobs")
          return
        }

        const job = await response.json()
        router.replace(`/careers/jobs/${toJobSlug(job.title, job.id)}`)
      } catch {
        router.replace("/careers/jobs")
      }
    }

    redirect()
  }, [id, router])

  return (
    <>
      <Header />
      <main className="pt-20 min-h-screen bg-gray-50">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#5E366D] border-t-transparent"></div>
        </div>
      </main>
      <Footer />
    </>
  )
}
