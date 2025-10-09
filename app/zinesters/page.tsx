'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useSupabaseUser } from '@/hooks/useSupabaseUser'
import { supabase } from '@/lib/supabaseClient'
import { HomePin } from '@/lib/types'
import { useToast } from '@/hooks/use-toast'
import { Plus, Minus } from 'lucide-react'
import { useRouter } from 'next/navigation'

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
    } catch (error) {
      console.error('Error fetching pins:', error)
      toast({
        title: "Error",
        description: "Failed to load pins",
        variant: "destructive",
      })
    }
  }

  // Add a new pin
  const handleAddPin = async (lat: number, lng: number, clickX: number, clickY: number) => {
    if (!user) return

    // Validate coordinates - check if they're within valid earth bounds
    if (!lat || !lng || isNaN(lat) || isNaN(lng) || 
        lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      toast({
        title: "Invalid Location",
        description: "Please click on a valid location on the map to add your pin.",
        variant: "destructive",
      })
      setIsAddingPin(false)
      return
    }

    // Check if user already has 5 pins
    if (userPinCount >= 5) {
      toast({
        title: "Pin Limit Reached",
        description: "You can only have up to 5 pins. Delete an existing pin to add a new one.",
        variant: "destructive",
      })
      setIsAddingPin(false)
      return
    }

    setIsAddingPinLoading(true)

    try {
      // Reverse geocode to get city, state, country
      const geocodingResponse = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${process.env.NEXT_PUBLIC_MAPBOX_TOKEN}&types=place,region,country`
      )
      const geocodingData = await geocodingResponse.json()
      
      let city = ''
      let state = ''
      let country = ''
      
      if (geocodingData.features && geocodingData.features.length > 0) {
        const features = geocodingData.features
        
        // Find city (place)
        const cityFeature = features.find((f: any) => f.place_type.includes('place'))
        if (cityFeature) {
          city = cityFeature.text
        }
        
        // Find state/region
        const stateFeature = features.find((f: any) => f.place_type.includes('region'))
        if (stateFeature) {
          state = stateFeature.text
        }
        
        // Find country
        const countryFeature = features.find((f: any) => f.place_type.includes('country'))
        if (countryFeature) {
          country = countryFeature.text
        }
      }

      const { data, error } = await supabase
        .from('home_pins')
        .insert({
          user_email: user.email,
          latitude: lat,
          longitude: lng,
          color: selectedPinColor,
          city: city,
          state: state,
          country: country
        })
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
        .single()

      if (error) {
        console.error('Database error:', error)
        throw error
      }

      // Transform data to match HomePin interface
      const transformedData = {
        ...data,
        user: Array.isArray(data.user) ? data.user[0] : data.user
      }

      setPins(prev => [transformedData, ...prev])
      setIsAddingPin(false)
      toast({
        title: "Success",
        description: "Pin added successfully!",
      })
    } catch (error) {
      console.error('Error adding pin:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      toast({
        title: "Error",
        description: `Failed to add pin: ${errorMessage}`,
        variant: "destructive",
      })
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
        .select('id, display_name, email, permalink, profile_image, bio')
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
    } finally {
      setLoadingProfile(false)
    }
  }

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
          center: [0, 20],
          zoom: 2,
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
      const pinSize = isActive ? '39px' : '30px' // 30% larger: 30 * 1.3 = 39px
      const avatarSize = isActive ? '26px' : '20px' // 30% larger: 20 * 1.3 = 26px
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
            Like the world map in every hostel, this one's for all the zinesters and indie creators out there.<br />
            Think of it as a zinester directory in map form.<br />
            Drop up to five pins to mark places you call home or feel connected to.<br />
            ZineMap's mapping the global zine scene, and it wouldn't be complete without you!
          </p>
        </div>

        <div className={`h-[600px] relative rounded-lg overflow-hidden border border-gray-200 shadow-lg map-container ${initialLoadComplete ? 'ready' : ''}`}>
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
                if (!user || isAddingPinLoading) return
                
                // Get click coordinates relative to the map container
                const rect = mapContainer.current?.getBoundingClientRect()
                if (!rect) return
                
                const clickX = e.clientX - rect.left
                const clickY = e.clientY - rect.top
                
                // Convert screen coordinates to map coordinates
                if (map.current) {
                  const lngLat = map.current.unproject([clickX, clickY])
                  handleAddPin(lngLat.lat, lngLat.lng, clickX, clickY)
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
              className="absolute z-50 bg-white rounded-lg shadow-xl border border-gray-200 p-4 w-80 max-h-96 overflow-y-auto"
              style={{
                left: '20px',
                top: '20px',
              }}
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
          
          {/* Add Pin Button */}
          <div className="absolute top-4 right-16 flex flex-col gap-2 z-50">
            {user ? (
              <>
                {/* Color Picker */}
                {isAddingPin && (
                  <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-3 z-50">
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
                  onClick={() => setIsAddingPin(!isAddingPin)}
                  disabled={isAddingPinLoading || userPinCount >= 5}
                  className={`px-4 py-2 rounded-lg font-gloria text-sm transition-all ${
                    isAddingPinLoading || userPinCount >= 5
                      ? 'bg-gray-400 text-white cursor-not-allowed'
                      : isAddingPin 
                      ? 'bg-red-500 text-white hover:bg-red-600' 
                      : 'bg-amber-500 text-white hover:bg-amber-600'
                  }`}
                  title={userPinCount >= 5 ? 'Pin limit reached (5/5)' : ''}
                >
                  {isAddingPinLoading ? 'Adding...' : isAddingPin ? 'Cancel' : userPinCount >= 5 ? 'Pin Limit (5/5)' : `Add Pin (${userPinCount}/5)`}
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
          </div>

          {/* Zoom Controls */}
          <div className="absolute top-4 right-4 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
            <div className="flex flex-col">
              <button
                onClick={zoomIn}
                className="p-2 hover:bg-gray-50 transition-colors border-b border-gray-200 rounded-t-lg"
                title="Zoom in"
              >
                <Plus className="h-4 w-4 text-gray-700" />
              </button>
              <button
                onClick={zoomOut}
                className="p-2 hover:bg-gray-50 transition-colors rounded-b-lg"
                title="Zoom out"
              >
                <Minus className="h-4 w-4 text-gray-700" />
              </button>
            </div>
          </div>

          {/* Instructions */}
          {isAddingPin && (
            <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm rounded-lg p-3 shadow-lg">
              <p className="text-sm text-gray-700 font-gloria">
                {isAddingPinLoading ? 'Adding your pin...' : 'Click anywhere on the map to drop your pin!'}
              </p>
            </div>
          )}

        </div>


      </div>
      </div>
    </>
  )
}