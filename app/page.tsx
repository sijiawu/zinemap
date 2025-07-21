"use client"

import { Search, MapPin, Filter, ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { StoreMap } from "@/components/store-map"
import Link from "next/link"
import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"

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

export default function HomePage() {
  const [stores, setStores] = useState<Store[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchStores = async () => {
      try {
        const { data, error } = await supabase
          .from('stores')
          .select('*')
          .order('created_at', { ascending: false })

        if (error) {
          console.error('Error fetching stores:', error)
        } else {
          setStores(data || [])
        }
      } catch (error) {
        console.error('Error fetching stores:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchStores()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50 font-serif flex items-center justify-center">
        <div className="text-stone-500 text-lg">Loading stores...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-stone-50 font-serif">
      {/* Header */}
      <header className="w-full bg-white border-b border-stone-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-8 text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-stone-800 mb-2 tracking-tight">ZineMap</h1>
          <p className="text-lg md:text-xl text-stone-600 italic">Drop your zines. Track your batches. Find your people.</p>
        </div>
      </header>

      {/* Search and Filters */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="bg-white rounded-xl shadow-sm border border-stone-200 p-6 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search Bar */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-stone-400 h-4 w-4" />
              <Input
                placeholder="Search by city or store name..."
                className="pl-10 bg-stone-50 border-stone-300 focus:border-rose-300 focus:ring-rose-200"
              />
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
              <Select>
                <SelectTrigger className="w-full sm:w-[180px] bg-stone-50 border-stone-300">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Payment type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All payment types</SelectItem>
                  <SelectItem value="upfront">Upfront pay</SelectItem>
                  <SelectItem value="consignment">Consignment</SelectItem>
                </SelectContent>
              </Select>

              <Select>
                <SelectTrigger className="w-full sm:w-[160px] bg-stone-50 border-stone-300">
                  <SelectValue placeholder="Split ratio" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All splits</SelectItem>
                  <SelectItem value="50-50">50/50 split</SelectItem>
                  <SelectItem value="60-40">60/40 split</SelectItem>
                  <SelectItem value="other">Other splits</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Main Content - Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Store List */}
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-stone-800 mb-4">Zine-Friendly Stores</h2>

            <div className="space-y-4 max-h-[800px] overflow-y-auto pr-2">
              {stores.length === 0 ? (
                <Card className="bg-white border-stone-200 shadow-sm rounded-lg">
                  <CardContent className="p-6 text-center">
                    <MapPin className="h-12 w-12 mx-auto mb-4 text-stone-400" />
                    <h3 className="text-lg font-semibold text-stone-800 mb-2">No stores yet</h3>
                    <p className="text-stone-600 mb-4">Be the first to add a zine-friendly store to the map!</p>
                    <Link href="/add-store">
                      <Button className="bg-rose-500 hover:bg-rose-600 text-white">
                        Add First Store
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              ) : (
                stores.map((store) => (
                  <Card
                    key={store.id}
                    className="bg-white border-stone-200 shadow-sm hover:shadow-md transition-shadow duration-200 rounded-lg"
                  >
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-lg font-semibold text-stone-800 mb-1">{store.name}</CardTitle>
                          <div className="flex items-center text-stone-600 text-sm mb-2">
                            <MapPin className="h-4 w-4 mr-1" />
                            {store.city}, {store.country}
                          </div>
                        </div>
                        <div
                          className={`px-3 py-1 rounded-full text-xs font-medium ${
                            store.has_stocked_before ? "bg-emerald-100 text-emerald-700" : "bg-blue-100 text-blue-700"
                          }`}
                        >
                          {store.has_stocked_before ? "Upfront Pay" : "Consignment"}
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="pt-0">
                      <p className="text-stone-600 text-sm mb-4 leading-relaxed">{store.notes}</p>

                      <Link href={`/store/${store.permalink || store.id}`}>
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full border-stone-300 text-stone-700 hover:bg-rose-50 hover:border-rose-300 hover:text-rose-700 transition-colors bg-transparent"
                        >
                          View Details
                          <ExternalLink className="h-3 w-3 ml-2" />
                        </Button>
                      </Link>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>

          {/* Interactive Map */}
          <div className="lg:sticky lg:top-6">
            <h2 className="text-2xl font-bold text-stone-800 mb-4">Store Locations</h2>

            <Card className="bg-white border-stone-200 shadow-sm rounded-lg overflow-hidden">
              <CardContent className="p-0">
                <StoreMap stores={stores} />
              </CardContent>
            </Card>
            {/* Add Store button under the map */}
            <div className="mt-8 flex justify-center">
              <Link href="/add-store">
                <Button className="bg-rose-500 hover:bg-rose-600 text-white font-serif px-6 py-3 mt-4 text-lg rounded-lg shadow-md transition-colors max-w-xs mx-auto">
                  Add Store
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="mt-16 bg-white border-t border-stone-200">
        <div className="max-w-7xl mx-auto px-4 py-8 text-center">
          <p className="text-stone-600 text-sm">
            © 2025 ZineMap. created by <a href="https://www.instagram.com/cjmakescomics/" className="text-rose-500 hover:text-rose-600">@cjmakescomics</a> with love to indie publishers and the shops that stock them.
          </p>
        </div>
      </footer>
    </div>
  )
} 