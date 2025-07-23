"use client"

import { Search, MapPin, Filter, ExternalLink, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
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
  store_tags?: {
    id: string
    tag_id: string
    tag: {
      id: string
      label: string
      category: string
    }
  }[]
  user_name?: string
}

export default function HomePage() {
  const [stores, setStores] = useState<Store[]>([])
  const [filteredStores, setFilteredStores] = useState<Store[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")

  useEffect(() => {
    const fetchStores = async () => {
      try {
        // First, fetch stores with basic info
        const { data: storesData, error: storesError } = await supabase
          .from('stores')
          .select('*')
          .eq('approved', true)
          .order('created_at', { ascending: false })

        if (storesError) {
          console.error('Error fetching stores:', storesError)
          setStores([])
          return
        }

        if (!storesData) {
          setStores([])
          return
        }

        // Then fetch tags and user info for each store
        const storesWithTags = await Promise.all(
          storesData.map(async (store) => {
            // Fetch tags
            const { data: tagsData } = await supabase
              .from('store_tags')
              .select(`
                id,
                tag_id,
                tags!inner(id, label, category)
              `)
              .eq('store_id', store.id)

            // Fetch user display name from profiles table
            let user_name = 'Unknown user'

            try {
              const { data: userData, error: userError } = await supabase
                .from('profiles')
                .select('display_name')
                .eq('id', store.submitted_by)
                .single()

              console.log(`Fetching user for store ${store.id}:`, {
                submitted_by: store.submitted_by,
                userData,
                userError
              })

              if (userData?.display_name) {
                user_name = userData.display_name
              } else if (userError) {
                console.log('Profiles table error, trying auth.users as fallback')
                // Fallback to auth.users if profiles table fails
                const { data: authUserData } = await supabase
                  .from('auth.users')
                  .select('email')
                  .eq('id', store.submitted_by)
                  .single()

                if (authUserData?.email) {
                  user_name = authUserData.email
                }
              }
            } catch (error) {
              console.error('Error fetching user data:', error)
            }

            return {
              ...store,
              store_tags: tagsData?.map((tag: any) => ({
                id: tag.id,
                tag_id: tag.tag_id,
                tag: tag.tags
              })) || [],
              user_name
            }
          })
        )

        setStores(storesWithTags)
      } catch (error) {
        console.error('Error fetching stores:', error)
        setStores([])
      } finally {
        setLoading(false)
      }
    }

    fetchStores()
  }, [])

  // Filter stores based on search query
  useEffect(() => {
    if (!stores) return

    let filtered = stores

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim()
      filtered = filtered.filter(store =>
        store.name.toLowerCase().includes(query) ||
        store.city.toLowerCase().includes(query) ||
        store.country.toLowerCase().includes(query) ||
        store.address.toLowerCase().includes(query)
      )
    }

    setFilteredStores(filtered)
  }, [stores, searchQuery])

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
          <div className="flex justify-center items-center mb-3">
            <div className="w-12 h-0.5 bg-gradient-to-r from-transparent via-rose-400 to-transparent"></div>
            <div className="mx-3 text-rose-500">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div className="w-12 h-0.5 bg-gradient-to-r from-transparent via-rose-400 to-transparent"></div>
          </div>
          <p className="text-lg md:text-xl text-stone-600 italic">Drop your zines. Find your people.</p>
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
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-stone-50 border-stone-300 focus:border-rose-300 focus:ring-rose-200"
              />
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
              {/* Add more filters here in the future */}
            </div>
          </div>
        </div>

        {/* Main Content - Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Store List */}
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-stone-800 mb-4">Zine-Friendly Stores</h2>

            <div className="space-y-4 max-h-[800px] overflow-y-auto pr-2">
              {filteredStores.length === 0 ? (
                <Card className="bg-white border-stone-200 shadow-sm rounded-lg">
                  <CardContent className="p-6 text-center">
                    <MapPin className="h-12 w-12 mx-auto mb-4 text-stone-400" />
                    <h3 className="text-lg font-semibold text-stone-800 mb-2">
                      {stores.length === 0 ? "No stores yet" : "No stores match your filters"}
                    </h3>
                    <p className="text-stone-600 mb-4">
                      {stores.length === 0
                        ? "Be the first to add a zine-friendly store to the map!"
                        : "Try adjusting your search or filter criteria."
                      }
                    </p>
                    {stores.length === 0 ? (
                      <Link href="/add-store">
                        <Button className="bg-rose-500 hover:bg-rose-600 text-white">
                          Add First Store
                        </Button>
                      </Link>
                                         ) : (
                       <Button
                         onClick={() => {
                           setSearchQuery("")
                         }}
                         variant="outline"
                         className="border-stone-300 text-stone-700 hover:bg-stone-50"
                       >
                         Clear Filters
                       </Button>
                     )}
                  </CardContent>
                </Card>
              ) : (
                filteredStores.map((store) => (
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
                      </div>

                      {/* Store Tags */}
                      {store.store_tags && store.store_tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-3">
                          {store.store_tags.map((storeTag) => (
                            <Badge
                              key={storeTag.id}
                              variant="outline"
                              className="text-xs bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100"
                            >
                              {storeTag.tag.label}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </CardHeader>

                    <CardContent className="pt-0">
                      <p className="text-stone-600 text-sm mb-4 leading-relaxed">{store.notes}</p>
                      {store.user_name && (
                        <p className="text-xs text-gray-500 mb-3">
                          Added by {store.user_name}
                        </p>
                      )}
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
                <StoreMap stores={filteredStores} />
              </CardContent>
            </Card>
            {/* Add Store button under the map */}
            <div className="mt-8 flex justify-center">
              <Link href="/add-store">
                <Button className="bg-rose-500 hover:bg-rose-600 text-white font-serif px-6 py-3 mt-4 text-lg rounded-lg shadow-md transition-colors max-w-xs mx-auto">
                  Add a Store to ZineMap
                </Button>
              </Link>
            </div>
            {/* Add Library button under the map */}
            <div className="mt-8 flex justify-center">
              <Link href="/add-store">
                <Button className="bg-rose-500 hover:bg-rose-600 text-white font-serif px-6 py-3 mt-4 text-lg rounded-lg shadow-md transition-colors max-w-xs mx-auto">
                  Add a Library to ZineMap
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
            © 2025 ZineMap. created by <a href="https://ko-fi.com/cjwucomics" target="_blank" className="text-rose-500 hover:text-rose-600">@cjmakescomics</a> with love to fellow indie publishers and the shops that carry us!
          </p>
        </div>
      </footer>
    </div>
  )
}
