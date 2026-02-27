"use client"

import { useMemo, useState, useEffect } from "react"
import { Landmark, ExternalLink, Clock } from "lucide-react"
import { SaveButton } from "@/components/SaveButton"
import { Calendar } from "@/components/ui/calendar"
import { Event } from "@/lib/types"
import { getEventCategoryDisplay, formatDateReadable } from "@/lib/utils"
import { RelativeDateWithTooltip } from "@/components/RelativeDateWithTooltip"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { eachDayOfInterval, format, parseISO, startOfMonth, endOfMonth, isWithinInterval } from "date-fns"
import type { DayContentProps } from "react-day-picker"

interface EventsCalendarViewProps {
  events: Event[]
  onEventClick?: (event: Event) => void
  onCalendarFilterChange?: (events: Event[]) => void
  hasLocationFilter?: boolean
}

interface DateCounts {
  events: number
  deadlines: number
}

/** Get event and deadline counts per date */
function getEventAndDeadlineCountByDate(events: Event[]): Map<string, DateCounts> {
  const count = new Map<string, DateCounts>()
  const getOrInit = (key: string) => {
    if (!count.has(key)) count.set(key, { events: 0, deadlines: 0 })
    return count.get(key)!
  }
  for (const event of events) {
    const start = parseISO(event.start_date)
    const end = parseISO(event.end_date)
    const days = eachDayOfInterval({ start, end })
    days.forEach((d) => {
      const key = format(d, "yyyy-MM-dd")
      getOrInit(key).events += 1
    })
    if (event.application_deadline) {
      const key = event.application_deadline
      getOrInit(key).deadlines += 1
    }
  }
  return count
}

/** Get events that occur on a given date OR have application_deadline on that date */
function getEventsForDate(events: Event[], date: Date): Event[] {
  const dateStr = format(date, "yyyy-MM-dd")
  const occurring = events.filter((e) => {
    if (dateStr < e.start_date) return false
    if (dateStr > e.end_date) return false
    return true
  })
  const deadlineOnDate = events.filter(
    (e) => e.application_deadline && e.application_deadline === dateStr
  )
  const seen = new Set<string>()
  const merged: Event[] = []
  for (const e of [...occurring, ...deadlineOnDate]) {
    if (!seen.has(e.id)) {
      seen.add(e.id)
      merged.push(e)
    }
  }
  return merged
}

/** Get events that fall within a month (occur in month OR have deadline in month) */
function getEventsForMonth(events: Event[], month: Date): Event[] {
  const start = startOfMonth(month)
  const end = endOfMonth(month)
  const inMonth = (d: Date) => isWithinInterval(d, { start, end })
  const seen = new Set<string>()
  const merged: Event[] = []
  for (const e of events) {
    const eventStart = parseISO(e.start_date)
    const eventEnd = parseISO(e.end_date)
    const occursInMonth =
      inMonth(eventStart) ||
      inMonth(eventEnd) ||
      (eventStart <= start && eventEnd >= end)
    const deadlineInMonth =
      e.application_deadline && inMonth(parseISO(e.application_deadline))
    if ((occursInMonth || deadlineInMonth) && !seen.has(e.id)) {
      seen.add(e.id)
      merged.push(e)
    }
  }
  return merged
}

export function EventsCalendarView({
  events,
  onEventClick,
  onCalendarFilterChange,
  hasLocationFilter = false,
}: EventsCalendarViewProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined)
  const [displayedMonth, setDisplayedMonth] = useState<Date | undefined>(undefined)

  const eventAndDeadlineCountByDate = useMemo(
    () => getEventAndDeadlineCountByDate(events),
    [events]
  )

  const eventsForSelectedDate = useMemo(
    () => (selectedDate ? getEventsForDate(events, selectedDate) : []),
    [events, selectedDate]
  )

  const defaultMonth = useMemo(() => new Date(), [])

  const effectiveMonth = displayedMonth ?? defaultMonth
  const eventsForMonth = useMemo(
    () => getEventsForMonth(events, effectiveMonth),
    [events, effectiveMonth]
  )

  const displayedEvents = selectedDate ? eventsForSelectedDate : eventsForMonth

  useEffect(() => {
    onCalendarFilterChange?.(displayedEvents)
  }, [displayedEvents, onCalendarFilterChange])

  const handleDateSelect = (date: Date | undefined) => {
    setSelectedDate(date)
  }

  const handleMonthChange = (month: Date) => {
    setDisplayedMonth(month)
  }

  const DayContent = useMemo(
    () =>
      function CustomDayContent({ date, activeModifiers }: DayContentProps) {
        const dateStr = format(date, "yyyy-MM-dd")
        const counts = eventAndDeadlineCountByDate.get(dateStr) ?? {
          events: 0,
          deadlines: 0,
        }
        const isSelected = activeModifiers.selected
        const eventDot = isSelected ? "bg-white" : "bg-[#009035]"
        const deadlineDot = isSelected ? "bg-white/80" : "bg-amber-500"
        const eventDots = Math.min(counts.events, 3)
        const deadlineDots = Math.min(counts.deadlines, 3)
        const hasAny = eventDots > 0 || deadlineDots > 0
        return (
          <span className="relative flex flex-col items-center justify-center w-full h-full">
            <span>{date.getDate()}</span>
            {hasAny && (
              <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 flex gap-0.5 justify-center items-center">
                {Array.from({ length: eventDots }).map((_, i) => (
                  <span
                    key={`e-${i}`}
                    className={`w-1.5 h-1.5 rounded-full ${eventDot}`}
                  />
                ))}
                {Array.from({ length: deadlineDots }).map((_, i) => (
                  <span
                    key={`d-${i}`}
                    className={`w-1.5 h-1.5 rounded-full ${deadlineDot}`}
                  />
                ))}
              </span>
            )}
          </span>
        )
      },
    [eventAndDeadlineCountByDate]
  )

  return (
    <div className="flex flex-col gap-4 w-full min-w-[320px]">
      <Calendar
        mode="single"
        selected={selectedDate}
        onSelect={handleDateSelect}
        month={effectiveMonth}
        onMonthChange={handleMonthChange}
        defaultMonth={defaultMonth}
        className="rounded-lg border border-stone-200 bg-white p-4 w-full [&_.rdp-month]:w-full"
        classNames={{
          months: "w-full",
          month: "w-full space-y-4",
          table: "w-full",
          head_row: "flex w-full",
          head_cell: "flex-1 text-muted-foreground text-[0.8rem] font-normal",
          row: "flex w-full mt-2",
          cell: "h-11 flex-1 min-w-0 text-center text-sm p-0 relative",
          day: "h-11 w-full rounded-md font-normal aria-selected:opacity-100",
          day_selected:
            "bg-[#009035] text-white rounded-md hover:bg-[#009035] hover:text-white focus:bg-[#009035] focus:text-white",
          day_today: "bg-stone-100 font-semibold rounded-md",
          day_outside: "text-stone-300",
        }}
        components={{
          DayContent,
        }}
      />
      <div className="flex items-center gap-4 text-xs text-stone-500">
        <span className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-[#009035]" />
          Event
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
          Apply by
        </span>
      </div>

      <div className="rounded-lg border border-stone-200 bg-white p-4">
        <h3 className="text-sm font-semibold text-stone-800 mb-1">
          {selectedDate
            ? format(selectedDate, "EEEE, MMMM d, yyyy")
            : `Events in ${format(effectiveMonth, "MMMM yyyy")}`}
        </h3>
        {!hasLocationFilter && (
          <p className="text-xs text-stone-500 mb-3">
            All events for this time frame are shown. You can use the location filter to narrow them down!
          </p>
        )}
        {hasLocationFilter && <div className="mb-3" />}
        {displayedEvents.length === 0 ? (
          <p className="text-sm text-stone-500">
            {selectedDate ? "No events on this date" : "No events this month"}
          </p>
        ) : (
          <ul className="space-y-3">
            {displayedEvents.map((event) => (
              <li key={event.id}>
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => onEventClick?.(event)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault()
                      onEventClick?.(event)
                    }
                  }}
                  className="block p-3 rounded-lg border border-stone-200 hover:border-[#009035] hover:bg-green-50/50 transition-colors cursor-pointer"
                >
                    <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/event/${event.permalink || event.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="font-semibold text-stone-800 hover:text-[#009035] line-clamp-1 block"
                      >
                        {event.name}
                      </Link>
                      {event.venue_name && (
                        <div className="flex items-center text-stone-600 text-sm mt-0.5">
                          <Landmark className="h-3 w-3 mr-1 flex-shrink-0" />
                          <span className="line-clamp-1">{event.venue_name}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        <Badge
                          variant="outline"
                          className="text-xs bg-stone-50 text-stone-700 border-stone-200"
                        >
                          {getEventCategoryDisplay(event.category)}
                        </Badge>
                        <span className="text-xs text-stone-500">
                          {event.city}
                          {event.state && `, ${event.state}`}
                          {", "}
                          {event.country}
                        </span>
                        {event.application_deadline && (() => {
                          const today = new Date()
                          const deadlineDate = new Date(event.application_deadline!)
                          today.setHours(0, 0, 0, 0)
                          deadlineDate.setHours(0, 0, 0, 0)
                          return deadlineDate >= today
                        })() && (
                          <span className="flex items-center text-xs text-amber-600">
                            <Clock className="h-3 w-3 mr-0.5" />
                            Apply by {formatDateReadable(event.application_deadline)}
                          </span>
                        )}
                      </div>
                      {(event.user_name || event.created_at) && (
                        <div className="text-xs text-stone-400 mt-1">
                          Added by{" "}
                          {event.user_permalink ? (
                            <Link
                              href={`/profile/${event.user_permalink}`}
                              onClick={(e) => e.stopPropagation()}
                              className="hover:text-stone-600 hover:underline"
                            >
                              {event.user_name}
                            </Link>
                          ) : (
                            event.user_name
                          )}
                          {event.created_at && (
                            <RelativeDateWithTooltip dateString={event.created_at} prefix=" · " />
                          )}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-0.5 shrink-0 mt-0.5" onClick={(e) => e.stopPropagation()}>
                      <Link
                        href={`/event/${event.permalink || event.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1 rounded hover:bg-green-100 transition-colors"
                        aria-label={`View ${event.name}`}
                      >
                        <ExternalLink className="h-4 w-4 text-stone-400 hover:text-[#009035]" />
                      </Link>
                      <SaveButton
                        entityType="event"
                        entityId={event.id}
                        variant="ghost"
                        size="icon"
                        showLabel={false}
                        className="h-8 w-8 text-stone-400 hover:text-[#009035] hover:bg-green-50"
                      />
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
