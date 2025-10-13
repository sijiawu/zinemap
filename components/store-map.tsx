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
  onLocationSelect?: (location: Store | Library | Event, type: 'store' | 'library' | 'event') => void
  onMapReady?: () => void
  hideFilterBar?: boolean
}

export function StoreMap({ stores, libraries, events, searchQuery = "", onLocationSelect, onMapReady, hideFilterBar = false }: StoreMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<any>(null)
  const markersRef = useRef<any[]>([])
  const lastDataRef = useRef<string>('')
  const [selectedLocation, setSelectedLocation] = useState<Store | Library | Event | null>(null)
  const [locationType, setLocationType] = useState<'store' | 'library' | 'event'>('store')
  const [mapView, setMapView] = useState<'stores' | 'libraries' | 'events' | 'all'>('all')
  const [mapReady, setMapReady] = useState(false)

  // Function to get responsive offset for flyTo based on screen size
  const getResponsiveOffset = () => {
    if (typeof window === 'undefined') return [-100, 100] // Default for SSR
    
    const isMobile = window.innerWidth < 640 // sm breakpoint
    if (isMobile) {
      // On mobile: smaller offset to keep pin visible, modal spans full width
      return [-50, 50] // Less aggressive offset
    } else {
      // On desktop: original offset to avoid modal blocking
      return [-100, 100] // Original offset
    }
  }

  // Function to create pin-shaped marker element
  const createPinMarker = (color: string, isActive: boolean = false) => {
    const size = isActive ? '31px' : '24px' // 30% larger: 24 * 1.3 = 31.2px
    const iconSize = isActive ? '20px' : '16px'
    
    return `
      <div style="
        width: ${size};
        height: ${size};
        position: relative;
        cursor: pointer;
        transform: translate(-50%, -100%);
        z-index: ${isActive ? '5' : '1'};
      ">
        <!-- Pin body -->
        <div style="
          width: ${size};
          height: ${size};
          background: ${color};
          border-radius: 50% 50% 50% 0;
          transform: rotate(-45deg);
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          display: flex;
          align-items: center;
          justify-content: center;
        ">
          <!-- Icon container (rotated back) -->
          <div style="
            transform: rotate(45deg);
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
          ">
            <svg width="${iconSize}" height="${iconSize}" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
            </svg>
          </div>
        </div>
      </div>
    `
  }

  // Function to programmatically select a location
  const selectLocation = (location: Store | Library | Event, type: 'store' | 'library' | 'event') => {
    setSelectedLocation(location)
    setLocationType(type)
    
    // Pan to the location if it has coordinates
    // Position pin to avoid map card coverage with responsive offset
    if (location.latitude && location.longitude && map.current) {
      map.current.flyTo({
        center: [location.longitude, location.latitude],
        zoom: 12, // Consistent zoom level for all interactions
        duration: 2000,
        offset: getResponsiveOffset() // Responsive offset based on screen size
      })
    }
  }

  // Expose selectLocation function to parent components
  useEffect(() => {
    if (onLocationSelect) {
      // Store the selectLocation function on the window object for parent access
      (window as any).selectMapLocation = selectLocation
    }
  }, [onLocationSelect])

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

        // Timeout fallback - if map doesn't load within 10 seconds, remove loading state
        const timeout = setTimeout(() => {
          setMapReady(true)
          onMapReady?.()
        }, 10000)

        // Add event listener for when map is ready
        map.current.on('load', () => {
          clearTimeout(timeout)
          setMapReady(true)
          onMapReady?.() // Notify parent that map is ready
        })

        // Add error handling
        map.current.on('error', (e: any) => {
          console.error('Map error:', e)
          clearTimeout(timeout)
          setMapReady(true)
          onMapReady?.()
        })

      } catch (error) {
        console.error("Map error:", error)
        // If map fails to load, still call onMapReady to remove loading state
        setMapReady(true)
        onMapReady?.()
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
    
    // Don't add markers if data isn't loaded yet or if arrays are empty
    if (!stores || !libraries || !events) return

    // Don't update markers if we're still in the initial loading phase
    // (when stores, libraries, or events arrays are empty but data is still loading)
    if (stores.length === 0 && libraries.length === 0 && events.length === 0) return





    // Create a data signature to check if markers actually need updating
    // Only include items that have valid coordinates
    const validStores = stores.filter(s => s.latitude && s.longitude)
    const validLibraries = libraries.filter(l => l.latitude && l.longitude)
    const validEvents = events.filter(e => e.latitude && e.longitude)

    const dataSignature = JSON.stringify({
      stores: validStores.map(s => ({ id: s.id, lat: s.latitude, lng: s.longitude })),
      libraries: validLibraries.map(l => ({ id: l.id, lat: l.latitude, lng: l.longitude })),
      events: validEvents.map(e => ({ id: e.id, lat: e.latitude, lng: e.longitude })),
      mapView,
      searchQuery,
      selectedLocation: selectedLocation?.id,
      locationType
    })

    // Only update markers if data has actually changed
    if (dataSignature === lastDataRef.current) {
      return
    }

    // Don't update if we don't have any valid coordinates
    if (validStores.length === 0 && validLibraries.length === 0 && validEvents.length === 0) {
      return
    }

    lastDataRef.current = dataSignature

    // Clear existing markers
    markersRef.current.forEach(marker => marker.remove())
    markersRef.current = []

    // Filter stores based on search query (using pre-filtered valid stores)
    const filteredStores = searchQuery.trim() 
      ? validStores.filter(store => 
          store.name.toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
          store.city.toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
          store.country.toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
          store.address.toLowerCase().includes(searchQuery.toLowerCase().trim())
        )
      : validStores

    // Filter libraries based on search query (using pre-filtered valid libraries)
    const filteredLibraries = searchQuery.trim()
      ? validLibraries.filter(library => 
          library.name.toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
          library.city.toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
          (library.state && library.state.toLowerCase().includes(searchQuery.toLowerCase().trim())) ||
          library.country.toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
          library.address.toLowerCase().includes(searchQuery.toLowerCase().trim())
        )
      : validLibraries

    // Filter events based on search query (using pre-filtered valid events)
    const filteredEvents = searchQuery.trim()
      ? validEvents.filter(event => 
          event.name.toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
          event.city.toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
          (event.state && event.state.toLowerCase().includes(searchQuery.toLowerCase().trim())) ||
          event.country.toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
          event.address.toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
          event.category.toLowerCase().includes(searchQuery.toLowerCase().trim())
        )
      : validEvents

    // Add store markers (rose) if stores should be shown
    if (mapView === 'stores' || mapView === 'all') {
      filteredStores.forEach((store) => {

        const mapboxgl = require("mapbox-gl")
        
        const markerEl = document.createElement("div")
        const isActive = selectedLocation?.id === store.id && locationType === 'store'
        markerEl.innerHTML = createPinMarker('#e11d48', isActive)
        if (isActive) {
          markerEl.setAttribute('data-active', 'true')
          markerEl.style.zIndex = '5'
        } else {
          markerEl.style.zIndex = '1'
        }

        markerEl.addEventListener("click", () => {
          setSelectedLocation(store)
          setLocationType('store')
          onLocationSelect?.(store, 'store')
          
          // Fly to the clicked location with reduced zoom and longer duration
          // Position pin to avoid map card coverage with responsive offset
          if (map.current) {
            map.current.flyTo({
              center: [store.longitude, store.latitude],
              zoom: 12, // Reduced zoom level to be less dizzying
              duration: 1500, // Longer duration for smoother animation
              offset: getResponsiveOffset() // Responsive offset based on screen size
            })
          }
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

        const mapboxgl = require("mapbox-gl")
        
        const markerEl = document.createElement("div")
        const isActive = selectedLocation?.id === library.id && locationType === 'library'
        markerEl.innerHTML = createPinMarker('#3b82f6', isActive)
        if (isActive) {
          markerEl.setAttribute('data-active', 'true')
          markerEl.style.zIndex = '5'
        } else {
          markerEl.style.zIndex = '1'
        }

        markerEl.addEventListener("click", () => {
          setSelectedLocation(library)
          setLocationType('library')
          onLocationSelect?.(library, 'library')
          
          // Fly to the clicked location with reduced zoom and longer duration
          // Position pin to avoid map card coverage with responsive offset
          if (map.current) {
            map.current.flyTo({
              center: [library.longitude, library.latitude],
              zoom: 12, // Reduced zoom level to be less dizzying
              duration: 1500, // Longer duration for smoother animation
              offset: getResponsiveOffset() // Responsive offset based on screen size
            })
          }
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

        const mapboxgl = require("mapbox-gl")
        
        const markerEl = document.createElement("div")
        const isActive = selectedLocation?.id === event.id && locationType === 'event'
        markerEl.innerHTML = createPinMarker('#009035', isActive)
        if (isActive) {
          markerEl.setAttribute('data-active', 'true')
          markerEl.style.zIndex = '5'
        } else {
          markerEl.style.zIndex = '1'
        }

        markerEl.addEventListener("click", () => {
          setSelectedLocation(event)
          setLocationType('event')
          onLocationSelect?.(event, 'event')
          
          // Fly to the clicked location with reduced zoom and longer duration
          // Position pin to avoid map card coverage with responsive offset
          if (map.current) {
            map.current.flyTo({
              center: [event.longitude, event.latitude],
              zoom: 12, // Reduced zoom level to be less dizzying
              duration: 1500, // Longer duration for smoother animation
              offset: getResponsiveOffset() // Responsive offset based on screen size
            })
          }
        })

        const marker = new mapboxgl.Marker(markerEl)
          .setLngLat([event.longitude, event.latitude])
          .addTo(map.current)

        markersRef.current.push(marker)
      })
    }

  }, [stores, libraries, events, mapView, searchQuery, mapReady, selectedLocation, locationType])

  // Separate effect to ensure active marker appears on top using CSS z-index
  useEffect(() => {
    if (!map.current || !mapReady) return

    // Apply z-index to all markers based on their active state
    markersRef.current.forEach(marker => {
      const markerEl = marker.getElement()
      if (markerEl) {
        const isActive = markerEl.getAttribute('data-active') === 'true'
        markerEl.style.zIndex = isActive ? '5' : '1'
      }
    })
  }, [selectedLocation, locationType, mapReady])

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
      {!hideFilterBar && (
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
      )}

      {/* Location Popup */}
      {selectedLocation && (
        <div className="absolute top-4 left-4 right-4 sm:right-20 sm:w-80 bg-white rounded-lg shadow-lg border border-stone-200 p-4 z-20">
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