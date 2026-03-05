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
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '') // Remove special characters except spaces and hyphens
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
    .replace(/^-|-$/g, '') // Remove leading/trailing hyphens
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
 * Expand recurring events into individual occurrences for display.
 * One-time events return a single occurrence. Recurring events are expanded
 * up to recurrence_until or 12 occurrences max, whichever comes first.
 */
export function expandRecurringEvents(
  events: Event[],
  options?: { maxOccurrences?: number }
): EventOccurrence[] {
  const maxOccurrences = options?.maxOccurrences ?? MAX_RECURRENCE_OCCURRENCES

  const result: EventOccurrence[] = []

  for (const event of events) {
    const freq = event.recurrence_frequency
    const interval = event.recurrence_interval ?? 1
    const startDate = parseISO(event.start_date)
    const endDate = parseISO(event.end_date)
    // Recurring events are single-day only: end_date = start_date
    const durationDays = event.recurrence_frequency ? 0 : Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))

    if (!freq) {
      result.push({
        event,
        occurrence_start: event.start_date,
        occurrence_end: event.end_date,
      })
      continue
    }

    const untilDate = event.recurrence_until ? parseISO(event.recurrence_until) : null
    const ordinal = event.recurrence_ordinal ?? 3
    const weekday = event.recurrence_weekday ?? 0

    let currentStart: Date
    if (freq === 'monthly' && ordinal >= 1 && ordinal <= 5) {
      currentStart = getNthWeekdayOfMonth(startDate.getFullYear(), startDate.getMonth(), weekday, ordinal)
    } else {
      currentStart = startDate
    }

    let count = 0
    const oneYearFromStart = addYears(currentStart, 1)

    while (count < maxOccurrences) {
      if (untilDate && isBefore(untilDate, currentStart)) break
      if (isBefore(oneYearFromStart, currentStart)) break

      const currentEnd = addDays(currentStart, durationDays)
      result.push({
        event,
        occurrence_start: format(currentStart, 'yyyy-MM-dd'),
        occurrence_end: format(currentEnd, 'yyyy-MM-dd'),
      })
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
      } else if (freq === 'yearly') {
        currentStart = addYears(currentStart, interval)
      } else {
        break
      }
    }
  }

  return result
}

/** Get the next occurrence date for a recurring event, or null if none/not recurring */
export function getNextOccurrenceDate(event: Event): string | null {
  if (!event.recurrence_frequency) return null
  const occs = expandRecurringEvents([event])
  const today = new Date().toISOString().split('T')[0]
  const next = occs.find(o => o.occurrence_end >= today)
  return next ? next.occurrence_start : null
}

/**
 * For list/map view: keep only the NEXT occurrence per recurring event (first >= today).
 * One-time events pass through. Reduces clutter.
 */
export function occurrencesToNextOnly(occurrences: EventOccurrence[]): EventOccurrence[] {
  const today = new Date().toISOString().split('T')[0]
  const seenRecurring = new Set<string>()
  const result: EventOccurrence[] = []
  for (const occ of occurrences) {
    if (!occ.event.recurrence_frequency) {
      result.push(occ)
      continue
    }
    if (occ.occurrence_end < today) continue
    if (seenRecurring.has(occ.event.id)) continue
    seenRecurring.add(occ.event.id)
    result.push(occ)
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

/**
 * Human-readable recurrence description (e.g. "Every 2 weeks", "3rd Sunday of every month")
 */
export function formatRecurrenceDescription(event: {
  recurrence_frequency?: string | null
  recurrence_interval?: number
  recurrence_until?: string | null
  recurrence_ordinal?: number | null
  recurrence_weekday?: number | null
}): string {
  const freq = event.recurrence_frequency
  if (!freq) return ''

  const interval = event.recurrence_interval ?? 1
  const until = event.recurrence_until
  const ordinal = event.recurrence_ordinal
  const weekday = event.recurrence_weekday

  let intervalText: string
  if (freq === 'monthly' && ordinal && ordinal >= 1 && ordinal <= 5 && weekday != null) {
    const ordLabel = ORDINAL_LABELS[ordinal]
    const dayName = WEEKDAY_NAMES[weekday] ?? 'day'
    intervalText = interval === 1
      ? `${ordLabel} ${dayName} of every month`
      : `${ordLabel} ${dayName} of every ${interval} months`
  } else if (freq === 'weekly' && weekday != null) {
    const dayName = WEEKDAY_NAMES[weekday] ?? 'day'
    intervalText = interval === 1 ? `Weekly on ${dayName}` : `Every ${interval} weeks on ${dayName}`
  } else {
    intervalText =
      interval === 1
        ? freq === 'weekly'
          ? 'Weekly'
          : freq === 'monthly'
            ? 'Monthly'
            : 'Yearly'
        : `Every ${interval} ${freq === 'weekly' ? 'weeks' : freq === 'monthly' ? 'months' : 'years'}`
  }

  if (until) {
    return `${intervalText} until ${formatDateReadable(until)}`
  }
  return intervalText
}

/**
 * Auto-link URLs in text by converting them to clickable links
 * @param text - The text containing potential URLs
 * @returns React elements with URLs converted to links
 */
export function autoLinkText(text: string): React.ReactNode[] {
  const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+|[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?\.([a-zA-Z]{2,})(?:\/[^\s]*)?)/g
  const parts = text.split(urlRegex)
  
  return parts.map((part, index) => {
    // Check if this part matches the URL pattern by testing against the original regex
    const isUrl = /^(https?:\/\/[^\s]+|www\.[^\s]+|[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?\.([a-zA-Z]{2,})(?:\/[^\s]*)?)$/.test(part)
    
    if (isUrl) {
      // Ensure URL has protocol
      const href = part.startsWith('http') ? part : `https://${part}`
      return React.createElement('a', {
        key: index,
        href: href,
        target: '_blank',
        rel: 'noopener noreferrer',
        className: 'text-blue-600 hover:text-blue-800 underline'
      }, part)
    }
    return part
  })
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

