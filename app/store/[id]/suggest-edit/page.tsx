"use client"

import type React from "react"
import { useSupabaseUser } from "@/hooks/useSupabaseUser"
import { useRouter } from "next/navigation"
import { useEffect, useState, useRef } from "react"
import { ArrowLeft, Store as StoreIcon, Plus, Check, MapPin, MessageSquare, Tag as TagIcon, Save } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { useParams } from "next/navigation"
import { supabase } from "@/lib/supabaseClient"
import { TagCategoryInfoModalButton } from "@/components/TagCategoryInfoModalButton"
import { PageLoader } from "@/components/loading/PageLoader"

import { Tag, Store } from "@/lib/types"
import { sortSplitTagsByCreatorPercentage, sortTagsByConfiguredOrder } from "@/lib/utils"

export default function SuggestStoreEditPage() {
  const { user, loading: authLoading } = useSupabaseUser()
  const router = useRouter()
  const params = useParams()
  const [store, setStore] = useState<Store | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const [formData, setFormData] = useState({
    storeName: "",
    city: "",
    state: "",
    country: "",
    address: "",
    email: "",
    website: "",
    selectedTerms: [] as string[],
    notes: "",
  })

  // Stocking Terms from Supabase
  const [consignmentTerms, setConsignmentTerms] = useState<Tag[]>([])
  const [termsLoading, setTermsLoading] = useState(true)

  // Handle term toggle
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
    const terms = sortTagsByConfiguredOrder(
      consignmentTerms.filter((term) => term.category === category),
      category
    )
    if (category === "split") {
      return sortSplitTagsByCreatorPercentage(terms)
    }
    return terms
  }

  const renderTermBadge = (term: Tag) => {
    const selected = formData.selectedTerms.includes(term.id)
    return (
      <Badge
        key={term.id}
        variant={selected ? "default" : "outline"}
        className={`cursor-pointer transition-all ${
          selected
            ? "bg-rose-500 text-white hover:bg-rose-600"
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
      return // Auth status still resolving
    }
    
    if (!user) {
      router.push("/login")
      return
    }

    const fetchStore = async () => {
      try {
        setLoading(true)
        
        // Fetch store data
        const { data: storeData, error: storeError } = await supabase
          .from('stores')
          .select('*')
          .eq('id', params.id)
          .single()

        if (storeError || !storeData) {
          setError('Store not found')
          return
        }

        setStore(storeData)
        
        // Pre-populate form with existing data
        setFormData({
          storeName: storeData.name || "",
          city: storeData.city || "",
          state: storeData.state || "",
          country: storeData.country || "",
          address: storeData.address || "",
          email: storeData.email || "",
          website: storeData.website || "",
          selectedTerms: [],
          notes: "", // Always leave notes empty
        })



        // Fetch existing tags
        const { data: tagsData } = await supabase
          .from('store_tags')
          .select(`
            id,
            tag_id,
            tags!inner(id, label, category)
          `)
          .eq('store_id', storeData.id)

        if (tagsData) {
          const tagIds = tagsData.map((tag: any) => tag.tag_id)
          setFormData(prev => ({ ...prev, selectedTerms: tagIds }))
        }

        // Fetch available tags
        const { data: availableTagsData, error: tagsError } = await supabase
          .from('tags')
          .select('id, label, category')
          .in('category', ['shop_type', 'split', 'payment', 'method', 'limits', 'pricing', 'returns'])
          .order('label')

        if (tagsError) {
          console.error('Error fetching tags:', tagsError)
        }

        if (availableTagsData) {
          setConsignmentTerms(availableTagsData)
        }

      } catch (error) {
        console.error('Error fetching store:', error)
        setError('Failed to load store data')
      } finally {
        setLoading(false)
        setTermsLoading(false)
      }
    }

    fetchStore()
      }, [params.id, user, router, authLoading])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!store || !user) return

    setSubmitting(true)
    setError(null)

    try {
      // Generate edit summary
      const changes: string[] = []
      
      if (formData.storeName !== store.name) {
        changes.push(`old name: ${store.name}\nnew name: ${formData.storeName}`)
      }
      if (formData.city !== store.city) {
        changes.push(`old city: ${store.city}\nnew city: ${formData.city}`)
      }
      if (formData.state !== store.state) {
        changes.push(`old state: ${store.state}\nnew state: ${formData.state}`)
      }
      if (formData.country !== store.country) {
        changes.push(`old country: ${store.country}\nnew country: ${formData.country}`)
      }
      if (formData.address !== store.address) {
        changes.push(`old address: ${store.address}\nnew address: ${formData.address}`)
      }
      if (formData.email !== store.email) {
        changes.push(`old email: ${store.email || 'none'}\nnew email: ${formData.email || 'none'}`)
      }
      if (formData.website !== store.website) {
        changes.push(`old website: ${store.website || 'none'}\nnew website: ${formData.website || 'none'}`)
      }
      if (formData.notes && formData.notes.trim()) {
        changes.push(`new notes: ${formData.notes}`)
      }

      // Handle tag changes
      const existingTags = await supabase
        .from('store_tags')
        .select('tag_id')
        .eq('store_id', store.id)
      
      const existingTagIds = existingTags.data?.map(tag => tag.tag_id) || []
      const addedTags = formData.selectedTerms.filter(tagId => !existingTagIds.includes(tagId))
      const removedTags = existingTagIds.filter(tagId => !formData.selectedTerms.includes(tagId))

      if (addedTags.length > 0) {
        const addedTagLabels = addedTags.map(tagId => {
          const tag = consignmentTerms.find(t => t.id === tagId)
          return tag?.label || tagId
        })
        changes.push(`+tags: ${addedTagLabels.join(', ')}`)
      }

      if (removedTags.length > 0) {
        const removedTagLabels = removedTags.map(tagId => {
          const tag = consignmentTerms.find(t => t.id === tagId)
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
        name: formData.storeName,
        city: formData.city,
        state: formData.state || null,
        country: formData.country,
        address: formData.address,
        email: formData.email || null,
        website: formData.website || null,
        ...(formData.notes?.trim() ? { notes: formData.notes.trim() } : {}),
        tag_ids: formData.selectedTerms
      }

      // Insert into locale_edits table
      const { error: insertError } = await supabase
        .from('locale_edits')
        .insert([
          {
            store_id: store.id,
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
      
      // Redirect back to store page after a short delay
      setTimeout(() => {
        router.push(`/store/${store.id}`)
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
    return <PageLoader />
  }

  if (loading) {
    return <PageLoader />
  }

  if (error && !store) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-rose-50 to-stone-50 font-serif flex items-center justify-center">
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
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-rose-50 to-stone-50 font-serif flex items-center justify-center">
        <div className="text-center">
          <div className="text-green-600 text-6xl mb-4">✓</div>
          <h1 className="text-2xl font-bold text-stone-800 mb-2">Edit Suggestion Submitted!</h1>
          <p className="text-stone-600 mb-4">
           Your edits have been received! We&apos;ll review the changes shortly before they are reflected on the page. Thank you for helping keep the information accurate and up-to-date!
          </p>
          <p className="text-stone-500 text-sm">Redirecting back to store page...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-rose-50 to-stone-50 font-serif">
      {/* Header */}
      <div className="bg-white/70 backdrop-blur-sm border-b border-stone-200">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <Link href={`/store/${store?.id}`}>
            <Button variant="ghost" size="sm" className="text-stone-600 hover:text-stone-800 hover:bg-stone-100">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to store
            </Button>
          </Link>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-rose-200 to-orange-200 rounded-full flex items-center justify-center mx-auto mb-4">
            <StoreIcon className="h-8 w-8 text-rose-600" />
          </div>
          <h1 className="font-gloria text-4xl font-bold text-stone-800 mb-3">Suggest Edit for {store?.name}</h1>
          <p className="text-lg text-stone-600 max-w-2xl mx-auto leading-relaxed">
            Help us keep this store's information accurate and up-to-date. Make your changes below and we'll review them.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Basic Store Info */}
          <Card className="bg-white/80 backdrop-blur-sm border border-stone-200 shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center text-stone-800 text-xl">
                <StoreIcon className="h-5 w-5 mr-2 text-rose-500" />
                Store Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="storeName" className="text-stone-700">Store Name *</Label>
                <Input
                  id="storeName"
                  value={formData.storeName}
                  onChange={(e) => setFormData(prev => ({ ...prev, storeName: e.target.value }))}
                  placeholder="e.g., Quimby's, Atomic Books, Powell's"
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
                    onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                    placeholder="e.g., Chicago, Baltimore, Portland"
                    required
                    className="mt-1"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="state" className="text-stone-700">State/Province</Label>
                  <Input
                    id="state"
                    value={formData.state}
                    onChange={(e) => setFormData(prev => ({ ...prev, state: e.target.value }))}
                    placeholder="e.g., IL, MD, OR"
                    className="mt-1"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="country" className="text-stone-700">Country *</Label>
                  <Input
                    id="country"
                    value={formData.country}
                    onChange={(e) => setFormData(prev => ({ ...prev, country: e.target.value }))}
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
                  onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                  placeholder="e.g., 1854 W North Ave"
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
                <MessageSquare className="h-5 w-5 mr-2 text-rose-500" />
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
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="store@example.com"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="website" className="text-stone-700">Website</Label>
                  <Input
                    id="website"
                    type="url"
                    value={formData.website}
                    onChange={(e) => setFormData(prev => ({ ...prev, website: e.target.value }))}
                    placeholder="https://example.com"
                    className="mt-1"
                  />
                </div>
              </div>
            </CardContent>
          </Card>



          {/* Shop Type */}
          <Card className="bg-white/80 backdrop-blur-sm border border-stone-200 shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center text-stone-800 text-xl">
                <TagIcon className="h-5 w-5 mr-2 text-rose-500" />
                Shop Type
                <span className="ml-2">
                  <TagCategoryInfoModalButton category="shop_type" />
                </span>
              </CardTitle>
              <p className="text-sm text-stone-600 font-mono">Select all that apply</p>
            </CardHeader>
            <CardContent>
              {termsLoading ? (
                <div className="text-center py-8 text-stone-500">Loading terms...</div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {getTermsByCategory("shop_type").map((term) => renderTermBadge(term))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Stocking Terms */}
          <Card className="bg-white/80 backdrop-blur-sm border border-stone-200 shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center text-stone-800 text-xl">
                <TagIcon className="h-5 w-5 mr-2 text-rose-500" />
                Stocking Terms
              </CardTitle>
              <p className="text-sm text-stone-600 font-mono">What are their policies? (Select all that apply)</p>
            </CardHeader>
            <CardContent>
              {termsLoading ? (
                <div className="text-center py-8 text-stone-500">Loading terms...</div>
              ) : (
                <div className="space-y-6">
                  {/* Revenue Split */}
                  <div>
                    <h4 className="font-semibold text-stone-700 mb-3 font-serif">Revenue Split</h4>
                    <div className="flex flex-wrap gap-2">
                      {getTermsByCategory("split").map((term) => renderTermBadge(term))}
                    </div>
                  </div>

                  {/* Payment Timing */}
                  <div>
                    <h4 className="font-semibold text-stone-700 mb-3 font-serif">Payment Types</h4>
                    <div className="flex flex-wrap gap-2">
                      {getTermsByCategory("payment").map((term) => renderTermBadge(term))}
                    </div>
                  </div>

                  {/* Payout Methods */}
                  <div>
                    <h4 className="font-semibold text-stone-700 mb-3 font-serif">Payout Methods</h4>
                    <div className="flex flex-wrap gap-2">
                      {getTermsByCategory("method").map((term) => renderTermBadge(term))}
                    </div>
                  </div>

                  {/* Copy Limits */}
                  <div>
                    <h4 className="font-semibold text-stone-700 mb-3 font-serif">Copy Limits</h4>
                    <div className="flex flex-wrap gap-2">
                      {getTermsByCategory("limits").map((term) => renderTermBadge(term))}
                    </div>
                  </div>

                  {/* Pricing & Returns */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-semibold text-stone-700 mb-3 font-serif">Pricing Requirements</h4>
                      <div className="flex flex-wrap gap-2">
                        {getTermsByCategory("pricing").map((term) => renderTermBadge(term))}
                      </div>
                    </div>
                    <div>
                      <h4 className="font-semibold text-stone-700 mb-3 font-serif">Returns & Exchanges</h4>
                      <div className="flex flex-wrap gap-2">
                        {getTermsByCategory("returns").map((term) => renderTermBadge(term))}
                      </div>
                    </div>
                  </div>

                  

                   {/* Notes */}
                   <div>
                     <h4 className="font-semibold text-stone-700 mb-3 font-serif">Additional Notes</h4>
                     <Textarea
                       value={formData.notes}
                       onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                       placeholder="Any additional information about this store's zine policies, atmosphere, or anything else zine makers should know..."
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
            <Link href={`/store/${store?.id}`}>
              <Button variant="outline" type="button" className="border-stone-300 text-stone-700 hover:bg-stone-50">
                Cancel
              </Button>
            </Link>
            <Button type="submit" disabled={submitting} className="bg-rose-500 hover:bg-rose-600 text-white font-gloria">
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