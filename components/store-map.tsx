"use client"

import { useEffect, useRef, useState } from "react"
import { MapPin, ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"

interface Store {
  id: string
  name: string
  city: string
  country: string
  address: string
  email?: string
  website?: string
  notes?: string
  has_stocked_before: boolean
  submitted_by: string
  created_at: string
  permalink?: string
  latitude?: number
  longitude?: number
  store_tags?: {
    id: string
    tag_id: string
    tag: {
      id: string
      label: string
      category: string
    }
  }[]
  user_name?: string
}

interface StoreMapProps {
  stores: Store[]
}

export function StoreMap({ stores }: StoreMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<any>(null)
  const markersRef = useRef<any[]>([])
  const [selectedStore, setSelectedStore] = useState<Store | null>(null)

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

  // Update markers when stores change
  useEffect(() => {
    if (!map.current || !stores) return

    // Clear existing markers
    markersRef.current.forEach(marker => marker.remove())
    markersRef.current = []

    // Add new markers
    stores.forEach((store) => {
      if (!store.latitude || !store.longitude) return

      const mapboxgl = require("mapbox-gl")
      
      const markerEl = document.createElement("div")
      markerEl.innerHTML = `
        <div style="background: #ef4444; color: white; padding: 8px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.2); cursor: pointer; display: flex; align-items: center; justify-center;">
          <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
          </svg>
        </div>
      `

      markerEl.addEventListener("click", () => {
        setSelectedStore(store)
      })

      const marker = new mapboxgl.Marker(markerEl)
        .setLngLat([store.longitude, store.latitude])
        .addTo(map.current)

      markersRef.current.push(marker)
    })
  }, [stores])

  return (
    <div className="h-[600px] relative rounded-lg overflow-hidden border border-gray-200">
      <div ref={mapContainer} className="w-full h-full" />

      {/* Store Popup */}
      {selectedStore && (
        <div className="absolute top-4 left-4 bg-white rounded-lg shadow-lg border border-stone-200 p-4 max-w-xs z-10">
          <button
            onClick={() => setSelectedStore(null)}
            className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 text-xl"
          >
            ×
          </button>

          <h3 className="font-semibold text-gray-800 mb-2 pr-6">{selectedStore.name}</h3>
          <p className="text-sm text-gray-600 mb-3">
            📍 {selectedStore.city}, {selectedStore.country}
          </p>

          {/* Store Tags */}
          {selectedStore.store_tags && selectedStore.store_tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-4">
              {selectedStore.store_tags.map((storeTag) => (
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

          {/* User info */}
          {selectedStore.user_name && (
            <p className="text-xs text-gray-500 mb-3">
              Added by {selectedStore.user_name}
            </p>
          )}
          <Link href={`/store/${selectedStore.permalink || selectedStore.id}`}>
            <Button size="sm" variant="outline" className="w-full">
              View Details
            </Button>
          </Link>
        </div>
      )}

      {/* Map Attribution */}
      <div className="absolute bottom-2 right-2 bg-white bg-opacity-95 px-3 py-1 rounded text-xs text-gray-600">
        © Mapbox © OpenStreetMap
      </div>
    </div>
  )
}
