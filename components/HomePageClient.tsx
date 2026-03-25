"use client"

import { Search, MapPin, Filter, ExternalLink, User, BookOpen, Calendar, Clock, Plus, ChevronDown, Landmark } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import dynamic from "next/dynamic"
import Link from "next/link"
import { useEffect, useState, useRef, useMemo } from "react"
import { supabase } from "@/lib/supabaseClient"
import { Store, Library, Event } from "@/lib/types"
import { formatDateReadable, getEventCategoryDisplay, expandRecurringEvents, occurrenceToDisplayEvent, occurrencesToNextOnly, isPastEvent, formatTimeRange } from "@/lib/utils"
import { SaveButton } from "@/components/SaveButton"
import { RelativeDateWithTooltip } from "@/components/RelativeDateWithTooltip"
import { useLocationFilters } from "@/hooks/useLocationFilters"
import { HowDoesThisWorkLink } from "@/components/HowDoesThisWorkModal"

const StoreMap = dynamic(
  () => import("@/components/store-map").then(mod => ({ default: mod.StoreMap })),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full bg-stone-100 animate-pulse flex items-center justify-center">
        <div className="text-stone-500">Loading map...</div>
      </div>
    ),
  }
)

interface HomePageClientProps {
  initialStores: Store[]
  initialLibraries: Library[]
  initialEvents: Event[]
}

export default function HomePageClient({ initialStores, initialLibraries, initialEvents }: HomePageClientProps) {
  const [stores, setStores] = useState<Store[]>(initialStores)
  const [libraries, setLibraries] = useState<Library[]>(initialLibraries)
  const [events, setEvents] = useState<Event[]>(initialEvents)
  const [filteredStores, setFilteredStores] = useState<Store[]>(initialStores)
  const [filteredLibraries, setFilteredLibraries] = useState<Library[]>(initialLibraries)
  const [filteredEvents, setFilteredEvents] = useState<Event[]>(initialEvents)
  
  const [phase1Complete] = useState(true)
  const [phase2Complete, setPhase2Complete] = useState(false) // Map ready
  const [phase3Complete, setPhase3Complete] = useState(false) // Enhanced data loaded
  
  const [searchQuery, setSearchQuery] = useState("")
  const [activeSearchQuery, setActiveSearchQuery] = useState("")
  const [activeCountry, setActiveCountry] = useState("all")
  const [activeState, setActiveState] = useState("all")
  const [activeCity, setActiveCity] = useState("all")
  const [activeTab, setActiveTab] = useState("stores")
  const [eventTimeFilter, setEventTimeFilter] = useState<"all" | "upcoming" | "past">("all")
  const [isAddMenuOpen, setIsAddMenuOpen] = useState(false)
  const [showMobileFilters, setShowMobileFilters] = useState(false)
  
  // Map height tracking for list view min-height
  const mapCardRef = useRef<HTMLDivElement>(null)
  const [mapHeight, setMapHeight] = useState(0)

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


  // Load enhanced data (tags and user profiles) in background
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

        // Fetch tags + locale_edits in parallel (no profiles yet - we need edits to get editor IDs)
        const [
          storeTagsResult,
          libraryTagsResult,
          allEditsResult
        ] = await Promise.all([
          currentStores.length > 0 ? supabase
            .from('store_tags')
            .select(`id, store_id, tag_id, tags!inner(id, label, category)`)
            .in('store_id', currentStores.map(s => s.id)) : Promise.resolve({ data: [] }),
          currentLibraries.length > 0 ? supabase
            .from('library_tags')
            .select(`id, library_id, tag_id, tags!inner(id, label, category)`)
            .in('library_id', currentLibraries.map(l => l.id)) : Promise.resolve({ data: [] }),
          supabase
            .from('locale_edits')
            .select('store_id, library_id, event_id, user_id, created_at, status')
            .in('status', ['addressed', 'approved'])
            .order('created_at', { ascending: false })
        ])

        // Build edit maps (most recent per store/library/event)
        const storeLastEditsMap = new Map<string, { user_id: string }>()
        const libraryLastEditsMap = new Map<string, { user_id: string }>()
        const eventLastEditsMap = new Map<string, { user_id: string }>()
        const allEdits = allEditsResult.data || []
        for (const edit of allEdits) {
          if (edit.store_id && !storeLastEditsMap.has(edit.store_id)) storeLastEditsMap.set(edit.store_id, { user_id: edit.user_id })
          if (edit.library_id && !libraryLastEditsMap.has(edit.library_id)) libraryLastEditsMap.set(edit.library_id, { user_id: edit.user_id })
          if (edit.event_id && !eventLastEditsMap.has(edit.event_id)) eventLastEditsMap.set(edit.event_id, { user_id: edit.user_id })
        }

        // Single profiles query: all submitters + all editors (deduped)
        const submitterIds = [
          ...currentStores.map(s => s.submitted_by),
          ...currentLibraries.map(l => l.submitted_by),
          ...currentEvents.map(e => e.submitted_by)
        ]
        const editorIds = [
          ...Array.from(storeLastEditsMap.values()).map(e => e.user_id),
          ...Array.from(libraryLastEditsMap.values()).map(e => e.user_id),
          ...Array.from(eventLastEditsMap.values()).map(e => e.user_id)
        ]
        const allProfileIds = Array.from(new Set([...submitterIds, ...editorIds]))
        const profilesResult = allProfileIds.length > 0 ? await supabase
          .from('profiles')
          .select('id, display_name, permalink')
          .in('id', allProfileIds) : { data: [] }
        const userMap = new Map(
          (profilesResult.data || []).map(u => [u.id, { display_name: u.display_name, permalink: u.permalink }])
        )

        // Helper: Enrich item with user and edit info (userMap covers both submitters and editors)
        const enrichItem = <T extends { id: string; submitted_by: string }>(
          item: T,
          lastEditsMap: Map<string, { user_id: string }>
        ) => {
          const userData = userMap.get(item.submitted_by) || { display_name: 'Unknown user', permalink: null }
          const lastEdit = lastEditsMap.get(item.id)
          const lastEditUserData = lastEdit ? userMap.get(lastEdit.user_id) : null
          return {
            ...item,
            user_name: userData.display_name,
            user_permalink: userData.permalink,
            last_edit_user_name: lastEditUserData?.display_name ?? undefined,
            last_edit_user_permalink: lastEditUserData?.permalink ?? undefined
          }
        }

        // Process stores with enhanced data
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
            storeLastEditsMap
          )
        })

        // Process libraries with enhanced data
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
            libraryLastEditsMap
          )
        })

        // Process events with enhanced data
        const eventsWithUser = currentEvents.map((event) => 
          enrichItem(event, eventLastEditsMap)
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

    fetchEnhancedData()
  }, [phase1Complete])

  // Track map height for list view min-height
  useEffect(() => {
    if (!mapCardRef.current) return
    
    let timeoutId: NodeJS.Timeout | null = null
    
    const updateMapHeight = () => {
      if (mapCardRef.current) {
        const height = mapCardRef.current.offsetHeight
        // Only update if height actually changed to prevent unnecessary re-renders
        setMapHeight(prev => {
          // Use a small threshold to avoid micro-updates
          if (Math.abs(prev - height) < 2) return prev
          return height
        })
      }
    }
    
    // Debounced update function to prevent rapid-fire updates
    const debouncedUpdate = () => {
      if (timeoutId) clearTimeout(timeoutId)
      timeoutId = setTimeout(updateMapHeight, 100)
    }
    
    // Initial measurement after a short delay to ensure map is rendered
    const initialTimeout = setTimeout(updateMapHeight, 200)
    
    // Update on window resize (debounced)
    window.addEventListener('resize', debouncedUpdate)
    
    // Use ResizeObserver for more accurate tracking (debounced)
    const resizeObserver = new ResizeObserver(() => {
      debouncedUpdate()
    })
    
    resizeObserver.observe(mapCardRef.current)
    
    return () => {
      clearTimeout(initialTimeout)
      if (timeoutId) clearTimeout(timeoutId)
      window.removeEventListener('resize', debouncedUpdate)
      resizeObserver.disconnect()
    }
  }, [phase1Complete, phase2Complete])

  const fitMapToResults = (query: string) => {
    const hasQuery = !!query
    const hasLocation = selectedCountry !== "all" || selectedState !== "all" || selectedCity !== "all"
    if (!hasQuery && !hasLocation) return

    const matchesSearch = (item: Store | Library | Event) => {
      if (!hasQuery) return true
      const q = query.toLowerCase()
      return (
        item.name.toLowerCase().includes(q) ||
        (!!item.notes && item.notes.toLowerCase().includes(q)) ||
        item.country.toLowerCase().includes(q) ||
        (!!item.state && item.state.toLowerCase().includes(q)) ||
        item.city.toLowerCase().includes(q)
      )
    }
    const matchesLocation = (item: Store | Library | Event) => {
      if (selectedCountry !== "all" && item.country !== selectedCountry) return false
      if (selectedState !== "all" && (item.state || "") !== selectedState) return false
      if (selectedCity !== "all" && item.city !== selectedCity) return false
      return true
    }
    const coords: [number, number][] = []
    for (const item of [...stores, ...libraries, ...events]) {
      if (!item.latitude || !item.longitude) continue
      if (matchesLocation(item) && matchesSearch(item)) {
        coords.push([item.longitude!, item.latitude!])
      }
    }
    if (coords.length > 0 && (window as any).__zinemap_fitBounds) {
      (window as any).__zinemap_fitBounds(coords)
    }
  }

  const handleSearch = () => {
    const q = searchQuery.trim()
    setActiveSearchQuery(q)
    setActiveCountry(selectedCountry)
    setActiveState(selectedState)
    setActiveCity(selectedCity)
    fitMapToResults(q)
  }

  const handleClearSearchAndFilters = () => {
    setSearchQuery("")
    setActiveSearchQuery("")
    setActiveCountry("all")
    setActiveState("all")
    setActiveCity("all")
    clearLocationFilters()
  }

  const today = new Date().toISOString().split('T')[0]

  // Event counts = what's displayed (same filter pipeline as filteredEvents)
  const eventCounts = useMemo(() => {
    if (!events.length) return { all: 0, upcoming: 0, past: 0 }
    const occurrences = expandRecurringEvents(events)
    const matchesLocation = (occ: { event: Event }) => {
      const e = occ.event
      if (activeCountry !== "all" && e.country !== activeCountry) return false
      if (activeState !== "all" && (e.state || "") !== activeState) return false
      if (activeCity !== "all" && e.city !== activeCity) return false
      return true
    }
    const matchesSearch = (occ: { event: Event }, query: string) => {
      if (!query) return true
      const q = query.toLowerCase()
      const e = occ.event
      return e.name.toLowerCase().includes(q) || (!!e.notes && e.notes.toLowerCase().includes(q)) ||
        e.country.toLowerCase().includes(q) || (!!e.state && e.state.toLowerCase().includes(q)) || e.city.toLowerCase().includes(q)
    }
    const base = occurrences.filter(occ => matchesLocation(occ) && (!activeSearchQuery.trim() || matchesSearch(occ, activeSearchQuery.trim())))
    const run = (timeFilter: "all" | "upcoming" | "past") => {
      let f = base
      if (timeFilter === "upcoming") f = f.filter(occ => occ.occurrence_end >= today)
      else if (timeFilter === "past") f = f.filter(occ => occ.occurrence_end < today)
      return occurrencesToNextOnly(f).length
    }
    return { all: run("all"), upcoming: run("upcoming"), past: run("past") }
  }, [events, activeSearchQuery, activeCountry, activeState, activeCity, today])

  // Dedupe events for map (one marker per event/venue)
  const mapEvents = useMemo(
    () => Array.from(new Map(filteredEvents.map(e => [e.id, e])).values()),
    [filteredEvents]
  )

  // Filter stores, libraries, and events based on active search query and active location filters
  useEffect(() => {
    if (!stores || !libraries || !events) return

    const matchesLocation = (item: Store | Library | Event) => {
      if (activeCountry !== "all" && item.country !== activeCountry) return false
      if (activeState !== "all" && (item.state || "") !== activeState) return false
      if (activeCity !== "all" && item.city !== activeCity) return false
      return true
    }

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

    const filterItems = <T extends Store | Library | Event>(items: T[]) => {
      return items.filter(item => {
        if (!matchesLocation(item)) return false
        if (activeSearchQuery.trim()) {
          return matchesSearch(item, activeSearchQuery.trim())
        }
        return true
      })
    }

    const filterEvents = (items: Event[]) => {
      const occurrences = expandRecurringEvents(items)
      let filtered = occurrences.filter(occ => {
        if (!matchesLocation(occ.event)) return false
        if (activeSearchQuery.trim()) return matchesSearch(occ.event, activeSearchQuery.trim())
        return true
      })
      if (eventTimeFilter === "upcoming") {
        filtered = filtered.filter(occ => occ.occurrence_end >= today)
      } else if (eventTimeFilter === "past") {
        filtered = filtered.filter(occ => occ.occurrence_end < today)
      }
      // List & map: show only next occurrence per recurring event (avoid clutter)
      const nextOnly = occurrencesToNextOnly(filtered)
      return nextOnly.map(occ => occurrenceToDisplayEvent(occ))
    }

    setFilteredStores(filterItems(stores))
    setFilteredLibraries(filterItems(libraries))
    setFilteredEvents(filterEvents(events))
  }, [stores, libraries, events, activeSearchQuery, activeCountry, activeState, activeCity, eventTimeFilter])

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
          <p className="text-lg md:text-xl text-stone-600 italic font-gloria">A collaborative map of the global zine scene.</p>
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
                <div className="relative w-full">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-stone-400 h-4 w-4" />
                  <Input
                    placeholder="Search by name or description"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    className="pl-10 bg-stone-50 border-stone-300 focus:border-rose-300 focus:ring-rose-200"
                  />
                </div>

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

                <div className="flex gap-2 pt-1">
                  <Button onClick={handleSearch} className="flex-1 bg-stone-800 hover:bg-stone-900 text-white">
                    Find
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={handleClearSearchAndFilters}
                    className="flex-1 border-stone-300 text-stone-700 hover:bg-stone-50"
                  >
                    Reset
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Search and Filters - Desktop only, appears above grid */}
        <div className="hidden lg:block mb-3 lg:mb-6">
          <div className="bg-white rounded-xl shadow-sm border border-stone-200 p-6">
            <div className="flex items-center gap-3">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-stone-400 h-4 w-4" />
                <Input
                  placeholder="Search by name or description"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  className="pl-10 bg-stone-50 border-stone-300 focus:border-rose-300 focus:ring-rose-200"
                />
              </div>

              <div className="min-w-[140px]">
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

              <div className="min-w-[140px]">
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

              <div className="min-w-[140px]">
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

              <Button onClick={handleSearch} className="bg-stone-800 hover:bg-stone-900 text-white shrink-0">
                Find
              </Button>
              <Button 
                variant="outline"
                onClick={handleClearSearchAndFilters}
                className="border-stone-300 text-stone-700 hover:bg-stone-50 shrink-0"
              >
                Reset
              </Button>
            </div>
          </div>
        </div>

        <div className="flex-1 flex flex-col lg:grid lg:grid-cols-2 lg:grid-rows-1 gap-6 min-h-0 overflow-hidden lg:items-stretch" style={{ maxHeight: '100%' }}>
          {/* Interactive Map - Mobile: order-2, Desktop: right column */}
          <div className="order-2 lg:order-2 lg:sticky lg:top-6 h-fit lg:h-auto lg:flex lg:flex-col">
            <Card ref={mapCardRef} className="bg-white border-stone-200 shadow-sm rounded-lg overflow-hidden">
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
                      events={mapEvents}
                      searchQuery={activeSearchQuery}
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
            <div className="mt-6 lg:mt-8 flex flex-col items-center gap-2 order-3 mb-16">
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
              <HowDoesThisWorkLink />
            </div>
          </div>



          {/* List View with Tabs - Mobile: order-5, Desktop: left column */}
          <div className="order-5 lg:order-1 flex flex-col flex-1 min-h-0 lg:h-full overflow-hidden mb-8">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full flex flex-col h-full min-h-0 gap-0">
              <TabsList className="grid w-full grid-cols-3 flex-shrink-0 mb-0 pb-0">
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
              <TabsContent value="stores" className="flex flex-col flex-grow min-h-0 overflow-hidden max-h-full !mt-0">
                <div 
                  className="flex-1 min-h-0 space-y-4 overflow-y-auto pr-2 pt-[5px] pb-8"
                  style={{
                    maxHeight: mapHeight > 0 
                      ? `max(${mapHeight}px, calc(100vh - 350px))`
                      : 'calc(100vh - 350px)',
                    minHeight: '900px'
                  }}
                >
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
                            onClick={handleClearSearchAndFilters}
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
                        <CardHeader className="p-4 pb-2">
                          <div className="flex justify-between items-start gap-2">
                            <div className="min-w-0 flex-1">
                              <CardTitle className="text-lg font-semibold text-stone-800 mb-1">
                                <Link 
                                  href={`/store/${store.permalink || store.id}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="hover:text-rose-600 transition-colors"
                                  onClick={(e: React.MouseEvent) => e.stopPropagation()}
                                >
                                  {store.name}
                                </Link>
                              </CardTitle>
                              <div className="flex items-center text-stone-600 text-sm mb-2">
                                <MapPin className="h-4 w-4 mr-1" />
                                {store.city}{store.state && `, ${store.state}`}, {store.country}
                              </div>
                            </div>
                            <div className="flex items-center gap-1 shrink-0" onClick={(e: React.MouseEvent) => e.stopPropagation()}>
                              <Link href={`/store/${store.permalink || store.id}`} target="_blank" rel="noopener noreferrer">
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-stone-500 hover:text-rose-600 hover:bg-rose-50">
                                  <ExternalLink className="h-4 w-4" />
                                </Button>
                              </Link>
                              <SaveButton entityType="store" entityId={store.id} variant="ghost" size="icon" showLabel={false} className="h-8 w-8 text-stone-500 hover:text-rose-600 hover:bg-rose-50" />
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

                        <CardContent className="pt-0 px-4 pb-3">
                          <p className="text-stone-600 text-sm mb-4 leading-relaxed line-clamp-5">
                            {store.notes}
                          </p>
                          {(store.user_name || store.last_edit_user_name || store.created_at) && (
                            <div className="text-xs text-stone-500 mb-3">
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
                                  {store.created_at && <RelativeDateWithTooltip dateString={store.created_at} prefix=" · " />}
                                </>
                              )}
                              {store.user_name && store.last_edit_user_name && ' · '}
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
                                  {store.updated_at && store.updated_at !== store.created_at && (
                                    <RelativeDateWithTooltip dateString={store.updated_at} prefix=" · " />
                                  )}
                                </>
                              )}
                              {!store.user_name && store.created_at && (
                                <RelativeDateWithTooltip dateString={store.created_at} />
                              )}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </TabsContent>

              {/* Libraries Tab */}
              <TabsContent value="libraries" className="flex flex-col flex-grow min-h-0 overflow-hidden max-h-full !mt-0">
                <div 
                  className="flex-1 min-h-0 space-y-4 overflow-y-auto pr-2 pt-[5px] pb-8"
                  style={{
                    maxHeight: mapHeight > 0 
                      ? `max(${mapHeight}px, calc(100vh - 350px))`
                      : 'calc(100vh - 350px)',
                    minHeight: '900px'
                  }}
                >
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
                            onClick={handleClearSearchAndFilters}
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
                        <CardHeader className="p-4 pb-2">
                          <div className="flex justify-between items-start gap-2">
                            <div className="min-w-0 flex-1">
                              <CardTitle className="text-lg font-semibold text-stone-800 mb-1">
                                <Link 
                                  href={`/library/${library.permalink || library.id}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="hover:text-blue-600 transition-colors"
                                  onClick={(e: React.MouseEvent) => e.stopPropagation()}
                                >
                                  {library.name}
                                </Link>
                              </CardTitle>
                              <div className="flex items-center text-stone-600 text-sm mb-2">
                                <MapPin className="h-4 w-4 mr-1" />
                                {library.city}{library.state && `, ${library.state}`}, {library.country}
                              </div>
                            </div>
                            <div className="flex items-center gap-1 shrink-0" onClick={(e: React.MouseEvent) => e.stopPropagation()}>
                              <Link href={`/library/${library.permalink || library.id}`} target="_blank" rel="noopener noreferrer">
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-stone-500 hover:text-blue-600 hover:bg-blue-50">
                                  <ExternalLink className="h-4 w-4" />
                                </Button>
                              </Link>
                              <SaveButton entityType="library" entityId={library.id} variant="ghost" size="icon" showLabel={false} className="h-8 w-8 text-stone-500 hover:text-blue-600 hover:bg-blue-50" />
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

                        <CardContent className="pt-0 px-4 pb-3">
                          <p className="text-stone-600 text-sm mb-4 leading-relaxed line-clamp-5">
                            {library.notes}
                          </p>
                          {(library.user_name || library.last_edit_user_name || library.created_at) && (
                            <div className="text-xs text-stone-500 mb-3">
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
                                  {library.created_at && <RelativeDateWithTooltip dateString={library.created_at} prefix=" · " />}
                                </>
                              )}
                              {library.user_name && library.last_edit_user_name && ' · '}
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
                                  {library.updated_at && library.updated_at !== library.created_at && (
                                    <RelativeDateWithTooltip dateString={library.updated_at} prefix=" · " />
                                  )}
                                </>
                              )}
                              {!library.user_name && library.created_at && (
                                <RelativeDateWithTooltip dateString={library.created_at} />
                              )}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </TabsContent>

              {/* Events Tab */}
              <TabsContent value="events" className="flex flex-col flex-grow min-h-0 overflow-hidden max-h-full !mt-0" style={{ marginTop: 0 }}>
                {/* Event Time Filter Sub-tabs */}
                <div className="flex gap-4 justify-end flex-shrink-0 mb-1" style={{ marginTop: 0 }}>
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
                <div 
                  className="flex-1 min-h-0 space-y-4 overflow-y-auto pr-2 pt-[5px] pb-8"
                  style={{
                    maxHeight: mapHeight > 0 
                      ? `max(${mapHeight}px, calc(100vh - 350px))`
                      : 'calc(100vh - 350px)',
                    minHeight: '900px'
                  }}
                >
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
                            onClick={handleClearSearchAndFilters}
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
                        key={`${event.id}-${event.start_date}-${event.end_date}`}
                        className="bg-white border-stone-200 shadow-sm hover:shadow-md transition-shadow duration-200 rounded-lg cursor-pointer overflow-hidden"
                        onClick={() => handleCardClick(event, 'event')}
                      >
                        <CardHeader className="p-4 pb-2 relative">
                          <div className="absolute top-4 right-4 flex items-center gap-1 z-10" onClick={(e: React.MouseEvent) => e.stopPropagation()}>
                            <Link href={`/event/${event.permalink || event.id}`} target="_blank" rel="noopener noreferrer">
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-stone-500 hover:text-[#009035] hover:bg-green-50">
                                <ExternalLink className="h-4 w-4" />
                              </Button>
                            </Link>
                            <SaveButton entityType="event" entityId={event.id} variant="ghost" size="icon" showLabel={false} className="h-8 w-8 text-stone-500 hover:text-[#009035] hover:bg-green-50" />
                          </div>
                          <div className="flex items-start gap-3">
                            {event.poster_image && (
                              <div className="flex-shrink-0 w-14 sm:w-16 aspect-[3/4] overflow-hidden rounded bg-stone-100">
                                <img
                                  src={event.poster_image}
                                  alt={`${event.name} poster`}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            )}
                            <div className="min-w-0 flex-1">
                              <CardTitle className="text-base sm:text-lg font-semibold text-stone-800 mb-1 pr-16">
                                <Link 
                                  href={`/event/${event.permalink || event.id}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="hover:text-[#009035] transition-colors block break-words"
                                  onClick={(e: React.MouseEvent) => e.stopPropagation()}
                                >
                                  {event.name}
                                </Link>
                              </CardTitle>
                              {event.venue_name && (
                                <div className="flex items-center text-stone-600 text-sm mb-1 min-w-0">
                                  <Landmark className="h-4 w-4 mr-1 flex-shrink-0" />
                                  <span className="font-medium truncate">{event.venue_name}</span>
                                </div>
                              )}
                              <div className="flex items-center text-stone-600 text-sm mb-2 min-w-0">
                                <MapPin className="h-4 w-4 mr-1 flex-shrink-0" />
                                <span className="truncate">{event.city}{event.state && `, ${event.state}`}, {event.country}</span>
                              </div>
                            </div>
                          </div>
                          
                          {/* Event Category and Dates */}
                          <div className="flex items-center gap-2 mt-3 flex-wrap">
                            <Badge 
                              variant="outline"
                              className="text-xs bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100"
                            >
                              {getEventCategoryDisplay(event.category)}
                            </Badge>
                            {event.recurrence_frequency && (
                              <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                                Recurring
                              </Badge>
                            )}
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
                              {event.recurrence_frequency ? (
                                <>Next: {formatDateReadable(event.start_date)}{formatTimeRange(event.start_time, event.end_time)}</>
                              ) : (
                                <>
                                  {event.start_date !== event.end_date ? (
                                    <>{formatDateReadable(event.start_date)} – {formatDateReadable(event.end_date)}{formatTimeRange(event.start_time, event.end_time)}</>
                                  ) : (
                                    <>{formatDateReadable(event.start_date)}{formatTimeRange(event.start_time, event.end_time)}</>
                                  )}
                                </>
                              )}
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

                        <CardContent className="pt-0 px-4 pb-3">
                          <p className="text-stone-600 text-sm mb-4 leading-relaxed line-clamp-3">
                            {event.notes}
                          </p>
                          {(event.user_name || event.last_edit_user_name || event.created_at) && (
                            <div className="text-xs text-stone-500 mb-3">
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
                                  {event.created_at && <RelativeDateWithTooltip dateString={event.created_at} prefix=" · " />}
                                </>
                              )}
                              {event.user_name && event.last_edit_user_name && ' · '}
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
                                  {event.updated_at && event.updated_at !== event.created_at && (
                                    <RelativeDateWithTooltip dateString={event.updated_at} prefix=" · " />
                                  )}
                                </>
                              )}
                              {!event.user_name && event.created_at && (
                                <RelativeDateWithTooltip dateString={event.created_at} />
                              )}
                            </div>
                          )}
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