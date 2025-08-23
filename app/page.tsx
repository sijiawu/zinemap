"use client"

import { Search, MapPin, Filter, ExternalLink, User, BookOpen, Calendar, Clock, Plus, ChevronDown } from "lucide-react"
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
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("")
  const [activeTab, setActiveTab] = useState("stores")
  const [isAddMenuOpen, setIsAddMenuOpen] = useState(false)

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

        // Fetch events
        const { data: eventsData, error: eventsError } = await supabase
          .from('events')
          .select('*')
          .eq('approved', true)
          .gte('end_date', new Date().toISOString().split('T')[0]) // Only future events
          .order('start_date', { ascending: true })

        if (eventsError) {
          console.error('Error fetching events:', eventsError)
        }

        // Batch fetch all store tags
        const { data: allStoreTags } = await supabase
          .from('store_tags')
          .select(`
            id,
            store_id,
            tag_id,
            tags!inner(id, label, category)
          `)
          .in('store_id', (storesData || []).map(s => s.id))

        // Batch fetch all user profiles
        const storeUserIds = (storesData || []).map(s => s.submitted_by)
        const { data: allStoreUserProfiles } = await supabase
          .from('profiles')
          .select('id, display_name, permalink')
          .in('id', storeUserIds)

        // Create user lookup map
        const storeUserMap = new Map(
          (allStoreUserProfiles || []).map(user => [user.id, { display_name: user.display_name, permalink: user.permalink }])
        )

        // Process stores with tags and user info
        const storesWithTags = (storesData || []).map((store) => {
          const storeTags = (allStoreTags || [])
            .filter(tag => tag.store_id === store.id)
            .map((tag: any) => ({
              id: tag.id || `store-tag-${store.id}-${tag.tag_id}`,
              tag_id: tag.tag_id,
              tag: tag.tags
            }))

          const userData = storeUserMap.get(store.submitted_by) || { display_name: 'Unknown user', permalink: null }
          const user_name = userData.display_name
          const user_permalink = userData.permalink

          return {
            ...store,
            store_tags: storeTags,
            user_name,
            user_permalink
          }
        })

        // Batch fetch all library tags
        const { data: allLibraryTags } = await supabase
          .from('library_tags')
          .select(`
            id,
            library_id,
            tag_id,
            tags!inner(id, label, category)
          `)
          .in('library_id', (librariesData || []).map(l => l.id))

        // Batch fetch all library user profiles
        const libraryUserIds = (librariesData || []).map(l => l.submitted_by)
        const { data: allLibraryUserProfiles } = await supabase
          .from('profiles')
          .select('id, display_name, permalink')
          .in('id', libraryUserIds)

        // Create library user lookup map
        const libraryUserMap = new Map(
          (allLibraryUserProfiles || []).map(user => [user.id, { display_name: user.display_name, permalink: user.permalink }])
        )

        // Process libraries with tags and user info
        const librariesWithTags = (librariesData || []).map((library) => {
          const libraryTags = (allLibraryTags || [])
            .filter(tag => tag.library_id === library.id)
            .map((tag: any) => ({
              id: tag.id || `library-tag-${library.id}-${tag.tag_id}`,
              tag_id: tag.tag_id,
              tag: tag.tags
            }))

          const userData = libraryUserMap.get(library.submitted_by) || { display_name: 'Unknown user', permalink: null }
          const user_name = userData.display_name
          const user_permalink = userData.permalink

          return {
            ...library,
            library_tags: libraryTags,
            user_name,
            user_permalink
          }
        })

        // Batch fetch all event user profiles
        const eventUserIds = (eventsData || []).map(e => e.submitted_by)
        const { data: allEventUserProfiles } = await supabase
          .from('profiles')
          .select('id, display_name, permalink')
          .in('id', eventUserIds)

        // Create event user lookup map
        const eventUserMap = new Map(
          (allEventUserProfiles || []).map(user => [user.id, { display_name: user.display_name, permalink: user.permalink }])
        )

        // Process events with user info
        const eventsWithUser = (eventsData || []).map((event) => {
          const userData = eventUserMap.get(event.submitted_by) || { display_name: 'Unknown user', permalink: null }
          const user_name = userData.display_name
          const user_permalink = userData.permalink

          return {
            ...event,
            user_name,
            user_permalink
          }
        })

        setStores(storesWithTags)
        setLibraries(librariesWithTags)
        setEvents(eventsWithUser)
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
                <div className="space-y-4 max-h-[800px] overflow-y-auto pr-2">
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
                        className="bg-white border-stone-200 shadow-sm hover:shadow-md transition-shadow duration-200 rounded-lg"
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
                              <div className="flex items-center text-stone-600 text-sm mb-2">
                                <MapPin className="h-4 w-4 mr-1" />
                                {event.city}{event.state && `, ${event.state}`}, {event.country}
                              </div>
                            </div>
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
                            {/* {event.category === "festival" && event.application_deadline && (
                              <div className="flex items-center text-xs text-stone-500">
                                <Clock className="h-3 w-3 mr-1" />
                                {new Date(event.application_deadline) < new Date() 
                                  ? "Deadline passed" 
                                  : `Apply by ${formatDateReadable(event.application_deadline)}`
                                }
                              </div>
                            )} */}
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

          {/* Interactive Map */}
          <div className="lg:sticky lg:top-6">
            <Card className="bg-white border-stone-200 shadow-sm rounded-lg overflow-hidden">
              <CardContent className="p-0">
                {loading ? (
                  <div className="h-96 bg-stone-100 animate-pulse flex items-center justify-center">
                    <div className="text-stone-500">Loading map...</div>
                  </div>
                ) : (
                  <StoreMap 
                    stores={stores}
                    libraries={libraries}
                    events={events}
                    searchQuery={debouncedSearchQuery}
                  />
                )}
              </CardContent>
            </Card>

            {/* Add Store, Library, and Event buttons under the map */}
            <div className="mt-8 flex justify-center">
              <div className="relative add-menu-container">
                <Button 
                  onClick={() => setIsAddMenuOpen(!isAddMenuOpen)}
                  className="bg-stone-800 hover:bg-stone-900 text-white font-gloria px-8 py-4 text-lg rounded-lg shadow-md transition-colors"
                >
                  Drop a Pin
                  <ChevronDown className={`h-4 w-4 ml-2 transition-transform ${isAddMenuOpen ? 'rotate-180' : ''}`} />
                </Button>
                
                {isAddMenuOpen && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-stone-200 rounded-lg shadow-lg z-50 min-w-[200px]">
                    <div className="p-2 space-y-1">
                      <Link href="/add-store" onClick={() => setIsAddMenuOpen(false)}>
                        <div className="flex items-center gap-3 px-4 py-3 rounded-md hover:bg-rose-50 transition-colors cursor-pointer w-full">
                          <div className="w-3 h-3 bg-rose-500 rounded-full"></div>
                          <span className="text-stone-800 font-medium font-gloria">Add a Store</span>
                        </div>
                      </Link>
                      <Link href="/add-library" onClick={() => setIsAddMenuOpen(false)}>
                        <div className="flex items-center gap-3 px-4 py-3 rounded-md hover:bg-blue-50 transition-colors cursor-pointer w-full">
                          <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                          <span className="text-stone-800 font-medium font-gloria">Add a Library</span>
                        </div>
                      </Link>
                      <Link href="/add-event" onClick={() => setIsAddMenuOpen(false)}>
                        <div className="flex items-center gap-3 px-4 py-3 rounded-md hover:bg-green-50 transition-colors cursor-pointer w-full">
                          <div className="w-3 h-3 bg-[#009035] rounded-full"></div>
                          <span className="text-stone-800 font-medium font-gloria">Add an Event</span>
                        </div>
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="mt-16 bg-white border-t border-stone-200">
        <div className="max-w-7xl mx-auto px-4 py-8 text-center">
          <p className="text-stone-600 text-sm">
            © 2025 zinemap. created by <a href="https://ko-fi.com/cjwucomics" target="_blank" className="text-rose-500 hover:text-rose-600">@cjmakescomics</a> with love to fellow indie publishers and the shops and libraries that carry our work!
          </p>
        </div>
      </footer>
    </div>
  )
} 