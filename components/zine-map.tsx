"use client"

import { useEffect, useRef, useState } from "react"
import { MapPin, BookOpen } from "lucide-react"

interface ZineStore {
  id: string
  name: string
  address: string
  city: string
  state: string
  country: string
  latitude?: number
  longitude?: number
  zine_cover?: string | null
  zine_title: string
  copies_placed: number
  price_per_copy: number | null
}

interface ZineMapProps {
  stores: ZineStore[]
}

export default function ZineMap({ stores }: ZineMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<any>(null)
  const markersRef = useRef<any[]>([])
  const [selectedStore, setSelectedStore] = useState<ZineStore | null>(null)
  const [mapReady, setMapReady] = useState(false)


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
          center: [-98.5795, 39.8283], // Center of US
          zoom: 3
        })

        map.current.on("load", () => {
          setMapReady(true)
        })
      } catch (error) {
        console.error("Error initializing map:", error)
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
    const updateMarkers = async () => {
      if (!map.current || !mapReady) return

      // Clear existing markers
      markersRef.current.forEach(marker => marker.remove())
      markersRef.current = []

      const mapboxgl = await import("mapbox-gl")

      // Add markers for each store
      stores.forEach((store) => {
        if (!store.latitude || !store.longitude) return
      
        const markerEl = document.createElement("div")
        markerEl.style.cursor = "pointer"
        
        if (store.zine_cover) {
          // Create marker with zine cover
          markerEl.innerHTML = `
            <div style="
              width: 60px; 
              height: 60px; 
              border-radius: 8px; 
              border: 3px solid white; 
              box-shadow: 0 4px 8px rgba(0,0,0,0.3); 
              overflow: hidden;
              background: white;
              display: flex;
              align-items: center;
              justify-content: center;
            ">
              <img 
                src="${store.zine_cover}" 
                alt="${store.zine_title}"
                style="
                  width: 100%; 
                  height: 100%; 
                  object-fit: cover;
                "
              />
            </div>
          `
        } else {
          // Fallback to book icon
          markerEl.innerHTML = `
            <div style="
              background: #8b5cf6; 
              color: white; 
              padding: 12px; 
              border-radius: 8px; 
              border: 3px solid white; 
              box-shadow: 0 4px 8px rgba(0,0,0,0.3); 
              cursor: pointer; 
              display: flex; 
              align-items: center; 
              justify-content: center;
              width: 60px;
              height: 60px;
            ">
              <svg width="24" height="24" fill="currentColor" viewBox="0 0 24 24">
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
              </svg>
            </div>
          `
        }

        markerEl.addEventListener("click", () => {
          setSelectedStore(store)
        })

        const marker = new mapboxgl.Marker(markerEl)
          .setLngLat([store.longitude, store.latitude])
          .addTo(map.current)

        markersRef.current.push(marker)
      })

      // Fit map to show all markers
      if (stores.length > 0) {
        const bounds = new mapboxgl.LngLatBounds()
        stores.forEach(store => {
          if (store.latitude && store.longitude) {
            bounds.extend([store.longitude, store.latitude])
          }
        })
        
        if (bounds.isEmpty() === false) {
          map.current.fitBounds(bounds, { padding: 50 })
        }
      }
    }

    updateMarkers()
  }, [stores, mapReady])

  return (
    <div className="relative w-full h-full">
      <div 
        ref={mapContainer} 
        className="w-full h-full" 
        style={{ minHeight: '384px' }}
        data-testid="map-container"
      />
      {!mapReady && (
        <div className="absolute inset-0 flex items-center justify-center bg-stone-100">
          <div className="text-stone-500">Loading map...</div>
        </div>
      )}
      
      {/* Selected Store Info */}
      {selectedStore && (
        <div className="absolute top-4 left-4 right-4 sm:right-4 sm:max-w-sm bg-white rounded-lg shadow-lg p-4 z-10">
          <div className="flex items-start gap-3">
            {selectedStore.zine_cover && (
              <img
                src={selectedStore.zine_cover}
                alt={selectedStore.zine_title}
                className="w-16 h-20 object-cover rounded"
              />
            )}
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-stone-800 mb-1">{selectedStore.name}</h3>
              <p className="text-sm text-stone-600 mb-2">
                {selectedStore.address}, {selectedStore.city}
                {selectedStore.state && `, ${selectedStore.state}`}
                {selectedStore.country && `, ${selectedStore.country}`}
              </p>
              <div className="text-sm text-stone-500">
                <p>{selectedStore.copies_placed} copies available</p>
                <p>{selectedStore.price_per_copy ? `$${selectedStore.price_per_copy.toFixed(2)} each` : 'Price not set'}</p>
              </div>
            </div>
            <button
              onClick={() => setSelectedStore(null)}
              className="text-stone-400 hover:text-stone-600"
            >
              ×
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
