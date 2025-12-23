"use client"

import { Search, Calendar, Filter, ExternalLink, User, ChevronDown, ChevronUp, Landmark, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { StoreMap } from "@/components/store-map"
import Link from "next/link"
import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import { Store, Library, Event } from "@/lib/types"
import { formatDateReadable, getEventCategoryDisplay, formatSocialMedia } from "@/lib/utils"
import { useLocationFilters } from "@/hooks/useLocationFilters"

export default function EventsPage() {
  const [events, setEvents] = useState<Event[]>([])
  const [filteredEvents, setFilteredEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [timeFilter, setTimeFilter] = useState<"upcoming" | "past" | "all">("all")
  const [applicationsOpen, setApplicationsOpen] = useState(false)
  const [isFiltersOpen, setIsFiltersOpen] = useState(false)

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

  // Filter events based on all criteria
  useEffect(() => {
    if (!events) return

    let filtered = events

    // Apply search filter
    if (debouncedSearchQuery.trim()) {
      const query = debouncedSearchQuery.toLowerCase().trim()
      filtered = filtered.filter(event => 
        event.name.toLowerCase().includes(query) ||
        event.city.toLowerCase().includes(query) ||
        (event.state && event.state.toLowerCase().includes(query)) ||
        event.country.toLowerCase().includes(query) ||
        event.address.toLowerCase().includes(query) ||
        event.category.toLowerCase().includes(query) ||
        (event.venue_name && event.venue_name.toLowerCase().includes(query))
      )
    }

    // Apply country filter
    if (selectedCountry && selectedCountry !== "all") {
      filtered = filtered.filter(event => event.country === selectedCountry)
    }

    // Apply state filter
    if (selectedState && selectedState !== "all") {
      filtered = filtered.filter(event => event.state === selectedState)
    }

    // Apply city filter
    if (selectedCity && selectedCity !== "all") {
      filtered = filtered.filter(event => event.city === selectedCity)
    }

    // Apply category filter
    if (selectedCategory && selectedCategory !== "all") {
      filtered = filtered.filter(event => event.category === selectedCategory)
    }

    // Apply time filter
    const today = new Date().toISOString().split('T')[0]
    if (timeFilter === "upcoming") {
      filtered = filtered.filter(event => event.end_date >= today)
    } else if (timeFilter === "past") {
      filtered = filtered.filter(event => event.end_date < today)
    }
    // "all" shows everything

    // Apply applications open filter
    if (applicationsOpen) {
      const now = new Date()
      now.setHours(0, 0, 0, 0) // Set to start of day for accurate date comparison
      
      filtered = filtered.filter(event => {
        // If no application_deadline, applications can't be open
        if (!event.application_deadline) return false
        
        const applicationDeadline = new Date(event.application_deadline)
        applicationDeadline.setHours(0, 0, 0, 0)
        
        // If deadline has passed, applications are closed
        if (now > applicationDeadline) return false
        
        // If application_open exists, check if we're past the open date
        if (event.application_open) {
          const applicationOpenDate = new Date(event.application_open)
          applicationOpenDate.setHours(0, 0, 0, 0)
          
          // Applications are open if we're between open date and deadline
          return now >= applicationOpenDate && now <= applicationDeadline
        }
        
        // If no application_open date but deadline is in the future, applications are open
        return now <= applicationDeadline
      })
    }

    setFilteredEvents(filtered)
  }, [events, debouncedSearchQuery, selectedCountry, selectedState, selectedCity, selectedCategory, timeFilter, applicationsOpen])

  const handleLocationSelect = (location: Store | Library | Event, type: 'store' | 'library' | 'event') => {
    // This function is called when a map marker is clicked
    // The map will handle showing the popup automatically
  }

  const handleCardClick = (event: Event) => {
    // When a card is clicked, select it on the map
    if ((window as any).selectMapLocation) {
      (window as any).selectMapLocation(event, 'event')
    }
  }

  const clearFilters = () => {
    setSearchQuery("")
    clearLocationFilters()
    setSelectedCategory("all")
    setTimeFilter("all")
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50 font-serif flex items-center justify-center">
        <div className="text-stone-500 text-lg">Loading...</div>
      </div>
    )
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

          {/* Map and List - Mobile: Map first, then List */}
          <div className="flex-1 flex flex-col lg:grid lg:grid-cols-2 lg:grid-rows-1 gap-6 min-h-0 overflow-hidden lg:items-stretch" style={{ maxHeight: '100%' }}>
            {/* Map View - Mobile: First */}
            <div className="order-1 lg:order-2 lg:sticky lg:top-6 h-fit lg:h-auto lg:flex lg:flex-col">
              <Card className="bg-white border-stone-200 shadow-sm rounded-lg overflow-hidden">
                <CardContent className="p-0">
                  {loading ? (
                    <div className="w-full h-96 lg:h-full bg-stone-100 animate-pulse flex items-center justify-center">
                      <div className="text-stone-500">Loading map...</div>
                    </div>
                  ) : (
                    <div className="w-full h-96 lg:h-full">
                      <StoreMap 
                        stores={[]}
                        libraries={[]}
                        events={events}
                        searchQuery={debouncedSearchQuery}
                        hideFilterBar={true}
                        onLocationSelect={handleLocationSelect}
                      />
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Add Event button under the map */}
              <div className="mt-6 flex justify-center">
                <Link href="/add-event">
                  <Button className="bg-[#009035] hover:bg-[#007a2a] text-white font-gloria px-8 py-4 text-lg rounded-lg shadow-md transition-colors">
                    Add an event
                  </Button>
                </Link>
              </div>
            </div>

            {/* List View - Mobile: Second */}
            <div className="flex flex-col space-y-4 order-2 lg:order-1 flex-1 min-h-0 lg:h-full overflow-hidden">
              <div className="flex items-center justify-between flex-shrink-0">
                <h2 className="text-xl font-semibold text-stone-800">
                  Events ({filteredEvents.length})
                </h2>
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
                      key={event.id}
                      className="bg-white border-stone-200 shadow-sm hover:shadow-md transition-shadow duration-200 rounded-lg cursor-pointer"
                      onClick={() => handleCardClick(event)}
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
                              <Calendar className="h-4 w-4 mr-1" />
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
                        <p className="text-stone-600 text-sm mb-4 leading-relaxed line-clamp-3">
                          {event.notes ? formatSocialMedia(event.notes, '#009035', '#007a2a') : event.notes}
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
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
