"use client"

import { Search, Calendar, Filter, ExternalLink, User, ChevronDown, ChevronUp, Landmark, Clock, List, CalendarDays } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { StoreMap } from "@/components/store-map"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { useEffect, useState, useRef, useMemo } from "react"
import { supabase } from "@/lib/supabaseClient"
import { Store, Library, Event } from "@/lib/types"
import { formatDateReadable, getEventCategoryDisplay, formatSocialMedia, formatTimeRange, expandRecurringEvents, occurrenceToDisplayEvent, occurrencesToNextOnly, isPastEvent, isRecurringEvent } from "@/lib/utils"
import { RelativeDateWithTooltip } from "@/components/RelativeDateWithTooltip"
import { EventsCalendarView } from "@/components/EventsCalendarView"
import { useLocationFilters } from "@/hooks/useLocationFilters"
import { SaveButton } from "@/components/SaveButton"
import { HowDoesThisWorkLink } from "@/components/HowDoesThisWorkModal"
import { PageLoader } from "@/components/loading/PageLoader"
import { MapLoadingOverlay } from "@/components/loading/MapLoadingOverlay"

export default function EventsPage() {
  const searchParams = useSearchParams()
  const [events, setEvents] = useState<Event[]>([])
  const [filteredEvents, setFilteredEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [timeFilter, setTimeFilter] = useState<"upcoming" | "past" | "all">("all")
  const [applicationsOpen, setApplicationsOpen] = useState(false)
  const [isFiltersOpen, setIsFiltersOpen] = useState(false)
  const [viewMode, setViewMode] = useState<"list" | "calendar">(
    () => (searchParams.get("view") === "calendar" ? "calendar" : "list")
  )
  const [calendarFilteredEvents, setCalendarFilteredEvents] = useState<Event[]>([])
  const [calendarEvents, setCalendarEvents] = useState<Event[]>([])
  const [hashTarget, setHashTarget] = useState<string | null>(null)
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null)
  
  // Map height tracking for list view min-height
  const mapCardRef = useRef<HTMLDivElement>(null)
  const listContainerRef = useRef<HTMLDivElement>(null)
  const [mapHeight, setMapHeight] = useState(0)
  const eventCardRefs = useRef<Map<string, HTMLDivElement>>(new Map())
  const lastHandledHashRef = useRef<string | null>(null)

  // Use location filters hook
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
  } = useLocationFilters({ items: events })

  const categories = ['festival', 'swap', 'workshop']

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery])

  // Read deep-link target from URL hash and keep in sync.
  useEffect(() => {
    const readHashTarget = () => {
      const rawHash = window.location.hash.replace(/^#/, "").trim()
      if (!rawHash) {
        setHashTarget(null)
        return
      }
      try {
        setHashTarget(decodeURIComponent(rawHash))
      } catch {
        setHashTarget(rawHash)
      }
    }

    readHashTarget()
    window.addEventListener("hashchange", readHashTarget)
    return () => window.removeEventListener("hashchange", readHashTarget)
  }, [])

  // Fetch data
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch events
        const { data: eventsData, error: eventsError } = await supabase
          .from('events')
          .select('*')
          .eq('approved', true)
          .order('created_at', { ascending: false })

        if (eventsError) {
          console.error('Error fetching events:', eventsError)
        }

        // Batch fetch all event user profiles
        const eventUserIds = (eventsData || []).map(e => e.submitted_by)
        const { data: allEventUserProfiles } = await supabase
          .from('profiles')
          .select('id, display_name, permalink')
          .in('id', eventUserIds)

        // Fetch locale_edits for "last edited by" (addressed or approved only)
        const { data: allEventEdits } = await supabase
          .from('locale_edits')
          .select('event_id, user_id, created_at, status')
          .not('event_id', 'is', null)
          .order('created_at', { ascending: false })
        const eventLastEditsMap = new Map<string, string>()
        for (const edit of allEventEdits || []) {
          if ((edit.status === 'addressed' || edit.status === 'approved') && !eventLastEditsMap.has(edit.event_id)) {
            eventLastEditsMap.set(edit.event_id, edit.user_id)
          }
        }
        const eventEditorIds = Array.from(new Set(eventLastEditsMap.values()))
        const { data: eventEditorProfiles } = eventEditorIds.length > 0 ? await supabase
          .from('profiles')
          .select('id, display_name, permalink')
          .in('id', eventEditorIds) : { data: [] }
        const eventEditorMap = new Map(
          (eventEditorProfiles || []).map(p => [p.id, { display_name: p.display_name, permalink: p.permalink }])
        )

        // Create event user lookup map
        const eventUserMap = new Map(
          (allEventUserProfiles || []).map(user => [user.id, { display_name: user.display_name, permalink: user.permalink }])
        )

        // Process events with user info
        const eventsWithUser = (eventsData || []).map((event) => {
          const userData = eventUserMap.get(event.submitted_by) || { display_name: 'Unknown user', permalink: null }
          const user_name = userData.display_name
          const user_permalink = userData.permalink
          const lastEditUserId = eventLastEditsMap.get(event.id)
          const lastEditUserData = lastEditUserId ? eventEditorMap.get(lastEditUserId) : null

          return {
            ...event,
            user_name,
            user_permalink,
            last_edit_user_name: lastEditUserData?.display_name ?? undefined,
            last_edit_user_permalink: lastEditUserData?.permalink ?? undefined
          }
        })

        setEvents(eventsWithUser)
      } catch (error) {
        console.error('Error fetching data:', error)
        setEvents([])
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  // Expand recurring events and filter based on all criteria
  useEffect(() => {
    if (!events.length) {
      setFilteredEvents([])
      return
    }

    const occurrences = expandRecurringEvents(events)
    let filteredOccurrences = occurrences

    // Apply search filter
    if (debouncedSearchQuery.trim()) {
      const query = debouncedSearchQuery.toLowerCase().trim()
      filteredOccurrences = filteredOccurrences.filter(occ =>
        occ.event.name.toLowerCase().includes(query) ||
        occ.event.city.toLowerCase().includes(query) ||
        (occ.event.state && occ.event.state.toLowerCase().includes(query)) ||
        occ.event.country.toLowerCase().includes(query) ||
        occ.event.address.toLowerCase().includes(query) ||
        occ.event.category.toLowerCase().includes(query) ||
        (occ.event.venue_name && occ.event.venue_name.toLowerCase().includes(query))
      )
    }

    // Apply location filters
    if (selectedCountry && selectedCountry !== "all") {
      filteredOccurrences = filteredOccurrences.filter(occ => occ.event.country === selectedCountry)
    }
    if (selectedState && selectedState !== "all") {
      filteredOccurrences = filteredOccurrences.filter(occ => occ.event.state === selectedState)
    }
    if (selectedCity && selectedCity !== "all") {
      filteredOccurrences = filteredOccurrences.filter(occ => occ.event.city === selectedCity)
    }

    // Apply category filter
    if (selectedCategory && selectedCategory !== "all") {
      filteredOccurrences = filteredOccurrences.filter(occ => occ.event.category === selectedCategory)
    }

    // Apply time filter (use occurrence dates for recurring events)
    const today = new Date().toISOString().split('T')[0]
    if (timeFilter === "upcoming") {
      filteredOccurrences = filteredOccurrences.filter(occ => occ.occurrence_end >= today)
    } else if (timeFilter === "past") {
      filteredOccurrences = filteredOccurrences.filter(occ => occ.occurrence_end < today)
    }

    // Apply applications open filter (uses event-level deadline, not occurrence)
    if (applicationsOpen) {
      const now = new Date()
      now.setHours(0, 0, 0, 0)
      filteredOccurrences = filteredOccurrences.filter(occ => {
        const event = occ.event
        if (!event.application_deadline) return false
        const applicationDeadline = new Date(event.application_deadline)
        applicationDeadline.setHours(0, 0, 0, 0)
        if (now > applicationDeadline) return false
        if (event.application_open) {
          const applicationOpenDate = new Date(event.application_open)
          applicationOpenDate.setHours(0, 0, 0, 0)
          return now >= applicationOpenDate && now <= applicationDeadline
        }
        return now <= applicationDeadline
      })
    }

    // List view: show only NEXT occurrence per recurring event (avoid clutter)
    const listOccurrences = occurrencesToNextOnly(filteredOccurrences)
    const listDisplayEvents = listOccurrences.map(occ => occurrenceToDisplayEvent(occ))
    setFilteredEvents(listDisplayEvents)

    // Calendar view: all occurrences (calendar filters by month internally)
    const allDisplayEvents = filteredOccurrences.map(occ => occurrenceToDisplayEvent(occ))
    setCalendarEvents(allDisplayEvents)
  }, [events, debouncedSearchQuery, selectedCountry, selectedState, selectedCity, selectedCategory, timeFilter, applicationsOpen])

  const handleLocationSelect = (location: Store | Library | Event, type: 'store' | 'library' | 'event') => {
    // This function is called when a map marker is clicked
    // The map will handle showing the popup automatically
  }

  const handleCardClick = (event: Event) => {
    setSelectedEventId(event.id)
    // When a card is clicked, select it on the map
    if ((window as any).selectMapLocation) {
      (window as any).selectMapLocation(event, 'event')
    }
  }

  // Map: one marker per event (list view already picks next or last occurrence per series)
  const mapEvents = useMemo(() => {
    const source = viewMode === "calendar" ? calendarFilteredEvents : filteredEvents
    return Array.from(new Map(source.map((e) => [e.id, e])).values())
  }, [viewMode, calendarFilteredEvents, filteredEvents])

  const clearFilters = () => {
    setSearchQuery("")
    clearLocationFilters()
    setSelectedCategory("all")
    setTimeFilter("all")
  }

  // Track map height for list view min-height
  useEffect(() => {
    if (!mapCardRef.current) return
    
    let timeoutId: NodeJS.Timeout | null = null
    
    const updateMapHeight = () => {
      if (mapCardRef.current) {
        const height = mapCardRef.current.offsetHeight
        setMapHeight(prev => {
          if (Math.abs(prev - height) < 2) return prev
          return height
        })
      }
    }
    
    const debouncedUpdate = () => {
      if (timeoutId) clearTimeout(timeoutId)
      timeoutId = setTimeout(updateMapHeight, 100)
    }
    
    const initialTimeout = setTimeout(updateMapHeight, 200)
    
    window.addEventListener('resize', debouncedUpdate)
    
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
  }, [loading])

  // Hash deep-link selection: filter-independent (no filter resets).
  useEffect(() => {
    if (!hashTarget || !filteredEvents.length) return
    if (lastHandledHashRef.current === hashTarget) return

    const normalizedTarget = hashTarget.toLowerCase()
    const matchedEvent = filteredEvents.find((event) => {
      const permalink = (event.permalink || "").toLowerCase()
      const id = (event.id || "").toLowerCase()
      return permalink === normalizedTarget || id === normalizedTarget
    })

    // If currently filtered out, do nothing.
    if (!matchedEvent) return

    let attempts = 0
    const maxAttempts = 20
    const timerId = window.setInterval(() => {
      attempts += 1
      const selector = (window as any).selectMapLocation
      if (typeof selector === "function") {
        selector(matchedEvent, "event")
        setSelectedEventId(matchedEvent.id)

        const cardEl = eventCardRefs.current.get(matchedEvent.id)
        const listEl = listContainerRef.current
        if (viewMode === "list" && cardEl && listEl) {
          const cardTopInContainer = cardEl.offsetTop - listEl.offsetTop
          listEl.scrollTo({ top: Math.max(0, cardTopInContainer), behavior: "smooth" })
        } else if (viewMode === "list" && listEl) {
          listEl.scrollTo({ top: 0, behavior: "smooth" })
        }

        lastHandledHashRef.current = hashTarget
        window.clearInterval(timerId)
      } else if (attempts >= maxAttempts) {
        window.clearInterval(timerId)
      }
    }, 100)

    return () => window.clearInterval(timerId)
  }, [hashTarget, filteredEvents, viewMode])

  if (loading) {
    return <PageLoader />
  }

  return (
    <div className="flex flex-col flex-1 bg-stone-50 font-serif min-h-0">
      {/* Header */}
      <header className="w-full bg-white border-b border-stone-200 shadow-sm flex-shrink-0">
        <div className="max-w-7xl mx-auto px-4 py-8 text-center">
          <h3 className="font-gloria text-4xl md:text-5xl font-bold text-stone-800 mb-2 tracking-tight">Events</h3>
          <div className="flex justify-center items-center mb-3">
            <div className="w-12 h-0.5 bg-gradient-to-r from-transparent via-green-400 to-transparent"></div>
            <div className="mx-3 text-[#009035]">
              <Calendar className="h-6 w-6" />
            </div>
            <div className="w-12 h-0.5 bg-gradient-to-r from-transparent via-green-400 to-transparent"></div>
          </div>
          <p className="text-lg md:text-xl text-stone-600 italic font-gloria">Find zine and small-press festivals, meetups, workshops, and more</p>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex flex-col max-w-7xl mx-auto px-4 pt-6 w-full min-h-0">
        {/* Mobile Filter Toggle */}
        <div className="lg:hidden mb-4">
          <Button
            onClick={() => setIsFiltersOpen(!isFiltersOpen)}
            variant="outline"
            className="w-full justify-between"
          >
            <span className="flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Filters
            </span>
            {isFiltersOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>

        <div className="flex-1 flex flex-col lg:flex-row gap-6 min-h-0">
          {/* Filters Column - Hidden on mobile unless open */}
          <div className={`w-full lg:w-64 flex-shrink-0 ${isFiltersOpen ? 'block' : 'hidden lg:block'}`}>
            <Card className="bg-white border-stone-200 shadow-sm rounded-lg sticky top-6 h-fit">
              <CardContent className="space-y-6 pt-6">
                {/* Search */}
                <div className="space-y-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-stone-400 h-4 w-4" />
                    <Input
                      placeholder="Search events..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 bg-stone-50 border-stone-300 focus:border-green-300 focus:ring-green-200"
                    />
                  </div>
                </div>

                {/* Applications Open Filter */}
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="applications-open" 
                      checked={applicationsOpen}
                      onCheckedChange={(checked) => setApplicationsOpen(checked as boolean)}
                    />
                    <label 
                      htmlFor="applications-open" 
                      className="text-sm text-stone-600 cursor-pointer"
                    >
                      Applications Open
                    </label>
                  </div>
                </div>

                {/* Time Filter */}
                <div className="space-y-2">
                  <Select value={timeFilter} onValueChange={(value) => setTimeFilter(value as "upcoming" | "past" | "all")}>
                    <SelectTrigger className="bg-stone-50 border-stone-300">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="upcoming">Upcoming Events</SelectItem>
                      <SelectItem value="past">Past Events</SelectItem>
                      <SelectItem value="all">All Events</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Category Filter */}
                <div className="space-y-2">
                  <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger className="bg-stone-50 border-stone-300">
                      <SelectValue placeholder="All categories" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      {categories.map(category => (
                        <SelectItem key={category} value={category}>
                          {getEventCategoryDisplay(category)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Location Filters */}
                <div className="space-y-4">
                  
                  <div className="space-y-2">
                    <Select value={selectedCountry} onValueChange={setSelectedCountry}>
                      <SelectTrigger className="bg-stone-50 border-stone-300">
                        <SelectValue placeholder="All countries" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All countries</SelectItem>
                        {countries.map(country => (
                          <SelectItem key={country} value={country}>{country}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Select value={selectedState} onValueChange={setSelectedState} disabled={selectedCountry === "all"}>
                      <SelectTrigger className="bg-stone-50 border-stone-300">
                        <SelectValue placeholder="All states/regions" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All states/regions</SelectItem>
                        {states.map(state => (
                          <SelectItem key={state} value={state}>{state}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Select value={selectedCity} onValueChange={setSelectedCity} disabled={selectedCountry === "all"}>
                      <SelectTrigger className="bg-stone-50 border-stone-300">
                        <SelectValue placeholder="All cities" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All cities</SelectItem>
                        {cities.map(city => (
                          <SelectItem key={city} value={city}>{city}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Clear Filters */}
                <Button
                  onClick={clearFilters}
                  variant="outline"
                  className="w-full border-stone-300 text-stone-700 hover:bg-stone-50"
                >
                  Clear All Filters
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Map and List - Mobile: Map first, then List. Calendar view: list column wider */}
          <div
            className={`flex-1 flex flex-col lg:grid lg:grid-rows-1 gap-6 min-h-0 overflow-hidden lg:items-stretch ${viewMode === "calendar" ? "lg:grid-cols-[1.2fr_1fr]" : "lg:grid-cols-2"}`}
            style={{ maxHeight: '100%' }}
          >
            {/* Map View - Mobile: First */}
            <div className="order-1 lg:order-2 lg:sticky lg:top-6 h-fit lg:h-auto lg:flex lg:flex-col">
              <Card ref={mapCardRef} className="bg-white border-stone-200 shadow-sm rounded-lg overflow-hidden">
                <CardContent className="p-0">
                  {loading ? (
                    <MapLoadingOverlay
                      absolute={false}
                      title="Loading map..."
                      subtitle="Locating events on the map."
                    />
                  ) : (
                    <div className="w-full h-96 lg:h-full">
                      <StoreMap 
                        stores={[]}
                        libraries={[]}
                        events={mapEvents}
                        searchQuery={debouncedSearchQuery}
                        hideFilterBar={true}
                        onLocationSelect={handleLocationSelect}
                      />
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Add Event button under the map */}
              <div className="mt-6 flex flex-col items-center gap-2">
                <Link href="/add-event">
                  <Button className="bg-[#009035] hover:bg-[#007a2a] text-white font-gloria px-8 py-4 text-lg rounded-lg shadow-md transition-colors">
                    Add an event
                  </Button>
                </Link>
                <HowDoesThisWorkLink />
              </div>
            </div>

            {/* List / Calendar View - Mobile: Second */}
            <div className="flex flex-col space-y-4 order-2 lg:order-1 flex-1 min-h-0 lg:h-full overflow-hidden mb-8">
              <div className="flex items-center justify-between flex-shrink-0 gap-2">
                <h2 className="text-xl font-semibold text-stone-800">
                  Events ({filteredEvents.length})
                </h2>
                <div className="flex rounded-lg border border-stone-200 p-0.5 bg-stone-50">
                  <button
                    onClick={() => setViewMode("list")}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                      viewMode === "list"
                        ? "bg-white text-stone-800 shadow-sm"
                        : "text-stone-600 hover:text-stone-800"
                    }`}
                  >
                    <List className="h-4 w-4" />
                    List
                  </button>
                  <button
                    onClick={() => setViewMode("calendar")}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                      viewMode === "calendar"
                        ? "bg-white text-stone-800 shadow-sm"
                        : "text-stone-600 hover:text-stone-800"
                    }`}
                  >
                    <CalendarDays className="h-4 w-4" />
                    Calendar
                    <span className="text-xs bg-[#009035] text-white px-1.5 py-0.5 rounded font-bold font-sans">
                      NEW
                    </span>
                  </button>
                </div>
              </div>
              
              {viewMode === "list" ? (
              <div 
                ref={listContainerRef}
                className="flex-1 min-h-0 space-y-4 overflow-y-auto pr-2 pt-[5px] pb-8 lg:min-h-[900px]"
                style={{
                  maxHeight: mapHeight > 0 
                    ? `max(${mapHeight}px, calc(100vh - 350px))`
                    : 'calc(100vh - 350px)'
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
                            Add first event
                          </Button>
                        </Link>
                      ) : (
                        <Button 
                          onClick={clearFilters}
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
                      ref={(el) => {
                        if (el) {
                          eventCardRefs.current.set(event.id, el)
                        } else {
                          eventCardRefs.current.delete(event.id)
                        }
                      }}
                      className={`bg-white border-stone-200 shadow-sm hover:shadow-md transition-shadow duration-200 rounded-lg cursor-pointer overflow-hidden ${selectedEventId === event.id ? "ring-2 ring-inset ring-green-500 border-green-400" : ""}`}
                      onClick={() => handleCardClick(event)}
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
                              <Calendar className="h-4 w-4 mr-1 flex-shrink-0" />
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
                          {isRecurringEvent(event) && (
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
                            {isRecurringEvent(event) ? (
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
                          {event.notes ? formatSocialMedia(event.notes, '#009035', '#007a2a') : event.notes}
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
              ) : (
              <div 
                className="flex-1 min-h-0 overflow-y-auto pr-2 pt-[5px] pb-8"
                style={{
                  maxHeight: mapHeight > 0 
                    ? `max(${mapHeight}px, calc(100vh - 350px))`
                    : 'calc(100vh - 350px)',
                  minHeight: '400px'
                }}
              >
                <EventsCalendarView
                  events={calendarEvents}
                  onEventClick={handleCardClick}
                  onCalendarFilterChange={setCalendarFilteredEvents}
                  hasLocationFilter={selectedCountry !== "all" || selectedState !== "all" || selectedCity !== "all"}
                />
              </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
