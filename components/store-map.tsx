"use client"

import { useEffect, useRef, useState } from "react"
import { MapPin, ExternalLink, BookOpen, Calendar, Clock, Landmark, Plus, Minus, Store as StoreIcon } from "lucide-react"
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
  const storesRef = useRef<Store[]>(stores)
  const librariesRef = useRef<Library[]>(libraries)
  const eventsRef = useRef<Event[]>(events)
  const [selectedLocation, setSelectedLocation] = useState<Store | Library | Event | null>(null)
  const [locationType, setLocationType] = useState<'store' | 'library' | 'event'>('store')
  const [mapView, setMapView] = useState<'stores' | 'libraries' | 'events' | 'all'>('all')
  const [mapReady, setMapReady] = useState(false)

  // Function to get responsive offset for flyTo based on screen size
  const getResponsiveOffset = () => {
    if (typeof window === 'undefined') return [100, 100] // Default for SSR
    
    const isMobile = window.innerWidth < 640 // sm breakpoint
    if (isMobile) {
      // On mobile: smaller offset to keep pin visible, modal spans full width
      return [50, 50] // Offset to bottom-right
    } else {
      // On desktop: offset to bottom-right to avoid modal blocking
      return [100, 100] // Offset to bottom-right
    }
  }

  // Function to get icon SVG paths based on type (returns array of path strings for complex icons)
  const getIconPaths = (type: 'store' | 'library' | 'event') => {
    switch (type) {
      case 'store':
        // Store icon from lucide-react - exact paths matching the Store component
        return [
          'm2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7',
          'M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8',
          'M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4',
          'M2 7h20',
          'M22 7v3a2 2 0 0 1-2 2a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 16 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 12 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 8 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 4 12a2 2 0 0 1-2-2V7'
        ]
      case 'library':
        // BookOpen icon (open book with two pages)
        return [
          'M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z',
          'M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z'
        ]
      case 'event':
        // Calendar icon
        return [
          'M8 2v4',
          'M16 2v4',
          'M3 10h18',
          'M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z'
        ]
      default:
        return ['M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z']
    }
  }

  // Function to create pin-shaped marker element
  const createPinMarker = (color: string, type: 'store' | 'library' | 'event', isActive: boolean = false) => {
    const size = isActive ? '42px' : '29px'
    const circleSize = isActive ? '26px' : '22px'
    const iconSize = isActive ? '17px' : '12px'
    const borderSize = isActive ? '3px' : '0px'
    const groundShadowSize = isActive ? '12px' : '7px'
    const groundShadowBlur = isActive ? '4px' : '2px'
    const iconPaths = getIconPaths(type)
    
    return `
      <div style="
        width: ${size};
        height: ${size};
        position: relative;
        cursor: pointer;
        transform: translate(-50%, -100%);
        z-index: ${isActive ? '5' : '1'};
      ">
        <!-- Ground shadow (circular shadow at base) -->
        <div style="
          position: absolute;
          bottom: -${groundShadowSize};
          left: 50%;
          transform: translateX(-50%);
          width: ${groundShadowSize};
          height: ${groundShadowSize};
          background: rgba(0, 0, 0, 0.25);
          border-radius: 50%;
          filter: blur(${groundShadowBlur});
          pointer-events: none;
        "></div>
        <!-- Pin body -->
        <div style="
          width: ${size};
          height: ${size};
          background: ${color};
          border: ${borderSize} solid white;
          border-radius: 50% 50% 50% 0;
          transform: rotate(-45deg);
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
        ">
          <!-- White circle container (rotated back) -->
          <div style="
            transform: rotate(45deg);
            display: flex;
            align-items: center;
            justify-content: center;
            width: ${circleSize};
            height: ${circleSize};
            background: white;
            border-radius: 50%;
            box-shadow: 0 1px 3px rgba(0,0,0,0.2);
          ">
            <!-- Icon inside circle -->
            <svg width="${iconSize}" height="${iconSize}" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24">
              ${iconPaths.map(path => `<path d="${path}"/>`).join('')}
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
    
    // Pan to the location if it has coordinates without changing zoom
    // Position pin to avoid map card coverage with responsive offset
    if (location.latitude && location.longitude && map.current) {
      const currentZoom = map.current.getZoom()
      map.current.easeTo({
        center: [location.longitude, location.latitude],
        zoom: currentZoom, // Preserve current zoom level
        duration: 1500,
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
      const newZoom = currentZoom + 1
      
      // If there's an active pin selected, zoom around that pin's current screen position
      if (selectedLocation && selectedLocation.latitude != null && selectedLocation.longitude != null) {
        try {
          const lat = Number(selectedLocation.latitude)
          const lng = Number(selectedLocation.longitude)
          
          // Validate coordinates
          if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
            // Get the marker's geographic position
            const markerLngLat = [lng, lat]
            
            // Get current center and zoom
            const currentCenter = map.current.getCenter()
            const currentCenterPoint = map.current.project(currentCenter)
            
            // Project the marker position to screen coordinates
            const markerPoint = map.current.project(markerLngLat)
            
            // Calculate offset from center to marker
            const offsetX = markerPoint.x - currentCenterPoint.x
            const offsetY = markerPoint.y - currentCenterPoint.y
            
            // Calculate scale factor for zoom change
            const scale = Math.pow(2, newZoom - currentZoom)
            
            // Calculate new offset (marker should stay in same screen position)
            const newOffsetX = offsetX / scale
            const newOffsetY = offsetY / scale
            
            // Calculate new center to keep marker in same screen position
            const newCenterPoint = {
              x: markerPoint.x - newOffsetX,
              y: markerPoint.y - newOffsetY
            }
            
            // Unproject to get new center in geographic coordinates
            const newCenter = map.current.unproject([newCenterPoint.x, newCenterPoint.y])
            
            map.current.easeTo({
              center: newCenter,
              zoom: newZoom,
              duration: 600,
              easing: (t: number) => t * (2 - t) // ease-out easing for smoother animation
            })
            return
          }
        } catch (error) {
          console.error('Error calculating zoom around marker:', error)
        }
      }
      // Fallback to center zoom if no valid pin or error occurred
      map.current.zoomTo(newZoom, { duration: 300 })
    }
  }

  const zoomOut = () => {
    if (map.current) {
      const currentZoom = map.current.getZoom()
      const newZoom = currentZoom - 1
      
      // If there's an active pin selected, zoom around that pin's current screen position
      if (selectedLocation && selectedLocation.latitude != null && selectedLocation.longitude != null) {
        try {
          const lat = Number(selectedLocation.latitude)
          const lng = Number(selectedLocation.longitude)
          
          // Validate coordinates
          if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
            // Get the marker's geographic position
            const markerLngLat = [lng, lat]
            
            // Get current center and zoom
            const currentCenter = map.current.getCenter()
            const currentCenterPoint = map.current.project(currentCenter)
            
            // Project the marker position to screen coordinates
            const markerPoint = map.current.project(markerLngLat)
            
            // Calculate offset from center to marker
            const offsetX = markerPoint.x - currentCenterPoint.x
            const offsetY = markerPoint.y - currentCenterPoint.y
            
            // Calculate scale factor for zoom change
            const scale = Math.pow(2, newZoom - currentZoom)
            
            // Calculate new offset (marker should stay in same screen position)
            const newOffsetX = offsetX / scale
            const newOffsetY = offsetY / scale
            
            // Calculate new center to keep marker in same screen position
            const newCenterPoint = {
              x: markerPoint.x - newOffsetX,
              y: markerPoint.y - newOffsetY
            }
            
            // Unproject to get new center in geographic coordinates
            const newCenter = map.current.unproject([newCenterPoint.x, newCenterPoint.y])
            
            map.current.easeTo({
              center: newCenter,
              zoom: newZoom,
              duration: 600,
              easing: (t: number) => t * (2 - t) // ease-out easing for smoother animation
            })
            return
          }
        } catch (error) {
          console.error('Error calculating zoom around marker:', error)
        }
      }
      // Fallback to center zoom if no valid pin or error occurred
      map.current.zoomTo(newZoom, { duration: 300 })
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
          renderWorldCopies: false, // Prevent showing multiple copies of the world
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

  // Keep refs updated with latest arrays so click handlers always have current data
  useEffect(() => {
    storesRef.current = stores
    librariesRef.current = libraries
    eventsRef.current = events
  }, [stores, libraries, events])

  // Update markers when stores, libraries, mapView, or searchQuery change
  // Note: selectedLocation changes are handled separately to avoid recreating markers
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
      searchQuery
      // Note: selectedLocation is excluded to prevent marker recreation on selection
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
        markerEl.innerHTML = createPinMarker('#e11d48', 'store', isActive)
        markerEl.setAttribute('data-location-id', store.id)
        markerEl.setAttribute('data-location-type', 'store')
        if (isActive) {
          markerEl.setAttribute('data-active', 'true')
          markerEl.style.zIndex = '5'
        } else {
          markerEl.style.zIndex = '1'
        }

        markerEl.addEventListener("click", () => {
          // Find the most up-to-date store object from the current stores array
          // This ensures we have the latest user_name and user_permalink data
          // Use ref to get latest data at click time, not closure time
          const currentStore = storesRef.current.find(s => s.id === store.id) || store
          setSelectedLocation(currentStore)
          setLocationType('store')
          onLocationSelect?.(currentStore, 'store')
          
          // Pan to the clicked location without changing zoom
          // Position pin to avoid map card coverage with responsive offset
          if (map.current) {
            const currentZoom = map.current.getZoom()
            map.current.easeTo({
              center: [currentStore.longitude, currentStore.latitude],
              zoom: currentZoom, // Preserve current zoom level
              duration: 1500,
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
        markerEl.innerHTML = createPinMarker('#3b82f6', 'library', isActive)
        markerEl.setAttribute('data-location-id', library.id)
        markerEl.setAttribute('data-location-type', 'library')
        if (isActive) {
          markerEl.setAttribute('data-active', 'true')
          markerEl.style.zIndex = '5'
        } else {
          markerEl.style.zIndex = '1'
        }

        markerEl.addEventListener("click", () => {
          // Find the most up-to-date library object from the current libraries array
          // This ensures we have the latest user_name and user_permalink data
          // Use ref to get latest data at click time, not closure time
          const currentLibrary = librariesRef.current.find(l => l.id === library.id) || library
          setSelectedLocation(currentLibrary)
          setLocationType('library')
          onLocationSelect?.(currentLibrary, 'library')
          
          // Pan to the clicked location without changing zoom
          // Position pin to avoid map card coverage with responsive offset
          if (map.current) {
            const currentZoom = map.current.getZoom()
            map.current.easeTo({
              center: [currentLibrary.longitude, currentLibrary.latitude],
              zoom: currentZoom, // Preserve current zoom level
              duration: 1200,
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
        markerEl.innerHTML = createPinMarker('#009035', 'event', isActive)
        markerEl.setAttribute('data-location-id', event.id)
        markerEl.setAttribute('data-location-type', 'event')
        if (isActive) {
          markerEl.setAttribute('data-active', 'true')
          markerEl.style.zIndex = '5'
        } else {
          markerEl.style.zIndex = '1'
        }

        markerEl.addEventListener("click", () => {
          // Find the most up-to-date event object from the current events array
          // This ensures we have the latest user_name and user_permalink data
          // Use ref to get latest data at click time, not closure time
          const currentEvent = eventsRef.current.find(e => e.id === event.id) || event
          setSelectedLocation(currentEvent)
          setLocationType('event')
          onLocationSelect?.(currentEvent, 'event')
          
          // Pan to the clicked location without changing zoom
          // Position pin to avoid map card coverage with responsive offset
          if (map.current) {
            const currentZoom = map.current.getZoom()
            map.current.easeTo({
              center: [currentEvent.longitude, currentEvent.latitude],
              zoom: currentZoom, // Preserve current zoom level
              duration: 1200,
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

  }, [stores, libraries, events, mapView, searchQuery, mapReady])

  // Separate effect to update active state without recreating markers
  useEffect(() => {
    if (!map.current || !mapReady) return

    // Update active state for all markers without recreating them
    markersRef.current.forEach(marker => {
      const markerEl = marker.getElement()
      if (markerEl) {
        // Get the location ID and type from the marker's data attributes
        const locationId = markerEl.getAttribute('data-location-id')
        const markerType = markerEl.getAttribute('data-location-type') as 'store' | 'library' | 'event'
        
        if (!locationId || !markerType) return
        
        // Check if this marker should be active
        const isActive = selectedLocation?.id === locationId && locationType === markerType
        
        // Get the appropriate color for this marker type
        const color = markerType === 'store' ? '#e11d48' : markerType === 'library' ? '#3b82f6' : '#009035'
        
        // Update marker HTML with active/inactive state
        markerEl.innerHTML = createPinMarker(color, markerType, isActive)
        
        // Update data attributes and z-index
        if (isActive) {
          markerEl.setAttribute('data-active', 'true')
          markerEl.style.zIndex = '5'
        } else {
          markerEl.removeAttribute('data-active')
          markerEl.style.zIndex = '1'
        }
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
                <StoreIcon className="h-5 w-5 text-[#e11d48]" />
              ) : locationType === 'library' ? (
                <BookOpen className="h-5 w-5 text-blue-500" />
              ) : (
                <Calendar className="h-5 w-5 text-[#009035]" />
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
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <Badge 
                  variant="outline"
                  className="text-xs bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100"
                >
                  {getEventCategoryDisplay(selectedLocation.category)}
                </Badge>
                {'end_date' in selectedLocation && selectedLocation.end_date && (() => {
                  const today = new Date().toISOString().split('T')[0]
                  return selectedLocation.end_date < today
                })() && (
                  <Badge 
                    variant="outline"
                    className="text-xs bg-stone-100 text-stone-500 border-stone-300"
                  >
                    Past Event
                  </Badge>
                )}
              </div>
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
            <Link href={`/store/${('permalink' in selectedLocation && selectedLocation.permalink) ? selectedLocation.permalink : selectedLocation.id}`} target="_blank" rel="noopener noreferrer">
              <Button size="sm" variant="outline" className="w-full border-[#e11d48] text-[#e11d48] hover:bg-rose-50">
                View Details
              </Button>
            </Link>
          ) : locationType === 'library' ? (
            <Link href={`/library/${('permalink' in selectedLocation && selectedLocation.permalink) ? selectedLocation.permalink : selectedLocation.id}`} target="_blank" rel="noopener noreferrer">
              <Button size="sm" variant="outline" className="w-full border-blue-300 text-blue-700 hover:bg-blue-50">
                View Details
              </Button>
            </Link>
          ) : (
            <Link href={`/event/${('permalink' in selectedLocation && selectedLocation.permalink) ? selectedLocation.permalink : selectedLocation.id}`} target="_blank" rel="noopener noreferrer">
              <Button size="sm" variant="outline" className="w-full border-[#009035] text-[#009035] hover:bg-green-50">
                View Details
              </Button>
            </Link>
          )}
        </div>
      )}

      {/* Map Attribution */}
      <div className="absolute bottom-2 right-2 bg-white bg-opacity-95 px-3 py-1 rounded text-xs text-gray-600 z-10">
        © Mapbox © OpenStreetMap
      </div>
    </div>
  )
}