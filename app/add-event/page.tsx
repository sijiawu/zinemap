"use client"

import type React from "react"
import { useSupabaseUser } from "@/hooks/useSupabaseUser"
import { useRouter } from "next/navigation"
import { useEffect, useState, useRef } from "react"
import { ArrowLeft, Calendar, Plus, Check, MapPin, MessageSquare, Tag as TagIcon } from "lucide-react"
import { nanoid } from "nanoid"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import Link from "next/link"
import { supabase } from "@/lib/supabaseClient"
import { EventFormData } from "@/lib/types"

export default function AddEventPage() {
  const { user, loading } = useSupabaseUser()
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState<EventFormData>({
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
    application_open: "",
    application_deadline: "",
    notes: ""
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

    // Check if dates are in the future
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    if (new Date(formData.start_date) < today) {
      setError("Start date must be in the future")
      setIsSubmitting(false)
      return
    }

    if (new Date(formData.end_date) < today) {
      setError("End date must be in the future")
      setIsSubmitting(false)
      return
    }

    if (new Date(formData.end_date) < new Date(formData.start_date)) {
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

      const { error } = await supabase
        .from('events')
        .insert({
          id,
          name: formData.name.trim(),
          city: formData.city.trim(),
          state: formData.state.trim() || null,
          country: formData.country.trim(),
          address: formData.address.trim(),
          email: formData.email?.trim() || null,
          website: formData.website?.trim() || null,
          social: formData.social?.trim() || null,
          category: formData.category,
          start_date: new Date(formData.start_date + 'T00:00:00.000Z').toISOString().split('T')[0],
          end_date: new Date(formData.end_date + 'T00:00:00.000Z').toISOString().split('T')[0],
          application_open: formData.application_open ? new Date(formData.application_open + 'T00:00:00.000Z').toISOString().split('T')[0] : null,
          application_deadline: formData.application_deadline ? new Date(formData.application_deadline + 'T00:00:00.000Z').toISOString().split('T')[0] : null,
          notes: formData.notes?.trim() || null,
          submitted_by: user!.id,
          permalink,
          latitude: coordinates?.latitude || null,
          longitude: coordinates?.longitude || null,
          approved: false,
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
                Your event submission has been received! Our team will review it shortly and add it to the map once approved. Thanks for
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
                      application_open: "",
                      application_deadline: "",
                      notes: ""
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
          Know about an upcoming event for zines, indie comics, or other self-published work? Share the details and we will add it to our community map!
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
                    onChange={(e) => {
                      const startDate = e.target.value;
                      handleInputChange("start_date", startDate);
                      // Automatically set end date to start date if end date is empty or before start date
                      if (!formData.end_date || new Date(formData.end_date) < new Date(startDate)) {
                        handleInputChange("end_date", startDate);
                      }
                    }}
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
                    <Label htmlFor="application_open" className="text-stone-700 font-serif font-medium">
                      Application Opens
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
                        ⚠️ This deadline has already passed
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
    </div>
  )
} 