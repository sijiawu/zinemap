"use client"

import { Search, MapPin, Filter, ExternalLink, User, BookOpen } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { StoreMap } from "@/components/store-map"
import Link from "next/link"
import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"

interface Store {
  id: string
  name: string
  city: string
  state: string
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

interface Library {
  id: string
  name: string
  city: string
  state: string
  country: string
  address: string
  email?: string
  website?: string
  notes?: string
  has_visited_before: boolean
  submitted_by: string
  created_at: string
  permalink?: string
  latitude?: number
  longitude?: number
  library_tags?: {
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
  const [libraries, setLibraries] = useState<Library[]>([])
  const [filteredStores, setFilteredStores] = useState<Store[]>([])
  const [filteredLibraries, setFilteredLibraries] = useState<Library[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [activeTab, setActiveTab] = useState("stores")


  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch stores
        const { data: storesData, error: storesError } = await supabase
          .from('stores')
          .select('*')
          .eq('approved', true)
          .order('created_at', { ascending: false })

        if (storesError) {
          console.error('Error fetching stores:', storesError)
        }

        // Fetch libraries
        const { data: librariesData, error: librariesError } = await supabase
          .from('libraries')
          .select('*')
          .eq('approved', true)
          .order('created_at', { ascending: false })

        if (librariesError) {
          console.error('Error fetching libraries:', librariesError)
        }

        // Process stores with tags and user info
        const storesWithTags = await Promise.all(
          (storesData || []).map(async (store) => {
            const { data: tagsData } = await supabase
              .from('store_tags')
              .select(`
                id,
                tag_id,
                tags!inner(id, label, category)
              `)
              .eq('store_id', store.id)

            let user_name = 'Unknown user'
            try {
              const { data: userData } = await supabase
                .from('profiles')
                .select('display_name')
                .eq('id', store.submitted_by)
                .single()

              if (userData?.display_name) {
                user_name = userData.display_name
              } else {
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

        // Process libraries with tags and user info
        const librariesWithTags = await Promise.all(
          (librariesData || []).map(async (library) => {
            const { data: tagsData } = await supabase
              .from('library_tags')
              .select(`
                id,
                tag_id,
                tags!inner(id, label, category)
              `)
              .eq('library_id', library.id)

            let user_name = 'Unknown user'
            try {
              const { data: userData } = await supabase
                .from('profiles')
                .select('display_name')
                .eq('id', library.submitted_by)
                .single()

              if (userData?.display_name) {
                user_name = userData.display_name
              } else {
                const { data: authUserData } = await supabase
                  .from('auth.users')
                  .select('email')
                  .eq('id', library.submitted_by)
                  .single()
                
                if (authUserData?.email) {
                  user_name = authUserData.email
                }
              }
            } catch (error) {
              console.error('Error fetching user data:', error)
            }

            return {
              ...library,
              library_tags: tagsData?.map((tag: any) => ({
                id: tag.id,
                tag_id: tag.tag_id,
                tag: tag.tags
              })) || [],
              user_name
            }
          })
        )

        setStores(storesWithTags)
        setLibraries(librariesWithTags)
      } catch (error) {
        console.error('Error fetching data:', error)
        setStores([])
        setLibraries([])
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  // Filter stores and libraries based on search query
  useEffect(() => {
    if (!stores || !libraries) return

    let filteredStores = stores
    let filteredLibraries = libraries

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim()
      
      filteredStores = stores.filter(store => 
        store.name.toLowerCase().includes(query) ||
        store.city.toLowerCase().includes(query) ||
        (store.state && store.state.toLowerCase().includes(query)) ||
        store.country.toLowerCase().includes(query) ||
        store.address.toLowerCase().includes(query)
      )

      filteredLibraries = libraries.filter(library => 
        library.name.toLowerCase().includes(query) ||
        library.city.toLowerCase().includes(query) ||
        (library.state && library.state.toLowerCase().includes(query)) ||
        library.country.toLowerCase().includes(query) ||
        library.address.toLowerCase().includes(query)
      )
    }

    setFilteredStores(filteredStores)
    setFilteredLibraries(filteredLibraries)
  }, [stores, libraries, searchQuery])

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50 font-serif flex items-center justify-center">
        <div className="text-stone-500 text-lg">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-stone-50 font-serif">
      {/* Header */}
      <header className="w-full bg-white border-b border-stone-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-8 text-center">
          <h1 className="font-gloria text-4xl md:text-5xl font-bold text-stone-800 mb-2 tracking-tight">ZineMap</h1>
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
          <p className="text-lg md:text-xl text-stone-600 italic font-gloria">Drop your zines. Find your people.</p>
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
                placeholder="Search by city, state, or name..."
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
          {/* List View with Tabs */}
          <div className="space-y-4">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="stores" className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Stores ({filteredStores.length})
                </TabsTrigger>
                <TabsTrigger value="libraries" className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4" />
                  Libraries ({filteredLibraries.length})
                </TabsTrigger>
              </TabsList>

              {/* Stores Tab */}
              <TabsContent value="stores" className="space-y-4">
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
                            <Button className="bg-rose-500 hover:bg-rose-600 text-white font-gloria">
                              add first store
                            </Button>
                          </Link>
                        ) : (
                          <Button 
                            onClick={() => setSearchQuery("")}
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
                                {store.city}{store.state && `, ${store.state}`}, {store.country}
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
                          <p className="text-stone-600 text-sm mb-4 leading-relaxed line-clamp-5">
                            {store.notes}
                          </p>
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
              </TabsContent>

              {/* Libraries Tab */}
              <TabsContent value="libraries" className="space-y-4">
                <div className="space-y-4 max-h-[800px] overflow-y-auto pr-2">
                  {filteredLibraries.length === 0 ? (
                    <Card className="bg-white border-stone-200 shadow-sm rounded-lg">
                      <CardContent className="p-6 text-center">
                        <BookOpen className="h-12 w-12 mx-auto mb-4 text-blue-400" />
                        <h3 className="text-lg font-semibold text-stone-800 mb-2">
                          {libraries.length === 0 ? "No libraries yet" : "No libraries match your filters"}
                        </h3>
                        <p className="text-stone-600 mb-4">
                          {libraries.length === 0 
                            ? "Be the first to add a zine-friendly library to the map!"
                            : "Try adjusting your search or filter criteria."
                          }
                        </p>
                        {libraries.length === 0 ? (
                          <Link href="/add-library">
                            <Button className="bg-blue-500 hover:bg-blue-600 text-white font-gloria">
                              add first library
                            </Button>
                          </Link>
                        ) : (
                          <Button 
                            onClick={() => setSearchQuery("")}
                            variant="outline"
                            className="border-stone-300 text-stone-700 hover:bg-stone-50"
                          >
                            Clear Filters
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  ) : (
                    filteredLibraries.map((library) => (
                      <Card
                        key={library.id}
                        className="bg-white border-stone-200 shadow-sm hover:shadow-md transition-shadow duration-200 rounded-lg"
                      >
                        <CardHeader className="pb-3">
                          <div className="flex justify-between items-start">
                            <div>
                              <CardTitle className="text-lg font-semibold text-stone-800 mb-1">{library.name}</CardTitle>
                              <div className="flex items-center text-stone-600 text-sm mb-2">
                                <MapPin className="h-4 w-4 mr-1" />
                                {library.city}{library.state && `, ${library.state}`}, {library.country}
                              </div>
                            </div>
                          </div>
                          
                          {/* Library Tags */}
                          {library.library_tags && library.library_tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-3">
                              {library.library_tags.map((libraryTag) => (
                                <Badge
                                  key={libraryTag.id}
                                  variant="outline"
                                  className="text-xs bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100"
                                >
                                  {libraryTag.tag.label}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </CardHeader>

                        <CardContent className="pt-0">
                          <p className="text-stone-600 text-sm mb-4 leading-relaxed line-clamp-5">
                            {library.notes}
                          </p>
                          {library.user_name && (
                            <p className="text-xs text-gray-500 mb-3">
                              Added by {library.user_name}
                            </p>
                          )}
                          <Link href={`/library/${library.permalink || library.id}`}>
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full border-blue-300 text-blue-700 hover:bg-blue-50 hover:border-blue-400 hover:text-blue-800 transition-colors bg-transparent"
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
              </TabsContent>
            </Tabs>
          </div>

          {/* Interactive Map */}
          <div className="lg:sticky lg:top-6">
            <Card className="bg-white border-stone-200 shadow-sm rounded-lg overflow-hidden">
              <CardContent className="p-0">
                <StoreMap 
                  stores={stores}
                  libraries={libraries}
                  searchQuery={searchQuery}
                />
              </CardContent>
            </Card>

            {/* Add Store and Library buttons under the map */}
            <div className="mt-8">
              <div className="flex justify-center gap-4">
                <Link href="/add-store">
                  <Button className="bg-rose-500 hover:bg-rose-600 text-white font-gloria px-6 py-3 text-lg rounded-lg shadow-md transition-colors">
                    add a store
                  </Button>
                </Link>
                <Link href="/add-library">
                  <Button className="bg-blue-500 hover:bg-blue-600 text-white font-gloria px-6 py-3 text-lg rounded-lg shadow-md transition-colors">
                    add a library
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="mt-16 bg-white border-t border-stone-200">
        <div className="max-w-7xl mx-auto px-4 py-8 text-center">
          <p className="text-stone-600 text-sm">
            © 2025 zinemap. created by <a href="https://ko-fi.com/cjwucomics" target="_blank" className="text-rose-500 hover:text-rose-600">@cjmakescomics</a> with love to fellow indie publishers and the shops that carry us!
          </p>
        </div>
      </footer>
    </div>
  )
} 