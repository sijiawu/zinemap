import type { Event, Library, Store } from "@/lib/types"
import type mapboxgl from "mapbox-gl"

export type LocationPinType = "store" | "library" | "event"

export const PIN_COLORS: Record<LocationPinType, string> = {
  store: "#e11d48",
  library: "#3b82f6",
  event: "#009035",
}

export function getIconPaths(type: LocationPinType): string[] {
  switch (type) {
    case "store":
      return [
        "m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7",
        "M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8",
        "M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4",
        "M2 7h20",
        "M22 7v3a2 2 0 0 1-2 2a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 16 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 12 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 8 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 4 12a2 2 0 0 1-2-2V7",
      ]
    case "library":
      return [
        "M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z",
        "M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z",
      ]
    case "event":
      return [
        "M8 2v4",
        "M16 2v4",
        "M3 10h18",
        "M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z",
      ]
    default:
      return [
        "M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z",
      ]
  }
}

export function createPinMarker(
  color: string,
  type: LocationPinType,
  isActive = false
): string {
  const size = isActive ? "42px" : "29px"
  const circleSize = isActive ? "26px" : "22px"
  const iconSize = isActive ? "17px" : "12px"
  const borderSize = isActive ? "3px" : "0px"
  const groundShadowSize = isActive ? "12px" : "7px"
  const groundShadowBlur = isActive ? "4px" : "2px"
  const iconPaths = getIconPaths(type)

  return `
      <div style="
        width: ${size};
        height: ${size};
        position: relative;
        cursor: pointer;
        transform: translate(-50%, -100%);
        z-index: ${isActive ? "5" : "1"};
      ">
        <div style="
          position: absolute;
          bottom: -${groundShadowSize};
          left: 50%;
          transform: translateX(-50%);
          width: ${groundShadowSize};
          height: ${groundShadowSize};
          background: rgba(0, 0, 0, 0.22);
          border-radius: 50%;
          box-shadow: 0 0 ${groundShadowBlur} rgba(0, 0, 0, 0.35);
          pointer-events: none;
        "></div>
        <div style="
          width: ${size};
          height: ${size};
          background: ${color};
          border: ${borderSize} solid white;
          border-radius: 50% 50% 50% 0;
          transform: rotate(-45deg);
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
        ">
          <div style="
            transform: rotate(45deg);
            display: flex;
            align-items: center;
            justify-content: center;
            width: ${circleSize};
            height: ${circleSize};
            background: white;
            border-radius: 50%;
            box-shadow: 0 1px 3px rgba(0,0,0,0.2);
          ">
            <svg width="${iconSize}" height="${iconSize}" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24">
              ${iconPaths.map((path) => `<path d="${path}"/>`).join("")}
            </svg>
          </div>
        </div>
      </div>
    `
}

export type MapPinEntry = {
  key: string
  type: LocationPinType
  latitude: number
  longitude: number
  created_at: string
}

export function buildMapPinEntries(
  stores: Store[],
  libraries: Library[],
  events: Event[]
): MapPinEntry[] {
  const entries: MapPinEntry[] = []

  for (const store of stores) {
    if (!store.latitude || !store.longitude) continue
    entries.push({
      key: `store:${store.id}`,
      type: "store",
      latitude: store.latitude,
      longitude: store.longitude,
      created_at: store.created_at,
    })
  }

  for (const library of libraries) {
    if (!library.latitude || !library.longitude) continue
    entries.push({
      key: `library:${library.id}`,
      type: "library",
      latitude: library.latitude,
      longitude: library.longitude,
      created_at: library.created_at,
    })
  }

  for (const event of events) {
    if (!event.latitude || !event.longitude) continue
    entries.push({
      key: `event:${event.id}`,
      type: "event",
      latitude: event.latitude,
      longitude: event.longitude,
      created_at: event.created_at,
    })
  }

  return entries
}

export function buildStackZByKey(entries: MapPinEntry[]): Map<string, number> {
  const sorted = [...entries].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  )
  const stackZByKey = new Map<string, number>()
  let stackZi = 2
  for (const row of sorted) {
    stackZByKey.set(row.key, stackZi++)
  }
  return stackZByKey
}

export function fitMapToPinCoords(
  map: mapboxgl.Map,
  coords: [number, number][],
  options?: { padding?: number; maxZoom?: number }
) {
  if (coords.length === 0) return

  const lngs = coords.map((c) => c[0])
  const lats = coords.map((c) => c[1])
  const sw: [number, number] = [Math.min(...lngs), Math.min(...lats)]
  const ne: [number, number] = [Math.max(...lngs), Math.max(...lats)]
  const pad = 0.001
  if (sw[0] === ne[0]) {
    sw[0] -= pad
    ne[0] += pad
  }
  if (sw[1] === ne[1]) {
    sw[1] -= pad
    ne[1] += pad
  }

  map.fitBounds([sw, ne], {
    padding: options?.padding ?? 40,
    maxZoom: options?.maxZoom ?? 14,
    duration: 0,
  })
}

export function addMapPinMarkers(
  map: mapboxgl.Map,
  mapboxgl: typeof import("mapbox-gl"),
  entries: MapPinEntry[],
  stackZByKey: Map<string, number>
): mapboxgl.Marker[] {
  const markers: mapboxgl.Marker[] = []

  for (const entry of entries) {
    const markerEl = document.createElement("div")
    const color = PIN_COLORS[entry.type]
    markerEl.innerHTML = createPinMarker(color, entry.type, false)
    const baseZ = stackZByKey.get(entry.key) ?? 2
    markerEl.style.zIndex = String(baseZ)

    const marker = new mapboxgl.Marker(markerEl)
      .setLngLat([entry.longitude, entry.latitude])
      .addTo(map)

    markers.push(marker)
  }

  return markers
}
