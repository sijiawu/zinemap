'use client'

import 'mapbox-gl/dist/mapbox-gl.css'
import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useSupabaseUser } from '@/hooks/useSupabaseUser'
import { supabase } from '@/lib/supabaseClient'
import { HomePin, UserProfile } from '@/lib/types'
import { useToast } from '@/hooks/use-toast'
import { Plus, Minus, LocateFixed } from 'lucide-react'
import {
  enableCompactMapAttribution,
  geolocationErrorMessage,
  panMapToUserLocation,
  syncMapboxHtmlMarkers,
} from '@/lib/mapGeolocate'
import { zinesterSortTimestamp } from '@/lib/utils'
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

const DEFAULT_PIN_HEX = '#f59e0b'

/** Matches ClientRoot main padding under fixed navbar */
const MAIN_NAV_GAP_CLASS = '-mt-16 md:-mt-20 pt-16 md:pt-20'

const SIDEBAR_SELECT_CLASS =
  'w-full rounded-md border border-amber-200 bg-white px-2 py-1.5 text-xs text-stone-700 focus:outline-none focus:ring-2 focus:ring-amber-300'

type ProfileCachePayload = Pick<
  UserProfile,
  'id' | 'display_name' | 'email' | 'permalink' | 'profile_image' | 'bio' | 'roles' | 'open_to'
>

const PIN_PROFILE_FIELDS =
  'id, display_name, email, permalink, profile_image, roles, open_to, updated_at'

const PIN_COLOR_SWATCHES = [
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
  { name: 'Violet', value: '#7c3aed' },
] as const

function normalizeLocationPart(value?: string | null) {
  const t = (value || '').trim()
  return t.length ? t : 'Unspecified'
}

function sortCountEntries(counts: Map<string, number>) {
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([value, count]) => ({ value, count }))
}

/** Count dropdown options where each matching pin increments (location filters). */
function countPinsByNormalizedField(
  pins: HomePin[],
  include: (pin: HomePin) => boolean,
  field: keyof Pick<HomePin, 'country' | 'state' | 'city'>,
) {
  const counts = new Map<string, number>()
  for (const pin of pins) {
    if (!include(pin)) continue
    const raw = normalizeLocationPart(pin[field] as string | undefined)
    counts.set(raw, (counts.get(raw) || 0) + 1)
  }
  return sortCountEntries(counts)
}

/** One increment per distinct user_email per tag (union tags across pins for that email). */
function profileTagCountsByUser(pins: HomePin[], field: 'roles' | 'open_to') {
  const tagsPerUser = new Map<string, Set<string>>()
  for (const pin of pins) {
    const tags = pin.user?.[field]
    if (!tags?.length) continue
    let set = tagsPerUser.get(pin.user_email)
    if (!set) {
      set = new Set()
      tagsPerUser.set(pin.user_email, set)
    }
    for (const t of tags) set.add(t)
  }
  const counts = new Map<string, number>()
  for (const tagSet of tagsPerUser.values()) {
    for (const tag of tagSet) counts.set(tag, (counts.get(tag) || 0) + 1)
  }
  return sortCountEntries(counts)
}

function unwrapPinJoinUser(pin: Record<string, unknown>) {
  const u = pin.user
  const user = Array.isArray(u) ? u[0] : u
  return { ...pin, user } as HomePin
}

export default function ZinestersPage() {
  const { user } = useSupabaseUser()
  const { toast } = useToast()
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<any>(null)
  const mapboxglRef = useRef<any>(null)
  const markersRef = useRef<any[]>([])
  const lastPinsRef = useRef<string>('')
  const isCreatingMarkersRef = useRef(false)
  const suppressScalePinIdRef = useRef<string | null>(null)
  const [pins, setPins] = useState<HomePin[]>([])
  const [isPinsLoading, setIsPinsLoading] = useState(true)
  const [selectedPin, setSelectedPin] = useState<HomePin | null>(null)
  const [isAddingPin, setIsAddingPin] = useState(false)
  const [isAddingPinLoading, setIsAddingPinLoading] = useState(false)
  const [mapReady, setMapReady] = useState(false)
  const [initialLoadComplete, setInitialLoadComplete] = useState(false)
  const [selectedPinColor, setSelectedPinColor] = useState(DEFAULT_PIN_HEX)
  const [profileCache, setProfileCache] = useState<Record<string, ProfileCachePayload>>({})
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
  const [selectedCountry, setSelectedCountry] = useState<string>('all')
  const [selectedState, setSelectedState] = useState<string>('all')
  const [selectedCity, setSelectedCity] = useState<string>('all')
  const [selectedRole, setSelectedRole] = useState<string>('all')
  const [selectedOpenTo, setSelectedOpenTo] = useState<string>('all')
  const [nameSearchInput, setNameSearchInput] = useState('')
  const [appliedNameSearch, setAppliedNameSearch] = useState('')

  // Count pins for current user only
  const userPinCount = user ? pins.filter(pin => pin.user_email === user.email).length : 0

  // Fetch all pins
  const fetchPins = async () => {
    setIsPinsLoading(true)
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
          updated_at,
          user:profiles!home_pins_user_email_fkey(
            ${PIN_PROFILE_FIELDS}
          )
        `)
        .order('updated_at', { ascending: false, nullsFirst: false })

      if (error) throw error
      
      const transformedData = (data || []).map((pin) => unwrapPinJoinUser(pin as Record<string, unknown>))
      
      setPins(transformedData)
      // Support deep-linking from profiles: /zinesters?pin=<home_pin_id>
      if (typeof window !== 'undefined') {
        const targetPinId = new URLSearchParams(window.location.search).get('pin')
        if (targetPinId) {
          const targetPin = transformedData.find(pin => pin.id === targetPinId)
          if (targetPin) {
            // Keep the deep-linked pin at normal size on initial load.
            suppressScalePinIdRef.current = targetPin.id
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
    } finally {
      setIsPinsLoading(false)
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
      }).select(`id, user_email, latitude, longitude, color, city, state, country, created_at, user:profiles!home_pins_user_email_fkey(${PIN_PROFILE_FIELDS})`).single()
      if (error) throw error
      setPins(prev => [{ ...unwrapPinJoinUser(data as Record<string, unknown>) }, ...prev])
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


  const fetchFullProfile = async (
    userEmail: string,
  ): Promise<ProfileCachePayload | null> => {
    const cached = profileCache[userEmail]
    if (cached) return cached

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, display_name, email, permalink, profile_image, bio, roles, open_to')
        .eq('email', userEmail)
        .single()

      if (error) throw error
      const payload = data as ProfileCachePayload
      setProfileCache((prev) => ({ ...prev, [userEmail]: payload }))
      return payload
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

  const getPinLocationText = (pin: HomePin) => {
    const locationParts = [pin.city, pin.state, pin.country].filter(Boolean)
    return locationParts.length ? locationParts.join(', ') : 'Location not specified'
  }

  const mergeUniquePreserveOrder = (base: string[], incoming?: string[] | null) => {
    const next = [...base]
    const seen = new Set(next)
    for (const item of incoming || []) {
      if (!seen.has(item)) {
        seen.add(item)
        next.push(item)
      }
    }
    return next
  }

  const countryOptions = useMemo(
    () => countPinsByNormalizedField(pins, () => true, 'country'),
    [pins],
  )

  const stateOptions = useMemo(
    () =>
      countPinsByNormalizedField(
        pins,
        (pin) =>
          selectedCountry === 'all' ||
          normalizeLocationPart(pin.country) === selectedCountry,
        'state',
      ),
    [pins, selectedCountry],
  )

  const cityOptions = useMemo(
    () =>
      countPinsByNormalizedField(
        pins,
        (pin) =>
          (selectedCountry === 'all' ||
            normalizeLocationPart(pin.country) === selectedCountry) &&
          (selectedState === 'all' ||
            normalizeLocationPart(pin.state) === selectedState),
        'city',
      ),
    [pins, selectedCountry, selectedState],
  )

  const roleOptions = useMemo(() => profileTagCountsByUser(pins, 'roles'), [pins])

  const openToOptions = useMemo(() => profileTagCountsByUser(pins, 'open_to'), [pins])

  const filteredPins = useMemo(() => {
    const query = appliedNameSearch.trim().toLowerCase()
    return pins.filter((pin) => {
      const countryMatch = selectedCountry === 'all' || normalizeLocationPart(pin.country) === selectedCountry
      const stateMatch = selectedState === 'all' || normalizeLocationPart(pin.state) === selectedState
      const cityMatch = selectedCity === 'all' || normalizeLocationPart(pin.city) === selectedCity
      const roleMatch = selectedRole === 'all' || (pin.user?.roles || []).includes(selectedRole)
      const openToMatch = selectedOpenTo === 'all' || (pin.user?.open_to || []).includes(selectedOpenTo)
      const displayName = (pin.user?.display_name || 'Anonymous Zinester').toLowerCase()
      const nameMatch = !query || displayName.includes(query)
      return countryMatch && stateMatch && cityMatch && roleMatch && openToMatch && nameMatch
    })
  }, [pins, selectedCountry, selectedState, selectedCity, selectedRole, selectedOpenTo, appliedNameSearch])

  const userCards = useMemo(() => {
    const byEmail = new Map<string, {
      userEmail: string
      displayName: string
      profileImage: string
      roles: string[]
      openTo: string[]
      pins: HomePin[]
      locationLabels: string[]
      sortUpdatedAt: number
    }>()

    filteredPins.forEach((pin) => {
      const key = pin.user_email
      const locationLabel = getPinLocationText(pin)
      const pinUpdatedAt = zinesterSortTimestamp(pin)
      const existing = byEmail.get(key)

      if (!existing) {
        byEmail.set(key, {
          userEmail: key,
          displayName: pin.user?.display_name || 'Anonymous Zinester',
          profileImage: pin.user?.profile_image || '/placeholder-user.jpg',
          roles: pin.user?.roles || [],
          openTo: pin.user?.open_to || [],
          pins: [pin],
          locationLabels: [locationLabel],
          sortUpdatedAt: pinUpdatedAt,
        })
        return
      }

      existing.pins.push(pin)
      existing.sortUpdatedAt = Math.max(existing.sortUpdatedAt, pinUpdatedAt)
      if (!existing.locationLabels.includes(locationLabel)) {
        existing.locationLabels.push(locationLabel)
      }
      existing.roles = mergeUniquePreserveOrder(existing.roles, pin.user?.roles)
      existing.openTo = mergeUniquePreserveOrder(existing.openTo, pin.user?.open_to)
    })

    return Array.from(byEmail.values()).sort((a, b) => b.sortUpdatedAt - a.sortUpdatedAt)
  }, [filteredPins])

  const filteredPinIds = useMemo(() => new Set(filteredPins.map((pin) => pin.id)), [filteredPins])

  const resetSidebarFilters = useCallback(() => {
    setSelectedCountry('all')
    setSelectedState('all')
    setSelectedCity('all')
    setSelectedRole('all')
    setSelectedOpenTo('all')
    setNameSearchInput('')
    setAppliedNameSearch('')
  }, [])

  useEffect(() => {
    setSelectedState('all')
    setSelectedCity('all')
  }, [selectedCountry])

  useEffect(() => {
    setSelectedCity('all')
  }, [selectedState])

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
    // Manual pin interactions should restore normal active scaling behavior.
    suppressScalePinIdRef.current = null
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

  const easeZoomKeepingSelectedPinOnScreen = (newZoom: number) => {
    if (!map.current || !selectedPin || selectedPin.latitude == null || selectedPin.longitude == null) {
      return false
    }
    const lat = Number(selectedPin.latitude)
    const lng = Number(selectedPin.longitude)
    if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) return false

    try {
      const currentZoom = map.current.getZoom()
      const markerLngLat = [lng, lat]
      const currentCenter = map.current.getCenter()
      const currentCenterPoint = map.current.project(currentCenter)
      const markerPoint = map.current.project(markerLngLat)
      const offsetX = markerPoint.x - currentCenterPoint.x
      const offsetY = markerPoint.y - currentCenterPoint.y
      const scale = Math.pow(2, newZoom - currentZoom)
      const newOffsetX = offsetX / scale
      const newOffsetY = offsetY / scale
      const newCenterPoint = { x: markerPoint.x - newOffsetX, y: markerPoint.y - newOffsetY }
      const newCenter = map.current.unproject([newCenterPoint.x, newCenterPoint.y])

      map.current.easeTo({
        center: newCenter,
        zoom: newZoom,
        duration: 600,
        easing: (t: number) => t * (2 - t),
      })
      return true
    } catch (error) {
      console.error('Error calculating zoom around marker:', error)
      return false
    }
  }

  const zoomIn = () => {
    if (!map.current) return
    const newZoom = map.current.getZoom() + 1
    if (!easeZoomKeepingSelectedPinOnScreen(newZoom)) map.current.zoomTo(newZoom, { duration: 300 })
  }

  const zoomOut = () => {
    if (!map.current) return
    const newZoom = map.current.getZoom() - 1
    if (!easeZoomKeepingSelectedPinOnScreen(newZoom)) map.current.zoomTo(newZoom, { duration: 300 })
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
          attributionControl: false,
        })
        enableCompactMapAttribution(map.current, mapboxgl)

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
    filteredPins.forEach((pin) => {
      const el = document.createElement('div')
      el.className = 'pin-marker'
      el.setAttribute('data-pin-id', pin.id)
      
      // Create pin-shaped marker with user avatar
      const isActive = selectedPin?.id === pin.id
      const suppressScale = suppressScalePinIdRef.current === pin.id
      const shouldScaleActive = isActive && !suppressScale
      const pinSize = shouldScaleActive ? '47px' : '36px' // 20% bigger: 39px*1.2=47px, 30px*1.2=36px
      const avatarSize = shouldScaleActive ? '31px' : '24px' // 20% bigger: 26px*1.2=31px, 20px*1.2=24px
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
            background: ${pin.color || DEFAULT_PIN_HEX};
            border-radius: 50% 50% 50% 0;
            transform: rotate(-45deg);
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
            display: flex;
            align-items: center;
            justify-content: center;
            background-image: url('${pin.user?.profile_image || '/placeholder-user.jpg'}');
            background-size: cover;
            background-position: center;
            border: 3px solid ${pin.color || DEFAULT_PIN_HEX};
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
    lastPinsRef.current = filteredPins.map(p => p.id).join(',')
    
    // Set initial load complete after a short delay to ensure smooth transition
    if (!initialLoadComplete) {
      setTimeout(() => {
        setInitialLoadComplete(true)
      }, 200)
    }
  }, [filteredPins, initialLoadComplete])

  // Effect to manage markers
  useEffect(() => {
    if (!mapReady || !map.current || !mapboxglRef.current) return

    const currentPinsSignature = filteredPins.map((pin) => pin.id).join(',')

    if (lastPinsRef.current !== currentPinsSignature) {
      const timer = setTimeout(() => {
        createMarkers()
      }, 100)

      return () => clearTimeout(timer)
    }
  }, [mapReady, filteredPins, createMarkers, selectedPin])

  useEffect(() => {
    if (selectedPin && !filteredPinIds.has(selectedPin.id)) {
      const fallbackPin = filteredPins.find((pin) => pin.user_email === selectedPin.user_email)
      setSelectedPin(fallbackPin || null)
    }
  }, [filteredPinIds, filteredPins, selectedPin])

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
      {/* Pull cream backdrop into ClientRoot navbar offset */}
      <div className={`${MAIN_NAV_GAP_CLASS} min-h-screen bg-gradient-to-br from-amber-50 to-orange-100`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-gloria text-amber-800 mb-4">
            Join the map!
          </h1>
          <p className="text-lg text-amber-700 max-w-4xl mx-auto">
            ZineMap's mapping the global zine scene, and it wouldn't be complete without you!
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 lg:gap-6 items-stretch">
          <aside className="h-[75vh] sm:h-[600px] rounded-lg border border-amber-200 bg-white/80 backdrop-blur-sm p-3 shadow-sm lg:col-span-1 flex flex-col">
            <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-stretch">
              <input
                type="search"
                value={nameSearchInput}
                onChange={(e) => setNameSearchInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    setAppliedNameSearch(nameSearchInput.trim())
                  }
                }}
                placeholder="Search zinester by name"
                className="min-w-0 flex-1 rounded-md border border-amber-200 bg-white px-2.5 py-1.5 text-sm text-stone-800 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-300"
                aria-label="Search zinester by name"
              />
              <div className="flex shrink-0 gap-2">
                <button
                  type="button"
                  onClick={() => setAppliedNameSearch(nameSearchInput.trim())}
                  className="px-4 py-2 rounded-lg font-gloria text-sm transition-all whitespace-nowrap bg-amber-500 text-white hover:bg-amber-600"
                >
                  Search
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setNameSearchInput('')
                    setAppliedNameSearch('')
                  }}
                  className="px-4 py-2 rounded-lg font-gloria text-sm transition-all whitespace-nowrap border border-amber-300 bg-white text-amber-800 hover:bg-amber-50"
                >
                  Reset
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 mb-3">
              <select
                value={selectedCountry}
                onChange={(event) => setSelectedCountry(event.target.value)}
                className={SIDEBAR_SELECT_CLASS}
                aria-label="Filter by country"
              >
                <option value="all">Country: All</option>
                {countryOptions.map(({ value, count }) => (
                  <option key={value} value={value}>
                    {value} ({count})
                  </option>
                ))}
              </select>

              <select
                value={selectedState}
                onChange={(event) => setSelectedState(event.target.value)}
                className={SIDEBAR_SELECT_CLASS}
                aria-label="Filter by state or province"
              >
                <option value="all">State/Prov: All</option>
                {stateOptions.map(({ value, count }) => (
                  <option key={value} value={value}>
                    {value} ({count})
                  </option>
                ))}
              </select>

              <select
                value={selectedCity}
                onChange={(event) => setSelectedCity(event.target.value)}
                className={SIDEBAR_SELECT_CLASS}
                aria-label="Filter by city"
              >
                <option value="all">City: All</option>
                {cityOptions.map(({ value, count }) => (
                  <option key={value} value={value}>
                    {value} ({count})
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={resetSidebarFilters}
                className="rounded-md border border-amber-200 bg-white px-2 py-1.5 text-xs text-amber-800 hover:bg-amber-50 transition-colors"
              >
                Reset filters
              </button>
            </div>

            <div className="grid grid-cols-1 gap-2 mb-3">
              <select
                value={selectedRole}
                onChange={(event) => setSelectedRole(event.target.value)}
                className={SIDEBAR_SELECT_CLASS}
                aria-label="Filter by role tag"
              >
                <option value="all">Role: All</option>
                {roleOptions.map(({ value, count }) => (
                  <option key={value} value={value}>
                    {value} ({count})
                  </option>
                ))}
              </select>

              <select
                value={selectedOpenTo}
                onChange={(event) => setSelectedOpenTo(event.target.value)}
                className={SIDEBAR_SELECT_CLASS}
                aria-label="Filter by open-to tag"
              >
                <option value="all">Open to: All</option>
                {openToOptions.map(({ value, count }) => (
                  <option key={value} value={value}>
                    {value} ({count})
                  </option>
                ))}
              </select>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto pr-1 space-y-2">
              {userCards.map((card) => {
                const primaryPin = card.pins.find((pin) => pin.id === selectedPin?.id) || card.pins[0]
                const isActiveUser = selectedPin?.user_email === card.userEmail
                return (
                  <button
                    key={card.userEmail}
                    type="button"
                    onClick={() => handlePinClick(primaryPin)}
                    className={`w-full rounded-lg border px-3 py-2 text-left transition-colors ${
                      isActiveUser
                        ? 'border-amber-500 bg-amber-100/70'
                        : 'border-amber-100 bg-white hover:border-amber-300 hover:bg-amber-50'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <span className="relative h-9 w-9 shrink-0 overflow-hidden rounded-full border border-stone-200 bg-stone-100">
                        <img
                          src={card.profileImage}
                          alt={card.displayName}
                          className="h-full w-full object-cover"
                        />
                      </span>
                      <div className="min-w-0">
                        <p className="font-medium text-stone-800 truncate">
                          {card.displayName}
                        </p>
                        <p className="text-xs text-stone-500 truncate">
                          {card.locationLabels.length <= 2
                            ? card.locationLabels.join(' • ')
                            : `${card.locationLabels[0]} • ${card.locationLabels[1]} +${card.locationLabels.length - 2}`}
                        </p>
                        {!!card.roles.length && (
                          <p className="text-[11px] text-amber-700 mt-1 line-clamp-2">
                            {card.roles.join(' · ')}
                          </p>
                        )}
                        {!!card.openTo.length && (
                          <p className="text-[11px] text-stone-600 mt-0.5 line-clamp-2">
                            Reach out for: {card.openTo.join(' · ')}
                          </p>
                        )}
                      </div>
                    </div>
                  </button>
                )
              })}
              {isPinsLoading ? (
                <p className="rounded-md border border-dashed border-amber-200 bg-white px-3 py-6 text-center text-sm text-stone-500">
                  Loading...
                </p>
              ) : !userCards.length ? (
                <p className="rounded-md border border-dashed border-amber-200 bg-white px-3 py-6 text-center text-sm text-stone-500">
                  No zinesters match these filters yet.
                </p>
              ) : null}
            </div>
          </aside>

          <div className={`h-[75vh] sm:h-[600px] relative rounded-lg overflow-hidden border border-gray-200 shadow-lg map-container lg:col-span-2 ${initialLoadComplete ? 'ready' : ''}`}>
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
                type="button"
                onClick={() => {
                  setSelectedPin(null)
                }}
                className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                ✕
              </button>

              {/* Profile header */}
              <div className="flex items-center space-x-3 mb-3 pr-6">
                <span
                  className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full border-2 bg-stone-100"
                  style={{ borderColor: selectedPin.color || DEFAULT_PIN_HEX }}
                >
                  <img
                    src={selectedPin.user?.profile_image || '/placeholder-user.jpg'}
                    alt={selectedPin.user?.display_name || 'User'}
                    className="h-full w-full object-cover"
                  />
                </span>
                <div className="flex-1 min-w-0">
                  {selectedPin.user?.permalink ? (
                    <a
                      href={user && selectedPin.user_email === user.email ? '/profile' : `/profile/${selectedPin.user.permalink}`}
                      className="font-gloria text-lg hover:opacity-80 transition-opacity truncate block"
                      style={{ color: selectedPin.color || DEFAULT_PIN_HEX }}
                    >
                      {selectedPin.user?.display_name || 'Anonymous Zinester'}
                    </a>
                  ) : (
                    <h3 
                      className="font-gloria text-lg truncate"
                      style={{ color: selectedPin.color || DEFAULT_PIN_HEX }}
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
                        color: selectedPin.color || DEFAULT_PIN_HEX,
                        borderColor: selectedPin.color || DEFAULT_PIN_HEX,
                        backgroundColor: hexToRgba(selectedPin.color || DEFAULT_PIN_HEX, 0.14),
                      }}
                    >
                      {role}
                    </span>
                  ))}
                </div>
              )}

              {!loadingProfile && selectedPin.user?.open_to && selectedPin.user.open_to.length > 0 && (
                <div className="mb-3">
                  <p className="text-xs font-medium text-stone-600 mb-1.5">Reach out for:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedPin.user.open_to.map((item, index) => (
                      <span
                        key={`${item}-${index}`}
                        className="rounded-full border border-stone-300 bg-stone-100 px-2 py-0.5 text-xs font-medium text-stone-700"
                      >
                        {item}
                      </span>
                    ))}
                  </div>
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
                    style={{ backgroundColor: selectedPin.color || DEFAULT_PIN_HEX }}
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
                      {PIN_COLOR_SWATCHES.map((color) => (
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
              className="relative hidden h-[34px] w-[34px] cursor-pointer touch-manipulation items-center justify-center rounded-lg border border-gray-200 bg-white p-0 shadow-md transition-colors before:absolute before:-inset-1.5 before:content-[''] hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 sm:flex"
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

          {isAddingPin && (
            <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm rounded-lg p-3 shadow-lg z-30">
              <p className="text-sm text-gray-700 font-gloria">
                {isGeocoding ? 'Getting location...' : isAddingPinLoading ? 'Adding your pin...' : 'Click anywhere on the map to drop your pin!'}
              </p>
            </div>
          )}
        </div>

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