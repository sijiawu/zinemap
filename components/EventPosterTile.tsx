import Link from "next/link"
import { cn, formatDateReadable } from "@/lib/utils"

export type EventPosterTileEvent = {
  id: string
  name: string
  start_date: string
  end_date?: string | null
  permalink?: string | null
  poster_image?: string | null
  city?: string | null
  state?: string | null
  country?: string | null
}

function locationLabel(event: EventPosterTileEvent) {
  return [event.city, event.state, event.country].filter(Boolean).join(", ")
}

function dateLabel(event: EventPosterTileEvent) {
  if (event.end_date && event.end_date !== event.start_date) {
    return `${formatDateReadable(event.start_date)} – ${formatDateReadable(event.end_date)}`
  }
  return formatDateReadable(event.start_date)
}

export function EventPosterTile({
  event,
  showLocation = false,
  muted = false,
}: {
  event: EventPosterTileEvent
  showLocation?: boolean
  muted?: boolean
}) {
  const location = showLocation ? locationLabel(event) : ""

  return (
    <Link
      href={`/event/${event.permalink || event.id}`}
      className={cn(
        "group relative block aspect-[3/4] overflow-hidden rounded-xl border border-stone-200 bg-stone-800 shadow-sm transition-shadow hover:shadow-md",
        muted && "opacity-90"
      )}
    >
      {event.poster_image ? (
        <img
          src={event.poster_image}
          alt=""
          className={cn(
            "absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-105",
            muted && "grayscale-[25%]"
          )}
        />
      ) : (
        <div
          className={cn(
            "absolute inset-0 bg-gradient-to-br",
            muted ? "from-stone-600 to-stone-800" : "from-green-700 to-stone-800"
          )}
        />
      )}
      <div className="absolute inset-x-0 bottom-0 bg-white/80 px-3 py-2.5 backdrop-blur-[2px]">
        <p className="line-clamp-2 text-sm font-semibold leading-snug text-stone-900 sm:text-base">
          {event.name}
        </p>
        <p className="mt-0.5 text-xs text-stone-800 sm:text-sm">
          {dateLabel(event)}
        </p>
        {location ? (
          <p className="mt-0.5 line-clamp-1 text-xs text-stone-600">{location}</p>
        ) : null}
      </div>
    </Link>
  )
}

export function EventPosterGrid({
  events,
  showLocation = false,
  muted = false,
}: {
  events: EventPosterTileEvent[]
  showLocation?: boolean
  muted?: boolean
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {events.map((event) => (
        <EventPosterTile
          key={event.id}
          event={event}
          showLocation={showLocation}
          muted={muted}
        />
      ))}
    </div>
  )
}
