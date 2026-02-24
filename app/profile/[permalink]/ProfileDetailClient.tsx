"use client"

import { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ExternalLink, Globe, User, BookOpen, MapPin, Calendar, ArrowLeft, Store, Library, Pencil } from "lucide-react"
import { supabase } from '@/lib/supabaseClient'
import { UserProfile, Zine } from '@/lib/types'
import { autoLinkText, isPastEvent, getEventCategoryDisplay } from '@/lib/utils'
import Link from 'next/link'
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel"

export type Activity = {
  id: string
  type: 'store' | 'library' | 'event' | 'note' | 'edit'
  entityType: 'shop' | 'library' | 'event' | 'edit'
  entityName: string
  entityUrl: string
  sectionLabel: string
  sectionUrl: string
  note?: string
  createdAt: string
}

export default function ProfileDetailClient({ profileId }: { profileId: string }) {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [publicZines, setPublicZines] = useState<Zine[]>([])
  const [totalZines, setTotalZines] = useState<number>(0)
  const [contributions, setContributions] = useState<{
    stores: number
    libraries: number
    events: number
    notes: number
  }>({ stores: 0, libraries: 0, events: 0, notes: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedZine, setSelectedZine] = useState<Zine | null>(null)
  const [attendingEvents, setAttendingEvents] = useState<{
    id: string
    name: string
    category: string
    start_date: string
    end_date: string
    city: string
    state?: string
    country: string
    permalink?: string
  }[]>([])
  const [activities, setActivities] = useState<Activity[]>([])

  useEffect(() => {
    if (profileId) {
      fetchProfileData(profileId)
    }
  }, [profileId])

  // Fetch user's contributions (stores, libraries, community notes) - parallelized
  const fetchContributions = async (userId: string) => {
    try {
      const [storesRes, librariesRes, eventsRes, notesRes] = await Promise.all([
        supabase.from('stores').select('*', { count: 'exact', head: true }).eq('submitted_by', userId),
        supabase.from('libraries').select('*', { count: 'exact', head: true }).eq('submitted_by', userId),
        supabase.from('events').select('*', { count: 'exact', head: true }).eq('submitted_by', userId),
        supabase.from('community_notes').select('*', { count: 'exact', head: true }).eq('user_id', userId),
      ])
      setContributions({
        stores: storesRes.count || 0,
        libraries: librariesRes.count || 0,
        events: eventsRes.count || 0,
        notes: notesRes.count || 0
      })
    } catch (err) {
      console.error('Contributions fetch error:', err)
      setContributions({ stores: 0, libraries: 0, events: 0, notes: 0 })
    }
  }

  // Fetch user's activities (stores, libraries, events, community notes) - parallelized, no N+1
  const fetchActivities = async (userId: string) => {
    try {
      const allActivities: Activity[] = []
      const entityIdsByUser = { stores: new Set<string>(), libraries: new Set<string>(), events: new Set<string>() }

      // Fetch stores, libraries, events, notes, and locale_edits in parallel
      const [storesRes, librariesRes, eventsRes, notesRes, editsRes] = await Promise.all([
        supabase.from('stores').select('id, name, permalink, created_at').eq('submitted_by', userId).eq('approved', true).order('created_at', { ascending: false }),
        supabase.from('libraries').select('id, name, permalink, created_at').eq('submitted_by', userId).eq('approved', true).order('created_at', { ascending: false }),
        supabase.from('events').select('id, name, permalink, created_at').eq('submitted_by', userId).eq('approved', true).order('created_at', { ascending: false }),
        supabase.from('community_notes').select('id, store_id, library_id, event_id, text, submitted_at, anonymous').eq('user_id', userId).order('submitted_at', { ascending: false }),
        supabase.from('locale_edits').select('id, store_id, library_id, event_id, created_at').eq('user_id', userId).order('created_at', { ascending: false }),
      ])

      const storesData = storesRes.data || []
      const librariesData = librariesRes.data || []
      const eventsData = eventsRes.data || []
      const notesData = notesRes.data || []
      const editsData = editsRes.data || []

      const sectionByType = { shop: { label: 'Shops', url: '/stores' }, library: { label: 'Libraries', url: '/libraries' }, event: { label: 'Events', url: '/events' } }
      storesData.forEach((s: { id: string; name: string; permalink: string | null; created_at: string }) => {
        entityIdsByUser.stores.add(s.id)
        allActivities.push({ id: `store-${s.id}`, type: 'store', entityType: 'shop', entityName: s.name, entityUrl: `/store/${s.permalink || s.id}`, sectionLabel: sectionByType.shop.label, sectionUrl: sectionByType.shop.url, createdAt: s.created_at })
      })
      librariesData.forEach((l: { id: string; name: string; permalink: string | null; created_at: string }) => {
        entityIdsByUser.libraries.add(l.id)
        allActivities.push({ id: `library-${l.id}`, type: 'library', entityType: 'library', entityName: l.name, entityUrl: `/library/${l.permalink || l.id}`, sectionLabel: sectionByType.library.label, sectionUrl: sectionByType.library.url, createdAt: l.created_at })
      })
      eventsData.forEach((e: { id: string; name: string; permalink: string | null; created_at: string }) => {
        entityIdsByUser.events.add(e.id)
        allActivities.push({ id: `event-${e.id}`, type: 'event', entityType: 'event', entityName: e.name, entityUrl: `/event/${e.permalink || e.id}`, sectionLabel: sectionByType.event.label, sectionUrl: sectionByType.event.url, createdAt: e.created_at })
      })

      // Batch fetch entity names for notes (avoid N+1)
      const nonAnonymousNotes = notesData.filter((n: { anonymous?: boolean }) => !n.anonymous)
      const storeIds = [...new Set(nonAnonymousNotes.filter((n: { store_id: string | null }) => n.store_id).map((n: { store_id: string | null }) => n.store_id!))]
      const libraryIds = [...new Set(nonAnonymousNotes.filter((n: { library_id: string | null }) => n.library_id).map((n: { library_id: string | null }) => n.library_id!))]
      const eventIds = [...new Set(nonAnonymousNotes.filter((n: { event_id: string | null }) => n.event_id).map((n: { event_id: string | null }) => n.event_id!))]

      const [storesForNotes, libsForNotes, evsForNotes] = await Promise.all([
        storeIds.length ? supabase.from('stores').select('id, name, permalink').in('id', storeIds) : Promise.resolve({ data: [] }),
        libraryIds.length ? supabase.from('libraries').select('id, name, permalink').in('id', libraryIds) : Promise.resolve({ data: [] }),
        eventIds.length ? supabase.from('events').select('id, name, permalink').in('id', eventIds) : Promise.resolve({ data: [] }),
      ])

      const storeMap = new Map((storesForNotes.data || []).map((s: { id: string; name: string; permalink: string | null }) => [s.id, s]))
      const libraryMap = new Map((libsForNotes.data || []).map((l: { id: string; name: string; permalink: string | null }) => [l.id, l]))
      const eventMap = new Map((evsForNotes.data || []).map((e: { id: string; name: string; permalink: string | null }) => [e.id, e]))

      for (const n of nonAnonymousNotes) {

        let entityName = ''
        let entityUrl = ''
        let entityType: 'shop' | 'library' | 'event' = 'shop'
        let isOnUserEntity = false
        const section = { shop: sectionByType.shop, library: sectionByType.library, event: sectionByType.event }

        if (n.store_id) {
          const store = storeMap.get(n.store_id)
          entityName = store?.name || 'a shop'
          entityUrl = `/store/${store?.permalink || n.store_id}`
          entityType = 'shop'
          isOnUserEntity = entityIdsByUser.stores.has(n.store_id)
        } else if (n.library_id) {
          const lib = libraryMap.get(n.library_id)
          entityName = lib?.name || 'a library'
          entityUrl = `/library/${lib?.permalink || n.library_id}`
          entityType = 'library'
          isOnUserEntity = entityIdsByUser.libraries.has(n.library_id)
        } else if (n.event_id) {
          const ev = eventMap.get(n.event_id)
          entityName = ev?.name || 'an event'
          entityUrl = `/event/${ev?.permalink || n.event_id}`
          entityType = 'event'
          isOnUserEntity = entityIdsByUser.events.has(n.event_id)
        }

        if (isOnUserEntity) {
          const existing = allActivities.find(a => a.id === `store-${n.store_id}` || a.id === `library-${n.library_id}` || a.id === `event-${n.event_id}`)
          if (existing) existing.note = n.text
          else allActivities.push({ id: `note-${n.id}`, type: 'note', entityType, entityName, entityUrl, sectionLabel: section[entityType].label, sectionUrl: section[entityType].url, note: n.text, createdAt: n.submitted_at || '' })
        } else {
          allActivities.push({ id: `note-${n.id}`, type: 'note', entityType, entityName, entityUrl, sectionLabel: section[entityType].label, sectionUrl: section[entityType].url, note: n.text, createdAt: n.submitted_at || '' })
        }
      }

      // Process locale_edits - batch fetch entity names
      const editStoreIds = editsData.filter((e: { store_id: string | null }) => e.store_id).map((e: { store_id: string | null }) => e.store_id!)
      const editLibraryIds = editsData.filter((e: { library_id: string | null }) => e.library_id).map((e: { library_id: string | null }) => e.library_id!)
      const editEventIds = editsData.filter((e: { event_id: string | null }) => e.event_id).map((e: { event_id: string | null }) => e.event_id!)

      const [editStoresRes, editLibsRes, editEvsRes] = await Promise.all([
        editStoreIds.length ? supabase.from('stores').select('id, name, permalink').in('id', editStoreIds) : Promise.resolve({ data: [] }),
        editLibraryIds.length ? supabase.from('libraries').select('id, name, permalink').in('id', editLibraryIds) : Promise.resolve({ data: [] }),
        editEventIds.length ? supabase.from('events').select('id, name, permalink').in('id', editEventIds) : Promise.resolve({ data: [] }),
      ])

      const editStoreMap = new Map((editStoresRes.data || []).map((s: { id: string; name: string; permalink: string | null }) => [s.id, s]))
      const editLibraryMap = new Map((editLibsRes.data || []).map((l: { id: string; name: string; permalink: string | null }) => [l.id, l]))
      const editEventMap = new Map((editEvsRes.data || []).map((e: { id: string; name: string; permalink: string | null }) => [e.id, e]))

      for (const edit of editsData) {
        let entityName = ''
        let entityUrl = ''
        let sectionLabel = ''
        let sectionUrl = ''
        if (edit.store_id) {
          const s = editStoreMap.get(edit.store_id)
          entityName = s?.name || 'a shop'
          entityUrl = `/store/${s?.permalink || edit.store_id}`
          sectionLabel = 'Shops'
          sectionUrl = '/stores'
        } else if (edit.library_id) {
          const l = editLibraryMap.get(edit.library_id)
          entityName = l?.name || 'a library'
          entityUrl = `/library/${l?.permalink || edit.library_id}`
          sectionLabel = 'Libraries'
          sectionUrl = '/libraries'
        } else if (edit.event_id) {
          const e = editEventMap.get(edit.event_id)
          entityName = e?.name || 'an event'
          entityUrl = `/event/${e?.permalink || edit.event_id}`
          sectionLabel = 'Events'
          sectionUrl = '/events'
        }
        if (entityName) {
          allActivities.push({ id: `edit-${edit.id}`, type: 'edit', entityType: 'edit', entityName, entityUrl, sectionLabel, sectionUrl, createdAt: edit.created_at })
        }
      }

      allActivities.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      setActivities(allActivities)
    } catch (err) {
      console.error('Activities fetch error:', err)
      setActivities([])
    }
  }

  const fetchProfileData = async (permalink: string) => {
    try {
      setLoading(true)
      setError(null)

      // Fetch profile by permalink
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('permalink', permalink)
        .single()

      if (profileError) {
        if (profileError.code === 'PGRST116') {
          setError('Profile not found')
        } else {
          console.error('Profile fetch error:', profileError)
          setError('Failed to load profile')
        }
        return
      }

      setProfile(profileData)

      // Fetch zines, contributions, activities, and attending events in parallel
      const [zinesRes, , , attendingRes] = await Promise.all([
        supabase.from('zines').select('*').eq('user_id', profileData.id).order('created_at', { ascending: false }),
        fetchContributions(profileData.id),
        fetchActivities(profileData.id),
        supabase.from('event_attendees').select(`
          event_id,
          events!inner(id, name, category, start_date, end_date, city, state, country, permalink)
        `).eq('user_id', profileData.id).order('created_at', { ascending: false }),
      ])

      const allZinesData = zinesRes.data
      if (zinesRes.error) {
        console.error('Zines fetch error:', zinesRes.error)
      } else {
        const publicZines = (allZinesData || []).filter((zine: { is_public: boolean }) => zine.is_public)
        setPublicZines(publicZines)
        setTotalZines(allZinesData?.length || 0)
      }

      const attendingEventsData = attendingRes.data
      if (attendingEventsData) {
        const events = attendingEventsData.map((item: any) => ({
          id: item.events.id,
          name: item.events.name,
          category: item.events.category,
          start_date: item.events.start_date,
          end_date: item.events.end_date,
          city: item.events.city,
          state: item.events.state,
          country: item.events.country,
          permalink: item.events.permalink
        }))
        setAttendingEvents(events)
      }

    } catch (err) {
      console.error('Error fetching profile data:', err)
      setError('Failed to load profile data')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50 font-serif flex items-center justify-center">
        <div className="text-stone-500 text-lg">Loading...</div>
      </div>
    )
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-stone-50 font-serif flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-stone-800 mb-4">Profile Not Found</h1>
          <p className="text-stone-600 mb-6">{error || 'The requested profile could not be found.'}</p>
          <Link href="/">
            <Button>Go Home</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-rose-50 to-stone-50 font-serif">
      {/* Header with back button */}
      <div className="bg-white border-b border-stone-200 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <Link href="/">
            <Button variant="ghost" size="sm" className="text-stone-600 hover:text-stone-800 hover:bg-stone-100">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to map
            </Button>
          </Link>
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        {/* Profile and Stats Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-8 mb-6 sm:mb-8">
          {/* Profile Section */}
          <div className="lg:col-span-2">
            <Card className="bg-white border-stone-200 shadow-sm overflow-hidden">
              <CardContent className="pt-6 overflow-hidden">
                <div className="space-y-4 sm:space-y-6">
                  {/* Profile Header */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
                    {/* Profile Image */}
                    <div className="flex-shrink-0">
                      {profile.profile_image ? (
                        <img
                          src={profile.profile_image}
                          alt="Profile"
                          className="w-20 h-20 object-cover rounded-full border-2 border-stone-200"
                        />
                      ) : (
                        <div className="w-20 h-20 rounded-full bg-stone-100 border-2 border-stone-200 flex items-center justify-center">
                          <User className="h-10 w-10 text-stone-400" />
                        </div>
                      )}
                    </div>
                    
                    {/* Profile Info */}
                    <div className="flex-1 min-w-0">
                      {/* Display Name with Profile URL Link */}
                      <h2 className="text-2xl font-bold text-stone-800 mb-2 font-gloria">
                        {profile.display_name || 'Anonymous User'}
                      </h2>
                      
                                              {/* Website Link */}
                      {profile.site && (
                        <a 
                          href={profile.site.startsWith('http') ? profile.site : `https://${profile.site}`}
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 text-rose-600 hover:text-rose-700 transition-colors"
                          style={{ wordBreak: 'break-all' }}
                        >
                          {profile.site}
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Bio */}
                  {profile.bio && (
                    <div>
                      <p className="text-stone-700 leading-relaxed">
                        {profile.bio}
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Stats Section */}
          <div>
            <Card className="bg-white border-stone-200 shadow-sm overflow-hidden">
              <CardHeader>
                <CardTitle className="text-lg font-gloria">Stats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Joined Date */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-blue-500" />
                    <span className="text-sm text-stone-600">Joined</span>
                  </div>
                  <span className="text-sm font-medium text-stone-800">
                    {profile.created_at ? new Date(profile.created_at).toLocaleDateString('en-US', { 
                      month: 'long', 
                      year: 'numeric' 
                    }) : 'Unknown'}
                  </span>
                </div>

                {/* Contributions with hover tooltip */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-blue-500" />
                    <span className="text-sm text-stone-600">Contributions</span>
                  </div>
                  <div className="relative group">
                    <span className="text-lg font-semibold text-stone-800 cursor-help">
                      {contributions.stores + contributions.libraries + contributions.events + contributions.notes}
                    </span>
                    {/* Hover tooltip */}
                    <div className="absolute bottom-full right-0 mb-2 px-3 py-2 bg-stone-800 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-10">
                      <div className="text-center">
                        <div className="text-stone-300 text-xs">
                          spots: {contributions.stores + contributions.libraries}
                        </div>
                        <div className="text-stone-300 text-xs mt-1">
                          events: {contributions.events}
                        </div>
                        <div className="text-stone-300 text-xs mt-1">
                          notes: {contributions.notes}
                        </div>
                      </div>
                      {/* Arrow */}
                      <div className="absolute top-full right-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-stone-800"></div>
                    </div>
                  </div>
                </div>

                {/* Zines */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <BookOpen className="h-5 w-5 text-blue-500" />
                    <span className="text-sm text-stone-600">Zines</span>
                  </div>
                  <span className="text-lg font-semibold text-stone-800">{totalZines}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Contributions Section - Horizontal Carousel */}
        {activities.length > 0 && (
          <div className="mb-6 sm:mb-8">
            <Card className="bg-white border-stone-200 shadow-sm overflow-hidden">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 font-gloria">
                  <MapPin className="h-5 w-5" />
                  Contributions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Carousel
                  opts={{
                    align: "start",
                    loop: false,
                  }}
                  className="w-full"
                >
                  <CarouselContent className="-ml-4">
                    {activities.map((activity) => (
                      <CarouselItem
                        key={activity.id}
                        className="pl-4 basis-[85%] sm:basis-[70%] md:basis-[45%] lg:basis-[360px] h-auto"
                      >
                        <div className="block pt-5 pr-5 pb-3 pl-3 bg-white rounded-xl shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 min-h-[140px] h-full border border-stone-100/80">
                          <div className="flex items-start gap-3">
                            {/* Intersecting circles: profile image + entity icon (diagonal, reduced overlap) */}
                            <div className="flex-shrink-0 relative w-14 h-14">
                              <div className="absolute left-0 top-0 w-9 h-9 rounded-full overflow-hidden border-2 border-white shadow-sm bg-stone-100 z-10">
                                {profile.profile_image ? (
                                  <img src={profile.profile_image} alt="" className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center">
                                    <User className="h-4 w-4 text-stone-400" />
                                  </div>
                                )}
                              </div>
                              <div className={`absolute right-0 bottom-0 w-9 h-9 rounded-full border-2 border-white shadow-sm flex items-center justify-center z-0 ${
                                activity.entityType === 'shop' ? 'bg-rose-100 text-rose-600' :
                                activity.entityType === 'library' ? 'bg-blue-100 text-blue-600' :
                                activity.entityType === 'event' ? 'bg-green-100 text-green-600' :
                                'bg-amber-100 text-amber-600'
                              }`}>
                                {activity.entityType === 'shop' && <Store className="h-4 w-4" />}
                                {activity.entityType === 'library' && <Library className="h-4 w-4" />}
                                {activity.entityType === 'event' && <Calendar className="h-4 w-4" />}
                                {activity.entityType === 'edit' && <Pencil className="h-4 w-4" />}
                              </div>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs text-stone-500 mb-1">
                                {new Date(activity.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                              </p>
                              <p className="text-sm text-stone-700 leading-snug">
                                <Link href={profile.permalink ? `/profile/${profile.permalink}` : '#'} target="_blank" rel="noopener noreferrer" className="font-semibold text-stone-800 hover:text-rose-600 hover:underline">
                                  {profile.display_name || 'Anonymous'}
                                </Link>
                                {activity.type === 'edit' ? (
                                  <> suggested an edit to the page: <Link href={activity.entityUrl} target="_blank" rel="noopener noreferrer" className="font-medium text-rose-600 hover:text-rose-700 hover:underline">{activity.entityName}</Link>.</>
                                ) : (
                                  <>
                                    {' added '}
                                    <Link href={activity.entityUrl} target="_blank" rel="noopener noreferrer" className="font-medium text-rose-600 hover:text-rose-700 hover:underline">
                                      {activity.entityName}
                                    </Link>
                                    {' to '}
                                    <Link href={activity.sectionUrl} target="_blank" rel="noopener noreferrer" className="font-bold italic text-stone-700 hover:text-stone-900 hover:underline">
                                      {activity.sectionLabel}
                                    </Link>
                                    {activity.note ? (
                                      <>: <span className="italic line-clamp-4">&ldquo;{activity.note}&rdquo;</span></>
                                    ) : (
                                      '.'
                                    )}
                                  </>
                                )}
                              </p>
                            </div>
                          </div>
                        </div>
                      </CarouselItem>
                    ))}
                  </CarouselContent>
                  <CarouselPrevious className="-left-2 sm:-left-4" />
                  <CarouselNext className="-right-2 sm:-right-4" />
                </Carousel>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Public Zines Section */}
        <div className="mb-6 sm:mb-8">
          <Card className="bg-white border-stone-200 shadow-sm overflow-hidden">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-gloria">
                <BookOpen className="h-5 w-5" />
                Zines by {profile.display_name || 'Anonymous User'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {publicZines.length === 0 ? (
                <div className="text-center py-8">
                  <BookOpen className="h-12 w-12 mx-auto mb-4 text-stone-400" />
                  <h3 className="text-lg font-semibold text-stone-800 mb-2">No public zines</h3>
                  <p className="text-stone-600">This user hasn't made any zines public yet.</p>
                </div>
              ) : (
                <div className="space-y-3 sm:space-y-4">
                  {publicZines.map((zine) => (
                    <div
                      key={zine.id}
                      className="flex items-center gap-4 p-4 border border-stone-200 rounded-lg hover:bg-stone-50 cursor-pointer"
                      onClick={() => setSelectedZine(zine)}
                    >
                      {/* Cover Image */}
                      <div className="flex-shrink-0">
                        {zine.cover_image ? (
                          <img
                            src={zine.cover_image}
                            alt={`${zine.title} cover`}
                            className="w-16 h-20 object-cover rounded border border-stone-200"
                          />
                        ) : (
                          <div className="w-16 h-20 rounded border border-stone-200 bg-stone-100 flex items-center justify-center">
                            <BookOpen className="h-8 w-8 text-stone-400" />
                          </div>
                        )}
                      </div>
                      
                      {/* Zine Info */}
                      <div className="flex-1 min-w-0">
                        <div className="mb-2">
                          <h3 className="font-semibold text-stone-800">{zine.title}</h3>
                        </div>
                        {zine.description && (
                          <p className="text-sm text-stone-600 line-clamp-3">
                            {zine.description}
                          </p>
                        )}
                      </div>
                      

                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Events Section - Full Width */}
        {attendingEvents.length > 0 && (
          <div className="mb-6 sm:mb-8 space-y-6">
            {/* Upcoming Events */}
            {attendingEvents.filter(event => !isPastEvent(event)).length > 0 && (
              <Card className="bg-white border-stone-200 shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="flex items-center gap-2 font-gloria">
                    <Calendar className="h-5 w-5" />
                    Events they're going to
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {attendingEvents.filter(event => !isPastEvent(event)).map((event) => (
                      <Link
                        key={event.id}
                        href={`/event/${event.permalink || event.id}`}
                        className="group p-3 border border-stone-200 rounded-lg hover:bg-stone-50 hover:border-[#009035] transition-colors"
                      >
                        <div className="flex items-start gap-2">
                          <Calendar className="h-4 w-4 text-[#009035] mt-0.5 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-stone-800 text-sm mb-1 group-hover:text-[#009035] transition-colors line-clamp-1">
                              {event.name}
                            </h3>
                            <div className="flex flex-wrap items-center gap-1.5 mb-1">
                              <Badge 
                                className="text-xs bg-green-50 text-[#009035] border-green-200"
                              >
                                {getEventCategoryDisplay(event.category)}
                              </Badge>
                              <span className="text-xs text-stone-500">
                                {new Date(event.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                {event.start_date !== event.end_date && ` - ${new Date(event.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`}
                              </span>
                            </div>
                            <p className="text-xs text-stone-600 line-clamp-1">
                              {event.city}{event.state && `, ${event.state}`}, {event.country}
                            </p>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Past Events */}
            {attendingEvents.filter(event => isPastEvent(event)).length > 0 && (
              <Card className="bg-white border-stone-200 shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="flex items-center gap-2 font-gloria">
                    <Calendar className="h-5 w-5" />
                    Events they went to
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {attendingEvents.filter(event => isPastEvent(event)).map((event) => (
                      <Link
                        key={event.id}
                        href={`/event/${event.permalink || event.id}`}
                        className="group p-3 border border-stone-200 rounded-lg hover:bg-stone-50 hover:border-stone-300 transition-colors"
                      >
                        <div className="flex items-start gap-2">
                          <Calendar className="h-4 w-4 text-stone-500 mt-0.5 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-stone-800 text-sm mb-1 group-hover:text-stone-600 transition-colors line-clamp-1">
                              {event.name}
                            </h3>
                            <div className="flex flex-wrap items-center gap-1.5 mb-1">
                              <Badge 
                                className="text-xs bg-stone-50 text-stone-600 border-stone-200"
                              >
                                {getEventCategoryDisplay(event.category)}
                              </Badge>
                              <span className="text-xs text-stone-500">
                                {new Date(event.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                {event.start_date !== event.end_date && ` - ${new Date(event.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`}
                              </span>
                            </div>
                            <p className="text-xs text-stone-600 line-clamp-1">
                              {event.city}{event.state && `, ${event.state}`}, {event.country}
                            </p>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

      </div>

      {/* Zine Popup Modal - Outside main content container */}
      {selectedZine && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedZine(null)}
        >
          <div 
            className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              {/* Close button */}
              <button
                onClick={() => setSelectedZine(null)}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-2xl font-bold"
              >
                ×
              </button>
              
              <div className="flex flex-col md:flex-row gap-6">
                {/* Cover Image */}
                <div className="flex-shrink-0">
                  {selectedZine.cover_image ? (
                    <img
                      src={selectedZine.cover_image}
                      alt={`${selectedZine.title} cover`}
                      className="w-full md:w-64 h-auto max-h-96 object-cover rounded border border-stone-200"
                    />
                  ) : (
                    <div className="w-full md:w-64 h-80 rounded border border-stone-200 bg-stone-100 flex items-center justify-center">
                      <BookOpen className="h-16 w-16 text-stone-400" />
                    </div>
                  )}
                </div>
                
                {/* Zine Details */}
                <div className="flex-1 min-w-0">
                  <h2 className="text-2xl font-bold text-stone-800 mb-4">{selectedZine.title}</h2>
                  
                  {selectedZine.description && (
                    <div className="mb-4">
                      <p className="text-stone-600 whitespace-pre-wrap">{autoLinkText(selectedZine.description)}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 