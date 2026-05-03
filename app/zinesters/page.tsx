'use client'

import 'mapbox-gl/dist/mapbox-gl.css'
import { useState, useEffect, useRef, useCallback } from 'react'
import { useSupabaseUser } from '@/hooks/useSupabaseUser'
import { supabase } from '@/lib/supabaseClient'
import { HomePin } from '@/lib/types'
import { useToast } from '@/hooks/use-toast'
import { Plus, Minus, LocateFixed } from 'lucide-react'
import { geolocationErrorMessage, panMapToUserLocation, syncMapboxHtmlMarkers } from '@/lib/mapGeolocate'
import { useRouter } from 'next/navigation'
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

export default function ZinestersPage() {
  const { user } = useSupabaseUser()
  const { toast } = useToast()
  const router = useRouter()
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<any>(null)
  const mapboxglRef = useRef<any>(null)
  const markersRef = useRef<any[]>([])
  const lastPinsRef = useRef<string>('')
  const isCreatingMarkersRef = useRef(false)
  const [pins, setPins] = useState<HomePin[]>([])
  const [selectedPin, setSelectedPin] = useState<HomePin | null>(null)
  const [isAddingPin, setIsAddingPin] = useState(false)
  const [isAddingPinLoading, setIsAddingPinLoading] = useState(false)
  const [mapReady, setMapReady] = useState(false)
  const [initialLoadComplete, setInitialLoadComplete] = useState(false)
  const [selectedPinColor, setSelectedPinColor] = useState('#f59e0b')
  const [pinsLoaded, setPinsLoaded] = useState(false)
  const [profileCache, setProfileCache] = useState<Record<string, any>>({})
  const [loadingProfile, setLoadingProfile] = useState(false)
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [pendingPinLocation, setPendingPinLocation] = useState<{
    lat: number
    lng: number
    city: string
    state: string
    country: string
  } | null>(null)
  const [isGeocoding, setIsGeocoding] = useState(false)
  const [isLocating, setIsLocating] = useState(false)

  // Count pins for current user only
  const userPinCount = user ? pins.filter(pin => pin.user_email === user.email).length : 0

  // Fetch all pins
  const fetchPins = async () => {
    try {
      const { data, error } = await supabase
        .from('home_pins')
        .select(`
          id,
          user_email,
          latitude,
          longitude,
          color,
          city,
          state,
          country,
          created_at,
          user:profiles!home_pins_user_email_fkey(
            id,
            display_name,
            email,
            permalink,
            profile_image
          )
        `)
        .order('created_at', { ascending: false })

      if (error) throw error
      
      // Transform data to match HomePin interface
      const transformedData = (data || []).map(pin => ({
        ...pin,
        user: Array.isArray(pin.user) ? pin.user[0] : pin.user
      }))
      
      setPins(transformedData)
      setPinsLoaded(true)

      // Support deep-linking from profiles: /zinesters?pin=<home_pin_id>
      if (typeof window !== 'undefined') {
        const targetPinId = new URLSearchParams(window.location.search).get('pin')
        if (targetPinId) {
          const targetPin = transformedData.find(pin => pin.id === targetPinId)
          if (targetPin) {
            setSelectedPin(targetPin)

            if (map.current) {
              const currentZoom = map.current.getZoom()
              map.current.easeTo({
                center: [targetPin.longitude, targetPin.latitude],
                zoom: currentZoom,
                duration: 1500,
                offset: getResponsiveOffset()
              })
            }

            const fullProfile = await fetchFullProfile(targetPin.user_email)
            if (fullProfile) {
              setSelectedPin(prev => prev?.id === targetPin.id ? { ...targetPin, user: fullProfile } : prev)
            }
          }
        }
      }
    } catch (error) {
      console.error('Error fetching pins:', error)
      toast({
        title: "Error",
        description: "Failed to load pins",
        variant: "destructive",
      })
    }
  }

  // Handle map click - show confirmation modal
  const handleMapClick = async (lat: number, lng: number) => {
    if (!user || !isAddingPin || isGeocoding || userPinCount >= 3) return
    if (!lat || !lng || isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) return

    setIsGeocoding(true)
    try {
      const res = await fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${process.env.NEXT_PUBLIC_MAPBOX_TOKEN}&types=place,region,country`)
      const data = await res.json()
      const features = data.features || []
      setPendingPinLocation({
        lat, lng,
        city: features.find((f: any) => f.place_type.includes('place'))?.text || '',
        state: features.find((f: any) => f.place_type.includes('region'))?.text || '',
        country: features.find((f: any) => f.place_type.includes('country'))?.text || ''
      })
      setShowConfirmModal(true)
    } catch (error) {
      toast({ title: "Error", description: "Failed to get location", variant: "destructive" })
    } finally {
      setIsGeocoding(false)
    }
  }

  // Add pin after confirmation
  const confirmAddPin = async () => {
    if (!user || !pendingPinLocation) return
    setIsAddingPinLoading(true)
    setShowConfirmModal(false)
    try {
      const { data, error } = await supabase.from('home_pins').insert({
        user_email: user.email, latitude: pendingPinLocation.lat, longitude: pendingPinLocation.lng,
        color: selectedPinColor, city: pendingPinLocation.city, state: pendingPinLocation.state, country: pendingPinLocation.country
      }).select(`id, user_email, latitude, longitude, color, city, state, country, created_at, user:profiles!home_pins_user_email_fkey(id, display_name, email, permalink, profile_image)`).single()
      if (error) throw error
      setPins(prev => [{ ...data, user: Array.isArray(data.user) ? data.user[0] : data.user }, ...prev])
      setIsAddingPin(false)
      setPendingPinLocation(null)
      toast({ title: "Success", description: "Pin added!" })
    } catch (error) {
      toast({ title: "Error", description: `Failed to add pin: ${error instanceof Error ? error.message : 'Unknown error'}`, variant: "destructive" })
    } finally {
      setIsAddingPinLoading(false)
    }
  }

  // Delete a pin
  const handleDeletePin = async (pinId: string) => {
    try {
      const { error } = await supabase
        .from('home_pins')
        .delete()
        .eq('id', pinId)

      if (error) throw error

      // Remove the specific marker from the map immediately
      const markerToRemove = markersRef.current.find(marker => {
        const el = marker.getElement()
        return el?.getAttribute('data-pin-id') === pinId
      })
      
      if (markerToRemove) {
        markerToRemove.remove()
        markersRef.current = markersRef.current.filter(marker => marker !== markerToRemove)
      }

      setPins(prev => prev.filter(pin => pin.id !== pinId))
      setSelectedPin(null)
      toast({
        title: "Success",
        description: "Pin deleted successfully!",
      })
    } catch (error) {
      console.error('Error deleting pin:', error)
      toast({
        title: "Error",
        description: "Failed to delete pin",
        variant: "destructive",
      })
    }
  }


  // Fetch full profile data when pin is clicked
  const fetchFullProfile = async (userEmail: string) => {
    if (profileCache[userEmail]) {
      return profileCache[userEmail]
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, display_name, email, permalink, profile_image, bio, roles')
        .eq('email', userEmail)
        .single()

      if (error) throw error
      
      // Cache the profile
      setProfileCache(prev => ({ ...prev, [userEmail]: data }))
      return data
    } catch (error) {
      console.error('Error fetching full profile:', error)
      return null
    }
  }

  const hexToRgba = (hex: string, alpha: number) => {
    const sanitized = hex.replace('#', '')
    const normalized = sanitized.length === 3
      ? sanitized.split('').map((char) => char + char).join('')
      : sanitized

    const value = Number.parseInt(normalized, 16)
    if (Number.isNaN(value)) return `rgba(245, 158, 11, ${alpha})`

    const r = (value >> 16) & 255
    const g = (value >> 8) & 255
    const b = value & 255
    return `rgba(${r}, ${g}, ${b}, ${alpha})`
  }

  // Function to get responsive offset for flyTo based on screen size
  const getResponsiveOffset = () => {
    if (typeof window === 'undefined') return [0, 0] // Default for SSR
    
    const isMobile = window.innerWidth < 640 // sm breakpoint
    if (isMobile) {
      // On mobile: move pin down to avoid modal coverage
      return [0, 160] // Move pin down
    } else {
      // On desktop: center the pin
      return [0, 0] // Center the pin
    }
  }

  // Handle pin click
  const handlePinClick = async (pin: HomePin) => {
    setLoadingProfile(true)
    
    try {
      // Fetch full profile data if not cached
      const fullProfile = await fetchFullProfile(pin.user_email)
      
      setSelectedPin({
        ...pin,
        user: fullProfile || pin.user
      })

      // Pan to the pin location without changing zoom
      if (map.current) {
        const currentZoom = map.current.getZoom()
        map.current.easeTo({
          center: [pin.longitude, pin.latitude],
          zoom: currentZoom, // Preserve current zoom level
          duration: 1500,
          offset: getResponsiveOffset() // Responsive offset based on screen size
        })
      }
    } finally {
      setLoadingProfile(false)
    }
  }

  // Zoom functions
  const zoomIn = () => {
    if (map.current) {
      const currentZoom = map.current.getZoom()
      const newZoom = currentZoom + 1
      
      // If there's an active pin selected, zoom around that pin's current screen position
      if (selectedPin && selectedPin.latitude != null && selectedPin.longitude != null) {
        try {
          const lat = Number(selectedPin.latitude)
          const lng = Number(selectedPin.longitude)
          
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
      if (selectedPin && selectedPin.latitude != null && selectedPin.longitude != null) {
        try {
          const lat = Number(selectedPin.latitude)
          const lng = Number(selectedPin.longitude)
          
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
        title: 'Location unavailable',
        description: geolocationErrorMessage(error),
        variant: 'destructive',
      })
    } finally {
      setIsLocating(false)
    }
  }

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return

    // Reset state on mount
    setInitialLoadComplete(false)

    const initMap = async () => {
      try {
        const mapboxgl = await import("mapbox-gl")
        mapboxglRef.current = mapboxgl
        
        map.current = new mapboxgl.Map({
          container: mapContainer.current!,
          accessToken: process.env.NEXT_PUBLIC_MAPBOX_TOKEN,
          style: "mapbox://styles/mapbox/light-v11",
          center: [-53.5, 48.5], // Newfoundland, Canada
          zoom: window.innerWidth < 640 ? 1 : 2, // Zoom level 1 on mobile, 2 on desktop
        })

        map.current.on('load', () => {
          setMapReady(true)
          fetchPins()
        })

      } catch (error) {
        console.error("Map error:", error)
      }
    }

    initMap()

    return () => {
      // Cleanup markers
      markersRef.current.forEach(marker => marker.remove())
      markersRef.current = []
      isCreatingMarkersRef.current = false
      lastPinsRef.current = ''
      setInitialLoadComplete(false)
      
      if (map.current) {
        map.current.remove()
        map.current = null
      }
    }
  }, [])


  // Stable marker management system
  const createMarkers = useCallback(() => {
    if (!map.current || !mapboxglRef.current || isCreatingMarkersRef.current) return

    isCreatingMarkersRef.current = true

    // Clear existing markers
    markersRef.current.forEach(marker => marker.remove())
    markersRef.current = []

    // Add new markers
    pins.forEach((pin) => {
      const el = document.createElement('div')
      el.className = 'pin-marker'
      el.setAttribute('data-pin-id', pin.id)
      
      // Create pin-shaped marker with user avatar
      const isActive = selectedPin?.id === pin.id
        const pinSize = isActive ? '47px' : '36px' // 20% bigger: 39px*1.2=47px, 30px*1.2=36px
        const avatarSize = isActive ? '31px' : '24px' // 20% bigger: 26px*1.2=31px, 20px*1.2=24px
      const zIndex = isActive ? '10' : '1'
      
      el.innerHTML = `
        <div style="
          width: ${pinSize};
          height: ${pinSize};
          position: relative;
          cursor: pointer;
          transform: translate(calc(-50% + 6px), calc(-100% + 6px));
          z-index: ${zIndex};
        ">
          <!-- Pin body with avatar -->
          <div style="
            width: ${pinSize};
            height: ${pinSize};
            background: ${pin.color || '#f59e0b'};
            border-radius: 50% 50% 50% 0;
            transform: rotate(-45deg);
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
            display: flex;
            align-items: center;
            justify-content: center;
            background-image: url('${pin.user?.profile_image || '/placeholder-user.jpg'}');
            background-size: cover;
            background-position: center;
            border: 3px solid ${pin.color || '#f59e0b'};
          ">
            <!-- Avatar container (rotated back) -->
            <div style="
              transform: rotate(45deg);
              display: flex;
              align-items: center;
              justify-content: center;
              width: ${avatarSize};
              height: ${avatarSize};
              border-radius: 50%;
              overflow: hidden;
              background-image: url('${pin.user?.profile_image || '/placeholder-user.jpg'}');
              background-size: cover;
              background-position: center;
            "></div>
          </div>
        </div>
      `

      el.addEventListener('click', () => {
        handlePinClick(pin)
      })

      const marker = new mapboxglRef.current.Marker(el)
        .setLngLat([pin.longitude, pin.latitude])
        .addTo(map.current)
      
      markersRef.current.push(marker)
    })
    
    isCreatingMarkersRef.current = false
    lastPinsRef.current = pins.map(p => p.id).join(',')
    
    // Set initial load complete after a short delay to ensure smooth transition
    if (!initialLoadComplete) {
      setTimeout(() => {
        setInitialLoadComplete(true)
      }, 200)
    }
  }, [pins, initialLoadComplete])

  // Effect to manage markers
  useEffect(() => {
    if (!mapReady || !map.current || !mapboxglRef.current) return

    const currentPinsSignature = pins.map(p => p.id).join(',')
    
    // Only create markers if pins actually changed and we have more pins than markers
    // This prevents unnecessary recreation when deleting pins
    if (lastPinsRef.current !== currentPinsSignature && pins.length > markersRef.current.length) {
      // Add a small delay to ensure map is fully rendered
      const timer = setTimeout(() => {
        createMarkers()
      }, 100)
      
      return () => clearTimeout(timer)
    }
  }, [mapReady, pins, createMarkers, selectedPin])

  // Handle ESC key to cancel pin drop
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isAddingPin) {
        setIsAddingPin(false)
        setShowConfirmModal(false)
        setPendingPinLocation(null)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isAddingPin])

  // Update active state without recreating markers
  useEffect(() => {
    if (!mapReady || !map.current) return

    markersRef.current.forEach(marker => {
      const markerEl = marker.getElement()
      if (markerEl) {
        const pinId = markerEl.getAttribute('data-pin-id')
        const isActive = selectedPin?.id === pinId
        
        markerEl.style.zIndex = isActive ? '5' : '1'
        if (isActive) {
          markerEl.setAttribute('data-active', 'true')
        } else {
          markerEl.removeAttribute('data-active')
        }
      }
    })
  }, [selectedPin, mapReady])


  return (
    <>
      <style jsx>{`
        .cursor-crosshair .mapboxgl-canvas {
          cursor: crosshair !important;
        }
        .cursor-default .mapboxgl-canvas {
          cursor: default !important;
        }
        .map-container {
          opacity: 0;
          transition: opacity 0.3s ease-in-out;
        }
        .map-container.ready {
          opacity: 1;
        }
        .mapboxgl-ctrl-attrib {
          font-size: 8px !important;
        }
        .mapboxgl-ctrl-attrib a {
          font-size: 8px !important;
        }
      `}</style>
      <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-gloria text-amber-800 mb-4">
            Join the map!

          </h1>
          <p className="text-lg text-amber-700 max-w-4xl mx-auto">

            ZineMap's mapping the global zine scene, and it wouldn't be complete without you!
          </p>
        </div>

        <div className={`h-[75vh] sm:h-[600px] relative rounded-lg overflow-hidden border border-gray-200 shadow-lg map-container ${initialLoadComplete ? 'ready' : ''}`}>
          <div 
            ref={mapContainer}
            className={`w-full h-full ${isAddingPin ? 'cursor-crosshair' : 'cursor-default'}`}
          />
          
          {/* Overlay to block interactions during add pin mode */}
          {isAddingPin && (
            <div 
              className="absolute inset-0 z-30 cursor-crosshair"
              style={{
                background: 'transparent',
                pointerEvents: 'all'
              }}
              onClick={(e) => {
                if (!user || isAddingPinLoading || isGeocoding) return
                
                // Get click coordinates relative to the map container
                const rect = mapContainer.current?.getBoundingClientRect()
                if (!rect) return
                
                const clickX = e.clientX - rect.left
                const clickY = e.clientY - rect.top
                
                // Convert screen coordinates to map coordinates
                if (map.current) {
                  const lngLat = map.current.unproject([clickX, clickY])
                  handleMapClick(lngLat.lat, lngLat.lng)
                }
              }}
            />
          )}
          
          {/* Loading overlay to prevent flash */}
          {!initialLoadComplete && (
            <div className="absolute inset-0 bg-gray-50 flex items-center justify-center z-10">
              <div className="text-gray-700 font-gloria text-lg">
                Loading map...
              </div>
            </div>
          )}

          {/* Floating Profile Card - positioned relative to map */}
          {selectedPin && (
            <div
              className="absolute z-30 bg-white rounded-lg shadow-xl border border-gray-200 p-4 left-4 right-4 sm:left-5 sm:w-80 sm:right-auto max-h-[37.5vh] sm:max-h-[28rem] overflow-y-auto top-16 sm:top-5"
            >
              {/* Close button */}
              <button
              onClick={() => {
                setSelectedPin(null)
              }}
                className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                ✕
              </button>

              {/* Profile header */}
              <div className="flex items-center space-x-3 mb-3 pr-6">
                <img
                  src={selectedPin.user?.profile_image || '/placeholder-user.jpg'}
                  alt={selectedPin.user?.display_name || 'User'}
                  className="w-10 h-10 rounded-full object-cover border-2"
                  style={{ borderColor: selectedPin.color || '#f59e0b' }}
                />
                <div className="flex-1 min-w-0">
                  {selectedPin.user?.permalink ? (
                    <a
                      href={user && selectedPin.user_email === user.email ? '/profile' : `/profile/${selectedPin.user.permalink}`}
                      className="font-gloria text-lg hover:opacity-80 transition-opacity truncate block"
                      style={{ color: selectedPin.color || '#f59e0b' }}
                    >
                      {selectedPin.user?.display_name || 'Anonymous Zinester'}
                    </a>
                  ) : (
                    <h3 
                      className="font-gloria text-lg truncate"
                      style={{ color: selectedPin.color || '#f59e0b' }}
                    >
                      {selectedPin.user?.display_name || 'Anonymous Zinester'}
                    </h3>
                  )}
                </div>
              </div>
              
              {/* Location */}
              {(selectedPin.city || selectedPin.state || selectedPin.country) && (
                <div className="mb-3">
                  <p className="text-sm text-gray-600">
                    📍 {[selectedPin.city, selectedPin.state, selectedPin.country].filter(Boolean).join(', ')}
                  </p>
                </div>
              )}

              {!loadingProfile && selectedPin.user?.roles && selectedPin.user.roles.length > 0 && (
                <div className="mb-3 flex flex-wrap gap-1.5">
                  {selectedPin.user.roles.map((role, index) => (
                    <span
                      key={`${role}-${index}`}
                      className="rounded-full border px-2 py-0.5 text-xs font-medium"
                      style={{
                        color: selectedPin.color || '#f59e0b',
                        borderColor: selectedPin.color || '#f59e0b',
                        backgroundColor: hexToRgba(selectedPin.color || '#f59e0b', 0.14),
                      }}
                    >
                      {role.toLocaleLowerCase()}
                    </span>
                  ))}
                </div>
              )}

              {/* Bio - full text */}
              {loadingProfile ? (
                <div className="text-gray-500 mb-3 text-sm">
                  Loading profile...
                </div>
              ) : selectedPin.user?.bio ? (
                <p className="text-gray-700 mb-3 text-sm">
                  {selectedPin.user.bio}
                </p>
              ) : null}

              {/* Action buttons */}
              <div className="flex space-x-2">
                {selectedPin.user?.permalink && (
                  <a
                    href={user && selectedPin.user_email === user.email ? '/profile' : `/profile/${selectedPin.user.permalink}`}
                    className="px-3 py-1 bg-amber-500 text-white rounded text-xs font-gloria hover:bg-amber-600 transition-colors"
                    style={{ backgroundColor: selectedPin.color || '#f59e0b' }}
                  >
                    View Profile
                  </a>
                )}
                
                {user && selectedPin.user_email === user.email && (
                  <button
                    onClick={() => handleDeletePin(selectedPin.id)}
                    className="px-3 py-1 bg-red-500 text-white rounded text-xs font-gloria hover:bg-red-600 transition-colors"
                  >
                    Delete Pin
                  </button>
                )}
              </div>
            </div>
          )}
          
          {/* Map controls: add pin / login, then locate + zoom — single column so locate isn’t under a higher z-index on small screens */}
          <div className="absolute top-4 right-4 sm:right-16 z-30 flex flex-col items-end gap-2">
            {user ? (
              <>
                {/* Color Picker */}
                {isAddingPin && (
                  <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-3 z-30">
                    <div className="text-xs text-gray-600 mb-3 font-medium">Pick a color</div>
                    <div className="grid grid-cols-4 gap-2">
                      {[
                        { name: 'Amber', value: '#f59e0b' },
                        { name: 'Red', value: '#ef4444' },
                        { name: 'Blue', value: '#3b82f6' },
                        { name: 'Green', value: '#10b981' },
                        { name: 'Purple', value: '#8b5cf6' },
                        { name: 'Orange', value: '#f97316' },
                        { name: 'Cyan', value: '#06b6d4' },
                        { name: 'Pink', value: '#ec4899' },
                        { name: 'Gray', value: '#6b7280' },
                        { name: 'Yellow', value: '#eab308' },
                        { name: 'Emerald', value: '#059669' },
                        { name: 'Violet', value: '#7c3aed' }
                      ].map((color) => (
                        <button
                          key={color.value}
                          onClick={() => setSelectedPinColor(color.value)}
                          className={`w-8 h-8 rounded-lg border-2 transition-all hover:scale-110 ${
                            selectedPinColor === color.value 
                              ? 'border-gray-800 ring-2 ring-gray-300' 
                              : 'border-gray-200 hover:border-gray-400'
                          }`}
                          style={{ backgroundColor: color.value }}
                          title={color.name}
                        />
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Add Pin Button */}
                <button
                  onClick={() => {
                    if (isAddingPin) {
                      // Cancel adding pin - close modal if open
                      setIsAddingPin(false)
                      setShowConfirmModal(false)
                      setPendingPinLocation(null)
                    } else {
                      setIsAddingPin(true)
                    }
                  }}
                  disabled={isAddingPinLoading || userPinCount >= 3}
                  className={`px-4 py-2 rounded-lg font-gloria text-sm transition-all ${
                    isAddingPinLoading || userPinCount >= 3
                      ? 'bg-gray-400 text-white cursor-not-allowed'
                      : isAddingPin 
                      ? 'bg-red-500 text-white hover:bg-red-600' 
                      : 'bg-amber-500 text-white hover:bg-amber-600'
                  }`}
                  title={userPinCount >= 3 ? 'Pin limit reached (3/3)' : ''}
                >
                  {isAddingPinLoading ? 'Adding...' : isAddingPin ? 'Cancel' : userPinCount >= 3 ? 'Pin Limit (3/3)' : `Add Pin (${userPinCount}/3)`}
                </button>
              </>
            ) : (
              /* Login Button for non-logged in users */
              <a
                href="/login"
                className="px-4 py-2 rounded-lg font-gloria text-sm transition-all bg-amber-500 text-white hover:bg-amber-600"
              >
                Log in to add your pin
              </a>
            )}

            <button
              type="button"
              onClick={panToMyLocation}
              disabled={!mapReady || isLocating}
              className="cursor-pointer rounded-lg border border-gray-200 bg-white p-2 shadow-md transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 touch-manipulation min-h-[44px] min-w-[44px] flex items-center justify-center"
              title="Go to my location"
              aria-label="Go to my location"
            >
              <LocateFixed className="h-4 w-4 text-gray-700" />
            </button>
            <div className="hidden overflow-hidden rounded-lg border border-gray-200 bg-white shadow-md sm:block">
              <div className="flex flex-col divide-y divide-gray-200">
                <button
                  type="button"
                  onClick={zoomIn}
                  className="cursor-pointer p-2 transition-colors hover:bg-gray-50"
                  title="Zoom in"
                  aria-label="Zoom in"
                >
                  <Plus className="h-4 w-4 text-gray-700" />
                </button>
                <button
                  type="button"
                  onClick={zoomOut}
                  className="cursor-pointer p-2 transition-colors hover:bg-gray-50"
                  title="Zoom out"
                  aria-label="Zoom out"
                >
                  <Minus className="h-4 w-4 text-gray-700" />
                </button>
              </div>
            </div>
          </div>

          {/* Instructions */}
          {isAddingPin && (
            <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm rounded-lg p-3 shadow-lg z-30">
              <p className="text-sm text-gray-700 font-gloria">
                {isGeocoding ? 'Getting location...' : isAddingPinLoading ? 'Adding your pin...' : 'Click anywhere on the map to drop your pin!'}
              </p>
            </div>
          )}

          </div>

          {/* Description text below the map */}
          <div className="text-center mt-6">
            <p className="text-sm sm:text-lg text-amber-700 max-w-4xl mx-auto">
              Like the world map in every hostel, this one's for all the zinesters and indie creators out there.<br />
              Think of it as a zinester directory in map form.<br />
              Drop up to 3 pins to mark places you call home or have shaped you.<br />
              Maybe it can help a few of us find each other!
            </p>
          </div>
 
       </div>
        </div>

        {/* Confirmation Modal */}
        <Dialog open={showConfirmModal} onOpenChange={(open) => {
          if (!open) {
            setShowConfirmModal(false)
            setPendingPinLocation(null)
            setIsAddingPin(false) // Exit add pin mode, return to pan & zoom
          }
        }}>
          <DialogContent className="sm:max-w-[350px] [&>button]:hidden">
            <DialogTitle className="font-gloria text-lg mb-3">Confirm your pin location:</DialogTitle>
            <p className="text-sm text-gray-600 mb-4">
              {pendingPinLocation ? [pendingPinLocation.city, pendingPinLocation.state, pendingPinLocation.country].filter(Boolean).join(', ') || 'Unknown location' : ''}
            </p>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => {
                setShowConfirmModal(false)
                setPendingPinLocation(null)
                setIsAddingPin(false) // Exit add pin mode, return to pan & zoom
              }} className="font-gloria text-sm">Cancel</Button>
              <Button onClick={confirmAddPin} disabled={isAddingPinLoading} className="font-gloria text-sm" style={{ backgroundColor: selectedPinColor }}>
                {isAddingPinLoading ? 'Adding...' : 'Confirm'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </>
    )
  }