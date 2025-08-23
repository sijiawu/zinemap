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
}

export interface Event {
  id: string
  name: string
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
  application_deadline?: string
  notes?: string
  submitted_by: string
  created_at: string
  updated_at?: string
  permalink?: string
  latitude?: number
  longitude?: number
  approved?: boolean
  user_name?: string
  user_permalink?: string
  user_email?: string
  attendees_count?: number
  user_is_attending?: boolean
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
  application_deadline?: string
  notes?: string
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