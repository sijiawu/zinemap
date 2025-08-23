"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { useSupabaseUser } from "@/hooks/useSupabaseUser"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, MapPin, Calendar, MessageSquare, Check } from "lucide-react"
import Link from "next/link"
import { supabase } from "@/lib/supabaseClient"
import { Event } from "@/lib/types"

export default function SuggestEventEditPage() {
  const { permalink } = useParams()
  const { user, loading } = useSupabaseUser()
  const router = useRouter()
  const [event, setEvent] = useState<Event | null>(null)
  const [loadingEvent, setLoadingEvent] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    name: "",
    city: "",
    state: "",
    country: "",
    address: "",
    email: "",
    website: "",
    social: "",
    category: "festival",
    start_date: "",
    end_date: "",
    application_deadline: ""
  })

  // Load event data
  useEffect(() => {
    const loadEvent = async () => {
      if (!permalink) return

      try {
        const { data: eventData, error } = await supabase
          .from('events')
          .select('*')
          .eq('permalink', permalink)
          .eq('approved', true)
          .single()

        if (error) throw error

        if (eventData) {
          setEvent(eventData)
          setFormData({
            name: eventData.name || "",
            city: eventData.city || "",
            state: eventData.state || "",
            country: eventData.country || "",
            address: eventData.address || "",
            email: eventData.email || "",
            website: eventData.website || "",
            social: eventData.social || "",
            category: eventData.category || "festival",
            start_date: eventData.start_date || "",
            end_date: eventData.end_date || "",
            application_deadline: eventData.application_deadline || ""
          })
        }
      } catch (error) {
        console.error('Error loading event:', error)
        setError('Failed to load event')
      } finally {
        setLoadingEvent(false)
      }
    }

    loadEvent()
  }, [permalink])

  // Redirect if not logged in
  useEffect(() => {
    if (!loading && !user) {
      router.push(`/login?redirect=/event/${permalink}/suggest-edit`)
    }
  }, [user, loading, router, permalink])

  const handleInputChange = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !event) return

    setIsSubmitting(true)
    setError(null)

    try {
      // Create a human-readable summary of changes
      const changes = []
      
      if (formData.name !== event.name) {
        changes.push(`old name: ${event.name}\nnew name: ${formData.name}`)
      }
      if (formData.city !== event.city) {
        changes.push(`old city: ${event.city}\nnew city: ${formData.city}`)
      }
      if (formData.state !== event.state) {
        changes.push(`old state: ${event.state || 'none'}\nnew state: ${formData.state || 'none'}`)
      }
      if (formData.country !== event.country) {
        changes.push(`old country: ${event.country}\nnew country: ${formData.country}`)
      }
      if (formData.address !== event.address) {
        changes.push(`old address: ${event.address}\nnew address: ${formData.address}`)
      }
      if (formData.email !== event.email) {
        changes.push(`old email: ${event.email || 'none'}\nnew email: ${formData.email || 'none'}`)
      }
      if (formData.website !== event.website) {
        changes.push(`old website: ${event.website || 'none'}\nnew website: ${formData.website || 'none'}`)
      }
      if (formData.social !== event.social) {
        changes.push(`old social: ${event.social || 'none'}\nnew social: ${formData.social || 'none'}`)
      }
      if (formData.category !== event.category) {
        changes.push(`old category: ${event.category}\nnew category: ${formData.category}`)
      }
      if (formData.start_date !== event.start_date) {
        changes.push(`old start date: ${event.start_date}\nnew start date: ${formData.start_date}`)
      }
      if (formData.end_date !== event.end_date) {
        changes.push(`old end date: ${event.end_date}\nnew end date: ${formData.end_date}`)
      }
      if (formData.application_deadline !== event.application_deadline) {
        changes.push(`old application deadline: ${event.application_deadline || 'none'}\nnew application deadline: ${formData.application_deadline || 'none'}`)
      }

      const editSummary = changes.length > 0 
        ? changes.join('\n\n')
        : 'No specific changes detected'

      const { error } = await supabase
        .from('locale_edits')
        .insert({
          event_id: event.id,
          user_id: user.id,
          edit_summary: editSummary,
          status: 'pending'
        })

      if (error) throw error

      setIsSubmitted(true)
    } catch (error) {
      console.error('Error submitting edit suggestion:', error)
      setError('Failed to submit edit suggestion. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (loading || loadingEvent) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-teal-50 to-stone-50 font-serif flex items-center justify-center">
        <div className="text-stone-500 text-lg">Loading...</div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-teal-50 to-stone-50 font-serif flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-stone-800 mb-2">Please Sign In</h1>
          <p className="text-stone-600 mb-4">You need to be signed in to suggest edits.</p>
          <Link href={`/login?redirect=/event/${permalink}/suggest-edit`}>
            <Button className="bg-[#009035] hover:bg-[#007a2a] text-white">
              Sign In
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-teal-50 to-stone-50 font-serif flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-stone-800 mb-2">Event Not Found</h1>
          <p className="text-stone-600 mb-4">The event you're looking for doesn't exist.</p>
          <Link href="/">
            <Button className="bg-[#009035] hover:bg-[#007a2a] text-white">
              Back to Homepage
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-teal-50 to-stone-50 font-serif">
        <div className="max-w-2xl mx-auto px-4 py-16">
          <Card className="bg-white/80 backdrop-blur-sm border-2 border-green-200 shadow-lg">
            <CardContent className="p-8 text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Check className="h-8 w-8 text-green-600" />
              </div>
              <h2 className="font-gloria text-2xl font-semibold text-stone-800 mb-2">Edit Suggestion Submitted!</h2>
              <p className="text-stone-600 mb-6">
                Thank you for helping improve this event page. Our team will review your suggestions and update the information accordingly.
              </p>
              <div className="space-y-3">
                <Link href={`/event/${event.permalink || event.id}`}>
                  <Button className="w-full bg-[#009035] hover:bg-[#007a2a] text-white font-gloria">
                    Back to Event
                  </Button>
                </Link>
                <Link href="/">
                  <Button variant="outline" className="w-full border-stone-300 text-stone-700 hover:bg-stone-50 font-gloria">
                    Back to Homepage
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-teal-50 to-stone-50 font-serif">
      {/* Header */}
      <div className="bg-white/70 backdrop-blur-sm border-b border-stone-200">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <Link href={`/event/${event.permalink || event.id}`}>
            <Button variant="ghost" size="sm" className="text-stone-600 hover:text-stone-800">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to event
            </Button>
          </Link>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-green-200 to-teal-200 rounded-full flex items-center justify-center mx-auto mb-4">
            <MessageSquare className="h-8 w-8 text-green-600" />
          </div>
          <h1 className="font-gloria text-4xl font-bold text-stone-800 mb-3">Suggest Edit for {event.name}</h1>
          <p className="text-lg text-stone-600 max-w-2xl mx-auto leading-relaxed">
            Help us keep this event information accurate and up-to-date. Fill out the fields below with your suggested changes.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          {/* Basic Event Info */}
          <Card className="bg-white/80 backdrop-blur-sm border border-stone-200 shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center text-stone-800 text-xl">
                <MessageSquare className="h-5 w-5 mr-2 text-green-500" />
                Event Details
              </CardTitle>
              <p className="text-sm text-stone-600 font-mono">Suggest changes to the basic event information</p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Event Name */}
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-stone-700 font-serif font-medium">
                    Event Name *
                  </Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleInputChange("name", e.target.value)}
                    className="bg-stone-50 border-stone-300 focus:border-green-400 focus:ring-green-200 font-serif"
                    placeholder="e.g. Chicago Zine Fest"
                    required
                    autoComplete="off"
                  />
                </div>

                {/* Event Type */}
                <div className="space-y-2">
                  <Label htmlFor="category" className="text-stone-700 font-serif font-medium">
                    Event Type *
                  </Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => handleInputChange("category", value)}
                  >
                    <SelectTrigger className="bg-stone-50 border-stone-300 focus:border-green-400 focus:ring-green-200 font-serif">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="festival">Festival/Fair</SelectItem>
                      <SelectItem value="swap">Swap/Exchange</SelectItem>
                      <SelectItem value="workshop">Workshop/Meetup</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Event Dates */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="start_date" className="text-stone-700 font-serif font-medium">
                    Start Date *
                  </Label>
                  <Input
                    id="start_date"
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => handleInputChange("start_date", e.target.value)}
                    className="bg-stone-50 border-stone-300 focus:border-green-400 focus:ring-green-200 font-serif"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="end_date" className="text-stone-700 font-serif font-medium">
                    End Date *
                  </Label>
                  <Input
                    id="end_date"
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => handleInputChange("end_date", e.target.value)}
                    className="bg-stone-50 border-stone-300 focus:border-green-400 focus:ring-green-200 font-serif"
                    required
                  />
                </div>
              </div>

              {/* Application Deadline for Festivals */}
              {formData.category === "festival" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="application_deadline" className="text-stone-700 font-serif font-medium">
                      Application Deadline
                    </Label>
                    <Input
                      id="application_deadline"
                      type="date"
                      value={formData.application_deadline}
                      onChange={(e) => handleInputChange("application_deadline", e.target.value)}
                      className="bg-stone-50 border-stone-300 focus:border-green-400 focus:ring-green-200 font-serif"
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Location */}
          <Card className="bg-white/80 backdrop-blur-sm border border-stone-200 shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center text-stone-800 text-xl">
                <MapPin className="h-5 w-5 mr-2 text-green-500" />
                Location
              </CardTitle>
              <p className="text-sm text-stone-600 font-mono">Suggest changes to the event location</p>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Country & Address */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="country" className="text-stone-700 font-serif font-medium">
                    Country *
                  </Label>
                  <Input
                    id="country"
                    value={formData.country}
                    onChange={(e) => handleInputChange("country", e.target.value)}
                    className="bg-stone-50 border-stone-300 focus:border-green-400 focus:ring-green-200 font-serif"
                    placeholder="e.g. United States"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address" className="text-stone-700 font-serif font-medium">
                    Address *
                  </Label>
                  <Input
                    id="address"
                    value={formData.address}
                    onChange={(e) => handleInputChange("address", e.target.value)}
                    className="bg-stone-50 border-stone-300 focus:border-green-400 focus:ring-green-200 font-serif"
                    placeholder="e.g. 123 Main St"
                    required
                  />
                </div>
              </div>

              {/* City & State */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="city" className="text-stone-700 font-serif font-medium">
                    City *
                  </Label>
                  <Input
                    id="city"
                    type="text"
                    value={formData.city}
                    onChange={(e) => handleInputChange("city", e.target.value)}
                    className="bg-stone-50 border-stone-300 focus:border-green-400 focus:ring-green-200 font-serif"
                    placeholder="e.g. Chicago"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="state" className="text-stone-700 font-serif font-medium">
                    State/Province
                  </Label>
                  <Input
                    id="state"
                    type="text"
                    value={formData.state}
                    onChange={(e) => handleInputChange("state", e.target.value)}
                    className="bg-stone-50 border-stone-300 focus:border-green-400 focus:ring-green-200 font-serif"
                    placeholder="e.g. Illinois"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Contact & Links */}
          <Card className="bg-white/80 backdrop-blur-sm border border-stone-200 shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center text-stone-800 text-xl">
                <MessageSquare className="h-5 w-5 mr-2 text-green-500" />
                Contact & Links
              </CardTitle>
              <p className="text-sm text-stone-600 font-mono">Suggest changes to contact information and links</p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-stone-700 font-serif font-medium">
                    Contact Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange("email", e.target.value)}
                    className="bg-stone-50 border-stone-300 focus:border-green-400 focus:ring-green-200 font-serif"
                    placeholder="contact@event.com"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="website" className="text-stone-700 font-serif font-medium">
                    Website
                  </Label>
                  <Input
                    id="website"
                    type="url"
                    value={formData.website}
                    onChange={(e) => handleInputChange("website", e.target.value)}
                    className="bg-stone-50 border-stone-300 focus:border-green-400 focus:ring-green-200 font-serif"
                    placeholder="https://event.com"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="social" className="text-stone-700 font-serif font-medium">
                  Social Media
                </Label>
                <Input
                  id="social"
                  value={formData.social}
                  onChange={(e) => handleInputChange("social", e.target.value)}
                  className="bg-stone-50 border-stone-300 focus:border-green-400 focus:ring-green-200 font-serif"
                  placeholder="their handle or a link to their social"
                />
              </div>
            </CardContent>
          </Card>

          {/* Submit Button */}
          <div className="pt-6 flex justify-center">
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-[#009035] hover:bg-[#007a2a] text-white font-gloria text-lg py-6 transition-colors"
            >
              {isSubmitting ? "Submitting..." : "Submit Edit Suggestion"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
} 