import { Metadata } from 'next'
import { formatDateReadable, getEventCategoryDisplay } from './utils'

const BASE_URL = 'https://zinemap.com'

/**
 * Generate SEO metadata for store pages
 */
export function generateStoreMetadata(store: {
  name: string
  city: string
  state?: string
  country: string
  notes?: string
  permalink?: string
  id: string
}): Metadata {
  const location = [store.city, store.state, store.country].filter(Boolean).join(', ')
  const description = store.notes 
    ? `${store.notes.substring(0, 150)}${store.notes.length > 150 ? '...' : ''} Located in ${location}.`
    : `${store.name} - A zine-friendly shop in ${location}.`
  
  const url = `${BASE_URL}/store/${store.permalink || store.id}`
  
  return {
    title: `${store.name} - ZineMap`,
    description,
    openGraph: {
      title: `${store.name} - ZineMap`,
      description,
      type: 'website',
      url,
      siteName: 'ZineMap',
      images: [
        {
          url: '/preview-image.png',
          width: 1200,
          height: 630,
          alt: `${store.name} - ZineMap`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${store.name} - ZineMap`,
      description,
      images: ['/preview-image.png'],
    },
  }
}

/**
 * Generate SEO metadata for library pages
 */
export function generateLibraryMetadata(library: {
  name: string
  city: string
  state?: string
  country: string
  notes?: string
  permalink?: string
  id: string
}): Metadata {
  const location = [library.city, library.state, library.country].filter(Boolean).join(', ')
  const description = library.notes
    ? `${library.notes.substring(0, 150)}${library.notes.length > 150 ? '...' : ''} Located in ${location}.`
    : `${library.name} - A zine-friendly library in ${location}.`
  
  const url = `${BASE_URL}/library/${library.permalink || library.id}`
  
  return {
    title: `${library.name} - ZineMap`,
    description,
    openGraph: {
      title: `${library.name} - ZineMap`,
      description,
      type: 'website',
      url,
      siteName: 'ZineMap',
      images: [
        {
          url: '/preview-image.png',
          width: 1200,
          height: 630,
          alt: `${library.name} - ZineMap`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${library.name} - ZineMap`,
      description,
      images: ['/preview-image.png'],
    },
  }
}

/**
 * Generate SEO metadata for event pages
 */
export function generateEventMetadata(event: {
  name: string
  city: string
  state?: string
  country: string
  category: string
  start_date: string
  end_date: string
  notes?: string
  permalink?: string
  id: string
}): Metadata {
  const location = [event.city, event.state, event.country].filter(Boolean).join(', ')
  const dateRange = event.start_date === event.end_date
    ? formatDateReadable(event.start_date)
    : `${formatDateReadable(event.start_date)} - ${formatDateReadable(event.end_date)}`
  
  const description = event.notes
    ? `${event.notes.substring(0, 120)}${event.notes.length > 120 ? '...' : ''} ${dateRange} in ${location}.`
    : `${event.name} - ${getEventCategoryDisplay(event.category)} on ${dateRange} in ${location}.`
  
  const url = `${BASE_URL}/event/${event.permalink || event.id}`
  
  return {
    title: `${event.name} - ZineMap`,
    description,
    openGraph: {
      title: `${event.name} - ZineMap`,
      description,
      type: 'website',
      url,
      siteName: 'ZineMap',
      images: [
        {
          url: '/preview-image.png',
          width: 1200,
          height: 630,
          alt: `${event.name} - ZineMap`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${event.name} - ZineMap`,
      description,
      images: ['/preview-image.png'],
    },
  }
}

/**
 * Generate SEO metadata for profile pages
 */
export function generateProfileMetadata(profile: {
  display_name: string | null
  bio?: string | null
  permalink: string
}): Metadata {
  const name = profile.display_name || 'Zine Creator'
  const description = profile.bio
    ? `${profile.bio.substring(0, 150)}${profile.bio.length > 150 ? '...' : ''}`
    : `View ${name}'s zines and contributions on ZineMap.`
  
  const url = `${BASE_URL}/profile/${profile.permalink}`
  
  return {
    title: `${name} - ZineMap`,
    description,
    openGraph: {
      title: `${name} - ZineMap`,
      description,
      type: 'profile',
      url,
      siteName: 'ZineMap',
      images: [
        {
          url: '/preview-image.png',
          width: 1200,
          height: 630,
          alt: `${name} - ZineMap`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${name} - ZineMap`,
      description,
      images: ['/preview-image.png'],
    },
  }
}

/**
 * Generate JSON-LD structured data for stores (for AI discoverability)
 */
export function generateStoreStructuredData(store: {
  name: string
  city: string
  state?: string
  country: string
  address: string
  notes?: string
  permalink?: string
  id: string
}): object {
  return {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "name": store.name,
    "address": {
      "@type": "PostalAddress",
      "streetAddress": store.address,
      "addressLocality": store.city,
      "addressRegion": store.state || undefined,
      "addressCountry": store.country
    },
    "description": store.notes || `${store.name} - A zine-friendly shop in ${store.city}, ${store.country}.`,
    "url": `${BASE_URL}/store/${store.permalink || store.id}`
  }
}

/**
 * Generate JSON-LD structured data for libraries (for AI discoverability)
 */
export function generateLibraryStructuredData(library: {
  name: string
  city: string
  state?: string
  country: string
  address: string
  notes?: string
  permalink?: string
  id: string
}): object {
  return {
    "@context": "https://schema.org",
    "@type": "Library",
    "name": library.name,
    "address": {
      "@type": "PostalAddress",
      "streetAddress": library.address,
      "addressLocality": library.city,
      "addressRegion": library.state || undefined,
      "addressCountry": library.country
    },
    "description": library.notes || `${library.name} - A zine-friendly library in ${library.city}, ${library.country}.`,
    "url": `${BASE_URL}/library/${library.permalink || library.id}`
  }
}

/**
 * Generate JSON-LD structured data for events (for AI discoverability)
 */
export function generateEventStructuredData(event: {
  name: string
  city: string
  state?: string
  country: string
  address: string
  category: string
  start_date: string
  end_date: string
  notes?: string
  permalink?: string
  id: string
  venue_name?: string
}): object {
  return {
    "@context": "https://schema.org",
    "@type": "Event",
    "name": event.name,
    "startDate": event.start_date,
    "endDate": event.end_date,
    "eventStatus": "https://schema.org/EventScheduled",
    "location": {
      "@type": "Place",
      "name": event.venue_name || event.name,
      "address": {
        "@type": "PostalAddress",
        "streetAddress": event.address,
        "addressLocality": event.city,
        "addressRegion": event.state || undefined,
        "addressCountry": event.country
      }
    },
    "description": event.notes || `${event.name} - ${getEventCategoryDisplay(event.category)} in ${event.city}, ${event.country}.`,
    "url": `${BASE_URL}/event/${event.permalink || event.id}`
  }
}

/**
 * Generate JSON-LD structured data for profiles (for AI discoverability)
 */
export function generateProfileStructuredData(profile: {
  display_name: string | null
  bio?: string | null
  permalink: string
}): object {
  return {
    "@context": "https://schema.org",
    "@type": "Person",
    "name": profile.display_name || "Zine Creator",
    "description": profile.bio || `Zine creator on ZineMap.`,
    "url": `${BASE_URL}/profile/${profile.permalink}`
  }
}

