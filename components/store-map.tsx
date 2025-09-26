"use client"

import { useEffect, useRef, useState } from "react"
import { MapPin, ExternalLink, BookOpen, Calendar, Clock, Landmark, Plus, Minus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { formatDateReadable, getEventCategoryDisplay } from "@/lib/utils"
import Link from "next/link"
import { Store, Library, Event } from "@/lib/types"

interface StoreMapProps {
  stores: Store[]
  libraries: Library[]
  events: Event[]
  searchQuery?: string
}

export function StoreMap({ stores, libraries, events, searchQuery = "" }: StoreMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<any>(null)
  const markersRef = useRef<any[]>([])
  const [selectedLocation, setSelectedLocation] = useState<Store | Library | Event | null>(null)
  const [locationType, setLocationType] = useState<'store' | 'library' | 'event'>('store')
  const [mapView, setMapView] = useState<'stores' | 'libraries' | 'events' | 'all'>('all')
  const [mapReady, setMapReady] = useState(false)

  // Zoom functions
  const zoomIn = () => {
    if (map.current) {
      const currentZoom = map.current.getZoom()
      map.current.zoomTo(currentZoom + 1, { duration: 300 })
    }
  }

  const zoomOut = () => {
    if (map.current) {
      const currentZoom = map.current.getZoom()
      map.current.zoomTo(currentZoom - 1, { duration: 300 })
    }
  }

  // Initialize map (only once)
  useEffect(() => {
    const initMap = async () => {
      if (typeof window === "undefined" || map.current) return
      
      try {
        const mapboxgl = await import("mapbox-gl")
        
        if (!mapContainer.current) return

        map.current = new mapboxgl.Map({
          container: mapContainer.current,
          accessToken: process.env.NEXT_PUBLIC_MAPBOX_TOKEN || "pk.eyJ1IjoiZXhhbXBsZSIsImEiOiJjbGV4YW1wbGUifQ.example",
          style: "mapbox://styles/mapbox/light-v11",
          center: [-95.7129, 37.0902], // Center of US
          zoom: 3.5,
        })

        // Add event listener for when map is ready
        map.current.on('load', () => {
          setMapReady(true)
        })



      } catch (error) {
        console.error("Map error:", error)
      }
    }

    initMap()

    return () => {
      if (map.current) {
        map.current.remove()
        map.current = null
      }
    }
  }, [])

  // Update markers when stores, libraries, mapView, or searchQuery change
  useEffect(() => {
    if (!map.current || !mapReady) return
    
    // Don't add markers if data isn't loaded yet
    if (!stores || !libraries || !events) return





    // Clear existing markers
    markersRef.current.forEach(marker => marker.remove())
    markersRef.current = []

    // Filter stores based on search query
    const filteredStores = searchQuery.trim() 
      ? stores.filter(store => 
          store.name.toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
          store.city.toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
          store.country.toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
          store.address.toLowerCase().includes(searchQuery.toLowerCase().trim())
        )
      : stores

    // Filter libraries based on search query
    const filteredLibraries = searchQuery.trim()
      ? libraries.filter(library => 
          library.name.toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
          library.city.toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
          (library.state && library.state.toLowerCase().includes(searchQuery.toLowerCase().trim())) ||
          library.country.toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
          library.address.toLowerCase().includes(searchQuery.toLowerCase().trim())
        )
      : libraries

    // Filter events based on search query
    const filteredEvents = searchQuery.trim()
      ? events.filter(event => 
          event.name.toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
          event.city.toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
          (event.state && event.state.toLowerCase().includes(searchQuery.toLowerCase().trim())) ||
          event.country.toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
          event.address.toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
          event.category.toLowerCase().includes(searchQuery.toLowerCase().trim())
        )
      : events

    // Add store markers (rose) if stores should be shown
    if (mapView === 'stores' || mapView === 'all') {
      filteredStores.forEach((store) => {
        if (!store.latitude || !store.longitude) return

        const mapboxgl = require("mapbox-gl")
        
        const markerEl = document.createElement("div")
        markerEl.innerHTML = `
          <div style="background: #e11d48; color: white; padding: 8px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.2); cursor: pointer; display: flex; align-items: center; justify-center;">
            <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
            </svg>
          </div>
        `

        markerEl.addEventListener("click", () => {
          setSelectedLocation(store)
          setLocationType('store')
        })

        const marker = new mapboxgl.Marker(markerEl)
          .setLngLat([store.longitude, store.latitude])
          .addTo(map.current)

        markersRef.current.push(marker)
      })
    }

    // Add library markers (blue) if libraries should be shown
    if (mapView === 'libraries' || mapView === 'all') {
      filteredLibraries.forEach((library) => {
        if (!library.latitude || !library.longitude) return

        const mapboxgl = require("mapbox-gl")
        
        const markerEl = document.createElement("div")
        markerEl.innerHTML = `
          <div style="background: #3b82f6; color: white; padding: 8px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.2); cursor: pointer; display: flex; align-items: center; justify-center;">
            <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
            </svg>
          </div>
        `

        markerEl.addEventListener("click", () => {
          setSelectedLocation(library)
          setLocationType('library')
        })

        const marker = new mapboxgl.Marker(markerEl)
          .setLngLat([library.longitude, library.latitude])
          .addTo(map.current)

        markersRef.current.push(marker)
      })
    }

    // Add event markers (green) if events should be shown
    if (mapView === 'events' || mapView === 'all') {
      filteredEvents.forEach((event) => {
        if (!event.latitude || !event.longitude) return

        const mapboxgl = require("mapbox-gl")
        
        const markerEl = document.createElement("div")
        markerEl.innerHTML = `
          <div style="background: #009035; color: white; padding: 8px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.2); cursor: pointer; display: flex; align-items: center; justify-center;">
            <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
            </svg>
          </div>
        `

        markerEl.addEventListener("click", () => {
          setSelectedLocation(event)
          setLocationType('event')
        })

        const marker = new mapboxgl.Marker(markerEl)
          .setLngLat([event.longitude, event.latitude])
          .addTo(map.current)

        markersRef.current.push(marker)
      })
    }
  }, [stores, libraries, events, mapView, searchQuery, mapReady])

  return (
    <div className="h-[600px] relative rounded-lg overflow-hidden border border-gray-200">
      <div ref={mapContainer} className="w-full h-full" />

      {/* Zoom Controls */}
      <div className="absolute top-4 right-4 bg-white rounded-lg shadow-lg border border-stone-200 z-10">
        <div className="flex flex-col">
          <button
            onClick={zoomIn}
            className="p-2 hover:bg-stone-50 transition-colors border-b border-stone-200 rounded-t-lg"
            title="Zoom in"
          >
            <Plus className="h-4 w-4 text-stone-700" />
          </button>
          <button
            onClick={zoomOut}
            className="p-2 hover:bg-stone-50 transition-colors rounded-b-lg"
            title="Zoom out"
          >
            <Minus className="h-4 w-4 text-stone-700" />
          </button>
        </div>
      </div>

      {/* Map Controls */}
      <div className="absolute top-4 left-4 bg-white rounded-lg shadow-lg border border-stone-200 p-2 z-10">
        <div className="flex gap-1">
          <button
            onClick={() => setMapView('stores')}
            className={`px-2 py-1.5 text-xs font-medium rounded-md transition-colors ${
              mapView === 'stores' 
                ? 'bg-[#e11d48] text-white' 
                : 'bg-stone-100 text-stone-700 hover:bg-rose-50 hover:bg-rose-100'
            }`}
          >
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 bg-[#e11d48] rounded-full"></div>
              Stores
            </div>
          </button>
          <button
            onClick={() => setMapView('libraries')}
            className={`px-2 py-1.5 text-xs font-medium rounded-md transition-colors ${
              mapView === 'libraries' 
                ? 'bg-blue-500 text-white' 
                : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
            }`}
          >
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 bg-blue-500 rounded-full"></div>
              Libraries
            </div>
          </button>
          <button
            onClick={() => setMapView('events')}
            className={`px-2 py-1.5 text-xs font-medium rounded-md transition-colors ${
              mapView === 'events' 
                ? 'bg-[#009035] text-white' 
                : 'bg-stone-100 text-stone-700 hover:bg-green-50 hover:bg-green-100'
            }`}
          >
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 bg-[#009035] rounded-full"></div>
              Events
            </div>
          </button>
          <button
            onClick={() => setMapView('all')}
            className={`px-2 py-1.5 text-xs font-medium rounded-md transition-colors ${
              mapView === 'all' 
                ? 'bg-[#DBDBDC] text-stone-800' 
                : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
            }`}
          >
            All
          </button>
        </div>
      </div>

      {/* Location Popup */}
      {selectedLocation && (
        <div className="absolute top-4 right-4 bg-white rounded-lg shadow-lg border border-stone-200 p-4 w-80 z-10">
          <button
            onClick={() => setSelectedLocation(null)}
            className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 text-xl"
          >
            ×
          </button>

          <div className="flex items-start gap-3 mb-3">
            <div className="flex-shrink-0 mt-0.5">
              {locationType === 'store' ? (
                <MapPin className="h-5 w-5 text-[#e11d48]" />
              ) : locationType === 'library' ? (
                <BookOpen className="h-5 w-5 text-blue-500" />
              ) : (
                <MapPin className="h-5 w-5 text-[#009035]" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-gray-800 text-base leading-tight">
                {locationType === 'store' ? (
                  <Link 
                    href={`/store/${('permalink' in selectedLocation && selectedLocation.permalink) ? selectedLocation.permalink : selectedLocation.id}`}
                    className="hover:text-[#e11d48] transition-colors"
                  >
                    {selectedLocation.name}
                  </Link>
                ) : locationType === 'library' ? (
                  <Link 
                    href={`/library/${('permalink' in selectedLocation && selectedLocation.permalink) ? selectedLocation.permalink : selectedLocation.id}`}
                    className="hover:text-blue-600 transition-colors"
                  >
                    {selectedLocation.name}
                  </Link>
                ) : (
                  <Link 
                    href={`/event/${('permalink' in selectedLocation && selectedLocation.permalink) ? selectedLocation.permalink : selectedLocation.id}`}
                    className="hover:text-[#009035] transition-colors"
                  >
                    {selectedLocation.name}
                  </Link>
                )}
              </h3>
            </div>
          </div>

            {locationType === 'event' && 'venue_name' in selectedLocation && selectedLocation.venue_name && (
              <div className="text-sm text-gray-600 mb-2">
                <Landmark className="h-4 w-4 inline mr-1" />{selectedLocation.venue_name}
              </div>
            )}
            <p className="text-sm text-gray-600 mb-3">
              <MapPin className="h-4 w-4 inline mr-1" />{selectedLocation.city}{'state' in selectedLocation && selectedLocation.state ? `, ${selectedLocation.state}` : ''}, {selectedLocation.country}
            </p>
          {/* Event-specific info */}
          {locationType === 'event' && 'category' in selectedLocation && selectedLocation.category && (
            <div className="mb-4">
              <Badge 
                variant="outline"
                className="text-xs bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100 mb-2"
              >
                {getEventCategoryDisplay(selectedLocation.category)}
              </Badge>
              {'start_date' in selectedLocation && selectedLocation.start_date && (
                <p className="text-xs text-gray-500">
                  <Calendar className="h-3 w-3 inline mr-1" />{formatDateReadable(selectedLocation.start_date)}
                  {'end_date' in selectedLocation && selectedLocation.end_date && selectedLocation.start_date !== selectedLocation.end_date && 
                    ` - ${formatDateReadable(selectedLocation.end_date)}`
                  }
                </p>
              )}
              {'category' in selectedLocation && selectedLocation.category === "festival" && 'application_deadline' in selectedLocation && selectedLocation.application_deadline && (() => {
                const today = new Date();
                const deadlineDate = new Date(selectedLocation.application_deadline);
                today.setHours(0, 0, 0, 0);
                deadlineDate.setHours(0, 0, 0, 0);
                return deadlineDate >= today;
              })() && (
                <p className="text-xs text-gray-500 mt-1">
                  <Clock className="h-3 w-3 inline mr-1" />
                  Apply by {formatDateReadable(selectedLocation.application_deadline)}
                </p>
              )}
            </div>
          )}

          {/* Tags - Show for all types to maintain consistent spacing */}
          {locationType === 'store' && 'store_tags' in selectedLocation && selectedLocation.store_tags && selectedLocation.store_tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-4">
              {selectedLocation.store_tags.map((storeTag) => (
                <Badge
                  key={storeTag.id}
                  variant="outline"
                  className="text-xs bg-stone-50 text-stone-700 border-stone-200"
                >
                  {storeTag.tag.label}
                </Badge>
              ))}
            </div>
          )}

          {locationType === 'library' && 'library_tags' in selectedLocation && selectedLocation.library_tags && selectedLocation.library_tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-4">
              {selectedLocation.library_tags.map((libraryTag) => (
                <Badge
                  key={libraryTag.id}
                  variant="outline"
                  className="text-xs bg-stone-50 text-stone-700 border-stone-200"
                >
                  {libraryTag.tag.label}
                </Badge>
              ))}
            </div>
          )}

          {/* Empty space for events to maintain consistent height */}
          {locationType === 'event' && (
            <div className="mb-4">
              {/* This empty div ensures events have the same spacing as stores/libraries with tags */}
            </div>
          )}

          {/* User info */}
          {selectedLocation.user_name && (
            <p className="text-xs text-gray-500 mb-3">
              Added by{' '}
              {selectedLocation.user_permalink ? (
                <Link 
                  href={`/profile/${selectedLocation.user_permalink}`}
                  className="text-stone-800 hover:underline transition-colors"
                >
                  {selectedLocation.user_name}
                </Link>
              ) : (
                selectedLocation.user_name
              )}
            </p>
          )}

          {/* View Details Button */}
          {locationType === 'store' ? (
            <Link href={`/store/${('permalink' in selectedLocation && selectedLocation.permalink) ? selectedLocation.permalink : selectedLocation.id}`}>
              <Button size="sm" variant="outline" className="w-full border-[#e11d48] text-[#e11d48] hover:bg-rose-50">
                View Details
              </Button>
            </Link>
          ) : locationType === 'library' ? (
            <Link href={`/library/${('permalink' in selectedLocation && selectedLocation.permalink) ? selectedLocation.permalink : selectedLocation.id}`}>
              <Button size="sm" variant="outline" className="w-full border-blue-300 text-blue-700 hover:bg-blue-50">
                View Details
              </Button>
            </Link>
          ) : (
            <Link href={`/event/${('permalink' in selectedLocation && selectedLocation.permalink) ? selectedLocation.permalink : selectedLocation.id}`}>
              <Button size="sm" variant="outline" className="w-full border-[#009035] text-[#009035] hover:bg-green-50">
                View Details
              </Button>
            </Link>
          )}
        </div>
      )}

      {/* Map Attribution */}
      <div className="absolute bottom-2 right-2 bg-white bg-opacity-95 px-3 py-1 rounded text-xs text-gray-600">
        © Mapbox © OpenStreetMap
      </div>
    </div>
  )
}