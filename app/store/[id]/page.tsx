import { ArrowLeft, MapPin, Mail, Globe, CheckCircle, AlertCircle, Map } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"

// Sample store data - in a real app this would come from a database
const storeData = {
  id: 1,
  name: "Quimby's Bookstore",
  city: "Chicago",
  country: "United States",
  address: {
    street: "1854 W North Ave",
    city: "Chicago",
    state: "IL",
    zipCode: "60622",
    country: "United States",
  },
  contact: {
    email: "info@quimbys.com",
    website: "https://www.quimbys.com",
  },
  consignmentTerms: {
    split: "60/40 split (60% to creator)",
    paymentTiming: "Monthly payments, 30 days after sale",
    maxCopies: "Up to 25 copies per title",
    minimumPrice: "$2.00 minimum cover price",
    returnPolicy: "Unsold copies returned after 6 months",
  },
  notes:
    "Quimby's has been a cornerstone of Chicago's underground publishing scene since 1991. They're particularly interested in political zines, art books, and local Chicago content. Staff are knowledgeable and supportive of new creators. Best to email first before dropping off zines.",
  verified: true,
  lastUpdated: "Updated 2 weeks ago",
  specialties: ["Political Zines", "Art Books", "Local Content"],
  established: "1991",
}

export default function StoreDetailPage() {
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
              <h1 className="text-4xl md:text-5xl font-bold text-stone-800 tracking-tight">{storeData.name}</h1>
              {storeData.verified ? (
                <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border border-emerald-200">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Verified
                </Badge>
              ) : (
                <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  Unverified
                </Badge>
              )}
            </div>

            <div className="flex justify-center items-center gap-2 text-xl text-stone-600 mb-3">
              <MapPin className="h-5 w-5 text-rose-400" />
              <span>
                {storeData.city}, {storeData.country}
              </span>
            </div>

            <div className="flex justify-center items-center gap-6 text-sm text-stone-500">
              <span className="bg-stone-100 px-3 py-1 rounded-full">Est. {storeData.established}</span>
              <span>{storeData.lastUpdated}</span>
            </div>

            {/* Specialties */}
            <div className="flex justify-center flex-wrap gap-2 mt-4">
              {storeData.specialties.map((specialty) => (
                <span
                  key={specialty}
                  className="px-3 py-1 text-xs bg-rose-100 border border-rose-200 text-rose-700 rounded-full"
                >
                  {specialty}
                </span>
              ))}
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
                <p className="font-medium">{storeData.address.street}</p>
                <p>
                  {storeData.address.city}, {storeData.address.state} {storeData.address.zipCode}
                </p>
                <p className="text-stone-500">{storeData.address.country}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border border-stone-200 shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-stone-800 text-lg">Contact</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-stone-50 p-4 rounded-lg space-y-3">
                <div className="flex items-center space-x-3">
                  <Mail className="h-4 w-4 text-slate-400 flex-shrink-0" />
                  <a
                    href={`mailto:${storeData.contact.email}`}
                    className="text-stone-700 hover:text-rose-600 transition-colors underline decoration-rose-200 hover:decoration-rose-400"
                  >
                    {storeData.contact.email}
                  </a>
                </div>
                <div className="flex items-center space-x-3">
                  <Globe className="h-4 w-4 text-slate-400 flex-shrink-0" />
                  <a
                    href={storeData.contact.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-stone-700 hover:text-rose-600 transition-colors underline decoration-rose-200 hover:decoration-rose-400"
                  >
                    {storeData.contact.website.replace("https://", "").replace("www.", "")}
                  </a>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Consignment Terms */}
        <Card className="bg-gradient-to-br from-rose-50 to-orange-50 border border-rose-200 shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-stone-800 text-xl">Consignment Terms</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-2 gap-6 text-stone-700">
              <div className="space-y-4">
                <div className="bg-white p-4 rounded-lg border border-rose-100">
                  <h4 className="font-semibold text-stone-800 mb-2">Revenue Split</h4>
                  <p className="text-sm">{storeData.consignmentTerms.split}</p>
                </div>
                <div className="bg-white p-4 rounded-lg border border-rose-100">
                  <h4 className="font-semibold text-stone-800 mb-2">Payment Schedule</h4>
                  <p className="text-sm">{storeData.consignmentTerms.paymentTiming}</p>
                </div>
              </div>
              <div className="space-y-4">
                <div className="bg-white p-4 rounded-lg border border-rose-100">
                  <h4 className="font-semibold text-stone-800 mb-2">Inventory Limits</h4>
                  <p className="text-sm">{storeData.consignmentTerms.maxCopies}</p>
                </div>
                <div className="bg-white p-4 rounded-lg border border-rose-100">
                  <h4 className="font-semibold text-stone-800 mb-2">Pricing & Returns</h4>
                  <p className="text-sm mb-1">{storeData.consignmentTerms.minimumPrice}</p>
                  <p className="text-sm">{storeData.consignmentTerms.returnPolicy}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notes */}
        <Card className="bg-gradient-to-br from-slate-50 to-blue-50 border border-slate-200 shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-stone-800 text-xl">Notes & Tips</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-white p-6 rounded-lg border border-slate-100">
              <p className="text-stone-700 leading-relaxed text-sm md:text-base italic">"{storeData.notes}"</p>
              <div className="mt-4 text-right">
                <span className="text-xs text-stone-500">— Community contributed</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Map Preview */}
        <Card className="bg-white border border-stone-200 shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center text-stone-800 text-xl">
              <Map className="h-5 w-5 mr-2 text-slate-400" />
              Location
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="h-64 bg-gradient-to-br from-slate-100 to-stone-100 rounded-b-lg flex items-center justify-center">
              <div className="text-center text-stone-500">
                <MapPin className="h-8 w-8 mx-auto mb-3 text-stone-400" />
                <p className="text-sm font-medium mb-1">Interactive Map</p>
                <p className="text-xs">Click to view full map with directions</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row gap-4 pt-4">
          <Button className="flex-1 bg-rose-500 hover:bg-rose-600 text-white shadow-sm">
            <Mail className="h-4 w-4 mr-2" />
            Contact Store
          </Button>
          <Button variant="outline" className="flex-1 border-stone-300 text-stone-700 hover:bg-stone-50 bg-transparent">
            <MapPin className="h-4 w-4 mr-2" />
            Get Directions
          </Button>
        </div>

        {/* Community contribution note */}
        <div className="text-center pt-8 border-t border-stone-200">
          <div className="bg-white p-4 rounded-lg border border-stone-200 shadow-sm inline-block">
            <p className="text-stone-600 text-sm">
              Is this information outdated or incorrect?{" "}
              <button className="text-rose-600 hover:text-rose-700 underline decoration-rose-200 hover:decoration-rose-400">
                Help us improve it
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
