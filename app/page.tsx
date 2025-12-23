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
import { useLocationFilters } from "@/hooks/useLocationFilters"

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
  const [eventTimeFilter, setEventTimeFilter] = useState<"all" | "upcoming" | "past">("all")
  const [isAddMenuOpen, setIsAddMenuOpen] = useState(false)
  const [showMobileFilters, setShowMobileFilters] = useState(false)

  // Location filters (combined across all types)
  const allItemsForFilters: Array<Store | Library | Event> = [...stores, ...libraries, ...events]
  const {
    selectedCountry,
    selectedState,
    selectedCity,
    setSelectedCountry,
    setSelectedState,
    setSelectedCity,
    countries,
    states,
    cities,
    clearLocationFilters
  } = useLocationFilters({ items: allItemsForFilters })

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
        // Note: locale_edits is a very small table (~5 rows), so we fetch all at once
        const [
          storeTagsResult,
          storeUserProfilesResult,
          libraryTagsResult,
          libraryUserProfilesResult,
          eventUserProfilesResult,
          allEditsResult
        ] = await Promise.all([
          // Store tags
          currentStores.length > 0 ? supabase
            .from('store_tags')
            .select(`id, store_id, tag_id, tags!inner(id, label, category)`)
            .in('store_id', currentStores.map(s => s.id)) : Promise.resolve({ data: [] }),
          
          // Store user profiles
          currentStores.length > 0 ? supabase
            .from('profiles')
            .select('id, display_name, permalink')
            .in('id', currentStores.map(s => s.submitted_by)) : Promise.resolve({ data: [] }),
          
          // Library tags
          currentLibraries.length > 0 ? supabase
            .from('library_tags')
            .select(`id, library_id, tag_id, tags!inner(id, label, category)`)
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
            .in('id', currentEvents.map(e => e.submitted_by)) : Promise.resolve({ data: [] }),
          
          // All locale_edits (small table, fetch all at once)
          supabase
            .from('locale_edits')
            .select('store_id, library_id, event_id, user_id, created_at')
            .order('created_at', { ascending: false })
        ])

        // Process all edits in memory to get most recent per store/library/event
        const storeLastEditsMap = new Map<string, { user_id: string }>()
        const libraryLastEditsMap = new Map<string, { user_id: string }>()
        const eventLastEditsMap = new Map<string, { user_id: string }>()
        
        const allEdits = allEditsResult.data || []
        for (const edit of allEdits) {
          if (edit.store_id && !storeLastEditsMap.has(edit.store_id)) {
            storeLastEditsMap.set(edit.store_id, { user_id: edit.user_id })
          }
          if (edit.library_id && !libraryLastEditsMap.has(edit.library_id)) {
            libraryLastEditsMap.set(edit.library_id, { user_id: edit.user_id })
          }
          if (edit.event_id && !eventLastEditsMap.has(edit.event_id)) {
            eventLastEditsMap.set(edit.event_id, { user_id: edit.user_id })
          }
        }
        
        // Batch fetch ALL editor profiles in one query
        const allEditorIds = Array.from(new Set([
          ...Array.from(storeLastEditsMap.values()).map(e => e.user_id),
          ...Array.from(libraryLastEditsMap.values()).map(e => e.user_id),
          ...Array.from(eventLastEditsMap.values()).map(e => e.user_id)
        ]))
        const allEditorProfilesResult = allEditorIds.length > 0 ? await supabase
          .from('profiles')
          .select('id, display_name, permalink')
          .in('id', allEditorIds) : { data: [] }
        
        const editorMap = new Map(
          (allEditorProfilesResult.data || []).map(user => [user.id, { display_name: user.display_name, permalink: user.permalink }])
        )

        // Helper: Enrich item with user and edit info
        const enrichItem = <T extends { id: string; submitted_by: string }>(
          item: T,
          userMap: Map<string, { display_name: string; permalink: string | null }>,
          lastEditsMap: Map<string, { user_id: string }>
        ) => {
          const userData = userMap.get(item.submitted_by) || { display_name: 'Unknown user', permalink: null }
          const lastEdit = lastEditsMap.get(item.id)
          let lastEditUserData = null
          if (lastEdit) {
            lastEditUserData = editorMap.get(lastEdit.user_id) || { display_name: 'Unknown user', permalink: null }
          }
          
          return {
            ...item,
            user_name: userData.display_name,
            user_permalink: userData.permalink,
            last_edit_user_name: lastEditUserData?.display_name,
            last_edit_user_permalink: lastEditUserData?.permalink
          }
        }

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

          return enrichItem(
            { ...store, store_tags: storeTags },
            storeUserMap,
            storeLastEditsMap
          )
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

          return enrichItem(
            { ...library, library_tags: libraryTags },
            libraryUserMap,
            libraryLastEditsMap
          )
        })

        // Process events with enhanced data
        const eventUserMap = new Map(
          (eventUserProfilesResult.data || []).map(user => [user.id, { display_name: user.display_name, permalink: user.permalink }])
        )
        
        const eventsWithUser = currentEvents.map((event) => 
          enrichItem(event, eventUserMap, eventLastEditsMap)
        )

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
  }, [phase1Complete])

  // Debounce search query to improve performance (realtime search)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery.trim())
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery])

  const handleClearSearchAndFilters = () => {
    setSearchQuery("")
    setDebouncedSearchQuery("")
    clearLocationFilters()
  }

  // Helper: Check if event is past
  const isPastEvent = (event: Event) => {
    const today = new Date().toISOString().split('T')[0]
    return event.end_date < today
  }

  // Calculate event counts for subtabs (based on search and location filters only, not time filter)
  const getEventCounts = () => {
    if (!events) return { all: 0, upcoming: 0, past: 0 }
    
    // Helper: Check if item matches location filters
    const matchesLocation = (item: Event) => {
      if (selectedCountry !== "all" && item.country !== selectedCountry) return false
      if (selectedState !== "all" && (item.state || "") !== selectedState) return false
      if (selectedCity !== "all" && item.city !== selectedCity) return false
      return true
    }

    // Helper: Check if item matches search query
    const matchesSearch = (item: Event, query: string) => {
      if (!query) return true
      const lowerQuery = query.toLowerCase()
      return (
        item.name.toLowerCase().includes(lowerQuery) ||
        (!!item.notes && item.notes.toLowerCase().includes(lowerQuery)) ||
        item.country.toLowerCase().includes(lowerQuery) ||
        (!!item.state && item.state.toLowerCase().includes(lowerQuery)) ||
        item.city.toLowerCase().includes(lowerQuery)
      )
    }

    // Filter by location and search only
    const filtered = events.filter(event => {
      if (!matchesLocation(event)) return false
      if (debouncedSearchQuery.trim()) {
        return matchesSearch(event, debouncedSearchQuery.trim())
      }
      return true
    })

    return {
      all: filtered.length,
      upcoming: filtered.filter(event => !isPastEvent(event)).length,
      past: filtered.filter(event => isPastEvent(event)).length
    }
  }

  const eventCounts = getEventCounts()

  // Filter stores, libraries, and events based on debounced search query and location filters
  useEffect(() => {
    if (!stores || !libraries || !events) return

    // Helper: Check if item matches location filters
    const matchesLocation = (item: Store | Library | Event) => {
      if (selectedCountry !== "all" && item.country !== selectedCountry) return false
      if (selectedState !== "all" && (item.state || "") !== selectedState) return false
      if (selectedCity !== "all" && item.city !== selectedCity) return false
      return true
    }

    // Helper: Check if item matches search query (name, notes, country, state, city)
    const matchesSearch = (item: Store | Library | Event, query: string) => {
      if (!query) return true
      const lowerQuery = query.toLowerCase()
      return (
        item.name.toLowerCase().includes(lowerQuery) ||
        (!!item.notes && item.notes.toLowerCase().includes(lowerQuery)) ||
        item.country.toLowerCase().includes(lowerQuery) ||
        (!!item.state && item.state.toLowerCase().includes(lowerQuery)) ||
        item.city.toLowerCase().includes(lowerQuery)
      )
    }

    // Helper: Filter items by location and search
    const filterItems = <T extends Store | Library | Event>(items: T[]) => {
      return items.filter(item => {
        if (!matchesLocation(item)) return false
        if (debouncedSearchQuery.trim()) {
          return matchesSearch(item, debouncedSearchQuery.trim())
        }
        return true
      })
    }

    // Filter events with time filter
    const filterEvents = (items: Event[]) => {
      let filtered = filterItems(items)
      
      // Apply time filter
      if (eventTimeFilter === "upcoming") {
        filtered = filtered.filter(event => !isPastEvent(event))
      } else if (eventTimeFilter === "past") {
        filtered = filtered.filter(event => isPastEvent(event))
      }
      // "all" shows everything, no additional filtering needed
      
      return filtered
    }

    setFilteredStores(filterItems(stores))
    setFilteredLibraries(filterItems(libraries))
    setFilteredEvents(filterEvents(events))
  }, [stores, libraries, events, debouncedSearchQuery, selectedCountry, selectedState, selectedCity, eventTimeFilter])

  // Show loading only if we don't have basic data yet
  if (!phase1Complete) {
    return (
      <div className="min-h-screen bg-stone-50 font-serif flex items-center justify-center">
        <div className="text-stone-500 text-lg">Loading...</div>
      </div>
    )
  }

  return (
    <div className="flex flex-col flex-1 bg-stone-50 font-serif min-h-0">
      {/* Header - Mobile: order-1 */}
      <header className="order-1 w-full bg-white border-b border-stone-200 shadow-sm flex-shrink-0">
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
      <div className="flex-1 flex flex-col order-3 max-w-7xl mx-auto px-4 pt-6 w-full min-h-0">
        {/* Search and Filters - Mobile dropdown */}
        <div className="block lg:hidden mb-3">
          <div className="bg-white rounded-xl shadow-sm border border-stone-200 p-4">
            <Button
              variant="outline"
              onClick={() => setShowMobileFilters(prev => !prev)}
              className="w-full justify-between border-stone-300 text-stone-700 hover:bg-stone-50"
            >
              <span className="flex items-center gap-2"><Filter className="h-4 w-4" /> Search by name/location</span>
              <ChevronDown className={`h-4 w-4 transition-transform ${showMobileFilters ? 'rotate-180' : ''}`} />
            </Button>

            {showMobileFilters && (
              <div className="mt-4 space-y-3">
                {/* Search */}
                <div className="relative w-full">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-stone-400 h-4 w-4" />
                  <Input
                    placeholder="Search by name or description"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 bg-stone-50 border-stone-300 focus:border-rose-300 focus:ring-rose-200"
                  />
                </div>

                {/* Country */}
                <div className="w-full">
                  <Select value={selectedCountry} onValueChange={setSelectedCountry}>
                    <SelectTrigger className="bg-stone-50 border-stone-300 focus:border-rose-300 focus:ring-rose-200">
                      <SelectValue placeholder="Country" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All countries</SelectItem>
                      {countries.map((c) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* State */}
                <div className="w-full">
                  <Select value={selectedState} onValueChange={setSelectedState} disabled={selectedCountry === "all"}>
                    <SelectTrigger className={`${selectedCountry === "all" ? "bg-stone-100 border-stone-200 text-stone-400 cursor-not-allowed" : "bg-stone-50 border-stone-300 focus:border-rose-300 focus:ring-rose-200"}`}>
                      <SelectValue placeholder="State/Province" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All states/regions</SelectItem>
                      {states.map((s) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* City */}
                <div className="w-full">
                  <Select value={selectedCity} onValueChange={setSelectedCity} disabled={selectedState === "all"}>
                    <SelectTrigger className={`${selectedState === "all" ? "bg-stone-100 border-stone-200 text-stone-400 cursor-not-allowed" : "bg-stone-50 border-stone-300 focus:border-rose-300 focus:ring-rose-200"}`}>
                      <SelectValue placeholder="City" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All cities</SelectItem>
                      {cities.map((c) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="pt-1">
                  <Button 
                    variant="outline"
                    onClick={handleClearSearchAndFilters}
                    className="w-full border-stone-300 text-stone-700 hover:bg-stone-50"
                  >
                    Clear search
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Search and Filters - Desktop only, appears above grid */}
        <div className="hidden lg:block mb-3 lg:mb-6">
          <div className="bg-white rounded-xl shadow-sm border border-stone-200 p-6">
            <div className="flex flex-col md:flex-row gap-4">
              {/* Search Bar */}
              <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-stone-400 h-4 w-4" />
                                  <Input
                placeholder="Search by name or description"
                    value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 bg-stone-50 border-stone-300 focus:border-rose-300 focus:ring-rose-200"
                  />
              </div>

              {/* Filters */}
              <div className="flex flex-col sm:flex-row gap-3 flex-1">
                {/* Country */}
                <div className="min-w-[160px] flex-1">
                  <Select value={selectedCountry} onValueChange={setSelectedCountry}>
                    <SelectTrigger className="bg-stone-50 border-stone-300 focus:border-rose-300 focus:ring-rose-200">
                      <SelectValue placeholder="Country" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All countries</SelectItem>
                      {countries.map((c) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* State */}
                <div className="min-w-[160px] flex-1">
                  <Select value={selectedState} onValueChange={setSelectedState} disabled={selectedCountry === "all"}>
                    <SelectTrigger className={`${selectedCountry === "all" ? "bg-stone-100 border-stone-200 text-stone-400 cursor-not-allowed" : "bg-stone-50 border-stone-300 focus:border-rose-300 focus:ring-rose-200"}`}>
                      <SelectValue placeholder="State/Province" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All states/regions</SelectItem>
                      {states.map((s) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* City */}
                <div className="min-w-[160px] flex-1">
                  <Select value={selectedCity} onValueChange={setSelectedCity} disabled={selectedState === "all"}>
                    <SelectTrigger className={`${selectedState === "all" ? "bg-stone-100 border-stone-200 text-stone-400 cursor-not-allowed" : "bg-stone-50 border-stone-300 focus:border-rose-300 focus:ring-rose-200"}`}>
                      <SelectValue placeholder="City" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All cities</SelectItem>
                      {cities.map((c) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Clear search (also clears filters) */}
                <Button 
                  variant="outline"
                  onClick={handleClearSearchAndFilters}
                  className="border-stone-300 text-stone-700 hover:bg-stone-50"
                >
                  Clear search
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 flex flex-col lg:grid lg:grid-cols-2 lg:grid-rows-1 gap-6 min-h-0 overflow-hidden lg:items-stretch" style={{ maxHeight: '100%' }}>
          {/* Interactive Map - Mobile: order-2, Desktop: right column */}
          <div className="order-2 lg:order-2 lg:sticky lg:top-6 h-fit lg:h-auto lg:flex lg:flex-col">
            <Card className="bg-white border-stone-200 shadow-sm rounded-lg overflow-hidden">
              <CardContent className="p-0">
                {!phase1Complete ? (
                  <div className="w-full h-96 lg:h-full bg-stone-100 animate-pulse flex items-center justify-center">
                    <div className="text-stone-500">Preparing map...</div>
                  </div>
                ) : (
                  <div className="w-full h-96 lg:h-full relative">
                    <StoreMap 
                      stores={filteredStores}
                      libraries={filteredLibraries}
                      events={filteredEvents}
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
                          <span className="text-stone-800 font-medium font-gloria">Add a shop</span>
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
          <div className="order-5 lg:order-1 flex flex-col space-y-4 flex-1 min-h-0 lg:h-full overflow-hidden">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full flex flex-col h-full min-h-0">
              <TabsList className="grid w-full grid-cols-3 flex-shrink-0">
                <TabsTrigger value="stores" className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Shops ({filteredStores.length})
                </TabsTrigger>
                <TabsTrigger value="libraries" className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4" />
                  Libraries ({filteredLibraries.length})
                </TabsTrigger>
                <TabsTrigger value="events" className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Events ({eventCounts.all})
                </TabsTrigger>
              </TabsList>

              {/* Stores Tab */}
              <TabsContent value="stores" className="flex flex-col flex-grow space-y-4 min-h-0 overflow-hidden max-h-full mt-1">
                <div className="flex-1 min-h-0 max-h-[600px] lg:h-full lg:max-h-[800px] xl:max-h-[calc(100vh-300px)] space-y-4 overflow-y-auto pr-2">
                  {filteredStores.length === 0 ? (
                    <Card className="bg-white border-stone-200 shadow-sm rounded-lg">
                      <CardContent className="p-6 text-center">
                        <MapPin className="h-12 w-12 mx-auto mb-4 text-stone-400" />
                        <h3 className="text-lg font-semibold text-stone-800 mb-2">
                          {stores.length === 0 ? "No shops yet" : "No shops match your filters"}
                        </h3>
                        <p className="text-stone-600 mb-4">
                          {stores.length === 0 
                            ? "Be the first to add a zine-friendly shop to the map!"
                            : "Try adjusting your search or filter criteria."
                          }
                        </p>
                        {stores.length === 0 ? (
                          <Link href="/add-store">
                            <Button className="bg-rose-500 hover:bg-rose-600 text-white font-gloria">
                              add first shop
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
                          {(store.user_name || store.last_edit_user_name) && (
                            <p className="text-xs text-gray-500 mb-3">
                              {store.user_name && (
                                <>
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
                                </>
                              )}
                              {store.user_name && store.last_edit_user_name && ' • '}
                              {store.last_edit_user_name && (
                                <>
                                  Last edit by{' '}
                                  {store.last_edit_user_permalink ? (
                                    <Link 
                                      href={`/profile/${store.last_edit_user_permalink}`}
                                      className="text-stone-800 hover:underline transition-colors"
                                    >
                                      {store.last_edit_user_name}
                                    </Link>
                                  ) : (
                                    store.last_edit_user_name
                                  )}
                                </>
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
              <TabsContent value="libraries" className="flex flex-col flex-grow space-y-4 min-h-0 overflow-hidden max-h-full mt-1">
                <div className="flex-1 min-h-0 max-h-[600px] lg:h-full lg:max-h-[800px] xl:max-h-[calc(100vh-300px)] space-y-4 overflow-y-auto pr-2">
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
                          {(library.user_name || library.last_edit_user_name) && (
                            <p className="text-xs text-gray-500 mb-3">
                              {library.user_name && (
                                <>
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
                                </>
                              )}
                              {library.user_name && library.last_edit_user_name && ' • '}
                              {library.last_edit_user_name && (
                                <>
                                  Last edit by{' '}
                                  {library.last_edit_user_permalink ? (
                                    <Link 
                                      href={`/profile/${library.last_edit_user_permalink}`}
                                      className="text-stone-800 hover:underline transition-colors"
                                    >
                                      {library.last_edit_user_name}
                                    </Link>
                                  ) : (
                                    library.last_edit_user_name
                                  )}
                                </>
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
              <TabsContent value="events" className="flex flex-col flex-grow space-y-4 min-h-0 overflow-hidden max-h-full mt-1">
                {/* Event Time Filter Sub-tabs */}
                <div className="flex gap-4 justify-end flex-shrink-0 h-8">
                  <button
                    onClick={() => setEventTimeFilter("all")}
                    className={`px-2 py-1 text-sm transition-colors ${
                      eventTimeFilter === "all"
                        ? 'text-stone-700 border-b-2 border-stone-400 pb-1 -mb-0.5'
                        : 'text-stone-500 hover:text-stone-700'
                    }`}
                  >
                    All Events
                  </button>
                  <button
                    onClick={() => setEventTimeFilter("upcoming")}
                    className={`px-2 py-1 text-sm transition-colors ${
                      eventTimeFilter === "upcoming"
                        ? 'text-stone-700 border-b-2 border-stone-400 pb-1 -mb-0.5'
                        : 'text-stone-500 hover:text-stone-700'
                    }`}
                  >
                    Upcoming Events
                  </button>
                </div>
                <div className="flex-1 min-h-0 max-h-[600px] lg:h-full lg:max-h-[800px] xl:max-h-[calc(100vh-300px)] space-y-4 overflow-y-auto pr-2">
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
                          <div className="flex items-center gap-2 mt-3 flex-wrap">
                            <Badge 
                              variant="outline"
                              className="text-xs bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100"
                            >
                              {getEventCategoryDisplay(event.category)}
                            </Badge>
                            {isPastEvent(event) && (
                              <Badge 
                                variant="outline"
                                className="text-xs bg-stone-100 text-stone-500 border-stone-300"
                              >
                                Past Event
                              </Badge>
                            )}
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
                          {(event.user_name || event.last_edit_user_name) && (
                            <p className="text-xs text-gray-500 mb-3">
                              {event.user_name && (
                                <>
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
                                </>
                              )}
                              {event.user_name && event.last_edit_user_name && ' • '}
                              {event.last_edit_user_name && (
                                <>
                                  Last edit by{' '}
                                  {event.last_edit_user_permalink ? (
                                    <Link 
                                      href={`/profile/${event.last_edit_user_permalink}`}
                                      className="text-stone-800 hover:underline transition-colors"
                                    >
                                      {event.last_edit_user_name}
                                    </Link>
                                  ) : (
                                    event.last_edit_user_name
                                  )}
                                </>
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
    </div>
  )
} 