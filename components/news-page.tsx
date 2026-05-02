"use client"

import { useState, useEffect, useRef } from "react"
import {
  BookmarkIcon,
  CalendarIcon,
  ChevronRight,
  Clock,
  Facebook,
  Instagram,
  Linkedin,
  Search,
  Share2,
  Twitter,
  ArrowRight,
  ChevronLeft,
  Loader2,
  CheckCircle,
} from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { cn } from "@/lib/utils"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { PageBanner } from "@/components/page-banner"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { toast } from "sonner"
import { getNewsArticleSlug } from "@/lib/news-slug"

interface NewsArticleImage {
  id: string
  article_id: string
  image_url: string
  image_order: number
  image_type: 'banner' | 'content'
  alt_text?: string
  caption?: string
  created_at: string
}

interface NewsArticle {
  id: string
  slug?: string | null
  created_at: string
  publication_date: string
  title: string
  excerpt: string
  content: string
  image_url: string
  category: string
  author: string
  read_time: string
  is_featured: boolean
  published: boolean
  images?: NewsArticleImage[]
}

export function NewsPage() {
  const [featuredArticle, setFeaturedArticle] = useState<NewsArticle | null>(null)
  const [allArticles, setAllArticles] = useState<NewsArticle[]>([])
  const [currentCarouselIndex, setCurrentCarouselIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [showAllMobile, setShowAllMobile] = useState(false)
  
  // Newsletter subscription state
  const [email, setEmail] = useState("")
  const [isSubscribing, setIsSubscribing] = useState(false)
  const [subscriptionSuccess, setSubscriptionSuccess] = useState(false)
  const [subscriptionError, setSubscriptionError] = useState("")
  
  const articlesPerPage = 3
  const carouselRef = useRef<HTMLDivElement>(null)

  // Helper function to get display image for an article
  const getDisplayImage = (article: NewsArticle) => {
    if (article.images && article.images.length > 0) {
      // Try to find a banner image first
      const bannerImage = article.images.find(img => img.image_type === 'banner')
      if (bannerImage) {
        return { src: bannerImage.image_url, alt: bannerImage.alt_text || article.title }
      }
      // Otherwise use the first image
      return { src: article.images[0].image_url, alt: article.images[0].alt_text || article.title }
    }
    // Fallback to legacy image_url
    return { src: article.image_url || "/placeholder.svg", alt: article.title }
  }



  useEffect(() => {
    fetchArticles()
  }, [])

  const fetchArticlesWithRetry = async (retries = 3, delay = 1000) => {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const response = await fetch('/api/news')
        if (!response.ok) {
          if (attempt < retries) {
            await new Promise(resolve => setTimeout(resolve, delay))
            delay *= 2
            continue
          }
          throw new Error('Failed to fetch articles')
        }

        const payload = await response.json()
        const allArticlesData = payload.articles || []

        return allArticlesData || []
        
      } catch (error) {
        // If it's a network error and we have retries left, retry
        if (attempt < retries && (
          error instanceof TypeError && error.message.includes('fetch') ||
          error instanceof Error && (error.message.includes('network') || error.message.includes('timeout'))
        )) {
          console.warn(`Attempt ${attempt} failed with network error, retrying in ${delay}ms:`, {
            message: error instanceof Error ? error.message : 'Unknown error'
          })
          await new Promise(resolve => setTimeout(resolve, delay))
          delay *= 2 // Exponential backoff
          continue
        }
        
        throw error
      }
    }
  }

  const fetchArticles = async () => {
    try {
      const allArticles = await fetchArticlesWithRetry()
      
      if (!allArticles) {
        return
      }

      const articlesWithImages = allArticles

      // Set the manually selected featured article, or the latest one if none is featured
      const featuredArticles = articlesWithImages.filter(article => article.is_featured)
      const featuredArticle = featuredArticles.length > 0 
        ? featuredArticles[0] 
        : articlesWithImages.length > 0 
          ? articlesWithImages[0] // Use the latest article if no featured article exists
          : null
      
      setFeaturedArticle(featuredArticle)

      // Set all articles for the carousel (excluding the current featured article to avoid duplication)
      const currentFeaturedId = featuredArticle ? featuredArticle.id : null
      const articlesForCarousel = articlesWithImages.filter(article => article.id !== currentFeaturedId)
      setAllArticles(articlesForCarousel)
    } catch (error) {
      console.error("Error fetching articles:", {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      })
      toast.error("Failed to load articles")
    } finally {
      setLoading(false)
    }
  }

  const handleTransitionEnd = () => {
    setIsTransitioning(false)
  }

  const nextPage = () => {
    if (isTransitioning) return
    const maxIndex = Math.max(0, allArticles.length - articlesPerPage)
    if (currentCarouselIndex < maxIndex) {
      setIsTransitioning(true)
      setCurrentCarouselIndex(prev => prev + articlesPerPage)
    }
  }

  const prevPage = () => {
    if (isTransitioning) return
    if (currentCarouselIndex > 0) {
      setIsTransitioning(true)
      setCurrentCarouselIndex(prev => Math.max(0, prev - articlesPerPage))
    }
  }

  const handlePageChange = (newIndex: number) => {
    if (isTransitioning) return
    setIsTransitioning(true)
    setCurrentCarouselIndex(newIndex)
  }

  const toggleMobileView = () => {
    setShowAllMobile(!showAllMobile)
  }

  const handleShare = async (e: React.MouseEvent, article: NewsArticle) => {
    e.preventDefault()
    e.stopPropagation()
    try {
      const shareUrl = `${window.location.origin}/news/${getNewsArticleSlug(article)}`
      if (navigator.share) {
        await navigator.share({
          title: article.title,
          text: article.excerpt,
          url: shareUrl,
        })
      } else {
        await navigator.clipboard.writeText(shareUrl)
        toast.success("Link copied to clipboard")
      }
    } catch (err) {
      try {
        const fallbackUrl = `${window.location.origin}/news/${getNewsArticleSlug(article)}`
        await navigator.clipboard.writeText(fallbackUrl)
        toast.success("Link copied to clipboard")
      } catch {
        toast.error("Failed to share this article")
      }
    }
  }

  const handleNewsletterSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubscribing(true)
    setSubscriptionError("")
    setSubscriptionSuccess(false)

    try {
      const response = await fetch("/api/admin/newsletters", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to subscribe")
      }

      setSubscriptionSuccess(true)
      setEmail("")
    } catch (err) {
      setSubscriptionError(err instanceof Error ? err.message : "Failed to subscribe")
    } finally {
      setIsSubscribing(false)
    }
  }

  // Get current set of articles for carousel
  const currentArticles = allArticles.slice(currentCarouselIndex, currentCarouselIndex + articlesPerPage)
  const totalPages = Math.ceil(allArticles.length / articlesPerPage)

  // Calculate transform for smooth carousel transition
  const translateX = -(currentCarouselIndex * (100 / articlesPerPage))

  // Get articles for mobile view
  const mobileArticles = showAllMobile ? allArticles : allArticles.slice(0, 3)

  // Calculate the actual number of carousel pages (considering 3 cards per page)
  const actualCarouselPages = Math.ceil(allArticles.length / articlesPerPage)
  
  // Calculate the current page index for pagination dots
  const currentPageIndex = Math.floor(currentCarouselIndex / articlesPerPage)

  if (loading) {
    return (
      <>
        <Header />
        <div className="min-h-screen bg-[#f8f9fa] pt-20">
          <div className="container mx-auto px-4 py-8">
            <div className="flex items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#5E366D] border-t-transparent"></div>
            </div>
          </div>
        </div>
        <Footer />
      </>
    )
  }

  return (
    <>
      <Header />
      <main className="pt-20">
        <PageBanner 
          title="Newsroom"
          imageUrl="https://cdn.legendholding.com/images/cloudinary/cloudinary_683ea90f29b708.04231409_20250603_074935.jpg"
        />

        {/* Main Content */}
        <div className="min-h-screen bg-[#f8f9fa]">
          <main className="container mx-auto px-4 py-8 md:px-6">
            <div className="mb-12">
              <div className="grid gap-8 md:grid-cols-[2fr_1fr]">
                {/* Featured News */}
                {featuredArticle ? (
                  <Link
                    href={`/news/${getNewsArticleSlug(featuredArticle)}`}
                    className="relative overflow-hidden rounded-xl bg-white shadow-md hover:shadow-xl transition-all duration-300 block group"
                  >
                    <div className="relative h-[300px] w-full md:h-[400px]">
                      {(() => {
                        const displayImage = getDisplayImage(featuredArticle)
                        return (
                          <Image
                            src={displayImage.src}
                            alt={displayImage.alt}
                            fill
                            className="object-cover group-hover:scale-105 transition-transform duration-500"
                            priority
                            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 66vw, 50vw"
                            quality={85}
                            placeholder="blur"
                            blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWGRkqGx0f/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrLcNM91BF5pX2HaH9bcfaSXWGaRmknyJckliyjqTzSlT54b6bk+h0R//2Q=="
                          />
                        )
                      })()}
                    </div>
                    <div className="p-6">
                      <div className="mb-3 flex items-center gap-3">
                        <div className="flex items-center text-sm text-gray-500">
                          <CalendarIcon className="mr-1 h-4 w-4" />
                          {new Date(featuredArticle.publication_date).toLocaleDateString()}
                        </div>
                        <div className="flex items-center text-sm text-gray-500">
                          <Clock className="mr-1 h-4 w-4" />
                          {featuredArticle.read_time}
                        </div>
                      </div>
                      <h2 className="mb-3 text-2xl font-bold md:text-3xl group-hover:text-[#5E366D] transition-colors">{featuredArticle.title}</h2>
                      <p className="mb-4 text-gray-600">{featuredArticle.excerpt}</p>
                      <div className="flex items-center justify-between">
                        <div className="text-[#F39200] font-medium flex items-center">
                          Read More
                          <ArrowRight className="ml-1 h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-full"
                            onClick={(e) => featuredArticle && handleShare(e, featuredArticle)}
                          >
                            <Share2 className="h-4 w-4" />
                            <span className="sr-only">Share</span>
                          </Button>
                        </div>
                      </div>
                    </div>
                  </Link>
                ) : (
                  <div className="flex h-[500px] items-center justify-center rounded-xl bg-white">
                    <p className="text-gray-500">No featured article available</p>
                  </div>
                )}

                {/* Newsletter & Latest News */}
                <div className="flex flex-col gap-8">
                  <div className="rounded-xl bg-gradient-to-br from-[#5E366D] to-[#3d2147] p-6 text-white shadow-md">
                    <h3 className="mb-2 text-xl font-bold">Stay Updated</h3>
                    <p className="mb-4 text-sm opacity-90">
                      Subscribe to our newsletter to get the latest news delivered to your inbox.
                    </p>
                    <form onSubmit={handleNewsletterSubmit} className="flex flex-col gap-3">
                      <Input
                        type="email"
                        placeholder="Your email address"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        disabled={isSubscribing || subscriptionSuccess}
                        className="border-0 bg-white/20 text-white placeholder:text-white/70"
                      />
                      <Button 
                        type="submit"
                        disabled={isSubscribing || subscriptionSuccess}
                        className="bg-[#F08900] text-white hover:bg-[#d67a00] flex items-center justify-center"
                      >
                        {isSubscribing ? (
                          <>
                            <Loader2 size={16} className="animate-spin mr-2" />
                            Subscribing...
                          </>
                        ) : subscriptionSuccess ? (
                          <>
                            <CheckCircle size={16} className="mr-2" />
                            Subscribed!
                          </>
                        ) : (
                          "Subscribe Now"
                        )}
                      </Button>
                      {subscriptionError && (
                        <p className="text-red-300 text-sm">{subscriptionError}</p>
                      )}
                    </form>
                  </div>

                  <div className="rounded-xl bg-white p-6 shadow-md">
                    <h3 className="mb-6 text-xl font-bold">Latest News</h3>
                    <div className="divide-y divide-gray-100">
                      {mobileArticles.map((article, index) => (
                        <div key={article.id} className="py-4 first:pt-0 last:pb-0">
                          <div className="flex gap-4">
                            <div className="relative w-24 h-24 flex-shrink-0 overflow-hidden rounded-lg">
                              {(() => {
                                const displayImage = getDisplayImage(article)
                                return (
                                  <Image 
                                    src={displayImage.src} 
                                    alt={displayImage.alt}
                                    fill
                                    className="object-cover"
                                    loading="lazy"
                                    sizes="96px"
                                    quality={85}
                                    placeholder="blur"
                                    blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWGRkqGx0f/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrLcNM91BF5pX2HaH9bcfaSXWGaRmknyJckliyjqTzSlT54b6bk+h0R//2Q=="
                                  />
                                )
                              })()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <Link href={`/news/${getNewsArticleSlug(article)}`}>
                                <h4 className="font-medium leading-tight mb-2 line-clamp-2 hover:text-[#5E366D] transition-colors">
                                  {article.title}
                                </h4>
                              </Link>
                              <p className="text-xs text-gray-500 mb-2">
                                {new Date(article.publication_date).toLocaleDateString()} • {article.read_time}
                              </p>
                              <Link 
                                href={`/news/${getNewsArticleSlug(article)}`}
                                className="inline-flex items-center text-sm font-medium text-[#5E366D] hover:text-[#3d2147] transition-colors"
                              >
                                Read More
                                <ChevronRight className="w-4 h-4 ml-1" />
                              </Link>
                            </div>
                          </div>
                        </div>
                      ))}
                      {mobileArticles.length === 0 && (
                        <div className="py-4 text-center text-gray-500">
                          No articles available
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <Separator className="my-8" />

            {/* All News */}
            <div>
              <div className="mb-6">
                <h2 className="text-2xl font-bold">All News</h2>
              </div>

              {currentArticles.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-xl">
                  <p className="text-gray-500">No articles available</p>
                </div>
              ) : (
                <>
                  {/* Mobile View */}
                  <div className="block md:hidden">
                    <div className="grid grid-cols-1 gap-6">
                      {mobileArticles.map((article) => (
                        <Link
                          key={article.id}
                          href={`/news/${getNewsArticleSlug(article)}`}
                          className="bg-[rgb(234,226,214)]/20 rounded-lg overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 flex flex-col h-full group relative block"
                        >
                          <div 
                            className="absolute inset-0 bg-gradient-to-br from-[rgb(234,226,214)]/50 to-white opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-lg"
                            aria-hidden="true"
                          />
                          <div className="relative h-48 overflow-hidden">
                            {(() => {
                              const displayImage = getDisplayImage(article)
                              return (
                                <Image 
                                  src={displayImage.src} 
                                  alt={displayImage.alt} 
                                  fill 
                                  className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-500"
                                  loading="lazy"
                                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                                  quality={85}
                                  placeholder="blur"
                                  blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWGRkqGx0f/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrLcNM91BF5pX2HaH9bcfaSXWGaRmknyJckliyjqTzSlT54b6bk+h0R//2Q=="
                                />
                              )
                            })()}
                          </div>
                          <div className="p-5 flex flex-col flex-grow relative">
                            <div className="flex items-center text-gray-500 text-sm mb-3">
                              <CalendarIcon className="h-4 w-4 mr-1" />
                              {new Date(article.publication_date).toLocaleDateString()}
                              <Clock className="h-4 w-4 ml-3 mr-1" />
                              {article.read_time}
                            </div>
                            <h3 className="text-lg font-semibold mb-3 text-[rgb(43,28,72)] line-clamp-2">
                              {article.title}
                            </h3>
                            <p className="text-[rgb(93,55,110)] mb-4 line-clamp-3 flex-grow text-lg">
                              {article.excerpt}
                            </p>
                            <div className="flex items-center justify-between mt-auto">
                              <div className="text-[#F39200] font-medium text-sm flex items-center">
                                Read More
                                <ArrowRight className="ml-1 h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 rounded-full"
                                onClick={(e) => handleShare(e, article)}
                              >
                                <Share2 className="h-3 w-3" />
                                <span className="sr-only">Share</span>
                              </Button>
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                    
                    {/* Show More/Less Button for Mobile */}
                    {allArticles.length > 3 && (
                      <div className="flex justify-center mt-8">
                        <Button
                          onClick={toggleMobileView}
                          className="bg-[#F08900] text-white hover:bg-[#d67a00] px-8 py-3 rounded-lg font-richmond font-medium transition-all duration-300"
                        >
                          {showAllMobile ? "Show Less" : "Show More"}
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Desktop Carousel View */}
                  <div className="hidden md:block relative mb-12">
                    <div className="overflow-hidden pb-8">
                      <div
                        ref={carouselRef}
                        className="flex transition-transform duration-300 ease-out"
                        style={{
                          transform: `translateX(${translateX}%)`,
                        }}
                        onTransitionEnd={handleTransitionEnd}
                      >
                        {allArticles.map((article, index) => (
                          <div
                            key={article.id}
                            className="flex-shrink-0 px-3"
                            style={{ width: `${100 / articlesPerPage}%` }}
                          >
                            <Link
                              href={`/news/${getNewsArticleSlug(article)}`}
                              className="bg-[rgb(234,226,214)]/20 rounded-lg overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 flex flex-col h-full group relative block"
                            >
                              <div 
                                className="absolute inset-0 bg-gradient-to-br from-[rgb(234,226,214)]/50 to-white opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-lg"
                                aria-hidden="true"
                              />
                              <div className="relative h-48 overflow-hidden">
                                {(() => {
                                  const displayImage = getDisplayImage(article)
                                  return (
                                    <Image 
                                      src={displayImage.src} 
                                      alt={displayImage.alt} 
                                      fill 
                                      className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-500"
                                      loading="lazy"
                                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                                      quality={85}
                                      placeholder="blur"
                                      blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWGRkqGx0f/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrLcNM91BF5pX2HaH9bcfaSXWGaRmknyJckliyjqTzSlT54b6bk+h0R//2Q=="
                                    />
                                  )
                                })()}
                              </div>
                              <div className="p-5 flex flex-col flex-grow relative">
                                <div className="flex items-center text-gray-500 text-sm mb-3">
                                  <CalendarIcon className="h-4 w-4 mr-1" />
                                  {new Date(article.publication_date).toLocaleDateString()}
                                  <Clock className="h-4 w-4 ml-3 mr-1" />
                                  {article.read_time}
                                </div>
                                <h3 className="text-lg font-semibold mb-3 text-[rgb(43,28,72)] line-clamp-2">
                                  {article.title}
                                </h3>
                                <p className="text-[rgb(93,55,110)] mb-4 line-clamp-3 flex-grow text-lg">
                                  {article.excerpt}
                                </p>
                                <div className="flex items-center justify-between mt-auto">
                                  <div className="text-[#F39200] font-medium text-sm flex items-center">
                                    Read More
                                    <ArrowRight className="ml-1 h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 rounded-full"
                                    onClick={(e) => handleShare(e, article)}
                                  >
                                    <Share2 className="h-3 w-3" />
                                    <span className="sr-only">Share</span>
                                  </Button>
                                </div>
                              </div>
                            </Link>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Navigation Buttons */}
                    <button
                      onClick={prevPage}
                      disabled={isTransitioning || currentCarouselIndex === 0}
                      className="absolute -left-12 top-1/2 transform -translate-y-1/2 z-10 bg-white rounded-full p-2 shadow-lg hover:shadow-xl transition-all duration-100 hover:scale-110 disabled:opacity-50 disabled:cursor-not-allowed"
                      aria-label="Previous page"
                    >
                      <ChevronLeft className="w-6 h-6 text-gray-600" />
                    </button>

                    <button
                      onClick={nextPage}
                      disabled={isTransitioning || currentCarouselIndex >= Math.max(0, allArticles.length - articlesPerPage)}
                      className="absolute -right-12 top-1/2 transform -translate-y-1/2 z-10 bg-white rounded-full p-2 shadow-lg hover:shadow-xl transition-all duration-100 hover:scale-110 disabled:opacity-50 disabled:cursor-not-allowed"
                      aria-label="Next page"
                    >
                      <ChevronRight className="w-6 h-6 text-gray-600" />
                    </button>
                  </div>

                  {/* Bottom Pagination - Desktop Only */}
                  <div className="hidden md:flex justify-center mt-8 gap-2">
                    <div className="flex items-center gap-1.5 px-3">
                      {Array.from({ length: actualCarouselPages }).map((_, index) => {
                        const isCurrentPage = currentPageIndex === index;
                        return (
                          <button
                            key={index}
                            onClick={() => handlePageChange(index * articlesPerPage)}
                            className={cn(
                              "w-2 h-2 rounded-full transition-all duration-300",
                              isCurrentPage
                                ? "bg-[#F08900] w-6"
                                : "bg-gray-300 hover:bg-gray-400"
                            )}
                            aria-label={`Go to page ${index + 1}`}
                          />
                        );
                      })}
                    </div>
                  </div>
                </>
              )}
            </div>
          </main>
        </div>
      </main>
      <Footer />
    </>
  )
}
