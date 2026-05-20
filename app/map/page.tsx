import { createClient } from '@supabase/supabase-js'
import HomePageClient from '@/components/HomePageClient'
import { Store, Library, Event } from '@/lib/types'

export const dynamic = 'force-dynamic'

const storeColumns = 'id,name,city,state,country,address,notes,permalink,latitude,longitude,submitted_by,created_at,updated_at,has_stocked_before,website'
const libraryColumns = 'id,name,city,state,country,address,notes,permalink,latitude,longitude,submitted_by,created_at,updated_at,has_visited_before,website'
const eventColumns = 'id,name,venue_name,city,state,country,address,notes,permalink,latitude,longitude,submitted_by,created_at,updated_at,category,start_date,end_date,start_time,end_time,application_deadline,website,poster_image,recurrence_frequency,recurrence_interval,recurrence_until,recurrence_ordinal,recurrence_weekday'

export default async function MapPage() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const [storesResult, librariesResult, eventsResult] = await Promise.all([
    supabase
      .from('stores')
      .select(storeColumns)
      .eq('approved', true)
      .order('created_at', { ascending: false }),
    supabase
      .from('libraries')
      .select(libraryColumns)
      .eq('approved', true)
      .order('created_at', { ascending: false }),
    supabase
      .from('events')
      .select(eventColumns)
      .eq('approved', true)
      .order('created_at', { ascending: false }),
  ])

  return (
    <HomePageClient
      initialStores={(storesResult.data || []) as Store[]}
      initialLibraries={(librariesResult.data || []) as Library[]}
      initialEvents={(eventsResult.data || []) as Event[]}
    />
  )
}
