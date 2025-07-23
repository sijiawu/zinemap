"use client"

import type React from "react"
import { useSupabaseUser } from "@/hooks/useSupabaseUser"
import { useRouter } from "next/navigation"
import { useEffect, useState, useRef } from "react"
import { ArrowLeft, Library, Plus, Check, MapPin, MessageSquare, Tag } from "lucide-react"
import { nanoid } from "nanoid"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { supabase } from "@/lib/supabaseClient"
import {isProd} from "@/app/utilities";

interface Tag {
  id: string
  label: string
  category: string
}

interface Library {
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

export default function AddLibraryPage() {
  const { user, loading } = useSupabaseUser()
  const router = useRouter()
  const [formData, setFormData] = useState({
    libraryName: "",
    city: "",
    country: "",
    address: "",
    email: "",
    website: "",
    selectedTerms: [] as string[],
    notes: "",
    hasStockedBefore: false,
  })
  const [previewId] = useState(() => nanoid(6))
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Address autocomplete state
  const [addressSuggestions, setAddressSuggestions] = useState<any[]>([])
  const [showAddressSuggestions, setShowAddressSuggestions] = useState(false)
  const [addressSuggestionsLoading, setAddressSuggestionsLoading] = useState(false)
  const addressSuggestionsRef = useRef<HTMLDivElement>(null)

  // Consignment terms from Supabase
  const [consignmentTerms, setConsignmentTerms] = useState<Tag[]>([])
  const [termsLoading, setTermsLoading] = useState(true)

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
        `limit=5`
      )

      const data = await response.json()
      const suggestions = data.features.map((feature: any) => ({
        id: feature.id,
        text: feature.place_name,
        coordinates: feature.center,
        context: feature.context
      }))

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
    // Extract city from context
    const cityContext = suggestion.context?.find((ctx: any) =>
      ctx.id.startsWith('place.') || ctx.id.startsWith('locality.')
    )
    const city = cityContext ? cityContext.text : ''

    setFormData(prev => ({
      ...prev,
      address: suggestion.text,
      city: city
    }))

    setAddressSuggestions([])
    setShowAddressSuggestions(false)
  }

  // Fetch consignment terms from Supabase
  useEffect(() => {
    const fetchTerms = async () => {
      try {
        const { data, error } = await supabase
          .from('tags')
          .select('id, label, category')
          .order('category')

        if (error) {
          console.error('Error fetching terms:', error)
        } else {
          setConsignmentTerms(data || [])
        }
      } catch (error) {
        console.error('Error fetching terms:', error)
      } finally {
        setTermsLoading(false)
      }
    }
    fetchTerms()
  }, [])

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

  // Redirect if not authenticated
  useEffect(() => {
    if (isProd() && !loading && !user) {
      router.replace("/login")
    }
  }, [user, loading, router])

  if (loading || (isProd() && !user)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 via-rose-50 to-stone-50 font-serif">
        <div className="text-stone-500 text-lg">Loading...</div>
      </div>
    )
  }

  // Generate permalink from library name and city
  const generatePermalink = (libraryName: string, city: string): string => {
    const combined = `${libraryName} ${city}`
    return combined
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '') // Remove special characters except spaces and hyphens
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
      .trim()
      .replace(/^-|-$/g, '') // Remove leading/trailing hyphens
  }

  // Geocode address to get coordinates
  const geocodeAddress = async (address: string, city: string, country: string): Promise<{latitude: number, longitude: number} | null> => {
    try {
      const fullAddress = `${address}, ${city}, ${country}`
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(fullAddress)}.json?` +
        `access_token=${process.env.NEXT_PUBLIC_MAPBOX_TOKEN}&limit=1`
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

  const handleTermToggle = (termId: string) => {
    setFormData((prev) => ({
      ...prev,
      selectedTerms: prev.selectedTerms.includes(termId)
        ? prev.selectedTerms.filter((id) => id !== termId)
        : [...prev.selectedTerms, termId],
    }))
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
      console.log('Submitting library data:', formData)
      console.log('User ID:', user.id)

      // Generate ID and permalink for the library
      const id = nanoid(6)
      const permalink = generatePermalink(formData.libraryName, formData.city)

      // Geocode the address to get coordinates
      const coordinates = await geocodeAddress(formData.address, formData.city, formData.country)
      console.log('Geocoded coordinates:', coordinates)

      // Insert library into librarys table
      const { data: libraryData, error: libraryError } = await supabase
        .from('librarys')
        .insert({
          id: id,
          name: formData.libraryName,
          city: formData.city,
          country: formData.country,
          address: formData.address,
          email: formData.email || null,
          website: formData.website || null,
          notes: formData.notes || null,
          has_stocked_before: formData.hasStockedBefore,
          submitted_by: user.id,
          permalink: permalink,
          latitude: coordinates?.latitude || null,
          longitude: coordinates?.longitude || null,
          approved: false,
        })
        .select()
        .single()

      if (libraryError) {
        console.error('Error inserting library:', libraryError)
        setError(`Library insertion failed: ${libraryError.message}`)
        throw libraryError
      }

      console.log('Library inserted successfully:', libraryData)

      // Insert selected terms into library_tags table
      if (formData.selectedTerms.length > 0) {
        const libraryTags = formData.selectedTerms.map(tagId => ({
          library_id: libraryData.id,
          tag_id: tagId
        }))

        console.log('Inserting library tags:', libraryTags)
        console.log('Selected terms:', formData.selectedTerms)
        console.log('Available terms:', consignmentTerms)

        const { error: tagsError } = await supabase
          .from('library_tags')
          .insert(libraryTags)

        if (tagsError) {
          console.error('Error inserting library tags:', tagsError)
          setError(`Tags insertion failed: ${tagsError.message}`)
          throw tagsError
        }

        console.log('Library tags inserted successfully')
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

  const getTermsByCategory = (category: string) => {
    return consignmentTerms.filter((term) => term.category === category)
  }

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-rose-50 to-stone-50 font-serif">
        <div className="max-w-2xl mx-auto px-4 py-16">
          <Card className="bg-white/80 backdrop-blur-sm border-2 border-green-200 shadow-lg">
            <CardContent className="p-8 text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Check className="h-8 w-8 text-green-600" />
              </div>
              <h1 className="text-3xl font-bold text-stone-800 mb-4">Thank you!</h1>
              <p className="text-stone-600 mb-6 leading-relaxed">
                Your library submission has been received and is pending approval! Our team will review it shortly and add it to the map once approved. Thanks for
                helping fellow zinesters discover new places to share their work and find new zines to read!
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link href="/">
                  <Button className="bg-rose-500 hover:bg-rose-600 text-white font-serif">
                    <MapPin className="h-4 w-4 mr-2" />
                    Browse Librarys
                  </Button>
                </Link>
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsSubmitted(false)
                    setFormData({
                      libraryName: "",
                      city: "",
                      country: "",
                      address: "",
                      email: "",
                      website: "",
                      selectedTerms: [],
                      notes: "",
                      hasStockedBefore: false,
                    })
                    // Generate new preview ID
                    window.location.reload()
                  }}
                  className="border-stone-300 text-stone-700 hover:bg-stone-50 font-serif"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Another Library
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-rose-50 to-stone-50 font-serif">
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
          <div className="w-16 h-16 bg-gradient-to-br from-rose-200 to-orange-200 rounded-full flex items-center justify-center mx-auto mb-4">
            <Library className="h-8 w-8 text-rose-600" />
          </div>
          <h1 className="text-4xl font-bold text-stone-800 mb-3">Add a Library to ZineMap</h1>
          <p className="text-lg text-stone-600 max-w-2xl mx-auto leading-relaxed">
            Know a great indie library that stocks zines? Help fellow zinesters discover it! Share the details and we'll
            add it to our community map.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Basic Library Info */}
          <Card className="bg-white/80 backdrop-blur-sm border border-stone-200 shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center text-stone-800 text-xl">
                <Library className="h-5 w-5 mr-2 text-rose-500" />
                Library Details
              </CardTitle>
              <p className="text-sm text-stone-600 font-mono">The basics about this zine-friendly spot</p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Library Name */}
                <div className="space-y-2">
                  <Label htmlFor="libraryName" className="text-stone-700 font-serif font-medium">
                    Library Name *
                  </Label>
                  <Input
                    id="libraryName"
                    value={formData.libraryName}
                    onChange={(e) => setFormData(prev => ({ ...prev, libraryName: e.target.value }))}
                    className="bg-stone-50 border-stone-300 focus:border-rose-400 focus:ring-rose-200 font-serif"
                    placeholder="e.g. Quimby's Booklibrary"
                    required
                    autoComplete="off"
                  />
                </div>
                {/* Country with autocomplete */}
                <div className="space-y-2 relative">
                  <Label htmlFor="country" className="text-stone-700 font-serif font-medium">
                    Country *
                  </Label>
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
                    className="bg-stone-50 border-stone-300 focus:border-rose-400 focus:ring-rose-200 font-serif"
                    placeholder="e.g. United States"
                    required
                  />
                  {showCountrySuggestions && countrySuggestions.length > 0 && (
                    <div className="absolute z-20 left-0 right-0 bg-white border border-stone-200 rounded shadow-lg mt-1 max-h-60 overflow-y-auto">
                      {countrySuggestions.map((country) => (
                        <div
                          key={country.code}
                          className="px-4 py-2 hover:bg-rose-50 cursor-pointer text-stone-800"
                          onClick={() => handleCountrySelect(country)}
                        >
                          {country.name}
                        </div>
                      ))}
                    </div>
                  )}
                  {showCountrySuggestions && countrySuggestions.length === 0 && (
                    <div className="absolute z-20 left-0 right-0 bg-white border border-stone-200 rounded shadow-lg mt-1 px-4 py-2 text-stone-400">
                      No suggestions found.
                    </div>
                  )}
                </div>
                {/* Address with autocomplete */}
                <div className="space-y-2 relative" ref={addressSuggestionsRef}>
                  <Label htmlFor="address" className="text-stone-700 font-serif font-medium">
                    Address
                  </Label>
                  <Input
                    id="address"
                    value={formData.address}
                                         onChange={(e) => {
                       setFormData(prev => ({ ...prev, address: e.target.value }));
                       handleAddressSearch(e.target.value);
                     }}
                     onBlur={() => setTimeout(() => setShowAddressSuggestions(false), 200)}
                     onFocus={() => {
                       if (selectedCountry && formData.address.trim()) {
                         handleAddressSearch(formData.address);
                       }
                     }}
                    className="bg-stone-50 border-stone-300 focus:border-rose-400 focus:ring-rose-200 font-serif"
                    placeholder="e.g. 123 Main St, Chicago, IL"
                    autoComplete="off"
                  />
                  {showAddressSuggestions && addressSuggestions.length > 0 && (
                    <div className="absolute z-20 left-0 right-0 bg-white border border-stone-200 rounded shadow-lg mt-1 max-h-60 overflow-y-auto">
                      {addressSuggestions.map((feature) => (
                        <div
                          key={feature.id}
                          className="px-4 py-2 hover:bg-rose-50 cursor-pointer text-stone-800"
                          onClick={() => handleAddressSelect(feature)}
                        >
                          {feature.text}
                        </div>
                      ))}
                    </div>
                  )}
                  {showAddressSuggestions && addressSuggestionsLoading && addressSuggestions.length === 0 && (
                    <div className="absolute z-20 left-0 right-0 bg-white border border-stone-200 rounded shadow-lg mt-1 px-4 py-2 text-stone-400">
                      Loading suggestions...
                    </div>
                  )}
                </div>
                {/* City */}
                <div className="space-y-2">
                  <Label htmlFor="city" className="text-stone-700 font-serif font-medium">
                    City *
                  </Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                    className="bg-stone-50 border-stone-300 focus:border-rose-400 focus:ring-rose-200 font-serif"
                    placeholder="e.g. Chicago"
                    required
                  />
                </div>
              </div>

              {/* Contact Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-stone-700 font-serif font-medium">
                    Contact Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    className="bg-stone-50 border-stone-300 focus:border-rose-400 focus:ring-rose-200 font-serif"
                    placeholder="library@example.com"
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
                    onChange={(e) => setFormData(prev => ({ ...prev, website: e.target.value }))}
                    className="bg-stone-50 border-stone-300 focus:border-rose-400 focus:ring-rose-200 font-serif"
                    placeholder="https://library.com"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Additional Notes */}
          <Card className="bg-white/80 backdrop-blur-sm border border-stone-200 shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center text-stone-800 text-xl">
                <MessageSquare className="h-5 w-5 mr-2 text-rose-500" />
                Additional Notes
              </CardTitle>
              <p className="text-sm text-stone-600 font-mono">Any helpful tips or special requirements?</p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  className="bg-stone-50 border-stone-300 focus:border-rose-400 focus:ring-rose-200 font-serif min-h-[100px]"
                  placeholder="e.g., They prefer email contact first, they're particularly interested in local zines, they have a specific submission process..."
                />

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="hasStockedBefore"
                    checked={formData.hasStockedBefore}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, hasStockedBefore: !!checked }))}
                  />
                  <Label htmlFor="hasStockedBefore" className="text-sm text-stone-700">
                    I have stocked zines at this library before
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
          <div className="text-center">
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-rose-500 hover:bg-rose-600 text-white font-serif px-8 py-3 text-lg rounded-lg shadow-md transition-colors"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Submitting...
                </>
              ) : (
                <>
                  <MapPin className="h-5 w-5 mr-2" />
                  Submit Library to ZineMap
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
