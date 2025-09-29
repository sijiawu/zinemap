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
 * Auto-link URLs in text by converting them to clickable links
 * @param text - The text containing potential URLs
 * @returns React elements with URLs converted to links
 */
export function autoLinkText(text: string): React.ReactNode[] {
  const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+|[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}(?:\/[^\s]*)?)/g
  const parts = text.split(urlRegex)
  
  return parts.map((part, index) => {
    // Check if this part matches the URL pattern by testing against the original regex
    const isUrl = /^(https?:\/\/[^\s]+|www\.[^\s]+|[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}(?:\/[^\s]*)?)$/.test(part)
    
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
