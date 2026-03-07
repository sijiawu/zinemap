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
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ArrowLeft, MapPin, Calendar, MessageSquare, Check, Image as ImageIcon, Repeat } from "lucide-react"
import Link from "next/link"
import { supabase } from "@/lib/supabaseClient"
import { Event } from "@/lib/types"
import { compressImage } from "@/lib/compressImage"
import { getOrdinalAndWeekdayFromDate, WEEKDAY_NAMES, ORDINAL_LABELS, expandRecurringEvents, formatDateWithWeekday } from "@/lib/utils"

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
    venue_name: "",
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
    start_time: "",
    end_time: "",
    application_open: "",
    application_deadline: "",
    recurrence_frequency: "" as "" | "weekly" | "monthly",
    recurrence_interval: 1,
    recurrence_until: "",
    recurrence_ordinal: 3,
    recurrence_weekday: 0
  })
  const [showRecurringOrganizerDialog, setShowRecurringOrganizerDialog] = useState(false)
  const [posterImage, setPosterImage] = useState<File | null>(null)
  const [posterImagePreview, setPosterImagePreview] = useState<string | null>(null)
  const [removePoster, setRemovePoster] = useState(false)

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
          const derived = eventData.start_date ? getOrdinalAndWeekdayFromDate(eventData.start_date) : null
          setFormData({
            name: eventData.name || "",
            venue_name: eventData.venue_name || "",
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
            start_time: eventData.start_time || "",
            end_time: eventData.end_time || "",
            application_open: eventData.application_open || "",
            application_deadline: eventData.application_deadline || "",
            recurrence_frequency: (eventData.recurrence_frequency || "") as "" | "weekly" | "monthly",
            recurrence_interval: eventData.recurrence_interval ?? 1,
            recurrence_until: eventData.recurrence_until || "",
            recurrence_ordinal: eventData.recurrence_ordinal ?? (derived?.ordinal ?? 3),
            recurrence_weekday: eventData.recurrence_weekday ?? (derived?.weekday ?? 0)
          })
          setPosterImagePreview(eventData.poster_image || null)
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

  const handleInputChange = (field: keyof typeof formData, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  // Sync recurrence ordinal/weekday when start_date changes
  useEffect(() => {
    if (!formData.recurrence_frequency || !formData.start_date) return
    const derived = getOrdinalAndWeekdayFromDate(formData.start_date)
    if (!derived) return
    setFormData(prev =>
      prev.recurrence_ordinal === derived.ordinal && prev.recurrence_weekday === derived.weekday
        ? prev
        : { ...prev, recurrence_ordinal: derived.ordinal, recurrence_weekday: derived.weekday }
    )
  }, [formData.start_date, formData.recurrence_frequency])

  const handleStartDateChange = (value: string) => {
    handleInputChange("start_date", value)
    if (formData.recurrence_frequency) {
      handleInputChange("end_date", value)
    } else if (!formData.end_date || new Date(formData.end_date) < new Date(value)) {
      handleInputChange("end_date", value)
    }
  }

  const handlePosterImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError('Image must be smaller than 5MB')
        return
      }
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif']
      if (!allowedTypes.includes(file.type)) {
        setError('Please select a JPG, PNG, or GIF file')
        return
      }
      setError(null)
      setPosterImage(file)
      setRemovePoster(false)
      const reader = new FileReader()
      reader.onload = (ev) => setPosterImagePreview(ev.target?.result as string)
      reader.readAsDataURL(file)
    }
  }

  const handleRemovePoster = () => {
    setPosterImage(null)
    setPosterImagePreview(null)
    setRemovePoster(true)
  }

  const handleKeepPoster = () => {
    setPosterImage(null)
    setPosterImagePreview(event?.poster_image || null)
    setRemovePoster(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !event) return

    if (formData.recurrence_frequency && formData.end_date !== formData.start_date) {
      setError("Recurring events are single-day only — end date must match start date")
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      // Create a human-readable summary of changes
      const changes = []
      
      if (formData.name !== event.name) {
        changes.push(`old name: ${event.name}\nnew name: ${formData.name}`)
      }
      if (formData.venue_name !== event.venue_name) {
        changes.push(`old venue name: ${event.venue_name || 'none'}\nnew venue name: ${formData.venue_name || 'none'}`)
      }      if (formData.city !== event.city) {
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
      if (formData.start_time !== (event.start_time ?? "")) {
        changes.push(`old start time: ${event.start_time || 'none'}\nnew start time: ${formData.start_time || 'none'}`)
      }
      if (formData.end_time !== (event.end_time ?? "")) {
        changes.push(`old end time: ${event.end_time || 'none'}\nnew end time: ${formData.end_time || 'none'}`)
      }
      if (formData.recurrence_frequency !== (event.recurrence_frequency ?? "")) {
        changes.push(`old recurrence: ${event.recurrence_frequency || 'one-time'}\nnew recurrence: ${formData.recurrence_frequency || 'one-time'}`)
      }
      if (formData.recurrence_frequency && formData.recurrence_until !== (event.recurrence_until ?? "")) {
        changes.push(`old recurrence until: ${event.recurrence_until || 'none'}\nnew recurrence until: ${formData.recurrence_until || 'none'}`)
      }
      if (removePoster) {
        changes.push('remove poster image')
      }
      if (posterImage) {
        changes.push('add/update poster image')
      }

      const editSummary = changes.length > 0 
        ? changes.join('\n\n')
        : 'No specific changes detected'

      let posterImageUrl: string | null | undefined = undefined
      if (removePoster) {
        posterImageUrl = null
      } else if (posterImage && user) {
        const compressed = await compressImage(posterImage)
        const fileName = `event-posters/${user.id}/${Date.now()}.jpg`
        const { error: uploadError } = await supabase.storage
          .from('zine-covers')
          .upload(fileName, compressed, { cacheControl: '3600', upsert: false })
        if (uploadError) {
          throw new Error('Failed to upload poster image. Please try again.')
        }
        const { data: urlData } = supabase.storage.from('zine-covers').getPublicUrl(fileName)
        posterImageUrl = urlData.publicUrl
      }

      const freq = formData.recurrence_frequency
      const recurrenceFreq = freq === "weekly" || freq === "monthly" ? freq : null
      const recurrenceInterval = recurrenceFreq ? (formData.recurrence_interval ?? 1) : null
      const recurrenceUntil = formData.recurrence_until?.trim()
        ? new Date(formData.recurrence_until + "T00:00:00.000Z").toISOString().split("T")[0]
        : null
      const recurrenceOrdinal = recurrenceFreq === "monthly" ? (formData.recurrence_ordinal ?? 3) : null
      const recurrenceWeekday = recurrenceFreq === "monthly" ? (formData.recurrence_weekday ?? 0) : null

      const editPayload = {
        name: formData.name,
        venue_name: formData.venue_name || null,
        city: formData.city,
        state: formData.state || null,
        country: formData.country,
        address: formData.address,
        email: formData.email || null,
        website: formData.website || null,
        social: formData.social || null,
        category: formData.category,
        start_date: formData.start_date,
        end_date: formData.end_date,
        start_time: formData.start_time?.trim() || null,
        end_time: formData.end_time?.trim() || null,
        application_open: formData.application_open?.trim() ? new Date(formData.application_open + "T00:00:00.000Z").toISOString().split("T")[0] : null,
        application_deadline: formData.application_deadline?.trim() ? new Date(formData.application_deadline + "T00:00:00.000Z").toISOString().split("T")[0] : null,
        recurrence_frequency: recurrenceFreq,
        recurrence_interval: recurrenceInterval,
        recurrence_until: recurrenceUntil,
        recurrence_ordinal: recurrenceOrdinal,
        recurrence_weekday: recurrenceWeekday,
        ...(posterImageUrl !== undefined && { poster_image: posterImageUrl })
      }

      const { error } = await supabase
        .from('locale_edits')
        .insert({
          event_id: event.id,
          user_id: user.id,
          edit_summary: editSummary,
          edit_payload: editPayload,
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
              Your edits have been received! A human (me) will review the changes shortly before they are reflected on the page. Thank you for helping keep the information accurate and up-to-date!
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

              {/* Venue Name */}
              <div className="space-y-2">
                <Label htmlFor="venue_name" className="text-stone-700 font-serif font-medium">
                  Venue Name
                </Label>
                <Input
                  id="venue_name"
                  value={formData.venue_name}
                  onChange={(e) => handleInputChange("venue_name", e.target.value)}
                  className="bg-stone-50 border-stone-300 focus:border-green-400 focus:ring-green-200 font-serif"
                  placeholder="e.g. Chicago Cultural Center"
                  autoComplete="off"
                />
              </div>

              {/* Poster Image */}
              <div className="space-y-2">
                <Label className="text-stone-700 font-serif font-medium">
                  Poster Image
                </Label>
                <p className="text-sm text-stone-500">Add, change, or remove the event poster</p>
                <div className="mt-1">
                  {posterImagePreview ? (
                    <div className="relative inline-block">
                      <img
                        src={posterImagePreview}
                        alt="Poster preview"
                        className="w-full max-w-xs h-48 object-cover rounded-lg border border-stone-200"
                      />
                      <div className="flex gap-2 mt-2">
                        <label className="cursor-pointer">
                          <span className="text-sm text-[#009035] hover:underline">Change</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handlePosterImageChange}
                            className="hidden"
                          />
                        </label>
                        <button
                          type="button"
                          onClick={removePoster ? handleKeepPoster : handleRemovePoster}
                          className="text-sm text-stone-600 hover:text-red-600 hover:underline"
                        >
                          {removePoster ? 'Keep poster' : 'Remove poster'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="border-2 border-dashed border-stone-300 rounded-lg p-6 text-center hover:border-stone-400 transition-colors max-w-xs">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handlePosterImageChange}
                        className="hidden"
                        id="poster-image"
                      />
                      <label htmlFor="poster-image" className="cursor-pointer block">
                        <ImageIcon className="h-8 w-8 text-stone-400 mx-auto mb-2" />
                        <p className="text-sm text-stone-600">
                          {event.poster_image ? 'Click to replace poster' : 'Click to add poster'}
                        </p>
                        <p className="text-xs text-stone-500 mt-1">JPG, PNG, GIF up to 5MB</p>
                      </label>
                      {event.poster_image && (
                        <button
                          type="button"
                          onClick={handleKeepPoster}
                          className="mt-2 text-sm text-stone-500 hover:underline"
                        >
                          {removePoster ? 'Undo remove' : 'Keep current poster'}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Recurring Event */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="is_recurring"
                    checked={!!formData.recurrence_frequency}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setShowRecurringOrganizerDialog(true)
                      } else {
                        setFormData(prev => ({ ...prev, recurrence_frequency: "", recurrence_interval: 1, recurrence_until: "" }))
                      }
                    }}
                  />
                  <Label htmlFor="is_recurring" className="text-stone-700 font-serif font-medium cursor-pointer flex items-center gap-1">
                    <Repeat className="h-4 w-4 text-green-500" />
                    This is a recurring event
                  </Label>
                </div>

                {/* Start Date + End Date + Times */}
                <div className="space-y-4">
                  <div className={formData.recurrence_frequency ? "space-y-2" : "grid grid-cols-1 md:grid-cols-2 gap-6"}>
                    <div className="space-y-2">
                      <Label htmlFor="start_date" className="text-stone-700 font-serif font-medium">
                        {formData.recurrence_frequency ? "Next event date *" : "Start Date *"}
                      </Label>
                      <Input
                        id="start_date"
                        type="date"
                        value={formData.start_date}
                        onChange={(e) => handleStartDateChange(e.target.value)}
                        className="bg-stone-50 border-stone-300 focus:border-green-400 focus:ring-green-200 font-serif"
                        required
                      />
                    </div>
                    {!formData.recurrence_frequency && (
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
                    )}
                  </div>
                  {(!formData.recurrence_frequency || formData.start_date) && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="start_time" className="text-stone-700 font-serif font-medium">
                          Start Time (optional)
                        </Label>
                        <Input
                          id="start_time"
                          type="time"
                          value={formData.start_time}
                          onChange={(e) => handleInputChange("start_time", e.target.value)}
                          className="bg-stone-50 border-stone-300 font-serif"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="end_time" className="text-stone-700 font-serif font-medium">
                          End Time (optional)
                        </Label>
                        <Input
                          id="end_time"
                          type="time"
                          value={formData.end_time}
                          onChange={(e) => handleInputChange("end_time", e.target.value)}
                          className="bg-stone-50 border-stone-300 font-serif"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {formData.recurrence_frequency && formData.start_date && (() => {
                  const derived = getOrdinalAndWeekdayFromDate(formData.start_date) ?? { ordinal: 1, weekday: 1 }
                  const dayName = WEEKDAY_NAMES[derived.weekday] ?? "day"
                  const ordLabel = ORDINAL_LABELS[derived.ordinal] ?? "1st"
                  const recurrenceMode = formData.recurrence_frequency === "weekly"
                    ? (formData.recurrence_interval ?? 1) > 1
                      ? "weekly-interval"
                      : "weekly"
                    : (formData.recurrence_interval ?? 1) > 1
                      ? "monthly-interval"
                      : "monthly"
                  return (
                    <div className="space-y-4 pl-6">
                      <div className="space-y-2">
                        <Label htmlFor="recurrence_mode" className="text-stone-600 font-serif text-sm">
                          Repeats
                        </Label>
                        <Select
                          value={recurrenceMode}
                          onValueChange={(value) => {
                            const ord = derived.ordinal
                            const wd = derived.weekday
                            if (value === "weekly") {
                              setFormData(prev => ({ ...prev, recurrence_frequency: "weekly", recurrence_interval: 1, recurrence_ordinal: ord, recurrence_weekday: wd, end_date: prev.start_date || prev.end_date }))
                            } else if (value === "weekly-interval") {
                              setFormData(prev => ({ ...prev, recurrence_frequency: "weekly", recurrence_interval: 2, recurrence_ordinal: ord, recurrence_weekday: wd, end_date: prev.start_date || prev.end_date }))
                            } else if (value === "monthly") {
                              setFormData(prev => ({ ...prev, recurrence_frequency: "monthly", recurrence_interval: 1, recurrence_ordinal: ord, recurrence_weekday: wd, end_date: prev.start_date || prev.end_date }))
                            } else {
                              setFormData(prev => ({ ...prev, recurrence_frequency: "monthly", recurrence_interval: 2, recurrence_ordinal: ord, recurrence_weekday: wd, end_date: prev.start_date || prev.end_date }))
                            }
                          }}
                        >
                          <SelectTrigger className="bg-stone-50 border-stone-300 font-serif">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="weekly">Weekly on {dayName}</SelectItem>
                            <SelectItem value="monthly">Monthly on the {ordLabel} {dayName}</SelectItem>
                            <SelectItem value="weekly-interval">Every [ ] weeks on {dayName} - set interval below</SelectItem>
                            <SelectItem value="monthly-interval">Every [ ] months on the {ordLabel} {dayName} - set interval below</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      {recurrenceMode === "weekly-interval" && (
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-stone-600 font-serif text-sm">Every</span>
                          <Select
                            value={String(formData.recurrence_interval ?? 2)}
                            onValueChange={(v) => setFormData(prev => ({ ...prev, recurrence_interval: parseInt(v, 10) }))}
                          >
                            <SelectTrigger className="bg-stone-50 border-stone-300 font-serif w-20">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {Array.from({ length: 11 }, (_, i) => i + 2).map((n) => (
                                <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <span className="text-stone-600 font-serif text-sm">weeks on {dayName}</span>
                        </div>
                      )}
                      {recurrenceMode === "monthly-interval" && (
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-stone-600 font-serif text-sm">Every</span>
                          <Select
                            value={String(formData.recurrence_interval ?? 2)}
                            onValueChange={(v) => setFormData(prev => ({ ...prev, recurrence_interval: parseInt(v, 10) }))}
                          >
                            <SelectTrigger className="bg-stone-50 border-stone-300 font-serif w-20">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {Array.from({ length: 11 }, (_, i) => i + 2).map((n) => (
                                <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <span className="text-stone-600 font-serif text-sm">months on the {ordLabel} {dayName}</span>
                        </div>
                      )}
                      <div className="space-y-2">
                        <Label htmlFor="recurrence_until" className="text-stone-600 font-serif text-sm">
                          Until (optional)
                        </Label>
                        <Input
                          id="recurrence_until"
                          type="date"
                          value={formData.recurrence_until}
                          onChange={(e) => handleInputChange("recurrence_until", e.target.value)}
                          className="bg-stone-50 border-stone-300 font-serif"
                          placeholder="No end date"
                        />
                      </div>
                      <p className="text-stone-500 text-xs">
                        Series may include a maximum of 12 occurrences or run up to 1 year, whichever comes first.
                      </p>
                      {formData.recurrence_frequency && formData.start_date && (() => {
                        const previewEvent = {
                          id: "preview",
                          name: "",
                          city: "",
                          country: "",
                          address: "",
                          submitted_by: "",
                          created_at: new Date().toISOString(),
                          category: "festival" as const,
                          start_date: formData.start_date,
                          end_date: formData.end_date || formData.start_date,
                          recurrence_frequency: formData.recurrence_frequency,
                          recurrence_interval: formData.recurrence_interval ?? 1,
                          recurrence_until: formData.recurrence_until || undefined,
                          recurrence_ordinal: formData.recurrence_ordinal ?? 1,
                          recurrence_weekday: formData.recurrence_weekday ?? 0,
                        }
                        const occurrences = expandRecurringEvents([previewEvent])
                        return (
                          <p className="text-stone-500 text-xs mt-2">
                            This event series is scheduled to occur on the following dates:
                            <br />
                            {occurrences.map((o) => (
                              <span key={o.occurrence_start} className="block mt-0.5">
                                {formatDateWithWeekday(o.occurrence_start)}
                              </span>
                            ))}
                          </p>
                        )
                      })()}
                    </div>
                  )
                })()}
              </div>

              {/* Application Open & Deadline for Festivals */}
              {formData.category === "festival" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="application_open" className="text-stone-700 font-serif font-medium">
                      Application Opens (optional)
                    </Label>
                    <Input
                      id="application_open"
                      type="date"
                      value={formData.application_open}
                      onChange={(e) => handleInputChange("application_open", e.target.value)}
                      className="bg-stone-50 border-stone-300 focus:border-green-400 focus:ring-green-200 font-serif"
                    />
                  </div>
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

        {/* Recurring organizer confirmation dialog */}
        <Dialog open={showRecurringOrganizerDialog} onOpenChange={setShowRecurringOrganizerDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="font-serif">Are you the organizer of this event series?</DialogTitle>
              <DialogDescription className="text-stone-600 font-serif">
                Recurring events include multiple dates and can be trickier to manage.
                If you&apos;re not the organizer, would you consider asking them to add it instead? Event organizers will have direct edit access to the whole series.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                variant="outline"
                className="font-serif"
                onClick={() => setShowRecurringOrganizerDialog(false)}
              >
                I&apos;ll ask the organizer
              </Button>
              <Button
                className="bg-[#009035] hover:bg-[#007a2a] font-serif"
                onClick={() => {
                  const derived = getOrdinalAndWeekdayFromDate(formData.start_date) ?? { ordinal: 1, weekday: 1 }
                  setFormData(prev => ({
                    ...prev,
                    recurrence_frequency: "monthly",
                    recurrence_interval: 1,
                    recurrence_ordinal: derived.ordinal,
                    recurrence_weekday: derived.weekday,
                    end_date: prev.start_date || prev.end_date
                  }))
                  setShowRecurringOrganizerDialog(false)
                }}
              >
                I am the organizer
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
} 