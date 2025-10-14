"use client"

import { Search, MapPin, Filter, ExternalLink, User, BookOpen, Calendar, Clock, Plus, ChevronDown, Landmark } from "lucide-react"
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
import { Store, Library, Event } from "@/lib/types"
import { formatDateReadable, getEventCategoryDisplay } from "@/lib/utils"

export default function HomePage() {
  const [stores, setStores] = useState<Store[]>([])
  const [libraries, setLibraries] = useState<Library[]>([])
  const [events, setEvents] = useState<Event[]>([])
  const [filteredStores, setFilteredStores] = useState<Store[]>([])
  const [filteredLibraries, setFilteredLibraries] = useState<Library[]>([])
  const [filteredEvents, setFilteredEvents] = useState<Event[]>([])
  
  // Phased loading states
  const [phase1Complete, setPhase1Complete] = useState(false) // Basic data loaded
  const [phase2Complete, setPhase2Complete] = useState(false) // Map ready
  const [phase3Complete, setPhase3Complete] = useState(false) // Enhanced data loaded
  
  const [searchQuery, setSearchQuery] = useState("")
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("")
  const [activeTab, setActiveTab] = useState("stores")
  const [isAddMenuOpen, setIsAddMenuOpen] = useState(false)

  // Handle location selection from list view
  const handleLocationSelect = (location: Store | Library | Event, type: 'store' | 'library' | 'event') => {
    // This function is called when a map marker is clicked
    // The map will handle showing the popup automatically
  }

  // Handle map ready callback
  const handleMapReady = () => {
    setPhase2Complete(true)
  }


  const handleCardClick = (location: Store | Library | Event, type: 'store' | 'library' | 'event') => {
    // When a card is clicked, select it on the map
    if ((window as any).selectMapLocation) {
      (window as any).selectMapLocation(location, type)
    }
  }

  // Handle clicks outside the add menu to close it
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isAddMenuOpen && !(event.target as Element).closest('.add-menu-container')) {
        setIsAddMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isAddMenuOpen])


  // Phase 1: Load basic data immediately (stores, libraries, events without tags/user info)
  useEffect(() => {
    const fetchBasicData = async () => {
      try {
        // Fetch stores, libraries, and events in parallel
        const [storesResult, librariesResult, eventsResult] = await Promise.all([
          supabase
            .from('stores')
            .select('*')
            .eq('approved', true)
            .order('created_at', { ascending: false }),
          supabase
            .from('libraries')
            .select('*')
            .eq('approved', true)
            .order('created_at', { ascending: false }),
          supabase
            .from('events')
            .select('*')
            .eq('approved', true)
            .gte('end_date', new Date().toISOString().split('T')[0])
            .order('created_at', { ascending: false })
        ])

        // Set basic data immediately
        setStores(storesResult.data || [])
        setLibraries(librariesResult.data || [])
        setEvents(eventsResult.data || [])
        
        setPhase1Complete(true)
      } catch (error) {
        console.error('Error fetching basic data:', error)
        setStores([])
        setLibraries([])
        setEvents([])
        setPhase1Complete(true) // Still mark as complete to show UI
      }
    }

    fetchBasicData()
  }, [])

  // Phase 2: Load enhanced data (tags and user profiles) in background
  useEffect(() => {
    if (!phase1Complete) return

    const fetchEnhancedData = async () => {
      try {
        // Get current data
        const currentStores = stores
        const currentLibraries = libraries
        const currentEvents = events

        if (currentStores.length === 0 && currentLibraries.length === 0 && currentEvents.length === 0) {
          setPhase3Complete(true)
          return
        }

        // Fetch all enhanced data in parallel
        const [
          storeTagsResult,
          storeUserProfilesResult,
          libraryTagsResult,
          libraryUserProfilesResult,
          eventUserProfilesResult
        ] = await Promise.all([
          // Store tags
          currentStores.length > 0 ? supabase
            .from('store_tags')
            .select(`
              id,
              store_id,
              tag_id,
              tags!inner(id, label, category)
            `)
            .in('store_id', currentStores.map(s => s.id)) : Promise.resolve({ data: [] }),
          
          // Store user profiles
          currentStores.length > 0 ? supabase
            .from('profiles')
            .select('id, display_name, permalink')
            .in('id', currentStores.map(s => s.submitted_by)) : Promise.resolve({ data: [] }),
          
          // Library tags
          currentLibraries.length > 0 ? supabase
            .from('library_tags')
            .select(`
              id,
              library_id,
              tag_id,
              tags!inner(id, label, category)
            `)
            .in('library_id', currentLibraries.map(l => l.id)) : Promise.resolve({ data: [] }),
          
          // Library user profiles
          currentLibraries.length > 0 ? supabase
            .from('profiles')
            .select('id, display_name, permalink')
            .in('id', currentLibraries.map(l => l.submitted_by)) : Promise.resolve({ data: [] }),
          
          // Event user profiles
          currentEvents.length > 0 ? supabase
            .from('profiles')
            .select('id, display_name, permalink')
            .in('id', currentEvents.map(e => e.submitted_by)) : Promise.resolve({ data: [] })
        ])

        // Process stores with enhanced data
        const storeUserMap = new Map(
          (storeUserProfilesResult.data || []).map(user => [user.id, { display_name: user.display_name, permalink: user.permalink }])
        )
        const storesWithTags = currentStores.map((store) => {
          const storeTags = (storeTagsResult.data || [])
            .filter(tag => tag.store_id === store.id)
            .map((tag: any) => ({
              id: tag.id || `store-tag-${store.id}-${tag.tag_id}`,
              store_id: store.id,
              tag_id: tag.tag_id,
              tag: tag.tags
            }))

          const userData = storeUserMap.get(store.submitted_by) || { display_name: 'Unknown user', permalink: null }
          return {
            ...store,
            store_tags: storeTags,
            user_name: userData.display_name,
            user_permalink: userData.permalink
          }
        })

        // Process libraries with enhanced data
        const libraryUserMap = new Map(
          (libraryUserProfilesResult.data || []).map(user => [user.id, { display_name: user.display_name, permalink: user.permalink }])
        )
        const librariesWithTags = currentLibraries.map((library) => {
          const libraryTags = (libraryTagsResult.data || [])
            .filter(tag => tag.library_id === library.id)
            .map((tag: any) => ({
              id: tag.id || `library-tag-${library.id}-${tag.tag_id}`,
              library_id: library.id,
              tag_id: tag.tag_id,
              tag: tag.tags
            }))

          const userData = libraryUserMap.get(library.submitted_by) || { display_name: 'Unknown user', permalink: null }
          return {
            ...library,
            library_tags: libraryTags,
            user_name: userData.display_name,
            user_permalink: userData.permalink
          }
        })

        // Process events with enhanced data
        const eventUserMap = new Map(
          (eventUserProfilesResult.data || []).map(user => [user.id, { display_name: user.display_name, permalink: user.permalink }])
        )
        const eventsWithUser = currentEvents.map((event) => {
          const userData = eventUserMap.get(event.submitted_by) || { display_name: 'Unknown user', permalink: null }
          return {
            ...event,
            user_name: userData.display_name,
            user_permalink: userData.permalink
          }
        })

        // Update with enhanced data
        setStores(storesWithTags)
        setLibraries(librariesWithTags)
        setEvents(eventsWithUser)
        setPhase3Complete(true)
      } catch (error) {
        console.error('Error fetching enhanced data:', error)
        setPhase3Complete(true) // Still mark as complete
      }
    }

    // Small delay to ensure list view renders first
    const timer = setTimeout(() => {
      fetchEnhancedData()
    }, 100)

    return () => clearTimeout(timer)
  }, [phase1Complete, stores, libraries, events])

  // Debounce search query to improve performance
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery)
    }, 300)

    return () => clearTimeout(timer)
  }, [searchQuery])

  // Filter stores, libraries, and events based on debounced search query
  useEffect(() => {
    if (!stores || !libraries || !events) return

    let filteredStores = stores
    let filteredLibraries = libraries
    let filteredEvents = events

    // Apply search filter
    if (debouncedSearchQuery.trim()) {
      const query = debouncedSearchQuery.toLowerCase().trim()
      
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

      filteredEvents = events.filter(event => 
        event.name.toLowerCase().includes(query) ||
        event.city.toLowerCase().includes(query) ||
        (event.state && event.state.toLowerCase().includes(query)) ||
        event.country.toLowerCase().includes(query) ||
        event.address.toLowerCase().includes(query) ||
        event.category.toLowerCase().includes(query)
      )
    }

    setFilteredStores(filteredStores)
    setFilteredLibraries(filteredLibraries)
    setFilteredEvents(filteredEvents)
  }, [stores, libraries, events, debouncedSearchQuery])

  // Show loading only if we don't have basic data yet
  if (!phase1Complete) {
    return (
      <div className="min-h-screen bg-stone-50 font-serif flex items-center justify-center">
        <div className="text-stone-500 text-lg">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-stone-50 font-serif">
      {/* Header - Mobile: order-1 */}
      <header className="order-1 w-full bg-white border-b border-stone-200 shadow-sm">
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
          <p className="text-lg md:text-xl text-stone-600 italic font-gloria">A map of the zine universe that grows with you.</p>
        </div>
      </header>

      {/* Main Content - Mobile Stack / Desktop Grid Layout */}
      <div className="order-3 max-w-7xl mx-auto px-4 py-6">
        {/* Search and Filters - Desktop only, appears above grid */}
        <div className="hidden lg:block mb-3 lg:mb-6">
          <div className="bg-white rounded-xl shadow-sm border border-stone-200 p-6">
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
        </div>

        <div className="flex flex-col lg:grid lg:grid-cols-2 gap-6">
          {/* Interactive Map - Mobile: order-2, Desktop: right column */}
          <div className="order-2 lg:order-2 lg:sticky lg:top-6">
            <Card className="bg-white border-stone-200 shadow-sm rounded-lg overflow-hidden">
              <CardContent className="p-0">
                {!phase1Complete ? (
                  <div className="w-full h-96 lg:h-full bg-stone-100 animate-pulse flex items-center justify-center">
                    <div className="text-stone-500">Preparing map...</div>
                  </div>
                ) : (
                  <div className="w-full h-96 lg:h-full relative">
                    <StoreMap 
                      stores={stores}
                      libraries={libraries}
                      events={events}
                      searchQuery={debouncedSearchQuery}
                      onLocationSelect={handleLocationSelect}
                      onMapReady={handleMapReady}
                    />
                    {!phase2Complete && (
                      <div className="absolute inset-0 bg-stone-100 bg-opacity-75 flex items-center justify-center z-10">
                        <div className="text-stone-500">Loading map...</div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Add Store, Library, and Event buttons under the map - Mobile: order-3 */}
            <div className="mt-6 lg:mt-8 flex justify-center order-3">
              <div className="relative add-menu-container">
                <Button 
                  onClick={() => setIsAddMenuOpen(!isAddMenuOpen)}
                  className="bg-stone-800 hover:bg-stone-900 text-white font-gloria px-8 py-4 text-lg rounded-lg shadow-md transition-colors"
                >
                  Drop a pin
                  <ChevronDown className={`h-4 w-4 ml-2 transition-transform ${isAddMenuOpen ? 'rotate-180' : ''}`} />
                </Button>
                
                {isAddMenuOpen && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-stone-200 rounded-lg shadow-lg z-50 min-w-[200px]">
                    <div className="p-2 space-y-1">
                      <Link href="/add-store" onClick={() => setIsAddMenuOpen(false)}>
                        <div className="flex items-center gap-3 px-4 py-3 rounded-md hover:bg-rose-50 transition-colors cursor-pointer w-full">
                          <div className="w-3 h-3 bg-rose-500 rounded-full"></div>
                          <span className="text-stone-800 font-medium font-gloria">Add a store</span>
                        </div>
                      </Link>
                      <Link href="/add-library" onClick={() => setIsAddMenuOpen(false)}>
                        <div className="flex items-center gap-3 px-4 py-3 rounded-md hover:bg-blue-50 transition-colors cursor-pointer w-full">
                          <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                          <span className="text-stone-800 font-medium font-gloria">Add a library</span>
                        </div>
                      </Link>
                      <Link href="/add-event" onClick={() => setIsAddMenuOpen(false)}>
                        <div className="flex items-center gap-3 px-4 py-3 rounded-md hover:bg-green-50 transition-colors cursor-pointer w-full">
                          <div className="w-3 h-3 bg-[#009035] rounded-full"></div>
                          <span className="text-stone-800 font-medium font-gloria">Add an event</span>
                        </div>
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>



          {/* List View with Tabs - Mobile: order-5, Desktop: left column */}
          <div className="order-5 lg:order-1 space-y-4">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="stores" className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Stores ({filteredStores.length})
                </TabsTrigger>
                <TabsTrigger value="libraries" className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4" />
                  Libraries ({filteredLibraries.length})
                </TabsTrigger>
                <TabsTrigger value="events" className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Events ({filteredEvents.length})
                </TabsTrigger>
              </TabsList>

              {/* Stores Tab */}
              <TabsContent value="stores" className="space-y-4">
                <div className="space-y-4 max-h-[400px] lg:max-h-[800px] overflow-y-auto pr-2">
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
                        className="bg-white border-stone-200 shadow-sm hover:shadow-md transition-shadow duration-200 rounded-lg cursor-pointer"
                        onClick={() => handleCardClick(store, 'store')}
                      >
                        <CardHeader className="pb-3">
                          <div className="flex justify-between items-start">
                            <div>
                              <CardTitle className="text-lg font-semibold text-stone-800 mb-1">
                                <Link 
                                  href={`/store/${store.permalink || store.id}`}
                                  className="hover:text-rose-600 transition-colors"
                                >
                                  {store.name}
                                </Link>
                              </CardTitle>
                              <div className="flex items-center text-stone-600 text-sm mb-2">
                                <MapPin className="h-4 w-4 mr-1" />
                                {store.city}{store.state && `, ${store.state}`}, {store.country}
                              </div>
                            </div>
                          </div>
                          
                          {/* Store Tags */}
                          {store.store_tags && store.store_tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-3">
                              {store.store_tags.map((storeTag, index) => (
                                <Badge
                                  key={storeTag.id || `store-tag-${store.id}-${index}`}
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
                              Added by{' '}
                              {store.user_permalink ? (
                                <Link 
                                  href={`/profile/${store.user_permalink}`}
                                  className="text-stone-800 hover:underline transition-colors"
                                >
                                  {store.user_name}
                                </Link>
                              ) : (
                                store.user_name
                              )}
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
                <div className="space-y-4 max-h-[400px] lg:max-h-[800px] overflow-y-auto pr-2">
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
                        className="bg-white border-stone-200 shadow-sm hover:shadow-md transition-shadow duration-200 rounded-lg cursor-pointer"
                        onClick={() => handleCardClick(library, 'library')}
                      >
                        <CardHeader className="pb-3">
                          <div className="flex justify-between items-start">
                            <div>
                              <CardTitle className="text-lg font-semibold text-stone-800 mb-1">
                                <Link 
                                  href={`/library/${library.permalink || library.id}`}
                                  className="hover:text-blue-600 transition-colors"
                                >
                                  {library.name}
                                </Link>
                              </CardTitle>
                              <div className="flex items-center text-stone-600 text-sm mb-2">
                                <MapPin className="h-4 w-4 mr-1" />
                                {library.city}{library.state && `, ${library.state}`}, {library.country}
                              </div>
                            </div>
                          </div>
                          
                          {/* Library Tags */}
                          {library.library_tags && library.library_tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-3">
                              {library.library_tags.map((libraryTag, index) => (
                                <Badge
                                  key={libraryTag.id || `library-tag-${library.id}-${index}`}
                                  variant="outline"
                                  className="text-xs bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100"
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
                              Added by{' '}
                              {library.user_permalink ? (
                                <Link 
                                  href={`/profile/${library.user_permalink}`}
                                  className="text-stone-800 hover:underline transition-colors"
                                >
                                  {library.user_name}
                                </Link>
                              ) : (
                                library.user_name
                              )}
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

              {/* Events Tab */}
              <TabsContent value="events" className="space-y-4">
                <div className="space-y-4 max-h-[400px] lg:max-h-[800px] overflow-y-auto pr-2">
                  {filteredEvents.length === 0 ? (
                    <Card className="bg-white border-stone-200 shadow-sm rounded-lg">
                      <CardContent className="p-6 text-center">
                        <Calendar className="h-12 w-12 mx-auto mb-4 text-[#009035]" />
                        <h3 className="text-lg font-semibold text-stone-800 mb-2">
                          {events.length === 0 ? "No events yet" : "No events match your filters"}
                        </h3>
                        <p className="text-stone-600 mb-4">
                          {events.length === 0 
                            ? "Be the first to add a zine event to the map!"
                            : "Try adjusting your search or filter criteria."
                          }
                        </p>
                        {events.length === 0 ? (
                          <Link href="/add-event">
                            <Button className="bg-[#009035] hover:bg-[#007a2a] text-white font-gloria">
                              add first event
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
                    filteredEvents.map((event) => (
                      <Card
                        key={event.id}
                        className="bg-white border-stone-200 shadow-sm hover:shadow-md transition-shadow duration-200 rounded-lg cursor-pointer"
                        onClick={() => handleCardClick(event, 'event')}
                      >
                        <CardHeader className="pb-3">
                          <div className="flex justify-between items-start">
                            <div>
                              <CardTitle className="text-lg font-semibold text-stone-800 mb-1">
                                <Link 
                                  href={`/event/${event.permalink || event.id}`}
                                  className="hover:text-[#009035] transition-colors"
                                >
                                  {event.name}
                                </Link>
                              </CardTitle>
                              {event.venue_name && (
                                <div className="flex items-center text-stone-600 text-sm mb-1">
                                  <Landmark className="h-4 w-4 mr-1" />
                                  <span className="font-medium">{event.venue_name}</span>
                                </div>
                              )}
                              <div className="flex items-center text-stone-600 text-sm mb-2">
                                <MapPin className="h-4 w-4 mr-1" />
                                {event.city}{event.state && `, ${event.state}`}, {event.country}
                              </div>                            </div>
                          </div>
                          
                          {/* Event Category and Dates */}
                          <div className="flex items-center gap-2 mt-3">
                            <Badge 
                              variant="outline"
                              className="text-xs bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100"
                            >
                              {getEventCategoryDisplay(event.category)}
                            </Badge>
                            <div className="flex items-center text-xs text-stone-500">
                              <Calendar className="h-3 w-3 mr-1" />
                              {formatDateReadable(event.start_date)}
                              {event.start_date !== event.end_date && ` - ${formatDateReadable(event.end_date)}`}
                            </div>
                            {event.category === "festival" && event.application_deadline && (() => {
                              const today = new Date();
                              const deadlineDate = new Date(event.application_deadline);
                              today.setHours(0, 0, 0, 0);
                              deadlineDate.setHours(0, 0, 0, 0);
                              return deadlineDate >= today;
                            })() && (
                              <div className="flex items-center text-xs text-stone-500">
                                <Clock className="h-3 w-3 mr-1" />
                                Apply by {formatDateReadable(event.application_deadline)}
                              </div>
                            )}
                          </div>
                        </CardHeader>

                        <CardContent className="pt-0">
                          <p className="text-stone-600 text-sm mb-4 leading-relaxed line-clamp-5">
                            {event.notes}
                          </p>
                          {event.user_name && (
                            <p className="text-xs text-gray-500 mb-3">
                              Added by{' '}
                              {event.user_permalink ? (
                                <Link 
                                  href={`/profile/${event.user_permalink}`}
                                  className="text-stone-800 hover:underline transition-colors"
                                >
                                  {event.user_name}
                                </Link>
                              ) : (
                                event.user_name
                              )}
                            </p>
                          )}
                          <Link href={`/event/${event.permalink || event.id}`}>
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full border-[#009035] text-[#009035] hover:bg-green-50 hover:border-[#007a2a] hover:text-[#007a2a] transition-colors bg-transparent"
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
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-white border-t border-stone-200">
        <div className="max-w-7xl mx-auto px-4 py-8 text-center">
          <p className="text-stone-600 text-sm">
            © 2025 zinemap. created by <a href="https://cjwucomics.com" target="_blank" className="text-rose-500 hover:text-rose-600">@cjmakescomics</a> with love to fellow indie publishers and the shops and libraries that carry our work!
          </p>
        </div>
      </footer>
    </div>
  )
} 