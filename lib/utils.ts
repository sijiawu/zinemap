import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import React from "react"

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

