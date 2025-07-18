"use client"

import type React from "react"

import { useState } from "react"
import { ArrowLeft, MapPin, Mail, Globe, Tag, MessageSquare, Store, Plus, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"

// Sample consignment terms tags
const consignmentTerms = [
  { id: "60-40", label: "60/40 split (60% to creator)", category: "split" },
  { id: "50-50", label: "50/50 split", category: "split" },
  { id: "70-30", label: "70/30 split (70% to creator)", category: "split" },
  { id: "55-45", label: "55/45 split (55% to creator)", category: "split" },
  { id: "upfront", label: "Pays upfront", category: "payment" },
  { id: "monthly", label: "Monthly payments", category: "payment" },
  { id: "quarterly", label: "Quarterly payments", category: "payment" },
  { id: "on-demand", label: "Payment on demand", category: "payment" },
  { id: "max-10", label: "Max 10 copies per title", category: "limits" },
  { id: "max-25", label: "Max 25 copies per title", category: "limits" },
  { id: "max-50", label: "Max 50 copies per title", category: "limits" },
  { id: "no-limit", label: "No copy limits", category: "limits" },
  { id: "min-price-2", label: "$2 minimum price", category: "pricing" },
  { id: "min-price-5", label: "$5 minimum price", category: "pricing" },
  { id: "returns-6mo", label: "Returns after 6 months", category: "returns" },
  { id: "returns-1yr", label: "Returns after 1 year", category: "returns" },
  { id: "no-returns", label: "No returns policy", category: "returns" },
]

// Common countries for dropdown
const countries = [
  "United States",
  "Canada",
  "United Kingdom",
  "Australia",
  "Germany",
  "France",
  "Netherlands",
  "Sweden",
  "Japan",
  "Other",
]

export default function AddStorePage() {
  const [formData, setFormData] = useState({
    storeName: "",
    city: "",
    country: "",
    address: "",
    email: "",
    website: "",
    selectedTerms: [] as string[],
    notes: "",
    hasStockedBefore: false,
  })

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)

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

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 2000))

    console.log("Store submission:", formData)
    setIsSubmitting(false)
    setIsSubmitted(true)
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
                Your store submission has been received! Our community will review it and add it to the map soon. Thanks
                for helping fellow zinesters discover new places to share their work.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link href="/">
                  <Button className="bg-rose-500 hover:bg-rose-600 text-white font-serif">
                    <MapPin className="h-4 w-4 mr-2" />
                    Browse Stores
                  </Button>
                </Link>
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsSubmitted(false)
                    setFormData({
                      storeName: "",
                      city: "",
                      country: "",
                      address: "",
                      email: "",
                      website: "",
                      selectedTerms: [],
                      notes: "",
                      hasStockedBefore: false,
                    })
                  }}
                  className="border-stone-300 text-stone-700 hover:bg-stone-50 font-serif"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Another Store
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
            <Store className="h-8 w-8 text-rose-600" />
          </div>
          <h1 className="text-4xl font-bold text-stone-800 mb-3">Add a Store to ZineMap</h1>
          <p className="text-lg text-stone-600 max-w-2xl mx-auto leading-relaxed">
            Know a great indie store that stocks zines? Help fellow creators discover it! Share the details and we'll
            add it to our community map.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Basic Store Info */}
          <Card className="bg-white/80 backdrop-blur-sm border border-stone-200 shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center text-stone-800 text-xl">
                <Store className="h-5 w-5 mr-2 text-rose-500" />
                Store Details
              </CardTitle>
              <p className="text-sm text-stone-600 font-mono">The basics about this zine-friendly spot</p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="storeName" className="text-stone-700 font-serif font-medium">
                    Store Name *
                  </Label>
                  <Input
                    id="storeName"
                    value={formData.storeName}
                    onChange={(e) => setFormData({ ...formData, storeName: e.target.value })}
                    className="bg-stone-50 border-stone-300 focus:border-rose-400 focus:ring-rose-200 font-serif"
                    placeholder="e.g. Quimby's Bookstore"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="city" className="text-stone-700 font-serif font-medium">
                    City *
                  </Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="bg-stone-50 border-stone-300 focus:border-rose-400 focus:ring-rose-200 font-serif"
                    placeholder="e.g. Chicago"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="country" className="text-stone-700 font-serif font-medium">
                  Country *
                </Label>
                <Select
                  value={formData.country}
                  onValueChange={(value) => setFormData({ ...formData, country: value })}
                >
                  <SelectTrigger className="bg-stone-50 border-stone-300 focus:border-rose-400 focus:ring-rose-200">
                    <SelectValue placeholder="Choose a country..." />
                  </SelectTrigger>
                  <SelectContent>
                    {countries.map((country) => (
                      <SelectItem key={country} value={country}>
                        {country}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="address" className="text-stone-700 font-serif font-medium">
                  Full Address
                  <span className="text-stone-500 font-mono text-sm ml-2">(optional but helpful)</span>
                </Label>
                <Textarea
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="bg-stone-50 border-stone-300 focus:border-rose-400 focus:ring-rose-200 font-mono text-sm min-h-[80px]"
                  placeholder="Street address, postal code, any helpful location details..."
                />
              </div>
            </CardContent>
          </Card>

          {/* Contact Info */}
          <Card className="bg-white/80 backdrop-blur-sm border border-stone-200 shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center text-stone-800 text-xl">
                <Mail className="h-5 w-5 mr-2 text-blue-500" />
                Contact Information
              </CardTitle>
              <p className="text-sm text-stone-600 font-mono">How zinesters can get in touch (both optional)</p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-stone-700 font-serif font-medium">
                    Email Address
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-stone-400" />
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="bg-stone-50 border-stone-300 focus:border-blue-400 focus:ring-blue-200 font-mono pl-10"
                      placeholder="store@example.com"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="website" className="text-stone-700 font-serif font-medium">
                    Website
                  </Label>
                  <div className="relative">
                    <Globe className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-stone-400" />
                    <Input
                      id="website"
                      type="url"
                      value={formData.website}
                      onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                      className="bg-stone-50 border-stone-300 focus:border-blue-400 focus:ring-blue-200 font-mono pl-10"
                      placeholder="https://store-website.com"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Consignment Terms */}
          <Card className="bg-white/80 backdrop-blur-sm border border-stone-200 shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center text-stone-800 text-xl">
                <Tag className="h-5 w-5 mr-2 text-green-500" />
                Consignment Terms
              </CardTitle>
              <p className="text-sm text-stone-600 font-mono">
                Select all that apply — this helps zinesters know what to expect
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Revenue Split */}
              <div>
                <h4 className="font-semibold text-stone-700 mb-3 font-serif">Revenue Split</h4>
                <div className="flex flex-wrap gap-2">
                  {getTermsByCategory("split").map((term) => (
                    <Badge
                      key={term.id}
                      variant={formData.selectedTerms.includes(term.id) ? "default" : "outline"}
                      className={`cursor-pointer transition-all ${
                        formData.selectedTerms.includes(term.id)
                          ? "bg-green-100 text-green-700 border-green-300 hover:bg-green-200"
                          : "bg-white border-stone-300 text-stone-700 hover:bg-green-50 hover:border-green-300"
                      }`}
                      onClick={() => handleTermToggle(term.id)}
                    >
                      {term.label}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Payment Timing */}
              <div>
                <h4 className="font-semibold text-stone-700 mb-3 font-serif">Payment Schedule</h4>
                <div className="flex flex-wrap gap-2">
                  {getTermsByCategory("payment").map((term) => (
                    <Badge
                      key={term.id}
                      variant={formData.selectedTerms.includes(term.id) ? "default" : "outline"}
                      className={`cursor-pointer transition-all ${
                        formData.selectedTerms.includes(term.id)
                          ? "bg-blue-100 text-blue-700 border-blue-300 hover:bg-blue-200"
                          : "bg-white border-stone-300 text-stone-700 hover:bg-blue-50 hover:border-blue-300"
                      }`}
                      onClick={() => handleTermToggle(term.id)}
                    >
                      {term.label}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Copy Limits */}
              <div>
                <h4 className="font-semibold text-stone-700 mb-3 font-serif">Copy Limits</h4>
                <div className="flex flex-wrap gap-2">
                  {getTermsByCategory("limits").map((term) => (
                    <Badge
                      key={term.id}
                      variant={formData.selectedTerms.includes(term.id) ? "default" : "outline"}
                      className={`cursor-pointer transition-all ${
                        formData.selectedTerms.includes(term.id)
                          ? "bg-orange-100 text-orange-700 border-orange-300 hover:bg-orange-200"
                          : "bg-white border-stone-300 text-stone-700 hover:bg-orange-50 hover:border-orange-300"
                      }`}
                      onClick={() => handleTermToggle(term.id)}
                    >
                      {term.label}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Pricing & Returns */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold text-stone-700 mb-3 font-serif">Pricing Requirements</h4>
                  <div className="flex flex-wrap gap-2">
                    {getTermsByCategory("pricing").map((term) => (
                      <Badge
                        key={term.id}
                        variant={formData.selectedTerms.includes(term.id) ? "default" : "outline"}
                        className={`cursor-pointer transition-all ${
                          formData.selectedTerms.includes(term.id)
                            ? "bg-purple-100 text-purple-700 border-purple-300 hover:bg-purple-200"
                            : "bg-white border-stone-300 text-stone-700 hover:bg-purple-50 hover:border-purple-300"
                        }`}
                        onClick={() => handleTermToggle(term.id)}
                      >
                        {term.label}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold text-stone-700 mb-3 font-serif">Return Policy</h4>
                  <div className="flex flex-wrap gap-2">
                    {getTermsByCategory("returns").map((term) => (
                      <Badge
                        key={term.id}
                        variant={formData.selectedTerms.includes(term.id) ? "default" : "outline"}
                        className={`cursor-pointer transition-all ${
                          formData.selectedTerms.includes(term.id)
                            ? "bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200"
                            : "bg-white border-stone-300 text-stone-700 hover:bg-slate-50 hover:border-slate-300"
                        }`}
                        onClick={() => handleTermToggle(term.id)}
                      >
                        {term.label}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Notes & Experience */}
          <Card className="bg-white/80 backdrop-blur-sm border border-stone-200 shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center text-stone-800 text-xl">
                <MessageSquare className="h-5 w-5 mr-2 text-amber-500" />
                Additional Notes
              </CardTitle>
              <p className="text-sm text-stone-600 font-mono">
                Share any quirky details, tips, or personal experiences
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="notes" className="text-stone-700 font-serif font-medium">
                  Notes about this store
                  <span className="text-stone-500 font-mono text-sm ml-2">(optional)</span>
                </Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="bg-stone-50 border-stone-300 focus:border-amber-400 focus:ring-amber-200 font-mono text-sm min-h-[120px]"
                  placeholder="e.g. 'Staff are super supportive of local creators', 'Best to email first before dropping off', 'They have a great zine section near the front counter', etc."
                />
              </div>

              <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
                <div className="flex items-start space-x-3">
                  <Checkbox
                    id="hasStockedBefore"
                    checked={formData.hasStockedBefore}
                    onCheckedChange={(checked) => setFormData({ ...formData, hasStockedBefore: checked as boolean })}
                    className="mt-1"
                  />
                  <div>
                    <Label htmlFor="hasStockedBefore" className="text-stone-700 font-serif font-medium cursor-pointer">
                      I've stocked zines here before
                    </Label>
                    <p className="text-sm text-stone-600 font-mono mt-1">
                      This helps us know the info comes from direct experience
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Submit Button */}
          <div className="text-center pt-4">
            <Button
              type="submit"
              disabled={isSubmitting || !formData.storeName || !formData.city || !formData.country}
              className="bg-gradient-to-r from-rose-500 to-orange-500 hover:from-rose-600 hover:to-orange-600 text-white font-serif text-lg px-8 py-3 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Adding Store...
                </>
              ) : (
                <>
                  <MapPin className="h-5 w-5 mr-2" />
                  Add Store to Map
                </>
              )}
            </Button>
            <p className="text-sm text-stone-500 mt-3 font-mono">Required fields: store name, city, and country</p>
          </div>
        </form>
      </div>
    </div>
  )
}
