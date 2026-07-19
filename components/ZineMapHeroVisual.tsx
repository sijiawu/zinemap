"use client"

import "mapbox-gl/dist/mapbox-gl.css"

import { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { enableCompactMapAttribution } from "@/lib/mapGeolocate"

type PinType = "store" | "library" | "event"

export interface HeroBusyPin {
  id: string
  type: PinType
  latitude: number
  longitude: number
}

export interface HeroFeaturedPin {
  id: string
  type: PinType
  title: string
  permalink: string | null
  city: string | null
  state: string | null
  country: string | null
  notes: string | null
  tags: string[]
  addedBy: string | null
  addedByPermalink: string | null
  posterImage: string | null
  createdAt: string
  latitude: number
  longitude: number
}

interface ZineMapHeroVisualProps {
  className?: string
  busyPins: HeroBusyPin[]
  featuredPins: HeroFeaturedPin[]
}

const TYPE_COLOR: Record<PinType, string> = {
  store: "#e11d48",
  library: "#3b82f6",
  event: "#009035",
}

const TYPE_HOVER_COLOR: Record<PinType, string> = {
  store: "#f43f5e",
  library: "#2563eb",
  event: "#16a34a",
}

function locationLabel(item: HeroFeaturedPin) {
  return [item.city, item.state, item.country].filter(Boolean).join(", ")
}

function relativeAddedAt(timestamp: string) {
  const value = new Date(timestamp)
  if (Number.isNaN(value.getTime())) return "Recently added"

  const diffMs = Date.now() - value.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  if (diffDays <= 0) return "Added today"
  if (diffDays === 1) return "Added yesterday"
  if (diffDays < 7) return `Added ${diffDays} days ago`
  if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7)
    return `Added ${weeks} week${weeks === 1 ? "" : "s"} ago`
  }
  const months = Math.floor(diffDays / 30)
  return `Added ${months} month${months === 1 ? "" : "s"} ago`
}

function snippet(text: string | null | undefined, max = 140) {
  if (!text) return ""
  const clean = text.replace(/\s+/g, " ").trim()
  if (clean.length <= max) return clean
  return `${clean.slice(0, max).trimEnd()}...`
}

function browseAllHref(type: PinType) {
  if (type === "event") return "/events"
  if (type === "library") return "/libraries"
  return "/stores"
}

function browseAllLabel(type: PinType) {
  if (type === "event") return "Events"
  if (type === "library") return "Libraries"
  return "Shops"
}

function eyebrowLabel(type: PinType) {
  if (type === "event") return "Event"
  if (type === "library") return "Library"
  return "Shop"
}

function browseCountLabel(type: PinType, count: number) {
  const formattedCount = count.toLocaleString("en-US")
  if (type === "event") return `View ${formattedCount} events`
  if (type === "library") return `View ${formattedCount} libraries`
  return `View ${formattedCount} shops`
}

function featuredItemHref(item: HeroFeaturedPin) {
  const base = browseAllHref(item.type)
  if (!item.permalink) return base
  return `${base}#${encodeURIComponent(item.permalink)}`
}

export function ZineMapHeroVisual({ className, busyPins, featuredPins }: ZineMapHeroVisualProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<any>(null)
  const mapboxRef = useRef<typeof import("mapbox-gl") | null>(null)
  const backgroundMarkersRef = useRef<any[]>([])
  const featuredMarkersRef = useRef<Map<string, { marker: any; node: HTMLDivElement }>>(new Map())
  const [mapReady, setMapReady] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const [isTitleHovered, setIsTitleHovered] = useState(false)

  const safeFeaturedPins = useMemo(() => featuredPins.slice(0, 10), [featuredPins])
  const totalCards = safeFeaturedPins.length + 1
  const isExploreCard = activeIndex === safeFeaturedPins.length
  const activeFeatured = isExploreCard ? null : safeFeaturedPins[activeIndex] ?? null
  const countsByType = useMemo(
    () =>
      busyPins.reduce(
        (acc, pin) => {
          acc[pin.type] += 1
          return acc
        },
        { store: 0, library: 0, event: 0 } as Record<PinType, number>
      ),
    [busyPins]
  )

  const focusOffset = () => {
    if (typeof window === "undefined") return [0, 96] as [number, number]
    return window.innerWidth < 640 ? ([0, 98] as [number, number]) : ([0, 96] as [number, number])
  }

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return

    let cancelled = false

    const initialize = async () => {
      const mapboxgl = await import("mapbox-gl")
      if (cancelled || !mapContainerRef.current) return
      mapboxRef.current = mapboxgl

      mapRef.current = new mapboxgl.Map({
        container: mapContainerRef.current,
        accessToken: process.env.NEXT_PUBLIC_MAPBOX_TOKEN,
        style: "mapbox://styles/mapbox/light-v11",
        center: [10, 16],
        zoom: 1.55,
        pitch: 0,
        bearing: 0,
        projection: "mercator",
        scrollZoom: false,
        boxZoom: false,
        doubleClickZoom: false,
        touchZoomRotate: false,
        keyboard: false,
        attributionControl: false,
      })
      enableCompactMapAttribution(mapRef.current, mapboxgl)

      mapRef.current.on("load", () => {
        if (cancelled || !mapRef.current) return
        const map = mapRef.current
        map.setProjection("mercator")
        map.setPitch(0)
        map.setBearing(0)
        map.scrollZoom.disable()
        map.boxZoom.disable()
        map.doubleClickZoom.disable()
        map.touchZoomRotate.disable()
        map.keyboard.disable()
        setMapReady(true)
      })
    }

    initialize().catch(() => {
      setMapReady(false)
    })

    return () => {
      cancelled = true
      backgroundMarkersRef.current.forEach((m) => m.remove())
      featuredMarkersRef.current.forEach(({ marker }) => marker.remove())
      featuredMarkersRef.current.clear()
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    if (!mapReady || !mapRef.current || !mapboxRef.current) return

    const mapboxgl = mapboxRef.current
    backgroundMarkersRef.current.forEach((m) => m.remove())
    featuredMarkersRef.current.forEach(({ marker }) => marker.remove())
    backgroundMarkersRef.current = []
    featuredMarkersRef.current.clear()

    for (const pin of busyPins) {
      const node = document.createElement("div")
      node.className = "pointer-events-none"
      node.style.width = "8px"
      node.style.height = "8px"
      node.style.borderRadius = "999px"
      node.style.background = `${TYPE_COLOR[pin.type]}66`
      node.style.border = `1px solid ${TYPE_COLOR[pin.type]}99`
      const marker = new mapboxgl.Marker({ element: node, anchor: "center" })
        .setLngLat([pin.longitude, pin.latitude])
        .addTo(mapRef.current)
      backgroundMarkersRef.current.push(marker)
    }

    for (const pin of safeFeaturedPins) {
      const node = document.createElement("div")
      node.className = "pointer-events-none transition-all duration-300"
      node.style.width = "8px"
      node.style.height = "8px"
      node.style.borderRadius = "999px"
      node.style.background = `${TYPE_COLOR[pin.type]}66`
      node.style.border = `1px solid ${TYPE_COLOR[pin.type]}99`
      node.style.boxShadow = "none"
      const marker = new mapboxgl.Marker({ element: node, anchor: "center" })
        .setLngLat([pin.longitude, pin.latitude])
        .addTo(mapRef.current)
      featuredMarkersRef.current.set(pin.id, { marker, node })
    }
  }, [mapReady, busyPins, safeFeaturedPins])

  useEffect(() => {
    if (!mapReady || !activeFeatured || !mapRef.current) return

    featuredMarkersRef.current.forEach(({ node }, id) => {
      if (id === activeFeatured.id) {
        node.style.width = "16px"
        node.style.height = "16px"
        node.style.background = TYPE_COLOR[activeFeatured.type]
        node.style.border = "2px solid #ffffff"
        node.style.boxShadow = "0 0 0 6px rgba(255,255,255,0.35), 0 2px 10px rgba(0,0,0,0.35)"
      } else {
        const type = id.startsWith("store-") ? "store" : id.startsWith("library-") ? "library" : "event"
        node.style.width = "8px"
        node.style.height = "8px"
        node.style.background = `${TYPE_COLOR[type]}66`
        node.style.border = `1px solid ${TYPE_COLOR[type]}99`
        node.style.boxShadow = "none"
      }
    })

    mapRef.current.easeTo({
      center: [activeFeatured.longitude, activeFeatured.latitude],
      duration: 700,
      essential: true,
      offset: focusOffset(),
    })
  }, [mapReady, activeFeatured])

  const showPrev = () => {
    if (!totalCards) return
    setActiveIndex((value) => (value - 1 + totalCards) % totalCards)
  }

  const showNext = () => {
    if (!totalCards) return
    setActiveIndex((value) => (value + 1) % totalCards)
  }

  useEffect(() => {
    setIsTitleHovered(false)
  }, [activeFeatured?.id])

  return (
    <div className={cn("relative", className)}>
      <div className="overflow-hidden rounded-2xl border-2 border-stone-300 bg-[#f5efe6] shadow-sm">
        <div className="relative h-[21rem] sm:h-[25rem] md:h-[28rem]">
          <div ref={mapContainerRef} className="h-full w-full" />
          {!mapReady ? (
            <div className="absolute inset-0 flex items-center justify-center bg-stone-100/80 text-sm text-stone-500">
              Loading map preview...
            </div>
          ) : null}
          {activeFeatured ? (
            <article className="absolute left-3 top-3 z-10 w-[calc(100%-1.5rem)] overflow-hidden rounded-xl border border-stone-300 bg-[#fffdf8] p-4 shadow-[2px_3px_0_#e7e5e4] sm:left-4 sm:top-4 sm:w-[23rem] md:w-[24rem]">
              {activeFeatured.posterImage ? (
                <>
                  <img
                    src={activeFeatured.posterImage}
                    alt=""
                    aria-hidden
                    className="absolute inset-0 h-full w-full object-cover object-center"
                  />
                  <div className="absolute inset-0 bg-white/90" />
                </>
              ) : null}

              <div className="relative z-10">
                <div className="mb-1 flex items-center justify-between gap-2">
                  <p
                    className="text-xs font-semibold uppercase tracking-[0.12em]"
                    style={{ color: TYPE_COLOR[activeFeatured.type] }}
                  >
                    {eyebrowLabel(activeFeatured.type)}
                  </p>
                  <div className="flex items-center gap-2">
                    <Link
                      href={browseAllHref(activeFeatured.type)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-md border border-stone-300 bg-white/95 px-2 py-1 text-[11px] font-medium text-stone-700 transition-colors hover:bg-stone-100"
                      style={{ color: TYPE_COLOR[activeFeatured.type] }}
                    >
                      {browseCountLabel(activeFeatured.type, countsByType[activeFeatured.type])}
                    </Link>
                    <Button
                      size="icon"
                      variant="outline"
                      className="bg-white h-7 w-7 border-stone-300"
                      onClick={showPrev}
                      aria-label="Previous item"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="outline"
                      className="bg-white h-7 w-7 border-stone-300"
                      onClick={showNext}
                      aria-label="Next item"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <h3 className="font-serif text-base font-semibold text-stone-900 sm:text-lg">
                  <Link
                    href={featuredItemHref(activeFeatured)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="transition-colors"
                    style={{
                      color: isTitleHovered
                        ? TYPE_HOVER_COLOR[activeFeatured.type]
                        : "#1c1917",
                    }}
                    onMouseEnter={() => setIsTitleHovered(true)}
                    onMouseLeave={() => setIsTitleHovered(false)}
                  >
                    {activeFeatured.title}
                  </Link>
                </h3>
                <p className="mt-0.5 text-xs text-stone-600 sm:text-sm">{locationLabel(activeFeatured)}</p>
                <p className="mt-1.5 text-xs leading-snug text-stone-700 sm:text-sm" data-nosnippet>
                  {snippet(activeFeatured.notes)}
                </p>
              {activeFeatured.type !== "event" && activeFeatured.tags.length > 0 ? (
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {activeFeatured.tags.slice(0, 4).map((tag) => (
                    <span
                      key={tag}
                      className="rounded-md border border-stone-200 bg-stone-50 px-2 py-0.5 text-[11px] text-stone-700"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              ) : null}

              <div className="mt-2.5 flex items-center justify-between gap-2">
                <p className="text-[11px] text-stone-500">
                  Added by{" "}
                  {activeFeatured.addedByPermalink ? (
                    <Link
                      href={`/profile/${activeFeatured.addedByPermalink}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-stone-700 hover:text-stone-900"
                    >
                      {activeFeatured.addedBy || "Community"}
                    </Link>
                  ) : (
                    <span className="text-stone-700">{activeFeatured.addedBy || "Community"}</span>
                  )}{" "}
                  · {relativeAddedAt(activeFeatured.createdAt).replace("Added ", "")}
                </p>
              </div>
              </div>
            </article>
          ) : isExploreCard ? (
            <article className="absolute left-3 top-3 z-10 w-[calc(100%-1.5rem)] overflow-hidden rounded-xl border border-stone-300 bg-[#fffdf8] p-4 shadow-[2px_3px_0_#e7e5e4] sm:left-4 sm:top-4 sm:w-[23rem] md:w-[24rem]">
              <div className="relative z-10">
                <div className="mb-1 flex items-center justify-end gap-2">
                  <div className="flex gap-2">
                    <Button
                      size="icon"
                      variant="outline"
                      className="bg-white h-7 w-7 border-stone-300"
                      onClick={showPrev}
                      aria-label="Previous item"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="outline"
                      className="bg-white h-7 w-7 border-stone-300"
                      onClick={showNext}
                      aria-label="Next item"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-stone-700">
                  Explore
                </p>
                <h3 className="mt-1 font-serif text-lg font-semibold text-stone-900">
                  Explore the global zine scene
                </h3>
                <p className="mt-1.5 text-sm leading-snug text-stone-700">
                  Browse zine shops, libraries, archives, festivals, fairs and workshops mapped by the community.
                </p>
                <div className="mt-4">
                  <Button
                    asChild
                    variant="outline"
                    className="border-stone-400 bg-[#fffdf8] font-medium text-stone-800 hover:bg-stone-100"
                  >
                    <Link href="/map" target="_blank" rel="noopener noreferrer">Open the map</Link>
                  </Button>
                </div>
              </div>
            </article>
          ) : (
            <p className="absolute bottom-4 left-4 z-10 rounded border border-stone-300 bg-[#fffdf8] px-3 py-1.5 text-xs text-stone-500">
              No featured pins available yet.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
