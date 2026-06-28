"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, MapPin, Mail, Globe, FileText, CheckCircle, Library as LibraryIcon, Tag as TagIcon, MessageSquare, Plus, Save } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { useSupabaseUser } from "@/hooks/useSupabaseUser"
import { supabase } from "@/lib/supabaseClient"
import { useParams } from "next/navigation"
import { TagCategoryInfoModalButton } from "@/components/TagCategoryInfoModalButton"

import { Tag, Library } from "@/lib/types"
import { sortTagsByConfiguredOrder } from "@/lib/utils"

export default function SuggestLibraryEditPage() {
  const { user, loading: authLoading } = useSupabaseUser()
  const router = useRouter()
  const params = useParams()
  const [library, setLibrary] = useState<Library | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const [formData, setFormData] = useState({
    libraryName: "",
    city: "",
    state: "",
    country: "",
    address: "",
    email: "",
    website: "",
    selectedTerms: [] as string[],
    notes: ""
  })

  // Library tags from Supabase
  const [libraryTags, setLibraryTags] = useState<Tag[]>([])
  const [tagsLoading, setTagsLoading] = useState(true)



  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleTermToggle = (termId: string) => {
    setFormData(prev => ({
      ...prev,
      selectedTerms: prev.selectedTerms.includes(termId)
        ? prev.selectedTerms.filter(id => id !== termId)
        : [...prev.selectedTerms, termId]
    }))
  }

  // Get terms by category
  const getTermsByCategory = (category: string) => {
    return sortTagsByConfiguredOrder(
      libraryTags.filter((term) => term.category === category),
      category
    )
  }

  const renderTermBadge = (term: Tag) => {
    const selected = formData.selectedTerms.includes(term.id)
    return (
      <Badge
        key={term.id}
        variant={selected ? "default" : "outline"}
        className={`cursor-pointer transition-all ${
          selected
            ? "bg-blue-500 text-white hover:bg-blue-600"
            : "bg-white border-stone-300 text-stone-700 hover:bg-stone-50"
        }`}
        onClick={() => handleTermToggle(term.id)}
      >
        {term.label}
      </Badge>
    )
  }



  useEffect(() => {
    // Don't redirect until authentication check is complete
    if (authLoading) {
      return // Still checking authentication
    }
    
    if (!user) {
      router.push("/login")
      return
    }

    const fetchLibrary = async () => {
      try {
        setLoading(true)
        
        // Fetch library data
        const { data: libraryData, error: libraryError } = await supabase
          .from('libraries')
          .select('*')
          .eq('id', params.id)
          .single()

        if (libraryError || !libraryData) {
          setError('Library not found')
          return
        }

        setLibrary(libraryData)
        
        // Pre-populate form with existing data
        setFormData({
          libraryName: libraryData.name || "",
          city: libraryData.city || "",
          state: libraryData.state || "",
          country: libraryData.country || "",
          address: libraryData.address || "",
          email: libraryData.email || "",
          website: libraryData.website || "",
          selectedTerms: [],
          notes: "", // Always leave notes empty
        })



        // Fetch existing tags
        const { data: tagsData } = await supabase
          .from('library_tags')
          .select(`
            id,
            tag_id,
            tags!inner(id, label, category)
          `)
          .eq('library_id', libraryData.id)

        if (tagsData) {
          const tagIds = tagsData.map((tag: any) => tag.tag_id)
          setFormData(prev => ({ ...prev, selectedTerms: tagIds }))
        }

        // Fetch available tags
        const { data: availableTagsData, error: tagsError } = await supabase
          .from('tags')
          .select('id, label, category')
          .in('category', ['library_type', 'service', 'access'])
          .order('label')

        if (tagsError) {
          console.error('Error fetching tags:', tagsError)
        }

        if (availableTagsData) {
          setLibraryTags(availableTagsData)
        }

      } catch (error) {
        console.error('Error fetching library:', error)
        setError('Failed to load library data')
      } finally {
        setLoading(false)
        setTagsLoading(false)
      }
    }

    fetchLibrary()
      }, [params.id, user, router, authLoading])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!library || !user) return

    setSubmitting(true)
    setError(null)

    try {
      // Generate edit summary
      const changes: string[] = []
      
      if (formData.libraryName !== library.name) {
        changes.push(`old name: ${library.name}\nnew name: ${formData.libraryName}`)
      }
      if (formData.city !== library.city) {
        changes.push(`old city: ${library.city}\nnew city: ${formData.city}`)
      }
      if (formData.state !== library.state) {
        changes.push(`old state: ${library.state}\nnew state: ${formData.state}`)
      }
      if (formData.country !== library.country) {
        changes.push(`old country: ${library.country}\nnew country: ${formData.country}`)
      }
      if (formData.address !== library.address) {
        changes.push(`old address: ${library.address}\nnew address: ${formData.address}`)
      }
      if (formData.email !== library.email) {
        changes.push(`old email: ${library.email || 'none'}\nnew email: ${formData.email || 'none'}`)
      }
      if (formData.website !== library.website) {
        changes.push(`old website: ${library.website || 'none'}\nnew website: ${formData.website || 'none'}`)
      }
      if (formData.notes && formData.notes.trim()) {
        changes.push(`new notes: ${formData.notes}`)
      }

      // Handle tag changes
      const existingTags = await supabase
        .from('library_tags')
        .select('tag_id')
        .eq('library_id', library.id)
      
      const existingTagIds = existingTags.data?.map(tag => tag.tag_id) || []
      const addedTags = formData.selectedTerms.filter(tagId => !existingTagIds.includes(tagId))
      const removedTags = existingTagIds.filter(tagId => !formData.selectedTerms.includes(tagId))

      if (addedTags.length > 0) {
        const addedTagLabels = addedTags.map(tagId => {
          const tag = libraryTags.find(t => t.id === tagId)
          return tag?.label || tagId
        })
        changes.push(`+tags: ${addedTagLabels.join(', ')}`)
      }

      if (removedTags.length > 0) {
        const removedTagLabels = removedTags.map(tagId => {
          const tag = libraryTags.find(t => t.id === tagId)
          return tag?.label || tagId
        })
        changes.push(`-tags: ${removedTagLabels.join(', ')}`)
      }

      if (changes.length === 0) {
        setError('No changes detected')
        setSubmitting(false)
        return
      }

      const editSummary = changes.join('\n\n')

      const editPayload = {
        name: formData.libraryName,
        city: formData.city,
        state: formData.state || null,
        country: formData.country,
        address: formData.address,
        email: formData.email || null,
        website: formData.website || null,
        notes: formData.notes?.trim() || null,
        tag_ids: formData.selectedTerms
      }

      // Insert into locale_edits table
      const { error: insertError } = await supabase
        .from('locale_edits')
        .insert([
          {
            library_id: library.id,
            user_id: user.id,
            edit_summary: editSummary,
            edit_payload: editPayload,
            status: 'pending'
          }
        ])

      if (insertError) {
        throw insertError
      }

      setSuccess(true)
      
      // Redirect back to library page after a short delay
      setTimeout(() => {
        router.push(`/library/${library.id}`)
      }, 2000)

    } catch (error) {
      console.error('Error submitting edit suggestion:', error)
      setError('Failed to submit edit suggestion. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  // Show loading while authentication is being checked
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-stone-50 font-serif flex items-center justify-center">
        <div className="text-stone-500">Checking authentication...</div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-stone-50 font-serif flex items-center justify-center">
        <div className="text-stone-500">Loading...</div>
      </div>
    )
  }

  if (error && !library) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-stone-50 font-serif flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <Link href="/">
            <Button>Go Home</Button>
          </Link>
        </div>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-stone-50 font-serif flex items-center justify-center">
        <div className="text-center">
          <div className="text-green-600 text-6xl mb-4">✓</div>
          <h1 className="text-2xl font-bold text-stone-800 mb-2">Edit Suggestion Submitted!</h1>
          <p className="text-stone-600 mb-4">
            Your edits have been received! We&apos;ll review the changes shortly before they are reflected on the page. Thank you for helping keep the information accurate and up-to-date!
          </p>
          <p className="text-stone-500 text-sm">Redirecting back to library page...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-stone-50 font-serif">
      {/* Header */}
      <div className="bg-white/70 backdrop-blur-sm border-b border-stone-200">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <Link href={`/library/${library?.id}`}>
            <Button variant="ghost" size="sm" className="text-stone-600 hover:text-stone-800 hover:bg-stone-100">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to library
            </Button>
          </Link>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-200 to-indigo-200 rounded-full flex items-center justify-center mx-auto mb-4">
            <LibraryIcon className="h-8 w-8 text-blue-600" />
          </div>
          <h1 className="font-gloria text-4xl font-bold text-stone-800 mb-3">Suggest Edit for {library?.name}</h1>
          <p className="text-lg text-stone-600 max-w-2xl mx-auto leading-relaxed">
            Help us keep this library's information accurate and up-to-date. Make your changes below and we'll review them.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Basic Library Info */}
          <Card className="bg-white/80 backdrop-blur-sm border border-stone-200 shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center text-stone-800 text-xl">
                <LibraryIcon className="h-5 w-5 mr-2 text-blue-500" />
                Library Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="libraryName" className="text-stone-700">Library Name *</Label>
                <Input
                  id="libraryName"
                  value={formData.libraryName}
                  onChange={(e) => handleInputChange('libraryName', e.target.value)}
                  placeholder="e.g., Chicago Public Library, Brooklyn Public Library"
                  required
                  className="mt-1"
                />
              </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city" className="text-stone-700">City *</Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) => handleInputChange('city', e.target.value)}
                    placeholder="e.g., Chicago, Brooklyn, Portland"
                    required
                    className="mt-1"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="state" className="text-stone-700">State/Province</Label>
                  <Input
                    id="state"
                    value={formData.state}
                    onChange={(e) => handleInputChange('state', e.target.value)}
                    placeholder="e.g., IL, NY, OR"
                    className="mt-1"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="country" className="text-stone-700">Country *</Label>
                  <Input
                    id="country"
                    value={formData.country}
                    onChange={(e) => handleInputChange('country', e.target.value)}
                    placeholder="e.g., United States"
                    required
                    className="mt-1"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="address" className="text-stone-700">Address *</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => handleInputChange('address', e.target.value)}
                  placeholder="e.g., 400 S State St"
                  required
                  className="mt-1"
                />
              </div>
            </CardContent>
          </Card>

          {/* Contact & Website */}
          <Card className="bg-white/80 backdrop-blur-sm border border-stone-200 shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center text-stone-800 text-xl">
                <MessageSquare className="h-5 w-5 mr-2 text-blue-500" />
                Contact & Website
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="email" className="text-stone-700">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    placeholder="library@example.com"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="website" className="text-stone-700">Website</Label>
                  <Input
                    id="website"
                    type="url"
                    value={formData.website}
                    onChange={(e) => handleInputChange('website', e.target.value)}
                    placeholder="https://example.com"
                    className="mt-1"
                  />
                </div>
              </div>
            </CardContent>
          </Card>



          {/* Library Tags */}
          <Card className="bg-white/80 backdrop-blur-sm border border-stone-200 shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center text-stone-800 text-xl">
                <TagIcon className="h-5 w-5 mr-2 text-blue-500" />
                Library Tags
                <span className="ml-2">
                  <TagCategoryInfoModalButton category="library_type" />
                </span>
              </CardTitle>
              <p className="text-sm text-stone-600 font-mono">What describes this library? (Select all that apply)</p>
            </CardHeader>
            <CardContent>
              {tagsLoading ? (
                <div className="text-center py-8 text-stone-500">Loading tags...</div>
              ) : (
                <div className="space-y-6">
                  {/* Library Type */}
                  <div>
                    <h4 className="font-semibold text-stone-700 mb-3 font-serif">Library Type</h4>
                    <p className="text-xs text-stone-500 mb-3">Select all that apply.</p>
                    <div className="flex flex-wrap gap-2">
                      {getTermsByCategory("library_type").map((term) => renderTermBadge(term))}
                    </div>
                  </div>

                  {/* Access */}
                  <div>
                    <h4 className="font-semibold text-stone-700 mb-3 font-serif">Access</h4>
                    <div className="flex flex-wrap gap-2">
                      {getTermsByCategory("access").map((term) => renderTermBadge(term))}
                    </div>
                  </div>

                  {/* Service */}
                  <div>
                    <h4 className="font-semibold text-stone-700 mb-3 font-serif">Service</h4>
                    <div className="flex flex-wrap gap-2">
                      {getTermsByCategory("service").map((term) => renderTermBadge(term))}
                    </div>
                  </div>

                   {/* Notes */}
                   <div>
                     <h4 className="font-semibold text-stone-700 mb-3 font-serif">Additional Notes</h4>
                     <Textarea
                       value={formData.notes}
                       onChange={(e) => handleInputChange('notes', e.target.value)}
                       placeholder="Any additional information about this library's zine collection, policies, or anything else zine makers should know..."
                       rows={4}
                       className="w-full"
                     />
                   </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Submit */}
          <div className="flex justify-end gap-4">
            <Link href={`/library/${library?.id}`}>
              <Button variant="outline" type="button" className="border-stone-300 text-stone-700 hover:bg-stone-50">
                Cancel
              </Button>
            </Link>
            <Button type="submit" disabled={submitting} className="bg-blue-500 hover:bg-blue-600 text-white font-gloria">
              <Save className="h-4 w-4 mr-2" />
              {submitting ? 'submitting...' : 'submit edit suggestion'}
            </Button>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}
        </form>
      </div>
    </div>
  )
} 