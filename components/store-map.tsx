"use client"

import "mapbox-gl/dist/mapbox-gl.css"
import { useEffect, useRef, useState } from "react"
import { MapPin, ExternalLink, BookOpen, Calendar, Landmark, Plus, Minus, Store as StoreIcon, Globe, LocateFixed } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import {
  enableCompactMapAttribution,
  geolocationErrorMessage,
  panMapToUserLocation,
  syncMapboxHtmlMarkers,
} from "@/lib/mapGeolocate"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { formatDateReadable, getEventCategoryDisplay, formatTimeRange, isRecurringEvent, sortTagJoinsByTypeFirst } from "@/lib/utils"
import Link from "next/link"
import { SaveButton } from "@/components/SaveButton"
import { Store, Library, Event } from "@/lib/types"
import { createPinMarker, PIN_COLORS, type LocationPinType } from "@/lib/mapPins"

/** Above any stack-ordered pin z-index so the selected pin stays on top */
const MAP_MARKER_ACTIVE_Z = 999_999

interface StoreMapProps {
  stores: Store[]
  libraries: Library[]
  events: Event[]
  searchQuery?: string
  onLocationSelect?: (location: Store | Library | Event, type: 'store' | 'library' | 'event') => void
  onMapReady?: () => void
  hideFilterBar?: boolean
  savedPinsMode?: boolean
  onUnsave?: (type: 'store' | 'library' | 'event', id: string) => void
}

export function StoreMap({ stores, libraries, events, searchQuery = "", onLocationSelect, onMapReady, hideFilterBar = false, savedPinsMode = false, onUnsave }: StoreMapProps) {
  const { toast } = useToast()
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<any>(null)
  const mapboxglRef = useRef<typeof import("mapbox-gl") | null>(null)
  const markersRef = useRef<any[]>([])
  const lastDataRef = useRef<string>('')
  const initialFitDoneRef = useRef(false)
  const storesRef = useRef<Store[]>(stores)
  const librariesRef = useRef<Library[]>(libraries)
  const eventsRef = useRef<Event[]>(events)
  const [selectedLocation, setSelectedLocation] = useState<Store | Library | Event | null>(null)
  const [locationType, setLocationType] = useState<'store' | 'library' | 'event'>('store')
  const [mapView, setMapView] = useState<'stores' | 'libraries' | 'events' | 'all'>('all')
  const [mapReady, setMapReady] = useState(false)
  const [isLocating, setIsLocating] = useState(false)

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

  // Expose selectLocation function for list-card-to-map sync (used by homepage, profile saved pins, etc.)
  useEffect(() => {
    (window as any).selectMapLocation = selectLocation
    return () => {
      delete (window as any).selectMapLocation
    }
  }, [])

  useEffect(() => {
    (window as any).__zinemap_fitBounds = (coords: [number, number][]) => {
      if (!map.current || coords.length === 0) return
      const lngs = coords.map(c => c[0])
      const lats = coords.map(c => c[1])
      const sw: [number, number] = [Math.min(...lngs), Math.min(...lats)]
      const ne: [number, number] = [Math.max(...lngs), Math.max(...lats)]
      if (sw[0] === ne[0]) { sw[0] -= 0.01; ne[0] += 0.01 }
      if (sw[1] === ne[1]) { sw[1] -= 0.01; ne[1] += 0.01 }
      map.current.fitBounds([sw, ne], { padding: 50, maxZoom: 14, duration: 1000 })
    }
    return () => { delete (window as any).__zinemap_fitBounds }
  }, [])

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

  const panToMyLocation = async () => {
    if (!map.current || isLocating) return
    setIsLocating(true)
    try {
      await panMapToUserLocation(map.current)
      syncMapboxHtmlMarkers(markersRef.current)
    } catch (error) {
      toast({
        title: "Location unavailable",
        description: geolocationErrorMessage(error),
        variant: "destructive",
      })
    } finally {
      setIsLocating(false)
    }
  }

  // Initialize map (only once)
  useEffect(() => {
    const initMap = async () => {
      if (typeof window === "undefined" || map.current) return
      
      try {
        const mapboxgl = await import("mapbox-gl")
        mapboxglRef.current = mapboxgl

        if (!mapContainer.current) return

        map.current = new mapboxgl.Map({
          container: mapContainer.current,
          accessToken: process.env.NEXT_PUBLIC_MAPBOX_TOKEN || "pk.eyJ1IjoiZXhhbXBsZSIsImEiOiJjbGV4YW1wbGUifQ.example",
          style: "mapbox://styles/mapbox/light-v11",
          center: [-95.7129, 37.0902], // Center of US
          zoom: 3.5,
          renderWorldCopies: false, // Prevent showing multiple copies of the world
          attributionControl: false,
        })
        enableCompactMapAttribution(map.current, mapboxgl)

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
      mapboxglRef.current = null
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





    // Create a data signature to check if markers actually need updating (cheap: IDs only, no full JSON)
    const validStores = stores.filter(s => s.latitude && s.longitude)
    const validLibraries = libraries.filter(l => l.latitude && l.longitude)
    const validEvents = events.filter(e => e.latitude && e.longitude)

    const dataSignature = [
      validStores.map(s => s.id).sort().join(','),
      validLibraries.map(l => l.id).sort().join(','),
      validEvents.map(e => e.id).sort().join(','),
      mapView,
      searchQuery
    ].join('|')

    // Only update markers if data has actually changed
    if (dataSignature === lastDataRef.current) {
      return
    }

    // Don't update if we don't have any valid coordinates
    if (validStores.length === 0 && validLibraries.length === 0 && validEvents.length === 0) {
      return
    }

    lastDataRef.current = dataSignature

    const mapboxgl = mapboxglRef.current
    if (!mapboxgl) return

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

    // Z-order: newer created_at stacks above older (Mapbox markers share one layer; z-index breaks ties)
    const stackEntries: { key: string; created_at: string }[] = []
    if (mapView === 'stores' || mapView === 'all') {
      filteredStores.forEach((s) =>
        stackEntries.push({ key: `store:${s.id}`, created_at: s.created_at })
      )
    }
    if (mapView === 'libraries' || mapView === 'all') {
      filteredLibraries.forEach((l) =>
        stackEntries.push({ key: `library:${l.id}`, created_at: l.created_at })
      )
    }
    if (mapView === 'events' || mapView === 'all') {
      filteredEvents.forEach((e) =>
        stackEntries.push({ key: `event:${e.id}`, created_at: e.created_at })
      )
    }
    stackEntries.sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    )
    const stackZByKey = new Map<string, number>()
    let stackZi = 2
    for (const row of stackEntries) {
      stackZByKey.set(row.key, stackZi++)
    }

    // Add store markers (rose) if stores should be shown
    if (mapView === 'stores' || mapView === 'all') {
      filteredStores.forEach((store) => {

        const markerEl = document.createElement("div")
        const isActive = selectedLocation?.id === store.id && locationType === 'store'
        markerEl.innerHTML = createPinMarker(PIN_COLORS.store, 'store', isActive)
        markerEl.setAttribute('data-location-id', store.id)
        markerEl.setAttribute('data-location-type', 'store')
        const baseZStore = stackZByKey.get(`store:${store.id}`) ?? 2
        markerEl.setAttribute('data-stack-z', String(baseZStore))
        if (isActive) {
          markerEl.setAttribute('data-active', 'true')
          markerEl.style.zIndex = String(MAP_MARKER_ACTIVE_Z)
        } else {
          markerEl.style.zIndex = String(baseZStore)
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
          .setLngLat([store.longitude!, store.latitude!])
          .addTo(map.current)

        markersRef.current.push(marker)
      })
    }

    // Add library markers (blue) if libraries should be shown
    if (mapView === 'libraries' || mapView === 'all') {
      filteredLibraries.forEach((library) => {

        const markerEl = document.createElement("div")
        const isActive = selectedLocation?.id === library.id && locationType === 'library'
        markerEl.innerHTML = createPinMarker(PIN_COLORS.library, 'library', isActive)
        markerEl.setAttribute('data-location-id', library.id)
        markerEl.setAttribute('data-location-type', 'library')
        const baseZLibrary = stackZByKey.get(`library:${library.id}`) ?? 2
        markerEl.setAttribute('data-stack-z', String(baseZLibrary))
        if (isActive) {
          markerEl.setAttribute('data-active', 'true')
          markerEl.style.zIndex = String(MAP_MARKER_ACTIVE_Z)
        } else {
          markerEl.style.zIndex = String(baseZLibrary)
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
          .setLngLat([library.longitude!, library.latitude!])
          .addTo(map.current)

        markersRef.current.push(marker)
      })
    }

    // Add event markers (green) if events should be shown
    if (mapView === 'events' || mapView === 'all') {
      filteredEvents.forEach((event) => {

        const markerEl = document.createElement("div")
        const isActive = selectedLocation?.id === event.id && locationType === 'event'
        markerEl.innerHTML = createPinMarker(PIN_COLORS.event, 'event', isActive)
        markerEl.setAttribute('data-location-id', event.id)
        markerEl.setAttribute('data-location-type', 'event')
        const baseZEvent = stackZByKey.get(`event:${event.id}`) ?? 2
        markerEl.setAttribute('data-stack-z', String(baseZEvent))
        if (isActive) {
          markerEl.setAttribute('data-active', 'true')
          markerEl.style.zIndex = String(MAP_MARKER_ACTIVE_Z)
        } else {
          markerEl.style.zIndex = String(baseZEvent)
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
          .setLngLat([event.longitude!, event.latitude!])
          .addTo(map.current)

        markersRef.current.push(marker)
      })
    }

    // In savedPinsMode, fit map to show all pins on first load (cheap: no API, just bounds math)
    if (savedPinsMode && !initialFitDoneRef.current && map.current) {
      const allCoords: [number, number][] = []
      if (mapView === 'stores' || mapView === 'all') filteredStores.forEach(s => allCoords.push([s.longitude!, s.latitude!]))
      if (mapView === 'libraries' || mapView === 'all') filteredLibraries.forEach(l => allCoords.push([l.longitude!, l.latitude!]))
      if (mapView === 'events' || mapView === 'all') filteredEvents.forEach(e => allCoords.push([e.longitude!, e.latitude!]))
      if (allCoords.length > 0) {
        const lngs = allCoords.map(c => c[0])
        const lats = allCoords.map(c => c[1])
        const sw: [number, number] = [Math.min(...lngs), Math.min(...lats)]
        const ne: [number, number] = [Math.max(...lngs), Math.max(...lats)]
        // Single point: expand slightly so we get a reasonable zoom
        const pad = 0.001
        if (sw[0] === ne[0]) { sw[0] -= pad; ne[0] += pad }
        if (sw[1] === ne[1]) { sw[1] -= pad; ne[1] += pad }
        map.current.fitBounds([sw, ne], { padding: 40, maxZoom: 14, duration: 0 })
        initialFitDoneRef.current = true
      }
    }

  }, [stores, libraries, events, mapView, searchQuery, mapReady, savedPinsMode])

  // Separate effect to update active state without recreating markers
  useEffect(() => {
    if (!map.current || !mapReady) return

    // Update active state for all markers without recreating them
    markersRef.current.forEach(marker => {
      const markerEl = marker.getElement()
      if (markerEl) {
        // Get the location ID and type from the marker's data attributes
        const locationId = markerEl.getAttribute('data-location-id')
        const markerType = markerEl.getAttribute('data-location-type') as LocationPinType
        
        if (!locationId || !markerType) return
        
        // Check if this marker should be active
        const isActive = selectedLocation?.id === locationId && locationType === markerType
        
        const color = PIN_COLORS[markerType]
        
        // Update marker HTML with active/inactive state
        markerEl.innerHTML = createPinMarker(color, markerType, isActive)
        
        const stackZ = markerEl.getAttribute('data-stack-z') ?? '2'
        if (isActive) {
          markerEl.setAttribute('data-active', 'true')
          markerEl.style.zIndex = String(MAP_MARKER_ACTIVE_Z)
        } else {
          markerEl.removeAttribute('data-active')
          markerEl.style.zIndex = stackZ
        }
      }
    })
  }, [selectedLocation, locationType, mapReady])

  return (
    <div className={`relative rounded-lg overflow-hidden border border-gray-200 ${savedPinsMode ? 'h-full min-h-[384px]' : 'h-[600px]'}`}>
      {/* Avoid CSS isolation/filters on the map root — they can break Mapbox HTML marker transforms (stuck pins on the viewport edge). Overlays use z-10+. */}
      <div ref={mapContainer} className="z-0 h-full w-full min-h-0" />

      {/* Google Maps–style: separate locate pill, then zoom cluster (desktop only) */}
      <div className="absolute top-4 right-4 z-10 flex flex-col items-end gap-2">
        <button
          type="button"
          onClick={panToMyLocation}
          disabled={!mapReady || isLocating}
          className="relative flex h-[34px] w-[34px] cursor-pointer touch-manipulation items-center justify-center rounded-lg border border-stone-200 bg-white p-0 shadow-md transition-colors before:absolute before:-inset-1.5 before:content-[''] hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-50"
          title="Go to my location"
          aria-label="Go to my location"
        >
          <LocateFixed className="h-4 w-4 text-stone-700" />
        </button>
        <div className="hidden overflow-hidden rounded-lg border border-stone-200 bg-white shadow-md lg:block">
          <div className="flex flex-col divide-y divide-stone-200">
            <button
              type="button"
              onClick={zoomIn}
              className="cursor-pointer p-2 transition-colors hover:bg-stone-50"
              title="Zoom in"
              aria-label="Zoom in"
            >
              <Plus className="h-4 w-4 text-stone-700" />
            </button>
            <button
              type="button"
              onClick={zoomOut}
              className="cursor-pointer p-2 transition-colors hover:bg-stone-50"
              title="Zoom out"
              aria-label="Zoom out"
            >
              <Minus className="h-4 w-4 text-stone-700" />
            </button>
          </div>
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

      {/* Location Popup - unified card for both modes */}
      {selectedLocation && (
        <div className="absolute top-4 left-4 right-4 sm:right-20 bg-white rounded-lg shadow-lg border border-stone-200 p-3 z-20 sm:w-80 max-h-[calc(100%-2rem)] overflow-y-auto">
          <button
            onClick={() => setSelectedLocation(null)}
            className="absolute top-1.5 right-1.5 text-gray-400 hover:text-gray-600 text-xl"
          >
            ×
          </button>

          <div className="flex items-start gap-3 mb-2">
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
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-[#e11d48] transition-colors"
                  >
                    {selectedLocation.name}
                  </Link>
                ) : locationType === 'library' ? (
                  <Link 
                    href={`/library/${('permalink' in selectedLocation && selectedLocation.permalink) ? selectedLocation.permalink : selectedLocation.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-blue-600 transition-colors"
                  >
                    {selectedLocation.name}
                  </Link>
                ) : (
                  <Link 
                    href={`/event/${('permalink' in selectedLocation && selectedLocation.permalink) ? selectedLocation.permalink : selectedLocation.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-[#009035] transition-colors"
                  >
                    {selectedLocation.name}
                  </Link>
                )}
              </h3>
            </div>
          </div>

          {locationType === 'event' && 'venue_name' in selectedLocation && selectedLocation.venue_name && (
            <div className="text-sm text-gray-600 mb-2 flex items-start gap-2">
              <Landmark className="h-4 w-4 shrink-0 mt-0.5 text-stone-500" strokeWidth={2} />
              <span>{selectedLocation.venue_name}</span>
            </div>
          )}
          <div className="text-sm text-gray-600 mb-2 flex items-start gap-2">
            <MapPin className="h-4 w-4 shrink-0 mt-0.5 text-stone-500" strokeWidth={2} />
            <span>{selectedLocation.city}{'state' in selectedLocation && selectedLocation.state ? `, ${selectedLocation.state}` : ''}, {selectedLocation.country}</span>
          </div>

          {/* Website - for events: above tags (category/dates); for stores/libraries: above tags */}
          {'website' in selectedLocation && selectedLocation.website && (
            <div className="mb-2 flex items-start gap-2">
              <Globe className="h-4 w-4 shrink-0 mt-0.5 text-stone-500" strokeWidth={2} />
              <a
                href={selectedLocation.website.startsWith('http') ? selectedLocation.website : `https://${selectedLocation.website}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-stone-600 hover:underline"
              >
                {selectedLocation.website.replace(/^https?:\/\//, '')}
              </a>
            </div>
          )}

          {/* Event-specific info (category/dates - "tags" for events) */}
          {locationType === 'event' && 'category' in selectedLocation && selectedLocation.category && (
            <div className="mb-2">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <Badge variant="outline" className="text-xs bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100">
                  {getEventCategoryDisplay(selectedLocation.category)}
                </Badge>
                {'occurrence_dates' in selectedLocation && isRecurringEvent(selectedLocation as Event) && (
                  <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                    Recurring
                  </Badge>
                )}
                {'end_date' in selectedLocation && selectedLocation.end_date && (() => {
                  const today = new Date().toISOString().split('T')[0]
                  return selectedLocation.end_date < today
                })() && (
                  <Badge variant="outline" className="text-xs bg-stone-100 text-stone-500 border-stone-300">Past Event</Badge>
                )}
              </div>
              {'start_date' in selectedLocation && selectedLocation.start_date && (
                <p className="text-xs text-gray-500 mt-1">
                  {'occurrence_dates' in selectedLocation && isRecurringEvent(selectedLocation as Event) ? (
                    <>Next: {formatDateReadable(selectedLocation.start_date)}{formatTimeRange(selectedLocation.start_time, selectedLocation.end_time)}</>
                  ) : (
                    <>
                      {'end_date' in selectedLocation && selectedLocation.end_date && selectedLocation.start_date !== selectedLocation.end_date ? (
                        <>{formatDateReadable(selectedLocation.start_date)} – {formatDateReadable(selectedLocation.end_date)}{formatTimeRange(selectedLocation.start_time, selectedLocation.end_time)}</>
                      ) : (
                        <>{formatDateReadable(selectedLocation.start_date)}{formatTimeRange(selectedLocation.start_time, selectedLocation.end_time)}</>
                      )}
                    </>
                  )}
                  {'category' in selectedLocation && selectedLocation.category === "festival" && 'application_deadline' in selectedLocation && selectedLocation.application_deadline && (() => {
                    const today = new Date(); const deadlineDate = new Date(selectedLocation.application_deadline);
                    today.setHours(0, 0, 0, 0); deadlineDate.setHours(0, 0, 0, 0);
                    return deadlineDate >= today;
                  })() && ` · Apply by ${formatDateReadable(selectedLocation.application_deadline)}`}
                </p>
              )}
            </div>
          )}

          {/* Tags */}
          {locationType === 'store' && 'store_tags' in selectedLocation && selectedLocation.store_tags && selectedLocation.store_tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-2">
              {sortTagJoinsByTypeFirst(selectedLocation.store_tags, "shop_type").map((storeTag) => (
                <Badge
                  key={storeTag.id}
                  variant="outline"
                  className={`text-xs border-stone-200 ${
                    storeTag.tag.category === "shop_type"
                      ? "bg-stone-50 text-stone-700"
                      : "bg-stone-50 text-stone-600"
                  }`}
                >
                  {storeTag.tag.label}
                </Badge>
              ))}
            </div>
          )}
          {locationType === 'library' && 'library_tags' in selectedLocation && selectedLocation.library_tags && selectedLocation.library_tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-2">
              {sortTagJoinsByTypeFirst(selectedLocation.library_tags, "library_type").map((libraryTag) => (
                <Badge
                  key={libraryTag.id}
                  variant="outline"
                  className={`text-xs border-stone-200 ${
                    libraryTag.tag.category === "library_type"
                      ? "bg-stone-50 text-stone-700"
                      : "bg-stone-50 text-stone-600"
                  }`}
                >
                  {libraryTag.tag.label}
                </Badge>
              ))}
            </div>
          )}

          {/* Added by */}
          {selectedLocation.user_name && (
            <p className="text-xs text-gray-500 mb-2">
              Added by{' '}
              {selectedLocation.user_permalink ? (
                <Link href={`/profile/${selectedLocation.user_permalink}`} target="_blank" rel="noopener noreferrer" className="text-stone-800 hover:underline transition-colors">{selectedLocation.user_name}</Link>
              ) : (
                selectedLocation.user_name
              )}
            </p>
          )}

          {/* Buttons */}
          <div className="flex gap-2">
            {locationType === 'store' ? (
              <Link href={`/store/${('permalink' in selectedLocation && selectedLocation.permalink) ? selectedLocation.permalink : selectedLocation.id}`} target="_blank" rel="noopener noreferrer" className="flex-1">
                <Button size="sm" variant="outline" className="w-full border-[#e11d48] text-[#e11d48] hover:bg-rose-50">
                  View Details
                </Button>
              </Link>
            ) : locationType === 'library' ? (
              <Link href={`/library/${('permalink' in selectedLocation && selectedLocation.permalink) ? selectedLocation.permalink : selectedLocation.id}`} target="_blank" rel="noopener noreferrer" className="flex-1">
                <Button size="sm" variant="outline" className="w-full border-blue-300 text-blue-700 hover:bg-blue-50">
                  View Details
                </Button>
              </Link>
            ) : (
              <Link href={`/event/${('permalink' in selectedLocation && selectedLocation.permalink) ? selectedLocation.permalink : selectedLocation.id}`} target="_blank" rel="noopener noreferrer" className="flex-1">
                <Button size="sm" variant="outline" className="w-full border-[#009035] text-[#009035] hover:bg-green-50">
                  View Details
                </Button>
              </Link>
            )}
            {savedPinsMode && onUnsave ? (
              <SaveButton
                entityType={locationType}
                entityId={selectedLocation.id}
                variant="outline"
                size="sm"
                showLabel={true}
                initialSaved={true}
                unsaveLabel="Unsave"
                onUnsave={() => {
                  onUnsave(locationType, selectedLocation.id)
                  setSelectedLocation(null)
                }}
                className={locationType === 'store' ? 'border-[#e11d48] text-[#e11d48] hover:bg-rose-50 shrink-0' : locationType === 'library' ? 'border-blue-300 text-blue-700 hover:bg-blue-50 shrink-0' : 'border-[#009035] text-[#009035] hover:bg-green-50 shrink-0'}
              />
            ) : (
              <SaveButton
                entityType={locationType}
                entityId={selectedLocation.id}
                variant="outline"
                size="sm"
                showLabel={false}
                className={locationType === 'store' ? 'border-[#e11d48] text-[#e11d48] hover:bg-rose-50 shrink-0' : locationType === 'library' ? 'border-blue-300 text-blue-700 hover:bg-blue-50 shrink-0' : 'border-[#009035] text-[#009035] hover:bg-green-50 shrink-0'}
              />
            )}
          </div>
        </div>
      )}

    </div>
  )
}