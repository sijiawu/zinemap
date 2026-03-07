"use client"

import type React from "react"
import { useSupabaseUser } from "@/hooks/useSupabaseUser"
import { useRouter } from "next/navigation"
import { useEffect, useState, useRef } from "react"
import { ArrowLeft, Calendar, Plus, Check, MapPin, MessageSquare, Tag as TagIcon, Repeat, Image as ImageIcon, X } from "lucide-react"
import { nanoid } from "nanoid"
import { normalizeUSState, getOrdinalAndWeekdayFromDate, WEEKDAY_NAMES, ORDINAL_LABELS, expandRecurringEvents, formatDateWithWeekday } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
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
import Link from "next/link"
import { supabase } from "@/lib/supabaseClient"
import { EventFormData, RecurrenceFrequency } from "@/lib/types"
import { compressImage } from "@/lib/compressImage"

export default function AddEventPage() {
  const { user, loading } = useSupabaseUser()
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isGoingToEvent, setIsGoingToEvent] = useState(false)
  const [showRecurringOrganizerDialog, setShowRecurringOrganizerDialog] = useState(false)
  const [posterImage, setPosterImage] = useState<File | null>(null)
  const [posterImagePreview, setPosterImagePreview] = useState<string | null>(null)

  const [formData, setFormData] = useState<EventFormData>({
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
    notes: "",
    recurrence_frequency: "",
    recurrence_interval: 1,
    recurrence_until: "",
    recurrence_ordinal: 3,
    recurrence_weekday: 0
  })

  // Address autocomplete state
  const [addressSuggestions, setAddressSuggestions] = useState<any[]>([])
  const [showAddressSuggestions, setShowAddressSuggestions] = useState(false)
  const [addressSuggestionsLoading, setAddressSuggestionsLoading] = useState(false)
  const addressSuggestionsRef = useRef<HTMLDivElement>(null)

  // Country autocomplete state
  const [countries, setCountries] = useState<Array<{name: string, code: string}>>([])
  const [countrySuggestions, setCountrySuggestions] = useState<Array<{name: string, code: string}>>([])
  const [showCountrySuggestions, setShowCountrySuggestions] = useState(false)
  const [selectedCountry, setSelectedCountry] = useState<{name: string, code: string} | null>(null)

  // Load countries on component mount
  useEffect(() => {
    const loadCountries = async () => {
      try {
        const response = await fetch('https://restcountries.com/v3.1/all?fields=name,cca2')
        const data = await response.json()
        const countryList = data.map((country: any) => ({
          name: country.name.common,
          code: country.cca2
        })).sort((a: any, b: any) => a.name.localeCompare(b.name))
        setCountries(countryList)
      } catch (error) {
        console.error('Error loading countries:', error)
      }
    }
    loadCountries()
  }, [])

  // Sync recurrence ordinal/weekday when start_date changes (Google Calendar–style: derived from date)
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

  // Handle clicks outside of address suggestions dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (addressSuggestionsRef.current && !addressSuggestionsRef.current.contains(event.target as Node)) {
        setShowAddressSuggestions(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  // Handle country search
  const handleCountrySearch = (value: string) => {
    if (!value.trim()) {
      setCountrySuggestions([])
      setShowCountrySuggestions(false)
      return
    }

    const filtered = countries.filter(country =>
      country.name.toLowerCase().includes(value.toLowerCase())
    ).slice(0, 10)
    
    setCountrySuggestions(filtered)
    setShowCountrySuggestions(true)
  }

  // Handle country selection
  const handleCountrySelect = (country: {name: string, code: string}) => {
    setSelectedCountry(country)
    setFormData(prev => ({ ...prev, country: country.name }))
    setCountrySuggestions([])
    setShowCountrySuggestions(false)
  }

  // Handle address search with country filter
  const handleAddressSearch = async (value: string) => {
    if (!value.trim() || !selectedCountry) {
      setAddressSuggestions([])
      setShowAddressSuggestions(false)
      setAddressSuggestionsLoading(false)
      return
    }
    setAddressSuggestionsLoading(true)
    try {
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(value)}.json?` +
        `access_token=${process.env.NEXT_PUBLIC_MAPBOX_TOKEN}&` +
        `country=${selectedCountry.code}&` +
        `types=address&` +
        `limit=5&` +
        `autocomplete=true&` +
        `language=en`
      )
      
      const data = await response.json()
      const suggestions = data.features.map((feature: any) => {
        // Extract just the street address part (remove city, state, country, zip)
        const addressParts = feature.place_name.split(', ')
        const streetAddress = addressParts[0] // Just the street address
        
        return {
          id: feature.id,
          text: streetAddress,
          fullText: feature.place_name, // Keep full text for context extraction
          coordinates: feature.center,
          context: feature.context
        }
      })
      
      setAddressSuggestions(suggestions)
      setShowAddressSuggestions(true)
    } catch (error) {
      console.error('Error fetching address suggestions:', error)
      setAddressSuggestions([])
      setShowAddressSuggestions(false)
    } finally {
      setAddressSuggestionsLoading(false)
    }
  }

  // Handle address selection
  const handleAddressSelect = (suggestion: any) => {
    // Extract city from context - simple approach
    const cityContext = suggestion.context?.find((ctx: any) => 
      ctx.id.startsWith('place.') && !ctx.text.includes('arrondissement')
    )
    const city = cityContext ? cityContext.text : ''

    // Extract state/province from context - Mapbox provides both full name and abbreviation
    const stateContext = suggestion.context?.find((ctx: any) => 
      ctx.id.startsWith('region.') || ctx.id.startsWith('province.')
    )
    
    // Use the short_code if available (abbreviation), otherwise use the full text
    let state = ''
    if (stateContext) {
      // For French addresses, prefer the full region name over department codes
      if (suggestion.fullText && suggestion.fullText.includes('France')) {
        // Use the full text name instead of short code for French regions
        state = stateContext.text
      } else if (stateContext.short_code) {
        // For other countries, use the abbreviation
        const shortCodeParts = stateContext.short_code.split('-')
        if (shortCodeParts.length >= 2) {
          state = shortCodeParts[1] // Extract "IL" from "US-IL", "ON" from "CA-ON", etc.
        } else {
          state = stateContext.short_code // Fallback if format is unexpected
        }
      } else {
        state = stateContext.text // Use full name if no short_code available
      }
    }

    setFormData(prev => ({
      ...prev,
      address: suggestion.text, // Just the street address
      city: city,
      state: state
    }))
    
    setAddressSuggestions([])
    setShowAddressSuggestions(false)
  }

  // Geocode address to get coordinates
  const geocodeAddress = async (address: string, city: string, country: string) => {
    try {
      const fullAddress = `${address}, ${city}, ${country}`
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(fullAddress)}.json?` +
        `access_token=${process.env.NEXT_PUBLIC_MAPBOX_TOKEN}&` +
        `limit=1`
      )
      
      const data = await response.json()
      if (data.features && data.features.length > 0) {
        const [longitude, latitude] = data.features[0].center
        return { latitude, longitude }
      }
      return null
    } catch (error) {
      console.error('Error geocoding address:', error)
      return null
    }
  }

  // Generate permalink from name and city
  const generatePermalink = (name: string, city: string) => {
    return `${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${city.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`
  }

  // Redirect if not logged in
  if (!loading && !user) {
    router.push("/login")
    return null
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50 font-serif flex items-center justify-center">
        <div className="text-stone-500 text-lg">Loading...</div>
      </div>
    )
  }

  const handleInputChange = (field: keyof EventFormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
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
      const reader = new FileReader()
      reader.onload = (ev) => setPosterImagePreview(ev.target?.result as string)
      reader.readAsDataURL(file)
    }
  }

  // Handle start date change
  const handleStartDateChange = (value: string) => {
    handleInputChange("start_date", value)
    // Recurring events are single-day only: end_date = start_date
    if (formData.recurrence_frequency) {
      handleInputChange("end_date", value)
    } else if (!formData.end_date || new Date(formData.end_date) < new Date(value)) {
      handleInputChange("end_date", value)
    }
  }


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    // Validation
    if (!formData.name.trim()) {
      setError("Event name is required")
      setIsSubmitting(false)
      return
    }

    if (!formData.city.trim()) {
      setError("City is required")
      setIsSubmitting(false)
      return
    }

    if (!formData.country.trim()) {
      setError("Country is required")
      setIsSubmitting(false)
      return
    }

    if (!formData.address.trim()) {
      setError("Address is required")
      setIsSubmitting(false)
      return
    }

    if (!formData.start_date) {
      setError("Start date is required")
      setIsSubmitting(false)
      return
    }

    if (!formData.end_date) {
      setError("End date is required")
      setIsSubmitting(false)
      return
    }


    if (formData.recurrence_frequency) {
      if (formData.end_date !== formData.start_date) {
        setError("Recurring events are single-day only — end date must match start date")
        setIsSubmitting(false)
        return
      }
    } else if (new Date(formData.end_date) < new Date(formData.start_date)) {
      setError("End date must be after start date")
      setIsSubmitting(false)
      return
    }

    try {
      // Generate ID and permalink for the event
      const id = nanoid(6)
      const permalink = generatePermalink(formData.name, formData.city)

      // Geocode the address to get coordinates
      const coordinates = await geocodeAddress(formData.address, formData.city, formData.country)

      const freq = formData.recurrence_frequency
      const recurrenceFreq: RecurrenceFrequency | null = 
        freq === 'weekly' || freq === 'monthly' ? freq : null
      const recurrenceInterval = recurrenceFreq ? (formData.recurrence_interval ?? 1) : null
      const recurrenceUntil = formData.recurrence_until?.trim()
        ? new Date(formData.recurrence_until + 'T00:00:00.000Z').toISOString().split('T')[0]
        : null
      const recurrenceOrdinal = recurrenceFreq === 'monthly' ? (formData.recurrence_ordinal ?? 3) : null
      const recurrenceWeekday = recurrenceFreq === 'monthly' ? (formData.recurrence_weekday ?? 0) : null

      let posterImageUrl: string | null = null
      if (posterImage && user) {
        const compressed = await compressImage(posterImage)
        const fileName = `event-posters/${user.id}/${Date.now()}.jpg`
        const { error: uploadError } = await supabase.storage
          .from('zine-covers')
          .upload(fileName, compressed, { cacheControl: '3600', upsert: false })
        if (uploadError) {
          console.error('Poster upload error:', uploadError)
          throw new Error('Failed to upload poster image. Please try again.')
        }
        const { data: urlData } = supabase.storage.from('zine-covers').getPublicUrl(fileName)
        posterImageUrl = urlData.publicUrl
      }

      const { error } = await supabase
        .from('events')
        .insert({
          id,
          name: formData.name.trim(),
          venue_name: formData.venue_name?.trim() || null,
          city: formData.city.trim(),
          state: normalizeUSState(formData.state.trim(), formData.country.trim()) || null,
          country: formData.country.trim(),
          address: formData.address.trim(),
          email: formData.email?.trim() || null,
          website: formData.website?.trim() || null,
          social: formData.social?.trim() || null,
          category: formData.category,
          start_date: new Date(formData.start_date + 'T00:00:00.000Z').toISOString().split('T')[0],
          end_date: new Date(formData.end_date + 'T00:00:00.000Z').toISOString().split('T')[0],
          start_time: formData.start_time?.trim() || null,
          end_time: formData.end_time?.trim() || null,
          application_open: formData.application_open ? new Date(formData.application_open + 'T00:00:00.000Z').toISOString().split('T')[0] : null,
          application_deadline: formData.application_deadline ? new Date(formData.application_deadline + 'T00:00:00.000Z').toISOString().split('T')[0] : null,
          notes: formData.notes?.trim() || null,
          submitted_by: user!.id,
          permalink,
          latitude: coordinates?.latitude || null,
          longitude: coordinates?.longitude || null,
          approved: false,
          recurrence_frequency: recurrenceFreq,
          recurrence_interval: recurrenceInterval,
          recurrence_until: recurrenceUntil,
          recurrence_ordinal: recurrenceOrdinal,
          recurrence_weekday: recurrenceWeekday,
          poster_image: posterImageUrl,
        })

      if (error) {
        console.error('Error creating event:', error)
        throw new Error('Failed to create event')
      }

              // Insert community note if notes were provided
        if (formData.notes && formData.notes.trim()) {
          const { error: noteError } = await supabase
            .from('community_notes')
            .insert({
              event_id: id,
              user_id: user!.id,
              text: formData.notes.trim(),
              anonymous: false,
              has_stocked_here: false
            })

          if (noteError) {
            console.error('Community note insert error:', noteError)
            // Don't throw here, event was created successfully
          }
        }

        // Insert attendance if user checked "I am going to this event!"
        if (isGoingToEvent) {
          const { error: attendanceError } = await supabase
            .from('event_attendees')
            .insert({
              event_id: id,
              user_id: user!.id
            })

          if (attendanceError) {
            console.error('Event attendance insert error:', attendanceError)
            // Don't throw here, event was created successfully
          }
        }

      setIsSubmitted(true)
    } catch (error) {
      console.error('Submission error:', error)
      if (!error) {
        setError('An unexpected error occurred. Please try again.')
      }
    } finally {
      setIsSubmitting(false)
    }
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
              <h1 className="font-gloria text-3xl font-bold text-stone-800 mb-4">Thank you!</h1>
              <p className="text-stone-600 mb-6 leading-relaxed">
                Your event submission has been received and is pending a quick human review before appearing on the map. Thanks for
                helping fellow zinesters discover new events to attend and share their work!
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link href="/">
                  <Button className="bg-green-500 hover:bg-green-600 text-white font-gloria">
                    <MapPin className="h-4 w-4 mr-2" />
                    browse events
                  </Button>
                </Link>
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsSubmitted(false)
                    setFormData({
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
                      notes: "",
                      recurrence_frequency: "",
                      recurrence_interval: 1,
                      recurrence_until: "",
                      recurrence_ordinal: 3,
                      recurrence_weekday: 0
                    })
                    // Generate new preview ID
                    window.location.reload()
                  }}
                  className="border-stone-300 text-stone-700 hover:bg-stone-50 font-gloria"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  add another event
                </Button>
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
          <Link href="/">
            <Button variant="ghost" size="sm" className="text-stone-600 hover:text-stone-800 hover:bg-stone-100">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to map
            </Button>
          </Link>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-green-200 to-teal-200 rounded-full flex items-center justify-center mx-auto mb-4">
            <Calendar className="h-8 w-8 text-green-600" />
          </div>
          <h1 className="font-gloria text-4xl font-bold text-stone-800 mb-3">Add an Event to ZineMap</h1>
          <p className="text-lg text-stone-600 max-w-2xl mx-auto leading-relaxed">
          Know about an upcoming event for zines, indie comics, or other self-published work? Share the details and help others discover it!
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
                <Calendar className="h-5 w-5 mr-2 text-green-500" />
                Event Details
              </CardTitle>
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
                  Poster Image (optional)
                </Label>
                <p className="text-sm text-stone-500">Add a poster or flyer image for the event</p>
                <div className="mt-1">
                  {posterImagePreview ? (
                    <div className="relative inline-block">
                      <img
                        src={posterImagePreview}
                        alt="Poster preview"
                        className="w-full max-w-xs h-48 object-cover rounded-lg border border-stone-200"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setPosterImage(null)
                          setPosterImagePreview(null)
                        }}
                        className="absolute top-2 right-2 h-6 w-6 p-0 bg-white/80 hover:bg-white rounded"
                      >
                        <X className="h-3 w-3" />
                      </Button>
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
                        <p className="text-sm text-stone-600">Click to upload poster</p>
                        <p className="text-xs text-stone-500 mt-1">JPG, PNG, GIF up to 5MB</p>
                      </label>
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

                {/* Next event date / Start Date + End Date + Times — right below checkbox */}
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
                      {formData.start_date && new Date(formData.start_date) < new Date() && (
                        <p className="text-amber-600 text-sm font-medium">
                         📅 Past event detected - thanks for contributing to the archive!
                        </p>
                      )}
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
                  {/* When recurring: show times + recurrence options only after user fills next event date */}
                  {(!formData.recurrence_frequency || formData.start_date) && (
                    <>
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
                    </>
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
                        Series may include a maximum of 12 occurrences or run up to 1 year, whichever comes first.                      </p>
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

              {/* Application Deadline for Festivals */}
              {formData.category === "festival" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="application_open" className="text-stone-700 font-serif font-medium">
                      Application Opens (feel free to skip if already open)
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
                    {formData.application_deadline && new Date(formData.application_deadline) < new Date() && (
                      <p className="text-amber-600 text-sm font-medium">
                        This event will show up with a "submission closed" tag.
                      </p>
                    )}
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
              <p className="text-sm text-stone-600 font-mono">Where is this event happening?</p>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Country & Address */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="country" className="text-stone-700 font-serif font-medium">
                    Country *
                  </Label>
                  <div className="relative">
                    <Input
                      id="country"
                      value={formData.country}
                      onChange={(e) => {
                        setFormData(prev => ({ ...prev, country: e.target.value }));
                        handleCountrySearch(e.target.value);
                      }}
                      onBlur={() => setTimeout(() => setShowCountrySuggestions(false), 200)}
                      onFocus={() => {
                        if (formData.country.trim()) {
                          handleCountrySearch(formData.country);
                        }
                      }}
                      className="bg-stone-50 border-stone-300 focus:border-green-400 focus:ring-green-200 font-serif"
                      placeholder="e.g. United States"
                      required
                    />
                    {showCountrySuggestions && countrySuggestions.length > 0 && (
                      <div className="absolute z-50 left-0 right-0 bg-white border border-stone-200 rounded shadow-lg mt-1 max-h-60 overflow-y-auto">
                        {countrySuggestions.map((country) => (
                          <div
                            key={country.code}
                            className="px-4 py-2 hover:bg-green-50 cursor-pointer text-stone-800"
                            onClick={() => handleCountrySelect(country)}
                          >
                            {country.name}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address" className="text-stone-700 font-serif font-medium">
                    Address *
                  </Label>
                  <div className="relative" ref={addressSuggestionsRef}>
                    <Input
                      id="address"
                      value={formData.address}
                      onChange={(e) => {
                        setFormData(prev => ({ ...prev, address: e.target.value }));
                        if (selectedCountry) {
                          handleAddressSearch(e.target.value);
                        }
                      }}
                      onBlur={() => setTimeout(() => setShowAddressSuggestions(false), 200)}
                      onFocus={() => {
                        if (selectedCountry && formData.address.trim()) {
                          handleAddressSearch(formData.address);
                        }
                      }}
                      className={`font-serif ${
                        selectedCountry 
                          ? "bg-stone-50 border-stone-300 focus:border-green-400 focus:ring-green-200" 
                          : "bg-stone-100 border-stone-200 text-stone-400 cursor-not-allowed"
                      }`}
                      placeholder={selectedCountry ? "e.g. 123 Main St" : "Select a country first"}
                      autoComplete="off"
                      disabled={!selectedCountry}
                    />
                    {!selectedCountry && (
                      <div className="absolute inset-0 bg-stone-100 rounded flex items-center px-3 text-stone-500 text-sm">
                        Select a country first
                      </div>
                    )}
                    {showAddressSuggestions && addressSuggestions.length > 0 && (
                      <div className="absolute z-50 left-0 right-0 bg-white border border-stone-200 rounded shadow-lg mt-1 max-h-60 overflow-y-auto">
                        {addressSuggestions.map((feature) => (
                          <div
                            key={feature.id}
                            className="px-4 py-2 hover:bg-green-50 cursor-pointer text-stone-800"
                            onClick={() => handleAddressSelect(feature)}
                          >
                            <div className="font-medium">{feature.text}</div>
                            <div className="text-sm text-stone-500">{feature.fullText}</div>
                          </div>
                        ))}
                      </div>
                    )}
                    {showAddressSuggestions && addressSuggestionsLoading && addressSuggestions.length === 0 && (
                      <div className="absolute z-50 left-0 right-0 bg-white border border-stone-200 rounded shadow-lg mt-1 px-4 py-2 text-stone-400">
                        Loading suggestions...
                      </div>
                    )}
                  </div>
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
          <Card className="bg-white border border-stone-200 shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center text-stone-800 text-xl">
                <MessageSquare className="h-5 w-5 mr-2 text-green-500" />
                Contact & Links
              </CardTitle>
              <p className="text-sm text-stone-600 font-mono">How can people get in touch or learn more?</p>
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

          {/* Additional Information */}
          <Card className="bg-white border border-stone-200 shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center text-stone-800 text-xl">
                <TagIcon className="h-5 w-5 mr-2 text-green-500" />
                Additional Information
              </CardTitle>
              <p className="text-sm text-stone-600 font-mono">Tell us more about this event</p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => handleInputChange("notes", e.target.value)}
                  className="bg-stone-50 border-stone-300 focus:border-green-400 focus:ring-green-200 font-serif min-h-[120px]"
                  placeholder="Tell us more about this event... What makes it special? Any important details attendees should know?"
                  rows={5}
                />
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="isGoingToEvent"
                  checked={isGoingToEvent}
                  onCheckedChange={(checked) => setIsGoingToEvent(checked as boolean)}
                />
                <Label htmlFor="isGoingToEvent" className="text-sm text-stone-600">
                  I am going to this event!
                </Label>
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
              {isSubmitting ? "Adding Event..." : "Submit"}
            </Button>
          </div>
        </form>
      </div>

      {/* Recurring organizer confirmation dialog */}
      <Dialog open={showRecurringOrganizerDialog} onOpenChange={setShowRecurringOrganizerDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif">Are you the organizer of this event series?</DialogTitle>
            <DialogDescription className="text-stone-600 font-serif">
            Recurring events include multiple dates and can be trickier to manage.
            If you're not the organizer, would you consider asking them to add it instead? Event organizers will have direct edit access to the whole series.       
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
  )
} 