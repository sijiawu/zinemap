/**
 * Pan a Mapbox GL map to the user's position and zoom in if the view is too wide.
 * Call only from a user gesture (e.g. button click) so the browser can prompt for permission.
 */

/** Minimal map surface used for geolocate pan; real Mapbox maps also have `.once`. */
export type MapboxPanMap = {
  getZoom: () => number
  easeTo: (options: {
    center: [number, number]
    zoom: number
    duration?: number
  }) => void
  /** Mapbox Map — used to wait for the camera animation before resolving */
  once?: (type: string, listener: (e?: unknown) => void) => void
}

type MapboxAttributionMap = {
  addControl: (control: unknown, position?: "top-left" | "top-right" | "bottom-left" | "bottom-right") => void
  getContainer: () => HTMLElement
}

type MapboxAttributionModule = {
  AttributionControl: new (options?: { compact?: boolean }) => unknown
}

/**
 * Keep attribution tucked as the compact info button in the bottom-right corner.
 */
export function enableCompactMapAttribution(
  map: MapboxAttributionMap,
  mapboxgl: MapboxAttributionModule
): void {
  map.addControl(new mapboxgl.AttributionControl({ compact: true }), "bottom-right")
  map.getContainer().classList.add("zinemap-compact-attribution")
}

/**
 * Forces Mapbox HTML markers to recompute screen position after camera changes.
 * Without this, some browsers leave duplicate/stuck pins along the viewport edge after pan/zoom.
 */
export function syncMapboxHtmlMarkers(
  markers: Array<{
    getLngLat: () => { lng: number; lat: number }
    setLngLat: (lngLat: { lng: number; lat: number }) => unknown
  }>
): void {
  for (const marker of markers) {
    try {
      const ll = marker.getLngLat()
      marker.setLngLat(ll)
    } catch {
      // ignore
    }
  }
}

export function geolocationErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message === "Location requires a secure context (HTTPS).") {
    return "Location requires HTTPS. Open the secure site URL and try again."
  }
  if (error && typeof error === "object" && "code" in error) {
    const code = (error as GeolocationPositionError).code
    if (code === 1) {
      return "Location access was denied. Enable location permission for this site and browser in your device settings."
    }
    if (code === 2) {
      return "Your position could not be determined. Try again or check device location services."
    }
    if (code === 3) {
      return "Location request timed out. Try again."
    }
  }
  if (error instanceof Error) {
    return error.message
  }
  return "Could not get your location."
}

/** Phones often time out with high accuracy + no cache; desktop devtools "mobile" does not mimic that. */
function prefersRelaxedGeolocationDefaults(): boolean {
  if (typeof navigator === "undefined" || typeof window === "undefined") return false
  if (navigator.maxTouchPoints > 0) return true
  try {
    return window.matchMedia("(pointer: coarse)").matches
  } catch {
    return false
  }
}

function requestCurrentPosition(options: PositionOptions): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, options)
  })
}

function canRetryWithRelaxedDefaults(error: unknown): boolean {
  if (!error || typeof error !== "object" || !("code" in error)) return false
  const code = (error as GeolocationPositionError).code
  return code === 2 || code === 3
}

export function panMapToUserLocation(
  map: MapboxPanMap | null | undefined,
  options?: {
    /** ms */
    duration?: number
    enableHighAccuracy?: boolean
    timeout?: number
    maximumAge?: number
    /**
     * After centering on the user, use at least this zoom (roughly state / region scale).
     * If the map is already closer, zoom is unchanged.
     */
    minLocateZoom?: number
  }
): Promise<void> {
  const {
    duration = 900,
    minLocateZoom = 7,
  } = options ?? {}

  const hasExplicitGeoOptions =
    options?.enableHighAccuracy !== undefined ||
    options?.timeout !== undefined ||
    options?.maximumAge !== undefined

  const relaxed = prefersRelaxedGeolocationDefaults()
  const enableHighAccuracy = options?.enableHighAccuracy ?? !relaxed
  const timeout = options?.timeout ?? (relaxed ? 25_000 : 15_000)
  const maximumAge = options?.maximumAge ?? (relaxed ? 120_000 : 0)

  return new Promise((resolve, reject) => {
    if (!map) {
      reject(new Error("Map is not ready."))
      return
    }
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      reject(new Error("Geolocation is not supported in this browser."))
      return
    }
    if (typeof window !== "undefined" && !window.isSecureContext) {
      reject(new Error("Location requires a secure context (HTTPS)."))
      return
    }

    const primaryOptions: PositionOptions = {
      enableHighAccuracy,
      timeout,
      maximumAge,
    }
    const relaxedOptions: PositionOptions = {
      enableHighAccuracy: false,
      timeout: Math.max(timeout, 30_000),
      maximumAge: Math.max(maximumAge, 300_000),
    }

    const locate = async (): Promise<GeolocationPosition> => {
      try {
        return await requestCurrentPosition(primaryOptions)
      } catch (error) {
        if (hasExplicitGeoOptions || !canRetryWithRelaxedDefaults(error)) {
          throw error
        }
        return requestCurrentPosition(relaxedOptions)
      }
    }

    void locate().then(
      (position) => {
        const { longitude, latitude } = position.coords
        if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) {
          reject(new Error("Invalid coordinates from device."))
          return
        }

        let settled = false
        const finish = () => {
          if (settled) return
          settled = true
          resolve()
        }
        const fallbackMs = duration + 200
        const fallback =
          typeof window !== "undefined"
            ? window.setTimeout(finish, fallbackMs)
            : undefined

        // Listen before easeTo so we never miss a synchronous moveend; fallback covers edge cases.
        if (typeof map.once === "function") {
          map.once("moveend", () => {
            if (fallback !== undefined) window.clearTimeout(fallback)
            finish()
          })
        }

        const zoom = Math.max(map.getZoom(), minLocateZoom)

        map.easeTo({
          center: [longitude, latitude],
          zoom,
          duration,
        })
      },
      (err) => {
        reject(err)
      }
    )
  })
}
