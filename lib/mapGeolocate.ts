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
  if (error && typeof error === "object" && "code" in error) {
    const code = (error as GeolocationPositionError).code
    if (code === 1) {
      return "Location access was denied. Enable location permission for this site in your browser settings."
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
    enableHighAccuracy = true,
    timeout = 15000,
    maximumAge = 0,
    minLocateZoom = 7,
  } = options ?? {}

  return new Promise((resolve, reject) => {
    if (!map) {
      reject(new Error("Map is not ready."))
      return
    }
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      reject(new Error("Geolocation is not supported in this browser."))
      return
    }

    navigator.geolocation.getCurrentPosition(
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
      },
      { enableHighAccuracy, timeout, maximumAge }
    )
  })
}
