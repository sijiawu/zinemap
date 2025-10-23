"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, MapPin, Mail, Globe, FileText, CheckCircle, Library as LibraryIcon, Tag as TagIcon, MessageSquare, Plus } from "lucide-react"
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
import { nanoid } from "nanoid"

import { Tag, Library } from "@/lib/types"
import { normalizeUSState } from "@/lib/utils"

export default function AddLibraryPage() {
  const { user, loading } = useSupabaseUser()
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    libraryName: "",
    city: "",
    state: "",
    country: "",
    address: "",
    email: "",
    website: "",
    notes: "",
    hasVisitedBefore: false,
    selectedTerms: [] as string[]
  })

  // Library tags from Supabase
  const [libraryTags, setLibraryTags] = useState<Tag[]>([])
  const [tagsLoading, setTagsLoading] = useState(true)

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

  const generatePermalink = (name: string, city: string): string => {
    const combined = `${name} ${city}`
    return combined
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '') // Remove special characters except spaces and hyphens
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
      .trim()
      .replace(/^-|-$/g, '') // Remove leading/trailing hyphens
  }

  const geocodeAddress = async (address: string, city: string, country: string) => {
    try {
      const query = `${address}, ${city}, ${country}`
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`)
      const data = await response.json()
      
      if (data && data.length > 0) {
        return {
          latitude: parseFloat(data[0].lat),
          longitude: parseFloat(data[0].lon)
        }
      }
    } catch (error) {
      console.error('Geocoding error:', error)
    }
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    // Validate required fields
    if (!formData.libraryName.trim()) {
      setError('Library name is required')
      setIsSubmitting(false)
      return
    }
    if (!formData.city.trim()) {
      setError('City is required')
      setIsSubmitting(false)
      return
    }
    if (!formData.country.trim()) {
      setError('Country is required')
      setIsSubmitting(false)
      return
    }
    if (!formData.address.trim()) {
      setError('Address is required')
      setIsSubmitting(false)
      return
    }

    try {
      // Generate ID and permalink for the library
      const id = nanoid(6)
      const permalink = generatePermalink(formData.libraryName, formData.city)

      // Geocode the address to get coordinates
      const coordinates = await geocodeAddress(formData.address, formData.city, formData.country)

      // Insert library into libraries table
      const { data: libraryData, error: libraryError } = await supabase
        .from('libraries')
        .insert({
          id: id,
          name: formData.libraryName,
          city: formData.city,
          state: normalizeUSState(formData.state, formData.country),
          country: formData.country,
          address: formData.address,
          email: formData.email || null,
          website: formData.website || null,
          notes: formData.notes || null,
          has_visited_before: formData.hasVisitedBefore,
          submitted_by: user!.id,
          permalink: permalink,
          latitude: coordinates?.latitude || null,
          longitude: coordinates?.longitude || null,
          approved: false,
        })
        .select()
        .single()

      if (libraryError) {
        console.error('Library insert error:', libraryError)
        throw new Error('Failed to create library')
      }

      // Insert library tags if any were selected
      if (formData.selectedTerms.length > 0) {
        const libraryTags = formData.selectedTerms.map(termId => ({
          library_id: id,
          tag_id: termId
        }))

        const { error: tagsError } = await supabase
          .from('library_tags')
          .insert(libraryTags)

        if (tagsError) {
          console.error('Library tags insert error:', tagsError)
          // Don't throw here, library was created successfully
        }
      }

      // Insert community note if notes were provided
      if (formData.notes && formData.notes.trim()) {
        const { error: noteError } = await supabase
          .from('community_notes')
          .insert({
            library_id: id,
            store_id: null,
            user_id: user!.id,
            text: formData.notes.trim(),
            anonymous: false,
            has_stocked_here: formData.hasVisitedBefore
          })

        if (noteError) {
          console.error('Community note insert error:', noteError)
          // Don't throw here, library was created successfully
        }
      }

      setIsSubmitted(true)
    } catch (error) {
      console.error('Submission error:', error)
      if (error instanceof Error) {
        setError(error.message)
      } else {
        setError('An unexpected error occurred. Please try again.')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

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

  // Fetch library tags from Supabase
  useEffect(() => {
    const fetchTags = async () => {
      try {
        const { data, error } = await supabase
          .from('tags')
          .select('id, label, category')
          .in('category', ['service', 'access']) // Only fetch library-relevant tags
          .order('category')
        
        if (error) {
          console.error('Error fetching tags:', error)
        } else {
          setLibraryTags(data || [])
        }
      } catch (error) {
        console.error('Error fetching tags:', error)
      } finally {
        setTagsLoading(false)
      }
    }
    fetchTags()
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

    // Extract state/province from context
    const stateContext = suggestion.context?.find((ctx: any) => 
      ctx.id.startsWith('region.') || ctx.id.startsWith('province.')
    )
    let state = ''
    if (stateContext) {
      // For French addresses, prefer the full region name over department codes
      if (suggestion.fullText && suggestion.fullText.includes('France')) {
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

  // Hide suggestions on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (addressSuggestionsRef.current && !addressSuggestionsRef.current.contains(event.target as Node)) {
        setShowAddressSuggestions(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const getTermsByCategory = (category: string) => {
    return libraryTags.filter((term) => term.category === category)
  }

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-stone-50 font-serif">
        <div className="max-w-2xl mx-auto px-4 py-16">
          <Card className="bg-white/80 backdrop-blur-sm border-2 border-green-200 shadow-lg">
            <CardContent className="p-8 text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <h1 className="font-gloria text-3xl font-bold text-stone-800 mb-4">Thank you!</h1>
              <p className="text-stone-600 mb-6 leading-relaxed">
              Your library submission has been received and is pending a quick human review before appearing on the map.
              Thanks for helping fellow zinesters discover new places to find and share zines!
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link href="/">
                  <Button className="bg-blue-500 hover:bg-blue-600 text-white font-gloria">
                    <MapPin className="h-4 w-4 mr-2" />
                    browse libraries
                  </Button>
                </Link>
                                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsSubmitted(false)
                      setFormData({
                        libraryName: "",
                        city: "",
                        state: "",
                        country: "",
                        address: "",
                        email: "",
                        website: "",
                        notes: "",
                        hasVisitedBefore: false,
                        selectedTerms: []
                      })
                      // Generate new preview ID
                      window.location.reload()
                    }}
                    className="border-stone-300 text-stone-700 hover:bg-stone-50 font-gloria"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    add another library
                  </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50 font-serif flex items-center justify-center">
        <div className="text-stone-500 text-lg">Loading...</div>
      </div>
    )
  }

  if (!user) {
    router.push('/login')
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-stone-50 font-serif">
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
          <div className="w-16 h-16 bg-gradient-to-br from-blue-200 to-indigo-200 rounded-full flex items-center justify-center mx-auto mb-4">
                            <LibraryIcon className="h-8 w-8 text-blue-600" />
          </div>
          <h1 className="font-gloria text-4xl font-bold text-stone-800 mb-3">Add a Library to ZineMap</h1>
          <p className="text-lg text-stone-600 max-w-2xl mx-auto leading-relaxed">
            Know a great library with zines or independent publications? Help fellow zinesters discover it! Share the details and we'll
            add it to our community map.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Basic Library Info */}
          <Card className="bg-white border border-stone-200 shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center text-stone-800 text-xl">
                <LibraryIcon className="h-5 w-5 mr-2 text-blue-500" />
                Library Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Library Name */}
              <div className="space-y-2">
                <Label htmlFor="libraryName" className="text-stone-700 font-serif font-medium">
                  Library Name *
                </Label>
                <Input
                  id="libraryName"
                  value={formData.libraryName}
                  onChange={(e) => handleInputChange('libraryName', e.target.value)}
                  placeholder="e.g., Central Public Library"
                  className="bg-stone-50 border-stone-300 focus:border-blue-400 focus:ring-blue-200 font-serif"
                  required
                />
              </div>

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
                        handleInputChange('country', e.target.value)
                        handleCountrySearch(e.target.value)
                      }}
                      onFocus={() => {
                        if (formData.country.trim()) {
                          handleCountrySearch(formData.country)
                        }
                      }}
                      placeholder="e.g., United States"
                      className="bg-stone-50 border-stone-300 focus:border-blue-400 focus:ring-blue-200 font-serif"
                      required
                    />
                    {showCountrySuggestions && countrySuggestions.length > 0 && (
                      <div className="absolute z-50 left-0 right-0 bg-white border border-stone-200 rounded shadow-lg mt-1 max-h-60 overflow-y-auto">
                        {countrySuggestions.map((country) => (
                          <div
                            key={country.code}
                            className="px-4 py-2 hover:bg-stone-50 cursor-pointer border-b border-stone-100 last:border-b-0"
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
                        handleInputChange('address', e.target.value)
                        handleAddressSearch(e.target.value)
                      }}
                      placeholder="e.g., 123 Main Street"
                      className="bg-stone-50 border-stone-300 focus:border-blue-400 focus:ring-blue-200 font-serif"
                      required
                      disabled={!selectedCountry}
                    />
                    {!selectedCountry && (
                      <div className="absolute inset-0 bg-stone-100 rounded flex items-center px-3 text-stone-500 text-sm">
                        Select a country first
                      </div>
                    )}
                  {showAddressSuggestions && addressSuggestions.length > 0 && (
                    <div className="absolute z-50 left-0 right-0 bg-white border border-stone-200 rounded shadow-lg mt-1">
                      {addressSuggestions.map((suggestion) => (
                        <div
                          key={suggestion.id}
                          className="px-4 py-2 hover:bg-stone-50 cursor-pointer border-b border-stone-100 last:border-b-0"
                          onClick={() => handleAddressSelect(suggestion)}
                        >
                          <div className="font-medium">{suggestion.text}</div>
                          <div className="text-sm text-stone-500">{suggestion.fullText}</div>
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
                    value={formData.city}
                    onChange={(e) => handleInputChange('city', e.target.value)}
                    placeholder="e.g., Chicago"
                    className="bg-stone-50 border-stone-300 focus:border-blue-400 focus:ring-blue-200 font-serif"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="state" className="text-stone-700 font-serif font-medium">
                    State/Province/Region
                  </Label>
                  <Input
                    id="state"
                    value={formData.state}
                    onChange={(e) => handleInputChange('state', e.target.value)}
                    placeholder="e.g., Illinois"
                    className="bg-stone-50 border-stone-300 focus:border-blue-400 focus:ring-blue-200 font-serif"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Contact Information */}
          <Card className="bg-white border border-stone-200 shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center text-stone-800 text-xl">
                <Mail className="h-5 w-5 mr-2 text-blue-500" />
                Contact Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-stone-700 font-serif font-medium">
                    Contact Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    placeholder="info@library.org"
                    className="bg-stone-50 border-stone-300 focus:border-blue-400 focus:ring-blue-200 font-serif"
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
                    onChange={(e) => handleInputChange('website', e.target.value)}
                    placeholder="https://library.org"
                    className="bg-stone-50 border-stone-300 focus:border-blue-400 focus:ring-blue-200 font-serif"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Library Features */}
          <Card className="bg-white border border-stone-200 shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center text-stone-800 text-xl">
                <TagIcon className="h-5 w-5 mr-2 text-blue-500" />
                Library Features
              </CardTitle>
              <p className="text-sm text-stone-600 font-mono">What services and access does this library offer? (Select all that apply)</p>
            </CardHeader>
            <CardContent>
              {tagsLoading ? (
                <div className="text-center py-8 text-stone-500">Loading tags...</div>
              ) : (
                <div className="space-y-6">
                  {/* Available Services */}
                  <div>
                    <h4 className="font-semibold text-stone-700 mb-3 font-serif">Available Services</h4>
                    <div className="flex flex-wrap gap-2">
                      {getTermsByCategory('service').map((term) => (
                        <Badge
                          key={term.id}
                          variant={formData.selectedTerms.includes(term.id) ? "default" : "outline"}
                          className={`cursor-pointer transition-all ${
                            formData.selectedTerms.includes(term.id)
                              ? "bg-blue-500 text-white hover:bg-blue-600"
                              : "bg-white border-stone-300 text-stone-700 hover:bg-stone-50"
                          }`}
                          onClick={() => handleTermToggle(term.id)}
                        >
                          {term.label}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* Access Requirements */}
                  <div>
                    <h4 className="font-semibold text-stone-700 mb-3 font-serif">Access Requirements</h4>
                    <div className="flex flex-wrap gap-2">
                      {getTermsByCategory('access').map((term) => (
                        <Badge
                          key={term.id}
                          variant={formData.selectedTerms.includes(term.id) ? "default" : "outline"}
                          className={`cursor-pointer transition-all ${
                            formData.selectedTerms.includes(term.id)
                              ? "bg-blue-500 text-white hover:bg-blue-600"
                              : "bg-white border-stone-300 text-stone-700 hover:bg-blue-50"
                          }`}
                          onClick={() => handleTermToggle(term.id)}
                        >
                          {term.label}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Additional Notes */}
          <Card className="bg-white border border-stone-200 shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center text-stone-800 text-xl">
                <MessageSquare className="h-5 w-5 mr-2 text-blue-500" />
                Add a Community Note
              </CardTitle>
              <p className="text-sm text-stone-600 font-mono">What was it like visiting this library? Got any tips, surprises, or stories about their zine collection?</p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Textarea
                  value={formData.notes}
                  onChange={(e) => handleInputChange('notes', e.target.value)}
                  className="bg-stone-50 border-stone-300 focus:border-blue-400 focus:ring-blue-200 font-serif min-h-[100px]"
                  placeholder="e.g., They have a great zine section in the basement, they're particularly interested in local zines, they have a specific process for donations..."
                />

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="hasVisitedBefore"
                    checked={formData.hasVisitedBefore}
                    onCheckedChange={(checked) => handleInputChange('hasVisitedBefore', checked as boolean)}
                  />
                  <Label htmlFor="hasVisitedBefore" className="text-sm text-stone-700">
                    I have visited this library before
                  </Label>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Error Display */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">Error</h3>
                  <div className="mt-2 text-sm text-red-700">
                    <p>{error}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Submit Button */}
          <div className="flex justify-center">
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-blue-500 hover:bg-blue-600 text-white font-gloria px-8 py-3 text-lg rounded-lg shadow-md transition-colors"
            >
              {isSubmitting ? "submitting..." : "submit"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
} 