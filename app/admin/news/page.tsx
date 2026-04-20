"use client"

import { useState, useEffect } from "react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { useRouter } from "next/navigation"
import { AdminDashboardLayout } from "@/components/admin/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { ImageUpload } from "@/components/admin/ImageUpload"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { toast } from "sonner"
import { Edit2, Trash2, Plus } from "lucide-react"
import { getNextArticleSlug } from "@/lib/news-slug"
// TinyMCE removed - using simple textarea with bold support

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
  image_url: string // Keep for backward compatibility
  category: string
  author: string
  read_time: string
  is_featured: boolean
  published: boolean
  seo_title?: string
  seo_description?: string
  seo_keywords?: string

  images?: NewsArticleImage[] // New field for multiple images
}

type ImageFormData = {
  id?: string
  image_url: string
  image_order: number
  image_type: 'banner' | 'content'
  alt_text: string
  caption: string
}

type FormData = Omit<NewsArticle, 'id' | 'created_at' | 'read_time' | 'images'> & {
  read_time_minutes: number
  seo_title: string
  seo_description: string
  seo_keywords: string

  images: ImageFormData[]
}

export default function NewsManagement() {
  const [articles, setArticles] = useState<NewsArticle[]>([])
  const [loading, setLoading] = useState(true)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [editingArticle, setEditingArticle] = useState<NewsArticle | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const articlesPerPage = 10
  const router = useRouter()
  const supabase = createClientComponentClient()

  useEffect(() => {
    fetchArticles()
  }, [currentPage])

  const handleSignOut = async () => {
    try {
      await fetch('/api/admin/auth/logout', { method: 'POST' })
      router.refresh()
      router.push("/admin/login")
    } catch (error) {
      console.error('Error signing out:', error)
      toast.error('Failed to sign out')
    }
  }

  const [formData, setFormData] = useState<FormData>({
    title: "",
    excerpt: "",
    content: "",
    image_url: "",
    category: "",
    author: "",
    publication_date: new Date().toISOString().split('T')[0], // Today's date in YYYY-MM-DD format
    read_time_minutes: 5,
    is_featured: false,
    published: true,
    seo_title: "",
    seo_description: "",
    seo_keywords: "",
    images: [{
      image_url: "",
      image_order: 1,
      image_type: 'banner',
      alt_text: "",
      caption: ""
    }],
  })

  // Fetch articles via server-side API (bypasses RLS so admin sees all articles including unpublished)
  const fetchArticles = async () => {
    try {
      const res = await fetch(`/api/admin/news?page=${currentPage}&limit=${articlesPerPage}`)
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}))
        throw new Error(errBody.error || "Failed to fetch articles")
      }
      const data = await res.json()
      setArticles(data.articles || [])
      setTotalPages(Math.ceil((data.total || 0) / articlesPerPage))
    } catch (error) {
      console.error("Error fetching articles:", error)
      toast.error("Failed to load articles")
    } finally {
      setLoading(false)
    }
  }

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage)
  }

  // Add new article
  const handleAdd = async () => {
    try {
      // If this article is being set as featured, uncheck all other articles first
      if (formData.is_featured) {
        const { error: uncheckError } = await supabase
          .from("news_articles")
          .update({ is_featured: false })

        if (uncheckError) throw uncheckError
      }

      // Convert minutes to read_time format
      const read_time = `${formData.read_time_minutes} ${formData.read_time_minutes === 1 ? 'Minute' : 'Minutes'}`
      
      // Next article number: article-1, article-2, ...
      const { data: existingSlugs } = await supabase.from("news_articles").select("slug")
      const slug = getNextArticleSlug((existingSlugs || []).map((r) => r.slug))
      
      // Prepare article data (excluding images)
      const articleData = {
        title: formData.title,
        slug,
        excerpt: formData.excerpt,
        content: formData.content,
        image_url: formData.images[0]?.image_url || "", // Keep first image for backward compatibility
        category: formData.category,
        author: formData.author,
        publication_date: formData.publication_date,
        is_featured: formData.is_featured,
        published: formData.published,
        seo_title: formData.seo_title,
        seo_description: formData.seo_description,
        seo_keywords: formData.seo_keywords,
        read_time
      }

      // Insert the article
      const { data: newArticle, error } = await supabase
        .from("news_articles")
        .insert([articleData])
        .select()
        .single()

      if (error) throw error

      // Insert images into news_article_images table
      if (formData.images.length > 0) {
        const imageData = formData.images
          .filter(image => image.image_url.trim() !== "") // Only save images with URLs
          .map((image, index) => ({
            article_id: newArticle.id,
            image_url: image.image_url,
            image_order: index + 1,
            image_type: image.image_type,
            alt_text: image.alt_text || null,
            caption: image.caption || null
          }))

        console.log("Saving images for new article:", imageData)
        
        if (imageData.length > 0) {
          const { error: imageError } = await supabase
            .from("news_article_images")
            .insert(imageData)

          if (imageError) {
            console.error("Error saving images:", imageError)
            throw imageError
          }
          console.log("Images saved successfully")
        }
      }

      // Refresh the articles list to get the complete data with images
      await fetchArticles()
      setIsAddDialogOpen(false)
      setFormData({
        title: "",
        excerpt: "",
        content: "",
        image_url: "",
        category: "",
        author: "",
        publication_date: new Date().toISOString().split('T')[0],
        read_time_minutes: 5,
        is_featured: false,
        published: true,
        seo_title: "",
        seo_description: "",
        seo_keywords: "",
        images: [{
          image_url: "",
          image_order: 1,
          image_type: 'banner',
          alt_text: "",
          caption: ""
        }],
      })
      toast.success("Article added successfully")
    } catch (error) {
      console.error("Error adding article:", error)
      toast.error("Failed to add article")
    }
  }

  // Update article via server-side API (bypasses RLS so publish/unpublish works)
  const handleUpdate = async () => {
    if (!editingArticle) return

    try {
      const read_time = `${formData.read_time_minutes} ${formData.read_time_minutes === 1 ? 'Minute' : 'Minutes'}`

      let slug = editingArticle.slug?.trim() || null
      if (!slug) {
        const { data: existingSlugs } = await supabase.from("news_articles").select("slug")
        slug = getNextArticleSlug((existingSlugs || []).map((r) => r.slug))
      }

      const articleData = {
        title: formData.title,
        slug,
        excerpt: formData.excerpt,
        content: formData.content,
        image_url: formData.images[0]?.image_url || "",
        category: formData.category,
        author: formData.author,
        publication_date: formData.publication_date,
        is_featured: formData.is_featured,
        published: formData.published,
        seo_title: formData.seo_title,
        seo_description: formData.seo_description,
        seo_keywords: formData.seo_keywords,
        read_time
      }

      const res = await fetch(`/api/admin/news/${editingArticle.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(articleData),
      })

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}))
        throw new Error(errBody.error || "Failed to update article")
      }

      // Delete existing images then re-insert
      const { error: deleteError } = await supabase
        .from("news_article_images")
        .delete()
        .eq("article_id", editingArticle.id)

      if (deleteError) throw deleteError

      if (formData.images.length > 0) {
        const imageData = formData.images
          .filter(image => image.image_url.trim() !== "")
          .map((image, index) => ({
            article_id: editingArticle.id,
            image_url: image.image_url,
            image_order: index + 1,
            image_type: image.image_type,
            alt_text: image.alt_text || null,
            caption: image.caption || null
          }))

        if (imageData.length > 0) {
          const { error: imageError } = await supabase
            .from("news_article_images")
            .insert(imageData)

          if (imageError) throw imageError
        }
      }

      await fetchArticles()
      setEditingArticle(null)
      toast.success("Article updated successfully")
    } catch (error) {
      console.error("Error updating article:", error)
      toast.error(error instanceof Error ? error.message : "Failed to update article")
    }
  }

  // Delete article via server-side API
  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/news/${id}`, { method: "DELETE" })
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}))
        throw new Error(errBody.error || "Failed to delete article")
      }

      setArticles(articles.filter(article => article.id !== id))
      setDeleteConfirmId(null)
      toast.success("Article deleted successfully")
    } catch (error) {
      console.error("Error deleting article:", error)
      toast.error(error instanceof Error ? error.message : "Failed to delete article")
    }
  }

  return (
    <AdminDashboardLayout onSignOut={handleSignOut}>
      <div className="space-y-6 p-4 md:p-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">News Articles</h1>
          <div className="flex gap-2">
            <Button
              onClick={fetchArticles}
              variant="outline"
              className="border-[#5E366D] text-[#5E366D] hover:bg-[#5E366D] hover:text-white"
            >
              Refresh
            </Button>
            <Button
              onClick={() => setIsAddDialogOpen(true)}
              className="bg-[#5E366D] hover:bg-[#5E366D]/90"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Article
            </Button>
          </div>
        </div>

        {/* Articles Table */}
        <div className="space-y-4">
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Author</TableHead>
                  <TableHead>Featured</TableHead>
                  <TableHead>Published</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {articles.map((article) => (
                  <TableRow key={article.id}>
                    <TableCell className="font-medium">{article.title}</TableCell>
                    <TableCell>{article.category}</TableCell>
                    <TableCell>{article.author}</TableCell>
                    <TableCell>{article.is_featured ? "Yes" : "No"}</TableCell>
                    <TableCell>{article.published ? "Yes" : "No"}</TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            // Parse read_time to extract minutes
                            const readTimeMatch = article.read_time.match(/(\d+)/)
                            const readTimeMinutes = readTimeMatch ? parseInt(readTimeMatch[1]) : 5
                            
                            // Prepare images for editing
                            let imagesToEdit = []
                            
                            console.log("Editing article:", article.title)
                            console.log("Article.images:", article.images)
                            console.log("Article.image_url:", article.image_url)
                            
                            if (article.images && article.images.length > 0) {
                              // Use images from the new table
                              console.log(`Loading ${article.images.length} images from new table`)
                              imagesToEdit = article.images.map(img => ({
                                id: img.id,
                                image_url: img.image_url,
                                image_order: img.image_order,
                                image_type: img.image_type,
                                alt_text: img.alt_text || "",
                                caption: img.caption || ""
                              }))
                            } else if (article.image_url) {
                              // Fallback to legacy image_url if no images in new table
                              console.log("Loading legacy image_url")
                              imagesToEdit = [{
                                image_url: article.image_url,
                                image_order: 1,
                                image_type: 'banner' as 'banner' | 'content',
                                alt_text: "",
                                caption: ""
                              }]
                            } else {
                              // No images at all, provide empty template
                              console.log("No images found, using empty template")
                              imagesToEdit = [{
                                image_url: "",
                                image_order: 1,
                                image_type: 'banner' as 'banner' | 'content',
                                alt_text: "",
                                caption: ""
                              }]
                            }
                            
                            console.log("Final imagesToEdit:", imagesToEdit)

                            setFormData({
                              ...article,
                              read_time_minutes: readTimeMinutes,
                              seo_title: article.seo_title || "",
                              seo_description: article.seo_description || "",
                              seo_keywords: article.seo_keywords || "",
                              images: imagesToEdit,
                            })
                            setEditingArticle(article)
                          }}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-red-500 hover:text-red-700"
                          onClick={() => setDeleteConfirmId(article.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Pagination Controls */}
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-500">
              Showing {articles.length} of {totalPages * articlesPerPage} articles
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                <Button
                  key={pageNum}
                  variant={pageNum === currentPage ? "default" : "outline"}
                  className={pageNum === currentPage ? 
                    "bg-[#5E366D] text-white" : 
                    "border-[#5E366D] text-[#5E366D] hover:bg-[#5E366D] hover:text-white"
                  }
                  onClick={() => handlePageChange(pageNum)}
                >
                  {pageNum}
                </Button>
              ))}
              <Button
                variant="outline"
                onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        </div>

        {/* Add/Edit Dialog */}
        <Dialog 
          modal={false}
          open={isAddDialogOpen || editingArticle !== null} 
          onOpenChange={(open) => {
            if (!open) {
              setIsAddDialogOpen(false)
              setEditingArticle(null)
                    setFormData({
        title: "",
        excerpt: "",
        content: "",
        image_url: "",
        category: "",
        author: "",
        publication_date: new Date().toISOString().split('T')[0],
        read_time_minutes: 5,
        is_featured: false,
        published: true,
        seo_title: "",
        seo_description: "",
        seo_keywords: "",
        images: [{
          image_url: "",
          image_order: 1,
          image_type: 'banner',
          alt_text: "",
          caption: ""
        }],
      })
            }
          }}
        >
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold text-[#5E366D]">
                {editingArticle ? "Edit Article" : "Add New Article"}
              </DialogTitle>
              <DialogDescription className="text-gray-500">
                Fill in the details for the news article. All fields marked with * are required.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-6 py-6">
              {/* Title and Category Section */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="title" className="font-semibold">
                    Title <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="title"
                    placeholder="Enter article title"
                    className="border-gray-300 focus:border-[#5E366D] focus:ring-[#5E366D]"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category" className="font-semibold">
                    Category <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="category"
                    placeholder="Enter article category"
                    className="border-gray-300 focus:border-[#5E366D] focus:ring-[#5E366D]"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  />
                </div>
              </div>

              {/* Author and Read Time Section */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="author" className="font-semibold">
                    Author <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="author"
                    placeholder="Enter author name"
                    className="border-gray-300 focus:border-[#5E366D] focus:ring-[#5E366D]"
                    value={formData.author}
                    onChange={(e) => setFormData({ ...formData, author: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="read_time_minutes" className="font-semibold">
                    Read Time (Minutes)
                  </Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="read_time_minutes"
                      type="number"
                      min="1"
                      max="60"
                      placeholder="5"
                      className="border-gray-300 focus:border-[#5E366D] focus:ring-[#5E366D]"
                      value={formData.read_time_minutes}
                      onChange={(e) => setFormData({ ...formData, read_time_minutes: parseInt(e.target.value) || 1 })}
                    />
                    <span className="text-sm text-gray-600 whitespace-nowrap">
                      {formData.read_time_minutes} {formData.read_time_minutes === 1 ? 'Minute' : 'Minutes'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Publication Date */}
              <div className="space-y-2">
                <Label htmlFor="publication_date" className="font-semibold">
                  Publication Date <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="publication_date"
                  type="date"
                  className="border-gray-300 focus:border-[#5E366D] focus:ring-[#5E366D]"
                  value={formData.publication_date}
                  onChange={(e) => setFormData({ ...formData, publication_date: e.target.value })}
                />
                <p className="text-sm text-gray-500">
                  Set the date when this article should be published. Defaults to today's date.
                </p>
              </div>

              {/* Images Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="font-semibold">
                    Article Images <span className="text-red-500">*</span>
                  </Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setFormData({
                        ...formData,
                        images: [...formData.images, {
                          image_url: "",
                          image_order: formData.images.length + 1,
                          image_type: 'content',
                          alt_text: "",
                          caption: ""
                        }]
                      })
                    }}
                    className="text-[#5E366D] border-[#5E366D] hover:bg-[#5E366D] hover:text-white"
                  >
                    + Add Image
                  </Button>
                </div>
                
                <div className="space-y-4">
                  {formData.images.map((image, index) => (
                    <div key={index} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-700">
                            Image {index + 1}
                          </span>
                          <select
                            value={image.image_type}
                            onChange={(e) => {
                              const newImages = [...formData.images]
                              newImages[index].image_type = e.target.value as 'banner' | 'content'
                              setFormData({ ...formData, images: newImages })
                            }}
                            className="text-xs px-2 py-1 border rounded"
                          >
                            <option value="banner">Banner</option>
                            <option value="content">Content</option>
                          </select>
                          {image.image_type === 'banner' && (
                            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                              Main Image
                            </span>
                          )}
                        </div>
                        {formData.images.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              const newImages = formData.images.filter((_, i) => i !== index)
                              setFormData({ ...formData, images: newImages })
                            }}
                            className="text-red-500 hover:text-red-700"
                          >
                            Remove
                          </Button>
                        )}
                      </div>
                      
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">
                          Image Upload <span className="text-red-500">*</span>
                        </Label>
                        <ImageUpload
                          value={image.image_url}
                          onChange={(url) => {
                            const newImages = [...formData.images]
                            newImages[index].image_url = url
                            setFormData({ ...formData, images: newImages })
                          }}
                          placeholder={`Upload ${image.image_type} image`}
                          showPreview={true}
                          maxSize={10}
                        />
                      </div>
                    </div>
                  ))}
                </div>
                
                <p className="text-sm text-gray-500">
                  <strong>Banner images</strong> appear at the top of the article. <strong>Content images</strong> appear within the article content. 
                  Images are automatically uploaded to our CDN for optimal performance.
                </p>
              </div>

              {/* Excerpt */}
              <div className="space-y-2">
                <Label htmlFor="excerpt" className="font-semibold">
                  Excerpt <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  id="excerpt"
                  placeholder="Enter a brief excerpt"
                  className="border-gray-300 focus:border-[#5E366D] focus:ring-[#5E366D] min-h-[100px]"
                  value={formData.excerpt}
                  onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })}
                />
              </div>

              {/* Content */}
              <div className="space-y-2">
                <Label htmlFor="content" className="font-semibold">
                  Content <span className="text-red-500">*</span>
                </Label>
                <div className="space-y-2">
                  {/* Simple formatting toolbar */}
                  <div className="flex gap-2 p-2 bg-gray-50 border rounded-md">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const textarea = document.getElementById('content-textarea') as HTMLTextAreaElement
                        if (textarea) {
                          const start = textarea.selectionStart
                          const end = textarea.selectionEnd
                          const selectedText = textarea.value.substring(start, end)
                          const beforeText = textarea.value.substring(0, start)
                          const afterText = textarea.value.substring(end)
                          
                          if (selectedText) {
                            // Wrap selected text with <strong> tags
                            const newText = beforeText + '<strong>' + selectedText + '</strong>' + afterText
                            setFormData(prev => ({ ...prev, content: newText }))
                            
                            // Restore focus and selection
                            setTimeout(() => {
                              textarea.focus()
                              textarea.setSelectionRange(start + 8, end + 8)
                            }, 0)
                          }
                        }
                      }}
                      className="font-bold"
                    >
                      <strong>B</strong>
                    </Button>
                    <span className="text-sm text-gray-500 flex items-center ml-2">
                      Select text and click <strong className="mx-1">B</strong> to make it bold
                    </span>
                  </div>
                  
                  <Textarea
                    id="content-textarea"
                    placeholder="Enter content. Use the B button to make text bold. Line breaks will be preserved."
                    className="min-h-[300px] font-mono text-sm"
                    value={formData.content}
                    onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                  />
                </div>
                <p className="text-sm text-gray-500">
                  Line breaks will be preserved as you type. Select text and click <strong>B</strong> to make it bold.
                </p>
              </div>

              {/* SEO Section */}
              <div className="border-t pt-6">
                <h3 className="text-lg font-semibold text-[#5E366D] mb-4">SEO Settings (Optional)</h3>
                <div className="grid gap-4">
                  {/* SEO Title */}
                  <div className="space-y-2">
                    <Label htmlFor="seo_title" className="font-semibold">
                      SEO Title
                    </Label>
                    <Input
                      id="seo_title"
                      placeholder="Custom title for search engines (optional)"
                      className="border-gray-300 focus:border-[#5E366D] focus:ring-[#5E366D]"
                      value={formData.seo_title || ""}
                      onChange={(e) => setFormData({ ...formData, seo_title: e.target.value })}
                    />
                    <p className="text-sm text-gray-500">
                      Leave empty to use the article title. Recommended length: 50-60 characters.
                    </p>
                  </div>

                  {/* SEO Description */}
                  <div className="space-y-2">
                    <Label htmlFor="seo_description" className="font-semibold">
                      SEO Description
                    </Label>
                    <Textarea
                      id="seo_description"
                      placeholder="Custom description for search engines (optional)"
                      className="border-gray-300 focus:border-[#5E366D] focus:ring-[#5E366D] min-h-[80px]"
                      value={formData.seo_description || ""}
                      onChange={(e) => setFormData({ ...formData, seo_description: e.target.value })}
                    />
                    <p className="text-sm text-gray-500">
                      Leave empty to use the article excerpt. Recommended length: 150-160 characters.
                    </p>
                  </div>

                  {/* SEO Keywords */}
                  <div className="space-y-2">
                    <Label htmlFor="seo_keywords" className="font-semibold">
                      SEO Keywords
                    </Label>
                    <Input
                      id="seo_keywords"
                      placeholder="Comma-separated keywords (optional)"
                      className="border-gray-300 focus:border-[#5E366D] focus:ring-[#5E366D]"
                      value={formData.seo_keywords || ""}
                      onChange={(e) => setFormData({ ...formData, seo_keywords: e.target.value })}
                    />
                    <p className="text-sm text-gray-500">
                      Example: Legend Holding Group, automotive, UAE, innovation, sustainability
                    </p>
                  </div>


                </div>
              </div>

              {/* Checkboxes Section */}
              <div className="flex flex-col sm:flex-row gap-4 pt-2">
                <div className="flex items-center space-x-2 bg-gray-50 p-3 rounded-md">
                  <input
                    type="checkbox"
                    id="is_featured"
                    className="rounded border-gray-300 text-[#5E366D] focus:ring-[#5E366D]"
                    checked={formData.is_featured}
                    onChange={(e) => setFormData({ ...formData, is_featured: e.target.checked })}
                  />
                  <Label htmlFor="is_featured" className="font-medium">Featured Article</Label>
                </div>
                <div className="flex items-center space-x-2 bg-gray-50 p-3 rounded-md">
                  <input
                    type="checkbox"
                    id="published"
                    className="rounded border-gray-300 text-[#5E366D] focus:ring-[#5E366D]"
                    checked={formData.published}
                    onChange={(e) => setFormData({ ...formData, published: e.target.checked })}
                  />
                  <Label htmlFor="published" className="font-medium">Published</Label>
                </div>
              </div>
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                variant="outline"
                onClick={() => {
                  setIsAddDialogOpen(false)
                  setEditingArticle(null)
                }}
                className="border-gray-300 hover:bg-gray-100"
              >
                Cancel
              </Button>
              <Button
                className="bg-[#5E366D] hover:bg-[#5E366D]/90 text-white px-6"
                onClick={editingArticle ? handleUpdate : handleAdd}
              >
                {editingArticle ? "Update" : "Add"} Article
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog
          open={!!deleteConfirmId}
          onOpenChange={(open) => !open && setDeleteConfirmId(null)}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirm Deletion</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete this article? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setDeleteConfirmId(null)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}
              >
                Delete Article
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminDashboardLayout>
  )
} 