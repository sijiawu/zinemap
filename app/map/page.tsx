import { createClient } from '@supabase/supabase-js'
import HomePageClient from '@/components/HomePageClient'
import { Store, Library, Event } from '@/lib/types'
import { sortByLatestActivity } from '@/lib/utils'

export const dynamic = 'force-dynamic'

const storeColumns = 'id,name,city,state,country,address,notes,permalink,latitude,longitude,submitted_by,created_at,updated_at,has_stocked_before,website'
const libraryColumns = 'id,name,city,state,country,address,notes,permalink,latitude,longitude,submitted_by,created_at,updated_at,has_visited_before,website'
const eventColumns = 'id,name,venue_name,city,state,country,address,notes,permalink,latitude,longitude,submitted_by,created_at,updated_at,category,start_date,end_date,start_time,end_time,application_deadline,website,poster_image,occurrence_dates'

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

  const initialStores = sortByLatestActivity((storesResult.data || []) as Store[])
  const initialLibraries = sortByLatestActivity((librariesResult.data || []) as Library[])
  const initialEvents = sortByLatestActivity((eventsResult.data || []) as Event[])

  return (
    <HomePageClient
      initialStores={initialStores}
      initialLibraries={initialLibraries}
      initialEvents={initialEvents}
    />
  )
}
