"use client"

import { useEffect, useRef, useState } from "react"
import { MapPin, ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"
import "mapbox-gl/dist/mapbox-gl.css"
import Link from "next/link"


interface Store {
  id: number
  name: string
  city: string
  consignmentTerms: string
  description: string
  hasUpfrontPay: boolean
  coordinates: [number, number]
}

interface StoreMapProps {
  stores: Store[]
}

export function StoreMap({ stores }: StoreMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<any>(null)
  const [selectedStore, setSelectedStore] = useState<Store | null>(null)
  const [mapboxLoaded, setMapboxLoaded] = useState(false)

  // Check if we have a valid Mapbox token
  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN
  
  useEffect(() => {
    // Load Mapbox GL JS dynamically
    const loadMapbox = async () => {
      if (typeof window === "undefined" || !mapboxToken) return

      try {
        // Load Mapbox GL JS from CDN
        const mapboxgl = await import("mapbox-gl");

        // Load CSS

        setMapboxLoaded(true)

        if (map.current) return // Initialize map only once

        map.current = new mapboxgl.Map({
          container: mapContainer.current!,
          accessToken: mapboxToken,
          style: "mapbox://styles/mapbox/light-v11",
          center: [-95.7129, 37.0902],
          zoom: 3.5,
          attributionControl: false,
        })

        // Add markers for each store
        stores.forEach((store) => {
          // Create marker element
          const markerEl = document.createElement("div")
          markerEl.className = "custom-marker"
          markerEl.innerHTML = `
            <div class="bg-rose-500 hover:bg-rose-600 text-white p-2 rounded-full shadow-lg transition-all duration-200 border-2 border-white hover:scale-110 cursor-pointer">
              <svg class="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
              </svg>
            </div>
          `

          // Add click event to marker
          markerEl.addEventListener("click", () => {
            setSelectedStore(store)
          })

          // Create and add marker to map
          new mapboxgl.Marker(markerEl).setLngLat(store.coordinates).addTo(map.current)
        })
      } catch (error) {
        console.error("Failed to load Mapbox:", error)
      }
    }

    loadMapbox()

    return () => {
      if (map.current) {
        map.current.remove()
      }
    }
  }, [mapboxToken, stores])

  if (!mapboxToken) {
    return (
      <div className="h-[600px] bg-gradient-to-br from-slate-100 to-stone-100 rounded-lg flex items-center justify-center">
        <div className="text-center text-stone-500">
          <MapPin className="h-12 w-12 mx-auto mb-4 text-stone-400" />
          <p className="text-lg font-medium mb-2">Map Unavailable</p>
          <p className="text-sm">Mapbox token required for map functionality</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-[600px] relative rounded-lg overflow-hidden">
      <div ref={mapContainer} className="w-full h-full" />

      {/* Store Popup */}
      {selectedStore && (
        <div className="absolute top-4 left-4 bg-white rounded-lg shadow-lg border border-stone-200 p-4 max-w-xs z-10 font-serif">
          <button
            onClick={() => setSelectedStore(null)}
            className="absolute top-2 right-2 text-stone-400 hover:text-stone-600 text-xl leading-none"
            aria-label="Close popup"
          >
            ×
          </button>

          <h3 className="font-semibold text-stone-800 mb-2 text-base pr-6">{selectedStore.name}</h3>
          <p className="text-sm text-stone-600 mb-3 flex items-center">
            <MapPin className="h-3 w-3 mr-1 flex-shrink-0" />
            {selectedStore.city}
          </p>
          <div
            className={`inline-block px-3 py-1 rounded-full text-xs font-medium mb-3 ${
              selectedStore.hasUpfrontPay ? "bg-emerald-100 text-emerald-700" : "bg-blue-100 text-blue-700"
            }`}
          >
            {selectedStore.consignmentTerms}
          </div>
          <p className="text-sm text-stone-600 mb-4 leading-relaxed">{selectedStore.description}</p>
          <Link href={`/store/${selectedStore.id}`}>
            <Button
              size="sm"
              variant="outline"
              className="w-full text-sm border-stone-300 text-stone-700 hover:bg-rose-50 hover:border-rose-300 hover:text-rose-700 transition-colors bg-transparent"
            >
              View Details
              <ExternalLink className="h-3 w-3 ml-2" />
            </Button>
          </Link>
        </div>
      )}

      {/* Map Attribution */}
      <div className="absolute bottom-2 right-2 bg-white bg-opacity-95 px-3 py-1 rounded-md text-xs text-stone-600 shadow-sm">
        © Mapbox © OpenStreetMap
      </div>
    </div>
  )
}
