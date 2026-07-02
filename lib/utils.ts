import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import React from "react"
import { addDays, addWeeks, addMonths, addYears, parseISO, format, isBefore, endOfMonth } from "date-fns"
import type { Event } from "@/lib/types"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Generate a URL-friendly permalink from a display name
 * @param displayName - The display name to convert
 * @returns A URL-friendly permalink
 */
export function generatePermalink(displayName: string): string {
  return displayName
    .normalize('NFKD')
    .toLowerCase()
    .trim()
    .replace(/[\u0300-\u036f]/g, '') // Strip combining accents after normalization
    .replace(/['’`´]/g, '-') // Convert apostrophes to hyphens
    .replace(/&/g, ' and ') // Keep ampersand semantically
    .replace(/[^a-z0-9\s-]/g, '-') // Convert remaining separators to hyphens
    .replace(/\s+/g, '-') // Convert spaces to hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
    .replace(/^-|-$/g, '') // Remove leading/trailing hyphens
}

/**
 * Generate listing permalink from name + city with consistent transliteration.
 * Used for shops, libraries, and events.
 */
export function generateListingPermalink(name: string, city: string): string {
  return generatePermalink(`${name} ${city}`)
}

/**
 * Format a date string consistently without timezone issues
 * This ensures that dates like "2024-09-06" display as "9/6" regardless of timezone
 */
export function formatDate(dateString: string | Date): string {
  if (!dateString) return ''
  
  const date = new Date(dateString)
  
  // Handle invalid dates
  if (isNaN(date.getTime())) return ''
  
  // Use UTC methods to avoid timezone shifts
  const month = date.getUTCMonth() + 1
  const day = date.getUTCDate()
  const year = date.getUTCFullYear()
  
  // Format as M/D/YYYY
  return `${month}/${day}/${year}`
}

/**
 * Format a date string for display (M/D format)
 * This ensures that dates like "2024-09-06" display as "9/6" regardless of timezone
 */
export function formatDateShort(dateString: string | Date): string {
  if (!dateString) return ''
  
  const date = new Date(dateString)
  
  // Handle invalid dates
  if (isNaN(date.getTime())) return ''
  
  // Use UTC methods to avoid timezone shifts
  const month = date.getUTCMonth() + 1
  const day = date.getUTCDate()
  
  // Format as M/D
  return `${month}/${day}`
}

/**
 * Format a date string for display (Month Day, Year format)
 * This ensures that dates like "2024-09-06" display as "Sept 6, 2025" regardless of timezone
 */
export function formatDateReadable(dateString: string | Date): string {
  if (!dateString) return ''
  
  const date = new Date(dateString)
  
  // Handle invalid dates
  if (isNaN(date.getTime())) return ''
  
  // Use UTC methods to avoid timezone shifts
  const month = date.getUTCMonth()
  const day = date.getUTCDate()
  const year = date.getUTCFullYear()
  
  // Month names
  const monthNames = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec'
  ]
  
  // Format as "Month Day, Year"
  return `${monthNames[month]} ${day}, ${year}`
}

/** Format date with weekday (e.g. "Tuesday, Mar 5, 2026") */
export function formatDateWithWeekday(dateString: string | Date): string {
  if (!dateString) return ''
  const date = typeof dateString === 'string' ? parseISO(dateString) : dateString
  if (isNaN(date.getTime())) return ''
  return format(date, 'EEEE, MMM d, yyyy')
}

/** Format time "HH:MM" to compact readable (e.g. "2pm", "2:30pm") */
export function formatTime(timeStr: string | null | undefined): string {
  if (!timeStr) return ''
  const [h, m] = timeStr.split(':').map(Number)
  const period = h >= 12 ? 'pm' : 'am'
  const hour = h > 12 ? h - 12 : h === 0 ? 12 : h
  return m ? `${hour}:${String(m).padStart(2, '0')}${period}` : `${hour}${period}`
}

/** Format time range for display: " (2pm-6pm)" with leading space when non-empty */
export function formatTimeRange(startTime: string | null | undefined, endTime: string | null | undefined): string {
  if (!startTime && !endTime) return ''
  if (!startTime) return endTime ? ` (until ${formatTime(endTime)})` : ''
  if (!endTime) return ` (${formatTime(startTime)})`
  return ` (${formatTime(startTime)}-${formatTime(endTime)})`
}

/**
 * Format a date as a subtle relative string (e.g. "2 hours ago", "3 days ago")
 * Never uses short date; always relative. Use formatDateReadable for tooltip.
 */
export function formatRelativeDate(dateString: string | Date): string {
  if (!dateString) return ''
  const date = new Date(dateString)
  if (isNaN(date.getTime())) return ''
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMinutes = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffMinutes < 1) return 'just now'
  if (diffMinutes < 60) return `${diffMinutes} ${diffMinutes === 1 ? 'minute' : 'minutes'} ago`
  if (diffHours < 24) return `${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`
  if (diffDays === 1) return 'yesterday'
  if (diffDays <= 6) return `${diffDays} days ago`
  if (diffDays <= 13) return 'last week'
  if (diffDays <= 27) return `${Math.floor(diffDays / 7)} weeks ago`
  if (diffDays <= 60) return 'last month'
  if (diffDays <= 365) return `${Math.floor(diffDays / 30)} months ago`
  const years = Math.floor(diffDays / 365)
  return `${years} ${years === 1 ? 'year' : 'years'} ago`
}

/**
 * Format a date string for display (Month Day format)
 * This ensures that dates like "2024-09-06" display as "Sept 6" regardless of timezone
 */
export function formatDateMonthDay(dateString: string | Date): string {
  if (!dateString) return ''
  
  const date = new Date(dateString)
  
  // Handle invalid dates
  if (isNaN(date.getTime())) return ''
  
  // Use UTC methods to avoid timezone shifts
  const month = date.getUTCMonth()
  const day = date.getUTCDate()
  
  // Month names
  const monthNames = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec'
  ]
  
  // Format as "Month Day"
  return `${monthNames[month]} ${day}`
}

/**
 * Convert database tag category to display phrase (matches add-store/add-library form labels)
 */
export function getTagCategoryDisplay(category: string): string {
  const map: Record<string, string> = {
    // Shop and library type categories
    shop_type: 'Shop Type',
    library_type: 'Library Type',
    // Store tag categories
    split: 'Revenue Split',
    payment: 'Payment Types',
    method: 'Payout Methods',
    limits: 'Copy Limits',
    pricing: 'Pricing Requirements',
    returns: 'Return Policy',
    // Library tag categories
    service: 'Available Services',
    usage: 'Usage',
    access: 'Access Requirements',
  }
  return map[category] ?? category.replace(/\b\w/g, l => l.toUpperCase())
}

export type TagDescriptionItem = {
  id: string
  label: string
  description: string
}

export const SHOP_TYPE_TAG_DETAILS: TagDescriptionItem[] = [
  // Shop types
  { id: "shop_type_zine_shop", label: "Zine shop", description: "A shop where zines, small press, artist publications, or self-published works are central to the identity of the place." },
  { id: "shop_type_independent_bookstore", label: "Independent bookstore", description: "A general independent bookstore that sells zines through a shelf, rack, box, or small-press section, but is not primarily a zine shop." },
  { id: "shop_type_comics_shop", label: "Comics shop", description: "A shop whose main focus is comics, including graphic novels, manga, minicomics, comic zines, self-published comics, or small-press work." },
  { id: "shop_type_art_design_bookshop", label: "Art/design bookshop", description: "A shop primarily focused on art books, design books, photography books, artist books, and independent visual publishing, with zines included in the mix." },
  { id: "shop_type_record_shop", label: "Record shop", description: "A music-focused shop that also stocks zines." },
  { id: "shop_type_gift_stationery_shop", label: "Gift/stationery shop", description: "A shop primarily selling gifts, stationery, paper goods, prints, or handmade/lifestyle items, with zines as part of the stock." },
  { id: "shop_type_gallery_museum_shop", label: "Gallery/museum shop", description: "A retail shop attached to a gallery, museum, arts center, or cultural institution." },
  { id: "shop_type_cafe_bar_hybrid_space", label: "Cafe/bar/hybrid space", description: "A cafe, bar, venue, studio, or mixed-use space with a zine shelf." },
]

export const LIBRARY_TYPE_TAG_DETAILS: TagDescriptionItem[] = [
  // Library types
  { id: "library_type_zine_library", label: "Zine library", description: "A library or collection where zines are the main focus." },
  { id: "library_type_zine_exchange_library", label: "Zine exchange library", description: "A small self-serve zine-focused library, box, shelf, or exchange point where people can take, leave, or swap zines for free." },
  { id: "library_type_public_library", label: "Public library", description: "A zine collection inside a public, city, county, municipal, or local library." },
  { id: "library_type_academic_library", label: "Academic library", description: "A zine collection inside a university, college, school, or research library." },
  { id: "library_type_community_archive", label: "Community archive", description: "A grassroots, community-led, activist, local, identity-based, or movement-based archive that includes zines." },
  { id: "library_type_reading_room_resource_center", label: "Reading room/resource center", description: "A space where people can browse, read, study, or use zines on-site, but whose main identity is not necessarily library or archive." },
  { id: "library_type_mobile_pop_up_collection", label: "Mobile/pop-up collection", description: "A zine collection that travels, appears temporarily, or does not have a fixed regular public location." },
]

const TAG_TOOLTIP_DESCRIPTIONS: Record<string, string> = Object.fromEntries(
  [...SHOP_TYPE_TAG_DETAILS, ...LIBRARY_TYPE_TAG_DETAILS].map((item) => [item.id, item.description])
)

const SHOP_TYPE_ORDER = SHOP_TYPE_TAG_DETAILS.map((item) => item.id)
const LIBRARY_TYPE_ORDER = LIBRARY_TYPE_TAG_DETAILS.map((item) => item.id)

export function getTagTooltipDescription(tagId: string): string | undefined {
  return TAG_TOOLTIP_DESCRIPTIONS[tagId]
}

export function sortTagsByConfiguredOrder<T extends { id: string }>(tags: T[], category: string): T[] {
  const order = category === "shop_type" ? SHOP_TYPE_ORDER : category === "library_type" ? LIBRARY_TYPE_ORDER : null
  if (!order) return tags
  const orderMap = new Map(order.map((id, index) => [id, index]))
  return [...tags].sort((a, b) => (orderMap.get(a.id) ?? Number.MAX_SAFE_INTEGER) - (orderMap.get(b.id) ?? Number.MAX_SAFE_INTEGER))
}

type TagJoinWithCategory = {
  tag?: {
    id?: string
    label?: string
    category?: string | null
  } | null
}

export function sortTagJoinsByTypeFirst<T extends TagJoinWithCategory>(
  tagJoins: T[],
  typeCategory: "shop_type" | "library_type"
): T[] {
  const configuredOrder = typeCategory === "shop_type" ? SHOP_TYPE_ORDER : LIBRARY_TYPE_ORDER
  const configuredOrderMap = new Map(configuredOrder.map((id, index) => [id, index]))

  return [...tagJoins].sort((a, b) => {
    const aTag = a.tag
    const bTag = b.tag
    const aIsTypeTag = aTag?.category === typeCategory
    const bIsTypeTag = bTag?.category === typeCategory

    // Keep type tags before all other categories in list/map badge rows.
    if (aIsTypeTag !== bIsTypeTag) {
      return aIsTypeTag ? -1 : 1
    }

    if (aIsTypeTag && bIsTypeTag) {
      const aOrder = configuredOrderMap.get(aTag?.id ?? "") ?? Number.MAX_SAFE_INTEGER
      const bOrder = configuredOrderMap.get(bTag?.id ?? "") ?? Number.MAX_SAFE_INTEGER
      if (aOrder !== bOrder) {
        return aOrder - bOrder
      }
    }

    const aLabel = aTag?.label ?? ""
    const bLabel = bTag?.label ?? ""
    return aLabel.localeCompare(bLabel)
  })
}

/**
 * Convert database event category to readable display name
 */
export function getEventCategoryDisplay(category: string): string {
  switch (category) {
    case 'festival':
      return 'Festival/Fair'
    case 'swap':
      return 'Swap/Exchange'
    case 'workshop':
      return 'Workshop/Meetup'
    default:
      return category.replace(/\b\w/g, l => l.toUpperCase())
  }
}

/**
 * Check if an event is in the past based on its end_date
 * @param event - Event object with end_date property
 * @returns true if the event's end_date is before today
 */
export function isPastEvent(event: { end_date: string }): boolean {
  const today = new Date().toISOString().split('T')[0]
  return event.end_date < today
}

/** Event with occurrence dates for display (from recurring expansion) */
export interface EventOccurrence {
  /** Original event data */
  event: Event
  /** This occurrence's start date (YYYY-MM-DD) */
  occurrence_start: string
  /** This occurrence's end date (YYYY-MM-DD) */
  occurrence_end: string
}

/** Max occurrences per recurring series (hard cap) */
export const MAX_RECURRENCE_OCCURRENCES = 12

/** True when event is a recurring series (explicit occurrence_dates only). */
export function isRecurringEvent(event: {
  occurrence_dates?: string[] | null
}): boolean {
  return !!(event.occurrence_dates && event.occurrence_dates.length >= 2)
}

/** Sort and dedupe YYYY-MM-DD strings. */
export function normalizeOccurrenceDates(dates: string[]): string[] {
  const unique = [...new Set(dates.filter(Boolean))]
  return unique.sort()
}

export type OccurrenceDatesValidationOptions = {
  minCount?: number
  maxCount?: number
  requireFuture?: boolean
}

export function validateOccurrenceDates(
  dates: string[],
  options?: OccurrenceDatesValidationOptions
): string | null {
  const minCount = options?.minCount ?? 2
  const maxCount = options?.maxCount ?? MAX_RECURRENCE_OCCURRENCES
  const normalized = normalizeOccurrenceDates(dates)

  if (normalized.length < minCount) {
    return `Select at least ${minCount} dates for a recurring series`
  }
  if (normalized.length > maxCount) {
    return `A series can include at most ${maxCount} dates`
  }

  const isoDate = /^\d{4}-\d{2}-\d{2}$/
  for (const d of normalized) {
    if (!isoDate.test(d)) return 'Invalid date format'
    const parsed = parseISO(d)
    if (isNaN(parsed.getTime())) return `Invalid date: ${d}`
  }

  if (options?.requireFuture) {
    const today = new Date().toISOString().split('T')[0]
    if (!normalized.some(d => d >= today)) {
      return 'At least one occurrence date must be today or in the future'
    }
  }

  return null
}

export type RecurrenceRuleInput = {
  start_date: string
  end_date?: string
  recurrence_frequency: 'weekly' | 'monthly'
  recurrence_interval?: number
  recurrence_until?: string
  recurrence_ordinal?: number
  recurrence_weekday?: number
}

/** Generate occurrence date strings from weekly/monthly rule (setup UI only). */
export function generateOccurrenceDatesFromRule(
  input: RecurrenceRuleInput,
  options?: { maxOccurrences?: number }
): string[] {
  const occs = expandDatesFromRecurrenceRule(input, options)
  return occs
}

/** Stable signature for recurrence setup (regenerate dates on change). */
export function getRecurrenceRuleSignature(input: RecurrenceRuleInput): string {
  return JSON.stringify({
    start_date: input.start_date,
    recurrence_frequency: input.recurrence_frequency,
    recurrence_interval: input.recurrence_interval ?? 1,
    recurrence_until: input.recurrence_until ?? '',
    recurrence_ordinal: input.recurrence_ordinal ?? 3,
    recurrence_weekday: input.recurrence_weekday ?? 0,
  })
}

/**
 * Get the Nth occurrence of a weekday in a month (e.g. 3rd Sunday).
 * @param year - Full year
 * @param month - Month 0-11 (Jan=0)
 * @param weekday - 0=Sunday..6=Saturday
 * @param ordinal - 1=1st, 2=2nd, 3=3rd, 4=4th, 5=last
 */
function getNthWeekdayOfMonth(year: number, month: number, weekday: number, ordinal: number): Date {
  const last = endOfMonth(new Date(year, month, 1))
  const lastDay = last.getDate()

  if (ordinal === 5) {
    for (let d = lastDay; d >= 1; d--) {
      const date = new Date(year, month, d)
      if (date.getDay() === weekday) return date
    }
  } else {
    let count = 0
    for (let d = 1; d <= lastDay; d++) {
      const date = new Date(year, month, d)
      if (date.getDay() === weekday) {
        count++
        if (count === ordinal) return date
      }
    }
  }
  return last
}

/**
 * Expand events into individual occurrences for display.
 * Series use occurrence_dates only; one-time events use start_date/end_date.
 */
export function expandRecurringEvents(
  events: Event[],
  options?: { maxOccurrences?: number }
): EventOccurrence[] {
  const result: EventOccurrence[] = []

  for (const event of events) {
    const explicit = event.occurrence_dates
    if (explicit && explicit.length >= 2) {
      const sorted = normalizeOccurrenceDates(explicit)
      const max = options?.maxOccurrences ?? sorted.length
      for (const dateStr of sorted.slice(0, max)) {
        result.push({
          event,
          occurrence_start: dateStr,
          occurrence_end: dateStr,
        })
      }
      continue
    }

    result.push({
      event,
      occurrence_start: event.start_date,
      occurrence_end: event.end_date,
    })
  }

  return result
}

/** Rule-based date generation for add/edit UI only (not read from DB). */
function expandDatesFromRecurrenceRule(
  input: RecurrenceRuleInput,
  options?: { maxOccurrences?: number }
): string[] {
  const maxOccurrences = options?.maxOccurrences ?? MAX_RECURRENCE_OCCURRENCES
  const freq = input.recurrence_frequency
  const interval = input.recurrence_interval ?? 1
  const startDate = parseISO(input.start_date)
  const untilDate = input.recurrence_until ? parseISO(input.recurrence_until) : null
  const ordinal = input.recurrence_ordinal ?? 3
  const weekday = input.recurrence_weekday ?? 0

  let currentStart: Date
  if (freq === 'monthly' && ordinal >= 1 && ordinal <= 5) {
    currentStart = getNthWeekdayOfMonth(startDate.getFullYear(), startDate.getMonth(), weekday, ordinal)
  } else {
    currentStart = startDate
  }

  const dates: string[] = []
  const oneYearFromStart = addYears(currentStart, 1)
  let count = 0

  while (count < maxOccurrences) {
    if (untilDate && isBefore(untilDate, currentStart)) break
    if (isBefore(oneYearFromStart, currentStart)) break

    dates.push(format(currentStart, 'yyyy-MM-dd'))
    count++

    if (freq === 'weekly') {
      currentStart = addWeeks(currentStart, interval)
    } else if (freq === 'monthly') {
      if (ordinal >= 1 && ordinal <= 5) {
        let y = currentStart.getFullYear()
        let m = currentStart.getMonth()
        m += interval
        if (m > 11) {
          y += Math.floor(m / 12)
          m = m % 12
        }
        currentStart = getNthWeekdayOfMonth(y, m, weekday, ordinal)
      } else {
        currentStart = addMonths(currentStart, interval)
      }
    } else {
      break
    }
  }

  return dates
}

/** Get the next occurrence date for a recurring event, or null if none/not recurring */
export function getNextOccurrenceDate(event: Event): string | null {
  if (!isRecurringEvent(event)) return null
  const occs = expandRecurringEvents([event])
  const today = new Date().toISOString().split('T')[0]
  const next = occs.find(o => o.occurrence_end >= today)
  return next ? next.occurrence_start : null
}

/**
 * For list/map view: one row per recurring event.
 * - Upcoming series: next occurrence (first date >= today).
 * - Ended series (all dates past): most recent occurrence, same as a past one-time event.
 * One-time events pass through unchanged.
 */
export function occurrencesToNextOnly(occurrences: EventOccurrence[]): EventOccurrence[] {
  const today = new Date().toISOString().split('T')[0]
  const seenRecurring = new Set<string>()
  const result: EventOccurrence[] = []
  const latestPastByEventId = new Map<string, EventOccurrence>()

  for (const occ of occurrences) {
    if (!isRecurringEvent(occ.event)) {
      result.push(occ)
      continue
    }
    if (occ.occurrence_end >= today) {
      if (seenRecurring.has(occ.event.id)) continue
      seenRecurring.add(occ.event.id)
      result.push(occ)
      continue
    }
    if (seenRecurring.has(occ.event.id)) continue
    const existing = latestPastByEventId.get(occ.event.id)
    if (!existing || occ.occurrence_end > existing.occurrence_end) {
      latestPastByEventId.set(occ.event.id, occ)
    }
  }

  for (const occ of latestPastByEventId.values()) {
    if (!seenRecurring.has(occ.event.id)) {
      result.push(occ)
    }
  }

  return result
}

/**
 * Convert EventOccurrence to Event-like object with occurrence dates for display.
 * Use when you need start_date/end_date to reflect the occurrence.
 */
export function occurrenceToDisplayEvent(occ: EventOccurrence): Event & { occurrence_start?: string; occurrence_end?: string } {
  return {
    ...occ.event,
    start_date: occ.occurrence_start,
    end_date: occ.occurrence_end,
    occurrence_start: occ.occurrence_start,
    occurrence_end: occ.occurrence_end,
  }
}

export const WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
export const ORDINAL_LABELS: Record<number, string> = { 1: '1st', 2: '2nd', 3: '3rd', 4: '4th', 5: 'last' }

/**
 * Get ordinal (1st–4th or 5=last) and weekday (0–6) from a date.
 * Used to derive recurrence options from the selected start date.
 */
export function getOrdinalAndWeekdayFromDate(dateString: string): { ordinal: number; weekday: number } | null {
  if (!dateString) return null
  const date = parseISO(dateString)
  if (isNaN(date.getTime())) return null
  const weekday = date.getDay()
  const dayOfMonth = date.getDate()
  const month = date.getMonth()
  const year = date.getFullYear()
  const lastDay = endOfMonth(date).getDate()

  let count = 0
  for (let d = 1; d <= dayOfMonth; d++) {
    const dDate = new Date(year, month, d)
    if (dDate.getDay() === weekday) count++
  }

  let lastOccurrenceDay = 0
  for (let d = lastDay; d >= 1; d--) {
    const dDate = new Date(year, month, d)
    if (dDate.getDay() === weekday) {
      lastOccurrenceDay = d
      break
    }
  }

  const ordinal = dayOfMonth === lastOccurrenceDay ? 5 : count
  return { ordinal, weekday }
}

/** Human-readable label for a recurring series (occurrence_dates only). */
export function formatRecurrenceDescription(event: {
  occurrence_dates?: string[] | null
}): string {
  const explicit = event.occurrence_dates
  if (!explicit || explicit.length < 2) return ''
  const n = explicit.length
  return `Recurring series (${n} dates)`
}

/**
 * Auto-link URLs in text by converting them to clickable links
 * @param text - The text containing potential URLs
 * @returns React elements with URLs converted to links
 */
export function autoLinkText(text: string): React.ReactNode[] {
  // Order matters: email first so domains inside emails aren't linkified separately.
  const linkRegex = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}|https?:\/\/[^\s]+|www\.[^\s]+|\b[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?\.[a-zA-Z]{2,}(?:\/[^\s]*)?\b)/g
  const nodes: React.ReactNode[] = []

  let lastIndex = 0
  let key = 0

  for (const match of text.matchAll(linkRegex)) {
    const fullMatch = match[0]
    const matchIndex = match.index ?? 0

    if (matchIndex > lastIndex) {
      nodes.push(text.slice(lastIndex, matchIndex))
    }

    // Avoid linkifying domains that are only the domain part of an email.
    if (!fullMatch.includes('@') && matchIndex > 0 && text[matchIndex - 1] === '@') {
      nodes.push(fullMatch)
      lastIndex = matchIndex + fullMatch.length
      continue
    }

    // Keep trailing punctuation outside the clickable link.
    const punctuationMatch = fullMatch.match(/[),.!?:;]+$/)
    const trailingPunctuation = punctuationMatch?.[0] ?? ''
    const cleanMatch = trailingPunctuation ? fullMatch.slice(0, -trailingPunctuation.length) : fullMatch

    const isEmail = /^[a-zA-Z0-9._%+-]+@/.test(cleanMatch)
    const href = isEmail
      ? `mailto:${cleanMatch}`
      : cleanMatch.startsWith('http')
        ? cleanMatch
        : `https://${cleanMatch}`

    nodes.push(
      React.createElement('a', {
        key: key++,
        href,
        target: isEmail ? undefined : '_blank',
        rel: isEmail ? undefined : 'noopener noreferrer',
        className: 'text-blue-600 hover:text-blue-800 underline break-all max-w-full inline-block align-bottom'
      }, cleanMatch)
    )

    if (trailingPunctuation) {
      nodes.push(trailingPunctuation)
    }

    lastIndex = matchIndex + fullMatch.length
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex))
  }

  return nodes
}

/**
 * Convert social media handle to Instagram link if it starts with @
 * @param social - The social media string (handle or URL)
 * @param themeColor - The theme color for the link (e.g., '#009035' for events)
 * @param hoverColor - The hover color for the link (e.g., '#007a2a' for events)
 * @returns React element with Instagram link or plain text
 */
export function formatSocialMedia(social: string, themeColor: string = '#009035', hoverColor: string = '#007a2a'): React.ReactNode {
  if (social.startsWith('@')) {
    const handle = social.substring(1) // Remove the @ symbol
    return React.createElement('a', {
      href: `https://instagram.com/${handle}`,
      target: '_blank',
      rel: 'noopener noreferrer',
      className: `text-[${themeColor}] hover:text-[${hoverColor}] hover:underline flex items-center gap-1 break-all`,
      style: { color: themeColor }
    }, [
      React.createElement('span', { key: 'text', className: 'break-all' }, social),
      React.createElement('svg', {
        key: 'icon',
        className: 'h-3 w-3 flex-shrink-0',
        fill: 'none',
        stroke: 'currentColor',
        viewBox: '0 0 24 24'
      }, React.createElement('path', {
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
        strokeWidth: 2,
        d: 'M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14'
      }))
    ])
  }
  
  // If it's already a URL, return as is
  if (social.startsWith('http://') || social.startsWith('https://')) {
    return React.createElement('a', {
      href: social,
      target: '_blank',
      rel: 'noopener noreferrer',
      className: `text-[${themeColor}] hover:text-[${hoverColor}] hover:underline flex items-center gap-1 break-all`,
      style: { color: themeColor }
    }, [
      React.createElement('span', { key: 'text', className: 'break-all' }, social),
      React.createElement('svg', {
        key: 'icon',
        className: 'h-3 w-3 flex-shrink-0',
        fill: 'none',
        stroke: 'currentColor',
        viewBox: '0 0 24 24'
      }, React.createElement('path', {
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
        strokeWidth: 2,
        d: 'M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14'
      }))
    ])
  }
  
  // Otherwise return as plain text
  return social
}

// Sort split category tags by creator percentage (first number in tag id)
// Tag ids are like "50-50", "60-40", etc. where first number is creator percentage
export function sortSplitTagsByCreatorPercentage(tags: Array<{ id: string; label: string; category: string }>): Array<{ id: string; label: string; category: string }> {
  return [...tags].sort((a, b) => {
    // Extract first number from tag id (e.g., "50-50" -> 50, "100-minus-tax" -> 100)
    const getCreatorPercentage = (tagId: string): number => {
      const match = tagId.match(/^(\d+)/)
      if (match) {
        return parseInt(match[1], 10)
      }
      // If no number found, put it at the end (e.g., "100-minus-tax")
      return 999
    }
    
    const aPercent = getCreatorPercentage(a.id)
    const bPercent = getCreatorPercentage(b.id)
    
    return aPercent - bPercent
  })
}

// Convert US state names to abbreviations
export function normalizeUSState(state: string, country: string): string {
  // Only normalize if it's a US state
  if (country.toLowerCase() !== 'united states' && country.toLowerCase() !== 'usa' && country.toLowerCase() !== 'us') {
    return state
  }

  const stateMap: Record<string, string> = {
    'Alabama': 'AL',
    'Alaska': 'AK', 
    'Arizona': 'AZ',
    'Arkansas': 'AR',
    'California': 'CA',
    'Colorado': 'CO',
    'Connecticut': 'CT',
    'Delaware': 'DE',
    'Florida': 'FL',
    'Georgia': 'GA',
    'Hawaii': 'HI',
    'Idaho': 'ID',
    'Illinois': 'IL',
    'Indiana': 'IN',
    'Iowa': 'IA',
    'Kansas': 'KS',
    'Kentucky': 'KY',
    'Louisiana': 'LA',
    'Maine': 'ME',
    'Maryland': 'MD',
    'Massachusetts': 'MA',
    'Michigan': 'MI',
    'Minnesota': 'MN',
    'Mississippi': 'MS',
    'Missouri': 'MO',
    'Montana': 'MT',
    'Nebraska': 'NE',
    'Nevada': 'NV',
    'New Hampshire': 'NH',
    'New Jersey': 'NJ',
    'New Mexico': 'NM',
    'New York': 'NY',
    'North Carolina': 'NC',
    'North Dakota': 'ND',
    'Ohio': 'OH',
    'Oklahoma': 'OK',
    'Oregon': 'OR',
    'Pennsylvania': 'PA',
    'Rhode Island': 'RI',
    'South Carolina': 'SC',
    'South Dakota': 'SD',
    'Tennessee': 'TN',
    'Texas': 'TX',
    'Utah': 'UT',
    'Vermont': 'VT',
    'Virginia': 'VA',
    'Washington': 'WA',
    'West Virginia': 'WV',
    'Wisconsin': 'WI',
    'Wyoming': 'WY',
    'District of Columbia': 'DC'
  }

  // If it's already an abbreviation (2 letters), return as is
  if (state.length === 2 && state.toUpperCase() in Object.values(stateMap)) {
    return state.toUpperCase()
  }

  // Convert full name to abbreviation
  const normalizedState = stateMap[state] || state
  return normalizedState
}

/** Pin + profile fields used to rank zinesters (matches /zinesters sidebar). */
export type ZinesterSortablePin = {
  user_email: string
  created_at: string
  updated_at?: string | null
  user?: {
    roles?: string[] | null
    open_to?: string[] | null
    bio?: string | null
    updated_at?: string | null
  } | null
}

/** Latest activity timestamp for a zinester (profile or pin update). */
export function zinesterSortTimestamp(pin: ZinesterSortablePin): number {
  const times = [pin.user?.updated_at, pin.updated_at, pin.created_at]
    .filter(Boolean)
    .map((value) => new Date(value as string).getTime())
  return times.length ? Math.max(...times) : 0
}

/** Homepage People carousel: roles/open-to tag and bio required. */
export function meetsZinesterPeopleDisplayCriteria(
  user: ZinesterSortablePin["user"]
): boolean {
  if (!user) return false
  const hasAnyTag = (user.roles?.length || 0) > 0 || (user.open_to?.length || 0) > 0
  const hasBio = Boolean(user.bio?.trim())
  return hasAnyTag && hasBio
}

/**
 * Rank zinesters like the /zinesters sidebar (uses profile and pin updated_at), apply
 * People display rules, return top N. Requires the full pin set—not a subset ordered by
 * pin.updated_at only, or recently updated profiles can be missed.
 */
export function selectFeaturedZinestersFromPins<T extends ZinesterSortablePin>(
  pins: T[],
  limit = 9
): T[] {
  const byEmail = new Map<string, { row: T; sortUpdatedAt: number }>()

  for (const row of pins) {
    const ts = zinesterSortTimestamp(row)
    const existing = byEmail.get(row.user_email)
    if (!existing) {
      byEmail.set(row.user_email, { row, sortUpdatedAt: ts })
      continue
    }
    existing.sortUpdatedAt = Math.max(existing.sortUpdatedAt, ts)
    const rowPinTime = new Date(row.updated_at || row.created_at).getTime()
    const existingPinTime = new Date(existing.row.updated_at || existing.row.created_at).getTime()
    if (rowPinTime > existingPinTime) {
      existing.row = row
    }
  }

  return Array.from(byEmail.values())
    .filter(({ row }) => meetsZinesterPeopleDisplayCriteria(row.user))
    .sort((a, b) => b.sortUpdatedAt - a.sortUpdatedAt)
    .slice(0, limit)
    .map(({ row }) => row)
}

