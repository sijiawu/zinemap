"use client"

import { useEffect, useRef, useState } from "react"
import { MapPin, ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"
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
}

interface StoreMapProps {
  stores: Store[]
}

export function StoreMap({ stores }: StoreMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<any>(null)
  const [selectedStore, setSelectedStore] = useState<Store | null>(null)

  useEffect(() => {
    // Clean up existing map first
    if (map.current) {
      map.current.remove()
      map.current = null
    }

    // Simple map initialization
    const initMap = async () => {
      if (typeof window === "undefined") return
      
      try {
        const mapboxgl = await import("mapbox-gl")
        
        // Wait a bit for DOM to be ready
        setTimeout(() => {
          if (!mapContainer.current) {
            console.log("Container not ready, retrying...")
            return
          }

          if (map.current) return

          console.log("Initializing map...")
          
          map.current = new mapboxgl.Map({
            container: mapContainer.current,
            accessToken: process.env.NEXT_PUBLIC_MAPBOX_TOKEN || "pk.eyJ1IjoiZXhhbXBsZSIsImEiOiJjbGV4YW1wbGUifQ.example",
            style: "mapbox://styles/mapbox/light-v11",
            center: [-95.7129, 37.0902], // Center of US
            zoom: 3.5,
          })

          map.current.on('load', () => {
            console.log("Map loaded, adding markers...")
            
            // Add markers for stores with coordinates
            stores.forEach((store) => {
              if (!store.latitude || !store.longitude) return

              const markerEl = document.createElement("div")
              markerEl.innerHTML = `
                <div style="background: #ef4444; color: white; padding: 8px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.2); cursor: pointer; display: flex; align-items: center; justify-content: center;">
                  <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                  </svg>
                </div>
              `

              markerEl.addEventListener("click", () => {
                setSelectedStore(store)
              })

              new mapboxgl.Marker(markerEl)
                .setLngLat([store.longitude, store.latitude])
                .addTo(map.current)
            })
          })

        }, 100)

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
          <div className={`inline-block px-3 py-1 rounded-full text-xs font-medium mb-3 ${
            selectedStore.has_stocked_before ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"
          }`}>
            {selectedStore.has_stocked_before ? "Upfront Pay" : "Consignment"}
          </div>
          {selectedStore.notes && (
            <p className="text-sm text-gray-600 mb-4">{selectedStore.notes}</p>
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
