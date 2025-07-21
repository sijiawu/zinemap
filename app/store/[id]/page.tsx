"use client"

import { ArrowLeft, MapPin, Mail, Globe, CheckCircle, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import { useParams } from "next/navigation"
import { useSupabaseUser } from "@/hooks/useSupabaseUser"

interface Store {
  id: string
  name: string
  city: string
  country: string
  address: string
  email?: string
  website?: string
  notes?: string
  has_stocked_before: boolean
  submitted_by: string
  created_at: string
  permalink?: string
  latitude?: number
  longitude?: number
}

interface StoreTag {
  id: string
  store_id: string
  tag_id: string
  tag: {
    id: string
    label: string
    category: string
  }
}

export default function StoreDetailPage() {
  const params = useParams()
  const { user } = useSupabaseUser()
  const [store, setStore] = useState<Store | null>(null)
  const [storeTags, setStoreTags] = useState<StoreTag[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showFeedbackForm, setShowFeedbackForm] = useState(false)
  const [feedback, setFeedback] = useState("")
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false)
  const [feedbackError, setFeedbackError] = useState<string | null>(null)

  useEffect(() => {
    const fetchStore = async () => {
      if (!params.id) return

      try {
        setLoading(true)
        setError(null)

        // First try to find by permalink (approved stores only)
        let { data: storeData, error: storeError } = await supabase
          .from('stores')
          .select('*')
          .eq('permalink', params.id)
          .eq('approved', true)
          .single()

        // If not found by permalink, try by ID (approved stores only)
        if (!storeData && storeError) {
          const { data: storeById, error: storeByIdError } = await supabase
            .from('stores')
            .select('*')
            .eq('id', params.id)
            .eq('approved', true)
            .single()

          if (storeByIdError) {
            throw new Error('Store not found')
          }
          storeData = storeById
        }

        if (storeData) {
          setStore(storeData)

          // Fetch store tags
          const { data: tagsData, error: tagsError } = await supabase
            .from('store_tags')
            .select(`
              id,
              store_id,
              tag_id,
              tags!inner(id, label, category)
            `)
            .eq('store_id', storeData.id)

          if (!tagsError && tagsData) {
            // Transform the data to match our interface
            const transformedTags = tagsData.map((item: any) => ({
              id: item.id,
              store_id: item.store_id,
              tag_id: item.tag_id,
              tag: item.tags
            }))
            setStoreTags(transformedTags)
          }
        }
      } catch (error) {
        console.error('Error fetching store:', error)
        setError('Store not found')
      } finally {
        setLoading(false)
      }
    }

    fetchStore()
  }, [params.id])

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50 font-serif flex items-center justify-center">
        <div className="text-stone-500 text-lg">Loading store...</div>
      </div>
    )
  }

  if (error || !store) {
    return (
      <div className="min-h-screen bg-stone-50 font-serif">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="text-center">
            <AlertCircle className="h-16 w-16 mx-auto mb-4 text-stone-400" />
            <h1 className="text-2xl font-bold text-stone-800 mb-2">Store Not Found</h1>
            <p className="text-stone-600 mb-6">The store you're looking for doesn't exist or has been removed.</p>
            <Link href="/">
              <Button className="bg-rose-500 hover:bg-rose-600 text-white">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Map
              </Button>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // Group tags by category
  const tagsByCategory = storeTags.reduce((acc, storeTag) => {
    const category = storeTag.tag.category
    if (!acc[category]) {
      acc[category] = []
    }
    acc[category].push(storeTag.tag)
    return acc
  }, {} as Record<string, any[]>)

  return (
    <div className="min-h-screen bg-stone-50 font-serif">
      {/* Header with back button */}
      <div className="bg-white border-b border-stone-200 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <Link href="/">
            <Button variant="ghost" size="sm" className="text-stone-600 hover:text-stone-800 hover:bg-stone-100">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to map
            </Button>
          </Link>
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        {/* Store header */}
        <div className="text-center space-y-4">
          <div className="bg-white p-8 rounded-xl shadow-sm border border-stone-200">
            <div className="flex justify-center items-center gap-4 flex-wrap mb-4">
              <h1 className="text-4xl md:text-5xl font-bold text-stone-800 tracking-tight">{store.name}</h1>
              <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                <AlertCircle className="h-3 w-3 mr-1" />
                Community Submitted
              </Badge>
            </div>

            <div className="flex justify-center items-center gap-2 text-xl text-stone-600 mb-3">
              <MapPin className="h-5 w-5 text-rose-400" />
              <span>
                {store.city}, {store.country}
              </span>
            </div>

            <div className="flex justify-center items-center gap-6 text-sm text-stone-500">
              <span>Added {new Date(store.created_at).toLocaleDateString()}</span>
            </div>
          </div>
        </div>

        {/* Address and Contact */}
        <div className="grid md:grid-cols-2 gap-6">
          <Card className="bg-white border border-stone-200 shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center text-stone-800 text-lg">
                <MapPin className="h-5 w-5 mr-2 text-rose-400" />
                Address
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="text-stone-700 leading-relaxed bg-stone-50 p-4 rounded-lg">
                <p className="font-medium">{store.address}</p>
                <p className="text-stone-500">{store.city}, {store.country}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border border-stone-200 shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-stone-800 text-lg">Contact</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-stone-50 p-4 rounded-lg space-y-3">
                {store.email && (
                  <div className="flex items-center space-x-3">
                    <Mail className="h-4 w-4 text-slate-400 flex-shrink-0" />
                    <a
                      href={`mailto:${store.email}`}
                      className="text-stone-700 hover:text-rose-600 transition-colors underline decoration-rose-200 hover:decoration-rose-400"
                    >
                      {store.email}
                    </a>
                  </div>
                )}
                {store.website && (
                  <div className="flex items-center space-x-3">
                    <Globe className="h-4 w-4 text-slate-400 flex-shrink-0" />
                    <a
                      href={store.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-stone-700 hover:text-rose-600 transition-colors underline decoration-rose-200 hover:decoration-rose-400"
                    >
                      {store.website.replace("https://", "").replace("www.", "")}
                    </a>
                  </div>
                )}
                {!store.email && !store.website && (
                  <p className="text-stone-500 text-sm italic">No contact information available</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Consignment Terms */}
        {Object.keys(tagsByCategory).length > 0 && (
          <Card className="bg-gradient-to-br from-rose-50 to-orange-50 border border-rose-200 shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-stone-800 text-xl">Consignment Terms</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid sm:grid-cols-2 gap-6 text-stone-700">
                {Object.entries(tagsByCategory).map(([category, tags]) => (
                  <div key={category} className="space-y-4">
                    <div className="bg-white p-4 rounded-lg border border-rose-100">
                      <h4 className="font-semibold text-stone-800 mb-2 capitalize">{category}</h4>
                      <div className="space-y-1">
                        {tags.map((tag) => (
                          <p key={tag.id} className="text-sm">{tag.label}</p>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Notes */}
        {store.notes && (
          <Card className="bg-gradient-to-br from-slate-50 to-blue-50 border border-slate-200 shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-stone-800 text-xl">Notes & Tips</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-white p-6 rounded-lg border border-slate-100">
                <p className="text-stone-700 leading-relaxed text-sm md:text-base italic">"{store.notes}"</p>
                <div className="mt-4 text-right">
                  <span className="text-xs text-stone-500">— Community contributed</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Community contribution note */}
        <div className="text-center pt-8 border-t border-stone-200">
          <div className="bg-white p-4 rounded-lg border border-stone-200 shadow-sm max-w-lg w-full mx-auto">
            {feedbackSubmitted ? (
              <p className="text-green-600 text-sm">Thank you for your feedback!</p>
            ) : showFeedbackForm ? (
              <form
                onSubmit={async e => {
                  e.preventDefault()
                  setFeedbackError(null)
                  try {
                    const { error } = await supabase.from('store_feedback').insert([
                      {
                        store_id: store.id,
                        feedback,
                        user_id: user?.id || null,
                        // Optionally, add user_agent, etc.
                      }
                    ])
                    if (error) {
                      setFeedbackError('There was a problem submitting your feedback. Please try again.')
                      return
                    }
                    setFeedbackSubmitted(true)
                    setShowFeedbackForm(false)
                    setFeedback("")
                  } catch (err) {
                    setFeedbackError('There was a problem submitting your feedback. Please try again.')
                  }
                }}
                className="space-y-2"
              >
                <textarea
                  className="w-full border border-stone-300 rounded p-2 text-sm min-h-[120px]"
                  rows={6}
                  placeholder="Share your experience at this store, or let us know what's outdated, incorrect, or missing..."
                  value={feedback}
                  onChange={e => setFeedback(e.target.value)}
                  required
                />
                {feedbackError && <div className="text-red-600 text-xs">{feedbackError}</div>}
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    className="text-xs text-stone-500 hover:text-stone-700 underline"
                    onClick={() => setShowFeedbackForm(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="bg-rose-500 hover:bg-rose-600 text-white text-xs px-4 py-1 rounded"
                  >
                    Submit
                  </button>
                </div>
              </form>
            ) : (
              <p className="text-stone-600 text-sm">
                Is this information outdated, incorrect, or do you have more notes & tips to share?{" "}
                <button
                  className="text-rose-600 hover:text-rose-700 underline decoration-rose-200 hover:decoration-rose-400"
                  onClick={() => setShowFeedbackForm(true)}
                >
                  Leave us a note
                </button>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
