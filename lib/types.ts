// Database Models and Interfaces
// Centralized type definitions for the entire application

export interface Tag {
  id: string
  label: string
  category: string
}

export interface Store {
  id: string
  name: string
  city: string
  state: string
  country: string
  address: string
  email?: string
  website?: string
  notes?: string
  has_stocked_before: boolean
  submitted_by: string
  created_at: string
  updated_at?: string
  permalink?: string
  latitude?: number
  longitude?: number
  approved?: boolean
  store_tags?: StoreTag[]
  user_name?: string
  user_permalink?: string
  last_edit_user_name?: string
  last_edit_user_permalink?: string
}

export interface Library {
  id: string
  name: string
  city: string
  state: string
  country: string
  address: string
  email?: string
  website?: string
  notes?: string
  has_visited_before: boolean
  submitted_by: string
  created_at: string
  updated_at?: string
  permalink?: string
  latitude?: number
  longitude?: number
  approved?: boolean
  library_tags?: LibraryTag[]
  user_name?: string
  user_permalink?: string
  last_edit_user_name?: string
  last_edit_user_permalink?: string
}

/** Recurrence frequency for recurring events. Yearly is not supported. */
export type RecurrenceFrequency = 'weekly' | 'monthly'

export interface Event {
  id: string
  name: string
  venue_name?: string
  city: string
  state?: string
  country: string
  address: string
  email?: string
  website?: string
  social?: string
  category: 'festival' | 'swap' | 'workshop'
  start_date: string
  end_date: string
  /** Start time "HH:MM". Optional. Recurring events are single-day only. */
  start_time?: string | null
  /** End time "HH:MM". Optional. */
  end_time?: string | null
  application_open?: string
  application_deadline?: string
  notes?: string
  submitted_by: string
  created_at: string
  updated_at?: string
  permalink?: string
  latitude?: number
  longitude?: number
  approved?: boolean
  /** Recurrence: weekly or monthly. Null for one-time events. */
  recurrence_frequency?: RecurrenceFrequency | null
  /** Repeat every N weeks/months/years (default 1) */
  recurrence_interval?: number
  /** Last date of recurrence. Null = no end (max 12 occurrences) */
  recurrence_until?: string | null
  /** 1=1st, 2=2nd, 3=3rd, 4=4th, 5=last. Required for monthly recurrence. */
  recurrence_ordinal?: number | null
  /** 0=Sunday..6=Saturday. Required for monthly recurrence. */
  recurrence_weekday?: number | null
  user_name?: string
  user_permalink?: string
  user_email?: string
  attendees_count?: number
  user_is_attending?: boolean
  last_edit_user_name?: string
  last_edit_user_permalink?: string
}

export interface StoreTag {
  id: string
  store_id: string
  tag_id: string
  tag: Tag
}

export interface LibraryTag {
  id: string
  library_id: string
  tag_id: string
  tag: Tag
}

export interface CommunityNote {
  id: string
  store_id?: string
  library_id?: string
  event_id?: string
  user_id: string | null
  text: string
  anonymous: boolean
  has_stocked_here: boolean
  submitted_at: string
  user?: {
    id: string
    display_name: string | null
    email: string
    permalink: string | null
    profile_image?: string | null
  }
}

export interface EventAttendee {
  id: string
  event_id: string
  user_id: string
  created_at: string
  user?: {
    display_name: string | null
    email: string
    permalink: string | null
    profile_image?: string | null
  }
}

export interface Zine {
  id: string
  user_id: string
  title: string
  description: string | null
  cover_image: string | null
  retail_price: number | null
  permalink: string
  is_public: boolean
  created_at: string
  batches?: Batch[]
}

export interface Batch {
  id: string
  zine_id: string
  store_id: string | null
  store_name: string | null
  user_id: string
  date_placed: string
  copies_placed: number
  copies_sold: number | null
  price_per_copy: number | null
  split_percent: number | null
  paid: boolean | null
  status: string | null
  last_checkin: string | null
  checkin_notes: string | null
  notes: string | null
  created_at: string
  next_checkin: string | null
  paid_upfront: boolean | null
}

export interface UserProfile {
  id: string
  display_name: string | null
  email: string
  site: string | null
  bio: string | null
  permalink: string | null
  profile_image: string | null
  created_at: string
  // Add other profile properties as needed
}

export interface HomePin {
  id: string
  user_email: string
  latitude: number
  longitude: number
  color?: string
  city?: string
  state?: string
  country?: string
  created_at: string
  // Pins are immutable - no updated_at field
  user?: {
    id: string
    display_name: string | null
    email: string
    permalink: string | null
    profile_image?: string | null
    bio?: string | null
  }
}

// Form submission types
export interface StoreFormData {
  name: string
  city: string
  state: string
  country: string
  address: string
  email?: string
  website?: string
  notes?: string
  has_stocked_before: boolean
  selectedTags: string[]
}

export interface LibraryFormData {
  name: string
  city: string
  state: string
  country: string
  address: string
  email?: string
  website?: string
  notes?: string
  has_visited_before: boolean
  selectedTags: string[]
}

export interface EventFormData {
  name: string
  venue_name?: string
  city: string
  state: string
  country: string
  address: string
  email?: string
  website?: string
  social?: string
  category: 'festival' | 'swap' | 'workshop'
  start_date: string
  end_date: string
  start_time?: string
  end_time?: string
  application_open?: string
  application_deadline?: string
  notes?: string
  /** Recurrence: weekly or monthly. Empty string for one-time. */
  recurrence_frequency?: RecurrenceFrequency | '' | undefined
  recurrence_interval?: number
  recurrence_until?: string
  /** 1-4 = 1st-4th, 5 = last. Required for monthly. */
  recurrence_ordinal?: number
  /** 0=Sunday..6=Saturday. Required for monthly. */
  recurrence_weekday?: number
}

// API response types
export interface ApiResponse<T> {
  data: T | null
  error: string | null
}

export interface PaginatedResponse<T> {
  data: T[]
  count: number
  page: number
  pageSize: number
  totalPages: number
} 